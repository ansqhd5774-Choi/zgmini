import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRateR2,RATE_R2_CONTRACT} from '../lib/market-score/rate-r2.mjs';
import {buildRateR3} from '../lib/market-score/rate-r3.mjs';
import {marketDetailRows} from '../lib/market-score/detail-catalog.mjs';
import {createMarketScoreR1Handler} from '../worker/market-score-r1.mjs';

const rows=(start,valueFn,n=900)=>{
  const out=[];
  const d=new Date(`${start}T12:00:00Z`);
  for(let i=0;i<n;i++){
    while(d.getUTCDay()===0||d.getUTCDay()===6)d.setUTCDate(d.getUTCDate()+1);
    out.push({observationDate:d.toISOString().slice(0,10),value:valueFn(i)});
    d.setUTCDate(d.getUTCDate()+1);
  }
  return out;
};
const baseDate='2022-01-03';
const effr=rows(baseDate,i=>1+i*0.002);
const d2=rows(baseDate,i=>2+i*0.0025);
const real10=rows(baseDate,i=>0.5+i*0.0015);
const d3m=rows(baseDate,i=>1.5+i*0.0018);
const d10=rows(baseDate,i=>2.5+i*0.0022);
const lower=rows(baseDate,i=>3.5,900);
const upper=rows(baseDate,i=>3.75,900);
const asOf=d10.at(-1).observationDate;

test('RATE_R2 contract is exact approved 4-axis equal weight without recession/credit cap',()=>{
  assert.equal(RATE_R2_CONTRACT.modelVersion,'RATE_R2');
  assert.deepEqual(RATE_R2_CONTRACT.weights,{policy:.25,nominal:.25,real:.25,curve:.25});
  assert.equal(RATE_R2_CONTRACT.normalization,'EXPANDING_PERCENTILE');
  assert.equal(RATE_R2_CONTRACT.minValid,756);
  assert.equal(RATE_R2_CONTRACT.externalContextCapApplied,false);
  assert.equal(RATE_R2_CONTRACT.missingReweight,false);
});

test('RATE_R2 score is exact mean of policy nominal real and curve',()=>{
  const r=buildRateR2({
    effrRows:effr,twoYearRows:d2,realTenYearRows:real10,threeMonthRows:d3m,tenYearRows:d10,
    policyLowerRows:lower,policyUpperRows:upper,asOfDate:asOf,
  });
  assert.equal(r.status,'READY');
  assert.equal(r.modelVersion,'RATE_R2');
  const c=r.componentScores;
  assert.ok(Object.values(c).every(Number.isFinite));
  assert.equal(r.score,(c.policy+c.nominal+c.real+c.curve)/4);
  assert.equal(r.currentPressure,(c.policy+c.nominal+c.real)/3);
  assert.equal(r.forwardPersistence,c.curve);
  assert.ok(Math.abs(r.score-(.75*r.currentPressure+.25*r.forwardPersistence))<1e-12);
  assert.equal(r.externalContextCapApplied,false);
  assert.equal(r.recessionCreditCapApplied,false);
});

test('higher level maps toward more stress while steeper curve maps toward more accommodative',()=>{
  const r=buildRateR2({
    effrRows:effr,twoYearRows:d2,realTenYearRows:real10,threeMonthRows:d3m,tenYearRows:d10,
    policyLowerRows:lower,policyUpperRows:upper,asOfDate:asOf,
  });
  assert.ok(r.componentScores.policy<10);
  assert.ok(r.componentScores.nominal<10);
  assert.ok(r.componentScores.real<10);
  assert.ok(r.componentScores.curve>90);
});

test('all four core axes are required and no missing-axis reweight occurs',()=>{
  const r=buildRateR2({
    effrRows:effr,twoYearRows:d2,realTenYearRows:[],threeMonthRows:d3m,tenYearRows:d10,
    policyLowerRows:lower,policyUpperRows:upper,asOfDate:asOf,
  });
  assert.equal(r.status,'UNAVAILABLE');
  assert.equal(r.score,null);
  assert.equal(r.reason,'MISSING_RATE_R2_INPUTS');
  assert.ok(r.missingFactors.includes('realTenYear'));
});

test('UI four preserves policy range and raw display values',()=>{
  const r=buildRateR2({
    effrRows:effr,twoYearRows:d2,realTenYearRows:real10,threeMonthRows:d3m,tenYearRows:d10,
    policyLowerRows:lower,policyUpperRows:upper,asOfDate:asOf,
  });
  assert.deepEqual(r.indicators.map(x=>x.name),['Fed 정책금리','미국 2년물','미국 10년 실질금리','미국 10년물']);
  assert.equal(r.indicators[0].value,null);
  assert.deepEqual(r.indicators[0].currentRange,{lower:3.5,upper:3.75});
  assert.equal(r.indicators[0].displayValue,'3.5–3.75%');
  assert.ok(r.indicators.slice(1).every(x=>x.status==='READY'&&Number.isFinite(x.currentValue)));
});

