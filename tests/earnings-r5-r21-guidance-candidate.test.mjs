import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {classifyR21GuidanceCandidateFromText,E1_R5_R21_GUIDANCE_CANDIDATE_POLICY} from "../lib/market-score/earnings-e1-r5-guidance-r21-candidate.mjs";
import {compareEarningsR5R21GuidanceCandidate} from "../scripts/pc-writer/earnings-r5-r21-guidance-candidate-compare.mjs";

const direction=text=>classifyR21GuidanceCandidateFromText(text).direction??"UNCLASSIFIED";
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");

function writeEntry(base,{cik,accession,direction:oldDirection,html,sourceRole="EXHIBIT"}){
  const bytes=Buffer.from(html,"utf8");const dir=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents",cik,accession.replaceAll("-",""));fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"doc.htm"),bytes);
  return {cik,accessionNumber:accession,filed:"2026-10-01",direction:oldDirection,classificationStatus:oldDirection==="UNCLASSIFIED"?"UNCLASSIFIED":"CLASSIFIED",eligibleForBreadth:["UP","FLAT","DOWN"].includes(oldDirection),sourceRole,sourceSha256:sha256(bytes),sourceHost:"www.sec.gov"};
}
function setup(entries){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r21-"));const completed={};for(const entry of entries){const item=writeEntry(base,entry);completed[item.accessionNumber]=item;}
  const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,"checkpoint.json"),JSON.stringify({version:"E1-R5-R17-SEC-GUIDANCE-R1",asOf:"2026-10-12",lookbackDays:185,researchOnly:true,completed},null,2));
  const reports=path.join(base,"manual-input","e1-r5","reports");fs.mkdirSync(reports,{recursive:true});fs.writeFileSync(path.join(reports,"e1-r5-r17-sec-guidance-last.json"),JSON.stringify({status:"COMPLETE",candidateIssuers:entries.length,completedIssuers:entries.length,remainingIssuers:0},null,2));return base;
}

test("R21 candidate binds revisions to core financial guidance and applies approved candidate aggregation",()=>{
  assert.equal(E1_R5_R21_GUIDANCE_CANDIDATE_POLICY.researchOnly,true);
  assert.equal(E1_R5_R21_GUIDANCE_CANDIDATE_POLICY.productionActivation,false);
  assert.equal(direction("Operating loss improved three percent, partially offset by lower sale activity. Outlook: Air Products is raising its full-year fiscal 2026 adjusted EPS guidance to $13.39 to $13.49."),"UP");
  assert.equal(direction("The company raised full-year revenue guidance by $500 million at the midpoint while reaffirming adjusted diluted EPS guidance."),"UP");
  assert.equal(direction("2026 outlook for capital expenditures reduced to $1.2 billion."),"UNCLASSIFIED");
  assert.equal(direction("Akamai anticipates no impact to the company's 2026 revenue guidance."),"FLAT");
  assert.equal(direction("Due to the pending transaction, the Company will not be providing forward-looking guidance."),"WITHDRAW");
  assert.equal(direction("We are raising full-year revenue guidance and lowering adjusted EPS guidance."),"MIXED");
  assert.equal(direction("Revenue increased 12% year over year. Fiscal 2027 outlook includes revenue growth of 5% to 6% and adjusted EPS growth of 9% to 11%."),"UNCLASSIFIED");
  assert.equal(direction("Retail prices are increasing following recent FTC guidance requiring automotive dealers to include mandatory fees."),"UNCLASSIFIED");
  assert.equal(direction("The company is reiterating its full-year 2026 adjusted EPS guidance."),"FLAT");
  assert.equal(direction("Full-year adjusted EPS guidance has been increased to $8.85 to $9.05."),"UP");
});

test("R21 offline comparison reuses only hash-verified local R17 documents",()=>{
  const base=setup([
    {cik:"0000000001",accession:"0000000001-26-000001",direction:"DOWN",html:"<p>Operating loss improved, partially offset by lower sale activity.</p><p>Outlook: We are raising full-year adjusted EPS guidance to $13.39 to $13.49.</p>"},
    {cik:"0000000002",accession:"0000000002-26-000002",direction:"MIXED",html:"<p>We raised full-year revenue guidance while reaffirming adjusted EPS guidance.</p>"},
    {cik:"0000000003",accession:"0000000003-26-000003",direction:"DOWN",html:"<p>2026 outlook for capital expenditures reduced to $1.2 billion.</p>"},
    {cik:"0000000004",accession:"0000000004-26-000004",direction:"UNCLASSIFIED",html:"<p>We anticipate no impact to the company's 2026 revenue guidance.</p>"},
  ]);
  const result=compareEarningsR5R21GuidanceCandidate({base,maxChanged:20});
  assert.equal(result.report.status,"COMPLETE");assert.equal(result.report.hashMatched,4);assert.equal(result.report.missingDocuments,0);assert.equal(result.report.hashMismatch,0);
  assert.deepEqual(result.report.r21DirectionCounts,{UP:2,FLAT:1,DOWN:0,WITHDRAW:0,MIXED:0,UNCLASSIFIED:1});
  assert.equal(result.report.r21Eligible,3);assert.equal(result.report.changedEntries,4);
  assert.equal(result.report.networkCalls,0);assert.equal(result.report.dbWrites,0);assert.equal(result.report.productionActivation,false);assert.equal(result.report.formulaChanged,false);assert.equal(result.report.scoringGateChanged,false);
  const reportText=fs.readFileSync(result.textFile,"utf8");assert.match(reportText,/SEMANTIC_VALIDATION: REVIEW_REQUIRED/);assert.match(reportText,/NETWORK_CALLS: 0/);assert.doesNotMatch(reportText,/raising full-year adjusted EPS/);
  const packet=fs.readFileSync(result.packetFile,"utf8");assert.match(packet,/LOCAL_EXCERPTS_INCLUDED: YES/);assert.match(packet,/R17_DIRECTION: DOWN/);assert.match(packet,/R21_DIRECTION: UP/);
});

test("R21 comparison fails closed on local document hash mismatch",()=>{
  const base=setup([{cik:"0000000005",accession:"0000000005-26-000005",direction:"UP",html:"<p>Raises full-year EPS guidance.</p>"}]);
  const file=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents","0000000005","000000000526000005","doc.htm");fs.writeFileSync(file,"tampered","utf8");
  const result=compareEarningsR5R21GuidanceCandidate({base,maxChanged:20});assert.equal(result.report.status,"FAILED");assert.equal(result.report.hashMismatch,1);assert.equal(result.report.hashMatched,0);
});
