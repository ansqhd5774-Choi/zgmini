import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {summarizeResidualCoverage} from "../scripts/pc-writer/sector-fear-greed-r21312-residual-forward-coverage.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");

test("R2.13.12 counts actual forward-session availability without inventing calendar rows",()=>{
  const price=Array.from({length:100},(_,i)=>({date:`2026-01-${String(i+1).padStart(2,"0")}`,close:100+i})).filter(r=>Number(r.date.slice(-2))<=31);
  const real=price.map((r,i)=>({...r,date:new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10)}));
  const residual=real.slice(30,70).map((r,i)=>({date:r.date,score:i}));
  const s=summarizeResidualCoverage(residual,real);
  assert.equal(s.residualN,40);
  assert.equal(s.alignedN,40);
  assert.equal(s.trail20Pairs,40);
  assert.equal(s.forward20Pairs,30);
  assert.equal(s.forward60Pairs,0);
  assert.equal(s.forward20CorrelationEligible,true);
  assert.equal(s.forward60CorrelationEligible,false);
});

test("R2.13.12 requires at least three horizon pairs and nonconstant residual scores",()=>{
  const price=Array.from({length:30},(_,i)=>({date:new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10),close:100+i}));
  const tooShort=price.slice(8,10).map((r,i)=>({date:r.date,score:i}));
  assert.equal(summarizeResidualCoverage(tooShort,price).forward20CorrelationEligible,false);
  const constant=price.slice(0,8).map(r=>({date:r.date,score:1}));
  assert.equal(summarizeResidualCoverage(constant,price).forward20CorrelationEligible,false);
});

test("R2.13.12 remains read-only and does not change formulas or selection",()=>{
  const source=fs.readFileSync(path.join(root,"scripts/pc-writer/sector-fear-greed-r21312-residual-forward-coverage.mjs"),"utf8");
  assert.match(source,/providerCalls:0/);
  assert.match(source,/publicMutation:false/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/approvedR1ReferenceRequirement:756/);
  assert.match(source,/candidateSelected:false/);
  assert.match(source,/residualizationChanged:false/);
});
