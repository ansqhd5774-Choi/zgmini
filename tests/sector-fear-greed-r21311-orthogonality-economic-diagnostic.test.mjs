import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {R21311_CANDIDATES,residualizeR21311} from "../scripts/pc-writer/sector-fear-greed-r21311-orthogonality-economic-diagnostic.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.join(here,"..","scripts","pc-writer","sector-fear-greed-r21311-orthogonality-economic-diagnostic.mjs"),"utf8");
const dates=Array.from({length:40},(_,i)=>`2026-${String(1+Math.floor(i/28)).padStart(2,"0")}-${String(1+i%28).padStart(2,"0")}`);
function axes(){const out={trend:[],breadth:[],demand:[],relativeStrength:[],volatility:[]};for(let i=0;i<dates.length;i++){out.trend.push({date:dates[i],score:i});out.breadth.push({date:dates[i],score:(i*7)%31});out.demand.push({date:dates[i],score:(i*11)%37});out.relativeStrength.push({date:dates[i],score:(i*13)%41});out.volatility.push({date:dates[i],score:(i*17)%43});}return out;}

test("R2.13.11 compares only existing candidates and adds no selected formula",()=>{
  assert.deepEqual(R21311_CANDIDATES,["R23","R24","R2_SPEC_LEADERSHIP_RAW","R2_TAIL_BALANCE_RAW","R2_MAX_LOTTERY_RAW"]);
  assert.match(source,/newFormulaIntroduced:false/);
  assert.match(source,/candidateSelected:false/);
  assert.match(source,/residualizationUsedForProduction:false/);
});

test("R2.13.11 residualization removes an exact five-axis linear combination",()=>{
  const a=axes(),candidate=dates.map((date,i)=>({date,score:5+2*a.trend[i].score-.5*a.breadth[i].score+.3*a.demand[i].score+.8*a.relativeStrength[i].score-.2*a.volatility[i].score}));
  const r=residualizeR21311(candidate,a);
  assert.equal(r.status,"READY");
  assert.ok(r.r2>0.999999);
  assert.equal(r.residual.length,dates.length);
  assert.ok(Math.max(...r.residual.map(x=>Math.abs(x.score)))<1e-7);
});

test("R2.13.11 fails closed when aligned history is insufficient",()=>{
  const a=axes(),candidate=dates.slice(0,6).map((date,i)=>({date,score:i}));
  const r=residualizeR21311(candidate,a);
  assert.equal(r.status,"INSUFFICIENT");
  assert.deepEqual(r.residual,[]);
});

test("R2.13.11 remains local read-only diagnostic research",()=>{
  for(const forbidden of ["fetch(","wrangler","INSERT INTO","UPDATE ","DELETE FROM","ALTER TABLE","CREATE TABLE","candidateSelected:true","optionsEquivalenceClaimed:true","residualizationUsedForProduction:true"]){assert.equal(source.includes(forbidden),false,forbidden);}
  assert.match(source,/providerCalls:0/);
  assert.match(source,/publicMutation:false/);
  assert.match(source,/d1Mutation:false/);
  assert.match(source,/productionFormulaChanged:false/);
  assert.match(source,/approvedR1ReferenceRequirement:756/);
});