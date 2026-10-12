import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {auditEarningsR5R20GuidanceSignals} from "../scripts/pc-writer/earnings-r5-r20-guidance-signal-diagnostics.mjs";

const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
function writeEntry(base,{cik,accession,direction,html,sourceRole="EXHIBIT"}){
  const bytes=Buffer.from(html,"utf8");const dir=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents",cik,accession.replaceAll("-",""));fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"doc.htm"),bytes);
  return {cik,accessionNumber:accession,filed:"2026-10-01",direction,classificationStatus:direction==="UNCLASSIFIED"?"UNCLASSIFIED":"CLASSIFIED",eligibleForBreadth:["UP","FLAT","DOWN"].includes(direction),sourceRole,sourceSha256:sha256(bytes),sourceHost:"www.sec.gov"};
}
function setup(entries){const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r20-"));const completed={};for(const entry of entries){const item=writeEntry(base,entry);completed[item.accessionNumber]=item;}const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");fs.mkdirSync(root,{recursive:true});fs.writeFileSync(path.join(root,"checkpoint.json"),JSON.stringify({version:"E1-R5-R17-SEC-GUIDANCE-R1",asOf:"2026-10-12",lookbackDays:185,researchOnly:true,completed},null,2));return base;}

test("R20 flags visible semantic risks without changing DB or production",()=>{
  const base=setup([
    {cik:"0000000001",accession:"0000000001-26-000001",direction:"DOWN",html:"<p>Net income guidance improved to $5.0 billion.</p>"},
    {cik:"0000000002",accession:"0000000002-26-000002",direction:"UNCLASSIFIED",html:"<p>Raising fiscal 2027 revenue growth outlook for the segment.</p>"},
    {cik:"0000000003",accession:"0000000003-26-000003",direction:"UNCLASSIFIED",html:"<p>We anticipate no impact to the company's 2026 revenue guidance.</p>"},
    {cik:"0000000004",accession:"0000000004-26-000004",direction:"DOWN",html:"<p>2026 outlook for capital expenditures reduced to $1.2 billion.</p>"},
  ]);
  const result=auditEarningsR5R20GuidanceSignals({base,maxFlagged:20});
  assert.equal(result.report.status,"COMPLETE");assert.equal(result.report.networkCalls,0);assert.equal(result.report.dbWrites,0);assert.equal(result.report.productionActivation,false);assert.equal(result.report.rawTextPublication,false);
  assert.equal(result.report.checkpointEntries,4);assert.equal(result.report.hashMatched,4);assert.equal(result.report.missingDocuments,0);assert.equal(result.report.hashMismatch,0);
  assert.ok((result.report.flagCounts.OPPOSING_POSITIVE_EVIDENCE??0)>=1);
  assert.ok((result.report.flagCounts.MISSED_UP_PHRASE??0)>=1);
  assert.ok((result.report.flagCounts.MISSED_FLAT_PHRASE??0)>=1);
  assert.ok((result.report.flagCounts.DOWN_NON_EARNINGS_METRIC_RISK??0)>=1);
  const reportText=fs.readFileSync(result.textFile,"utf8");assert.doesNotMatch(reportText,/Net income guidance improved|Raising fiscal/);
  const packet=fs.readFileSync(result.packetFile,"utf8");assert.match(packet,/LOCAL_EXCERPTS_INCLUDED: YES/);assert.match(packet,/OPPOSING_POSITIVE_EVIDENCE/);
});

test("R20 fails closed on hash mismatch",()=>{
  const base=setup([{cik:"0000000005",accession:"0000000005-26-000005",direction:"UP",html:"<p>Raises full-year EPS guidance.</p>"}]);
  const file=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents","0000000005","000000000526000005","doc.htm");fs.writeFileSync(file,"tampered","utf8");
  const result=auditEarningsR5R20GuidanceSignals({base,maxFlagged:20});
  assert.equal(result.report.status,"FAILED");assert.equal(result.report.hashMismatch,1);assert.equal(result.report.hashMatched,0);
});
