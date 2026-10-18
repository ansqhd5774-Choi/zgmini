import test from "node:test";
import assert from "node:assert/strict";
import {auditBreadthSelectedSessionFreshness} from "../lib/market-score/breadth-b1-r3-gap-audit.mjs";
import {latestCompletedSession,countCompletedSessionsSince,isMarketSession} from "../lib/market-score/breadth-b1-r3-calendar.mjs";

const audit=(selected,at)=>auditBreadthSelectedSessionFreshness(selected,at,{
  latestCompletedSession,countCompletedSessionsSince,marketSession:isMarketSession,
});

test("R88 Oct13 evening ET: completed Oct13, provider selected Oct12",()=>{
  const x=audit("2026-10-12","2026-10-14T00:05:05.303Z");
  assert.deepEqual([x.expectedSession,x.selectedSession,x.lagCompletedSessions,x.status],
    ["2026-10-13","2026-10-12",1,"SOURCE_SESSION_BEHIND"]);
});
test("R88 Oct14 23:10 ET: completed Oct14, provider selected Oct13",()=>{
  const x=audit("2026-10-13","2026-10-15T03:10:11.010Z");
  assert.deepEqual([x.expectedSession,x.selectedSession,x.lagCompletedSessions,x.status],
    ["2026-10-14","2026-10-13",1,"SOURCE_SESSION_BEHIND"]);
});
test("R88 Oct16 01:35 ET: selected Oct15 is up-to-date",()=>{
  const x=audit("2026-10-15","2026-10-16T05:35:06.235Z");
  assert.deepEqual([x.expectedSession,x.lagCompletedSessions,x.status],
    ["2026-10-15",0,"LATEST_COMPLETED_SESSION"]);
});
test("R88 weekend: Friday data is latest Sunday evening",()=>{
  const x=audit("2026-10-16","2026-10-18T02:05:13.220Z");
  assert.equal(x.expectedSession,"2026-10-16");
  assert.equal(x.status,"LATEST_COMPLETED_SESSION");
});
test("before 16:15 ET do not mark current unfinished session stale",()=>{
  const x=audit("2026-10-13","2026-10-14T19:00:00.000Z");
  assert.equal(x.expectedSession,"2026-10-13");
  assert.equal(x.lagCompletedSessions,0);
});
test("after 16:15 ET the newly completed session is due",()=>{
  const x=audit("2026-10-13","2026-10-14T20:16:00.000Z");
  assert.equal(x.expectedSession,"2026-10-14");
  assert.equal(x.lagCompletedSessions,1);
});
test("invalid trade date is not labeled fresh",()=>{
  const x=audit("2026-02-30","2026-10-16T05:35:06.235Z");
  assert.equal(x.status,"SELECTED_SESSION_INVALID");
  assert.equal(x.lagCompletedSessions,null);
});
test("future selected trade date is never labeled fresh",()=>{
  const x=audit("2026-10-19","2026-10-16T05:35:06.235Z");
  assert.equal(x.status,"SELECTED_SESSION_AHEAD");
});
test("invalid completed time fails closed",()=>{
  assert.throws(()=>audit("2026-10-14","not-a-time"),/BREADTH_FRESHNESS_TIME_INVALID/);
});
