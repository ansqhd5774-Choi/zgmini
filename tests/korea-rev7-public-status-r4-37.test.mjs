import test from 'node:test';
import assert from 'node:assert/strict';
import {publicSnapshot} from '../worker/korea-funds.mjs';
import {REV7_VERSION,REV7_FACTORS} from '../worker/korea-rev7-engine.mjs';
import {koreaRev7VisibleHistoryDays,koreaRev7ChartScore} from '../lib/korea-rev7-display-day-r4.mjs';

const row=(date,score,status)=>({
 date,methodology_version:REV7_VERSION,
 factors_json:JSON.stringify(Object.fromEntries(REV7_FACTORS.map(id=>[id,{id,score:50}]))),
 composite_json:JSON.stringify({observationDate:date,score,...(status===undefined?{}:{status})}),
 history_mode:'RECONSTRUCTED_CURRENT_VINTAGE',point_in_time_verified:0,
 calculated_at:'2026-11-20T12:00:00.000Z',
});
const snapshot=async rows=>publicSnapshot({},{
 loadProgress:async()=>({status:'COMPLETE',successfulTradingDates:1030}),
 loadRows:async()=>rows,
 clock:()=>new Date('2026-11-20T12:00:00.000Z'),
});

test('W06 #37 numeric WARMUP cannot replace the last READY Rev7 card or chart point',async()=>{
 const view=await snapshot([row('20261118',0,'READY'),row('20261119',99,'WARMUP')]);
 assert.equal(view.composite.status,'READY');
 assert.equal(view.composite.observationDate,'20261118');
 assert.equal(view.composite.displayScore,0);
 assert.deepEqual(view.composite.history.map(p=>[p.date,p.displayScore]),[
  ['20261118',0],['20261119',null],
 ]);
 for(const periodDays of [7,31,93,186,366]){
  const points=koreaRev7VisibleHistoryDays(view.composite.history,view.composite.observationDate,periodDays);
  assert.equal(points.at(-1).date,'20261118');
  assert.equal(koreaRev7ChartScore(points.at(-1)),0);
 }
});

test('W06 #37 PARTIAL/UNAVAILABLE numeric composite rows are not READY history points',async()=>{
 const view=await snapshot([
  row('20261118',60,'READY'),
  row('20261119',70,'PARTIAL'),
  row('20261120',80,'UNAVAILABLE'),
 ]);
 assert.equal(view.composite.observationDate,'20261118');
 assert.deepEqual(view.composite.history.map(p=>p.displayScore),[60,null,null]);
});

test('W06 #37 only non-READY numeric rows never yield a fabricated current score',async()=>{
 const view=await snapshot([row('20261119',0,'WARMUP'),row('20261120',99,'PARTIAL')]);
 assert.equal(view.composite.status,'UNAVAILABLE');
 assert.equal(view.composite.score,null);
 assert.equal(view.composite.displayScore,null);
 assert.equal(view.composite.history.length,0);
});

test('W06 #37 genuine READY zero and legacy status-absent scores remain valid',async()=>{
 const view=await snapshot([
  row('20261118',0,'READY'),
  row('20261119',38.76),
  row('20261120',null,'WARMUP'),
 ]);
 assert.equal(view.composite.observationDate,'20261119');
 assert.equal(view.composite.displayScore,38.8);
 assert.deepEqual(view.composite.history.map(p=>p.displayScore),[0,38.8,null]);
});


test('W06 #37 new completed trading day propagates from stored Reader to card and 6 chart windows',async()=>{
 const previous=await snapshot([row('20261118',42.3,'READY'),row('20261119',60.6,'READY')]);
 const current=await snapshot([
  row('20261118',42.3,'READY'),row('20261119',60.6,'READY'),
  row('20261120',64.1,'READY'),
 ]);
 assert.equal(previous.composite.observationDate,'20261119');
 assert.equal(previous.composite.displayScore,60.6);
 assert.equal(current.composite.status,'READY');
 assert.equal(current.composite.observationDate,'20261120');
 assert.equal(current.composite.previousObservationDate,'20261119');
 assert.equal(current.composite.score,64.1);
 assert.equal(current.composite.displayScore,64.1);
 assert.ok(Math.abs(current.composite.changePoints-3.5)<1e-9);
 assert.deepEqual(current.composite.history.map(p=>[p.date,p.displayScore]),[
  ['20261118',42.3],['20261119',60.6],['20261120',64.1],
 ]);
 for(const days of [1,7,31,93,186,366]){
  const visible=koreaRev7VisibleHistoryDays(current.composite.history,current.composite.observationDate,days);
  assert.equal(visible.at(-1)?.date,'20261120',`period=${days}`);
  assert.equal(koreaRev7ChartScore(visible.at(-1)),current.composite.displayScore,`period=${days}`);
 }
});

test('W06 #37 incomplete, impossible, and future dates cannot replace last complete day',async()=>{
 const view=await snapshot([
  row('20261118',42.3,'READY'),row('20261119',60.6,'READY'),
  row('20261120',99,'PARTIAL'),row('20260230',98,'READY'),
  row('20261122',97,'READY'),
 ]);
 assert.equal(view.composite.status,'READY');
 assert.equal(view.composite.observationDate,'20261119');
 assert.equal(view.composite.score,60.6);
 assert.deepEqual(view.composite.history.map(p=>[p.date,p.displayScore]),[
  ['20261118',42.3],['20261119',60.6],['20261120',null],
 ]);
});

test('W06 #37 genuine completed new zero and repeat GET never create a fake chart point',async()=>{
 const input=[row('20261118',42.3,'READY'),row('20261119',60.6,'READY'),row('20261120',0,'READY')];
 const a=await snapshot(input),b=await snapshot(input);
 assert.equal(a.composite.observationDate,'20261120');
 assert.equal(a.composite.score,0);
 assert.equal(a.composite.displayScore,0);
 assert.equal(a.composite.changePoints,-60.6);
 assert.deepEqual(a.composite.history,b.composite.history);
 assert.equal(a.composite.history.length,3);
 for(const days of [1,7,31,93,186,366]){
  const points=koreaRev7VisibleHistoryDays(a.composite.history,a.composite.observationDate,days);
  assert.equal(points.at(-1)?.date,'20261120');
  assert.equal(koreaRev7ChartScore(points.at(-1)),0);
 }
});
