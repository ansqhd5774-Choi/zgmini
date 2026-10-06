import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("targeted monthly one-year backfill only collects growth and never publishes",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/backfill-monthly-one-year.mjs",import.meta.url),"utf8");
  assert.match(src,/collectGrowthR2StoreOnlyR1/);
  assert.match(src,/mode:"enforce"/);
  assert.match(src,/local-monthly-one-year-backfill-last-run\.json/);
  assert.doesNotMatch(src,/publishMarket|--publish|remote\.request|remote\.query/);
});
