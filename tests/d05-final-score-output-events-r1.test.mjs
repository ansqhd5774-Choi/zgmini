import test from 'node:test';
import assert from 'node:assert/strict';
import {captureFinalScoreOutputs,mergeFinalScoreEvents,finalScoreDailySnapshots} from
 '../lib/score-history/d05-final-score-output-events-r1.mjs';
const time='2026-11-23T16:02:00.000Z';
const market=()=>({status:'SUCCESS',asOfDate:'2026-11-23',
 overall:{status:'READY',score:0,methodologyVersion:'CM-R1'},
 domains:[{id:'inflation',status:'READY',score:63.5,methodologyVersion:'I1'},
 {id:'credit',status:'PARTIAL',score:null},{id:'employment',status:'READY',score:100}],
 indicators:[{id:'raw',score:77}],overallTrend:[{date:'2025-11-24',score:88}]});
const sector=()=>({status:'READY',observationDate:'2026-11-20',methodologyVersion:'S3',
 phase:'CONFIRMED',sectors:[{id:'technology',score:51},{id:'financials',score:49}],
 history:[{date:'2025-11-24',technology:10,financials:20}]});
const theme=()=>({status:'READY',observationDate:'2026-11-20',methodologyVersion:'T32',
 phase:'PROVISIONAL',themes:[{id:'ai',score:75,history:[{date:'2025-11-24',score:10}]}]});
const capture=(group,body,calculatedAt=time)=>captureFinalScoreOutputs({group,body,calculatedAt});
test('market extracts only final READY overall and domain outputs',()=>{
 const events=capture('market',market());
 assert.deepEqual(events.map(e=>[e.scoreId,e.score]),[
  ['market:overall',0],['market:inflation',63.5],['market:employment',100]]);
 assert.equal(events[0].calculatedDateKst,'2026-11-24');
 assert.equal(events[0].asOfDate,'2026-11-23');
 assert.equal(events[0].pointKind,'ACTUAL_CALCULATED_FINAL_SCORE');
 assert.ok(events.every(e=>!('indicators'in e)&&!('overallTrend'in e)));
});
test('sector stores published scores, not its 252-day reconstructed historical curve',()=>{
 const e=capture('sector',sector());
 assert.deepEqual(e.map(v=>v.score),[51,49]);
 assert.deepEqual(e.map(v=>v.scoreId),['sector:technology','sector:financials']);
 assert.ok(e.every(v=>v.asOfDate==='2026-11-20'&&v.phase==='CONFIRMED'));
});
test('theme phase and final score are preserved without hidden bars/history',()=>{
 const e=capture('theme',theme());
 assert.equal(e.length,1);assert.equal(e[0].scoreId,'theme:ai');
 assert.equal(e[0].phase,'PROVISIONAL');assert.equal(e[0].score,75);
 assert.ok(!('history'in e[0]));
});
test('unavailable final output produces no artificial events',()=>{
 for(const group of ['market','sector','theme'])
  assert.deepEqual(capture(group,{status:'UNAVAILABLE'}),[]);
});
test('calculation clock cannot be taken from publisher or current GET',()=>{
 assert.throws(()=>captureFinalScoreOutputs({group:'market',body:market()}),/CLOCK_UNVERIFIED/);
 assert.throws(()=>capture('sector',sector(),'2026-11-23'),/CLOCK_UNVERIFIED/);
});
test('null, negative, overflow and nonnumeric scores must not be stored',()=>{
 for(const score of [null,NaN,Infinity,-1,101,'50']){
  const b=market();b.overall.score=score;
  assert.throws(()=>capture('market',b),/SCORE_INVALID/);
 }
});
test('bad logical category and impossible observation date fail safely',()=>{
 assert.throws(()=>capture('invalid',sector()),/GROUP_INVALID/);
 const b=market();b.asOfDate='2026-02-30';
 assert.throws(()=>capture('market',b),/DATE_INVALID/);
});
test('duplicate score IDs fail instead of overriding the earlier score',()=>{
 const b=sector();b.sectors.push({id:'technology',score:55});
 assert.throws(()=>capture('sector',b),/DUPLICATE/);
});
test('replayed identical calculation receipt does not duplicate history',()=>{
 const e=capture('market',market())[0];
 assert.deepEqual(mergeFinalScoreEvents([e],[e]),[e]);
});
test('same calculation clock cannot silently change a score',()=>{
 const e=capture('sector',sector())[0];
 const b=sector();b.sectors[0].score=55;
 assert.throws(()=>mergeFinalScoreEvents([e],[capture('sector',b)[0]]),/SAME_CLOCK_CONFLICT/);
});
test('actual intraday versions are retained while latest same-day point is displayed',()=>{
 const a=capture('theme',theme(),'2026-11-23T16:01:00.000Z')[0];
 const b=theme();b.themes[0].score=76;
 const z=capture('theme',b,'2026-11-23T16:03:00.000Z')[0];
 const merged=mergeFinalScoreEvents([z],[a]);
 assert.equal(merged.length,2);
 const daily=finalScoreDailySnapshots(merged);
 assert.equal(daily.length,1);assert.equal(daily[0].score,76);
});
test('one-year view includes only actual calculations inside date range',()=>{
 const e1=capture('market',market(),'2025-11-20T02:00:00.000Z')[0];
 const e2=capture('market',market(),'2026-11-23T02:00:00.000Z')[0];
 const days=finalScoreDailySnapshots([e1,e2],{fromDay:'2025-11-24',toDay:'2026-11-24'});
 assert.equal(days.length,1);assert.equal(days[0].calculatedDateKst,'2026-11-23');
});
test('UTC source event day and KST display day are not conflated',()=>{
 const e=capture('market',market(),'2026-11-23T15:02:00.000Z')[0];
 assert.equal(e.asOfDate,'2026-11-23');
 assert.equal(e.calculatedDateKst,'2026-11-24');
});
test('raw metadata injection and forged digest are rejected',()=>{
 const e=capture('market',market())[0];
 assert.throws(()=>mergeFinalScoreEvents([],[{...e,rawData:[1,2,3]}]),/EVENT_INVALID/);
 assert.throws(()=>finalScoreDailySnapshots([{...e,score:55}]),/EVENT_INVALID/);
});
test('missing/invalid ranges cannot create fake dates',()=>{
 assert.throws(()=>finalScoreDailySnapshots([],{fromDay:'2026-11-25',toDay:'2026-11-24'}),/DATE_RANGE_INVALID/);
 const b=theme();b.themes[0].score=null;
 assert.throws(()=>capture('theme',b),/SCORE_INVALID/);
});
