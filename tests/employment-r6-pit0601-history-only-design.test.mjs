import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {createEmploymentR4ShadowStore} from "../lib/market-score/employment-r4-shadow-store.mjs";
import {
  EMPLOYMENT_R4_PIT_CLASSES,
  EMPLOYMENT_R4_SHADOW_TABLES,
} from "../lib/market-score/employment-r4-shadow-contract.mjs";

// PIT-06-01: SOURCE-ONLY, SYNTHETIC IN-MEMORY TRANSACTION DESIGN FIXTURE.
// This function is deliberately private to tests: it must never run against
// a real PC DB. A fabricated test proof is not raw lineage attestation,
// a signed keyset, an operations manifest, or a B-grade approval.
const T=EMPLOYMENT_R4_SHADOW_TABLES;
const SHA=/^[a-f0-9]{64}$/i;
const utc="2026-11-19T10:00:00.000Z";
const series="STATE_INITIAL_CLAIMS";
const iso=value=>typeof value==="string"&&Number.isFinite(Date.parse(value));
const keyOf=x=>[series,"STATE",x.geographyCode,x.observationDate].join("|");

function sqliteD1(){
  const sqlite=new DatabaseSync(":memory:");
  const db={
    prepare(sql){
      const prepared=sqlite.prepare(sql);
      const wrap=(values=[])=>({
        bind(...next){return wrap(next);},
        async run(){return prepared.run(...values);},
        async first(){return prepared.get(...values);},
        async all(){return {results:prepared.all(...values)};},
      });
      return wrap();
    },
    async batch(statements){
      sqlite.exec("BEGIN");
      try{
        const out=[];
        for(const s of statements)out.push(await s.run());
        sqlite.exec("COMMIT");
        return out;
      }catch(error){sqlite.exec("ROLLBACK");throw error;}
    },
  };
  return {sqlite,db};
}
const row=(geo)=>({
  logicalSeriesId:series,geographyType:"STATE",geographyCode:geo,
  observationDate:"2026-11-07",provider:"DOL_ETA",
  providerSeriesId:"ETA539:C3",frequency:"WEEKLY",
  value:geo==="AK"?0:1099,unit:"CLAIMS_COUNT",
  sourceHash:"a".repeat(64),
  sourceRevision:"ETA539:RPTDATE:2026-11-07",
  qualityStatus:"READY_CORE_51",
  pitClass:EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentOrRevised,
  schemaVersion:1,provenance:{parser:"ETA539",truePitAsserted:false},
  availableAt:null,retrievedAt:"2026-11-10T09:00:00.000Z",
});
async function seeded(){
  const {sqlite,db}=sqliteD1();
  const store=createEmploymentR4ShadowStore(db);
  await store.upsertRows({rows:["AL","AK","AZ"].map(row),
    retrievedAt:"2026-11-10T09:00:00.000Z"});
  return {sqlite,store};
}
const selectFromCurrent=(sqlite,geo)=>{
  const r=sqlite.prepare("SELECT * FROM "+T.current+" WHERE geography_code=?").get(geo);
  return {geographyCode:geo,observationDate:r.observation_date,
    expectedSourceHash:r.source_hash,expectedValue:r.value,
    expectedRetrievedAt:r.retrieved_at,
    expectedProvenanceJson:r.provenance_json};
};
const fixtureProof=(x)=>({
  rawLineageSimulated:true,rawSnapshotSha256:"f".repeat(64),
  sourceHash:x.expectedSourceHash,
});

