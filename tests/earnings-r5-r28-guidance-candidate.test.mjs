import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {classifyR28GuidanceCandidateFromText,E1_R5_R28_GUIDANCE_CANDIDATE_POLICY} from "../lib/market-score/earnings-e1-r5-guidance-r28-candidate.mjs";
import {auditEarningsR5R28GuidanceCandidate} from "../scripts/pc-writer/earnings-r5-r28-guidance-candidate-audit.mjs";

const direction=text=>classifyR28GuidanceCandidateFromText(text).direction??"UNCLASSIFIED";
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
function writeEntry(base,{cik,accession,direction:oldDirection,html}){const bytes=Buffer.from(html,"utf8"),dir=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents",cik,accession.replaceAll("-",""));fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"doc.htm"),bytes);return {cik,accessionNumber:accession,filed:"2026-10-01",direction:oldDirection,classificationStatus:oldDirection==="UNCLASSIFIED"?"UNCLASSIFIED":"CLASSIFIED",eligibleForBreadth:["UP","FLAT","DOWN"].includes(oldDirection),sourceRole:"EXHIBIT",sourceSha256:sha256(bytes),sourceHost:"www.sec.gov"};}
function setup(entries){const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r28-")),completed={};for(const entry of entries){const item=writeEntry(base,entry);completed[item.accessionNumber]=item;}const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,"checkpoint.json"),JSON.stringify({version:"E1-R5-R17-SEC-GUIDANCE-R1",asOf:"2026-10-12",lookbackDays:185,researchOnly:true,completed},null,2));const reports=path.join(base,"manual-input","e1-r5","reports");fs.mkdirSync(reports,{recursive:true});fs.writeFileSync(path.join(reports,"e1-r5-r17-sec-guidance-last.json"),JSON.stringify({status:"COMPLETE",candidateIssuers:entries.length,completedIssuers:entries.length,remainingIssuers:0},null,2));return base;}

test("R28 suppresses lower-end positioning and table-label false DOWN signals without weakening explicit revisions",()=>{
  assert.equal(E1_R5_R28_GUIDANCE_CANDIDATE_POLICY.researchOnly,true);
  assert.equal(direction("The company now expects gross profit margin to be at the lower end of its full-year 78% to 79% gross margin guidance."),"UNCLASSIFIED");
  assert.equal(direction("Organic sales growth / (decrease) and adjusted EPS outlook for fiscal year 2027."),"UNCLASSIFIED");
  assert.equal(direction("The midpoint of full-year 2026 guidance for EPS decreased by $0.25."),"DOWN");
  assert.equal(direction("The company lowered its full-year revenue guidance to $18 billion."),"DOWN");
  assert.equal(direction("Increasing total company sales growth guidance to 10% to 11%. Reaffirming adjusted EPS guidance of $2. The company now expects gross profit margin to be at the lower end of its full-year 78% to 79% gross margin guidance."),"UP");
});

test("R28 local audit hash-verifies documents, exposes changes, and prints targeted guidance contexts for directional unclassified entries",()=>{
  const base=setup([
    {cik:"0000000001",accession:"0000000001-26-000001",direction:"MIXED",html:"<p>Increasing sales guidance to 10%. Reaffirming adjusted EPS guidance. The company now expects gross profit margin to be at the lower end of its full-year gross margin guidance.</p>"},
    {cik:"0000000002",accession:"0000000002-26-000002",direction:"DOWN",html:"<p>Organic sales growth / (decrease) and adjusted EPS outlook for fiscal year 2027.</p>"},
    {cik:"0000000003",accession:"0000000003-26-000003",direction:"UP",html:"<p>AMETEK Announces Results and Raises Full Year Guidance.</p>"},
    {cik:"0000000004",accession:"0000000004-26-000004",direction:"DOWN",html:"<p>The midpoint of full-year 2026 guidance for EPS decreased by $0.25.</p>"},
  ]);
  const result=auditEarningsR5R28GuidanceCandidate({base,maxUnclassified:20});
  assert.equal(result.report.status,"COMPLETE");assert.equal(result.report.hashMatched,4);assert.equal(result.report.missingDocuments,0);assert.equal(result.report.hashMismatch,0);
  assert.ok(result.report.changedEntries>=2);assert.ok(result.report.directionalUnclassified>=2);
  assert.equal(result.report.networkCalls,0);assert.equal(result.report.dbWrites,0);assert.equal(result.report.productionActivation,false);assert.equal(result.report.formulaChanged,false);assert.equal(result.report.scoringGateChanged,false);
  const text=fs.readFileSync(result.textFile,"utf8");assert.match(text,/R26_TO_R28_CHANGED_ENTRIES:/);assert.match(text,/R17_DIRECTIONAL_R28_UNCLASSIFIED:/);assert.match(text,/SEMANTIC_VALIDATION: REVIEW_REQUIRED/);
  const packet=fs.readFileSync(result.packetFile,"utf8");assert.match(packet,/R26_TO_R28_CHANGED/);assert.match(packet,/R17_DIRECTIONAL_R28_UNCLASSIFIED/);assert.match(packet,/GUIDANCE_CONTEXT_1:.*Raises Full Year Guidance/i);
});

test("R28 audit fails closed on local document hash mismatch",()=>{
  const base=setup([{cik:"0000000005",accession:"0000000005-26-000005",direction:"DOWN",html:"<p>The company lowered revenue guidance.</p>"}]);const file=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents","0000000005","000000000526000005","doc.htm");fs.writeFileSync(file,"tampered","utf8");const result=auditEarningsR5R28GuidanceCandidate({base,maxUnclassified:20});assert.equal(result.report.status,"FAILED");assert.equal(result.report.hashMismatch,1);assert.equal(result.report.hashMatched,0);
});
