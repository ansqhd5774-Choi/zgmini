import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recessionVerifiedDisplayScore,recessionVerifiedDisplayTrend} from '../lib/recession-stored-display-r4.mjs';

const source=readFileSync(new URL('../app/recession/recession-panel.tsx',import.meta.url),'utf8');
const base={status:'READY',score:53,asOfDate:'2026-11-17',
  methodologyVersion:'RECESSION_R13_CURRENT_VINTAGE',
  historyMode:'STORED_INPUTS_CURRENT_VINTAGE',lookAheadSafe:false,
  trend:[{label:'2026-09-30',value:50},{label:'2026-10-31',value:51},{label:'2026-11-17',value:53}]};

test('R13 READY current score, 0 and 100 remain valid',()=>{
  for(const score of [0,53,100])assert.equal(recessionVerifiedDisplayScore({...base,score}),score);
});
test('PARTIAL numeric, STALE numeric and failed state never impersonate READY',()=>{
  for(const status of ['PARTIAL','STALE','UNAVAILABLE','ERROR',null]){
    const payload={...base,status};assert.equal(recessionVerifiedDisplayScore(payload),null);
    assert.deepEqual(recessionVerifiedDisplayTrend(payload,payload.score),[]);
  }
});
test('methodology/vintage mismatch, missing PIT marker or missing asOf cannot claim R13',()=>{
  for(const change of [
    {methodologyVersion:'RECESSION_R12'},
    {methodologyVersion:null},
    {historyMode:'POINT_IN_TIME_VERIFIED'},
    {historyMode:null},
    {lookAheadSafe:true},
    {lookAheadSafe:null},
    {asOfDate:'2026-02-30'},
    {asOfDate:null},
  ])assert.equal(recessionVerifiedDisplayScore({...base,...change}),null);
});
test('NaN, out-of-range and missing score are never displayed; numeric 0 is not missing',()=>{
  for(const score of [-1,101,NaN,Infinity,null,undefined,'53'])
    assert.equal(recessionVerifiedDisplayScore({...base,score}),null);
  assert.deepEqual(recessionVerifiedDisplayTrend({...base,score:0,trend:[{label:base.asOfDate,value:0}]},0),
    [{label:base.asOfDate,value:0}]);
});
test('valid historic rows are chronologically sorted, future/malformed/null rows are not rendered',()=>{
  const payload={...base,trend:[
    {label:'2026-12-01',value:75},{label:'2026-11-17',value:53},
    {label:'2026-10-31',value:51},{label:'2026-02-30',value:12},
    {label:'2026-09-30',value:50},{label:'2026-08-30',value:null},
  ]};
  assert.deepEqual(recessionVerifiedDisplayTrend(payload,53),base.trend);
});
test('conflicting end-of-period point cannot disagree with the current card score',()=>{
  const payload={...base,trend:[...base.trend,{label:'2026-11-17',value:56}]};
  assert.deepEqual(recessionVerifiedDisplayTrend(payload,53),base.trend.slice(0,2));
});
test('conflicting duplicate historical same-date values are discarded, equal duplicates collapsed',()=>{
  const payload={...base,trend:[
    {label:'2026-09-30',value:50},{label:'2026-09-30',value:50},
    {label:'2026-10-31',value:51},{label:'2026-10-31',value:49},
    {label:'2026-11-17',value:53},
  ]};
  assert.deepEqual(recessionVerifiedDisplayTrend(payload,53),[base.trend[0],base.trend[2]]);
});
test('no chart points if current score is not independently verified',()=>{
  assert.deepEqual(recessionVerifiedDisplayTrend(base,49),[]);
  assert.deepEqual(recessionVerifiedDisplayTrend({...base,trend:null},53),[]);
});
test('real RecessionPanel uses the verified score/curve gates and does not compute or fetch provider data',()=>{
  assert.match(source,/recessionVerifiedDisplayScore\(payload\)/);
  assert.match(source,/recessionVerifiedDisplayTrend\(payload,score\)/);
  assert.match(source,/MarketFearGreedChart showExtrema data=\{trend\}/);
  assert.doesNotMatch(source,/calculateRecession|providerFetch/);
});
