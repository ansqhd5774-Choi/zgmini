import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ANNUAL_SESSIONS,V11_CANDIDATE,evaluateV11Annual} from '../scripts/pc-writer/breadth-v11-one-year-evaluator.mjs';
const dates=Array.from({length:ANNUAL_SESSIONS},(_,i)=>new Date(Date.UTC(2025,0,1+i*1)).toISOString().slice(0,10));
const source={methodologyVersion:'BREADTH_R10_V9_FIXED_5F_VALID_OBSERVATION_SHADOW',
 quality:{noImputation:true,pitOfficialIndependentlyVerified:false}};
function build(gap=-1){
 let e=null;
 return dates.map((date,i)=>{
  if(i===gap){e=null;return {date,status:'NOT_READY',score:null,ema3:null,reason:'HISTORY_MISSING'};}
  const raw=i<=gap?50:gap>=0?70:50;
  e=e===null?raw:Math.round((e+.5*(raw-e))*1e9)/1e9;
  return {date,status:'CANDIDATE_READY',score:raw,ema3:e,reason:null};
 });
}
test('strict 252-market-session evaluation, no fabricated values or dynamic weight changes',()=>{
 const result=evaluateV11Annual({marketDates:dates,perDay:build(),source});
 assert.equal(result.year.requiredMarketSessions,252);
 assert.equal(result.year.observedValidDates,252);
 assert.equal(result.year.completeYearStatus,'FULL_252_OBSERVED');
 assert.equal(result.year.observedCoverage,1);
 assert.equal(result.baseline.lastScore,result.candidate.lastScore);
 assert.equal(result.changes.changedScoreDates,0);
 assert.equal(result.decision.productionPromotionApproved,false);
 assert.equal(result.sourceEvidence.providerCalls,0);
 assert.equal(result.benchmark.status,'NOT_AVAILABLE_SAME_DATE_STORED_B1_R5');
 assert.equal(result.proposedMethod,V11_CANDIDATE);
});
test('gap resets existing V9 but candidate continues smoothing at next valid date',()=>{
 const r=evaluateV11Annual({marketDates:dates,perDay:build(120),source});
 assert.equal(r.year.observedValidDates,251);
 assert.equal(r.year.missingDates,1);
 assert.equal(r.year.full252Observed,false);
 assert.equal(r.year.completeYearStatus,'PARTIAL_ANNUAL_EVIDENCE');
 assert.deepEqual(r.year.missingReasons,{HISTORY_MISSING:1});
 assert.equal(r.baseline.recoveries.length,1);
 assert.equal(r.baseline.recoveries[0].absoluteChange,20);
 assert.equal(r.candidate.recoveries[0].absoluteChange,10);
 assert.ok(r.changes.changedScoreDates>0);
 assert.equal(r.candidate.observedDates,251);
 assert.equal(r.candidate.missingDates,1); // never interpolate 120th day's score
});
test('input calendar does not silently accept 120-session study or nonmatching 252 date alignment',()=>{
 assert.throws(()=>evaluateV11Annual({marketDates:dates.slice(-120),perDay:build(),source}),/252_CALENDAR_REQUIRED/);
 assert.throws(()=>evaluateV11Annual({marketDates:dates.slice(0,-1).concat('2027-01-01'),perDay:build(),source}),/DATE_ALIGNMENT_FAILED/);
});
test('reject forged source qualification and disagreement with existing EMA3 baseline',()=>{
 assert.throws(()=>evaluateV11Annual({marketDates:dates,perDay:build(),source:{...source,quality:{noImputation:false,pitOfficialIndependentlyVerified:false}}}),/SOURCE_CONTRACT_NOT_VERIFIED/);
 const corrupt=build();corrupt[8].ema3=45;
 assert.throws(()=>evaluateV11Annual({marketDates:dates,perDay:corrupt,source}),/BASELINE_RECOMPUTE_MISMATCH/);
});
test('an unmatched independent benchmark is never scored as verified performance',()=>{
 const r=evaluateV11Annual({marketDates:dates,perDay:build(),source,compareB1:{score:55}});
 assert.equal(r.benchmark.status,'UNVERIFIED_EXTERNAL_BENCHMARK');
 assert.equal(r.decision.directionalSuperiorityProven,false);
});
test('runtime uses read-only 311-session source, never overwrites V9 outputs',()=>{
 const runtime=fs.readFileSync(new URL('../scripts/pc-writer/breadth-v11-one-year-shadow.mjs',import.meta.url),'utf8');
 assert.match(runtime,/ANNUAL_SESSIONS\+59/);
 assert.match(runtime,/historySessions:V11_HISTORY_READ_SESSIONS,writeLocal:false/);
 assert.doesNotMatch(runtime,/\bINSERT\b|\bUPDATE\b|fetch\(|\.writeFileSync\(|--publish/);
});
