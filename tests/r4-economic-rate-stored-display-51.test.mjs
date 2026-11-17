import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RATE_R3_CONTRACT,buildRateR3} from '../lib/market-score/rate-r3.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';
import {buildCompositeMarketScore} from '../lib/market-score/composite-model-r1.mjs';
import {verifiedEconomicRateScore,verifiedEconomicRateChart,isEconomicRateChartCurrent} from '../lib/economic-rate-stored-display-r4.mjs';

const panel=readFileSync(new URL('../app/economic-indicators/economic-detail-panel.tsx',import.meta.url),'utf8');
const asOf='2026-11-17';
const actualInterpretation='금리 R3: 정책금리 20% + 2년물 25% + 10년 실질금리 30% + 10Y-3M 장단기 금리차 25%. 0=극단적 금리 스트레스, 100=매우 완화적.';
const base=()=>({id:'rates',status:'READY',score:55,modelVersion:'RATE_R3',
 freshness:'CURRENT',interpretation:actualInterpretation,updatedAt:'2026-11-16',missingFactors:[],
 indicators:['policy','nominal','real','curve'].map((componentId,i)=>({
  componentId,status:'READY',score:55,asOfDate:i===0?'2026-11-13':'2026-11-16',
  sourceKey:i===0?'EFFR.targetRateFrom/targetRateTo':'H15',valueType:i===0?'range':'number',
 })),
 trend:[{label:'2026-07-01',value:51},{label:'2026-10-30',value:53},{label:'2026-11-16',value:54}]});
const inputRows=(count=758)=>{
 const dates=[],d=new Date('2023-01-02T12:00:00Z');
 while(dates.length<count){if(![0,6].includes(d.getUTCDay()))dates.push(d.toISOString().slice(0,10));
  d.setUTCDate(d.getUTCDate()+1);}
 return dates;
};
const publishedFromApprovedR3=({missingTarget=false}={})=>{
 const dates=inputRows();
 const rows=f=>dates.map((observationDate,i)=>({observationDate,value:f(i)}));
 const src=buildRateR3({asOfDate:dates.at(-1),
  effrRows:rows(i=>1+i/1000),twoYearRows:rows(i=>2+i/1500),
  realTenYearRows:rows(i=>.6+i/2500),
  threeMonthRows:rows(i=>1.2+i/2000),tenYearRows:rows(i=>2.3+i/1700),
  policyLowerRows:missingTarget?[]:rows(()=>3.5),
  policyUpperRows:missingTarget?[]:rows(()=>3.75)});
 assert.equal(src.status,'READY');
 const domain=buildCompositeMarketScore(buildCmR1DomainResults({rates:src}),{updatedAt:dates.at(-1)+'T00:00:00Z'}).domains.find(x=>x.id==='rates');
 return {domain,asOfDate:dates.at(-1),source:src};
};

