import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {classifyR24GuidanceCandidateFromText,E1_R5_R24_GUIDANCE_CANDIDATE_POLICY} from "../lib/market-score/earnings-e1-r5-guidance-r24-candidate.mjs";
import {compareEarningsR5R24GuidanceCandidate} from "../scripts/pc-writer/earnings-r5-r24-guidance-candidate-compare.mjs";

const direction=text=>classifyR24GuidanceCandidateFromText(text).direction??"UNCLASSIFIED";
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
function writeEntry(base,{cik,accession,direction:oldDirection,html}){const bytes=Buffer.from(html,"utf8");const dir=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents",cik,accession.replaceAll("-",""));fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"doc.htm"),bytes);return {cik,accessionNumber:accession,filed:"2026-10-01",direction:oldDirection,classificationStatus:oldDirection==="UNCLASSIFIED"?"UNCLASSIFIED":"CLASSIFIED",eligibleForBreadth:["UP","FLAT","DOWN"].includes(oldDirection),sourceRole:"EXHIBIT",sourceSha256:sha256(bytes),sourceHost:"www.sec.gov"};}
function setup(entries){const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r24-"));const completed={};for(const entry of entries){const item=writeEntry(base,entry);completed[item.accessionNumber]=item;}const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,"checkpoint.json"),JSON.stringify({version:"E1-R5-R17-SEC-GUIDANCE-R1",asOf:"2026-10-12",lookbackDays:185,researchOnly:true,completed},null,2));const reports=path.join(base,"manual-input","e1-r5","reports");fs.mkdirSync(reports,{recursive:true});fs.writeFileSync(path.join(reports,"e1-r5-r17-sec-guidance-last.json"),JSON.stringify({status:"COMPLETE",candidateIssuers:entries.length,completedIssuers:entries.length,remainingIssuers:0},null,2));return base;}

test("R24 restores metric-label revisions and suppresses ambiguous flat updates",()=>{
  assert.equal(E1_R5_R24_GUIDANCE_CANDIDATE_POLICY.researchOnly,true);
  assert.equal(direction("Revenue: Increased original guidance to a range of $17.0 to $17.5 billion."),"UP");
  assert.equal(direction("Adjusted EBITDA: Increased original guidance to a range of $5.0 to $5.2 billion."),"UP");
  assert.equal(direction("Adjusted Free Cash Flow: Increased original guidance to a range of $2.0 to $2.2 billion."),"UP");
  assert.equal(direction("The Company maintained its sales and GAAP earnings per share guidance and updated its gross profit margin and Base Business earnings per share guidance for full year 2026."),"UNCLASSIFIED");
  assert.equal(direction("Exhibit 99.1 is a copy of the press release labeled McCormick Reports Solid Third Quarter Performance and Reaffirms 2026 Outlook."),"UNCLASSIFIED");
  assert.equal(direction("Comparable hotel EBITDA margins will increase 40 basis points to 50 basis points compared to 2025 for the low and high end of the forecast comparable hotel RevPAR range, respectively."),"UNCLASSIFIED");
  assert.equal(direction("Workday is reiterating its fiscal 2027 third quarter and full-year financial guidance, with the exception of GAAP operating margin."),"UNCLASSIFIED");
  assert.equal(direction("The company raised full-year revenue guidance by $500 million while reaffirming adjusted diluted EPS guidance."),"UP");
  assert.equal(direction("Xcel Energy reaffirms its 2026 ongoing earnings per share guidance. The decrease from prior guidance is primarily due to nuclear life extensions, offset by lower revenue."),"FLAT");
});

test("R24 offline compare uses only hash-verified local documents and exposes R22 to R24 changes",()=>{
  const base=setup([
    {cik:"0000000001",accession:"0000000001-26-000001",direction:"UP",html:"<p>Revenue: Increased original guidance to a range of $17.0 to $17.5 billion.</p>"},
    {cik:"0000000002",accession:"0000000002-26-000002",direction:"FLAT",html:"<p>The Company maintained its sales and GAAP earnings per share guidance and updated its gross profit margin and Base Business earnings per share guidance for full year 2026.</p>"},
    {cik:"0000000003",accession:"0000000003-26-000003",direction:"UP",html:"<p>The company raised full-year revenue guidance by $500 million while reaffirming adjusted diluted EPS guidance.</p>"},
  ]);
  const result=compareEarningsR5R24GuidanceCandidate({base,maxChanged:20});
  assert.equal(result.report.status,"COMPLETE");assert.equal(result.report.hashMatched,3);assert.equal(result.report.missingDocuments,0);assert.equal(result.report.hashMismatch,0);
  assert.equal(result.report.r24DirectionCounts.UP,2);assert.equal(result.report.r24DirectionCounts.UNCLASSIFIED,1);assert.ok(result.report.changedEntries>=2);
  assert.equal(result.report.networkCalls,0);assert.equal(result.report.dbWrites,0);assert.equal(result.report.productionActivation,false);assert.equal(result.report.formulaChanged,false);assert.equal(result.report.scoringGateChanged,false);
  const text=fs.readFileSync(result.textFile,"utf8");assert.match(text,/R22_TO_R24_CHANGED_ENTRIES:/);assert.match(text,/SEMANTIC_VALIDATION: REVIEW_REQUIRED/);assert.doesNotMatch(text,/Revenue: Increased original guidance/);
  const packet=fs.readFileSync(result.packetFile,"utf8");assert.match(packet,/R22_EVIDENCE/);assert.match(packet,/R24_EVIDENCE/);assert.match(packet,/LOCAL_EXCERPTS_INCLUDED: YES/);
});

test("R24 compare fails closed on local document hash mismatch",()=>{
  const base=setup([{cik:"0000000004",accession:"0000000004-26-000004",direction:"UP",html:"<p>Revenue: Increased original guidance.</p>"}]);
  const file=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents","0000000004","000000000426000004","doc.htm");fs.writeFileSync(file,"tampered","utf8");
  const result=compareEarningsR5R24GuidanceCandidate({base,maxChanged:20});assert.equal(result.report.status,"FAILED");assert.equal(result.report.hashMismatch,1);assert.equal(result.report.hashMatched,0);
});
