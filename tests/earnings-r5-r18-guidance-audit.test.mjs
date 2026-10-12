import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {classifyGuidanceDirectionFromHtml} from "../lib/market-score/earnings-e1-r5-guidance-r17.mjs";
import {auditEarningsR5R18Guidance} from "../scripts/pc-writer/earnings-r5-r18-guidance-audit.mjs";

function sha256(bytes){return createHash("sha256").update(bytes).digest("hex");}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+"\n","utf8");}
function addDocument(base,{cik,accessionNumber,filed="2026-10-01",fileName="doc.htm",html,sourceRole="PRIMARY"}){
  const accessionKey=accessionNumber.replaceAll("-","");
  const file=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents",cik,accessionKey,fileName);
  fs.mkdirSync(path.dirname(file),{recursive:true});const bytes=Buffer.from(html,"utf8");fs.writeFileSync(file,bytes);
  const classification=classifyGuidanceDirectionFromHtml(html);
  return {cik,filed,accessionNumber,direction:classification.direction??"UNCLASSIFIED",classificationStatus:classification.status,eligibleForBreadth:classification.eligibleForBreadth===true,sourceRole,sourceSha256:sha256(bytes),sourceHost:"www.sec.gov"};
}
function fixture(){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r18-"));
  const rows=[
    addDocument(base,{cik:"0000000001",accessionNumber:"0000000001-26-000001",html:"<html><body>Company raised its full-year guidance. SECRET_RAW_UP</body></html>"}),
    addDocument(base,{cik:"0000000002",accessionNumber:"0000000002-26-000002",html:"<html><body>Management reaffirmed its full-year outlook. SECRET_RAW_FLAT</body></html>",sourceRole:"EXHIBIT"}),
    addDocument(base,{cik:"0000000003",accessionNumber:"0000000003-26-000003",html:"<html><body>Company lowered revenue guidance. SECRET_RAW_DOWN</body></html>"}),
    addDocument(base,{cik:"0000000004",accessionNumber:"0000000004-26-000004",html:"<html><body>Company raised revenue guidance and lowered margin guidance. SECRET_RAW_MIXED</body></html>"}),
    addDocument(base,{cik:"0000000005",accessionNumber:"0000000005-26-000005",html:"<html><body>Our full-year guidance reflects current assumptions. SECRET_RAW_ANCHOR</body></html>"}),
    addDocument(base,{cik:"0000000006",accessionNumber:"0000000006-26-000006",html:"<html><body>Quarterly results were filed today. SECRET_RAW_NONE</body></html>"}),
  ];
  const completed=Object.fromEntries(rows.map(row=>[row.accessionNumber,row]));
  writeJson(path.join(base,"manual-input","e1-r5","sec-guidance-r17","checkpoint.json"),{version:"E1-R5-R17-SEC-GUIDANCE-R1",asOf:"2026-10-12",lookbackDays:185,researchOnly:true,completed});
  writeJson(path.join(base,"manual-input","e1-r5","reports","e1-r5-r17-sec-guidance-last.json"),{status:"COMPLETE",candidateIssuers:rows.length,completedIssuers:rows.length,remainingIssuers:0});
  return {base,rows};
}

test("R18 audits only local R17 documents, reproduces classifications, and keeps raw text out of reports",()=>{
  const {base}=fixture();
  const result=auditEarningsR5R18Guidance({base,samplePerBucket:2});
  assert.equal(result.report.status,"COMPLETE");
  assert.equal(result.report.networkCalls,0);assert.equal(result.report.dbWrites,0);assert.equal(result.report.productionActivation,false);assert.equal(result.report.rawTextPublication,false);
  assert.equal(result.report.checkpointEntries,6);assert.equal(result.report.hashMatched,6);assert.equal(result.report.missingDocuments,0);assert.equal(result.report.hashMismatch,0);
  assert.equal(result.report.reclassificationMatched,6);assert.equal(result.report.reclassificationMismatch,0);
  assert.equal(result.report.directionCounts.UP,1);assert.equal(result.report.directionCounts.FLAT,1);assert.equal(result.report.directionCounts.DOWN,1);assert.equal(result.report.directionCounts.MIXED,1);assert.equal(result.report.directionCounts.UNCLASSIFIED,2);
  assert.equal(result.report.unclassifiedAnchorPresent,1);assert.equal(result.report.unclassifiedNoAnchor,1);assert.equal(result.report.semanticValidation,"REVIEW_REQUIRED");
  const combined=[result.jsonReport,result.textReport,result.reviewManifest].map(file=>fs.readFileSync(file,"utf8")).join("\n");
  assert.doesNotMatch(combined,/SECRET_RAW_/);assert.match(combined,/UNCLASSIFIED_ANCHOR_PRESENT/);assert.match(combined,/UNCLASSIFIED_NO_ANCHOR/);
});

test("R18 fails closed when the checkpoint hash no longer matches the stored local document",()=>{
  const {base,rows}=fixture();
  const checkpointFile=path.join(base,"manual-input","e1-r5","sec-guidance-r17","checkpoint.json");const checkpoint=JSON.parse(fs.readFileSync(checkpointFile,"utf8"));
  checkpoint.completed[rows[0].accessionNumber].sourceSha256="0".repeat(64);writeJson(checkpointFile,checkpoint);
  const result=auditEarningsR5R18Guidance({base,samplePerBucket:1});
  assert.equal(result.report.status,"FAILED");assert.equal(result.report.hashMismatch,1);assert.equal(result.report.errorCode,"R18_STRUCTURAL_AUDIT_FAILED");assert.equal(result.report.networkCalls,0);
});
