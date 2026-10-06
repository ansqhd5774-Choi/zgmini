import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  COMPOSITE_SENSITIVITY_FACTORS,
  amplifyCompositeScore,
  analyzeCompositeSensitivity,
} from "../scripts/pc-writer/analyze-composite-sensitivity.mjs";

test("composite sensitivity keeps 50 fixed and amplifies distance from 50",()=>{
  assert.deepEqual(COMPOSITE_SENSITIVITY_FACTORS,[1.5,2,2.5]);
  assert.equal(amplifyCompositeScore(50,2),50);
  assert.equal(amplifyCompositeScore(53,2),56);
  assert.equal(amplifyCompositeScore(45,2),40);
  assert.equal(amplifyCompositeScore(80,2),100);
});

test("analysis preserves raw trend and never mutates production score",()=>{
  const market={
    overall:{
      score:53,
      trend:[
        {label:"2026-01-01",value:47},
        {label:"2026-02-01",value:50},
        {label:"2026-03-01",value:53},
      ],
    },
  };
  const out=analyzeCompositeSensitivity(market);
  assert.equal(out.mode,"ANALYSIS_ONLY");
  assert.equal(out.productionScoreChanged,false);
  assert.equal(out.formulaChanged,false);
  assert.equal(out.currentRaw,53);
  assert.deepEqual(out.raw.series,market.overall.trend);
  assert.deepEqual(out.candidates.map(x=>x.current),[54.5,56,57.5]);
});

test("analysis script has no provider, publish, D1 remote, or formula mutation path",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/analyze-composite-sensitivity.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(src,/fetch\(|publishMarket|remote\.|wrangler|UPDATE |INSERT INTO|DELETE FROM/);
  assert.match(src,/ANALYSIS_ONLY/);
  assert.match(src,/local-composite-sensitivity-analysis\.json/);
});
