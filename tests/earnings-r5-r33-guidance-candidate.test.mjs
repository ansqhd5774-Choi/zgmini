import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {classifyR32GuidanceCandidateFromText} from "../lib/market-score/earnings-e1-r5-guidance-r32-candidate.mjs";
import {classifyR33GuidanceCandidateFromText,E1_R5_R33_GUIDANCE_CANDIDATE_POLICY} from "../lib/market-score/earnings-e1-r5-guidance-r33-candidate.mjs";
import {auditEarningsR5R33GuidanceCandidate} from "../scripts/pc-writer/earnings-r5-r33-guidance-candidate-audit.mjs";

const direction=(fn,text)=>fn(text).direction??"UNCLASSIFIED";
const r32=text=>direction(classifyR32GuidanceCandidateFromText,text);
const r33=text=>direction(classifyR33GuidanceCandidateFromText,text);
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
function writeEntry(base,{cik,accession,direction:oldDirection,html}){const bytes=Buffer.from(html,"utf8"),dir=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents",cik,accession.replaceAll("-",""));fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"doc.htm"),bytes);return {cik,accessionNumber:accession,filed:"2026-10-01",direction:oldDirection,classificationStatus:oldDirection==="UNCLASSIFIED"?"UNCLASSIFIED":"CLASSIFIED",eligibleForBreadth:["UP","FLAT","DOWN"].includes(oldDirection),sourceRole:"EXHIBIT",sourceSha256:sha256(bytes),sourceHost:"www.sec.gov"};}
function setup(entries){const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r33-")),completed={};for(const entry of entries){const item=writeEntry(base,entry);completed[item.accessionNumber]=item;}const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,"checkpoint.json"),JSON.stringify({version:"E1-R5-R17-SEC-GUIDANCE-R1",asOf:"2026-10-12",lookbackDays:185,researchOnly:true,completed},null,2));const reports=path.join(base,"manual-input","e1-r5","reports");fs.mkdirSync(reports,{recursive:true});fs.writeFileSync(path.join(reports,"e1-r5-r17-sec-guidance-last.json"),JSON.stringify({status:"COMPLETE",candidateIssuers:entries.length,completedIssuers:entries.length,remainingIssuers:0},null,2));return base;}

test("R33 removes R32 broad-reaffirmation semantic false positives",()=>{
  assert.equal(E1_R5_R33_GUIDANCE_CANDIDATE_POLICY.researchOnly,true);
  const tyson="The company updated its fiscal 2026 segment operating income outlook for Beef, Chicken and Pork; Pork, $200 million to $250 million, while maintaining previous guidance for Prepared Foods and International segments.";
  assert.equal(r32(tyson),"FLAT");assert.equal(r33(tyson),"UNCLASSIFIED");
  const boilerplate="Forward-looking statements can be identified by words such as believe, expect, maintain, continue, progress, target, outlook, or similar expressions, or when we discuss our guidance, priorities, strategies, goals and projections.";
  assert.equal(r32(boilerplate),"FLAT");assert.equal(r33(boilerplate),"UNCLASSIFIED");
  const bookings="With these positive trends, we are reiterating our Fiscal 2027 Net Bookings outlook of $8.0 to $8.2 billion.";
  assert.equal(r32(bookings),"FLAT");assert.equal(r33(bookings),"UNCLASSIFIED");
});

test("R33 retains substantive company-wide financial reaffirmations",()=>{
  assert.equal(r33("AT&T reiterates the financial outlook and capital allocation plan provided with its second-quarter 2026 earnings release."),"FLAT");
  assert.equal(r33("The Company reaffirms its full-year 2026 guidance and provides long-term financial targets."),"FLAT");
  assert.equal(r33("T-Mobile reaffirms its previously stated 2026 financial guidance and maintains its capital return program."),"FLAT");
  assert.equal(r33("The Company is reiterating its full-year 2026 financial outlook provided in its most recent earnings announcement."),"FLAT");
});

test("R33 preserves R32 explicit core revisions",()=>{
  assert.equal(r33("For full-year 2026, the Company is guiding adjusted EPS to be in the range of $3.25 to $4.25. This updated range replaces its prior expectation of at least $4.00."),"DOWN");
  assert.equal(r33("Previous FY26 Guidance Current FY26 Guidance1,2,3 Total revenue: (FY25 baseline: $23,099 million) Up ~ 11% Up ~13%."),"UP");
});

test("R33 local audit hash-verifies documents and exposes R32-to-R33 changes",()=>{
  const base=setup([
    {cik:"0000000001",accession:"0000000001-26-000001",direction:"FLAT",html:"<p>The company updated its outlook for Beef and Chicken; Pork, $200 million to $250 million, while maintaining previous guidance for Prepared Foods and International segments.</p>"},
    {cik:"0000000002",accession:"0000000002-26-000002",direction:"UNCLASSIFIED",html:"<p>We are reiterating our Fiscal 2027 Net Bookings outlook of $8.0 to $8.2 billion.</p>"},
    {cik:"0000000003",accession:"0000000003-26-000003",direction:"FLAT",html:"<p>AT&T reiterates the financial outlook provided with its second-quarter 2026 earnings release.</p>"},
    {cik:"0000000004",accession:"0000000004-26-000004",direction:"UP",html:"<p>Previous FY26 Guidance Current FY26 Guidance1,2,3 Total revenue: (FY25 baseline: $23,099 million) Up ~ 11% Up ~13%.</p>"},
  ]);
  const result=auditEarningsR5R33GuidanceCandidate({base,maxUnclassified:20});
  assert.equal(result.report.status,"COMPLETE");assert.equal(result.report.hashMatched,4);assert.equal(result.report.missingDocuments,0);assert.equal(result.report.hashMismatch,0);assert.equal(result.report.changedEntries,2);assert.equal(result.report.networkCalls,0);assert.equal(result.report.dbWrites,0);assert.equal(result.report.productionActivation,false);assert.equal(result.report.formulaChanged,false);assert.equal(result.report.scoringGateChanged,false);
  const text=fs.readFileSync(result.textFile,"utf8");assert.match(text,/R32_TO_R33_CHANGED_ENTRIES: 2/);assert.match(text,/SEMANTIC_VALIDATION: REVIEW_REQUIRED/);
  const packet=fs.readFileSync(result.packetFile,"utf8");assert.match(packet,/R32_TO_R33_CHANGED/);assert.match(packet,/R17_DIRECTIONAL_R33_UNCLASSIFIED/);
});

test("R33 audit fails closed on local document hash mismatch",()=>{
  const base=setup([{cik:"0000000005",accession:"0000000005-26-000005",direction:"FLAT",html:"<p>The Company reaffirms its full-year 2026 guidance.</p>"}]);const file=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents","0000000005","000000000526000005","doc.htm");fs.writeFileSync(file,"tampered","utf8");const result=auditEarningsR5R33GuidanceCandidate({base,maxUnclassified:20});assert.equal(result.report.status,"FAILED");assert.equal(result.report.hashMismatch,1);assert.equal(result.report.hashMatched,0);
});
