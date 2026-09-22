import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const collector=fs.readFileSync(new URL("../worker/diagnostic-v1-canary.mjs",import.meta.url),"utf8");
const marketScore=fs.readFileSync(new URL("../worker/market-score-r1.mjs",import.meta.url),"utf8");

test("F1-R1 live collector uses the official SEC adapter and allowed host",()=>{
  assert.match(collector,/fetchSecRegisteredFundFlows/);
  assert.match(collector,/'www\.sec\.gov'/);
  assert.match(collector,/fetchFundFlows\s*:\s*fetchSecRegisteredFundFlows/);
  assert.match(collector,/impl\.fetchFundFlows\(\{\s*fetchImpl:\s*bounded\.fetchImpl\s*\}\)/);
});

test("F1-R1 collector publishes only parsed registeredFundFlowRows to external input",()=>{
  assert.match(collector,/registeredFundFlowRows\s*:\s*fundFlows\?\.status\s*===\s*'READY_CURRENT_VINTAGE_RAW'\s*\?\s*fundFlows\.rows\s*:\s*\[\]/s);
  assert.match(collector,/secFundFlows\s*:\s*\{[\s\S]*?status:\s*fundFlows\?\.status[\s\S]*?rows:/);
});

test("F1-R1 existing CM-R1 transform remains the sole fund-flow scoring path",()=>{
  assert.match(marketScore,/buildFundFlowR53\(\s*collected\?\.external\?\.registeredFundFlowRows\s*\?\?\s*\[\]/s);
  assert.doesNotMatch(collector,/buildFundFlowR53/);
});
