import assert from "node:assert/strict";
import {test} from "node:test";
import {buildEmploymentR6OneYearReadModel} from "../lib/market-score/employment-r6-one-year-read-model.mjs";
import {
  EMPLOYMENT_R6_PUBLIC_DISPLAY_KEY,
  employmentR6StoredDisplayResponse,
  validEmploymentR6PublicDisplay,
} from "../worker/employment-r6-public-display.mjs";
import {publishEmploymentR6OneYear} from "../scripts/pc-writer/employment-r6-one-year-stage.mjs";

const now=Date.parse("2026-11-01T12:00:00.000Z");
const body=buildEmploymentR6OneYearReadModel([],{
  asOfDate:"2026-11-01",
  sourceStoredAt:Date.parse("2026-11-01T10:00:00.000Z"),
});

function db(row,trace=[]){
  return {prepare(sql){
    trace.push(sql);
    return {bind(key){
      assert.equal(key,EMPLOYMENT_R6_PUBLIC_DISPLAY_KEY);
      return {first:async()=>row};
    }};
  }};
}
function remote(row=null){
  let current=row,writes=0;
  return {
    async query(_db,sql,params){
      assert.match(sql,/^SELECT body,stored_at FROM market_public_snapshots_v1/);
      assert.deepEqual(params,[EMPLOYMENT_R6_PUBLIC_DISPLAY_KEY]);
      return {results:current?[current]:[]};
    },
    async request(_db,batch){
      assert.equal(batch.length,1);
      assert.match(batch[0].sql,/^INSERT INTO market_public_snapshots_v1/);
      const [key,value,storedAt,sourceAt]=batch[0].params;
      assert.equal(key,EMPLOYMENT_R6_PUBLIC_DISPLAY_KEY);
      if(!current||JSON.parse(current.body).sourceStoredAt<=sourceAt){
        current={body:value,stored_at:storedAt};writes++;
      }
      return [{success:true}];
    },
    get current(){return current;},
    get writes(){return writes;},
  };
}

test("public R6 display validates 29 approved IDs, provenance and score/raw separation",()=>{
  assert(validEmploymentR6PublicDisplay(body));
  assert.equal(body.indicators.length,29);
  assert.equal(body.indicators[0].score,null);
  assert.equal(body.indicators[0].rawStatus,"UNAVAILABLE");
  const wrongId=structuredClone(body);wrongId.indicators[0].id="FAKE";
  assert(!validEmploymentR6PublicDisplay(wrongId));
  const wrongScore=structuredClone(body);wrongScore.indicators[0].scoreStatus="READY";wrongScore.indicators[0].score=1000;
  assert(!validEmploymentR6PublicDisplay(wrongScore));
  const wrongDate=structuredClone(body);wrongDate.indicators[0].history=[{date:"2027-01-01",value:99}];
  assert(!validEmploymentR6PublicDisplay(wrongDate));
});

test("visitor GET reads a single verified D1 public row; never fetches provider data",async()=>{
  const trace=[];
  const originalFetch=globalThis.fetch;
  globalThis.fetch=()=>{throw Error("PROVIDER_CALL_FORBIDDEN");};
  try{
    const response=await employmentR6StoredDisplayResponse(
      new Request("https://zgmini.kr/api/employment-r6/observations"),
      db({body:JSON.stringify(body),stored_at:now},trace),{now:now+5000},
    );
    assert.equal(response.status,200);
    assert.equal((await response.json()).indicators.length,29);
    assert.equal(trace.length,1);
    assert.match(trace[0],/^SELECT body,stored_at FROM market_public_snapshots_v1/);
    assert.equal(response.headers.get("x-data-snapshot-at"),new Date(now).toISOString());
    const stale=await employmentR6StoredDisplayResponse(new Request("https://zgmini.kr/api/employment-r6/observations"),db({body:JSON.stringify(body),stored_at:now}),{now:now+9*86400000});
    assert.equal(stale.status,503);
    assert.equal((await stale.json()).reason,"STORED_PUBLICATION_UNVERIFIED");
    const missing=await employmentR6StoredDisplayResponse(new Request("https://zgmini.kr/api/employment-r6/observations"),db(null),{now});
    assert.equal(missing.status,503);
    assert.equal((await missing.json()).reason,"STORED_PUBLICATION_PENDING");
  }finally{globalThis.fetch=originalFetch;}
});

test("publisher only writes a verified public snapshot, guards downgrades and reads back",async()=>{
  const target=remote();
  const first=await publishEmploymentR6OneYear({body,remote:target,dbId:"test-db",now});
  assert.equal(first.status,"VERIFIED");
  assert.equal(target.writes,1);
  const repeat=await publishEmploymentR6OneYear({body,remote:target,dbId:"test-db",now:now+1});
  assert.equal(repeat.status,"UNCHANGED");
  assert.equal(target.writes,1);
  const newer=structuredClone(body);newer.sourceStoredAt=now+100;
  const protectedTarget=remote({body:JSON.stringify(newer),stored_at:now+101});
  await assert.rejects(publishEmploymentR6OneYear({body,remote:protectedTarget,dbId:"test-db",now:now+200}),/REMOTE_SOURCE_NEWER/);
  assert.equal(protectedTarget.writes,0);
});
