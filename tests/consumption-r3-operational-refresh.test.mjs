import test from "node:test";
import assert from "node:assert/strict";
import {
  runConsumptionR3OperationalRefresh,
  C1_R3_OPERATIONAL_REFRESH_CONTRACT,
} from "../worker/consumption-r3-operational-refresh.mjs";
import {
  latestCompletedQuarter,
  sourcePlanForQuarter,
} from "../worker/consumption-r3-provider-collector.mjs";

import {C1_R3_REQUIRED_SOURCE_KEYS} from "../lib/market-score/consumption-r3-operational-config.mjs";
import {
  sourceKeysMissingForScoreDate,
  loadCompleteConsumptionR3Fixture,
  listCompleteConsumptionR3Fixtures,
} from "../worker/consumption-r3-source-store.mjs";

const fakeDb={prepare(){return{};}};

test("2026-09-27 stays on completed 2026-Q2 and does not collect",async()=>{
  assert.deepEqual(latestCompletedQuarter("2026-09-27"),{
    quarter:"2026-Q2",scoreDate:"2026-06-30",year:2026,q:2,
  });
  let calls=0;
  const r=await runConsumptionR3OperationalRefresh({
    env:{DB:fakeDb},
    asOf:"2026-09-27",
    dependencies:{
      collectSources:async()=>{calls++;throw new Error("SHOULD_NOT_COLLECT");},
    },
  });
  assert.equal(r.status,"SKIPPED_BASELINE_CURRENT");
  assert.equal(r.providerRequests,0);
  assert.equal(calls,0);
});

test("complete future score skips provider collection",async()=>{
  let calls=0;
  const r=await runConsumptionR3OperationalRefresh({
    env:{DB:fakeDb},
    asOf:"2026-10-01",
    dependencies:{
      hasCompleteCalculation:async()=>true,
      collectSources:async()=>{calls++;throw new Error("SHOULD_NOT_COLLECT");},
    },
  });
  assert.equal(r.status,"SKIPPED_SCORE_ALREADY_COMPLETE");
  assert.equal(calls,0);
});

test("future refresh stores at most 10 sources per invocation and calculates on final batch",async()=>{
  let missing=[...C1_R3_REQUIRED_SOURCE_KEYS.slice(0,23)],stored=[],refreshed=0;
  const deps={
    hasCompleteCalculation:async()=>false,
    sourceKeysMissing:async()=>[...missing],
    claimBatch:async()=>true,
    finishClaim:async()=>{},
    collectSources:async({sourceKeys})=>({
      scoreComputed:false,
      providerRequests:sourceKeys.length,
      payloads:Object.fromEntries(sourceKeys.map(k=>[k,{provider:"TEST"}])),
      sourceUrls:Object.fromEntries(sourceKeys.map(k=>[k,"https://example.invalid"])),
    }),
    persistSources:async(_db,{payloads})=>{
      const keys=Object.keys(payloads);
      stored.push(keys.length);
      missing=missing.filter(k=>!keys.includes(k));
      return {status:"STORED"};
    },
    refreshFromStored:async()=>{
      refreshed++;
      return {status:"CALCULATED_AND_STORED",calculated:true,flat7:55,rowsWritten:95};
    },
  };

  const a=await runConsumptionR3OperationalRefresh({env:{DB:fakeDb},asOf:"2026-10-01",dependencies:deps});
  const b=await runConsumptionR3OperationalRefresh({env:{DB:fakeDb},asOf:"2026-10-01",dependencies:deps});
  const c=await runConsumptionR3OperationalRefresh({env:{DB:fakeDb},asOf:"2026-10-01",dependencies:deps});
  assert.deepEqual(stored,[10,10,3]);
  assert.equal(a.calculated,false);
  assert.equal(b.calculated,false);
  assert.equal(c.calculated,true);
  assert.equal(c.flat7,55);
  assert.equal(refreshed,1);
});

test("runtime contract is background-only and bounded",()=>{
  assert.equal(C1_R3_OPERATIONAL_REFRESH_CONTRACT.trigger,"PUBLIC_MARKET_SCORE_WAITUNTIL");
  assert.equal(C1_R3_OPERATIONAL_REFRESH_CONTRACT.maxProviderSourcesPerInvocation,10);
  assert.equal(C1_R3_OPERATIONAL_REFRESH_CONTRACT.calculation,"STORED_SOURCE_ONLY");
  assert.equal(C1_R3_OPERATIONAL_REFRESH_CONTRACT.responsePathIndependent,true);
});


test("fresh D1 initializes C1 source tables before the first future-quarter read",async()=>{
  let sourceTable=false,indexReady=false;
  const db={
    prepare(sql){
      return {
        sql,
        bind(...args){
          return {
            async all(){
              if(sql.includes("FROM c1_r3_source_snapshots_v1")&&!sourceTable){
                throw new Error("no such table: c1_r3_source_snapshots_v1");
              }
              if(sql.includes("SELECT source_key FROM c1_r3_source_snapshots_v1"))return {results:[]};
              if(sql.includes("SELECT source_key,payload_json,quarter"))return {results:[]};
              if(sql.includes("SELECT score_date,COUNT(*) AS row_count"))return {results:[]};
              return {results:[]};
            }
          };
        }
      };
    },
    async batch(stmts){
      for(const st of stmts){
        const sql=st?.sql??"";
        if(sql.includes("CREATE TABLE IF NOT EXISTS c1_r3_source_snapshots_v1"))sourceTable=true;
        if(sql.includes("CREATE INDEX IF NOT EXISTS c1_r3_source_snapshots_lookup_v1"))indexReady=true;
      }
      return stmts.map(()=>({meta:{changes:0}}));
    }
  };

  const missing=await sourceKeysMissingForScoreDate(db,{scoreDate:"2026-09-30"});
  assert.equal(sourceTable,true);
  assert.equal(indexReady,true);
  assert.equal(missing.length,C1_R3_REQUIRED_SOURCE_KEYS.length);

  const fx=await loadCompleteConsumptionR3Fixture(db,{scoreDate:"2026-09-30"});
  assert.equal(fx,null);

  const list=await listCompleteConsumptionR3Fixtures(db,{throughScoreDate:"2026-09-30"});
  assert.deepEqual(list,[]);
});
