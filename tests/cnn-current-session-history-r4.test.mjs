import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cnnNyObservationDay,currentCnnSessionHistory,currentCnnSessionCheckedPoints} from '../lib/cnn-current-session-history-r4.mjs';

const current='2026-11-16T22:59:30.000Z';
const obs=(observedAt,score)=>({observedAt,score});
const check=(checkedAt,sourceObservedAt,score)=>({checkedAt,sourceObservedAt,score});

test('prior-week verified checks never become the current CNN 1D baseline',()=>{
 const old='2026-11-06T23:59:54.000Z';
 const actual=currentCnnSessionHistory(current,{checkedPoints:[
  check('2026-11-07T00:00:02.000Z',old,50),
  check('2026-11-07T00:30:02.951Z',old,53),
 ]});
 assert.deepEqual(actual,[]);
});
test('prior-week source observations cannot appear as current 1D points',()=>{
 assert.deepEqual(currentCnnSessionHistory(current,{observedPoints:[
  obs('2026-11-06T20:00:00.000Z',51),obs('2026-11-06T23:59:54.000Z',53),
 ]}),[]);
});
test('real current-session intraday points and 0 score survive without interpolation',()=>{
 const actual=currentCnnSessionHistory(current,{intradayObservations:[
  obs('2026-11-16T20:00:00.000Z',0),
  obs('2026-11-16T22:59:30.000Z',31),
  obs('2026-11-06T23:59:54.000Z',90),
 ]});
 assert.deepEqual(actual.map(p=>p.score),[0,31]);
 assert.deepEqual(actual.map(p=>p.date),['2026-11-16T20:00:00.000Z','2026-11-16T22:59:30.000Z']);
});
test('same-session verified checks retain actual checkedAt and source date distinction',()=>{
 const actual=currentCnnSessionHistory(current,{checkedPoints:[
  check('2026-11-16T22:00:00.000Z','2026-11-16T21:59:00.000Z',31),
  check('2026-11-16T23:20:00.000Z',current,32),
 ]});
 assert.deepEqual(actual.map(p=>p.date),['2026-11-16T22:00:00.000Z','2026-11-16T23:20:00.000Z']);
 assert.deepEqual(actual.map(p=>p.score),[31,32]);
});
test('same New York source day survives UTC midnight but not next NY day',()=>{
 assert.equal(cnnNyObservationDay('2026-11-17T00:30:00.000Z'),'2026-11-16');
 assert.equal(cnnNyObservationDay('2026-11-17T05:00:00.000Z'),'2026-11-17');
 const actual=currentCnnSessionHistory(current,{observedPoints:[
  obs('2026-11-17T00:30:00.000Z',45),
  obs('2026-11-17T05:00:00.000Z',50),
 ]});
 assert.deepEqual(actual.map(p=>p.score),[45]);
});
test('next-day PC checks with yesterday CNN source never extend the prior session',()=>{
 const checks=[
  check('2026-11-17T05:02:00.000Z',current,41),
  check('2026-11-17T05:17:00.000Z',current,43),
 ];
 assert.deepEqual(currentCnnSessionCheckedPoints(current,checks),[]);
 assert.deepEqual(currentCnnSessionHistory(current,{checkedPoints:checks}),[]);
});
test('a genuine source check across UTC midnight survives within the same NY session',()=>{
 const checks=[
  check('2026-11-17T00:02:00.000Z','2026-11-16T23:58:00.000Z',23),
  check('2026-11-17T00:32:00.000Z','2026-11-17T00:30:00.000Z',24),
 ];
 assert.deepEqual(currentCnnSessionCheckedPoints(current,checks).map(p=>p.score),[23,24]);
 assert.deepEqual(currentCnnSessionHistory(current,{checkedPoints:checks}).map(p=>p.score),[23,24]);
});
test('PC checkedAt must not precede its claimed CNN source observation time',()=>{
 const invalid=check('2026-11-16T21:00:00.000Z','2026-11-16T21:01:00.000Z',70);
 assert.deepEqual(currentCnnSessionCheckedPoints(current,[invalid]),[]);
 assert.deepEqual(currentCnnSessionHistory(current,{checkedPoints:[invalid]}),[]);
});

