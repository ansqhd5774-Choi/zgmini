import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LEGACY_MARKET_INFLATION_METHOD,LEGACY_MARKET_INFLATION_PARTS} from '../lib/market-score/inflation-legacy-public-domain.mjs';
import {verifiedEconomicInflationScore,verifiedEconomicInflationChart} from '../lib/economic-inflation-stored-display-r4.mjs';

const source=readFileSync(new URL('../app/economic-indicators/economic-detail-panel.tsx',import.meta.url),'utf8');
const asOf='2026-11-17';
const base=()=>({id:'inflation',status:'READY',
 methodologyVersion:LEGACY_MARKET_INFLATION_METHOD,freshness:'CURRENT_VINTAGE_ONLY',
 indicators:LEGACY_MARKET_INFLATION_PARTS.map((part,i)=>({
  id:part.id,status:'READY',score:[60,55,62,61.4496][i],observationDate:'2026-10-31',
 })),
 score:60*.35+55*.25+62*.15+61.4496*.25,
 trend:[{label:'2026-09-30',value:52},{label:'2026-10-31',value:55},
       {label:asOf,value:60*.35+55*.25+62*.15+61.4496*.25}]});

test('only approved CM-R1 original four-factor inflation model scores, no R2 substitution',()=>{
 const p=base();assert.equal(verifiedEconomicInflationScore(p,asOf),p.score);
 assert.deepEqual(verifiedEconomicInflationChart(p,asOf,p.score),
  p.trend.map(({label,value})=>({date:label,score:value})));
});
test('risk Inflation R2 and missing method cannot borrow economic 4-factor score',()=>{
 for(const methodologyVersion of ['INFLATION_R2_R29_56','CM_R1_INFLATION_R9',null]){
  const p={...base(),methodologyVersion};
  assert.equal(verifiedEconomicInflationScore(p,asOf),null);
  assert.deepEqual(verifiedEconomicInflationChart(p,asOf,p.score),[]);
 }
});
test('PARTIAL, STALE, wrong history vintage, missing 4-factor identity never display valid number',()=>{
 for(const patch of [{status:'PARTIAL'},{status:'STALE'},{freshness:'POINT_IN_TIME_VERIFIED'},
  {indicators:[]},{id:'recession'}]){
  assert.equal(verifiedEconomicInflationScore({...base(),...patch},asOf),null);
 }
});
test('each of the 4 factors must be READY and observed at or before as-of, even when one changes',()=>{
 const changes=[
  p=>p.indicators[0].status='PARTIAL',p=>p.indicators[0].id='cpi',
  p=>p.indicators[2].observationDate='2026-11-18',
  p=>p.indicators[1].score=null,p=>p.indicators.pop(),
  p=>p.score+=1,
 ];
 for(const f of changes){const p=base();f(p);assert.equal(verifiedEconomicInflationScore(p,asOf),null);}
});
test('0, 100, and legitimate 0 component distinguish valid values from missing',()=>{
 const p=base();p.score=0;p.indicators.forEach(x=>x.score=0);p.trend.at(-1).value=0;
 assert.equal(verifiedEconomicInflationScore(p,asOf),0);
 assert.equal(verifiedEconomicInflationChart(p,asOf,0).at(-1).score,0);
 const q=base();q.indicators[0].score=0;q.score-=21;q.trend.at(-1).value=q.score;
 assert.equal(verifiedEconomicInflationScore(q,asOf),q.score);
 const h=base();h.score=100;h.indicators.forEach(x=>x.score=100);h.trend.at(-1).value=100;
 assert.equal(verifiedEconomicInflationScore(h,asOf),100);
});
test('invalid current score, date and future factor cannot be replaced with 0 or newest data',()=>{
 for(const score of [null,undefined,'59',NaN,Infinity,-1,101])
  assert.equal(verifiedEconomicInflationScore({...base(),score},asOf),null);
 for(const day of ['2026-02-30','2026-11-18',null]){
  const p=base();if(day==='2026-11-18')p.indicators[3].observationDate=day;
  else assert.equal(verifiedEconomicInflationScore(p,day),null);
  if(day==='2026-11-18')assert.equal(verifiedEconomicInflationScore(p,asOf),null);
 }
});
test('future and invalid points excluded, null point remains a missing gap',()=>{
 const p=base();p.trend.push({label:'2026-12-01',value:89},{label:'2026-02-30',value:32});
 p.trend.unshift({label:'2026-08-31',score:null,value:0});
 const out=verifiedEconomicInflationChart(p,asOf,p.score);
 assert.equal(out[0].score,null);
 assert.equal(out.at(-1).date,asOf);
 assert.equal(out.length,4);
});
test('contradictory duplicate historic or current points suppress chart, not current 4-factor score',()=>{
 const p=base();p.trend.push({label:'2026-10-31',value:40});
 assert.equal(verifiedEconomicInflationScore(p,asOf),p.score);
 assert.deepEqual(verifiedEconomicInflationChart(p,asOf,p.score),[]);
 const q=base();q.trend.push({label:asOf,value:20});
 assert.deepEqual(verifiedEconomicInflationChart(q,asOf,q.score),[]);
});
test('missing or wrong last as-of value cannot be displayed as current chart point',()=>{
 const p=base();p.trend=p.trend.slice(0,-1);
 assert.deepEqual(verifiedEconomicInflationChart(p,asOf,p.score),[]);
 p.trend.push({label:asOf,value:p.score+1});
 assert.deepEqual(verifiedEconomicInflationChart(p,asOf,p.score),[]);
});
test('genuine stored history sorts by actual dates and preserves only one-year window',()=>{
 const p=base();p.trend=[{label:'2025-01-01',value:42},...p.trend.slice().reverse()];
 assert.deepEqual(verifiedEconomicInflationChart(p,asOf,p.score),
  base().trend.map(({label,value})=>({date:label,score:value})));
});
test('economic12 UI applies guard only to inflation and preserves all other domain scoring',()=>{
 assert.match(source,/id==="inflation"\?verifiedEconomicInflationScore\(domain,payload\?\.asOfDate\):/);
 assert.match(source,/verifiedEconomicInflationChart\(domain,payload\?\.asOfDate,score\)/);
 assert.match(source,/id==="inflation"\?inflationChart:/);
 assert.match(source,/MarketFearGreedChart data=\{chart\}/);
});
