import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {summarizeR21315NonOverlap,summarizeR21315LeaveOneOut,R21315_CANDIDATES} from "../scripts/pc-writer/sector-fear-greed-r21315-tail-balance-robustness.mjs";

test("R2.13.15 keeps the comparison fixed to R24 and Tail Balance",()=>{
  assert.deepEqual(R21315_CANDIDATES,["R24","R2_TAIL_BALANCE_RAW"]);
});

test("R2.13.15 non-overlap offsets use every fifth ordered session",()=>{
  const dates={};
  for(let i=0;i<16;i++)dates[`2026-09-${String(i+1).padStart(2,"0")}`]={returnIC:i+1,drawdownIC:i+1,spread:{topMinusBottomReturn:(i+1)/100,topMinusBottomDrawdown:(i+1)/200}};
  const out=summarizeR21315NonOverlap(dates);
  assert.equal(out.offsets.length,5);
  assert.equal(out.offsets[0].dates,4);
  assert.equal(out.offsets[1].dates,3);
  assert.equal(out.meanReturnPositiveOffsets,5);
  assert.ok(out.minMeanReturnIC>0);
});

test("R2.13.15 leave-one-out does not depend on a single sector when all ranks agree",()=>{
  const sectors=["a","b","c","d","e","f","g","h","i","j","k"],byDate={};
  for(const date of ["2026-09-01","2026-09-02","2026-09-03"]){byDate[date]=sectors.map((sectorId,i)=>({sectorId,score:i,forwardReturn5:i/100,forwardDrawdown5:i/200}));}
  const out=summarizeR21315LeaveOneOut(byDate,sectors);
  assert.equal(out.summary.omissions,11);
  assert.equal(out.summary.positiveMeanReturnOmissions,11);
  assert.equal(out.summary.positiveMeanDrawdownOmissions,11);
});

test("R2.13.15 remains read-only diagnostic research",()=>{
  const src=fs.readFileSync(new URL("../scripts/pc-writer/sector-fear-greed-r21315-tail-balance-robustness.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(src,/\bfetch\s*\(/);
  assert.doesNotMatch(src,/wrangler\s+d1|publication-ledger|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM/i);
  assert.match(src,/providerCalls:0/);
  assert.match(src,/productionFormulaChanged:false/);
  assert.match(src,/referenceRequirementChanged:false/);
  assert.match(src,/approvedR1ReferenceRequirement:756/);
  assert.match(src,/candidateSelected:false/);
  assert.match(src,/selectionThresholdIntroduced:false/);
  assert.match(src,/optionsEquivalenceClaimed:false/);
  assert.match(src,/residualizationChanged:false/);
  assert.match(src,/referenceWindowChanged:false/);
});
