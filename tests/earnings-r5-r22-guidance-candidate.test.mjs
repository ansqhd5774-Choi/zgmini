import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {classifyR22GuidanceCandidateFromText,E1_R5_R22_GUIDANCE_CANDIDATE_POLICY} from "../lib/market-score/earnings-e1-r5-guidance-r22-candidate.mjs";
import {compareEarningsR5R22GuidanceCandidate} from "../scripts/pc-writer/earnings-r5-r22-guidance-candidate-compare.mjs";

const direction=text=>classifyR22GuidanceCandidateFromText(text).direction??"UNCLASSIFIED";
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
function writeEntry(base,{cik,accession,direction:oldDirection,html}){const bytes=Buffer.from(html,"utf8");const dir=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents",cik,accession.replaceAll("-",""));fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"doc.htm"),bytes);return {cik,accessionNumber:accession,filed:"2026-10-01",direction:oldDirection,classificationStatus:oldDirection==="UNCLASSIFIED"?"UNCLASSIFIED":"CLASSIFIED",eligibleForBreadth:["UP","FLAT","DOWN"].includes(oldDirection),sourceRole:"EXHIBIT",sourceSha256:sha256(bytes),sourceHost:"www.sec.gov"};}
function setup(entries){const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r22-"));const completed={};for(const entry of entries){const item=writeEntry(base,entry);completed[item.accessionNumber]=item;}const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,"checkpoint.json"),JSON.stringify({version:"E1-R5-R17-SEC-GUIDANCE-R1",asOf:"2026-10-12",lookbackDays:185,researchOnly:true,completed},null,2));const reports=path.join(base,"manual-input","e1-r5","reports");fs.mkdirSync(reports,{recursive:true});fs.writeFileSync(path.join(reports,"e1-r5-r17-sec-guidance-last.json"),JSON.stringify({status:"COMPLETE",candidateIssuers:entries.length,completedIssuers:entries.length,remainingIssuers:0},null,2));return base;}

test("R22 hardens R21 semantic false positives while preserving valid company guidance",()=>{
  assert.equal(E1_R5_R22_GUIDANCE_CANDIDATE_POLICY.researchOnly,true);
  assert.equal(direction("Air Products is raising its full-year fiscal 2026 adjusted EPS guidance to $13.39 to $13.49."),"UP");
  assert.equal(direction("The company raised full-year revenue guidance by $500 million while reaffirming adjusted diluted EPS guidance. The company does not provide specific guidance for non-GAAP reconciling items."),"UP");
  assert.equal(direction("The company raised full-year revenue guidance to $13.5 billion. The company does not provide guidance regarding its GAAP effective tax rate."),"UP");
  assert.equal(direction("The tax effect is calculated based on authoritative guidance in the Financial Accounting Standards Board's Accounting Standards Codification 740."),"UNCLASSIFIED");
  assert.equal(direction("Due to the pending transaction, the Company will not be providing forward-looking guidance."),"WITHDRAW");
  assert.equal(direction("The Company is raising its full-year total sales volume guidance to 2,375 Bcfe."),"UNCLASSIFIED");
  assert.equal(direction("Comparable hotel EBITDA margins will increase 40 basis points compared with 2025 for the low and high end of the forecast comparable hotel RevPAR range."),"UNCLASSIFIED");
  assert.equal(direction("Xcel Energy reaffirms its 2026 ongoing earnings per share guidance of $4. The decrease from prior guidance is primarily due to nuclear life extensions, offset by lower revenue."),"FLAT");
  assert.equal(direction("Akamai anticipates no impact to the company's 2026 revenue guidance."),"FLAT");
  assert.equal(direction("Full-year adjusted EPS guidance has been increased to $8.85 to $9.05."),"UP");
});

test("R22 offline compare uses only hash-verified local R17 documents and compares R21 to R22",()=>{
  const base=setup([
    {cik:"0000000001",accession:"0000000001-26-000001",direction:"MIXED",html:"<p>Raised full-year revenue guidance while reaffirming EPS guidance. The company does not provide specific guidance for non-GAAP reconciling items.</p>"},
    {cik:"0000000002",accession:"0000000002-26-000002",direction:"MIXED",html:"<p>The tax effect follows authoritative guidance in the Financial Accounting Standards Board's Accounting Standards Codification 740.</p>"},
    {cik:"0000000003",accession:"0000000003-26-000003",direction:"UNCLASSIFIED",html:"<p>Due to the transaction, the Company will not be providing forward-looking guidance.</p>"},
  ]);
  const result=compareEarningsR5R22GuidanceCandidate({base,maxChanged:20});
  assert.equal(result.report.status,"COMPLETE");assert.equal(result.report.hashMatched,3);assert.equal(result.report.missingDocuments,0);assert.equal(result.report.hashMismatch,0);
  assert.equal(result.report.r22DirectionCounts.UP,1);assert.equal(result.report.r22DirectionCounts.WITHDRAW,1);assert.equal(result.report.r22DirectionCounts.UNCLASSIFIED,1);
  assert.equal(result.report.networkCalls,0);assert.equal(result.report.dbWrites,0);assert.equal(result.report.productionActivation,false);assert.equal(result.report.formulaChanged,false);assert.equal(result.report.scoringGateChanged,false);
  const text=fs.readFileSync(result.textFile,"utf8");assert.match(text,/R21_TO_R22_CHANGED_ENTRIES:/);assert.match(text,/SEMANTIC_VALIDATION: REVIEW_REQUIRED/);assert.doesNotMatch(text,/Raised full-year revenue/);
  const packet=fs.readFileSync(result.packetFile,"utf8");assert.match(packet,/LOCAL_EXCERPTS_INCLUDED: YES/);
});

test("R22 compare fails closed on local document hash mismatch",()=>{
  const base=setup([{cik:"0000000004",accession:"0000000004-26-000004",direction:"UP",html:"<p>Raises full-year EPS guidance.</p>"}]);
  const file=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents","0000000004","000000000426000004","doc.htm");fs.writeFileSync(file,"tampered","utf8");
  const result=compareEarningsR5R22GuidanceCandidate({base,maxChanged:20});assert.equal(result.report.status,"FAILED");assert.equal(result.report.hashMismatch,1);assert.equal(result.report.hashMatched,0);
});
