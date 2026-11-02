import assert from "node:assert/strict";
import {test} from "node:test";
import {
  latestDolClaimsReleaseAt,
  latestFixedReleaseAt,
  releasePlanForGroup,
} from "../lib/market-score/employment-r6-scheduler.mjs";
import {parseBlsR6Rows} from "../lib/market-score/employment-r6-provider.mjs";

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

test("state/metro combined fetch keeps each source's actual release date stable",()=>{
  const payload={Results:{series:[
    {seriesID:"SMS00000000000000022",data:[{year:"2026",period:"M10",value:"50.0"}]},
    {seriesID:"SMS99999990000000022",data:[{year:"2026",period:"M09",value:"48.0"}]},
  ]}};
  const parse=releaseAt=>parseBlsR6Rows(payload,{
    releaseGroup:"BLS_STATE_MSA",releaseAt,retrievedAt:"2026-12-03T18:00:00.000Z",
  }).rows;
  const stateDay=parse("2026-11-20T15:00:00.000Z");
  const metroDay=parse("2026-12-02T15:00:00.000Z");
  const released=(rows,id)=>rows.find(x=>x.providerSeriesId===id)?.releaseDate;
  assert.equal(released(stateDay,"SMS00000000000000022"),"2026-11-20T15:00:00.000Z");
  assert.equal(released(stateDay,"SMS99999990000000022"),"2026-10-28T14:00:00.000Z");
  assert.equal(released(metroDay,"SMS00000000000000022"),"2026-11-20T15:00:00.000Z");
  assert.equal(released(metroDay,"SMS99999990000000022"),"2026-12-02T15:00:00.000Z");
  // The unchanged state observation must not acquire a synthetic metro-date revision.
  assert.equal(stateDay[0].value,metroDay[0].value);
  assert.equal(stateDay[0].releaseDate,metroDay[0].releaseDate);
});
