import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {classifyR26GuidanceCandidateFromText,E1_R5_R26_GUIDANCE_CANDIDATE_POLICY} from "../lib/market-score/earnings-e1-r5-guidance-r26-candidate.mjs";
import {compareEarningsR5R26GuidanceCandidate} from "../scripts/pc-writer/earnings-r5-r26-guidance-candidate-compare.mjs";

const classify=text=>classifyR26GuidanceCandidateFromText(text);
const direction=text=>classify(text).direction??"UNCLASSIFIED";
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
function writeEntry(base,{cik,accession,direction:oldDirection,html}){const bytes=Buffer.from(html,"utf8");const dir=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents",cik,accession.replaceAll("-",""));fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"doc.htm"),bytes);return {cik,accessionNumber:accession,filed:"2026-10-01",direction:oldDirection,classificationStatus:oldDirection==="UNCLASSIFIED"?"UNCLASSIFIED":"CLASSIFIED",eligibleForBreadth:["UP","FLAT","DOWN"].includes(oldDirection),sourceRole:"EXHIBIT",sourceSha256:sha256(bytes),sourceHost:"www.sec.gov"};}
function setup(entries){const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r26-"));const completed={};for(const entry of entries){const item=writeEntry(base,entry);completed[item.accessionNumber]=item;}const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,"checkpoint.json"),JSON.stringify({version:"E1-R5-R17-SEC-GUIDANCE-R1",asOf:"2026-10-12",lookbackDays:185,researchOnly:true,completed},null,2));const reports=path.join(base,"manual-input","e1-r5","reports");fs.mkdirSync(reports,{recursive:true});fs.writeFileSync(path.join(reports,"e1-r5-r17-sec-guidance-last.json"),JSON.stringify({status:"COMPLETE",candidateIssuers:entries.length,completedIssuers:entries.length,remainingIssuers:0},null,2));return base;}

test("R26 suppresses accounting-guidance withdrawal false positives and restores standalone earnings guidance",()=>{
  assert.equal(E1_R5_R26_GUIDANCE_CANDIDATE_POLICY.researchOnly,true);
  assert.equal(direction("Reflects the operations of Mobility that will qualify as discontinued operations in accordance with the guidance set forth in ASC 205, Presentation of Financial Statements."),"UNCLASSIFIED");
  assert.equal(direction("Due to the pending transaction, the Company will not be providing forward-looking guidance."),"WITHDRAW");
  assert.equal(direction("The Company discontinued its full-year earnings guidance due to the pending transaction."),"WITHDRAW");
  assert.equal(direction("We are raising our full-year earnings guidance for 2026."),"UP");
  assert.equal(direction("We lowered our full-year earnings outlook for 2026."),"DOWN");
  assert.equal(direction("We are reaffirming our full-year earnings guidance for 2026."),"FLAT");
  const mixedMetric=classify("Based on this performance, we are increasing our revenue and earnings guidance for the year.");
  assert.equal(mixedMetric.direction,"UP");assert.equal(mixedMetric.metricCounts.REVENUE,1);assert.equal(mixedMetric.metricCounts.EARNINGS,1);
  const flatMetric=classify("The Company is reiterating its prior guidance for revenue and earnings for fiscal 2027.");
  assert.equal(flatMetric.direction,"FLAT");assert.equal(flatMetric.metricCounts.REVENUE,1);assert.equal(flatMetric.metricCounts.EARNINGS,1);
});

test("R26 offline compare uses only hash-verified local documents and exposes R24 to R26 changes",()=>{
  const base=setup([
    {cik:"0000000001",accession:"0000000001-26-000001",direction:"WITHDRAW",html:"<p>Reflects the operations of Mobility that will qualify as discontinued operations in accordance with the guidance set forth in ASC 205, Presentation of Financial Statements.</p>"},
    {cik:"0000000002",accession:"0000000002-26-000002",direction:"UNCLASSIFIED",html:"<p>We are raising our full-year earnings guidance for 2026.</p>"},
    {cik:"0000000003",accession:"0000000003-26-000003",direction:"UP",html:"<p>The company raised full-year revenue guidance to $20 billion.</p>"},
  ]);
  const result=compareEarningsR5R26GuidanceCandidate({base,maxChanged:20});
  assert.equal(result.report.status,"COMPLETE");assert.equal(result.report.hashMatched,3);assert.equal(result.report.missingDocuments,0);assert.equal(result.report.hashMismatch,0);
  assert.equal(result.report.r26DirectionCounts.UNCLASSIFIED,1);assert.equal(result.report.r26DirectionCounts.UP,2);assert.ok(result.report.changedEntries>=2);
  assert.equal(result.report.networkCalls,0);assert.equal(result.report.dbWrites,0);assert.equal(result.report.productionActivation,false);assert.equal(result.report.formulaChanged,false);assert.equal(result.report.scoringGateChanged,false);
  const text=fs.readFileSync(result.textFile,"utf8");assert.match(text,/R24_TO_R26_CHANGED_ENTRIES:/);assert.match(text,/SEMANTIC_VALIDATION: REVIEW_REQUIRED/);
  const packet=fs.readFileSync(result.packetFile,"utf8");assert.match(packet,/R24_EVIDENCE/);assert.match(packet,/R26_EVIDENCE/);assert.match(packet,/LOCAL_EXCERPTS_INCLUDED: YES/);
});

test("R26 compare fails closed on local document hash mismatch",()=>{
  const base=setup([{cik:"0000000004",accession:"0000000004-26-000004",direction:"UP",html:"<p>We are raising earnings guidance.</p>"}]);
  const file=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents","0000000004","000000000426000004","doc.htm");fs.writeFileSync(file,"tampered","utf8");
  const result=compareEarningsR5R26GuidanceCandidate({base,maxChanged:20});assert.equal(result.report.status,"FAILED");assert.equal(result.report.hashMismatch,1);assert.equal(result.report.hashMatched,0);
});
