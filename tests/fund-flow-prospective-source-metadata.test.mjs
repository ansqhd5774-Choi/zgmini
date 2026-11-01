import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";

test("fundFlows operational storage retains normalized SEC release metadata for prospective research",()=>{
  const src=fs.readFileSync(new URL("../worker/market-operational-refresh.mjs",import.meta.url),"utf8");
  assert.match(src,/group==='fundFlows'/);
  assert.match(src,/secFundFlows:out\.providerSummary\?\.secFundFlows/);
  assert.match(src,/providerSummary\?\{providerSummary\}/);
  assert.match(src,/registeredFundFlowRows/);
});

test("manual local collection can request fundFlows directly without changing scheduled cadence",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/collect-local.mjs",import.meta.url),"utf8");
  assert.match(src,/job=null/);
  assert.match(src,/arg\.startsWith\('--job='\)/);
  assert.match(src,/runMarketOperationalRefresh\(\{env,job,/);
  assert.doesNotMatch(src,/MARKET_COLLECTION_JOBS\s*=/);
});


test("collect-local explicit-job CLI remains syntactically valid",()=>{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const target=path.resolve(here,"../scripts/pc-writer/collect-local.mjs");
  assert.doesNotThrow(()=>execFileSync(process.execPath,["--check",target],{stdio:"pipe"}));
});
