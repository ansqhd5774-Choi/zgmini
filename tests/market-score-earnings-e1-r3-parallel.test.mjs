import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("E1-R4 score path reads stored D1 while API collection runs independently in scheduled jobs",async()=>{
  const route=await readFile(new URL("../app/api/market-score/route.ts",import.meta.url),"utf8");
  const worker=await readFile(new URL("../worker/diagnostic-v1-canary.mjs",import.meta.url),"utf8");
  const provider=await readFile(new URL("../lib/market-score/sec-earnings-e1-r4-provider.mjs",import.meta.url),"utf8");

  const scheduled=await readFile(new URL("../worker/market-operational-refresh.mjs",import.meta.url),"utf8");
  assert.match(route,/storedMarketResponse/);
  assert.doesNotMatch(route,/collectEarnings|waitUntil/);
  assert.match(scheduled,/earnings:.*collectEarningsE1R4ToStore/);
  assert.match(scheduled,/collectInputs:.*readStoredMarketInputs/);

  assert.match(worker,/readEarningsE1R4StoredScore/);
  assert.match(worker,/fetchEarnings:\s*readEarningsE1R4StoredScore/);
  assert.match(worker,/impl\.fetchEarnings\(\{asOf,\s*db:env\?\.DB\}\)/);
  assert.doesNotMatch(worker,/impl\.fetchEarnings\(\{asOf,\s*fetchImpl:bounded\.fetchImpl/);

  const readStart=provider.indexOf("export async function readEarningsE1R4StoredScore");
  const collectStart=provider.indexOf("export async function collectEarningsE1R4ToStore");
  assert.ok(readStart>=0&&collectStart>readStart);
  const readBody=provider.slice(readStart,collectStart);
  assert.doesNotMatch(readBody,/fetchLiveSnapshot|fetchJson|Reflect\.apply/);

  const collectBody=provider.slice(collectStart);
  assert.match(collectBody,/fetchLiveSnapshot/);
  assert.match(collectBody,/upsertIssuerRows/);
  assert.match(collectBody,/calculationPerformed:false/);
  assert.doesNotMatch(collectBody,/buildEarningsE1R4\(/);
});