test('exact-timestamp sidecar is retained once, with valid 0 over archived duplicate',()=>{
 const actual=currentCnnSessionHistory(current,{
  observedPoints:[obs('2026-11-16T22:00:00.000Z',4),obs('2026-11-16T23:00:00.000Z',5)],
  intradayObservations:[obs('2026-11-16T22:00:00.000Z',0)],
 });
 assert.deepEqual(actual.map(p=>p.score),[0,5]);
});
test('one legitimate archived point remains one point, not a synthetic line',()=>{
 const actual=currentCnnSessionHistory(current,{observedPoints:[obs('2026-11-16T21:00:00.000Z',30)]});
 assert.equal(actual.length,1);assert.equal(actual[0].score,30);
});
test('invalid timestamps and scores never become source observations',()=>{
 assert.deepEqual(currentCnnSessionHistory(undefined,{observedPoints:[obs(current,53)]}),[]);
 const actual=currentCnnSessionHistory(current,{observedPoints:[
  obs(current,null),obs(current,NaN),obs(current,101),obs(current,50),
 ]});
 assert.deepEqual(actual.map(p=>p.score),[50]);
});
test('stale verified checks cannot override current source sidecar observations',()=>{
 const actual=currentCnnSessionHistory(current,{
  checkedPoints:[
   check('2026-11-07T00:00:00.000Z','2026-11-06T21:00:00.000Z',10),
   check('2026-11-07T00:30:00.000Z','2026-11-06T21:00:00.000Z',15),
  ],
  intradayObservations:[obs('2026-11-16T21:00:00.000Z',30),obs(current,31)],
 });
 assert.deepEqual(actual.map(p=>p.score),[30,31]);
});
test('actual CNN card 1D path invokes current session guard; other periods are unchanged',()=>{
 const panel=readFileSync(new URL('../app/fear-greed/usa/cnn-panel.tsx',import.meta.url),'utf8');
 assert.match(panel,/currentCnnSessionHistory\(payload\?\.observedAt/);
 assert.match(panel,/checkedPoints:archived\?\.period===selectedPeriod/);
 assert.match(panel,/intradayObservations:observedSidecarReady/);
 assert.match(panel,/if \(selectedPeriod === "6M" \|\| selectedPeriod === "1Y"\)/);
 assert.match(panel,/periodBaseline[\s\S]*?selectedPeriod === "1D"\) return history.length>=2/);
 assert.match(panel,/currentSessionPcDates\.has\(value\)/);
 assert.match(panel,/cnnObservedTimes=new Set\(\[\.\.\.allIntraday\.map\(point=>point\.date\),\.\.\.archived\.points\.map\(point=>point\.observedAt\)\]\)/);
});


test('W06 #36 genuine later CNN observation is never hidden behind two older same-session PC checks',()=>{
 const result=currentCnnSessionHistory(current,{
  observedPoints:[
   obs('2026-11-16T21:30:00.000Z',40),
   obs(current,55),
  ],
  checkedPoints:[
   check('2026-11-16T22:00:00.000Z','2026-11-16T21:30:00.000Z',40),
   check('2026-11-16T22:15:00.000Z','2026-11-16T21:30:00.000Z',40),
  ],
  intradayObservations:[],
 });
 assert.deepEqual(result.map(p=>p.score),[40,40,40,55]);
 assert.equal(result.at(-1).date,current,'the last plotted time is the real CNN publication');
 assert.equal(result.at(-1).score,55,'the card can agree with its actual saved CNN observation');
});

test('W06 #36 one original archive point and one real sidecar point preserve both authentic times',()=>{
 const result=currentCnnSessionHistory(current,{
  observedPoints:[obs('2026-11-16T21:30:00.000Z',40)],
  intradayObservations:[obs(current,55)],
 });
 assert.deepEqual(result.map(p=>p.score),[40,55]);
 assert.deepEqual(result.map(p=>p.date),['2026-11-16T21:30:00.000Z',current]);
});

test('W06 #36 PC checks need two eligible records and cannot override an exact-time genuine source point',()=>{
 const original='2026-11-16T22:00:00.000Z';
 const one=currentCnnSessionHistory(current,{
  checkedPoints:[check(original,'2026-11-16T21:30:00.000Z',10)],
  observedPoints:[obs(original,0)],
 });
 assert.deepEqual(one.map(p=>p.score),[0],'single check does not create chart data');
 const two=currentCnnSessionHistory(current,{
  checkedPoints:[
   check(original,'2026-11-16T21:30:00.000Z',10),
   check('2026-11-16T22:30:00.000Z','2026-11-16T21:30:00.000Z',10),
  ],
  observedPoints:[obs(original,0),obs(current,55)],
  intradayObservations:[obs(original,0)],
 });
 assert.deepEqual(two.map(p=>p.score),[0,10,55],'authentic source overrides a same-time check');
 assert.equal(two.at(-1).date,current);
});

test('W06 #36 impossible calendar day cannot normalize into a CNN source observation',()=>{
 const impossible='2026-02-30T20:00:00.000Z';
 const actual='2026-03-02T20:00:00.000Z';
 assert.equal(cnnNyObservationDay(impossible),null);
 assert.equal(cnnNyObservationDay('2024-02-29T20:00:00.000Z'),'2024-02-29');
 assert.deepEqual(currentCnnSessionHistory(actual,{
  observedPoints:[obs(impossible,90)],
  intradayObservations:[obs(impossible,95)],
 }),[],'invalid date is not transformed into a real source point');
 assert.deepEqual(currentCnnSessionCheckedPoints(actual,[
  check(actual,impossible,90),
 ]),[],'invalid claimed source date is not a verified PC check');
});
