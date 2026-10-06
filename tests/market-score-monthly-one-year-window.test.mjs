import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {completedMonthEnds} from "../worker/inflation-r2-reader.mjs";

test("monthly 1Y charts display 13 points while growth stores 16 months",()=>{
  const inflation=fs.readFileSync(new URL("../worker/inflation-r2-reader.mjs",import.meta.url),"utf8");
  const growthDomain=fs.readFileSync(new URL("../lib/market-score/growth-r2-worker-domain-r1.mjs",import.meta.url),"utf8");
  const growthHistory=fs.readFileSync(new URL("../lib/market-score/growth-r2-chart-history-r1.mjs",import.meta.url),"utf8");

  assert.match(inflation,/completedMonthEnds\(asOf,13\)/);
  assert.deepEqual(completedMonthEnds("2026-10-06",13).slice(0,1),["2025-09-30"]);
  assert.equal(completedMonthEnds("2026-10-06",13).at(-1),"2026-09-30");
  assert.match(inflation,/trend\.push\(\{label:asOf,value:current\.score\}\)/);
  assert.match(growthDomain,/for\(let n=12;n>=0;n--\)/);
  assert.match(growthDomain,/GROWTH_R2_CHART_STORAGE_MONTHS/);
  assert.match(growthDomain,/getUTCMonth\(\)-\(GROWTH_R2_CHART_STORAGE_MONTHS-1\)/);
  assert.match(growthDomain,/earliestBy/);
  assert.match(growthDomain,/label\.slice\(0,7\)===month/);
  assert.match(growthDomain,/splice\(i,1,\{label:asOf,value:currentScore\}\)/);
  assert.match(growthHistory,/GROWTH_R2_CHART_STORAGE_MONTHS=16/);
  assert.match(growthHistory,/getUTCMonth\(\)-\(GROWTH_R2_CHART_STORAGE_MONTHS-1\)/);
  assert.match(growthHistory,/startyear:String\(years\[0\]\)/);
});
