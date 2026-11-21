import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createEmploymentR4ShadowStore } from "../lib/market-score/employment-r4-shadow-store.mjs";
import { inspectStateClaimsPitReconciliation } from "../lib/market-score/employment-r6-claims-pit-recovery.mjs";
import { EMPLOYMENT_R4_PIT_CLASSES, EMPLOYMENT_R4_SHADOW_TABLES } from "../lib/market-score/employment-r4-shadow-contract.mjs";

function sqliteD1(){
  const sqlite=new DatabaseSync(":memory:");
  const db={
    prepare(sql){const prepared=sqlite.prepare(sql);function wrap(values=[]){return{bind(...next){return wrap(next)},async run(){return prepared.run(...values)},async first(){return prepared.get(...values)},async all(){return{results:prepared.all(...values)}}}}return wrap([])},
    async batch(statements){sqlite.exec("BEGIN");try{const out=[];for(const s of statements)out.push(await s.run());sqlite.exec("COMMIT");return out}catch(e){sqlite.exec("ROLLBACK");throw e}},
  };
  return {sqlite,db};
}
const hash=n=>String(n).padStart(64,"a").slice(-64);
function row(overrides={}){return{
  logicalSeriesId:"STATE_INITIAL_CLAIMS",provider:"DOL_ETA",providerSeriesId:"ETA539:C3",geographyType:"STATE",geographyCode:"AL",frequency:"WEEKLY",unit:"CLAIMS_COUNT",seasonalAdjustment:"NOT_ASSERTED",populationCoverage:"STATE_UI_INITIAL_CLAIMS",observationDate:"2026-09-12",releaseDate:null,availableAt:"2026-09-17T12:00:00.000Z",retrievedAt:"2026-09-17T12:00:00.000Z",value:1234,sourceRevision:"ETA539:RPTDATE:2026-09-19",sourceHash:"a".repeat(64),qualityStatus:"READY_CORE_51",pitClass:EMPLOYMENT_R4_PIT_CLASSES.forwardObserved,schemaVersion:1,provenance:{x:1},...overrides};}

test("schema creates employment-owned CURRENT/HISTORY/RUN/LOCK tables",async()=>{
  const {sqlite,db}=sqliteD1();const store=createEmploymentR4ShadowStore(db);await store.initialize();
  const names=sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(x=>x.name);
  for(const name of Object.values(EMPLOYMENT_R4_SHADOW_TABLES))assert.ok(names.includes(name),name);
  sqlite.close();
});

test("same observation is NOOP; revision appends HISTORY; actual zero is valid; null cannot overwrite",async()=>{
  const {sqlite,db}=sqliteD1();const store=createEmploymentR4ShadowStore(db,{now:()=>new Date("2026-09-17T12:00:00Z")});
  const first=await store.upsertRows({rows:[row()]});
  assert.equal(first.inserted,1);assert.equal(first.historyRowsAdded,1);
  const again=await store.upsertRows({rows:[row({retrievedAt:"2026-09-17T13:00:00Z"})],retrievedAt:"2026-09-17T13:00:00Z"});
  assert.equal(again.noop,1);assert.equal(again.historyRowsAdded,0);
  const revised=await store.upsertRows({rows:[row({retrievedAt:"2026-09-18T12:00:00Z",availableAt:"2026-09-18T12:00:00Z",value:0,sourceRevision:"ETA539:RPTDATE:2026-09-20",sourceHash:"b".repeat(64)})],retrievedAt:"2026-09-18T12:00:00Z"});
  assert.equal(revised.revised,1);assert.equal(revised.historyRowsAdded,1);
  const bad=await store.upsertRows({rows:[row({value:null,sourceHash:"c".repeat(64)})]});
  assert.equal(bad.rejected,1);
  const current=await store.getCurrentRows();assert.equal(current.length,1);assert.equal(current[0].value,0);
  const history=await store.getHistoryRows();assert.equal(history.length,2);assert.deepEqual(history.map(x=>x.change_type),["INSERT","UPDATE"]);
  sqlite.close();
});

