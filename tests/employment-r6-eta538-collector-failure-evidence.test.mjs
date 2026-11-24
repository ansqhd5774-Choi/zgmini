import test from "node:test";
import assert from "node:assert/strict";
import {runEmploymentR6CollectionStep} from "../lib/market-score/employment-r6-collector.mjs";

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
