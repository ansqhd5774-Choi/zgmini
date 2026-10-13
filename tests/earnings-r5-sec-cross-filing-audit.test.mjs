import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {
  E1_R5_SEC_CROSS_FILING_AUDIT_CONTRACT,
  E1_R5_SEC_CROSS_FILING_AUDIT_VERSION,
  auditSecCrossFilingCorpus,
  buildIssuerCrossFilingPair,
  collapseGuidanceCandidates,
  runEarningsR5SecCrossFilingAudit,
} from "../scripts/pc-writer/earnings-r5-sec-cross-filing-audit.mjs";

const hash=bytes=>createHash("sha256").update(bytes).digest("hex");

function fixture(){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r5-sec-cross-filing-"));
  const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");
  const documents=path.join(root,"documents");
  const reports=path.join(base,"manual-input","e1-r5","reports");
  fs.mkdirSync(documents,{recursive:true});
  fs.mkdirSync(reports,{recursive:true});

  const completed={};
  const historyCompleted={};
  function addCurrent({cik,accession,filed,html}){
    const dir=path.join(documents,cik,accession.replaceAll("-",""));fs.mkdirSync(dir,{recursive:true});
    const file=path.join(dir,"current.htm"),bytes=Buffer.from(html,"utf8");fs.writeFileSync(file,bytes);
    completed[accession]={cik,accessionNumber:accession,filed,sourceSha256:hash(bytes)};
  }
  function addHistory({cik,accession,filed,acceptedAt,storedAt,html}){
    const dir=path.join(documents,cik,accession.replaceAll("-",""));fs.mkdirSync(dir,{recursive:true});
    const file=path.join(dir,"history.htm"),bytes=Buffer.from(html,"utf8");fs.writeFileSync(file,bytes);
    historyCompleted[accession]={
      cik,accessionNumber:accession,filed,acceptedAt,storedAt,form:"8-K",items:["2.02"],
      sourceFiles:[{role:"PRIMARY",file:path.relative(root,file).replaceAll("\\","/"),sha256:hash(bytes)}],
    };
  }

  addCurrent({cik:"0000000001",accession:"0000000001-26-000100",filed:"2026-10-01",html:"The company raises fiscal year 2026 adjusted diluted EPS guidance to $5.40 to $5.60."});
  addHistory({cik:"0000000001",accession:"0000000001-26-000090",filed:"2026-07-20",acceptedAt:"2026-07-20T12:00:00Z",storedAt:"2026-10-13T16:00:00Z",html:"The company expects fiscal year 2026 adjusted diluted EPS guidance of $5.00 to $5.20."});

  addCurrent({cik:"0000000002",accession:"0000000002-26-000200",filed:"2026-09-30",html:"The company lowers fiscal year 2026 GAAP diluted EPS guidance to $3.00 to $3.20."});
  addHistory({cik:"0000000002",accession:"0000000002-26-000190",filed:"2026-06-30",acceptedAt:"2026-06-30T12:00:00Z",storedAt:"2026-10-13T16:01:00Z",html:"The company expects fiscal year 2026 GAAP diluted EPS guidance of $3.40 to $3.60."});

  addCurrent({cik:"0000000003",accession:"0000000003-26-000300",filed:"2026-09-29",html:"The company expects fiscal year 2026 adjusted diluted EPS guidance of $7.00 to $7.20."});
  addHistory({cik:"0000000003",accession:"0000000003-26-000290",filed:"2026-06-29",acceptedAt:"2026-06-29T12:00:00Z",storedAt:"2026-10-20T00:00:00Z",html:"The company expects fiscal year 2026 adjusted diluted EPS guidance of $6.80 to $7.00."});

  const checkpoint={version:"E1-R5-R17-SEC-GUIDANCE-R1",asOf:"2026-10-12",completed};
  const ledger={version:"E1-R5-SEC-HISTORY-BACKFILL-R1",sourceCorpusVersion:"E1-R5-R17-SEC-GUIDANCE-R1",asOf:"2026-10-12",lookbackDays:550,priorPerIssuer:2,completed:historyCompleted};
  fs.writeFileSync(path.join(root,"checkpoint.json"),JSON.stringify(checkpoint,null,2));
  fs.writeFileSync(path.join(root,"historical-backfill-r1.json"),JSON.stringify(ledger,null,2));
  fs.writeFileSync(path.join(reports,"e1-r5-sec-history-backfill-last.json"),JSON.stringify({status:"COMPLETE",remainingAccessions:0},null,2));
  return {base,root,documents,reports,checkpoint,ledger};
}

test("cross-filing contract is shadow-only and read-only",()=>{
  assert.equal(E1_R5_SEC_CROSS_FILING_AUDIT_VERSION,"E1-R5-SEC-CROSS-FILING-AUDIT-R1");
  assert.equal(E1_R5_SEC_CROSS_FILING_AUDIT_CONTRACT.productionActivation,false);
  assert.equal(E1_R5_SEC_CROSS_FILING_AUDIT_CONTRACT.networkCalls,0);
  assert.equal(E1_R5_SEC_CROSS_FILING_AUDIT_CONTRACT.dbWrites,0);
  assert.equal(E1_R5_SEC_CROSS_FILING_AUDIT_CONTRACT.formulaChanged,false);
  assert.equal(E1_R5_SEC_CROSS_FILING_AUDIT_CONTRACT.weightChanged,false);
});

