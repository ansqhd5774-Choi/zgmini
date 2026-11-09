import assert from "node:assert/strict";
import {test} from "node:test";
import {EMPLOYMENT_R6_FEATURES,EMPLOYMENT_R6_FORMULA_HASH,EMPLOYMENT_R6_FORMULA_REVISION} from "../lib/market-score/employment-r6-formula.mjs";
import {employmentR6OneYearStart,employmentR6RecentQuarterStart} from "../lib/market-score/employment-r6-window.mjs";
import {EMPLOYMENT_R6_PUBLIC_DISPLAY_KEY,employmentR6StoredDisplayResponse,validEmploymentR6PublicDisplay} from "../worker/employment-r6-public-display.mjs";

const now=Date.parse("2026-11-01T12:00:00.000Z");
function payload(asOfDate="2026-11-01"){
  const asOf=Date.parse(asOfDate+"T00:00:00Z");
  return {
    kind:"EMPLOYMENT_R6_ONE_YEAR_STORED_DISPLAY_R1",
    formulaHash:EMPLOYMENT_R6_FORMULA_HASH,
    methodologyVersion:EMPLOYMENT_R6_FORMULA_REVISION,
    asOfDate,
    sourceStoredAt:now-3600000,
    window:{start:employmentR6OneYearStart(asOf),end:asOfDate,recentQuarterStart:employmentR6RecentQuarterStart(asOf)},
    summary:{sourceFeatures:0,recentlyObservedFeatures:0,chartReadyFeatures:0,chartPartialFeatures:0,scoredFeatures:0,recentlyScoredFeatures:0},
    indicators:EMPLOYMENT_R6_FEATURES.map(({id})=>({id,rawStatus:"UNAVAILABLE",scoreStatus:"PARTIAL_HISTORY",score:null,
      chartStatus:"UNAVAILABLE",releaseCadence:"월간(ET)",nextReleaseDate:null,retrievedAt:null,history:[]})),
  };
}
function stored(row){
  return {prepare(sql){
    assert.match(sql,/^SELECT body,stored_at FROM market_public_snapshots_v1/);
    return {bind(key){
      assert.equal(key,EMPLOYMENT_R6_PUBLIC_DISPLAY_KEY);
      return {first:async()=>row};
    }};
  }};
}
const request=new Request("https://zgmini.kr/api/employment-r6/observations");

test("R6 web endpoint serves only a complete stored 29-ID display",async()=>{
  const body=payload();
  assert.equal(body.indicators.length,29);
  assert.equal(validEmploymentR6PublicDisplay(body),true);
  const response=await employmentR6StoredDisplayResponse(request,stored({body:JSON.stringify(body),stored_at:now}),{now:now+1000});
  assert.equal(response.status,200);
  assert.equal(response.headers.get("x-employment-r6-source"),"STORED_D1");
  assert.equal((await response.json()).indicators.length,29);
});

test("R6 web endpoint rejects missing, future-dated and expired public rows",async()=>{
  const missing=await employmentR6StoredDisplayResponse(request,stored(null),{now});
  assert.equal(missing.status,503);
  assert.equal((await missing.json()).reason,"STORED_PUBLICATION_PENDING");
  const future=payload("2099-11-08");
  assert.equal(validEmploymentR6PublicDisplay(future),true);
  const futureResponse=await employmentR6StoredDisplayResponse(request,stored({body:JSON.stringify(future),stored_at:now}),{now});
  assert.equal(futureResponse.status,503);
  assert.equal((await futureResponse.json()).reason,"STORED_PUBLICATION_STALE");
  const expired=await employmentR6StoredDisplayResponse(request,stored({body:JSON.stringify(payload()),stored_at:now}),{now:now+9*86400000});
  assert.equal(expired.status,503);
  assert.equal((await expired.json()).reason,"STORED_PUBLICATION_EXPIRED");
});
