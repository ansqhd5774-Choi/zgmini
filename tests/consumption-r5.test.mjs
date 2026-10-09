import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateConsumptionR5,consumptionPercentile,R5_WEIGHTS} from '../lib/market-score/consumption-r5.mjs';
import {marketDetailRows} from '../lib/market-score/detail-catalog.mjs';

const fixture=()=>{
  const series={};
  for(const id of ['realPce','realPcePerCapita','realIncome','employmentRatio','realPayroll','savingRate','consumerDebtService','consumerDelinquency','realGoods','realServices','category1','category2']){
    series[id]=Array.from({length:160},(_,i)=>{
      const date=new Date(Date.UTC(2010, i,1)).toISOString().slice(0,10);
      return {observationDate:date,availableDate:date,value:100*Math.exp(i*.002)};
    });
  }
  return {series,categoryIds:['category1','category2']};
};
test('R5 weights sum to 100 and ties use midpoint ranks',()=>{
  assert.equal(Object.values(R5_WEIGHTS).reduce((a,b)=>a+b),100);
  assert.equal(consumptionPercentile(2,[1,2,2,3],4),50);
  assert.equal(consumptionPercentile(2,[1,null,3],3),null);
  assert.equal(consumptionPercentile(2,[1,3],120),null);
});
test('R5 exact area arithmetic preserves approved weights and returns 13 observations',()=>{
  const result=calculateConsumptionR5(fixture(),{asOfDate:'2023-04-30'});
  assert.equal(result.status,'READY');
  assert.equal(result.indicators.filter(x=>x.area).length,13);
  assert.equal(result.trend.length,13);
  assert.equal(result.score,result.areas.reduce((s,x)=>s+x.score*x.weight/100,0));
  assert.equal(result.indicators.reduce((s,x)=>s+x.weight,0),100);
  assert.equal(result.indicators.find(x=>x.id==='diffusion').score,100);
});
test('R5 missing financial input withholds score instead of reweighting',()=>{
  const input=fixture();delete input.series.consumerDelinquency;
  const result=calculateConsumptionR5(input,{asOfDate:'2023-04-30'});
  assert.equal(result.status,'PARTIAL');assert.equal(result.score,null);
  assert.ok(result.missingFactors.includes('delinquency'));
  assert.equal(result.areas.find(x=>x.id==='D').weight,30);
});
test('R5 excludes unreleased inputs and rejects duplicate months and absent release dates',()=>{
  const input=fixture();input.series.realIncome.at(-1).availableDate='2024-01-01';
  assert.equal(calculateConsumptionR5(input,{asOfDate:'2023-04-30'}).score,null);
  const duplicate=fixture();duplicate.series.realPce.push(duplicate.series.realPce[0]);
  assert.throws(()=>calculateConsumptionR5(duplicate,{asOfDate:'2023-04-30'}),/DUPLICATE/);
  const noRelease=fixture();delete noRelease.series.realPce[0].availableDate;
  assert.throws(()=>calculateConsumptionR5(noRelease,{asOfDate:'2023-04-30'}),/RELEASE_DATE_REQUIRED/);
});
test('R5 appended future values do not change earlier results',()=>{
  const input=fixture(),before=calculateConsumptionR5(input,{asOfDate:'2023-04-30'});
  for(const rows of Object.values(input.series))rows.push({observationDate:'2030-01-01',availableDate:'2030-02-01',value:1e9});
  assert.deepEqual(calculateConsumptionR5(input,{asOfDate:'2023-04-30'}),before);
});
test('Reference-only missing values expose coverage; current missing inputs remain withheld',()=>{
 const history=Array.from({length:120},(_,i)=>i===0?null:i);
 assert.ok(Number.isFinite(consumptionPercentile(60,history,120)));
 assert.equal(consumptionPercentile(60,history.map((x,i)=>i<13?null:x),120),null);
 const input=fixture();input.series.realPce.at(-1).value=null;
 assert.equal(calculateConsumptionR5(input,{asOfDate:'2023-04-30'}).score,null);
});
test('R5 dashboard selects four ecosystem representatives without changing full formula inputs',()=>{
 const result=calculateConsumptionR5(fixture(),{asOfDate:'2023-04-30'});
 const rows=marketDetailRows('consumption',result.indicators);
 assert.equal(rows.length,4);
 assert.deepEqual(rows.map(x=>x.label),['실질 소비','가처분소득','실질 총급여','대출 연체율']);
 assert.deepEqual(rows.map(x=>x.score),['pce3','income3','payroll','delinquency'].map(id=>result.indicators.find(x=>x.id===id).score));
 assert.equal(result.indicators.filter(x=>x.area).length,13);
 assert.ok(rows.every(x=>!x.raw&&!x.area));
 assert.ok(rows.every(x=>typeof x.value==='number'&&x.asOfDate));
});
