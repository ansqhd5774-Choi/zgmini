import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {downloadEarningsR5R14CostPressureFiles} from "../scripts/pc-writer/earnings-r5-r14-cost-pressure-download.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../lib/market-score/earnings-e1-r5-official-sources.mjs";

function fixture(){return fs.mkdtempSync(path.join(os.tmpdir(),"zgmini-e1-r5-r14-download-"));}
function mockFetchRecorder(){
  const calls=[];
  const fetchImpl=async(url,options={})=>{calls.push({url,options});const body=Buffer.from(`fixture:${url}`);return new Response(body,{status:200,headers:{"content-length":String(body.length)}});};
  return {calls,fetchImpl};
}

test("R14 cost-pressure downloader fetches BLS plus official Census concordances once and reuses them",async()=>{
  const dir=fixture();
  try{
    const first=mockFetchRecorder();
    const result=await downloadEarningsR5R14CostPressureFiles({incoming:dir,fetchImpl:first.fetchImpl});
    assert.equal(result.status,"COMPLETE");
    assert.equal(result.requestCount,11);
    assert.equal(result.dbWrites,0);
    assert.deepEqual(first.calls.map(row=>row.url),[
      E1_R5_OFFICIAL_SOURCE_MANIFEST.blsUnitLaborCostSeries.url,
      E1_R5_OFFICIAL_SOURCE_MANIFEST.blsUnitLaborCostMeasure.url,
      E1_R5_OFFICIAL_SOURCE_MANIFEST.blsUnitLaborCostDuration.url,
      E1_R5_OFFICIAL_SOURCE_MANIFEST.blsProducerOutputSeries.url,
      E1_R5_OFFICIAL_SOURCE_MANIFEST.blsProducerOutputData.url,
      E1_R5_OFFICIAL_SOURCE_MANIFEST.censusSic1987ToNaics2002.url,
      E1_R5_OFFICIAL_SOURCE_MANIFEST.censusNaics2002To2007.url,
      E1_R5_OFFICIAL_SOURCE_MANIFEST.censusNaics2007To2012.url,
      E1_R5_OFFICIAL_SOURCE_MANIFEST.censusNaics2012To2017.url,
      E1_R5_OFFICIAL_SOURCE_MANIFEST.censusNaics2017To2022.url,
      E1_R5_OFFICIAL_SOURCE_MANIFEST.censusNaics2022To2017.url,
    ]);
    assert.ok(first.calls.every(row=>row.options.redirect==="error"));
    assert.ok(result.results.every(row=>row.status==="DOWNLOADED"&&row.requestCount===1&&/^[a-f0-9]{64}$/.test(row.sha256)));

    const second=mockFetchRecorder();
    const replay=await downloadEarningsR5R14CostPressureFiles({incoming:dir,fetchImpl:second.fetchImpl});
    assert.equal(replay.requestCount,0);
    assert.equal(second.calls.length,0);
    assert.ok(replay.results.every(row=>row.status==="SKIPPED_EXISTING"&&row.requestCount===0));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
