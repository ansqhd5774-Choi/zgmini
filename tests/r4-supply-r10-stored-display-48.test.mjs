import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {supplyR10VerifiedDisplayScore,supplyR10VerifiedDisplayTrend} from '../lib/supply-r10-stored-display-r4.mjs';

const source=readFileSync(new URL('../app/supply-shock/supply-shock-panel.tsx',import.meta.url),'utf8');
const weights=[.35,.25,.15,.15,.10],ids=['G','E','O','P','I'];
const months=Array.from({length:13},(_,i)=>{
 const date=new Date(Date.UTC(2025,7+i,1));
 return date.toISOString().slice(0,10);
});
const base=()=>({status:'READY',score:65,methodologyVersion:'SUPPLY_SHOCK_R10',
 historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false,asOfDate:'2026-11-17',
 scoreObservationMonth:'2026-08',inputCount:12,sourceVersion:'SUPPLY_SHOCK_R10:fixture-v1',
 sourceStoredAt:Date.parse('2026-11-16T00:00:00Z'),missingFactors:[],
 indicators:ids.map((id,i)=>({id,status:'READY',weight:weights[i],score:65})),
 trend:months.map((label,i)=>({label,value:i===12?65:50+i}))});
const normalized=t=>t.map(({label,value})=>({label,value}));

test('R10 stores exactly five G/E/O/P/I scores and twelve raw input slots',()=>{
 const p=base();assert.equal(supplyR10VerifiedDisplayScore(p),65);
 assert.deepEqual(supplyR10VerifiedDisplayTrend(p,65),p.trend);
});
test('valid 0 and 100 remain numerical scores, not missing',()=>{
 for(const score of [0,100]){
  const p=base();p.score=score;p.indicators.forEach(x=>x.score=score);p.trend.at(-1).value=score;
  assert.equal(supplyR10VerifiedDisplayScore(p),score);
  assert.equal(supplyR10VerifiedDisplayTrend(p,score).at(-1).value,score);
 }
});
test('R9 or R10 candidate cannot impersonate the approved current R10 UI',()=>{
 for(const methodologyVersion of ['SUPPLY_SHOCK_R9','SUPPLY_SHOCK_R10_CANDIDATE',null]){
  const p={...base(),methodologyVersion};assert.equal(supplyR10VerifiedDisplayScore(p),null);
  assert.deepEqual(supplyR10VerifiedDisplayTrend(p,65),[]);
 }
});
test('PARTIAL, STALE and unavailable numeric result never appears as READY',()=>{
 for(const status of ['PARTIAL','STALE','UNAVAILABLE','ERROR',null]){
  const p={...base(),status};assert.equal(supplyR10VerifiedDisplayScore(p),null);
 }
});
test('missing source identity and wrong vintage/month/coverage fail closed',()=>{
 for(const patch of [{historyMode:'PIT'},{lookAheadSafe:true},{inputCount:6},
  {sourceVersion:null},{sourceStoredAt:0},{scoreObservationMonth:'2026-13'},
  {scoreObservationMonth:'2026-12'},{asOfDate:'2026-02-30'},
  {missingFactors:['G']},{missingFactors:null},{indicators:[]}])
  assert.equal(supplyR10VerifiedDisplayScore({...base(),...patch}),null,JSON.stringify(patch));
});
test('invalid or conflicting factor score, weight and count do not show a false headline',()=>{
 const changes=[
  p=>p.indicators.pop(),p=>p.indicators[2].status='PARTIAL',
  p=>p.indicators[0].id='oilShock',p=>p.indicators[1].weight=.20,
  p=>p.indicators[0].score=0,p=>p.score=70,
 ];
 for(const change of changes){const p=base();change(p);assert.equal(supplyR10VerifiedDisplayScore(p),null);}
});
test('null, nonnumeric and out-of-range published score cannot be coerced to zero',()=>{
 for(const score of [null,undefined,'65',NaN,Infinity,-1,101])
  assert.equal(supplyR10VerifiedDisplayScore({...base(),score}),null);
});
test('a future, invalid or non-month-start observation is not fabricated into chart',()=>{
 const p=base();p.trend.push({label:'2026-12-01',value:90});
 p.trend.push({label:'2026-02-30',value:90});
 p.trend.push({label:'2026-08-15',value:90});
 p.trend.push({label:'2026-06-01',value:null});
 assert.deepEqual(supplyR10VerifiedDisplayTrend(p,65),base().trend);
});
test('missing month or shortened 12-month history is not labeled one-year complete',()=>{
 const p=base();p.trend.splice(4,1);
 assert.deepEqual(supplyR10VerifiedDisplayTrend(p,65),[]);
 p.trend=base().trend.slice(-12);
 assert.deepEqual(supplyR10VerifiedDisplayTrend(p,65),[]);
});
test('a newer incomplete diagnostic month cannot replace the last approved common month',()=>{
 const p=base();p.trend.push({label:'2026-09-01',value:33});
 assert.deepEqual(supplyR10VerifiedDisplayTrend(p,65),base().trend);
});
test('conflicting same-month score and mismatched final point suppress chart, preserve valid headline',()=>{
 const p=base();p.trend.push({label:'2026-08-01',value:80});
 assert.equal(supplyR10VerifiedDisplayScore(p),65);
 assert.deepEqual(supplyR10VerifiedDisplayTrend(p,65),[]);
 const q=base();q.trend.at(-1).value=66;
 assert.deepEqual(supplyR10VerifiedDisplayTrend(q,65),[]);
});
test('identical observations collapse and valid records are sorted without changing values',()=>{
 const p=base();p.trend=[...base().trend.slice().reverse(),base().trend.at(-1)];
 assert.deepEqual(supplyR10VerifiedDisplayTrend(p,65),base().trend);
});
test('actual R10 panel uses verified score/chart and keeps five existing areas',()=>{
 assert.match(source,/supplyR10VerifiedDisplayScore\(payload\)/);
 assert.match(source,/supplyR10VerifiedDisplayTrend\(payload,score\)/);
 assert.match(source,/const order=\['G','E','O','P','I'\] as const/);
 assert.match(source,/MarketFearGreedChart showExtrema data=\{trend\}/);
 assert.match(source,/score===null\|\|trend.length===0/);
});