test("FORWARD pit class is never downgraded by later current-vintage refresh",async()=>{
  const {sqlite,db}=sqliteD1();const store=createEmploymentR4ShadowStore(db);
  await store.upsertRows({rows:[row()]});
  const out=await store.upsertRows({rows:[row({pitClass:EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentOrRevised,retrievedAt:"2026-09-19T00:00:00Z"})],retrievedAt:"2026-09-19T00:00:00Z"});
  assert.equal(out.noop,1);
  const current=await store.getCurrentRows();assert.equal(current[0].pit_class,EMPLOYMENT_R4_PIT_CLASSES.forwardObserved);
  sqlite.close();
});

test("retrieval/availableAt/response-provenance-only changes stay NOOP and preserve first-known availability",async()=>{
  const {sqlite,db}=sqliteD1();const store=createEmploymentR4ShadowStore(db);
  const original=row({availableAt:"2026-09-17T12:00:00Z",retrievedAt:"2026-09-17T12:00:00Z",provenance:{responseHash:"a".repeat(64),rawRecordHash:"1".repeat(64)}});
  await store.upsertRows({rows:[original],retrievedAt:original.retrievedAt});
  const beforeHistory=(await store.getHistoryRows()).length;
  const out=await store.upsertRows({rows:[row({
    availableAt:"2026-09-18T12:00:00Z",
    retrievedAt:"2026-09-18T12:00:00Z",
    provenance:{responseHash:"b".repeat(64),rawRecordHash:"1".repeat(64)}
  })],retrievedAt:"2026-09-18T12:00:00Z"});
  assert.equal(out.noop,1);
  assert.equal(out.revised,0);
  assert.equal((await store.getHistoryRows()).length,beforeHistory);
  const current=(await store.getCurrentRows())[0];
  assert.equal(current.available_at,"2026-09-17T12:00:00Z");
  assert.equal(current.retrieved_at,"2026-09-18T12:00:00Z");
  sqlite.close();
});

test("latestRun returns newest run and supports status filter",async()=>{
  const {sqlite,db}=sqliteD1();const store=createEmploymentR4ShadowStore(db);
  await store.recordRun({runId:"r1",provider:"EMPLOYMENT_R4_SHADOW",collectorRevision:"R1",status:"FAIL",startedAt:"2026-09-20T00:00:00Z",completedAt:"2026-09-20T00:01:00Z",detail:{}});
  await store.recordRun({runId:"r2",provider:"EMPLOYMENT_R4_SHADOW",collectorRevision:"R1",status:"SUCCESS",startedAt:"2026-09-21T00:00:00Z",completedAt:"2026-09-21T00:01:00Z",detail:{}});
  assert.equal((await store.latestRun()).run_id,"r2");
  assert.equal((await store.latestRun({status:"FAIL"})).run_id,"r1");
  sqlite.close();
});