// Design-only SQL: the future separately approved B would need actual signed
// proof, real preimage checks, lock/lease, WAL-consistent backup and readback.
// These synthetic booleans NEVER grant operational permission.
function simulateMissingHistoryOnly(sqlite,{selected=[],proofs=new Map(),
  recordedAt=utc}={}){
  if(!selected.length)return {status:"NO_APPROVED_KEYS_SIMULATED",inserted:0,unchanged:0};
  if(!iso(recordedAt))throw Error("DESIGN_RECORDING_TIME_INVALID");
  const seen=new Set();
  let inserted=0,unchanged=0;
  sqlite.exec("BEGIN IMMEDIATE");
  try{
    for(const x of selected){
      if(!x||!["AL","AK","AZ"].includes(x.geographyCode)
        ||x.observationDate!=="2026-11-07"
        ||!SHA.test(x.expectedSourceHash??"")
        ||!Number.isSafeInteger(x.expectedValue)||x.expectedValue<0
        ||!iso(x.expectedRetrievedAt)
        ||Date.parse(x.expectedRetrievedAt)>Date.parse(recordedAt)
        ||typeof x.expectedProvenanceJson!=="string"){
        throw Error("DESIGN_SCOPE_INVALID");
      }
      const k=keyOf(x);
      if(seen.has(k))throw Error("DESIGN_DUPLICATE_SELECTED_KEY");
      seen.add(k);
      const proof=proofs.get(k);
      if(proof?.rawLineageSimulated!==true
        ||!SHA.test(proof.rawSnapshotSha256??"")
        ||proof.sourceHash!==x.expectedSourceHash){
        throw Error("DESIGN_RAW_SOURCE_NOT_VERIFIED");
      }
      const current=sqlite.prepare("SELECT * FROM "+T.current+
        " WHERE logical_series_id=? AND geography_type=? AND geography_code=? AND observation_date=?")
        .all(series,"STATE",x.geographyCode,x.observationDate);
      if(current.length!==1)throw Error("DESIGN_CURRENT_PREIMAGE_CHANGED");
      const c=current[0];
      if(c.provider!=="DOL_ETA"||c.provider_series_id!=="ETA539:C3"
        ||c.frequency!=="WEEKLY"||c.quality_status!=="READY_CORE_51"
        ||c.pit_class!==EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentOrRevised
        ||c.value!==x.expectedValue||c.source_hash!==x.expectedSourceHash
        ||c.retrieved_at!==x.expectedRetrievedAt
        ||c.provenance_json!==x.expectedProvenanceJson){
        throw Error("DESIGN_CURRENT_PREIMAGE_CHANGED");
      }
      const prior=sqlite.prepare("SELECT * FROM "+T.history+
        " WHERE logical_series_id=? AND geography_type=? AND geography_code=? AND observation_date=?")
        .all(series,"STATE",x.geographyCode,x.observationDate);
      if(prior.length){
        // Never reinterpret an older/conflicting event as proof of a repair.
        if(prior.length!==1||prior[0].value!==c.value
          ||prior[0].source_hash!==c.source_hash
          ||prior[0].provider!==c.provider
          ||prior[0].pit_class!==c.pit_class
          ||prior[0].retrieved_at!==c.retrieved_at
          ||prior[0].provenance_json!==c.provenance_json){
          throw Error("DESIGN_EXISTING_HISTORY_CONFLICT");
        }
        unchanged++;continue;
      }
      const changed=sqlite.prepare(
        "INSERT INTO "+T.history+" ("+
        "logical_series_id,provider,provider_series_id,geography_type,geography_code,"+
        "frequency,unit,seasonal_adjustment,population_coverage,observation_date,"+
        "release_date,available_at,retrieved_at,value,source_revision,source_hash,"+
        "quality_status,pit_class,schema_version,provenance_json,change_type,recorded_at) "+
        "SELECT c.logical_series_id,c.provider,c.provider_series_id,c.geography_type,"+
        "c.geography_code,c.frequency,c.unit,c.seasonal_adjustment,c.population_coverage,"+
        "c.observation_date,c.release_date,c.available_at,c.retrieved_at,c.value,"+
        "c.source_revision,c.source_hash,c.quality_status,c.pit_class,c.schema_version,"+
        "c.provenance_json,'INSERT',? FROM "+T.current+" c "+
        "WHERE c.logical_series_id=? AND c.geography_type=? AND c.geography_code=? "+
        "AND c.observation_date=? AND c.value=? AND c.source_hash=? "+
        "AND c.retrieved_at=? AND c.provenance_json=? "+
        "AND NOT EXISTS (SELECT 1 FROM "+T.history+" h WHERE "+
        "h.logical_series_id=c.logical_series_id AND h.geography_type=c.geography_type "+
        "AND h.geography_code=c.geography_code AND h.observation_date=c.observation_date)"
      ).run(recordedAt,series,"STATE",x.geographyCode,x.observationDate,
        x.expectedValue,x.expectedSourceHash,x.expectedRetrievedAt,x.expectedProvenanceJson);
      if(changed.changes!==1)throw Error("DESIGN_INSERT_CAS_FAILED");
      inserted++;
    }
    sqlite.exec("COMMIT");
  }catch(error){sqlite.exec("ROLLBACK");throw error;}
  return {status:"SYNTHETIC_TRANSACTION_ONLY",inserted,unchanged};
}

test("PIT-06-01 has zero executable selected keys without approved raw evidence",async()=>{
  const {sqlite}=await seeded();
  try{
    const totalBefore=sqlite.prepare("SELECT total_changes() AS changes").get().changes;
    const currentBefore=sqlite.prepare("SELECT * FROM "+T.current).all();
    const historyBefore=sqlite.prepare("SELECT * FROM "+T.history).all();
    const result=simulateMissingHistoryOnly(sqlite);
    assert.deepEqual(result,{status:"NO_APPROVED_KEYS_SIMULATED",inserted:0,unchanged:0});
    assert.equal(sqlite.prepare("SELECT total_changes() AS changes").get().changes,totalBefore);
    assert.deepEqual(sqlite.prepare("SELECT * FROM "+T.current).all(),currentBefore);
    assert.deepEqual(sqlite.prepare("SELECT * FROM "+T.history).all(),historyBefore);
  }finally{sqlite.close();}
});

