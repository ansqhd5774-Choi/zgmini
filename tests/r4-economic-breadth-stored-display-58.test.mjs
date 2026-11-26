import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readBreadthB1R5StoredScore,smoothBreadthFinalSeries,composeBreadthB1R5Score} from '../lib/market-score/breadth-b1-r5-reader.mjs';
import {projectBreadthB1R5PublicDomain} from '../lib/market-score/breadth-b1-r5-worker-domain.mjs';
import {B1_R5_METHOD,B1_R5_FINAL_EMA_PERIOD} from '../lib/market-score/breadth-b1-r5-contract.mjs';
import {buildCmR1DomainResults} from '../lib/market-score/domain-adapter-r1.mjs';
import {buildCompositeMarketScore,DOMAIN_WEIGHTS} from '../lib/market-score/composite-model-r1.mjs';
import {latestCompletedSession} from '../lib/market-score/breadth-b1-r3-calendar.mjs';
import {V9_METHOD} from '../worker/breadth-v9-public-view.mjs';
import {V11_METHOD} from '../worker/breadth-v11-public-view.mjs';
import {economicBreadthSourceDate,verifiedEconomicBreadthScore,
  verifiedEconomicBreadthChart,isEconomicBreadthChartCurrent} from '../lib/economic-breadth-stored-display-r4.mjs';

const snap='2026-10-05',now='2026-10-05T21:00:00.000Z';
const base=(date='2026-10-05',value=20)=>({
 status:'READY',score:value,observationDate:date,source:'D1_STORED_BREADTH_PRICE_VOLUME',
 components:{advanceRatio:value/100,advanceValueShare:value/100},
 smoothing:{ema5:value,ema20:value},runtime:{asOfDate:snap,observationDate:date,lagTradingSessions:0},
 trend:[{label:'2026-10-01',value:50},{label:'2026-10-02',value:100},
  ...(date==='2026-10-05'?[{label:date,value}]:[])],
});
async function fixture({record=base(),asOf=snap,time=now}={}){
 const result=await readBreadthB1R5StoredScore({storedR4Reader:async()=>record,asOfDate:asOf});
 const projected=projectBreadthB1R5PublicDomain(result,time);
 const domain=buildCompositeMarketScore(buildCmR1DomainResults({publicDomains:{breadth:projected}}),{updatedAt:time}).domains.find(x=>x.id==='breadth');
 return {result,projected,domain};
}
const score=(domain,asOf=snap)=>verifiedEconomicBreadthScore(domain,asOf);
const chart=(domain,asOf=snap)=>verifiedEconomicBreadthChart(domain,asOf,domain.score);
const close=(a,b)=>assert.ok(Math.abs(a-b)<=1e-9,`expected ${a} == ${b}`);

test('live public slot is B1-R5 4-factor EMA3, five-factor V9/V11 are retired and not substituted',async()=>{
 const f=await fixture();
 assert.equal(f.result.methodologyVersion,B1_R5_METHOD);
 assert.equal(B1_R5_FINAL_EMA_PERIOD,3);
 assert.equal(f.domain.methodologyVersion,B1_R5_METHOD);
 assert.equal(f.domain.weight,DOMAIN_WEIGHTS.find(x=>x.id==='breadth').weight);
 assert.deepEqual(f.domain.indicators.map(x=>x.id),['breadth-41','breadth-42','breadth-43','breadth-44']);
 for(const version of [V9_METHOD,V11_METHOD,'B1-R4']){
  assert.equal(score({...f.domain,methodologyVersion:version}),null);
 }
 const old9=readFileSync(new URL('../worker/breadth-v9-public-view.mjs',import.meta.url),'utf8');
 const old11=readFileSync(new URL('../worker/breadth-v11-public-view.mjs',import.meta.url),'utf8');
 assert.match(old9,/projectV9PublicDomain\(\)\{return null;\}/);
 assert.match(old11,/projectV11PublicDomain\(\)\{return null;\}/);
});

test('approved Reader 30/20/30/20 four-factor raw and final 3-day EMA are preserved',async()=>{
 const result=composeBreadthB1R5Score({advanceRatio:.2,advanceValueShare:.2,ema5:20,ema20:20});
 assert.equal(result.score,20);
 const f=await fixture();
 assert.equal(f.result.smoothing.rawScore,20);
 assert.equal(f.result.smoothing.finalPeriod,3);
 assert.equal(f.result.smoothing.finalEma,47.5);
 assert.equal(f.result.score,47.5); // prior EMA3: Fri 75, Mon .5*20+.5*75
 close(f.domain.score,47.5);
 close(f.domain.trend.at(-1).value,f.domain.score);
 assert.equal(score(f.domain),47.5);
});

