import assert from "node:assert/strict";
import {test} from "node:test";
import {
  latestDolClaimsReleaseAt,
  latestFixedReleaseAt,
  releasePlanForGroup,
} from "../lib/market-score/employment-r6-scheduler.mjs";

test("official DOL Thanksgiving Wednesday supersedes the normal Thursday release",()=>{
  assert.equal(latestDolClaimsReleaseAt("2026-11-25T13:29:59Z").toISOString(),"2026-11-19T13:30:00.000Z");
  assert.equal(latestDolClaimsReleaseAt("2026-11-25T13:30:00Z").toISOString(),"2026-11-25T13:30:00.000Z");
  assert.equal(latestDolClaimsReleaseAt("2026-11-26T15:00:00Z").toISOString(),"2026-11-25T13:30:00.000Z");
  assert.equal(latestDolClaimsReleaseAt("2026-12-03T13:30:00Z").toISOString(),"2026-12-03T13:30:00.000Z");
  const before=releasePlanForGroup("DOL_UI_WEEKLY_CLAIMS",{now:"2026-11-25T13:44:59Z"});
  assert.equal(before.status,"WAITING_FOR_COLLECTION_WINDOW");
  const due=releasePlanForGroup("DOL_UI_WEEKLY_CLAIMS",{now:"2026-11-25T13:45:00Z"});
  assert.equal(due.status,"DUE");
  assert.equal(due.releaseAt,"2026-11-25T13:30:00.000Z");
  const stored=releasePlanForGroup("DOL_UI_WEEKLY_CLAIMS",{
    now:"2026-11-26T16:00:00Z",
    latestRun:{status:"SUCCESS",detail_json:JSON.stringify({releaseAt:due.releaseAt})},
  });
  assert.equal(stored.status,"RELEASE_ALREADY_STORED");
});

test("DOL official 2027 Veterans Day and Thanksgiving exceptions preserve ET timing",()=>{
  assert.equal(latestDolClaimsReleaseAt("2027-11-11T16:00:00Z").toISOString(),"2027-11-10T13:30:00.000Z");
  assert.equal(latestDolClaimsReleaseAt("2027-11-25T16:00:00Z").toISOString(),"2027-11-24T13:30:00.000Z");
});

test("2027 BLS Employment Situation and ECI use official dates without guessing other groups",()=>{
  assert.equal(latestFixedReleaseAt("BLS_EMPLOYMENT_SITUATION","2027-01-08T13:30:00Z").toISOString(),"2027-01-08T13:30:00.000Z");
  assert.equal(latestFixedReleaseAt("BLS_ECI","2027-01-29T13:30:00Z").toISOString(),"2027-01-29T13:30:00.000Z");
  assert.equal(releasePlanForGroup("BLS_EMPLOYMENT_SITUATION",{now:"2027-01-09T16:00:00Z"}).status,"DUE");
  // No official 2027 JOLTS calendar has been published: no fabricated new event.
  assert.equal(latestFixedReleaseAt("BLS_JOLTS","2027-02-01T16:00:00Z").toISOString(),"2026-12-01T15:00:00.000Z");
});

test("mixed state and metro group recognizes both published 2026 release days",()=>{
  assert.equal(latestFixedReleaseAt("BLS_STATE_MSA","2026-11-20T15:00:00Z").toISOString(),"2026-11-20T15:00:00.000Z");
  assert.equal(latestFixedReleaseAt("BLS_STATE_MSA","2026-12-02T15:00:00Z").toISOString(),"2026-12-02T15:00:00.000Z");
  assert.equal(releasePlanForGroup("BLS_STATE_MSA",{now:"2026-11-21T18:00:00Z"}).status,"DUE");
});