test("candidate collapse fails closed on multiple ranges for the same period and basis",()=>{
  const base={status:"READY",periodKey:"FY2026",metric:"EPS",basis:"ADJUSTED",unit:"USD/SHARE",availableAt:"2026-10-01T00:00:00Z"};
  const out=collapseGuidanceCandidates([{...base,low:5,high:5.2},{...base,low:5.1,high:5.3}]);
  assert.equal(out.ready.length,0);
  assert.deepEqual(out.ambiguousKeys,["FY2026|EPS|ADJUSTED|USD/SHARE"]);
});

test("issuer matcher requires exactly one strict comparable key",()=>{
  const current={status:"READY",periodKey:"FY2026",metric:"EPS",basis:"ADJUSTED",unit:"USD/SHARE",low:5.4,high:5.6};
  const previous={status:"READY",periodKey:"FY2026",metric:"EPS",basis:"ADJUSTED",unit:"USD/SHARE",low:5,high:5.2};
  const out=buildIssuerCrossFilingPair({currentCandidates:[current],historicalFilings:[{accessionNumber:"A",filed:"2026-07-01",candidates:[previous],ambiguousKeys:[]}]});
  assert.equal(out.status,"READY");
  assert.equal(out.pair.priorAccessionNumber,"A");
});

test("corpus audit matches across filings and excludes history stored after as-of",()=>{
  const fx=fixture();
  try{
    const out=auditSecCrossFilingCorpus({checkpoint:fx.checkpoint,historyLedger:fx.ledger,root:fx.root,documentsRoot:fx.documents,asOf:"2026-10-14T00:00:00Z"});
    assert.equal(out.status,"PASS");
    assert.equal(out.currentIssuerCount,3);
    assert.equal(out.integrity.currentMatched,3);
    assert.equal(out.integrity.historyMatched,2);
    assert.equal(out.integrity.historyExcludedStoredAfterAsOf,1);
    assert.equal(out.comparableIssuerCount,2);
    assert.equal(out.directions.up,1);
    assert.equal(out.directions.down,1);
    assert.equal(out.directions.same,0);
    assert.equal(out.s13Raw,0);
    assert.equal(typeof out.s12aRaw,"number");
    assert.equal(out.issuerMissingReasons.NO_PRIOR_COMPARABLE_GUIDANCE,1);
  }finally{fs.rmSync(fx.base,{recursive:true,force:true});}
});

test("runner refuses to score a partial backfill",()=>{
  const fx=fixture();
  try{
    fs.writeFileSync(path.join(fx.reports,"e1-r5-sec-history-backfill-last.json"),JSON.stringify({status:"RUNNING",remainingAccessions:4},null,2));
    const result=runEarningsR5SecCrossFilingAudit({base:fx.base,asOf:"2026-10-14T00:00:00Z"});
    assert.equal(result.report.status,"BLOCKED");
    assert.equal(result.report.reason,"HISTORY_BACKFILL_NOT_COMPLETE");
    assert.equal(result.report.audit,null);
  }finally{fs.rmSync(fx.base,{recursive:true,force:true});}
});

test("runner writes raw S12A/S13 shadow audit only after complete backfill",()=>{
  const fx=fixture();
  try{
    const result=runEarningsR5SecCrossFilingAudit({base:fx.base,asOf:"2026-10-21T00:00:00Z"});
    assert.equal(result.report.status,"PASS");
    assert.equal(result.report.audit.comparableIssuerCount,3);
    assert.equal(result.report.networkCalls,0);
    assert.equal(result.report.dbWrites,0);
    assert.equal(result.report.productionActivation,false);
    assert.equal(fs.existsSync(result.jsonReport),true);
    assert.equal(fs.existsSync(result.textReport),true);
    const text=fs.readFileSync(result.textReport,"utf8");
    assert.match(text,/S12A_RAW_MEDIAN:/);
    assert.match(text,/S13_RAW_BREADTH:/);
    assert.match(text,/PRODUCTION_ACTIVATION: NO/);
  }finally{fs.rmSync(fx.base,{recursive:true,force:true});}
});

test("Windows wrappers stay CMD-only, local-only for audit, and chain audit only after COMPLETE backfill",()=>{
  const auditCmd=fs.readFileSync(new URL("../ZGMINI_EARNINGS_R5_SEC_CROSS_FILING_AUDIT.cmd",import.meta.url),"utf8");
  assert.match(auditCmd,/earnings-r5-sec-cross-filing-audit\.mjs/i);
  assert.doesNotMatch(auditCmd,/powershell|wsl|wrangler|--publish/i);
  const backfillCmd=fs.readFileSync(new URL("../ZGMINI_EARNINGS_R5_SEC_HISTORY_BACKFILL.cmd",import.meta.url),"utf8");
  assert.match(backfillCmd,/remainingAccessions/i);
  assert.match(backfillCmd,/ZGMINI_EARNINGS_R5_SEC_CROSS_FILING_AUDIT\.cmd/i);
  assert.doesNotMatch(backfillCmd,/powershell|wsl|wrangler|--publish/i);
});
