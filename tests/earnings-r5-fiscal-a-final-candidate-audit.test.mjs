import test from "node:test";
import assert from "node:assert/strict";
import {SAFE_FALLBACKS,fallbackAllowed,applyFallbackToRow,summarizeGates} from "../scripts/pc-writer/earnings-r5-fiscal-a-final-candidate-audit.mjs";

test("final fallback whitelist contains only four reviewed issuer-tag pairs",()=>{
  assert.deepEqual(Object.keys(SAFE_FALLBACKS).sort(),["ADP","DOW","GLW","LLY"]);
  for(const tag of Object.values(SAFE_FALLBACKS))assert.equal(/ProductiveAssets/i.test(tag),false);
  assert.equal(fallbackAllowed("ADP",SAFE_FALLBACKS.ADP),true);
  assert.equal(fallbackAllowed("F","PaymentsToAcquireProductiveAssets"),false);
});

test("fallback never overwrites approved capex",()=>{
  const row={current:{revenue:100,operatingCashFlow:20,capex:5},audit:{revenueEnd:"2026-06-30"}};
  const out=applyFallbackToRow(row,{ticker:"GLW",tag:SAFE_FALLBACKS.GLW,value:8,method:"CUMULATIVE_DELTA",revenueEnd:"2026-06-30"});
  assert.equal(out.applied,false);assert.equal(out.reason,"APPROVED_CAPEX_PRESENT");assert.equal(out.row.current.capex,5);
});

test("fallback requires matching fiscal anchor and S5 prerequisites",()=>{
  const row={current:{revenue:100,operatingCashFlow:20,capex:null},audit:{revenueEnd:"2026-06-30"}};
  const bad=applyFallbackToRow(row,{ticker:"GLW",tag:SAFE_FALLBACKS.GLW,value:8,method:"CUMULATIVE_DELTA",revenueEnd:"2026-03-31"});
  assert.equal(bad.applied,false);assert.equal(bad.reason,"ANCHOR_MISMATCH");
  const ok=applyFallbackToRow(row,{ticker:"GLW",tag:SAFE_FALLBACKS.GLW,value:8,method:"CUMULATIVE_DELTA",revenueEnd:"2026-06-30"});
  assert.equal(ok.applied,true);assert.equal(ok.row.current.capex,8);
});

test("gate summary uses 70 percent only for S5 and 80 percent elsewhere",()=>{
  const rows=[];
  for(let i=0;i<10;i++)rows.push({cik:String(i),isFinancial:false,current:{eps:1,revenue:10,operatingIncome:2,operatingCashFlow:3,capex:i<7?1:null,netIncome:1},priorYear:{eps:1,revenue:9,operatingIncome:1}});
  const s=summarizeGates(rows);
  assert.equal(s.gates.S1.threshold,.8);assert.equal(s.gates.S5.threshold,.7);
  assert.equal(s.gates.S5.ready,7);assert.equal(s.gates.S5.pass,true);
});
