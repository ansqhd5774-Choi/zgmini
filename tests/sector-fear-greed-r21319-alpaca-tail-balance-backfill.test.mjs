import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {collectR21319AlpacaTailBalanceBackfill,normalizeR21319AlpacaBody} from "../scripts/pc-writer/sector-fear-greed-r21319-alpaca-tail-balance-backfill.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));

test("R2.13.19 normalizes only approved-window Alpaca bars and fails closed on pagination",()=>{
  const rows=normalizeR21319AlpacaBody({bars:{AAA:[{t:"2023-07-12T00:00:00Z",c:10,v:100}]},next_page_token:null},["AAA"]);
  assert.deepEqual(rows,[{ticker:"AAA",tradeDate:"2023-07-12",currentClose:10,currentVolume:100,source:"ALPACA",feed:"iex",adjustmentStatus:"split"}]);
  assert.throws(()=>normalizeR21319AlpacaBody({bars:{AAA:[]},next_page_token:"more"},["AAA"]),/R21319_UNEXPECTED_PAGINATION/);
});

test("R2.13.19 stores approved raw backfill, verifies readback, and safely skips completed group files",async()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"zg-r21319-")),dir=path.join(base,"asset-r10-alpaca");fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(base,"providers.env"),"APCA_API_KEY_ID=fixture\nAPCA_API_SECRET_KEY=fixture\n");
  fs.writeFileSync(path.join(dir,"group-000.json"),JSON.stringify([{ticker:"AAA",tradeDate:"2023-10-02",currentClose:20,currentVolume:200}]));
  fs.writeFileSync(path.join(dir,"group-001.json"),JSON.stringify([{ticker:"BBB",tradeDate:"2023-10-02",currentClose:30,currentVolume:300}]));
  fs.writeFileSync(path.join(base,"local-sector-fear-greed-r1-iex-price-history.json"),JSON.stringify({source:"IEX HIST via Sophostechne",series:{SPY:[{date:"2024-08-15",close:1,volume:1}]}}));
  let calls=0;const fetchImpl=async url=>{calls++;assert.equal(url.searchParams.get("start"),"2023-07-12T00:00:00Z");assert.equal(url.searchParams.get("end"),"2023-09-29T23:59:59Z");assert.equal(url.searchParams.get("feed"),"iex");assert.equal(url.searchParams.get("adjustment"),"split");const symbol=url.searchParams.get("symbols");return Response.json({bars:{[symbol]:[{t:"2023-07-12T00:00:00Z",c:10+calls,v:100+calls}]},next_page_token:null});};
  const first=await collectR21319AlpacaTailBalanceBackfill(base,{fetchImpl,wait:async()=>{},expectedGroups:2,maxProviderRequests:2,now:new Date("2026-10-13T00:00:00Z")});
  assert.equal(first.providerRequests,2);assert.equal(first.completedGroups,2);assert.equal(first.storageVerified,true);assert.equal(first.uniqueStoredDates,1);assert.equal(first.nextBlocker,"LOCAL_BENCHMARK_DOES_NOT_COVER_BACKFILL_WINDOW");assert.equal(calls,2);
  const original0=fs.readFileSync(path.join(dir,"group-000.json"),"utf8");
  const second=await collectR21319AlpacaTailBalanceBackfill(base,{fetchImpl,wait:async()=>{},expectedGroups:2,maxProviderRequests:2,now:new Date("2026-10-13T00:01:00Z")});
  assert.equal(second.providerRequests,0);assert.equal(second.skippedGroups,2);assert.equal(calls,2);assert.equal(fs.readFileSync(path.join(dir,"group-000.json"),"utf8"),original0);
  fs.rmSync(base,{recursive:true,force:true});
});

test("R2.13.19 is bounded to 55 approved Alpaca group requests and cannot mutate production/public/D1/reference",()=>{
  const source=fs.readFileSync(path.join(here,"..","scripts","pc-writer","sector-fear-greed-r21319-alpaca-tail-balance-backfill.mjs"),"utf8");
  assert.match(source,/const START="2023-07-12"/);assert.match(source,/const END="2023-09-29"/);assert.match(source,/const EXPECTED_GROUPS=55/);assert.match(source,/const MAX_PROVIDER_REQUESTS=55/);
  assert.match(source,/feed:"iex"/);assert.match(source,/adjustment:"split"/);assert.match(source,/approvedR1ReferenceRequirement:756/);assert.match(source,/benchmarkSourceChanged:false/);
  assert.doesNotMatch(source,/wrangler/i);assert.doesNotMatch(source,/d1\.prepare|d1\.exec|INSERT INTO|UPDATE .* SET|DELETE FROM/i);
});
