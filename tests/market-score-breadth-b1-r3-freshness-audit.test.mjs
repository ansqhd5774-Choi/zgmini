import test from "node:test";
import assert from "node:assert/strict";
import {auditBreadthSelectedSessionFreshness} from "../lib/market-score/breadth-b1-r3-gap-audit.mjs";
import {isMarketSession,latestCompletedSession as publicLatestCompletedSession} from "../lib/market-score/breadth-b1-r3-calendar.mjs";
import {latestCompletedBreadthSession,countCompletedBreadthSessionsSince} from "../lib/market-score/breadth-b1-r3-freshness-calendar.mjs";

const audit=(selected,at)=>auditBreadthSelectedSessionFreshness(selected,at,{
  latestCompletedSession:latestCompletedBreadthSession,
  countCompletedSessionsSince:countCompletedBreadthSessionsSince,marketSession:isMarketSession,
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

test("freshness includes a standalone UTC evaluation timestamp and selected/stored aliases",()=>{
  const x=audit("2026-10-13","2026-10-15T03:10:11.010Z");
  assert.equal(x.evaluatedAt,"2026-10-15T03:10:11.010Z");
  assert.equal(x.storedTradeDate,"2026-10-13");
  assert.equal(x.selectedSession,x.storedTradeDate);
});
test("invalid selected session also retains diagnostic timestamp",()=>{
  const x=audit("2026-02-30","2026-10-16T05:35:06.235Z");
  assert.equal(x.evaluatedAt,"2026-10-16T05:35:06.235Z");
  assert.equal(x.storedTradeDate,"2026-02-30");
});
test("2026 Thanksgiving Friday: 13:14 ET retains pre-close session",()=>{
  const x=audit("2026-11-25","2026-11-27T18:14:00.000Z");
  assert.equal(x.expectedSession,"2026-11-25");
  assert.equal(x.lagCompletedSessions,0);
});
test("2026 Thanksgiving Friday: 13:15 ET marks early session completed",()=>{
  const x=audit("2026-11-25","2026-11-27T18:15:00.000Z");
  assert.equal(x.expectedSession,"2026-11-27");
  assert.equal(x.lagCompletedSessions,1);
});
test("2026 Thanksgiving Friday: 14:00 ET treats same date as completed",()=>{
  const x=audit("2026-11-27","2026-11-27T19:00:00.000Z");
  assert.equal(x.status,"LATEST_COMPLETED_SESSION");
  assert.equal(x.expectedSession,"2026-11-27");
});
test("2026 Christmas Eve: 13:15 ET recognizes early close",()=>{
  const x=audit("2026-12-23","2026-12-24T18:15:00.000Z");
  assert.equal(x.expectedSession,"2026-12-24");
  assert.equal(x.lagCompletedSessions,1);
});
test("2027 Thanksgiving Friday early close is covered",()=>{
  const x=audit("2027-11-24","2027-11-26T18:15:00.000Z");
  assert.equal(x.expectedSession,"2027-11-26");
});
test("2028 July early close recognizes daylight saving time (EDT)",()=>{
  const x=audit("2028-06-30","2028-07-03T17:15:00.000Z");
  assert.equal(x.expectedSession,"2028-07-03");
});
test("2028 post-Thanksgiving early close is covered",()=>{
  const x=audit("2028-11-22","2028-11-24T18:15:00.000Z");
  assert.equal(x.expectedSession,"2028-11-24");
});
test("weekend and Christmas holiday do not create phantom sessions",()=>{
  const x=audit("2026-12-24","2026-12-27T22:00:00.000Z");
  assert.equal(x.expectedSession,"2026-12-24");
  assert.equal(x.lagCompletedSessions,0);
});
test("shared public latestCompletedSession remains unchanged on early close",()=>{
  const time=new Date("2026-11-27T19:00:00.000Z");
  assert.equal(publicLatestCompletedSession(time),"2026-11-25");
  assert.equal(latestCompletedBreadthSession(time),"2026-11-27");
});
test("regular session still keeps existing 16:15 cutoff and DST rules",()=>{
  assert.equal(audit("2026-03-09","2026-03-09T20:14:00.000Z").expectedSession,"2026-03-06");
  assert.equal(audit("2026-03-09","2026-03-09T20:15:00.000Z").expectedSession,"2026-03-09");
});
