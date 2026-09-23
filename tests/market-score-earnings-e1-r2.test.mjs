import test from "node:test";
import assert from "node:assert/strict";
import {buildEarningsE1R2,E1_R2_LIMITS} from "../lib/market-score/earnings-e1-r2.mjs";
import {E1_R2_CALIBRATION_META} from "../lib/market-score/earnings-e1-r2-calibration.mjs";

function rows(n=500){
  return Array.from({length:n},(_,i)=>({
    cik:String(1000000+i).padStart(10,"0"),
    epsGrowth:0.02+(i%20)*0.002,
    revenueGrowth:0.01+(i%15)*0.0015,
    operatingMargin:0.12+(i%25)*0.003,
  }));
}

test("E1-R2 keeps approved 35/25/20/20 weights and expanding-percentile scoring",()=>{
  const out=buildEarningsE1R2({
    asOfDate:"2026-09-23",
    financialPeriodEnd:"2026-06-30",
    issuerRows:rows(),
    retrievedAt:"2026-09-23T00:00:00.000Z",
    universeMeta:{securityCount:503,validCikSecurityCount:503,uniqueIssuerCount:500,wikipediaRevisionId:123},
  });
  assert.equal(out.status,"READY");
  assert.equal(out.methodologyVersion,"E1-R2");
  assert.equal(out.normalization,"EXPANDING_PERCENTILE_FROZEN_PIT_HISTORY");
  assert.equal(out.calibration.through,E1_R2_CALIBRATION_META.through);
  const c=out.components;
  const expected=.35*c.epsGrowth.score+.25*c.margin.score+.20*c.revenueGrowth.score+.20*c.earningsGrowthBreadth.score;
  assert.ok(Math.abs(out.score-expected)<1e-12);
  assert.deepEqual([c.epsGrowth.weight,c.margin.weight,c.revenueGrowth.weight,c.earningsGrowthBreadth.weight],[.35,.25,.20,.20]);
});

test("E1-R2 counts one issuer once and fails duplicate CIK closed",()=>{
  const r=rows();
  r.push({...r[0]});
  const out=buildEarningsE1R2({asOfDate:"2026-09-23",financialPeriodEnd:"2026-06-30",issuerRows:r});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.missing[0],"DUPLICATE_ISSUER_CIK");
});

test("E1-R2 does not reweight missing margin and keeps the approved coverage gate",()=>{
  const r=rows().map((x,i)=>({...x,operatingMargin:i<Math.floor(500*.64)?x.operatingMargin:null}));
  const out=buildEarningsE1R2({asOfDate:"2026-09-23",financialPeriodEnd:"2026-06-30",issuerRows:r});
  assert.equal(E1_R2_LIMITS.marginCoverage,.65);
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.equal(out.missing[0],"LOW_MARGIN_COUNT_COVERAGE");
});

test("E1-R2 breadth is the positive EPS-growth issuer share before percentile normalization",()=>{
  const r=rows().map((x,i)=>({...x,epsGrowth:i<300?0.05:-0.05}));
  const out=buildEarningsE1R2({asOfDate:"2026-09-23",financialPeriodEnd:"2026-06-30",issuerRows:r});
  assert.equal(out.status,"READY");
  assert.equal(out.components.earningsGrowthBreadth.raw,.6);
  assert.equal(out.indicators.find(x=>x.name==="이익 성장 종목 비율").value,60);
});
