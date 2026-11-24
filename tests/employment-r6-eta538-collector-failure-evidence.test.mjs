import test from "node:test";
import assert from "node:assert/strict";
import {runEmploymentR6CollectionStep} from "../lib/market-score/employment-r6-collector.mjs";
import {Buffer} from "node:buffer";
import {deflateSync} from "node:zlib";
import {createHash} from "node:crypto";
import {DatabaseSync} from "node:sqlite";
import {createEmploymentR6Store} from "../lib/market-score/employment-r6-store.mjs";
import {createEmploymentR6DolEta538Provider} from "../lib/market-score/employment-r6-dol-eta538-provider.mjs";
import {verifyDolAdvanceStoredRowLineage} from "../lib/market-score/employment-r6-dol-advance-row-readback.mjs";
import {DOL_ETA539_URL} from "../lib/market-score/employment-r4-shadow-provider.mjs";
import {EMPLOYMENT_R4_CORE_STATES,EMPLOYMENT_R4_SHADOW_TABLES} from "../lib/market-score/employment-r4-shadow-contract.mjs";


const GROUP="DOL_UI_WEEKLY_CLAIMS";
const IDS=["INITIAL_CLAIMS","INITIAL_CLAIMS_4W",
  "CONTINUED_CLAIMS","INSURED_UNEMPLOYMENT_RATE"];
const clock=()=>new Date("2026-11-24T14:50:00.000Z");
function runFixture({failureCode=null,includeNational=false,includeState=true}={}){
  const ledger=[],raw=[];
  let releaseCalls=0,groupCalls=0;
  const stateRows=includeState
    ? Array.from({length:51},(_,i)=>({
      logicalSeriesId:"STATE_INITIAL_CLAIMS",geographyType:"STATE",
      geographyCode:String(i).padStart(2,"0"),observationDate:"2026-11-07",
    })):[];
  const nationalRows=includeNational?IDS.map((id,i)=>({
    logicalSeriesId:id,geographyType:"NATIONAL",
    observationDate:i<2?"2026-11-14":"2026-11-07",
  })):[];
  const snapshots=stateRows.length?[{
    releaseGroup:GROUP,provider:"DOL_ETA",requestKey:"DOL_ETA539:112w",
    body:"SYNTHETIC_FIXTURE",
  }]:[];
  if(nationalRows.length)snapshots.unshift({
    releaseGroup:GROUP,provider:"DOL_ETA",
    requestKey:"DOL_ETA538_PDF:2026-11-19",body:"SYNTHETIC_PDF_FIXTURE",
  });
  const store={
    async initialize(){},
    async getLatestRun(){return null},
    async acquire(){return {acquired:true}},
    async release(){releaseCalls++;return true},
    async writeRawSnapshot(snapshot){
      raw.push(snapshot);
      return {snapshotId:"test-"+raw.length,bodySha256:"0".repeat(64),chunkCount:1,noop:false};
    },
    async upsertObservationRows({rows}){
      return {inserted:rows.length,revised:0,noop:0,rejected:0,
        currentRows:rows.length,historyRowsAdded:0,changedSeriesIds:[]};
    },
    async recordRun(row){ledger.push(row);return ledger.length},
  };
  const task=runEmploymentR6CollectionStep({
    db:{prepare(){}},now:clock,mode:"ONE_YEAR",groups:[GROUP],
    // No PC authorisation or provider calls in this isolated test.
    storeFactory:()=>store,
    providerFactory:()=>({async fetchGroup(groupName,options){
      groupCalls++;
      assert.equal(groupName,GROUP);
      assert.equal(options.mode,"ONE_YEAR");
      return {
        rows:[...nationalRows,...stateRows],snapshots,
        requestCount:2,
        missingSeries:[
          ...(includeNational?[]:IDS),
          ...(includeState?[]:["STATE_INITIAL_CLAIMS"]),
        ],
        nationalResponseEvidence:{
          responseFormat:"ETA538_PDF",parsedNationalSeriesCount:nationalRows.length,
          bodySha256:"1".repeat(64),
        },
        ...(failureCode?{partialFailureCode:failureCode}:{}),
      };
    }}),
  });
  return task.then(result=>({result,ledger,raw,groupCalls,get releaseCalls(){return releaseCalls;}}));
}
test("W04 preserve each new ETA538 National PDF failure code through R6 run ledger",async()=>{
  for(const errorCode of [
    "DOL_ETA538_PDF_INVALID",
    "DOL_ETA538_PDF_PIN_MISMATCH",
    "DOL_ETA538_SHAPE_INVALID",
  ]){
    const run=await runFixture({failureCode:errorCode});
    assert.equal(run.result.status,"PARTIAL");
    assert.equal(run.result.providerRequests,2);
    assert.equal(run.result.groupResults[0].failureCode,errorCode);
    assert.equal(run.ledger[0].failureCode,errorCode);
    assert.equal(run.ledger[0].detail.nationalResponseEvidence.responseFormat,"ETA538_PDF");
    assert.deepEqual(run.ledger[0].detail.missingSeries,IDS);
    assert.equal(run.ledger[0].detail.scoreComputed,false);
    assert.equal(run.groupCalls,1);
    assert.equal(run.releaseCalls,1);
    assert.equal(run.raw.length,1,"ETA539 raw survives independent National failure");
  }
});
test("W04 unchanged successful National + 51 state path and legacy error code",async()=>{
  const good=await runFixture({includeNational:true});
  assert.equal(good.result.status,"SUCCESS");
  assert.equal(good.result.providerRequests,2);
  assert.equal(good.result.groupResults[0].failureCode,undefined);
  assert.equal(good.ledger[0].failureCode,null);
  assert.equal(good.ledger[0].collectedRows,55);
  assert.equal(good.raw.length,2);
  assert.equal(good.groupCalls,1);
  assert.equal(good.releaseCalls,1);
  const legacy=await runFixture({failureCode:"DOL_NATIONAL_HTTP_FAILED"});
  assert.equal(legacy.result.groupResults[0].failureCode,"DOL_NATIONAL_HTTP_FAILED");
});