test('approved R3 public four-component published score and previous dates preserve weights',()=>{
 const p=base();assert.equal(verifiedEconomicRateScore(p,asOf),55);
 assert.deepEqual(RATE_R3_CONTRACT.weights,{policy:.20,nominal:.25,real:.30,curve:.25});
 assert.deepEqual(verifiedEconomicRateChart(p,asOf,55),
  p.trend.map(({label,value})=>({date:label,score:value})));
});
test('actual R3 calculator to CM-R1 adapter to published composite verifies without synthetic source metadata',()=>{
 const {domain,asOfDate,source}=publishedFromApprovedR3();
 assert.equal(domain.modelVersion,'RATE_R3');
 assert.equal(verifiedEconomicRateScore(domain,asOfDate),source.score);
 assert.equal(isEconomicRateChartCurrent(verifiedEconomicRateChart(domain,asOfDate,source.score),asOfDate,source.score),true);
});
test('missing policy target range is display-only; EFFR is still valid source of policy score',()=>{
 const {domain,asOfDate,source}=publishedFromApprovedR3({missingTarget:true});
 assert.equal(domain.indicators[0].status,'UNAVAILABLE');
 assert.equal(domain.indicators[0].score,null);
 assert.equal(domain.indicators[0].unavailableReason,'MISSING_RANGE_ENDPOINT');
 assert.equal(verifiedEconomicRateScore(domain,asOfDate),source.score);
 assert.equal(isEconomicRateChartCurrent(verifiedEconomicRateChart(domain,asOfDate,source.score),asOfDate,source.score),true);
});
test('explicit non-R3 method, partial/unavailable numeric and missing source identity fail closed',()=>{
 for(const patch of [{status:'PARTIAL'},{status:'UNAVAILABLE'},{modelVersion:'RATE_R2'},
 {modelVersion:null},{interpretation:'RATE_R2 legacy score'},
 {freshness:'HARD_STALE'},{freshness:'UNAVAILABLE'},{missingFactors:['curve']}]){
  const p={...base(),...patch};
  assert.equal(verifiedEconomicRateScore(p,asOf),null,JSON.stringify(patch));
 }
});
test('soft-stale (2–5 business days) remains READY; it is not silently labeled CURRENT',()=>{
 const p=base();p.freshness='SOFT_STALE';
 assert.equal(verifiedEconomicRateScore(p,asOf),55);
 p.freshness='HARD_STALE';assert.equal(verifiedEconomicRateScore(p,asOf),null);
});
test('all four factors exact source IDs, valid date and weighted score parity required',()=>{
 for(const modify of [
  p=>p.indicators.pop(),p=>p.indicators[0].componentId='RATE_R2',
  p=>p.indicators[1].status='PARTIAL',p=>p.indicators[1].score=null,
  p=>p.indicators[2].asOfDate='2026-11-18',
  p=>p.indicators[3].asOfDate='2026-02-30',
  p=>p.indicators[2].score=10,p=>p.score=56
 ]){
  const p=base();modify(p);assert.equal(verifiedEconomicRateScore(p,asOf),null);
 }
});
test('display-only target exception needs actual policy source key and missing reason, not 0 score',()=>{
 const p=base();p.indicators[0]={...p.indicators[0],status:'UNAVAILABLE',score:null,currentRange:null,
  unavailableReason:'MISSING_RANGE_ENDPOINT'};
 assert.equal(verifiedEconomicRateScore(p,asOf),55);
 for(const patch of [{sourceKey:'DGS2'},{unavailableReason:'DATA_INVALID'},
   {score:0},{status:'PARTIAL'}]){
  const x=base();x.indicators[0]={...p.indicators[0],...patch};
  assert.equal(verifiedEconomicRateScore(x,asOf),null);
 }
});
test('numeric 0 and 100 remain valid; null, string, NaN or out-of-range never become zero',()=>{
 for(const value of [0,100]){
  const p=base();p.score=value;p.indicators.forEach(x=>x.score=value);
  assert.equal(verifiedEconomicRateScore(p,asOf),value);
 }
 for(const value of [null,'55',NaN,Infinity,-1,101]){
  const p={...base(),score:value};assert.equal(verifiedEconomicRateScore(p,asOf),null);
 }
});
test('valid asynchronous policy and daily-rate observations do not need a common new policy date',()=>{
 const p=base();p.indicators[0].asOfDate='2026-11-12';
 p.indicators[1].asOfDate='2026-11-17';
 p.indicators[2].asOfDate='2026-11-17';
 assert.equal(verifiedEconomicRateScore(p,asOf),55);
 const chart=verifiedEconomicRateChart(p,asOf,55);
 assert.equal(chart.at(-1).date,'2026-11-16');
 assert.equal(isEconomicRateChartCurrent(chart,asOf,55),false);
});
test('future, invalid-calendar and older-than-one-year stored chart dates are excluded',()=>{
 const p=base();p.trend=[{label:'2025-01-02',value:30},{label:'2026-02-30',value:40},
  {label:'2026-11-18',value:90},...p.trend.slice().reverse()];
 assert.deepEqual(verifiedEconomicRateChart(p,asOf,55),
  base().trend.map(({label,value})=>({date:label,score:value})));
});
test('same-day contradictory source scores suppress chart, not proven current headline',()=>{
 const p=base();p.trend.push({label:'2026-11-16',value:80});
 assert.equal(verifiedEconomicRateScore(p,asOf),55);
 assert.deepEqual(verifiedEconomicRateChart(p,asOf,55),[]);
});
test('an observed current score point must match headline; do not invent current day from older series',()=>{
 const p=base();assert.equal(isEconomicRateChartCurrent(verifiedEconomicRateChart(p,asOf,55),asOf,55),false);
 p.trend.push({label:asOf,value:55});
 assert.equal(isEconomicRateChartCurrent(verifiedEconomicRateChart(p,asOf,55),asOf,55),true);
 p.trend.at(-1).value=56;
 assert.deepEqual(verifiedEconomicRateChart(p,asOf,55),[]);
});
test('duplicate same-value points collapse and a genuine score 0 is never a null gap',()=>{
 const p=base();p.trend.push({...p.trend.at(-1)},{label:'2026-11-01',value:0});
 const chart=verifiedEconomicRateChart(p,asOf,55);
 assert.equal(chart.length,4);assert.equal(chart.find(x=>x.date==='2026-11-01').score,0);
});
test('page applies R3 guard and keeps inflation, employment and other ten domain original paths',()=>{
 assert.match(panel,/id==="rates"\?verifiedEconomicRateScore\(domain,payload\?\.asOfDate\)/);
 assert.match(panel,/verifiedEconomicRateChart\(domain,payload\?\.asOfDate,score\)/);
 assert.match(panel,/isEconomicRateChartCurrent\(rateChart,payload\?\.asOfDate,score\)/);
 assert.match(panel,/id==="rates"\?rateChart:id==="credit"\?creditChart:id==="growth"\?growthChart:economicOneYearChart/);
 assert.match(panel,/useStoredIndex<EmploymentR6Display>\("\/api\/employment-r6\/observations"/);
 assert.match(panel,/id==="inflation"\?inflationChart:id==="employment"\?employmentChart:id==="rates"\?rateChart/);
});
