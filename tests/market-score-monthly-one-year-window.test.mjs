import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("monthly 1Y chart contracts use 13 monthly points",()=>{
  const inflation=fs.readFileSync(new URL("../worker/inflation-r2-reader.mjs",import.meta.url),"utf8");
  const growthDomain=fs.readFileSync(new URL("../lib/market-score/growth-r2-worker-domain-r1.mjs",import.meta.url),"utf8");
  const growthHistory=fs.readFileSync(new URL("../lib/market-score/growth-r2-chart-history-r1.mjs",import.meta.url),"utf8");

  assert.match(inflation,/monthEnds\(asOf,13\)/);
  assert.match(growthDomain,/for\(let n=12;n>=0;n--\)/);
  assert.match(growthDomain,/getUTCMonth\(\)-12,1/);
  assert.match(growthDomain,/earliestBy/);
  assert.match(growthDomain,/label\.slice\(0,7\)===month/);
  assert.match(growthDomain,/splice\(i,1,\{label:asOf,value:currentScore\}\)/);
  assert.match(growthHistory,/getUTCMonth\(\)-12,1/);
});
