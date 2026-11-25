import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregateCnnIntraday,cnnDisplayScore} from '../lib/cnn-intraday-buckets-r1.mjs';
const at=(m,s='00')=>'2026-11-25T15:'+String(m).padStart(2,'0')+':'+s+'.000Z';
const p=(m,score,s)=>({observedAt:at(m,s),score});
const opt={currentObservedAt:at(59),now:Date.parse(at(59))};
test('display rounding is identical to existing CNN one-decimal card and preserves source values',()=>{
 const input=[p(0,15.81),p(1,15.83),p(2,15.87),p(3,15.81)];
 const original=structuredClone(input);
 const result=aggregateCnnIntraday(input,opt);
 assert.deepEqual(result.buckets.map(x=>x.score),[15.81,15.83,15.87,15.81]);
 assert.deepEqual(result.displayPoints.map(x=>x.score),[15.8,15.9,15.8]);
 assert.equal(result.displayPoints[0].observedAt,at(1));
 assert.equal(cnnDisplayScore(15.83),(15.83).toFixed(1));
 assert.deepEqual(input,original);
});
test('four intervals select the last real observation in each populated bucket',()=>{
 const input=[p(0,10),p(1,11),p(4,12),p(5,13),p(9,14),p(10,15),p(29,16),p(30,17)];
 for(const [minutes,expected] of [[1,[10,11,12,13,14,15,16,17]],[5,[12,14,15,16,17]],[10,[14,15,16,17]],[30,[16,17]]]){
  const result=aggregateCnnIntraday(input,{...opt,minutes});
  assert.deepEqual(result.buckets.map(x=>x.score),expected);
  for(const b of result.buckets)assert.ok(input.some(p=>p.observedAt===b.observedAt&&p.score===b.score));
 }
});
test('empty buckets break the line even for identical scores; incomplete bucket remains identifiable',()=>{
 const result=aggregateCnnIntraday([p(0,12),p(10,12),p(11,12)],{...opt,minutes:5,now:Date.parse(at(11,'30'))});
 assert.deepEqual(result.buckets.map(b=>b.complete),[true,false]);
 assert.deepEqual(result.displayPoints.map(p=>[p.kind,p.score]),[['observed',12],['gap',null],['observed',12]]);
 assert.equal(result.displayPoints.at(-1).observedAt,at(11));
 assert.equal(result.displayPoints[1].date,at(5));
});
test('late points and same-time corrections are ordered without mutating current score; invalid/future/other-session points excluded',()=>{
 const input=[p(2,20),p(0,10),p(2,21),p(1,0),p(3,101),p(59,30),{observedAt:'2026-11-25T03:00:00.000Z',score:99}];
 const r=aggregateCnnIntraday(input,{...opt,now:Date.parse(at(4))});
 assert.deepEqual(r.buckets.map(b=>b.score),[10,0,21]);
 assert.throws(()=>aggregateCnnIntraday(input,{...opt,minutes:2}),/CNN_INTRADAY_INTERVAL_INVALID/);
});
test('NY session boundary and repeated DST hour retain distinct real timestamps',()=>{
 const points=[
 {observedAt:'2026-11-01T03:59:00.000Z',score:10},
 {observedAt:'2026-11-01T04:00:00.000Z',score:11},
 {observedAt:'2026-11-01T05:15:00.000Z',score:12},
 {observedAt:'2026-11-01T06:15:00.000Z',score:13}];
 const r=aggregateCnnIntraday(points,{currentObservedAt:points.at(-1).observedAt,minutes:30,now:Date.parse('2026-11-01T07:00:00Z')});
 assert.equal(r.session,'2026-11-01');
 assert.deepEqual(r.buckets.map(x=>x.score),[11,12,13]);
 assert.equal(r.buckets[2].start-r.buckets[1].start,3600000);
 assert.deepEqual(aggregateCnnIntraday([],{...opt}).displayPoints,[]);
});
