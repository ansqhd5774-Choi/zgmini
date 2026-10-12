import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {classifyR30GuidanceCandidateFromText,E1_R5_R30_GUIDANCE_CANDIDATE_POLICY} from "../lib/market-score/earnings-e1-r5-guidance-r30-candidate.mjs";
import {auditEarningsR5R30GuidanceCandidate} from "../scripts/pc-writer/earnings-r5-r30-guidance-candidate-audit.mjs";

const direction=text=>classifyR30GuidanceCandidateFromText(text).direction??"UNCLASSIFIED";
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
function writeEntry(base,{cik,accession,direction:oldDirection,html}){const bytes=Buffer.from(html,"utf8"),dir=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents",cik,accession.replaceAll("-",""));fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"doc.htm"),bytes);return {cik,accessionNumber:accession,filed:"2026-10-01",direction:oldDirection,classificationStatus:oldDirection==="UNCLASSIFIED"?"UNCLASSIFIED":"CLASSIFIED",eligibleForBreadth:["UP","FLAT","DOWN"].includes(oldDirection),sourceRole:"EXHIBIT",sourceSha256:sha256(bytes),sourceHost:"www.sec.gov"};}
function setup(entries){const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r30-")),completed={};for(const entry of entries){const item=writeEntry(base,entry);completed[item.accessionNumber]=item;}const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,"checkpoint.json"),JSON.stringify({version:"E1-R5-R17-SEC-GUIDANCE-R1",asOf:"2026-10-12",lookbackDays:185,researchOnly:true,completed},null,2));const reports=path.join(base,"manual-input","e1-r5","reports");fs.mkdirSync(reports,{recursive:true});fs.writeFileSync(path.join(reports,"e1-r5-r17-sec-guidance-last.json"),JSON.stringify({status:"COMPLETE",candidateIssuers:entries.length,completedIssuers:entries.length,remainingIssuers:0},null,2));return base;}

test("R30 suppresses R29 nearby-binding semantic regressions without weakening explicit core revisions",()=>{
  assert.equal(E1_R5_R30_GUIDANCE_CANDIDATE_POLICY.researchOnly,true);
  assert.equal(direction("The Company maintained its sales and GAAP earnings per share guidance and updated its gross profit margin and Base Business earnings per share guidance for full year 2026."),"UNCLASSIFIED");
  assert.equal(direction("Full-year capital spending guidance reduced by $25 million. Free cash flow is expected to be $2 billion."),"UNCLASSIFIED");
  assert.equal(direction("Xcel Energy reaffirms its 2026 ongoing earnings per share guidance. The decrease from prior guidance is primarily due to nuclear life extensions, which is offset by lower revenue."),"FLAT");
  assert.equal(direction("Comparable hotel EBITDA margins will increase 40 basis points compared to 2025 for the low and high end of the forecast comparable hotel RevPAR range."),"UNCLASSIFIED");
  assert.equal(direction("Workday is reiterating its full-year financial guidance, with the exception of GAAP operating margin."),"UNCLASSIFIED");
  assert.equal(direction("GAAP GPU was in line with expectations due to increasing industry retail prices following recent FTC guidance requiring automotive dealers to include fees. Revenue is expected to grow 5%."),"UNCLASSIFIED");
  assert.equal(direction("We are raising the lower-end of our expense outlook to incorporate additional costs. Revenue is expected to grow 5%."),"UNCLASSIFIED");
  assert.equal(direction("Supply Impact Decreases and Growth Initiatives Deliver Results Current Performance, 2026 Outlook. Operating margin is expected to be 20%."),"UNCLASSIFIED");
  assert.equal(direction("The company raised its full-year revenue guidance to $18 billion."),"UP");
  assert.equal(direction("The company lowered its full-year adjusted EPS guidance to $3.10 to $3.30."),"DOWN");
  assert.equal(direction("The company reaffirms its full-year revenue guidance at $20 billion."),"FLAT");
});

test("R30 recognizes explicit core expectation reiteration and full-year outlook improvement versus prior guidance",()=>{
  assert.equal(direction("Textron reiterated its expectation for full-year 2026 GAAP earnings per share from continuing operations to be in the range of $5.39 to $5.59."),"FLAT");
  assert.equal(direction("Full year 2026 outlook operational improvement of more than $150 million in adjusted net income compared to June guidance."),"UP");
  assert.equal(direction("The company provides fiscal 2027 outlook. Revenue is expected to grow 5% and EPS is expected to be $4.00."),"UNCLASSIFIED");
});

test("R30 local audit hash-verifies documents, exposes R29-to-R30 changes, and retains remaining-risk contexts",()=>{
  const base=setup([
    {cik:"0000000001",accession:"0000000001-26-000001",direction:"FLAT",html:"<p>The Company maintained its sales and GAAP earnings per share guidance and updated its gross profit margin and Base Business earnings per share guidance for full year 2026.</p>"},
    {cik:"0000000002",accession:"0000000002-26-000002",direction:"DOWN",html:"<p>Full-year capital spending guidance reduced by $25 million. Free cash flow is expected to be $2 billion.</p>"},
    {cik:"0000000003",accession:"0000000003-26-000003",direction:"FLAT",html:"<p>Textron reiterated its expectation for full-year 2026 GAAP earnings per share from continuing operations to be in the range of $5.39 to $5.59.</p>"},
    {cik:"0000000004",accession:"0000000004-26-000004",direction:"UP",html:"<p>Full year 2026 outlook operational improvement of more than $150 million in adjusted net income compared to June guidance.</p>"},
    {cik:"0000000005",accession:"0000000005-26-000005",direction:"UP",html:"<p>AMETEK Announces Results and Raises Full Year Guidance.</p>"},
  ]);
  const result=auditEarningsR5R30GuidanceCandidate({base,maxUnclassified:20});
  assert.equal(result.report.status,"COMPLETE");assert.equal(result.report.hashMatched,5);assert.equal(result.report.missingDocuments,0);assert.equal(result.report.hashMismatch,0);
  assert.ok(result.report.changedEntries>=4);assert.ok(result.report.directionalUnclassified>=2);
  assert.equal(result.report.networkCalls,0);assert.equal(result.report.dbWrites,0);assert.equal(result.report.productionActivation,false);assert.equal(result.report.formulaChanged,false);assert.equal(result.report.scoringGateChanged,false);
  const text=fs.readFileSync(result.textFile,"utf8");assert.match(text,/R29_TO_R30_CHANGED_ENTRIES:/);assert.match(text,/R17_DIRECTIONAL_R30_UNCLASSIFIED:/);assert.match(text,/SEMANTIC_VALIDATION: REVIEW_REQUIRED/);
  const packet=fs.readFileSync(result.packetFile,"utf8");assert.match(packet,/R29_TO_R30_CHANGED/);assert.match(packet,/R17_DIRECTIONAL_R30_UNCLASSIFIED/);assert.match(packet,/AMETEK Announces Results and Raises Full Year Guidance/i);
});

test("R30 audit fails closed on local document hash mismatch",()=>{
  const base=setup([{cik:"0000000006",accession:"0000000006-26-000006",direction:"UP",html:"<p>The company raised revenue guidance.</p>"}]);const file=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents","0000000006","000000000626000006","doc.htm");fs.writeFileSync(file,"tampered","utf8");const result=auditEarningsR5R30GuidanceCandidate({base,maxUnclassified:20});assert.equal(result.report.status,"FAILED");assert.equal(result.report.hashMismatch,1);assert.equal(result.report.hashMatched,0);
});
