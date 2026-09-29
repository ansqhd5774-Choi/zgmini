import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  EMPLOYMENT_R4_BED_FREEZE,
  EMPLOYMENT_R4_BED_CONTRACT,
  computeBedNetGrossRate,
  computeBedSmallFirmNetLevel,
  computeBedStateBreadth,
  computeBedBirthDeathDiagnostic,
  buildBedRawFeatures
} from "../lib/market-score/employment-r4-bed-candidate.mjs";

const rowsFor=(pairs,make=(id,i)=>({seriesId:id,value:i+1}))=>pairs.map((id,i)=>make(id,i));

test("BED universe is frozen to 50 states plus DC only",()=>{
  const u=EMPLOYMENT_R4_BED_FREEZE.researchUniverse.stateBreadth;
  assert.equal(u.count,51);
  assert.equal(u.pairs.length,51);
  assert.ok(u.pairs.some(x=>x.code==="11"&&x.name==="District of Columbia"));
  assert.ok(!u.pairs.some(x=>x.code==="72"||x.code==="78"));
});

test("firm-size codes are exactly 01-04 and never size-of-change code 31",()=>{
  assert.deepEqual(EMPLOYMENT_R4_BED_FREEZE.researchUniverse.smallFirm.sizeClassCodes,["01","02","03","04"]);
  assert.ok(!EMPLOYMENT_R4_BED_FREEZE.researchUniverse.smallFirm.sizeClassCodes.includes("31"));
});

test("national net gross rate is gains minus losses",()=>{
  const f=EMPLOYMENT_R4_BED_FREEZE.features.BED_NET_GROSS_RATE;
  const out=computeBedNetGrossRate([
    {seriesId:f.gainSeriesId,value:5.9},
    {seriesId:f.lossSeriesId,value:5.5}
  ]);
  assert.equal(out.status,"READY");
  assert.ok(Math.abs(out.value-0.4)<1e-12);
});

test("small-firm net level sums all four gain/loss level classes and requires all 8",()=>{
  const p=EMPLOYMENT_R4_BED_FREEZE.researchUniverse.smallFirm.levelPairs;
  const full=[];
  let expectedG=0,expectedL=0;
  let n=1;
  for(const code of ["01","02","03","04"]){
    full.push({seriesId:p[code].gainSeriesId,value:n});expectedG+=n++;
    full.push({seriesId:p[code].lossSeriesId,value:n});expectedL+=n++;
  }
  const out=computeBedSmallFirmNetLevel(full);
  assert.equal(out.status,"READY");
  assert.equal(out.value,expectedG-expectedL);
  assert.equal(computeBedSmallFirmNetLevel(full.slice(1)).value,null);
});

test("state breadth refuses denominator shrink and uses all 51 pairs",()=>{
  const pairs=EMPLOYMENT_R4_BED_FREEZE.researchUniverse.stateBreadth.pairs;
  const full=[];
  pairs.forEach((p,i)=>{
    full.push({seriesId:p.gainSeriesId,value:i%2?10:20});
    full.push({seriesId:p.lossSeriesId,value:15});
  });
  const out=computeBedStateBreadth(full);
  assert.equal(out.status,"READY");
  assert.equal(out.denominator,51);
  assert.ok(out.value>0&&out.value<100);
  const partial=computeBedStateBreadth(full.slice(1));
  assert.equal(partial.value,null);
  assert.equal(partial.status,"PARTIAL_FULL_51_UNIVERSE_REQUIRED");
});

test("birth/death diagnostic does not impute missing death to zero",()=>{
  const f=EMPLOYMENT_R4_BED_FREEZE.features.BED_BIRTH_DEATH_DIAGNOSTIC;
  const miss=computeBedBirthDeathDiagnostic([{seriesId:f.birthRateSeriesId,value:0.8}]);
  assert.equal(miss.value,null);
  assert.equal(miss.status,"DIAGNOSTIC_MISSING_NO_IMPUTATION");
});

test("BED research contract never computes public score or calls provider",()=>{
  assert.equal(EMPLOYMENT_R4_BED_CONTRACT.providerCalls,0);
  assert.equal(EMPLOYMENT_R4_BED_CONTRACT.scoreComputed,false);
  assert.equal(EMPLOYMENT_R4_BED_CONTRACT.activeMethodologyChanged,false);
  const source=fs.readFileSync(new URL("../lib/market-score/employment-r4-bed-candidate.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(source,/\bfetch\s*\(/);
  assert.doesNotMatch(source,/globalThis\.fetch/);
});

test("combined raw feature builder remains research-only",()=>{
  const out=buildBedRawFeatures([]);
  assert.equal(out.scoreComputed,false);
  assert.equal(out.providerCalled,false);
  assert.equal(out.activeMethodologyChanged,false);
});
