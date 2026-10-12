import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";
import {buildR2138OutcomeRows,summarizeR2138Economic} from "../scripts/pc-writer/sector-fear-greed-r2138-economic-regime-validation.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const scriptPath=path.join(here,"..","scripts","pc-writer","sector-fear-greed-r2138-economic-regime-validation.mjs");

test("R2.13.8 outcome alignment uses actual ordered sessions and never invents calendar rows",()=>{
  const prices=[],start=new Date("2026-01-01T00:00:00Z");
  for(let i=0;i<90;i++){const d=new Date(start.getTime()+i*86400000);prices.push({date:d.toISOString().slice(0,10),close:100+i});}
  const scores=[{date:prices[20].date,score:80},{date:"2025-12-31",score:20}],out=buildR2138OutcomeRows(scores,prices);
  assert.equal(out.length,1);
  assert.equal(out[0].date,prices[20].date);
  assert.ok(Number.isFinite(out[0].trailing20Return));
  assert.ok(Number.isFinite(out[0].forwardReturn20));
  assert.ok(Number.isFinite(out[0].forwardDrawdown20));
});

test("R2.13.8 economic summary keeps forward outcomes descriptive and band counts explicit",()=>{
  const rows=[];
  for(let i=0;i<20;i++)rows.push({date:`2026-01-${String(i+1).padStart(2,"0")}`,score:i*5,trailing20Return:i,trailingRv20:20-i,forwardReturn20:-i,forwardReturn60:-2*i,forwardDrawdown20:-i,forwardDrawdown60:-2*i});
  const out=summarizeR2138Economic(rows);
  assert.equal(out.n,20);
  assert.ok(out.corrTrailing20>0);
  assert.ok(out.corrRv20<0);
  assert.ok(out.corrForward20<0);
  assert.ok(out.highBand.forwardReturn20.n>0);
  assert.ok(out.lowBand.forwardReturn20.n>0);
});

test("R2.13.8 remains local read-only research and cannot claim options equivalence",()=>{
  const source=fs.readFileSync(scriptPath,"utf8");
  assert.equal(/\bfetch\s*\(/.test(source),false);
  assert.equal(/wrangler\s+d1|publication-ledger|INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM/i.test(source),false);
  assert.match(source,/providerCalls:0/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/referenceRequirementChanged:false/);
  assert.match(source,/approvedR1ReferenceRequirement:756/);
  assert.match(source,/r24ApprovedForProduction:false/);
  assert.match(source,/candidateSelected:false/);
  assert.match(source,/optionsEquivalenceClaimed:false/);
  assert.match(source,/selectionThresholdIntroduced:false/);
});
