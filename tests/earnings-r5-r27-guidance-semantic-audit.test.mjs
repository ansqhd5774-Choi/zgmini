import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {auditEarningsR5R27GuidanceSemantic} from "../scripts/pc-writer/earnings-r5-r27-guidance-final-semantic-audit.mjs";

const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
function writeEntry(base,{cik,accession,direction,html}){const bytes=Buffer.from(html,"utf8");const dir=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents",cik,accession.replaceAll("-",""));fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"doc.htm"),bytes);return {cik,accessionNumber:accession,filed:"2026-10-01",direction,classificationStatus:direction==="UNCLASSIFIED"?"UNCLASSIFIED":"CLASSIFIED",eligibleForBreadth:["UP","FLAT","DOWN"].includes(direction),sourceRole:"EXHIBIT",sourceSha256:sha256(bytes),sourceHost:"www.sec.gov"};}
function setup(entries){const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r27-"));const completed={};for(const entry of entries){const item=writeEntry(base,entry);completed[item.accessionNumber]=item;}const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,"checkpoint.json"),JSON.stringify({version:"E1-R5-R17-SEC-GUIDANCE-R1",asOf:"2026-10-12",lookbackDays:185,researchOnly:true,completed},null,2));const reports=path.join(base,"manual-input","e1-r5","reports");fs.mkdirSync(reports,{recursive:true});fs.writeFileSync(path.join(reports,"e1-r5-r17-sec-guidance-last.json"),JSON.stringify({status:"COMPLETE",candidateIssuers:entries.length,completedIssuers:entries.length,remainingIssuers:0},null,2));return base;}

test("R27 samples every R26 direction bucket deterministically and remains local-only",()=>{
  const base=setup([
    {cik:"0000000001",accession:"0000000001-26-000001",direction:"UP",html:"<p>We are raising our full-year earnings guidance for 2026.</p>"},
    {cik:"0000000002",accession:"0000000002-26-000002",direction:"FLAT",html:"<p>We are reaffirming our full-year earnings guidance for 2026.</p>"},
    {cik:"0000000003",accession:"0000000003-26-000003",direction:"DOWN",html:"<p>We lowered our full-year earnings outlook for 2026.</p>"},
    {cik:"0000000004",accession:"0000000004-26-000004",direction:"WITHDRAW",html:"<p>Due to the pending transaction, the company will not be providing forward-looking guidance.</p>"},
    {cik:"0000000005",accession:"0000000005-26-000005",direction:"MIXED",html:"<p>The company raised revenue guidance and lowered earnings guidance for 2026.</p>"},
    {cik:"0000000006",accession:"0000000006-26-000006",direction:"UNCLASSIFIED",html:"<p>Revenue increased 10% year over year. Management discussed the outlook.</p>"},
  ]);
  const result=auditEarningsR5R27GuidanceSemantic({base,samplePerBucket:2});
  assert.equal(result.report.status,"COMPLETE");assert.equal(result.report.hashMatched,6);assert.equal(result.report.missingDocuments,0);assert.equal(result.report.hashMismatch,0);
  assert.deepEqual(result.report.r26DirectionCounts,{UP:1,FLAT:1,DOWN:1,WITHDRAW:1,MIXED:1,UNCLASSIFIED:1});
  assert.equal(result.report.sampledTotal,6);for(const bucket of ["UP","FLAT","DOWN","WITHDRAW","MIXED","UNCLASSIFIED"])assert.equal(result.report.sampledByBucket[bucket],1);
  assert.equal(result.report.networkCalls,0);assert.equal(result.report.dbWrites,0);assert.equal(result.report.productionActivation,false);assert.equal(result.report.formulaChanged,false);assert.equal(result.report.scoringGateChanged,false);
  const text=fs.readFileSync(result.textFile,"utf8");assert.match(text,/SEMANTIC_VALIDATION: REVIEW_REQUIRED/);assert.doesNotMatch(text,/raising our full-year earnings guidance/);
  const packet=fs.readFileSync(result.packetFile,"utf8");assert.match(packet,/BUCKET UP/);assert.match(packet,/BUCKET UNCLASSIFIED/);assert.match(packet,/R24_DIRECTION:/);assert.match(packet,/CHANGED_FROM_R24:/);assert.match(packet,/LOCAL_EXCERPTS_INCLUDED: YES/);
});

test("R27 fails closed when a stored SEC document hash no longer matches",()=>{
  const base=setup([{cik:"0000000007",accession:"0000000007-26-000007",direction:"UP",html:"<p>We are raising earnings guidance.</p>"}]);
  const file=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents","0000000007","000000000726000007","doc.htm");fs.writeFileSync(file,"tampered","utf8");
  const result=auditEarningsR5R27GuidanceSemantic({base,samplePerBucket:2});assert.equal(result.report.status,"FAILED");assert.equal(result.report.hashMismatch,1);assert.equal(result.report.hashMatched,0);
});
