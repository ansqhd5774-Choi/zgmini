import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {classifyR31GuidanceCandidateFromText,E1_R5_R31_GUIDANCE_CANDIDATE_POLICY} from "../lib/market-score/earnings-e1-r5-guidance-r31-candidate.mjs";
import {auditEarningsR5R31GuidanceCandidate} from "../scripts/pc-writer/earnings-r5-r31-guidance-candidate-audit.mjs";

const direction=text=>classifyR31GuidanceCandidateFromText(text).direction??"UNCLASSIFIED";
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
function writeEntry(base,{cik,accession,direction:oldDirection,html}){const bytes=Buffer.from(html,"utf8"),dir=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents",cik,accession.replaceAll("-",""));fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"doc.htm"),bytes);return {cik,accessionNumber:accession,filed:"2026-10-01",direction:oldDirection,classificationStatus:oldDirection==="UNCLASSIFIED"?"UNCLASSIFIED":"CLASSIFIED",eligibleForBreadth:["UP","FLAT","DOWN"].includes(oldDirection),sourceRole:"EXHIBIT",sourceSha256:sha256(bytes),sourceHost:"www.sec.gov"};}
function setup(entries){const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r31-")),completed={};for(const entry of entries){const item=writeEntry(base,entry);completed[item.accessionNumber]=item;}const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,"checkpoint.json"),JSON.stringify({version:"E1-R5-R17-SEC-GUIDANCE-R1",asOf:"2026-10-12",lookbackDays:185,researchOnly:true,completed},null,2));const reports=path.join(base,"manual-input","e1-r5","reports");fs.mkdirSync(reports,{recursive:true});fs.writeFileSync(path.join(reports,"e1-r5-r17-sec-guidance-last.json"),JSON.stringify({status:"COMPLETE",candidateIssuers:entries.length,completedIssuers:entries.length,remainingIssuers:0},null,2));return base;}

test("R31 recognizes only explicit current-vs-previous core revisions missed by R30",()=>{
  assert.equal(E1_R5_R31_GUIDANCE_CANDIDATE_POLICY.researchOnly,true);
  assert.equal(direction("The Company now expects gross profit margin to be roughly flat (versus down previously)."),"UP");
  assert.equal(direction("Lowe's Business Outlook. Total sales of $92.0 billion (previously $92.0 to 94.0 billion). Operating income as a percentage of sales (operating margin) of 11.2% (previously 11.2% to 11.4%)."),"DOWN");
  assert.equal(direction("Previous FY26 Guidance Current FY26 Guidance Total revenue: (FY25 baseline: $23,099 million) Up ~ 11% Up ~13% Noninterest expense: Up ~7% Up ~8.5%."),"UP");
});

test("R31 preserves conservative exclusions and existing R30 classifications",()=>{
  assert.equal(direction("The company provides fiscal 2027 outlook. Revenue is expected to grow 5% and EPS is expected to be $4.00."),"UNCLASSIFIED");
  assert.equal(direction("AMETEK Announces Record Second Quarter Results and Raises Full Year Guidance."),"UNCLASSIFIED");
  assert.equal(direction("T-Mobile reaffirms its previously stated 2026 financial guidance and maintains its capital return program."),"UNCLASSIFIED");
  assert.equal(direction("Full-year capital spending guidance reduced by $25 million. Free cash flow is expected to be $2 billion."),"UNCLASSIFIED");
  assert.equal(direction("Textron reiterated its expectation for full-year 2026 GAAP earnings per share from continuing operations to be in the range of $5.39 to $5.59."),"FLAT");
  assert.equal(direction("Full year 2026 outlook operational improvement of more than $150 million in adjusted net income compared to June guidance."),"UP");
  assert.equal(direction("The company lowered its full-year adjusted EPS guidance to $3.10 to $3.30."),"DOWN");
});

test("R31 local audit hash-verifies documents, exposes R30-to-R31 changes, and retains risks",()=>{
  const base=setup([
    {cik:"0000000001",accession:"0000000001-26-000001",direction:"FLAT",html:"<p>The Company now expects gross profit margin to be roughly flat (versus down previously).</p>"},
    {cik:"0000000002",accession:"0000000002-26-000002",direction:"UP",html:"<p>Total sales of $92.0 billion (previously $92.0 to 94.0 billion). Operating margin of 11.2% (previously 11.2% to 11.4%).</p>"},
    {cik:"0000000003",accession:"0000000003-26-000003",direction:"UP",html:"<p>Previous FY26 Guidance Current FY26 Guidance Total revenue: (FY25 baseline: $23,099 million) Up ~ 11% Up ~13%.</p>"},
    {cik:"0000000004",accession:"0000000004-26-000004",direction:"FLAT",html:"<p>T-Mobile reaffirms its previously stated 2026 financial guidance.</p>"},
  ]);
  const result=auditEarningsR5R31GuidanceCandidate({base,maxUnclassified:20});
  assert.equal(result.report.status,"COMPLETE");assert.equal(result.report.hashMatched,4);assert.equal(result.report.missingDocuments,0);assert.equal(result.report.hashMismatch,0);assert.ok(result.report.changedEntries>=3);assert.ok(result.report.directionalUnclassified>=1);assert.equal(result.report.networkCalls,0);assert.equal(result.report.dbWrites,0);assert.equal(result.report.productionActivation,false);assert.equal(result.report.formulaChanged,false);assert.equal(result.report.scoringGateChanged,false);
  const text=fs.readFileSync(result.textFile,"utf8");assert.match(text,/R30_TO_R31_CHANGED_ENTRIES:/);assert.match(text,/R17_DIRECTIONAL_R31_UNCLASSIFIED:/);assert.match(text,/SEMANTIC_VALIDATION: REVIEW_REQUIRED/);
  const packet=fs.readFileSync(result.packetFile,"utf8");assert.match(packet,/R30_TO_R31_CHANGED/);assert.match(packet,/R17_DIRECTIONAL_R31_UNCLASSIFIED/);
});

test("R31 audit fails closed on local document hash mismatch",()=>{
  const base=setup([{cik:"0000000005",accession:"0000000005-26-000005",direction:"UP",html:"<p>The company raised revenue guidance.</p>"}]);const file=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents","0000000005","000000000526000005","doc.htm");fs.writeFileSync(file,"tampered","utf8");const result=auditEarningsR5R31GuidanceCandidate({base,maxUnclassified:20});assert.equal(result.report.status,"FAILED");assert.equal(result.report.hashMismatch,1);assert.equal(result.report.hashMatched,0);
});
