import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {summarizeR21313Fwd5} from "../scripts/pc-writer/sector-fear-greed-r21313-residual-fwd5-economic.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");

test("R2.13.13 summarizes mature five-session outcomes without inventing longer horizons",()=>{
  const rows=Array.from({length:16},(_,i)=>({date:new Date(Date.UTC(2026,8,1+i)).toISOString().slice(0,10),score:i,forwardReturn5:i/100,forwardDrawdown5:-0.20+i/1000}));
  const s=summarizeR21313Fwd5(rows);
  assert.equal(s.forward5Pairs,16);
  assert.equal(s.forward5DrawdownPairs,16);
  assert.equal(s.forward5ReturnSpearman,1);
  assert.equal(s.forward5DrawdownSpearman,1);
  assert.equal(s.forward5ReturnEligible,true);
  assert.equal(s.forward5DrawdownEligible,true);
});

test("R2.13.13 fails closed when fewer than three FWD5 pairs are available",()=>{
  const rows=[
    {date:"2026-09-01",score:10,forwardReturn5:0.01,forwardDrawdown5:-0.02},
    {date:"2026-09-02",score:20,forwardReturn5:0.02,forwardDrawdown5:-0.01},
    {date:"2026-09-03",score:30}
  ];
  const s=summarizeR21313Fwd5(rows);
  assert.equal(s.forward5Pairs,2);
  assert.equal(s.forward5ReturnSpearman,null);
  assert.equal(s.forward5ReturnEligible,false);
  assert.equal(s.forward5DrawdownEligible,false);
});

test("R2.13.13 remains read-only and does not change formulas, windows, or selection",()=>{
  const source=fs.readFileSync(path.join(root,"scripts/pc-writer/sector-fear-greed-r21313-residual-fwd5-economic.mjs"),"utf8");
  assert.match(source,/providerCalls:0/);
  assert.match(source,/publicMutation:false/);
  assert.match(source,/d1Mutation:false/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/approvedR1ReferenceRequirement:756/);
  assert.match(source,/candidateSelected:false/);
  assert.match(source,/selectionThresholdIntroduced:false/);
  assert.match(source,/residualizationChanged:false/);
  assert.match(source,/referenceWindowChanged:false/);
  assert.doesNotMatch(source,/\bfetch\s*\(/);
  assert.doesNotMatch(source,/wrangler\s+d1/i);
});
