import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {START,END,EXPECTED_SESSIONS,MAX_PROVIDER_REQUESTS,buildR21322RequestUrl,normalizeR21322AlpacaBody} from "../scripts/pc-writer/sector-fear-greed-r21322-spy-gap-backfill.mjs";

test("R2.13.22 scope is fixed to the 219-session SPY gap and one provider request",()=>{
  assert.equal(START,"2023-10-02");
  assert.equal(END,"2024-08-14");
  assert.equal(EXPECTED_SESSIONS,219);
  assert.equal(MAX_PROVIDER_REQUESTS,1);
  const url=buildR21322RequestUrl();
  assert.equal(url.searchParams.get("symbols"),"SPY");
  assert.equal(url.searchParams.get("timeframe"),"1Day");
  assert.equal(url.searchParams.get("feed"),"iex");
  assert.equal(url.searchParams.get("adjustment"),"split");
  assert.equal(url.searchParams.get("limit"),"10000");
});

test("R2.13.22 normalizes and validates Alpaca SPY bars",()=>{
  const body={bars:{SPY:[{t:"2023-10-02T04:00:00Z",c:427.31,v:83798600},{t:"2023-10-03T04:00:00Z",c:421.59,v:103760600}]},next_page_token:null};
  const out=normalizeR21322AlpacaBody(body,{expectedSessions:2});
  assert.equal(out.sessions,2);
  assert.equal(out.first,"2023-10-02");
  assert.equal(out.last,"2023-10-03");
  assert.deepEqual(out.rows.map(x=>x.date),["2023-10-02","2023-10-03"]);
});

test("R2.13.22 rejects incomplete or paginated provider output",()=>{
  assert.throws(()=>normalizeR21322AlpacaBody({bars:{SPY:[]},next_page_token:"more"},{expectedSessions:0}),/R21322_UNEXPECTED_PAGINATION/);
  assert.throws(()=>normalizeR21322AlpacaBody({bars:{SPY:[{t:"2023-10-02T04:00:00Z",c:427.31,v:1}]},next_page_token:null},{expectedSessions:2}),/R21322_SESSION_COUNT_MISMATCH/);
});

test("R2.13.22 remains research-only with no Production or reference contract mutation",()=>{
  const file=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../scripts/pc-writer/sector-fear-greed-r21322-spy-gap-backfill.mjs");
  const src=fs.readFileSync(file,"utf8");
  assert.match(src,/providerRequests:false|providerRequests/);
  assert.match(src,/publicMutation:false/);
  assert.match(src,/d1Mutation:false/);
  assert.match(src,/productionFormulaChanged:false/);
  assert.match(src,/referenceRequirementChanged:false/);
  assert.match(src,/productionBenchmarkSourceChanged:false/);
  assert.match(src,/approvedR1ReferenceRequirement:SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS/);
  assert.doesNotMatch(src,/wrangler\s+(d1|deploy|publish)/i);
  assert.doesNotMatch(src,/DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE|UPDATE\s+\w+\s+SET/i);
});
