import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  downloadEarningsR5OfficialFiles,
  selectCompanyFactsEntries,
  selectSecJsonEntries,
} from "../scripts/pc-writer/earnings-r5-official-download.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../lib/market-score/earnings-e1-r5-official-sources.mjs";

function fixture(){return fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-e1-r5-download-"));}

function mockFetchRecorder(){
  const calls=[];
  const fetchImpl=async(url,options={})=>{
    calls.push({url,options});
    return new Response(Buffer.from(`fixture:${url}`),{status:200,headers:{"content-length":String(Buffer.byteLength(`fixture:${url}`))}});
  };
  return {calls,fetchImpl};
}

test("official R5 downloader makes exactly one bounded request per missing source then zero on replay",async()=>{
  const dir=fixture();
  try{
    const first=mockFetchRecorder();
    const result=await downloadEarningsR5OfficialFiles({incoming:dir,fetchImpl:first.fetchImpl});
    assert.equal(result.status,"COMPLETE");
    assert.equal(result.requestCount,5);
    assert.equal(first.calls.length,5);
    assert.deepEqual(first.calls.map(call=>call.url),[
      E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.url,
      E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.url,
      E1_R5_OFFICIAL_SOURCE_MANIFEST.blsUnitLaborCost.url,
      E1_R5_OFFICIAL_SOURCE_MANIFEST.blsProducerInput.url,
      E1_R5_OFFICIAL_SOURCE_MANIFEST.beaCorporateProfits.url,
    ]);
    assert.equal(first.calls[0].options.headers["User-Agent"],"ZGMINI/1.0 (+https://zgmini.kr)");
    assert.equal(first.calls[1].options.headers["User-Agent"],"ZGMINI/1.0 (+https://zgmini.kr)");
    assert.ok(first.calls.every(call=>call.options.redirect==="error"));
    assert.ok(result.results.every(item=>item.status==="DOWNLOADED"&&item.requestCount===1&&/^[a-f0-9]{64}$/.test(item.sha256)));

    const second=mockFetchRecorder();
    const replay=await downloadEarningsR5OfficialFiles({incoming:dir,fetchImpl:second.fetchImpl});
    assert.equal(replay.requestCount,0);
    assert.equal(second.calls.length,0);
    assert.ok(replay.results.every(item=>item.status==="SKIPPED_EXISTING"&&item.requestCount===0));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test("SEC bulk archive selection is limited to exact current-universe CIK files",()=>{
  const archive=[
    "CIK0000001001.json",
    "submissions/CIK0000001002.json",
    "companyfacts/CIK0000001002.json",
    "CIK0000009999.json",
    "../CIK0000001001.json",
    "/CIK0000001001.json",
    "other.txt",
  ];
  const universe=new Set(["0000001001","0000001002"]);
  assert.deepEqual(selectSecJsonEntries(archive,universe),[
    "CIK0000001001.json",
    "submissions/CIK0000001002.json",
  ]);
  assert.deepEqual(selectCompanyFactsEntries(["CIK0000001001.json","CIK0000001002.json"],universe),[
    "CIK0000001001.json",
    "CIK0000001002.json",
  ]);
});