test('hard-stale core input fails closed',()=>{
  const staleEffr=effr.slice(0,-20);
  const r=buildRateR2({
    effrRows:staleEffr,twoYearRows:d2,realTenYearRows:real10,threeMonthRows:d3m,tenYearRows:d10,
    policyLowerRows:lower,policyUpperRows:upper,asOfDate:asOf,
  });
  assert.equal(r.status,'UNAVAILABLE');
  assert.equal(r.score,null);
  assert.equal(r.reason,'RATE_R2_HARD_STALE');
});

test('trend contains only complete four-axis dates',()=>{
  const r=buildRateR2({
    effrRows:effr,twoYearRows:d2,realTenYearRows:real10,threeMonthRows:d3m,tenYearRows:d10,
    policyLowerRows:lower,policyUpperRows:upper,asOfDate:asOf,
  });
  assert.ok(r.trend.length>100);
  assert.ok(r.trend.every(x=>typeof x.label==='string'&&Number.isFinite(x.value)));
});

const fullInputs=()=>({effrRows:effr,twoYearRows:d2,realTenYearRows:real10,threeMonthRows:d3m,tenYearRows:d10,policyLowerRows:lower,policyUpperRows:upper,asOfDate:asOf});

test('null, blank and boolean core observations are missing, while numeric zero is valid',()=>{
  for(const value of [null,undefined,'', ' ',false]){
    const r=buildRateR2({...fullInputs(),effrRows:effr.map(row=>({...row,value}))});
    assert.equal(r.status,'UNAVAILABLE');
    assert.equal(r.score,null);
  }
  const r=buildRateR2({...fullInputs(),effrRows:effr.map(row=>({...row,value:0}))});
  assert.equal(r.status,'READY');
  assert.equal(r.componentScores.policy,50);
});

test('future observations do not enter scores or the published trend',()=>{
  const cutoff=d10.at(-10).observationDate;
  const result=buildRateR2({...fullInputs(),asOfDate:cutoff});
  const truncated=Object.fromEntries(Object.entries(fullInputs()).map(([key,value])=>[key,Array.isArray(value)?value.filter(row=>row.observationDate<=cutoff):cutoff]));
  assert.deepEqual(result,buildRateR2(truncated));
  assert.ok(result.trend.every(row=>row.label<=cutoff));
});

test('detail output carries complete contract and preserves unavailable metadata without a midpoint',()=>{
  const expected=['componentId','label','valueType','currentValue','currentRange','displayValue','formattedValue','unit','asOfDate','history','source','sourceUrl','sourceKey','status','freshness','stale','unavailableReason'];
  const result=buildRateR2(fullInputs());
  for(const items of [result.indicators,marketDetailRows('rates',result.indicators)]){
    assert.equal(items.length,4);
    for(const item of items)for(const key of expected)assert.ok(Object.hasOwn(item,key),key);
    assert.equal(items[0].currentValue,null);
    assert.equal(items[0].valueType,'range');
    assert.deepEqual(items[0].currentRange,{lower:3.5,upper:3.75});
    assert.ok(items[0].history.every(row=>!Object.hasOwn(row,'value')));
  }
  const missing=buildRateR2({...fullInputs(),policyUpperRows:[]});
  const detail=marketDetailRows('rates',missing.indicators)[0];
  assert.equal(detail.status,'UNAVAILABLE');
  assert.equal(detail.unavailableReason,'MISSING_RANGE_ENDPOINT');
  assert.equal(detail.currentRange,null);
  assert.equal(missing.status,'READY'); // Target range is display-only; EFFR drives the policy axis.
});

test('RATE_R2 builder remains preserved while public runtime is RATE_R3',async()=>{
  const legacy=buildRateR2(fullInputs());
  assert.equal(legacy.modelVersion,'RATE_R2');
  assert.deepEqual(legacy.weights,{policy:.25,nominal:.25,real:.25,curve:.25});

  const series={EFFR:effr,DGS2:d2,DFII10:real10,DGS3MO:d3m,DGS10:d10,DFEDTARL:lower,DFEDTARU:upper};
  const run=async rateSeries=>{
    const handler=createMarketScoreR1Handler({
      now:()=>new Date(`${asOf}T12:00:00Z`),
      collectInputs:async()=>({rateR2:{series:rateSeries},series}),
      orchestrate:()=>({snapshot:{diagnostics:{recessionDefense:{score:0},creditRiskDefense:{score:0}}}}),
    });
    const response=await handler(new Request('https://example.test/api/market-score'));
    assert.equal(response.status,200);
    return (await response.json()).domains.find(domain=>domain.id==='rates');
  };
  const ready=await run(series);
  assert.equal(ready.modelVersion,'RATE_R3');
  assert.equal(ready.score,buildRateR3(fullInputs()).score);
  assert.equal(ready.indicators.length,4);
  const missing=await run({});
  assert.equal(missing.status,'UNAVAILABLE');
  assert.equal(missing.score,null);
});