test("PIT-06-01 synthetic missing-only insert preserves current, old history and true recording time",async()=>{
  const {sqlite}=await seeded();
  try{
    // Set up an artificial gap in :memory:, never on an operating database.
    sqlite.prepare("DELETE FROM "+T.history+" WHERE geography_code=?").run("AK");
    const currentBefore=sqlite.prepare("SELECT * FROM "+T.current+" ORDER BY geography_code").all();
    const oldHistory=sqlite.prepare("SELECT * FROM "+T.history+" ORDER BY history_id").all();
    const chosen=selectFromCurrent(sqlite,"AK");
    const proofs=new Map([[keyOf(chosen),fixtureProof(chosen)]]);
    const first=simulateMissingHistoryOnly(sqlite,{selected:[chosen],proofs});
    assert.deepEqual(first,{status:"SYNTHETIC_TRANSACTION_ONLY",inserted:1,unchanged:0});
    const repaired=sqlite.prepare("SELECT * FROM "+T.history+" WHERE geography_code='AK'").get();
    assert.equal(repaired.value,0);
    assert.equal(repaired.recorded_at,utc);
    assert.equal(repaired.change_type,"INSERT");
    assert.equal(repaired.available_at,null);
    assert.equal(repaired.pit_class,EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentOrRevised);
    assert.deepEqual(sqlite.prepare("SELECT * FROM "+T.current+" ORDER BY geography_code").all(),currentBefore);
    assert.deepEqual(sqlite.prepare("SELECT * FROM "+T.history+" WHERE geography_code!='AK' ORDER BY history_id").all(),oldHistory);
    const second=simulateMissingHistoryOnly(sqlite,{selected:[chosen],proofs});
    assert.deepEqual(second,{status:"SYNTHETIC_TRANSACTION_ONLY",inserted:0,unchanged:1});
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM "+T.history+" WHERE geography_code='AK'").get().n,1);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM "+T.runs).get().n,0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM "+T.lock).get().n,0);
  }finally{sqlite.close();}
});

test("PIT-06-01 no synthetic proof or drifted CURRENT preimage can authorize insertion",async()=>{
  const {sqlite}=await seeded();
  try{
    sqlite.prepare("DELETE FROM "+T.history+" WHERE geography_code=?").run("AK");
    const chosen=selectFromCurrent(sqlite,"AK");
    const historyBefore=sqlite.prepare("SELECT * FROM "+T.history).all();
    assert.throws(()=>simulateMissingHistoryOnly(sqlite,{selected:[chosen]}),
      /DESIGN_RAW_SOURCE_NOT_VERIFIED/);
    const proofs=new Map([[keyOf(chosen),fixtureProof(chosen)]]);
    sqlite.prepare("UPDATE "+T.current+" SET source_hash=? WHERE geography_code=?")
      .run("b".repeat(64),"AK");
    assert.throws(()=>simulateMissingHistoryOnly(sqlite,{selected:[chosen],proofs}),
      /DESIGN_CURRENT_PREIMAGE_CHANGED/);
    assert.deepEqual(sqlite.prepare("SELECT * FROM "+T.history).all(),historyBefore);
    assert.equal(sqlite.isTransaction,false);
  }finally{sqlite.close();}
});

test("PIT-06-01 two-key synthetic batch rolls back its first insert on second-key conflict",async()=>{
  const {sqlite}=await seeded();
  try{
    sqlite.prepare("DELETE FROM "+T.history+" WHERE geography_code IN ('AL','AK')").run();
    const a=selectFromCurrent(sqlite,"AL"),b=selectFromCurrent(sqlite,"AK");
    const proofs=new Map([[keyOf(a),fixtureProof(a)],[keyOf(b),fixtureProof(b)]]);
    const historyBefore=sqlite.prepare("SELECT * FROM "+T.history).all();
    sqlite.prepare("UPDATE "+T.current+" SET value=? WHERE geography_code=?").run(999,"AK");
    assert.throws(()=>simulateMissingHistoryOnly(sqlite,{selected:[a,b],proofs}),
      /DESIGN_CURRENT_PREIMAGE_CHANGED/);
    assert.deepEqual(sqlite.prepare("SELECT * FROM "+T.history).all(),historyBefore);
    assert.equal(sqlite.isTransaction,false);
    const repeat=[a,a];
    assert.throws(()=>simulateMissingHistoryOnly(sqlite,{selected:repeat,proofs}),
      /DESIGN_DUPLICATE_SELECTED_KEY/);
    assert.deepEqual(sqlite.prepare("SELECT * FROM "+T.history).all(),historyBefore);
  }finally{sqlite.close();}
});
