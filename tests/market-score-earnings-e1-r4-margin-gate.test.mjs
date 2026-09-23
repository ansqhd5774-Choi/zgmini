import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {buildEarningsE1R4,E1_R4_LIMITS} from "../lib/market-score/earnings-e1-r4.mjs";

function rows({n=500,marginN=319,epsN=500,revenueN=500}={}){
  return Array.from({length:n},(_,i)=>({
    cik:String(1000000+i).padStart(10,"0"),
    epsGrowth:i<epsN?.08+(i%7)*.002:null,
    revenueGrowth:i<revenueN?.05+(i%5)*.002:null,
    operatingMargin:i<marginN?.12+(i%11)*.001:null,
  }));
}

test("E1-R4 deletes only the 65% operating-margin coverage gate",async()=>{
  assert.equal(Object.prototype.hasOwnProperty.call(E1_R4_LIMITS,"marginCoverage"),false);
  assert.equal(E1_R4_LIMITS.epsCoverage,.80);
  assert.equal(E1_R4_LIMITS.revenueCoverage,.80);
  assert.equal(E1_R4_LIMITS.breadthCoverage,.80);

  const result=buildEarningsE1R4({
    asOfDate:"2026-09-24",
    financialPeriodEnd:"2026-06-30",
    issuerRows:rows({marginN:319}),
    universeMeta:{securityCount:500,uniqueIssuerCount:500},
    retrievedAt:"2026-09-24T00:00:00Z",
  });
  assert.equal(result.status,"READY");
  assert.equal(result.methodologyVersion,"E1-R4");
  assert.equal(result.quality.marginCoverage,319/500);
  assert.equal(result.components.margin.weight,.25);
  assert.equal(result.components.epsGrowth.weight,.35);
  assert.equal(result.components.revenueGrowth.weight,.20);
  assert.equal(result.components.earningsGrowthBreadth.weight,.20);
});

test("E1-R4 keeps the other coverage gates",()=>{
  const result=buildEarningsE1R4({
    asOfDate:"2026-09-24",
    financialPeriodEnd:"2026-06-30",
    issuerRows:rows({epsN:399,revenueN:500,marginN:500}),
    universeMeta:{securityCount:500,uniqueIssuerCount:500},
  });
  assert.equal(result.status,"PARTIAL");
  assert.equal(result.missing[0],"LOW_EPS_COUNT_COVERAGE");
});

test("E1-R4 source contains no 65% margin coverage threshold or LOW_MARGIN gate",async()=>{
  const source=await readFile(new URL("../lib/market-score/earnings-e1-r4.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(source,/marginCoverage\s*:\s*0\.65/);
  assert.doesNotMatch(source,/LOW_MARGIN_COUNT_COVERAGE/);
  assert.match(source,/0\.35\*scores\.eps/);
  assert.match(source,/0\.25\*scores\.margin/);
  assert.match(source,/0\.20\*scores\.revenue/);
  assert.match(source,/0\.20\*scores\.epsBreadth/);
});
