import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {creditVerifiedDisplayScore,creditVerifiedDisplayTrend} from '../lib/credit-risk-stored-display-r4.mjs';
const src=readFileSync(new URL('../app/credit-risk/credit-risk-panel.tsx',import.meta.url),'utf8');
const base={status:'READY',methodologyVersion:'CREDIT_RISK_DIAGNOSTIC_R1',
 historyMode:'CURRENT_VINTAGE_DERIVED_1Y',lookAheadSafe:false,scoreMatch:true,
 asOfDate:'2026-11-17',score:54,
 trend:[{label:'2026-09-01',value:41},{label:'2026-09-30',value:45},
        {label:'2026-10-30',value:51},{label:'2026-11-17',value:54}]};

test('current READY 0 and 100 remain usable with an independently matched saved score',()=>{
 for(const score of [0,54,100])assert.equal(creditVerifiedDisplayScore({...base,score}),score);
});
test('PARTIAL numeric or STALE numeric must never appear as a confirmed credit score',()=>{
 for(const status of ['PARTIAL','STALE','UNAVAILABLE','ERROR',null]){
  const payload={...base,status};
  assert.equal(creditVerifiedDisplayScore(payload),null);
  assert.deepEqual(creditVerifiedDisplayTrend(payload,payload.score),[]);
 }
});
test('saved current score disagreement prevents a fake latest observation point',()=>{
 const payload={...base,scoreMatch:false};
 assert.equal(creditVerifiedDisplayScore(payload),null);
 assert.deepEqual(creditVerifiedDisplayTrend(payload,54),[]);
});
test('R1 method and current-vintage markers must exactly match the approved projection',()=>{
 for(const changed of [{methodologyVersion:'CREDIT_R2_NFCI_4FACTOR'},
  {methodologyVersion:null},{historyMode:'POINT_IN_TIME_VERIFIED'},
  {historyMode:null},{lookAheadSafe:true},{lookAheadSafe:null},
  {asOfDate:'2026-02-30'},{asOfDate:null}]){
  assert.equal(creditVerifiedDisplayScore({...base,...changed}),null);
 }
});
test('unknown, nonnumeric or out-of-range scores are not fabricated into zero',()=>{
 for(const score of [-1,101,NaN,Infinity,null,undefined,'54'])
  assert.equal(creditVerifiedDisplayScore({...base,score}),null);
 const zero={...base,score:0,trend:[{label:'2026-11-17',value:0}]};
 assert.deepEqual(creditVerifiedDisplayTrend(zero,0),zero.trend);
});
test('future, invalid and null observations never enter the displayed 1Y curve',()=>{
 const payload={...base,trend:[...base.trend,{label:'2026-12-01',value:99},
  {label:'2026-02-30',value:99},{label:'2026-08-01',value:null},
  {label:'not-a-date',value:10}]};
 assert.deepEqual(creditVerifiedDisplayTrend(payload,54),base.trend.slice(1));
});
test('conflicting as-of observed point is rejected without changing the approved current score',()=>{
 const payload={...base,trend:[...base.trend,{label:'2026-11-17',value:56}]};
 assert.equal(creditVerifiedDisplayScore(payload),54);
 assert.deepEqual(creditVerifiedDisplayTrend(payload,54),base.trend.slice(1,-1));
});
test('same-day conflicting raw points are excluded; identical duplicates remain one observation',()=>{
 const payload={...base,trend:[...base.trend,
  {label:'2026-10-30',value:53},{label:'2026-09-30',value:45}]};
 assert.deepEqual(creditVerifiedDisplayTrend(payload,54),
   [{label:'2026-09-30',value:45},{label:'2026-11-17',value:54}]);
});
test('actual latest date per calendar month is retained after sorting without synthesized flat points',()=>{
 const payload={...base,trend:[base.trend[3],base.trend[1],base.trend[2],base.trend[0]]};
 assert.deepEqual(creditVerifiedDisplayTrend(payload,54),base.trend.slice(1));
 assert.deepEqual(creditVerifiedDisplayTrend({...base,trend:[]},54),[]);
});
test('source CreditRiskPanel wires verified source score, trend and comparisons; existing components retained',()=>{
 assert.match(src,/creditVerifiedDisplayScore\(payload\)/);
 assert.match(src,/creditVerifiedDisplayTrend\(payload,score\)/);
 assert.match(src,/MarketFearGreedChart showExtrema data=\{trend\}/);
 assert.match(src,/score===null\?\{\.\.\.item,value:null\}:item/);
 assert.match(src,/const order=\["hyCmdi","igCmdi","totalCmdi","bondVolatility"/);
 assert.doesNotMatch(src,/fetch\([^\n]*\/api\/collect/);
});
