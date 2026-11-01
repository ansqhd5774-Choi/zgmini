import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {
  E1_R5_SEC_MATCHING_SOURCE_REVIEW_R1_CONTRACT,
  E1_R5_SEC_MATCHING_SOURCE_REVIEW_R1_VERSION,
  buildSourceReview,
  runSecMatchingSourceReviewR1,
} from "../scripts/pc-writer/earnings-r5-sec-matching-source-review-r1.mjs";

const hash=bytes=>createHash("sha256").update(bytes).digest("hex");

function fixture(){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r5-sec-source-review-"));
  const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");
  const documents=path.join(root,"documents");
  const reports=path.join(base,"manual-input","e1-r5","reports");
  fs.mkdirSync(documents,{recursive:true});
  fs.mkdirSync(reports,{recursive:true});

  const cik="0000910521";
  const currentAccession="0000910521-26-000015";
  const priorAccession="0000910521-26-000007";
  const currentDir=path.join(documents,cik,currentAccession.replaceAll("-",""));
  const priorDir=path.join(documents,cik,priorAccession.replaceAll("-",""));
  fs.mkdirSync(currentDir,{recursive:true});
  fs.mkdirSync(priorDir,{recursive:true});

  const currentHtml=Buffer.from("<p>Full fiscal year 2027 adjusted diluted EPS guidance raised to $7.35 to $7.50.</p>","utf8");
  const priorHtml=Buffer.from("<p>Full fiscal year 2027 adjusted diluted EPS guidance is $7.30 to $7.45.</p><p>Multi-year framework for fiscal years 2028 through 2030 expects low-double-digit EPS growth.</p>","utf8");
  const currentFile=path.join(currentDir,"current.htm");
  const priorFile=path.join(priorDir,"prior.htm");
  fs.writeFileSync(currentFile,currentHtml);
  fs.writeFileSync(priorFile,priorHtml);

  const checkpoint={version:"E1-R5-R17-SEC-GUIDANCE-R1",completed:{
    [currentAccession]:{cik,accessionNumber:currentAccession,sourceSha256:hash(currentHtml)},
  }};
  const ledger={version:"E1-R5-SEC-HISTORY-BACKFILL-R1",completed:{
    [priorAccession]:{cik,accessionNumber:priorAccession,sourceFiles:[{role:"EXHIBIT",file:path.relative(root,priorFile).replaceAll("\\","/"),sha256:hash(priorHtml)}]},
  }};
  const sampleReport={
    version:"E1-R5-SEC-MATCHING-SAMPLE-R1",
    sourceAsOf:"2026-10-13T18:17:35.716Z",
    sample:[{
      sampleIndex:1,cik,currentAccessionNumber:currentAccession,priorAccessionNumber:priorAccession,
      periodKey:"FY2027",basis:"ADJUSTED",currentMidpoint:7.425,previousMidpoint:2029,
    }],
  };
  fs.writeFileSync(path.join(root,"checkpoint.json"),JSON.stringify(checkpoint,null,2));
  fs.writeFileSync(path.join(root,"historical-backfill-r1.json"),JSON.stringify(ledger,null,2));
  fs.writeFileSync(path.join(reports,"e1-r5-sec-matching-sample-r1-last.json"),JSON.stringify(sampleReport,null,2));
  return {base,root,documents,reports,checkpoint,ledger,sampleReport};
}

test("source review contract is local-only and production-off",()=>{
  assert.equal(E1_R5_SEC_MATCHING_SOURCE_REVIEW_R1_VERSION,"E1-R5-SEC-MATCHING-SOURCE-REVIEW-R1");
  assert.equal(E1_R5_SEC_MATCHING_SOURCE_REVIEW_R1_CONTRACT.productionActivation,false);
  assert.equal(E1_R5_SEC_MATCHING_SOURCE_REVIEW_R1_CONTRACT.networkCalls,0);
  assert.equal(E1_R5_SEC_MATCHING_SOURCE_REVIEW_R1_CONTRACT.dbWrites,0);
  assert.equal(E1_R5_SEC_MATCHING_SOURCE_REVIEW_R1_CONTRACT.formulaChanged,false);
  assert.equal(E1_R5_SEC_MATCHING_SOURCE_REVIEW_R1_CONTRACT.weightChanged,false);
});

test("source review flags calendar-year midpoint and preserves source excerpts",()=>{
  const fx=fixture();
  try{
    const out=buildSourceReview({sampleReport:fx.sampleReport,checkpoint:fx.checkpoint,historyLedger:fx.ledger,root:fx.root,documentsRoot:fx.documents});
    assert.equal(out.status,"REVIEW_READY");
    assert.equal(out.sampleCount,1);
    assert.equal(out.sourceReadyCount,1);
    assert.equal(out.flaggedYearRangeCount,1);
    assert.equal(out.rows[0].reviewStatus,"AUTO_FLAG_YEAR_RANGE");
    assert.equal(out.rows[0].sourceIntegrity.current,"MATCH");
    assert.equal(out.rows[0].sourceIntegrity.prior,"MATCH");
    assert.match(out.rows[0].currentExcerpts.map(x=>x.text).join(" "),/7\.35 to \$7\.50/);
    assert.match(out.rows[0].priorExcerpts.map(x=>x.text).join(" "),/2028 through 2030/);
  }finally{fs.rmSync(fx.base,{recursive:true,force:true});}
});

test("runner writes local JSON and TXT only",()=>{
  const fx=fixture();
  try{
    const result=runSecMatchingSourceReviewR1({base:fx.base});
    assert.equal(result.report.status,"REVIEW_READY");
    assert.equal(fs.existsSync(result.jsonReport),true);
    assert.equal(fs.existsSync(result.textReport),true);
    const text=fs.readFileSync(result.textReport,"utf8");
    assert.match(text,/FLAGGED_YEAR_RANGE_COUNT: 1/);
    assert.match(text,/PRODUCTION_ACTIVATION: NO/);
  }finally{fs.rmSync(fx.base,{recursive:true,force:true});}
});

test("CMD wrapper remains CMD-only and local-only",()=>{
  const cmd=fs.readFileSync(new URL("../ZGMINI_EARNINGS_R5_SEC_MATCHING_SOURCE_REVIEW_R1.cmd",import.meta.url),"utf8");
  assert.match(cmd,/earnings-r5-sec-matching-source-review-r1\.mjs/i);
  assert.doesNotMatch(cmd,/powershell|wsl|wrangler|--publish/i);
});
