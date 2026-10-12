import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {buildRemainingGapDiagnostic,loadFsdsFactsWithGapAudit} from "../scripts/pc-writer/earnings-r5-fsds-remaining-gap-diagnostic.mjs";

test("EPS FSDS audit exposes contract rejection reason instead of silently returning zero",async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-fsds-gap-"));const sub=path.join(dir,"sub.txt"),num=path.join(dir,"num.txt");
  fs.writeFileSync(sub,["adsh\tcik\tform\tperiod\tfy\tfp\tfiled","a1\t1\t10-Q\t20260630\t2026\tQ2\t20260815"].join("\n")+"\n");
  fs.writeFileSync(num,["adsh\ttag\tversion\tddate\tqtrs\tuom\tsegments\tcoreg\tvalue\tfootnote","a1\tEarningsPerShareDiluted\tus-gaap/2026\t20260630\t0\tUSD/shares\t\t\t2.5\t","a1\tRevenueFromContractWithCustomerExcludingAssessedTax\tus-gaap/2026\t20260630\t1\tUSD\t\t\t100\t"].join("\n")+"\n");
  const r=await loadFsdsFactsWithGapAudit({subFile:sub,numFile:num,universeCiks:new Set(["0000000001"]),asOf:"2026-10-12"});
  assert.equal(r.status,"PASS");assert.equal(r.epsAudit.joinedRows,1);assert.equal(r.epsAudit.finiteRows,1);assert.equal(r.epsAudit.qtrs["0"],1);assert.equal(r.epsAudit.classification.INVALID_DURATION,1);assert.equal(r.acceptedByMetric.revenue,1);assert.equal(r.acceptedByMetric.eps,0);
  fs.rmSync(dir,{recursive:true,force:true});
});

test("S3 current margin level is independent of prior-year operating-income availability",()=>{
  const cik="0000000001";const members=[{cik,ticker:"TEST"}];const doc={cik:"1",facts:{"us-gaap":{}}};
  const fsds=[{metric:"revenue",tag:"RevenueFromContractWithCustomerExcludingAssessedTax",unit:"USD",qtrs:1,val:100,ddate:"2026-06-30",duration:90,filed:"2026-08-15",form:"10-Q",adsh:"a1"},{metric:"operatingIncome",tag:"OperatingIncomeLoss",unit:"USD",qtrs:1,val:10,ddate:"2026-06-30",duration:90,filed:"2026-08-15",form:"10-Q",adsh:"a1"}];
  const r=buildRemainingGapDiagnostic({members,factsByCik:new Map([[cik,doc]]),submissionsByCik:new Map([[cik,{sic:"3571"}]]),fsdsFactsByCik:new Map([[cik,fsds]]),frame:{frame:"CY2026Q2",priorFrame:"CY2025Q2",end:"2026-06-30",priorEnd:"2025-06-30"},asOf:"2026-10-12"});
  assert.equal(r.counts.nonFinancial,1);assert.equal(r.gates.S3.ready,1);assert.equal(r.gates.S4.ready,0);assert.equal(r.policies.s3CurrentLevelIndependentOfPrior,true);assert.equal(r.policies.formulaChanged,false);assert.equal(r.policies.scoringGateChanged,false);
});
