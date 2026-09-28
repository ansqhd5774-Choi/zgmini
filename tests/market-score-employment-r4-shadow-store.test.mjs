import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createEmploymentR4ShadowStore } from "../lib/market-score/employment-r4-shadow-store.mjs";
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
