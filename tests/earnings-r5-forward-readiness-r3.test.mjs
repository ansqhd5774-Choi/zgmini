import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  E1_R5_FORWARD_READINESS_R3_VERSION,
  auditCfoRevisionHistory,
  auditHistoricalStorageWindow,
  buildForwardReadiness,
  runForwardReadinessR3,
} from "../scripts/pc-writer/earnings-r5-forward-readiness-r3.mjs";

const HASH_A="a".repeat(64);
const HASH_B="b".repeat(64);

function crossReport(){
  return {
    version:"E1-R5-SEC-CROSS-FILING-AUDIT-R1",
    status:"PASS",
    backfillStatus:"COMPLETE",
    audit:{
      status:"PASS",
      currentIssuerCount:499,
      integrity:{currentMissing:0,currentHashMismatch:0,currentHashMissing:0,historyMissing:0,historyHashMismatch:0,historyHashMissing:0,historyPathInvalid:0},
      currentParse:{readyIssuers:46,ambiguousIssuers:7,noGuidanceIssuers:453},
      comparableIssuerCount:18,
      comparableIssuerCoverage:18/499,
      s12aRaw:0.009032430983650381,
      s13Raw:0.5555555555555556,
      directions:{up:13,same:2,down:3},
      issuerMissingReasons:{NO_PRIOR_COMPARABLE_GUIDANCE:20,MULTIPLE_COMPARABLE_GUIDANCE_KEYS:8},
    },
  };
}
function cfoDocument(){
  return {releases:[
    {surveyYear:2026,surveyQuarter:2,releaseAt:"2026-06-24T14:00:00Z",storedAt:"2026-10-13T15:00:00Z",currentYearGrowth:6.5,nextYearGrowth:7.4,sourceHash:HASH_A,revisionId:"2026Q2_INITIAL"},
    {surveyYear:2026,surveyQuarter:3,releaseAt:"2026-09-23T14:00:00Z",storedAt:"2026-10-13T15:05:00Z",currentYearGrowth:7.7,nextYearGrowth:7.2,sourceHash:HASH_B,revisionId:"2026Q3_INITIAL"},
  ]};
}
function ledger(){
  return {version:"E1-R5-SEC-HISTORY-BACKFILL-R1",completed:{
    a:{filed:"2026-04-20",acceptedAt:"2026-04-20T20:00:00Z",storedAt:"2026-10-13T16:00:00Z"},
    b:{filed:"2026-07-20",acceptedAt:"2026-07-20T20:00:00Z",storedAt:"2026-10-13T16:01:00Z"},
  }};
}

test("readiness R3 keeps raw signals separate from unready normalization and production",()=>{
  assert.equal(E1_R5_FORWARD_READINESS_R3_VERSION,"E1-R5-FORWARD-READINESS-R3");
  const out=buildForwardReadiness({crossReport:crossReport(),cfoDocument:cfoDocument(),historyLedger:ledger(),asOf:"2026-10-14T00:00:00Z"});
  assert.equal(out.status,"RAW_READY_VALIDATION_PENDING");
  assert.equal(out.rawComponentsReady,true);
  assert.equal(out.productionReady,false);
  assert.ok(Math.abs(out.raw.s12a-0.009032430983650381)<1e-12);
  assert.ok(Math.abs(out.raw.s12b-0.375)<1e-12);
  assert.ok(Math.abs(out.raw.s13-0.5555555555555556)<1e-12);
  assert.equal(out.normalization.status,"NOT_READY");
  assert.equal(out.normalization.s12Score,null);
  assert.equal(out.normalization.futureScore,null);
  assert.equal(out.normalization.noReweight,true);
  assert.deepEqual(out.approvedWeights,{s12a:4,s12b:3,s13:3,futureBlock:10});
  assert.ok(Math.abs(out.sec.comparableOverallCoverage-18/499)<1e-12);
  assert.ok(Math.abs(out.sec.comparableWithinGuidanceCoverage-18/46)<1e-12);
  assert.equal(out.cfo.history.readyRevisionCount,1);
  assert.equal(out.validationGates.find(row=>row.id==="G6_PIT_ONLY_BACKTEST").status,"NOT_EVALUABLE");
  assert.equal(out.networkCalls,0);
  assert.equal(out.dbWrites,0);
  assert.equal(out.productionActivation,false);
});

