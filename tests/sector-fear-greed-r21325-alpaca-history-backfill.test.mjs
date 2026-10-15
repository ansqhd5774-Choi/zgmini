import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {START,END,EXPECTED_SESSIONS,EXPECTED_GROUPS,MAX_PROVIDER_REQUESTS,buildR21325RequestUrl,normalizeR21325StockBody,normalizeR21325SpyBody} from "../scripts/pc-writer/sector-fear-greed-r21325-alpaca-history-backfill.mjs";

test("R2.13.25 scope is fixed to approved 251-session history and 56 requests",()=>{
  assert.equal(START,"2022-07-12");
  assert.equal(END,"2023-07-11");
  assert.equal(EXPECTED_SESSIONS,251);
  assert.equal(EXPECTED_GROUPS,55);
  assert.equal(MAX_PROVIDER_REQUESTS,56);
  const url=buildR21325RequestUrl(["AAA","BBB"]);
  assert.equal(url.searchParams.get("symbols"),"AAA,BBB");
  assert.equal(url.searchParams.get("timeframe"),"1Day");
  assert.equal(url.searchParams.get("feed"),"iex");
  assert.equal(url.searchParams.get("adjustment"),"split");
  assert.equal(url.searchParams.get("limit"),"10000");
});

test("R2.13.25 normalizes stock history and rejects pagination",()=>{
  const body={bars:{AAA:[{t:"2022-07-12T04:00:00Z",c:10,v:100},{t:"2022-07-13T04:00:00Z",c:11,v:110}]},next_page_token:null};
  const rows=normalizeR21325StockBody(body,["AAA"]);
  assert.equal(rows.length,2);
  assert.equal(rows[0].tradeDate,"2022-07-12");
  assert.throws(()=>normalizeR21325StockBody({...body,next_page_token:"more"},["AAA"]),/R21325_UNEXPECTED_PAGINATION/);
});

test("R2.13.25 requires the exact SPY session count",()=>{
  const body={bars:{SPY:[{t:"2022-07-12T04:00:00Z",c:380,v:1},{t:"2022-07-13T04:00:00Z",c:382,v:2}]},next_page_token:null};
  const rows=normalizeR21325SpyBody(body,{expectedSessions:2});
  assert.equal(rows.length,2);
  assert.throws(()=>normalizeR21325SpyBody(body,{expectedSessions:3}),/R21325_SPY_SESSION_COUNT_MISMATCH/);
});

test("R2.13.25 remains research-only and preserves Production contracts",()=>{
  const file=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../scripts/pc-writer/sector-fear-greed-r21325-alpaca-history-backfill.mjs");
  const src=fs.readFileSync(file,"utf8");
  assert.match(src,/publicMutation:false/);
  assert.match(src,/d1Mutation:false/);
  assert.match(src,/productionFormulaChanged:false/);
  assert.match(src,/referenceRequirementChanged:false/);
  assert.match(src,/approvedR1ReferenceRequirement:SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS/);
  assert.match(src,/normalizationChanged:false/);
  assert.match(src,/weightsChanged:false/);
  assert.match(src,/productionBenchmarkSourceChanged:false/);
  assert.match(src,/sectorEtfBackfillRequired:false/);
  assert.doesNotMatch(src,/wrangler\s+(deploy|publish|d1)/i);
  assert.doesNotMatch(src,/DELETE\s+FROM|DROP\s+TABLE|ALTER\s+TABLE|UPDATE\s+\w+\s+SET/i);
});
