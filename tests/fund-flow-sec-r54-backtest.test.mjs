import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {buildSecFundFlowFeatureSeries} from "../scripts/pc-writer/backtest-fund-flow-sec-r54.mjs";

function rows(count=36){
  return Array.from({length:count},(_,i)=>{
    const d=new Date(Date.UTC(2022,i,1)).toISOString().slice(0,10);
    const allNetRatio=(i%7-3)/10;
    return {
      observationDate:d,
      value:allNetRatio,
      allNetRatio,
      indexNetRatio:allNetRatio+.25,
      nonIndexNetRatio:allNetRatio-.15,
      allOutflowRatio:-(2.2+(i%5)*.1),
    };
  });
}

test("SEC fund-flow historical feature builder reconstructs R54 score and components",()=>{
  const out=buildSecFundFlowFeatureSeries(rows(),{asOfDate:"2024-12-31"});
  assert.equal(out.status,"READY");
  assert.ok(out.features.score.length>=12);
  assert.ok(out.features.allNetScore.length>=12);
  assert.ok(out.features.momentumScore.length>=12);
  assert.ok(out.features.participationScore.length>=12);
  assert.ok(out.features.redemptionScore.length>=12);
});

test("SEC historical bridge is analysis-only and does not fetch, publish, or change production formula",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/backtest-fund-flow-sec-r54.mjs",import.meta.url),"utf8");
  assert.match(src,/SEC_REGISTERED_FUND_HISTORY_BACKTEST_ONLY/);
  assert.match(src,/CURRENT_VINTAGE_SEC_REGISTERED_FUND_STATISTICS/);
  assert.match(src,/lookAheadSafe:false/);
  assert.match(src,/providerCalls:0/);
  assert.match(src,/productionFormulaChanged:false/);
  assert.match(src,/iciHistoricalReplacementDecision:"NOT_DECIDED"/);
  assert.doesNotMatch(src,/fetch\(|publishMarket|remote\.|--publish|INSERT INTO|UPDATE |DELETE FROM/);
});
