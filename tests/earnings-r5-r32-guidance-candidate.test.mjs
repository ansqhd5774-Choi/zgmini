import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {classifyR32GuidanceCandidateFromText,E1_R5_R32_GUIDANCE_CANDIDATE_POLICY} from "../lib/market-score/earnings-e1-r5-guidance-r32-candidate.mjs";
import {auditEarningsR5R32GuidanceCandidate} from "../scripts/pc-writer/earnings-r5-r32-guidance-candidate-audit.mjs";

const direction=text=>classifyR32GuidanceCandidateFromText(text).direction??"UNCLASSIFIED";
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
function writeEntry(base,{cik,accession,direction:oldDirection,html}){const bytes=Buffer.from(html,"utf8"),dir=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents",cik,accession.replaceAll("-",""));fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"doc.htm"),bytes);return {cik,accessionNumber:accession,filed:"2026-10-01",direction:oldDirection,classificationStatus:oldDirection==="UNCLASSIFIED"?"UNCLASSIFIED":"CLASSIFIED",eligibleForBreadth:["UP","FLAT","DOWN"].includes(oldDirection),sourceRole:"EXHIBIT",sourceSha256:sha256(bytes),sourceHost:"www.sec.gov"};}
function setup(entries){const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r32-")),completed={};for(const entry of entries){const item=writeEntry(base,entry);completed[item.accessionNumber]=item;}const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,"checkpoint.json"),JSON.stringify({version:"E1-R5-R17-SEC-GUIDANCE-R1",asOf:"2026-10-12",lookbackDays:185,researchOnly:true,completed},null,2));const reports=path.join(base,"manual-input","e1-r5","reports");fs.mkdirSync(reports,{recursive:true});fs.writeFileSync(path.join(reports,"e1-r5-r17-sec-guidance-last.json"),JSON.stringify({status:"COMPLETE",candidateIssuers:entries.length,completedIssuers:entries.length,remainingIssuers:0},null,2));return base;}

test("R32 recognizes footnoted prior/current guidance tables and prior-floor replacements",()=>{
  assert.equal(E1_R5_R32_GUIDANCE_CANDIDATE_POLICY.researchOnly,true);
  assert.equal(direction("Previous FY26 Guidance Current FY26 Guidance1,2,3 Average loans: Up ~11% Up ~12.5% Total revenue: (FY25 baseline: $23,099 million) Up ~ 11% Up ~13%."),"UP");
  assert.equal(direction("For full-year 2026, the Company is guiding adjusted EPS to be in the range of $3.25 to $4.25. This updated range replaces its prior expectation of at least $4.00."),"DOWN");
});

test("R32 recognizes substantive broad financial reaffirmations but not title-only or exception cases",()=>{
  assert.equal(direction("T-Mobile reaffirms its previously stated 2026 financial guidance and maintains its capital return program."),"FLAT");
  assert.equal(direction("AT&T reiterates the financial outlook and capital allocation plan provided in its second-quarter 2026 earnings release."),"FLAT");
  assert.equal(direction("The Company issued a press release that discusses its business strategy, reaffirms its full-year 2026 guidance, and provides long-term targets."),"FLAT");
  assert.equal(direction("The Company issued a press release announcing the CFO transition and reaffirming the Company's previously issued financial guidance for the third quarter and full year 2026."),"FLAT");
  assert.equal(direction("On September 24, 2026, Darden issued a news release entitled “Darden Reports Results and Reaffirms Fiscal 2027 Outlook,” a copy of which is furnished as Exhibit 99.1."),"UNCLASSIFIED");
  assert.equal(direction("Press Release dated August 6, 2026 - “Keurig Dr Pepper Reports Q2 Results and Reaffirms Guidance for 2026”."),"UNCLASSIFIED");
  assert.equal(direction("Workday is reiterating its fiscal 2027 third quarter and full-year financial guidance, with the exception of GAAP operating margin."),"UNCLASSIFIED");
  assert.equal(direction("Sempra is updating its full-year 2026 GAAP EPS guidance range to $5.02 to $5.55, affirming its 2026 adjusted EPS guidance range of $4.80 to $5.30."),"UNCLASSIFIED");
});

test("R32 preserves R31 core exclusions and prior classifications",()=>{
  assert.equal(direction("The Company now expects gross profit margin to be roughly flat (versus down previously)."),"UP");
  assert.equal(direction("Total sales of $92.0 billion (previously $92.0 to 94.0 billion)."),"DOWN");
  assert.equal(direction("The company provides fiscal 2027 outlook. Revenue is expected to grow 5% and EPS is expected to be $4.00."),"UNCLASSIFIED");
  assert.equal(direction("AMETEK Announces Record Second Quarter Results and Raises Full Year Guidance."),"UNCLASSIFIED");
  assert.equal(direction("Full-year capital spending guidance reduced by $25 million. Free cash flow is expected to be $2 billion."),"UNCLASSIFIED");
  assert.equal(direction("Textron reiterated its expectation for full-year 2026 GAAP earnings per share from continuing operations to be in the range of $5.39 to $5.59."),"FLAT");
});

test("R32 local audit hash-verifies documents and exposes R31-to-R32 changes",()=>{
  const base=setup([
    {cik:"0000000001",accession:"0000000001-26-000001",direction:"FLAT",html:"<p>T-Mobile reaffirms its previously stated 2026 financial guidance.</p>"},
    {cik:"0000000002",accession:"0000000002-26-000002",direction:"UP",html:"<p>Previous FY26 Guidance Current FY26 Guidance1,2,3 Total revenue: Up ~ 11% Up ~13%.</p>"},
    {cik:"0000000003",accession:"0000000003-26-000003",direction:"UP",html:"<p>For full-year 2026, the Company is guiding adjusted EPS to be in the range of $3.25 to $4.25. This updated range replaces its prior expectation of at least $4.00.</p>"},
    {cik:"0000000004",accession:"0000000004-26-000004",direction:"UP",html:"<p>AMETEK Announces Record Second Quarter Results and Raises Full Year Guidance.</p>"},
  ]);
  const result=auditEarningsR5R32GuidanceCandidate({base,maxUnclassified:20});
  assert.equal(result.report.status,"COMPLETE");assert.equal(result.report.hashMatched,4);assert.equal(result.report.missingDocuments,0);assert.equal(result.report.hashMismatch,0);assert.ok(result.report.changedEntries>=3);assert.ok(result.report.directionalUnclassified>=1);assert.equal(result.report.networkCalls,0);assert.equal(result.report.dbWrites,0);assert.equal(result.report.productionActivation,false);assert.equal(result.report.formulaChanged,false);assert.equal(result.report.scoringGateChanged,false);
  const text=fs.readFileSync(result.textFile,"utf8");assert.match(text,/R31_TO_R32_CHANGED_ENTRIES:/);assert.match(text,/R17_DIRECTIONAL_R32_UNCLASSIFIED:/);assert.match(text,/SEMANTIC_VALIDATION: REVIEW_REQUIRED/);
  const packet=fs.readFileSync(result.packetFile,"utf8");assert.match(packet,/R31_TO_R32_CHANGED/);assert.match(packet,/R17_DIRECTIONAL_R32_UNCLASSIFIED/);
});

test("R32 audit fails closed on local document hash mismatch",()=>{
  const base=setup([{cik:"0000000005",accession:"0000000005-26-000005",direction:"UP",html:"<p>The company raised revenue guidance.</p>"}]);const file=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents","0000000005","000000000526000005","doc.htm");fs.writeFileSync(file,"tampered","utf8");const result=auditEarningsR5R32GuidanceCandidate({base,maxUnclassified:20});assert.equal(result.report.status,"FAILED");assert.equal(result.report.hashMismatch,1);assert.equal(result.report.hashMatched,0);
});