test("PIT-06-03 replay of identical stored state Claims is NOOP without duplicate History revisions",async()=>{
  const {sqlite,db}=sqliteD1();
  try{
    const store=createEmploymentR4ShadowStore(db);
    const original=row({
      pitClass:EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentOrRevised,
      availableAt:null,retrievedAt:"2026-11-09T09:00:00Z",
      sourceRevision:"ETA539:RPTDATE:2026-11-07",
    });
    const initial=await store.upsertRows({rows:[original],retrievedAt:original.retrievedAt});
    assert.deepEqual([initial.inserted,initial.revised,initial.noop,initial.historyRowsAdded],[1,0,0,1]);
    const firstHistory=(await store.getHistoryRows())[0];
    const before=structuredClone(firstHistory);
    for(const [retrievedAt,parserRun] of [
      ["2026-11-10T09:00:00Z","RUN_A"],
      ["2026-11-11T09:00:00Z","RUN_B"],
    ]){
      const replay=await store.upsertRows({rows:[{
        ...original,retrievedAt,availableAt:retrievedAt,
        provenance:{parserRun,rawRecordHash:"a".repeat(64)},
      }],retrievedAt});
      assert.deepEqual([replay.inserted,replay.revised,replay.noop,replay.historyRowsAdded],[0,0,1,0]);
    }
    assert.deepEqual(await store.getHistoryRows(),[before]);
    const audit=inspectStateClaimsPitReconciliation({
      currentRows:await store.getCurrentRows(),
      historyRows:await store.getHistoryRows(),
      asOfIso:"2026-11-16T14:00:00Z",
    });
    assert.equal(audit.status,"CURRENT_HISTORY_MATCHED");
    assert.equal(audit.historyMatchedKeys,1);
    assert.equal(audit.missingHistoryKeys,0);
    assert.equal(audit.duplicateCurrentKeys,0);
    assert.equal(audit.repairAuthorized,false);
    assert.equal(audit.operationalWrites,0);

    // One genuine provider revision creates one append-only event, not one per poll.
    const revised={...original,value:1235,sourceHash:"b".repeat(64),
      sourceRevision:"ETA539:RPTDATE:2026-11-14",
      retrievedAt:"2026-11-12T09:00:00Z"};
    const one=await store.upsertRows({rows:[revised],retrievedAt:revised.retrievedAt});
    const two=await store.upsertRows({rows:[{...revised,
      retrievedAt:"2026-11-13T09:00:00Z",
      provenance:{parserRun:"REPLAY_AFTER_REVISION"},
    }],retrievedAt:"2026-11-13T09:00:00Z"});
    assert.deepEqual([one.inserted,one.revised,one.noop,one.historyRowsAdded],[0,1,0,1]);
    assert.deepEqual([two.inserted,two.revised,two.noop,two.historyRowsAdded],[0,0,1,0]);
    const history=await store.getHistoryRows();
    assert.equal(history.length,2);
    assert.deepEqual(history.map(r=>r.change_type),["INSERT","UPDATE"]);
    assert.deepEqual(history.map(r=>r.value),[1234,1235]);
    const end=inspectStateClaimsPitReconciliation({
      currentRows:await store.getCurrentRows(),historyRows:history,
      asOfIso:"2026-11-16T14:00:00Z",
    });
    assert.equal(end.status,"CURRENT_HISTORY_MATCHED");
    assert.equal(end.revisionDisagreements,0);
    assert.equal(end.repairAuthorized,false);
  }finally{sqlite.close();}
});

test("PIT-06-03 absent History stays missing on ordinary replay; no synthetic repair or repeated INSERT",async()=>{
  const {sqlite,db}=sqliteD1();
  try{
    const store=createEmploymentR4ShadowStore(db);
    const originals=["AL","AK"].map(geographyCode=>row({
      geographyCode,pitClass:EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentOrRevised,
      availableAt:null,retrievedAt:"2026-11-09T09:00:00Z",
      sourceRevision:"ETA539:RPTDATE:2026-11-07",
    }));
    const initial=await store.upsertRows({rows:originals,retrievedAt:"2026-11-09T09:00:00Z"});
    assert.equal(initial.historyRowsAdded,2);
    // Simulate the known Core CURRENT/HISTORY gap in an isolated :memory: DB.
    // This is not a History repair and is never run on the operating PC.
    sqlite.prepare(`DELETE FROM ${EMPLOYMENT_R4_SHADOW_TABLES.history} WHERE geography_code=?`).run("AK");
    assert.equal((await store.getHistoryRows()).length,1);
    for(const retrievedAt of ["2026-11-10T09:00:00Z","2026-11-11T09:00:00Z"]){
      const out=await store.upsertRows({rows:originals.map(x=>({...x,retrievedAt,
        provenance:{parserRun:retrievedAt}})),retrievedAt});
      assert.deepEqual([out.inserted,out.revised,out.noop,out.historyRowsAdded],[0,0,2,0]);
      assert.equal((await store.getHistoryRows()).length,1);
    }
    const audit=inspectStateClaimsPitReconciliation({
      currentRows:await store.getCurrentRows(),
      historyRows:await store.getHistoryRows(),
      asOfIso:"2026-11-16T14:00:00Z",
    });
    assert.equal(audit.currentKnownKeys,2);
    assert.equal(audit.historyMatchedKeys,1);
    assert.equal(audit.missingHistoryKeys,1);
    assert.equal(audit.metadataEligibleMissingKeys,1);
    assert.equal(audit.duplicateCurrentKeys,0);
    assert.equal(audit.status,"REVIEW_MISSING_HISTORY");
    assert.equal(audit.repairAuthorized,false);
    assert.equal(audit.promotionApproved,false);
    assert.equal(audit.operationalWrites,0);
  }finally{sqlite.close();}
});