test('the actual completed trade date survives worker, CM-R1 and card source metadata',async()=>{
 const f=await fixture();
 assert.equal(f.projected.observationDate,snap);
 assert.equal(f.domain.observationDate,snap);
 assert.equal(f.domain.asOfDate,snap);
 assert.equal(economicBreadthSourceDate(f.domain,snap),snap);
 assert.equal(f.domain.updatedAt,now);
 assert.ok(f.domain.indicators.every(x=>x.observationDate===snap));
});

test('a new eligible market session recomputes server EMA3 and advances chart last point',async()=>{
 const prior=await fixture({record:base('2026-10-02',100),asOf:'2026-10-02',time:'2026-10-02T21:00:00.000Z'});
 const next=await fixture();
 close(prior.domain.score,75);
 close(next.domain.score,47.5);
 assert.equal(prior.domain.observationDate,'2026-10-02');
 assert.equal(next.domain.observationDate,'2026-10-05');
 assert.equal(chart(next.domain).at(-1).date,'2026-10-05');
 assert.equal(isEconomicBreadthChartCurrent(chart(next.domain),next.domain,snap,47.5),true);
});

test('query on next day with no new stored qualified session is carry-forward, not a phantom chart point',async()=>{
 const record=base(),q1=await fixture(),q2=await fixture({
  record:{...record,runtime:{...record.runtime,asOfDate:'2026-10-06',lagTradingSessions:1}},
  asOf:'2026-10-06',time:'2026-10-06T21:00:00.000Z',
 });
 assert.equal(q2.domain.score,q1.domain.score);
 assert.equal(q2.domain.observationDate,'2026-10-05');
 assert.equal(q2.domain.freshness,'LAG_1_SESSIONS');
 assert.deepEqual(chart(q2.domain,'2026-10-06'),chart(q1.domain));
 assert.equal(chart(q2.domain,'2026-10-06').some(p=>p.date==='2026-10-06'),false);
 assert.equal(score(q2.domain,'2026-10-06'),47.5);
});

test('Friday to Monday counts as consecutive market sessions for EMA3',()=>{
 const out=smoothBreadthFinalSeries([
  {label:'2026-10-01',value:50},{label:'2026-10-02',value:100},{label:'2026-10-05',value:20},
 ]);
 assert.deepEqual(out.map(x=>x.value),[50,75,47.5]); // formula uses previous Friday EMA
});

test('missing completed market session resets EMA rather than fabricates skipped trade day',()=>{
 const out=smoothBreadthFinalSeries([{label:'2026-10-01',value:50},{label:'2026-10-05',value:20}]);
 assert.deepEqual(out.map(x=>x.value),[50,20]);
 assert.equal(out.some(x=>x.label==='2026-10-02'),false);
});

test('Saturday, Sunday, and official NYSE holiday cannot become stored EMA3 trade date',()=>{
 for(const date of ['2026-10-03','2026-10-04','2026-11-26']){
  assert.throws(()=>smoothBreadthFinalSeries([{label:date,value:20}]),/B1_R5_FINAL_SERIES_INVALID/);
 }
});

test('NY trading session before 16:15 ET is not completed even if a stored point claims READY',async()=>{
 const before=await fixture({time:'2026-10-05T20:14:00.000Z'});
 assert.equal(latestCompletedSession(new Date('2026-10-05T20:14:00.000Z')),'2026-10-02');
 assert.equal(score(before.domain),null);
 const after=await fixture({time:'2026-10-05T20:16:00.000Z'});
 assert.equal(latestCompletedSession(new Date('2026-10-05T20:16:00.000Z')),snap);
 assert.equal(score(after.domain),47.5);
});

test('source asOf can be next day, but factor observations must be the genuine last stored session',async()=>{
 const f=await fixture();
 for(const patch of [
  {asOfDate:'2026-10-06'},{asOfDate:'2026-10-04'},
  {observationDate:'2026-10-06'},{observationDate:'2026-10-04'},
  {observationDate:'2026-02-30'},
 ]){
  assert.equal(score({...f.domain,...patch}),null);
 }
});

test('old CM-R1 B1-R5 has no top-level observation date; four matching stored rows supply it',async()=>{
 const f=await fixture(),old={...f.domain,observationDate:null};
 assert.equal(economicBreadthSourceDate(old,snap),snap);
 assert.equal(score(old),47.5);
 const broken={...old,indicators:f.domain.indicators.map(x=>({...x}))};
 broken.indicators[3].observationDate='2026-10-02';
 assert.equal(score(broken),null);
});

