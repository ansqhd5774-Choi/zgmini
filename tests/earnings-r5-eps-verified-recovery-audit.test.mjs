import test from "node:test";
import assert from "node:assert/strict";
import {rowParity,classifyRecoveredIssuer} from "../scripts/pc-writer/earnings-r5-eps-verified-recovery-audit.mjs";

test("row parity requires exact accession, end, and value",()=>{
  const company=[{accn:"0001",end:"2026-06-30",val:2.5}];
  assert.equal(rowParity({adsh:"0001",ddate:"2026-06-30",val:2.5},company).ok,true);
  assert.equal(rowParity({adsh:"0001",ddate:"2026-06-30",val:2.6},company).reason,"VALUE_MISMATCH");
  assert.equal(rowParity({adsh:"0002",ddate:"2026-06-30",val:2.5},company).reason,"NO_COMPANYFACTS_ACCN_END");
});

test("recovered issuer is verified only when current and prior both have exact parity",()=>{
  const company=[
    {accn:"c",end:"2026-06-30",val:2.5},
    {accn:"p",end:"2025-06-30",val:2.0},
  ];
  const ok=classifyRecoveredIssuer({baselineReady:false,usdCurrent:{adsh:"c",ddate:"2026-06-30",val:2.5},usdPrior:{adsh:"p",ddate:"2025-06-30",val:2.0},companyRows:company});
  assert.equal(ok.recovered,true);assert.equal(ok.verified,true);assert.equal(ok.category,"RECOVERED_VERIFIED");
  const bad=classifyRecoveredIssuer({baselineReady:false,usdCurrent:{adsh:"c",ddate:"2026-06-30",val:2.5},usdPrior:{adsh:"p",ddate:"2025-06-30",val:2.1},companyRows:company});
  assert.equal(bad.recovered,true);assert.equal(bad.verified,false);
});

test("baseline-ready issuer is never counted as recovered",()=>{
  const result=classifyRecoveredIssuer({baselineReady:true,usdCurrent:{},usdPrior:{},companyRows:[]});
  assert.equal(result.category,"BASELINE_READY");assert.equal(result.recovered,false);assert.equal(result.verified,false);
});
