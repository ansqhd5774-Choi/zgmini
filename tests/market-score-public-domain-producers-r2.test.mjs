import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCommoditiesK1R2,
  K1_R2_METHOD,
  K1_R2_WEIGHTS,
} from "../lib/market-score/public-domain-producers-r2.mjs";

const rows=(n,start=100)=>Array.from({length:n},(_,i)=>({
  observationDate:`${2019+Math.floor(i/12)}-${String(i%12+1).padStart(2,"0")}-01`,
  value:start+i+Math.sin(i/4),
}));

test("K1-R2 uses independent latest valid component months and exact 30/25/25/20 weights",()=>{
  const out=buildCommoditiesK1R2({
    wtiRows:rows(92,70),
    brentRows:rows(92,75),
    copperRows:rows(92,7000),
    gasolineRows:rows(93,2.5),
    asOfDate:"2026-10-01",
  });
  assert.equal(out.status,"READY");
  assert.equal(out.methodologyVersion,K1_R2_METHOD);
  assert.deepEqual(out.indicators.map(x=>x.name),["WTI","Brent","구리","휘발유"]);
  assert.deepEqual(out.indicators.map(x=>x.asOfDate),["2026-08-01","2026-08-01","2026-08-01","2026-09-01"]);
  const byName=Object.fromEntries(out.indicators.map(x=>[x.name,x.score]));
  const expected=
    K1_R2_WEIGHTS.wti*byName.WTI+
    K1_R2_WEIGHTS.brent*byName.Brent+
    K1_R2_WEIGHTS.copper*byName["구리"]+
    K1_R2_WEIGHTS.gasoline*byName["휘발유"];
  assert.ok(Math.abs(out.score-expected)<1e-10);
  assert.ok(out.trend.length>0);
});

test("K1-R2 rejects a component older than two calendar months without renormalization",()=>{
  const out=buildCommoditiesK1R2({
    wtiRows:rows(90,70),
    brentRows:rows(92,75),
    copperRows:rows(92,7000),
    gasolineRows:rows(93,2.5),
    asOfDate:"2026-10-01",
  });
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.ok(out.missingFactors.includes("WTI_SCORE_STALE"));
});

test("K1-R2 does not fabricate Brent when Brent history is absent",()=>{
  const out=buildCommoditiesK1R2({
    wtiRows:rows(92,70),
    brentRows:[],
    copperRows:rows(92,7000),
    gasolineRows:rows(93,2.5),
    asOfDate:"2026-10-01",
  });
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.score,null);
  assert.ok(out.missingFactors.includes("BRENT_SCORE_MISSING"));
});
