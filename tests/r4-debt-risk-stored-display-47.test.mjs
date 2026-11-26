import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {debtVerifiedDisplayScore,debtVerifiedDisplayTrend} from '../lib/debt-risk-stored-display-r4.mjs';
const source=readFileSync(new URL('../app/debt-risk/debt-risk-panel.tsx',import.meta.url),'utf8');
const base=()=>({status:'READY',methodologyVersion:'DEBT_RISK_R7',
 historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false,
 historyPolicy:'STORED_INPUTS_CURRENT_VINTAGE_LATEST_OBSERVATION_AT_OR_BEFORE_DATE_NO_INTERPOLATION',
 scoreMatch:true,score:63,recalculatedScore:63,asOfDate:'2026-11-17',
 trend:[{label:'2026-06-01',value:60},{label:'2026-10-01',value:62},{label:'2026-11-17',value:63}]});

test('approved R7 published/recalculated score and dated current point match exactly',()=>{
 const p=base();
 assert.equal(debtVerifiedDisplayScore(p),63);
 assert.deepEqual(debtVerifiedDisplayTrend(p,63),p.trend);
});
test('approved 0 and 100 scores remain valid, not confused with missing',()=>{
 for(const score of [0,100]){
  const p=base();p.score=score;p.recalculatedScore=score;p.trend.at(-1).value=score;
  assert.equal(debtVerifiedDisplayScore(p),score);
  assert.equal(debtVerifiedDisplayTrend(p,score).at(-1).value,score);
 }
});
test('PARTIAL/STALE/unavailable numeric scores cannot be shown as verified READY',()=>{
 for(const status of ['PARTIAL','STALE','UNAVAILABLE','ERROR',null]){
  const p={...base(),status};
  assert.equal(debtVerifiedDisplayScore(p),null);
  assert.deepEqual(debtVerifiedDisplayTrend(p,63),[]);
 }
});
test('recalculation mismatch and missing scoreMatch cannot display a false current point',()=>{
 for(const patch of [{scoreMatch:false},{scoreMatch:null},{recalculatedScore:62},
   {recalculatedScore:null},{recalculatedScore:NaN}]){
  const p={...base(),...patch};
  assert.equal(debtVerifiedDisplayScore(p),null);
  assert.deepEqual(debtVerifiedDisplayTrend(p,63),[]);
 }
});
test('wrong methodology, history kind, policy, look-ahead and date are rejected',()=>{
 for(const patch of [{methodologyVersion:'DEBT_RISK_R6'},
  {historyMode:'POINT_IN_TIME_VERIFIED'},{historyPolicy:'INTERPOLATED_DAILY'},
  {lookAheadSafe:true},{lookAheadSafe:null},{asOfDate:'2026-02-30'},{asOfDate:null}]){
  assert.equal(debtVerifiedDisplayScore({...base(),...patch}),null);
 }
});
test('invalid, out-of-range or absent score never gets silently converted to 0',()=>{
 for(const score of [NaN,Infinity,-1,101,null,undefined,'63'])
  assert.equal(debtVerifiedDisplayScore({...base(),score}),null);
});
test('unobserved future, invalid calendar day and null history entries are excluded',()=>{
 const p=base();
 p.trend=[{label:'2026-12-01',value:44},{label:'2026-02-30',value:55},
   {label:'2026-08-01',value:null},...p.trend];
 assert.deepEqual(debtVerifiedDisplayTrend(p,63),base().trend);
});
test('conflicting saved point on current date suppresses chart without altering verified score',()=>{
 const p=base();p.trend.push({label:'2026-11-17',value:70});
 assert.equal(debtVerifiedDisplayScore(p),63);
 assert.deepEqual(debtVerifiedDisplayTrend(p,63),[]);
});
test('same-date historical conflicts are omitted and exact duplicates collapse',()=>{
 const p=base();p.trend.push({label:'2026-06-01',value:90},{label:'2026-10-01',value:62});
 assert.deepEqual(debtVerifiedDisplayTrend(p,63),base().trend.slice(1));
});
test('an older saved trend does not fabricate the current as-of point',()=>{
 const p=base();p.trend=p.trend.slice(0,-1);
 assert.equal(debtVerifiedDisplayScore(p),63);
 assert.deepEqual(debtVerifiedDisplayTrend(p,63),[]);
});
test('out-of-order genuine dates sort stably, and the display uses actual source only',()=>{
 const p=base();p.trend=p.trend.reverse();
 assert.deepEqual(debtVerifiedDisplayTrend(p,63),base().trend);
 assert.deepEqual(debtVerifiedDisplayTrend({...p,trend:null},63),[]);
});
test('actual debt panel keeps five original factors and uses validated R7 score/trend/deltas',()=>{
 assert.match(source,/debtVerifiedDisplayScore\(payload\)/);
 assert.match(source,/debtVerifiedDisplayTrend\(payload,score\)/);
 assert.match(source,/score===null\|\|trend\.length===0\?\{\.\.\.item,value:null\}:item/);
 assert.match(source,/const order=\["dsr","debtGdp","rateBurden","creditStress","debtServiceCapacity"\]/);
 assert.match(source,/MarketFearGreedChart showExtrema data=\{trend\}/);
 assert.doesNotMatch(source,/fetch\([^\n]*\/api\/collect/);
});
