import test from 'node:test';
import assert from 'node:assert/strict';
import {publicSnapshot} from '../worker/korea-funds.mjs';
import {REV7_VERSION,REV7_FACTORS} from '../worker/korea-rev7-engine.mjs';
import {koreaRev7ChartScore,koreaRev7VisibleHistoryDays} from '../lib/korea-rev7-display-day-r4.mjs';

const row=(date,score)=>({
 date,methodology_version:REV7_VERSION,
 factors_json:JSON.stringify(Object.fromEntries(REV7_FACTORS.map(id=>[id,{id,score:50}]))),
 composite_json:JSON.stringify({score,status:'READY',observationDate:date}),
 history_mode:'RECONSTRUCTED_CURRENT_VINTAGE',
 point_in_time_verified:0,
 calculated_at:'2026-11-20T10:00:00.000Z',
});
const data=[
 row('20261119',45.26),
 row('20261120',55.36),
 row('20261123',91.24),
 row('20260230',99.9),  // would pass old ^\d{8}$ test and Date.parse normalizes it
];
const get=async(now,records=data)=>publicSnapshot({},{
 loadProgress:async()=>({status:'COMPLETE',successfulTradingDates:1030}),
 loadRows:async()=>records,
 clock:()=>new Date(now),
});

test('W06 #37 Reader cannot show a future valid score as the Korea current trading day',async()=>{
 const actual=await get('2026-11-20T10:00:00.000Z'); // 19:00 KST Friday
 assert.equal(actual.composite.observationDate,'20261120');
 assert.equal(actual.composite.displayScore,55.4);
 assert.deepEqual(actual.composite.history.map(point=>point.date),['20261119','20261120']);
 for(const days of [7,31,93,186,366]){
  const history=koreaRev7VisibleHistoryDays(actual.composite.history,actual.composite.observationDate,days);
  assert.equal(history.at(-1).date,'20261120');
  assert.equal(koreaRev7ChartScore(history.at(-1)),actual.composite.displayScore);
 }
});
test('W06 #37 a genuinely later completed Korean calendar day becomes visible on subsequent read',async()=>{
 const now=await get('2026-11-23T10:00:00.000Z'); // 19:00 KST Monday
 assert.equal(now.composite.observationDate,'20261123');
 assert.equal(now.composite.displayScore,91.2);
 assert.equal(now.composite.history.at(-1).date,'20261123');
 assert.ok(now.composite.history.every(point=>point.date!=='20260230'));
});
test('W06 #37 an impossible 8-digit date can never become a public score or chart point',async()=>{
 const actual=await get('2026-11-20T10:00:00.000Z',[
  row('20260230',98),row('20261131',99),row('20261301',100),
 ]);
 assert.equal(actual.composite.status,'UNAVAILABLE');
 assert.equal(actual.composite.score,null);
 assert.equal(actual.composite.history.length,0);
});
test('W06 #37 the public Reader uses Korea local day, not UTC midnight',async()=>{
 const before=await get('2026-11-22T14:59:00.000Z'); // 23:59 Sunday in Seoul
 const after=await get('2026-11-22T15:01:00.000Z'); // 00:01 Monday in Seoul
 assert.equal(before.composite.observationDate,'20261120');
 assert.equal(after.composite.observationDate,'20261123');
 assert.equal(after.composite.history.at(-1).date,'20261123');
});
