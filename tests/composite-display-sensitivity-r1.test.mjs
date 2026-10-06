import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  COMPOSITE_DISPLAY_SENSITIVITY_R1,
  amplifyCompositeDisplayScore,
  amplifyCompositeDisplayTrend,
} from "../lib/market-score/composite-display-sensitivity-r1.mjs";

test("composite display sensitivity is fixed at approved 2x around 50",()=>{
  assert.equal(COMPOSITE_DISPLAY_SENSITIVITY_R1,2);
  assert.equal(amplifyCompositeDisplayScore(50),50);
  assert.equal(amplifyCompositeDisplayScore(53.13843904506898),56.27687809013796);
  assert.equal(amplifyCompositeDisplayScore(45),40);
  assert.equal(amplifyCompositeDisplayScore(80),100);
});

test("composite display trend amplifies only values and preserves labels",()=>{
  assert.deepEqual(amplifyCompositeDisplayTrend([
    {label:"2026-10-01",value:49.5},
    {label:"2026-10-06",value:53},
  ]),[
    {label:"2026-10-01",value:49},
    {label:"2026-10-06",value:56},
  ]);
});

test("dashboard applies sensitivity only to Overall presentation",()=>{
  const src=fs.readFileSync(new URL("../app/dashboard-ui.tsx",import.meta.url),"utf8");
  assert.match(src,/overallRawScore/);
  assert.match(src,/amplifyCompositeDisplayScore\(overallRawScore\)/);
  assert.match(src,/amplifyCompositeDisplayTrend\(normalizeMarketTrendPoints\(market\?\.overall\?\.trend\)\)/);
  assert.doesNotMatch(src,/amplifyCompositeDisplayScore\(score\)/);
});