test("CFO revision history counts only consecutive ready period comparisons",()=>{
  const out=auditCfoRevisionHistory(cfoDocument(),{asOf:"2026-10-14T00:00:00Z"});
  assert.equal(out.readyPeriodCount,2);
  assert.equal(out.readyRevisionCount,1);
  assert.deepEqual(out.periods,["2026Q2","2026Q3"]);
  assert.ok(Math.abs(out.revisions[0].raw-0.375)<1e-12);
});

test("historical storage window exposes retrospective local-storage timing without changing PIT policy",()=>{
  const out=auditHistoricalStorageWindow(ledger());
  assert.equal(out.entryCount,2);
  assert.equal(out.validStoredAtCount,2);
  assert.equal(out.earliestStoredAt,"2026-10-13T16:00:00.000Z");
  assert.equal(out.latestStoredAt,"2026-10-13T16:01:00.000Z");
  assert.equal(out.storedAfterSourceCount,2);
});

test("missing CFO raw input keeps readiness blocked without reweighting",()=>{
  const out=buildForwardReadiness({crossReport:crossReport(),cfoDocument:{releases:[]},historyLedger:ledger(),asOf:"2026-10-14T00:00:00Z"});
  assert.equal(out.status,"BLOCKED_RAW_INPUT");
  assert.equal(out.rawComponentsReady,false);
  assert.equal(out.raw.s12b,null);
  assert.equal(out.normalization.s12Score,null);
  assert.equal(out.productionReady,false);
});

test("end-to-end readiness runner writes local reports only",()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r5-readiness-r3-"));
  try{
    const reports=path.join(base,"manual-input","e1-r5","reports"),cfoDir=path.join(base,"manual-input","e1-r5","cfo-survey-r1"),secDir=path.join(base,"manual-input","e1-r5","sec-guidance-r17");
    fs.mkdirSync(reports,{recursive:true});fs.mkdirSync(cfoDir,{recursive:true});fs.mkdirSync(secDir,{recursive:true});
    fs.writeFileSync(path.join(reports,"e1-r5-sec-cross-filing-audit-last.json"),JSON.stringify(crossReport(),null,2));
    fs.writeFileSync(path.join(cfoDir,"releases.json"),JSON.stringify(cfoDocument(),null,2));
    fs.writeFileSync(path.join(secDir,"historical-backfill-r1.json"),JSON.stringify(ledger(),null,2));
    const out=runForwardReadinessR3({base,asOf:"2026-10-14T00:00:00Z"});
    assert.equal(out.report.status,"RAW_READY_VALIDATION_PENDING");
    assert.equal(fs.existsSync(out.jsonReport),true);
    assert.equal(fs.existsSync(out.textReport),true);
    const text=fs.readFileSync(out.textReport,"utf8");
    assert.match(text,/PRODUCTION_READY: NO/);
    assert.match(text,/NORMALIZATION: NOT_READY/);
    assert.match(text,/NETWORK_CALLS: 0/);
    assert.match(text,/DB_WRITES: 0/);
    assert.match(text,/PRODUCTION_ACTIVATION: NO/);
  }finally{fs.rmSync(base,{recursive:true,force:true});}
});

test("CMD wrapper stays local-only",()=>{
  const source=fs.readFileSync(new URL("../ZGMINI_EARNINGS_R5_FORWARD_READINESS_R3.cmd",import.meta.url),"utf8");
  assert.match(source,/earnings-r5-forward-readiness-r3\.mjs/i);
  assert.doesNotMatch(source,/curl|wrangler|powershell|wsl|--publish/i);
});
