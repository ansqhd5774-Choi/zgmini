import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  E1_R5_SEC_CORPUS_TOPOLOGY_AUDIT_VERSION,
  auditSecCorpusTopology,
  runSecCorpusTopologyAudit,
} from "../scripts/pc-writer/earnings-r5-sec-corpus-topology-audit.mjs";

function fixture({withExtraHistory=true}={}){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r5-sec-topology-"));
  const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");
  const documents=path.join(root,"documents");
  const completed={
    a:{cik:"0000000001",accessionNumber:"0001-26-000001",filed:"2026-08-05",sourceSha256:"a".repeat(64)},
    b:{cik:"0000000002",accessionNumber:"0002-26-000001",filed:"2026-08-06",sourceSha256:"b".repeat(64)},
  };
  for(const row of Object.values(completed)){
    fs.mkdirSync(path.join(documents,row.cik,row.accessionNumber.replaceAll("-","")),{recursive:true});
    fs.writeFileSync(path.join(documents,row.cik,row.accessionNumber.replaceAll("-",""),"source.htm"),"x");
  }
  if(withExtraHistory){
    fs.mkdirSync(path.join(documents,"0000000001","000126000000"),{recursive:true});
    fs.writeFileSync(path.join(documents,"0000000001","000126000000","source.htm"),"historical");
  }
  const checkpoint={version:"E1-R5-R17-SEC-GUIDANCE-R1",completed};
  fs.mkdirSync(root,{recursive:true});
  fs.writeFileSync(path.join(root,"checkpoint.json"),JSON.stringify(checkpoint,null,2));
  return {base,documents,checkpoint};
}

test("SEC topology audit detects multi-accession local history without changing production",()=>{
  const fx=fixture({withExtraHistory:true});
  try{
    const report=auditSecCorpusTopology({checkpoint:fx.checkpoint,documentsRoot:fx.documents});
    assert.equal(E1_R5_SEC_CORPUS_TOPOLOGY_AUDIT_VERSION,"E1-R5-SEC-CORPUS-TOPOLOGY-AUDIT-R1");
    assert.equal(report.status,"PASS");
    assert.equal(report.checkpoint.entryCount,2);
    assert.equal(report.checkpoint.uniqueCiks,2);
    assert.equal(report.checkpoint.ciksWithMultipleEntries,0);
    assert.equal(report.documentTree.accessionDirectoryCount,3);
    assert.equal(report.documentTree.ciksWithMultipleAccessions,1);
    assert.equal(report.unreferencedAccessionCount,1);
    assert.equal(report.missingCheckpointDirectoryCount,0);
    assert.equal(report.decision,"LOCAL_MULTI_ACCESSION_CORPUS_PRESENT");
    assert.equal(report.productionActivation,false);
    assert.equal(report.formulaChanged,false);
    assert.equal(report.weightChanged,false);
    assert.equal(report.dbWrites,0);
    assert.equal(report.networkCalls,0);
  }finally{fs.rmSync(fx.base,{recursive:true,force:true});}
});

test("SEC topology audit explicitly calls for history backfill when only one accession exists per issuer",()=>{
  const fx=fixture({withExtraHistory:false});
  try{
    const report=auditSecCorpusTopology({checkpoint:fx.checkpoint,documentsRoot:fx.documents});
    assert.equal(report.documentTree.accessionDirectoryCount,2);
    assert.equal(report.documentTree.ciksWithMultipleAccessions,0);
    assert.equal(report.unreferencedAccessionCount,0);
    assert.equal(report.decision,"HISTORICAL_BACKFILL_REQUIRED");
  }finally{fs.rmSync(fx.base,{recursive:true,force:true});}
});

test("SEC topology runner writes research reports only",()=>{
  const fx=fixture({withExtraHistory:true});
  try{
    const result=runSecCorpusTopologyAudit({base:fx.base});
    assert.equal(result.report.status,"PASS");
    assert.equal(fs.existsSync(result.jsonReport),true);
    assert.equal(fs.existsSync(result.textReport),true);
    const text=fs.readFileSync(result.textReport,"utf8");
    assert.match(text,/DECISION: LOCAL_MULTI_ACCESSION_CORPUS_PRESENT/);
    assert.match(text,/NETWORK_CALLS: 0/);
    assert.match(text,/DB_WRITES: 0/);
    assert.match(text,/PRODUCTION_ACTIVATION: NO/);
  }finally{fs.rmSync(fx.base,{recursive:true,force:true});}
});

test("Windows CMD topology wrapper remains local-only and production-off",()=>{
  const source=fs.readFileSync(new URL("../ZGMINI_EARNINGS_R5_SEC_TOPOLOGY_AUDIT.cmd",import.meta.url),"utf8");
  assert.match(source,/earnings-r5-sec-corpus-topology-audit\.mjs/i);
  assert.match(source,/NETWORK 0/i);
  assert.match(source,/PRODUCTION OFF/i);
  assert.doesNotMatch(source,/curl|powershell|wsl|wrangler|--publish/i);
});
