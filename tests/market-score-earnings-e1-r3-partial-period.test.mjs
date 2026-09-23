import test from "node:test";
import assert from "node:assert/strict";
import {buildEarningsE1R3} from "../lib/market-score/earnings-e1-r3.mjs";

const rows=Array.from({length:500},(_,i)=>({
  cik:String(i+1).padStart(10,"0"),
  epsGrowth:i<421?0.08:null,
  revenueGrowth:i<410?0.06:null,
  operatingMargin:i<319?0.12:null,
}));

test("E1-R3 PARTIAL coverage response preserves the exact valid financial period",()=>{
  const out=buildEarningsE1R3({
    asOfDate:"2026-09-23",
    financialPeriodEnd:"2026-06-30",
    issuerRows:rows,
    retrievedAt:"2026-09-23T00:00:00.000Z",
  });
  assert.equal(out.status,"PARTIAL");
  assert.deepEqual(out.missing,["LOW_MARGIN_COUNT_COVERAGE"]);
  assert.equal(out.methodologyVersion,"E1-R3");
  assert.equal(out.financialPeriodEnd,"2026-06-30");
  assert.equal(out.quality.marginCoverage,319/500);
});

test("E1-R3 does not echo an invalid financial period",()=>{
  const out=buildEarningsE1R3({
    asOfDate:"2026-09-23",
    financialPeriodEnd:"invalid",
    issuerRows:rows,
  });
  assert.equal(out.status,"PARTIAL");
  assert.deepEqual(out.missing,["INVALID_FINANCIAL_PERIOD"]);
  assert.equal(out.financialPeriodEnd,undefined);
});
