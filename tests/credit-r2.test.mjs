import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCreditR2,CREDIT_R2_CONTRACT} from '../lib/market-score/credit-r2.mjs';
import {marketDetailRows} from '../lib/market-score/detail-catalog.mjs';
import {createMarketScoreR1Handler} from '../worker/market-score-r1.mjs';

const weekly=(start,n,fn)=>{const out=[],d=new Date(start+'T12:00:00Z');for(let i=0;i<n;i++){out.push({observationDate:d.toISOString().slice(0,10),value:fn(i)});d.setUTCDate(d.getUTCDate()+7)}return out};
const daily=(start,n,fn)=>{const out=[],d=new Date(start+'T12:00:00Z');for(let i=0;i<n;i++){while(d.getUTCDay()===0||d.getUTCDay()===6)d.setUTCDate(d.getUTCDate()+1);out.push({observationDate:d.toISOString().slice(0,10),value:fn(i)});d.setUTCDate(d.getUTCDate()+1)}return out};
const cmdi=weekly('2018-01-05',430,i=>i).map((r,i)=>({...r,hy:.25+.05*Math.sin(i/15),ig:.18+.04*Math.sin(i/17),market:.2}));
const nfci=weekly('2015-01-02',650,i=>-1+i*.001+Math.sin(i/20)*.03);
const y2=daily('2015-01-02',3000,i=>2+Math.sin(i/30)*.2);
const y5=daily('2015-01-02',3000,i=>2.3+Math.sin(i/31)*.22);
const y10=daily('2015-01-02',3000,i=>2.6+Math.sin(i/32)*.24);
const y30=daily('2015-01-02',3000,i=>3+Math.sin(i/33)*.26);
const asOf=cmdi.at(-1).observationDate;
const inputs=()=>({cmdi,nfciCredit:nfci,y2,y5,y10,y30,asOfDate:asOf});

test('CREDIT R2 contract uses approved HY IG NFCI Credit and bond volatility weights',()=>{
 assert.deepEqual(CREDIT_R2_CONTRACT.weights,{hy:.35,ig:.35,nfciCredit:.10,bondVolatility:.20});
 assert.equal(CREDIT_R2_CONTRACT.nfciSeries,'NFCICREDIT');
 assert.equal(CREDIT_R2_CONTRACT.missingReweight,false);
});

test('CREDIT R2 publishes four scored indicators and nonempty native trend',()=>{
 const r=buildCreditR2(inputs());
 assert.equal(r.status,'READY');
 assert.equal(r.methodologyVersion,'CREDIT_R2_NFCI_4FACTOR_R1');
 assert.deepEqual(r.indicators.map(x=>x.id),['credit-41','credit-42','credit-43','credit-44']);
 assert.ok(r.indicators.every(x=>Number.isFinite(x.score)));
 assert.ok(r.trend.length>50);
 const c=r.componentScores;
 assert.ok(Math.abs(r.score-(.35*c.hy+.35*c.ig+.10*c.nfciCredit+.20*c.bondVolatility))<1e-12);
});

test('Market CMDI raw field cannot affect CREDIT R2 score',()=>{
 const a=buildCreditR2(inputs());
 const b=buildCreditR2({...inputs(),cmdi:cmdi.map(x=>({...x,market:.99}))});
 assert.equal(a.score,b.score);
 assert.deepEqual(a.componentScores,b.componentScores);
});

test('missing NFCICREDIT fails closed without reweighting',()=>{
 const r=buildCreditR2({...inputs(),nfciCredit:[]});
 assert.equal(r.status,'PARTIAL');
 assert.equal(r.score,null);
 assert.ok(r.missingFactors.includes('credit-43'));
});

test('credit detail catalog shows four component scores in approved order',()=>{
 const r=buildCreditR2(inputs());
 const rows=marketDetailRows('credit',r.indicators);
 assert.deepEqual(rows.map(x=>x.label),['HY 신용 스트레스','IG 신용 스트레스','신용여건','채권 변동성']);
 assert.deepEqual(rows.map(x=>x.score),r.indicators.map(x=>x.score));
 assert.ok(rows.every(x=>x.raw===false));
});

test('public runtime explicit CREDIT R2 overrides legacy diagnostic credit score and carries trend',async()=>{
 const series={NFCICREDIT:nfci,DGS2:y2,DGS5:y5,DGS10:y10,DGS30:y30};
 const handler=createMarketScoreR1Handler({
  now:()=>new Date(asOf+'T12:00:00Z'),
  collectInputs:async()=>({series,external:{cmdiRows:cmdi},rateR2:{series:{}}}),
  orchestrate:()=>({snapshot:{diagnostics:{creditRiskDefense:{status:'READY',score:99,missing:[]}}}}),
  loadInflationDomain:async()=>({status:'PARTIAL',score:null}),
  loadConsumptionDomain:async()=>({status:'PARTIAL',score:null}),
  loadGrowthDomain:async()=>({status:'NOT_READY',score:null}),
  loadLiquidityHistory:async()=>[],
  loadEmploymentDomain:async()=>({status:'PARTIAL',score:null}),
  collectBreadthDomain:async()=>({status:'PARTIAL',score:null}),
 });
 const response=await handler(new Request('https://example.test/api/market-score'));
 assert.equal(response.status,200);
 const credit=(await response.json()).domains.find(x=>x.id==='credit');
 const expected=buildCreditR2(inputs());
 assert.equal(credit.score,expected.score);
 assert.equal(credit.methodologyVersion,'CREDIT_R2_NFCI_4FACTOR_R1');
 assert.ok(credit.trend.length>50);
 assert.equal(credit.indicators.length,4);
 assert.notEqual(credit.score,99);
});
