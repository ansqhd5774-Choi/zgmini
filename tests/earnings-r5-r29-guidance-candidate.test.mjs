import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {classifyR29GuidanceCandidateFromText,E1_R5_R29_GUIDANCE_CANDIDATE_POLICY} from "../lib/market-score/earnings-e1-r5-guidance-r29-candidate.mjs";
import {auditEarningsR5R29GuidanceCandidate} from "../scripts/pc-writer/earnings-r5-r29-guidance-candidate-audit.mjs";

const direction=text=>classifyR29GuidanceCandidateFromText(text).direction??"UNCLASSIFIED";
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
function writeEntry(base,{cik,accession,direction:oldDirection,html}){const bytes=Buffer.from(html,"utf8"),dir=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents",cik,accession.replaceAll("-",""));fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"doc.htm"),bytes);return {cik,accessionNumber:accession,filed:"2026-10-01",direction:oldDirection,classificationStatus:oldDirection==="UNCLASSIFIED"?"UNCLASSIFIED":"CLASSIFIED",eligibleForBreadth:["UP","FLAT","DOWN"].includes(oldDirection),sourceRole:"EXHIBIT",sourceSha256:sha256(bytes),sourceHost:"www.sec.gov"};}
function setup(entries){const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r29-")),completed={};for(const entry of entries){const item=writeEntry(base,entry);completed[item.accessionNumber]=item;}const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,"checkpoint.json"),JSON.stringify({version:"E1-R5-R17-SEC-GUIDANCE-R1",asOf:"2026-10-12",lookbackDays:185,researchOnly:true,completed},null,2));const reports=path.join(base,"manual-input","e1-r5","reports");fs.mkdirSync(reports,{recursive:true});fs.writeFileSync(path.join(reports,"e1-r5-r17-sec-guidance-last.json"),JSON.stringify({status:"COMPLETE",candidateIssuers:entries.length,completedIssuers:entries.length,remainingIssuers:0},null,2));return base;}

test("R29 binds explicit company-wide revisions to nearby core financial guidance",()=>{
  assert.equal(E1_R5_R29_GUIDANCE_CANDIDATE_POLICY.researchOnly,true);
  assert.equal(direction("The company is raising its full year guidance. 2026 Outlook: Revenue is expected to be $20 billion and adjusted EPS is expected to be $5.10 to $5.30."),"UP");
  assert.equal(direction("The company lowered its fiscal 2026 outlook. Fiscal 2026 Guidance: net sales are expected to be $9 billion and adjusted EPS is expected to be $3.20."),"DOWN");
  assert.equal(direction("The company reaffirms its fiscal 2026 guidance. Total sales growth is expected to be 3% and adjusted operating margin is expected to be 12.5%."),"FLAT");
  assert.equal(direction("The company's fiscal 2027 outlook previously disclosed remains unchanged. The company expects revenue growth of 5% and EBITDA growth of 8%."),"FLAT");
});

test("R29 recognizes period-inserted core-metric revisions",()=>{
  assert.equal(direction("Raised and tightened guidance for 2026 earnings per diluted share to $4.22 to $4.30."),"UP");
  assert.equal(direction("The company lowered guidance for fiscal 2026 adjusted EPS to $3.10 to $3.30."),"DOWN");
  assert.equal(direction("The company reiterated guidance for full-year 2026 free cash flow of $700 million to $800 million."),"FLAT");
});

test("R29 keeps non-core and new-forecast-only cases unclassified and preserves R28 false-down fixes",()=>{
  assert.equal(direction("Raising 2026 production guidance by 90 Bcfe and lowering full-year capital expenditure guidance by $25 million."),"UNCLASSIFIED");
  assert.equal(direction("2026 outlook for capital expenditures reduced to $1.2 billion."),"UNCLASSIFIED");
  assert.equal(direction("The company provides fiscal 2027 outlook. Revenue is expected to grow 5% and EPS is expected to be $4.00."),"UNCLASSIFIED");
  assert.equal(direction("AMETEK announces results and raises full year guidance."),"UNCLASSIFIED");
  assert.equal(direction("The company now expects gross profit margin to be at the lower end of its full-year 78% to 79% gross margin guidance."),"UNCLASSIFIED");
  assert.equal(direction("Organic sales growth / (decrease) and adjusted EPS outlook for fiscal year 2027."),"UNCLASSIFIED");
});

test("R29 local audit hash-verifies documents, exposes changes, and retains remaining-risk packet",()=>{
  const base=setup([
    {cik:"0000000001",accession:"0000000001-26-000001",direction:"UP",html:"<p>The company is raising its full year guidance. 2026 Outlook: Revenue is expected to be $20 billion and adjusted EPS is expected to be $5.10 to $5.30.</p>"},
    {cik:"0000000002",accession:"0000000002-26-000002",direction:"FLAT",html:"<p>The company reaffirms its fiscal 2026 guidance. Total sales growth is expected to be 3% and adjusted operating margin is expected to be 12.5%.</p>"},
    {cik:"0000000003",accession:"0000000003-26-000003",direction:"DOWN",html:"<p>Raising 2026 production guidance by 90 Bcfe and lowering full-year capital expenditure guidance by $25 million.</p>"},
    {cik:"0000000004",accession:"0000000004-26-000004",direction:"UP",html:"<p>AMETEK Announces Results and Raises Full Year Guidance.</p>"},
  ]);
  const result=auditEarningsR5R29GuidanceCandidate({base,maxUnclassified:20});
  assert.equal(result.report.status,"COMPLETE");assert.equal(result.report.hashMatched,4);assert.equal(result.report.missingDocuments,0);assert.equal(result.report.hashMismatch,0);
  assert.ok(result.report.changedEntries>=2);assert.ok(result.report.directionalUnclassified>=2);
  assert.equal(result.report.networkCalls,0);assert.equal(result.report.dbWrites,0);assert.equal(result.report.productionActivation,false);assert.equal(result.report.formulaChanged,false);assert.equal(result.report.scoringGateChanged,false);
  const text=fs.readFileSync(result.textFile,"utf8");assert.match(text,/R28_TO_R29_CHANGED_ENTRIES:/);assert.match(text,/R17_DIRECTIONAL_R29_UNCLASSIFIED:/);assert.match(text,/SEMANTIC_VALIDATION: REVIEW_REQUIRED/);
  const packet=fs.readFileSync(result.packetFile,"utf8");assert.match(packet,/R28_TO_R29_CHANGED/);assert.match(packet,/R17_DIRECTIONAL_R29_UNCLASSIFIED/);assert.match(packet,/AMETEK Announces Results and Raises Full Year Guidance/i);
});

test("R29 audit fails closed on local document hash mismatch",()=>{
  const base=setup([{cik:"0000000005",accession:"0000000005-26-000005",direction:"UP",html:"<p>The company is raising full year guidance. Outlook: revenue is expected to be $10 billion.</p>"}]);const file=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents","0000000005","000000000526000005","doc.htm");fs.writeFileSync(file,"tampered","utf8");const result=auditEarningsR5R29GuidanceCandidate({base,maxUnclassified:20});assert.equal(result.report.status,"FAILED");assert.equal(result.report.hashMismatch,1);assert.equal(result.report.hashMatched,0);
});