function syntheticallyPublishedPdf(){
  const texts=[
    "Thursday, November 19, 2026","UNEMPLOYMENT INSURANCE WEEKLY CLAIMS",
    "SEASONALLY ADJUSTED DATA",
    "In the week ending November 14, the advance figure for seasonally adjusted ",
    "initial claims was 203,000, an increase of 1,000.",
    "The 4","-","week moving average was 197,750, an increase of 2,000.",
    "The advance seasonally adjusted insured unemployment rate was 1.1 percent for the week ending November 7.",
    "The advance number for seasonally adjusted insured unemployment during the week ending November 7 was 1,763,000.",
  ].map(s=>s.replace(/[()\\]/g,c=>"\\"+c));
  const encoded=deflateSync(Buffer.from("BT\n"+
    texts.map(s=>"[( "+s+" )] TJ").join("\n")+"\nET\n"));
  return Buffer.concat([
    Buffer.from("%PDF-1.7\n1 0 obj\n<</Filter/FlateDecode>>\nstream\n"),
    encoded,Buffer.from("\nendstream\nendobj\n%%EOF\n"),
  ]);
}
test("W04 full ETA538 PDF to R6 SQLite to four-row readback uses two calls and preserves ETA539",async()=>{
  const pdf=syntheticallyPublishedPdf();
  const pdfSha=createHash("sha256").update(pdf).digest("hex");
  const states="ST,RPTDATE,C2,C3\n"+EMPLOYMENT_R4_CORE_STATES
    .map((state,i)=>state+",11/19/2026,11/14/2026,"+(100+i)).join("\n")+"\n";
  const calls=[];
  const fetchImpl=async(url,request)=>{
    calls.push([url,request.method||"GET"]);
    if(url==="https://oui.doleta.gov/press/2026/111926.pdf")
      return {ok:true,status:200,url,
        headers:{get:k=>k==="content-type"?"application/pdf":null},
        arrayBuffer:async()=>pdf};
    if(url===DOL_ETA539_URL)
      return {ok:true,status:200,url,
        headers:{get:k=>k==="content-type"?"text/csv":null},
        arrayBuffer:async()=>Buffer.from(states)};
    throw Error("UNEXPECTED_PROVIDER_CALL");
  };
  const sqlite=new DatabaseSync(":memory:");
  const db={prepare(sql){
    const prepared=sqlite.prepare(sql);
    const bind=(values=[])=>({
      bind(...params){return bind(params)},
      async run(){return prepared.run(...values)},
      async first(){return prepared.get(...values)},
      async all(){return {results:prepared.all(...values)}},
    });
    return bind();
  }};
  const now=()=>new Date("2026-11-24T14:50:00.000Z");
  const sourceConfig={
    releaseDate:"2026-11-19",releaseAt:"2026-11-19T13:30:00.000Z",
    expectedInitialWeekEnd:"2026-11-14",originalPdfSha256:pdfSha,
  };
  try{
    const result=await runEmploymentR6CollectionStep({
      db,fetchImpl,now,mode:"ONE_YEAR",groups:[GROUP],
      storeFactory:createEmploymentR6Store,
      providerFactory:({fetchImpl,now})=>createEmploymentR6DolEta538Provider({
        fetchImpl,now,sourceConfig,
      }),
    });
    assert.equal(result.status,"SUCCESS",JSON.stringify(result));
    assert.equal(result.providerRequests,2);
    assert.deepEqual(calls,[
      ["https://oui.doleta.gov/press/2026/111926.pdf","GET"],
      [DOL_ETA539_URL,"GET"],
    ]);
    const raw=(await db.prepare(
      "SELECT * FROM market_score_employment_r6_raw_snapshot_v1 "+
      "WHERE request_key=? ORDER BY chunk_index"
    ).bind("DOL_ETA538_PDF:2026-11-19").all()).results;
    assert.ok(raw.length>=1);
    const obs=(await db.prepare(
      "SELECT * FROM "+EMPLOYMENT_R4_SHADOW_TABLES.current+
      " WHERE provider='DOL_ETA' AND geography_type='NATIONAL'"
    ).all()).results;
    assert.equal(obs.length,4);
    const verified=verifyDolAdvanceStoredRowLineage({
      rawChunks:raw,observationRows:obs,
      releaseDate:"2026-11-19",expectedInitialWeekEnd:"2026-11-14",
    });
    assert.equal(verified.status,"LINEAGE_VERIFIED",JSON.stringify(verified));
    assert.equal(verified.originalPdfSha256,pdfSha);
    const stateCount=(await db.prepare(
      "SELECT COUNT(*) AS n FROM "+EMPLOYMENT_R4_SHADOW_TABLES.current+
      " WHERE provider='DOL_ETA' AND geography_type='STATE'"
    ).first()).n;
    assert.equal(stateCount,51);
    assert.equal(result.groupResults[0].rawSnapshots,2);
    assert.equal(result.scoreComputed,false);
    assert.equal(result.publicOutput,false);
  }finally{sqlite.close()}
});
