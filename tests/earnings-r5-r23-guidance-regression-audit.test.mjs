import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {auditEarningsR5R23GuidanceRegression} from "../scripts/pc-writer/earnings-r5-r23-guidance-regression-audit.mjs";

const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
function writeEntry(base,{cik,accession,direction,html}){
  const bytes=Buffer.from(html,"utf8");const dir=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents",cik,accession.replaceAll("-",""));fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"doc.htm"),bytes);
  return {cik,accessionNumber:accession,filed:"2026-10-01",direction,classificationStatus:direction==="UNCLASSIFIED"?"UNCLASSIFIED":"CLASSIFIED",eligibleForBreadth:["UP","FLAT","DOWN"].includes(direction),sourceRole:"EXHIBIT",sourceSha256:sha256(bytes),sourceHost:"www.sec.gov"};
}
function setup(entries){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r23-"));const completed={};for(const entry of entries){const item=writeEntry(base,entry);completed[item.accessionNumber]=item;}
  const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,"checkpoint.json"),JSON.stringify({version:"E1-R5-R17-SEC-GUIDANCE-R1",asOf:"2026-10-12",lookbackDays:185,researchOnly:true,completed},null,2));
  const reports=path.join(base,"manual-input","e1-r5","reports");fs.mkdirSync(reports,{recursive:true});fs.writeFileSync(path.join(reports,"e1-r5-r17-sec-guidance-last.json"),JSON.stringify({status:"COMPLETE",candidateIssuers:entries.length,completedIssuers:entries.length,remainingIssuers:0},null,2));return base;
}

test("R23 exposes both R21 and R22 evidence for changed entries and flags possible regressions",()=>{
  const base=setup([
    {cik:"0000000001",accession:"0000000001-26-000001",direction:"MIXED",html:"<p>The company raised full-year revenue guidance by $500 million while reaffirming adjusted diluted EPS guidance. The company does not provide specific guidance for non-GAAP reconciling items.</p>"},
    {cik:"0000000002",accession:"0000000002-26-000002",direction:"UNCLASSIFIED",html:"<p>Workday is reiterating its full-year financial guidance provided on its earnings call, with the exception of GAAP operating margin.</p>"},
    {cik:"0000000003",accession:"0000000003-26-000003",direction:"UP",html:"<p>Air Products is raising its full-year fiscal 2026 adjusted EPS guidance to $13.39 to $13.49.</p>"},
  ]);
  const result=auditEarningsR5R23GuidanceRegression({base});
  assert.equal(result.report.status,"COMPLETE");assert.equal(result.report.hashMatched,3);assert.equal(result.report.missingDocuments,0);assert.equal(result.report.hashMismatch,0);
  assert.ok(result.report.changedEntries>=1);assert.ok(result.report.potentialRegressions>=1);
  assert.equal(result.report.networkCalls,0);assert.equal(result.report.dbWrites,0);assert.equal(result.report.productionActivation,false);assert.equal(result.report.formulaChanged,false);assert.equal(result.report.scoringGateChanged,false);
  const text=fs.readFileSync(result.textFile,"utf8");assert.match(text,/SEMANTIC_VALIDATION: REVIEW_REQUIRED/);assert.doesNotMatch(text,/raised full-year revenue guidance/);
  const packet=fs.readFileSync(result.packetFile,"utf8");assert.match(packet,/R21_EVIDENCE_/);assert.match(packet,/R22_EVIDENCE/);assert.match(packet,/POTENTIAL_REGRESSION/);assert.match(packet,/LOCAL_EXCERPTS_INCLUDED: YES/);
});

test("R23 fails closed when a stored SEC document hash no longer matches",()=>{
  const base=setup([{cik:"0000000004",accession:"0000000004-26-000004",direction:"UP",html:"<p>Raises full-year EPS guidance.</p>"}]);
  const file=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents","0000000004","000000000426000004","doc.htm");fs.writeFileSync(file,"tampered","utf8");
  const result=auditEarningsR5R23GuidanceRegression({base});assert.equal(result.report.status,"FAILED");assert.equal(result.report.hashMismatch,1);assert.equal(result.report.hashMatched,0);
});
