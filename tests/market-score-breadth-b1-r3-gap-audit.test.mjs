import test from "node:test";
import assert from "node:assert/strict";
import {auditStoredBreadthSessions} from "../lib/market-score/breadth-b1-r3-gap-audit.mjs";
import {isMarketSession} from "../lib/market-score/breadth-b1-r3-calendar.mjs";
const row=d=>({tradeDate:d});
const audit=(xs,opts={})=>auditStoredBreadthSessions(xs.map(row),{marketSession:isMarketSession,...opts});
test("Oct14 is the single missing internal session",()=>{
  const r=audit(["2026-10-13","2026-10-15","2026-10-16"]);
  assert.equal(r.status,"INTERNAL_SESSIONS_MISSING");
  assert.deepEqual(r.missingDates,["2026-10-14"]);
  assert.equal(r.missingCount,1);
});
test("complete trading days have no gap",()=>{
  const r=audit(["2026-10-13","2026-10-14","2026-10-15"]);
  assert.equal(r.status,"CONTIGUOUS");
  assert.equal(r.missingCount,0);
});
test("weekends do not create false gaps",()=>assert.equal(audit(["2026-10-16","2026-10-19"]).missingCount,0));
test("US Thanksgiving is not misclassified",()=>assert.equal(audit(["2026-11-25","2026-11-27"]).missingCount,0));
test("only internal dates, never dates outside both boundaries",()=>assert.equal(audit(["2026-10-15","2026-10-16"]).missingCount,0));
test("duplicates are counted once",()=>{
  const r=audit(["2026-10-13","2026-10-13","2026-10-14"]);
  assert.equal(r.eligiblePoints,2);assert.equal(r.missingCount,0);
});
test("unordered input is deterministic",()=>{
  const r=audit(["2026-10-16","2026-10-13","2026-10-15"]);
  assert.deepEqual(r.missingDates,["2026-10-14"]);
});
test("insufficient history is not labeled healthy",()=>{
  const r=audit(["2026-10-16"]);
  assert.equal(r.status,"INSUFFICIENT_HISTORY");
});
test("invalid date is rejected",()=>assert.throws(()=>audit(["2026-02-30"]),/BREADTH_GAP_DATE_INVALID/));
test("missing dates are bounded but total count is retained",()=>{
  const r=audit(["2026-10-12","2026-10-16"],{maxMissingDates:1});
  assert.deepEqual(r.missingDates,["2026-10-13"]);
  assert.equal(r.missingCount,3);assert.equal(r.truncated,true);
});
test("unreasonable span is rejected",()=>assert.throws(()=>audit(["2025-01-02","2026-10-16"]),/BREADTH_GAP_WINDOW_INVALID/));
test("invalid span budget is rejected",()=>assert.throws(()=>audit(["2026-10-15","2026-10-16"],{maxSpanDays:0}),/BREADTH_GAP_SPAN_LIMIT_INVALID/));
