import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {
  E1_R5_FORWARD_R2_LOCAL_AUDIT_VERSION,
  auditExistingSecGuidanceCorpus,
  auditLocalCfoSurveyFile,
  runEarningsR5ForwardR2LocalAudit,
} from "../scripts/pc-writer/earnings-r5-forward-r2-local-audit.mjs";

const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const HASH_A="a".repeat(64);
const HASH_B="b".repeat(64);

function fixture(){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r5-forward-r2-audit-"));
  const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");
  const documents=path.join(root,"documents");
  fs.mkdirSync(documents,{recursive:true});
  const completed={};
  const add=(cik,accession,filed,html)=>{
    const key=accession.replaceAll("-","");
    const dir=path.join(documents,cik,key);
    fs.mkdirSync(dir,{recursive:true});
    const file=path.join(dir,"source.htm");
    const bytes=Buffer.from(html,"utf8");
    fs.writeFileSync(file,bytes);
    completed[accession]={cik,accessionNumber:accession,filed,sourceSha256:hash(bytes)};
    return file;
  };
  add("0000000001","0001-26-000001","2026-08-05","The company is raising full-year 2026 adjusted EPS guidance range to $7.90 to $8.10 from $7.30 to $7.50.");
  add("0000000002","0002-26-000002","2026-05-12",`<h2>2026 Guidance</h2><table><tr><th>Metric</th><th>Prior</th><th>Current</th></tr><tr><td>Adjusted Diluted EPS</td><td>$4.00 to $4.20</td><td>$4.10 to $4.30</td></tr></table>`);
  add("0000000003","0003-26-000003","2026-07-20","For fiscal year 2026, the company expects adjusted diluted EPS of $5.00 to $5.20.");
  const checkpoint={version:"E1-R5-R17-SEC-GUIDANCE-R1",asOf:"2026-10-12",lookbackDays:185,completed};
  fs.writeFileSync(path.join(root,"checkpoint.json"),JSON.stringify(checkpoint,null,2));
  return {base,root,documents,checkpoint};
}

function cfoDocument(){
  return {releases:[
    {
      surveyYear:2026,surveyQuarter:2,
      releaseAt:"2026-06-24T14:00:00Z",storedAt:"2026-06-24T14:05:00Z",
      currentYearGrowth:6.5,nextYearGrowth:7.4,
      sourceHash:HASH_A,revisionId:"2026Q2_INITIAL",
    },
    {
      surveyYear:2026,surveyQuarter:3,
      releaseAt:"2026-09-23T14:00:00Z",storedAt:"2026-09-23T14:05:00Z",
      currentYearGrowth:7.7,nextYearGrowth:7.2,
      sourceHash:HASH_B,revisionId:"2026Q3_INITIAL",
    },
  ]};
}

test("local audit version is explicit and SEC corpus is hash-verified",()=>{
  assert.equal(E1_R5_FORWARD_R2_LOCAL_AUDIT_VERSION,"E1-R5-FORWARD-R2-LOCAL-AUDIT-R1");
  const fx=fixture();
  try{
    const out=auditExistingSecGuidanceCorpus({checkpoint:fx.checkpoint,documentsRoot:fx.documents});
    assert.equal(out.status,"PASS");
    assert.equal(out.totalIssuers,3);
    assert.deepEqual(out.integrity,{matched:3,missing:0,hashMismatch:0,hashMissing:0});
    assert.equal(out.parse.directPairIssuers,2);
    assert.equal(out.parse.ambiguousPairIssuers,0);
    assert.equal(out.parse.noPairIssuers,1);
    assert.equal(out.directPairIssuerCoverage,2/3);
    assert.equal(out.diagnosticOnly.note,"LOWER_BOUND_SAME_FILING_DIRECT_PAIR_DIAGNOSTIC_NOT_S12A_SCORE");
    assert.equal(out.directPairs.length,2);
  }finally{fs.rmSync(fx.base,{recursive:true,force:true});}
});

test("hash mismatch fails closed without parsing the tampered document",()=>{
  const fx=fixture();
  try{
    const item=Object.values(fx.checkpoint.completed)[0];
    item.sourceSha256="f".repeat(64);
    const out=auditExistingSecGuidanceCorpus({checkpoint:fx.checkpoint,documentsRoot:fx.documents});
    assert.equal(out.status,"FAILED");
    assert.equal(out.integrity.hashMismatch,1);
    assert.equal(out.integrity.matched,2);
  }finally{fs.rmSync(fx.base,{recursive:true,force:true});}
});

test("CFO local audit uses consecutive PIT releases and approved rolling weights",()=>{
  const out=auditLocalCfoSurveyFile(cfoDocument(),{asOf:"2026-09-24"});
  assert.equal(out.status,"READY");
  assert.equal(out.surveyYear,2026);
  assert.equal(out.surveyQuarter,3);
  assert.ok(Math.abs(out.previousLevel-6.95)<1e-12);
  assert.ok(Math.abs(out.currentLevel-7.325)<1e-12);
  assert.ok(Math.abs(out.raw-0.375)<1e-12);
  assert.equal(out.currentRevisionId,"2026Q3_INITIAL");
  assert.equal(out.previousRevisionId,"2026Q2_INITIAL");
});

test("CFO local audit does not leak a release published after as-of",()=>{
  const out=auditLocalCfoSurveyFile(cfoDocument(),{asOf:"2026-08-01"});
  assert.equal(out.status,"MISSING");
  assert.equal(out.reason,"RELEASE_MISSING");
  assert.equal(out.surveyQuarter,2);
});

test("CFO local audit does not leak a historical release imported after as-of",()=>{
  const document=cfoDocument();
  document.releases[0]={
    ...document.releases[0],
    storedAt:"2026-10-13T00:00:00Z",
    revisionId:"2026Q2_IMPORTED_LATE",
  };
  const out=auditLocalCfoSurveyFile(document,{asOf:"2026-08-01"});
  assert.equal(out.status,"MISSING");
  assert.equal(out.reason,"NO_READY_RELEASE_AS_OF");
  assert.equal(out.surveyYear,undefined);
  assert.equal(out.surveyQuarter,undefined);
});

test("end-to-end audit writes research reports only and performs no provider or DB work",()=>{
  const fx=fixture();
  try{
    const cfoFile=path.join(fx.base,"cfo.json");
    fs.writeFileSync(cfoFile,JSON.stringify(cfoDocument(),null,2));
    const result=runEarningsR5ForwardR2LocalAudit({base:fx.base,asOf:"2026-09-24",cfoFile});
    assert.equal(result.report.status,"PASS");
    assert.equal(result.report.networkCalls,0);
    assert.equal(result.report.dbWrites,0);
    assert.equal(result.report.productionActivation,false);
    assert.equal(result.report.formulaChanged,false);
    assert.equal(result.report.weightChanged,false);
    assert.equal(result.report.sec.directPairIssuerCoverage,2/3);
    assert.ok(Math.abs(result.report.cfo.raw-0.375)<1e-12);
    assert.equal(fs.existsSync(result.jsonReport),true);
    assert.equal(fs.existsSync(result.textReport),true);
    const text=fs.readFileSync(result.textReport,"utf8");
    assert.match(text,/NETWORK_CALLS: 0/);
    assert.match(text,/DB_WRITES: 0/);
    assert.match(text,/PRODUCTION_ACTIVATION: NO/);
  }finally{fs.rmSync(fx.base,{recursive:true,force:true});}
});
