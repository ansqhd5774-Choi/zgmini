import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  E1_R5_R17_SEC_POLICY,
  buildSecArchiveDocumentUrl,
  classifyGuidanceDirectionFromHtml,
  classifyGuidanceDirectionFromText,
  extractSecExhibitLinks,
  htmlToVisibleText,
} from "../lib/market-score/earnings-e1-r5-guidance-r17.mjs";
import {collectEarningsR5R17SecGuidance} from "../scripts/pc-writer/earnings-r5-r17-sec-guidance-collect.mjs";

function fakeResponse(body,status=200){
  const bytes=Buffer.from(body,"utf8");return {ok:status>=200&&status<300,status,headers:{get(name){return String(name).toLowerCase()==="content-length"?String(bytes.length):null;}},async arrayBuffer(){return bytes;}};
}
function candidate(cik,accession,document,filed="2026-10-01"){
  return {cik,filed,accessionNumber:accession,primaryDocument:document,form:"8-K",items:["2.02"]};
}

test("R17 policy is research-only and stays below the approved SEC request ceiling",()=>{
  assert.equal(E1_R5_R17_SEC_POLICY.maxRequestsPerRun,100);
  assert.ok(E1_R5_R17_SEC_POLICY.requestIntervalMs>=500);
  assert.equal(E1_R5_R17_SEC_POLICY.productionActivation,false);
  assert.equal(E1_R5_R17_SEC_POLICY.rawTextPublication,false);
});

test("SEC archive URL is exact and fails closed on unsafe filing identity",()=>{
  assert.equal(buildSecArchiveDocumentUrl({cik:"0000123456",accessionNumber:"0000123456-26-123456",document:"earnings8k.htm"}),"https://www.sec.gov/Archives/edgar/data/123456/000012345626123456/earnings8k.htm");
  assert.equal(buildSecArchiveDocumentUrl({cik:"0000123456",accessionNumber:"bad",document:"x.htm"}),null);
  assert.equal(buildSecArchiveDocumentUrl({cik:"0000123456",accessionNumber:"0000123456-26-123456",document:"../x.htm"}),null);
});

test("guidance extraction is explicit conservative and does not coerce withdrawals into DOWN",()=>{
  assert.equal(classifyGuidanceDirectionFromText("The company raised its full-year guidance for 2026.").direction,"UP");
  assert.equal(classifyGuidanceDirectionFromText("Management reaffirmed its full-year guidance.").direction,"FLAT");
  assert.equal(classifyGuidanceDirectionFromText("The company lowered its revenue guidance.").direction,"DOWN");
  const withdrawn=classifyGuidanceDirectionFromText("The company withdrawn its full-year guidance.");
  assert.equal(withdrawn.direction,"WITHDRAW");assert.equal(withdrawn.eligibleForBreadth,false);
  assert.equal(classifyGuidanceDirectionFromText("The company raised revenue guidance and lowered margin guidance.").status,"MIXED");
  assert.equal(classifyGuidanceDirectionFromText("The company may lower guidance if demand weakens.").status,"UNCLASSIFIED");
});

test("HTML parsing removes hidden/script content and exhibit discovery stays inside the filing directory",()=>{
  const html=`<html><script>raised guidance</script><ix:hidden>lowered guidance</ix:hidden><body><p>Management reaffirmed guidance.</p><a href="ex99-1.htm">Exhibit 99.1 Press Release</a><a href="https://example.com/ex99.htm">Exhibit 99.1</a></body></html>`;
  const text=htmlToVisibleText(html);assert.doesNotMatch(text,/raised guidance/);assert.doesNotMatch(text,/lowered guidance/);
  assert.equal(classifyGuidanceDirectionFromHtml(html).direction,"FLAT");
  const base="https://www.sec.gov/Archives/edgar/data/123/000000012326000001/main.htm";
  assert.deepEqual(extractSecExhibitLinks(html,{baseUrl:base}),["https://www.sec.gov/Archives/edgar/data/123/000000012326000001/ex99-1.htm"]);
});

test("R17 bounded batch checkpoints progress resumes from stored documents and publishes no raw text",async()=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),"e1-r17-"));
  const candidates=[
    candidate("0000000001","0000000001-26-000001","a.htm","2026-10-02"),
    candidate("0000000002","0000000002-26-000002","b.htm","2026-10-01"),
  ];
  const bodies=new Map([
    ["a.htm","<html><body>Company raised its full-year guidance. SECRET_RAW_ALPHA</body></html>"],
    ["b.htm","<html><body>Company reaffirmed its full-year outlook. SECRET_RAW_BETA</body></html>"],
  ]);
  let calls=0;
  const fetchImpl=async url=>{calls++;return fakeResponse(bodies.get(path.basename(new URL(url).pathname)));};
  const first=await collectEarningsR5R17SecGuidance({base,asOf:"2026-10-12",lookbackDays:185,maxRequests:1,candidates,fetchImpl,sleepImpl:async()=>{}});
  assert.equal(first.report.status,"RUNNING");assert.equal(first.report.requestCount,1);assert.equal(first.report.completedIssuers,1);assert.equal(first.report.remainingIssuers,1);assert.equal(first.report.directionCounts.UP,1);assert.equal(first.report.dbWrites,0);assert.equal(first.report.productionActivation,false);
  const second=await collectEarningsR5R17SecGuidance({base,asOf:"2026-10-12",lookbackDays:185,maxRequests:1,candidates,fetchImpl,sleepImpl:async()=>{}});
  assert.equal(second.report.status,"COMPLETE");assert.equal(second.report.requestCount,1);assert.equal(second.report.completedIssuers,2);assert.equal(second.report.directionCounts.UP,1);assert.equal(second.report.directionCounts.FLAT,1);assert.equal(calls,2);
  const checkpoint=fs.readFileSync(second.checkpointFile,"utf8");const reportText=fs.readFileSync(second.textReport,"utf8");
  assert.doesNotMatch(checkpoint,/SECRET_RAW_ALPHA|SECRET_RAW_BETA/);assert.doesNotMatch(reportText,/SECRET_RAW_ALPHA|SECRET_RAW_BETA/);
});