test('missing, stale and invalid factor values never pass as a zero score',async()=>{
 const f=await fixture();
 for(const patch of [{status:'PARTIAL'},{score:null},{score:'50'},{missingFactors:['breadth-42']},{freshness:'UNKNOWN'}]){
  assert.equal(score({...f.domain,...patch}),null);
 }
 for(const value of [undefined,null,NaN,Infinity,-1,101,'0']){
  const modified=f.domain.indicators.map(x=>({...x}));modified[2].score=value;
  assert.equal(score({...f.domain,indicators:modified}),null);
 }
});

test('a true zero result stays a real zero, not an unavailable value',async()=>{
 const zero=base('2026-10-05',0);
 zero.trend=[{label:snap,value:0}];
 const f=await fixture({record:zero});
 assert.equal(f.domain.score,0);
 assert.equal(score(f.domain),0);
 assert.equal(chart(f.domain)[0].score,0);
});

test('four stable approved factor IDs, values, observation dates and one source are mandatory',async()=>{
 const f=await fixture();
 for(const n of [0,1,2,3,5]){
  const indicators=n===5?[...f.domain.indicators,{id:'breadth-45',score:50}]:f.domain.indicators.slice(0,n);
  assert.equal(score({...f.domain,indicators}),null);
 }
 for(const mutate of [
  a=>a[0].id='F1',
  a=>a[1].name='legacy',
  a=>a[2].source='UNTRUSTED_OTHER_SOURCE',
  a=>a[3].status='PARTIAL',
  a=>a[0].value=30,
 ]){
  const indicators=f.domain.indicators.map(x=>({...x}));mutate(indicators);
  assert.equal(score({...f.domain,indicators}),null);
 }
});

test('a conflicting duplicate saved point cannot overwrite last stored EMA3 with array order',async()=>{
 const f=await fixture();
 const conflicting={...f.domain,trend:[...f.domain.trend,{label:snap,value:99}]};
 assert.equal(score(conflicting),null);
 assert.deepEqual(chart(conflicting),[]);
});

test('the missing or contradictory latest stored EMA3 point fails closed and never inserts current',async()=>{
 const f=await fixture();
 const absent={...f.domain,trend:f.domain.trend.filter(p=>p.label!==snap)};
 assert.equal(score(absent),null);
 assert.deepEqual(chart(absent),[]);
 const mismatch={...f.domain,trend:f.domain.trend.map(p=>p.label===snap?{...p,value:51}:p)};
 assert.equal(score(mismatch),null);
 assert.deepEqual(chart(mismatch),[]);
});

test('future, weekend and impossible dates are excluded, without changing actual stored input history',async()=>{
 const f=await fixture(),original=[...f.domain.trend];
 const future={...f.domain,trend:[...original,{label:'2026-10-06',value:88},{label:'2026-10-03',value:45},{label:'2026-02-30',value:70}]};
 assert.equal(score(future),47.5);
 assert.equal(chart(future).at(-1).date,snap);
 assert.equal(chart(future).some(p=>['2026-10-06','2026-10-03','2026-02-30'].includes(p.date)),false);
 assert.deepEqual(f.domain.trend,original);
});

test('B1-R5 stored domain exposes real observation day, 3-day EMA no fake evaluation-day point, and guarded UI',()=>{
 const panel=readFileSync(new URL('../app/economic-indicators/economic-detail-panel.tsx',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../lib/market-score/breadth-b1-r5-worker-domain.mjs',import.meta.url),'utf8');
 const adapter=readFileSync(new URL('../lib/market-score/domain-adapter-r1.mjs',import.meta.url),'utf8');
 const composite=readFileSync(new URL('../lib/market-score/composite-model-r1.mjs',import.meta.url),'utf8');
 for(const x of [
  'id==="breadth"?verifiedEconomicBreadthScore(domain,payload?.asOfDate)',
  'verifiedEconomicBreadthChart(domain,payload?.asOfDate,score)',
  'isEconomicBreadthChartCurrent(breadthChart,domain,payload?.asOfDate,score)',
  'id==="breadth"?breadthChart',
  'id!=="breadth"||(score!==null&&breadthChartCurrent)',
  'id==="breadth"&&(score===null||!breadthChartCurrent)',
  'economicBreadthSourceDate(domain,payload?.asOfDate)',
  '||id==="fundFlows"||id==="breadth"||id==="dollarFx"||id==="commodities")&&score===null',
 ])assert.ok(panel.includes(x),x);
 assert.match(worker,/observationDate,/);
 assert.ok(adapter.includes('observationDate:publicDomains.breadth?.observationDate??null'));
 assert.ok(composite.includes('observationDate:src?.observationDate??null'));
});
