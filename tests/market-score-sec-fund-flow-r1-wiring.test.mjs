import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const collector=fs.readFileSync(new URL("../worker/diagnostic-v1-canary.mjs",import.meta.url),"utf8");
const marketScore=fs.readFileSync(new URL("../worker/market-score-r1.mjs",import.meta.url),"utf8");

test("R54 collector still uses the official SEC adapter and allowed host",()=>{
 assert.match(collector,/fetchSecRegisteredFundFlows/);
 assert.match(collector,/'www\.sec\.gov'/);
 assert.match(collector,/fetchFundFlows\s*:\s*fetchSecRegisteredFundFlows/);
});
test("R54 collection stores only normalized registeredFundFlowRows",()=>{
 assert.match(collector,/registeredFundFlowRows\s*:\s*fundFlows\?\.status\s*===\s*'READY_CURRENT_VINTAGE_RAW'\s*\?\s*fundFlows\.rows\s*:\s*\[\]/s);
});
test("R54 is the active stored-data scoring path and collector never scores",()=>{
 assert.match(marketScore,/buildFundFlowR54\(\s*collected\?\.external\?\.registeredFundFlowRows\s*\?\?\s*\[\]/s);
 assert.doesNotMatch(collector,/buildFundFlowR54/);
});
