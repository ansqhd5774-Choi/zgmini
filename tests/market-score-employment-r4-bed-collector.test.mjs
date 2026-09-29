import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  collectEmploymentR4BedShadow,
  EMPLOYMENT_R4_BED_COLLECTOR_CONTRACT,
} from "../lib/market-score/employment-r4-bed-collector.mjs";
import {
  EMPLOYMENT_R4_BED_SERIES_IDS,
} from "../lib/market-score/employment-r4-bed-provider.mjs";
import {
  EMPLOYMENT_R4_PIT_CLASSES,
  EMPLOYMENT_R4_SHADOW_TABLES,
} from "../lib/market-score/employment-r4-shadow-contract.mjs";

function sqliteD1(){
  const sqlite=new DatabaseSync(":memory:");
  const db={prepare(sql){const p=sqlite.prepare(sql);function w(values=[]){return{bind(...n){return w(n)},async run(){return p.run(...values)},async first(){return p.get(...values)},async all(){return{results:p.all(...values)}}}}return w([])},async batch(ss){sqlite.exec("BEGIN");try{const r=[];for(const s of ss)r.push(await s.run());sqlite.exec("COMMIT");return r}catch(e){sqlite.exec("ROLLBACK");throw e}}};
  return{sqlite,db};
}
function rowsFor(dates,revision=0){
  const rows=[];
  for(const [si,id] of EMPLOYMENT_R4_BED_SERIES_IDS.entries()){
    for(const [di,date] of dates.entries()){
      rows.push({
        logicalSeriesId:`BED_RAW_${si}`,
        provider:"BLS_BED",
        providerSeriesId:id,
        geographyType:"BED_TEST",
        geographyCode:String(si),
        frequency:"QUARTERLY",
        unit:"TEST",
        seasonalAdjustment:"SA",
        populationCoverage:"TEST",
        observationDate:date,
        releaseDate:null,
        availableAt:null,
        retrievedAt:"2026-10-28T13:00:00Z",
        value:100+si+di+revision,
        sourceRevision:revision?`R${revision}`:null,
        sourceHash:(revision?"b":"a").repeat(64),
        qualityStatus:"READY_BED",
        pitClass:EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentVintage,
        schemaVersion:1,
        provenance:{},
      });
    }
  }
  return rows;
}
function provider(rows,missing=[]){
  return {async fetchBedQuarterly(){return{rows,requestCount:5,retrievedAt:"2026-10-28T13:00:00Z",meta:{missingSeries:missing}}}};
}

test("first BED collection establishes historical baseline and never fabricates forward PIT",async()=>{
  const {sqlite,db}=sqliteD1();let tick=0;const now=()=>new Date(`2026-10-28T13:00:0${tick++}Z`);
  const out=await collectEmploymentR4BedShadow({db,provider:provider(rowsFor(["2025-09-30","2025-12-31"])),now});
  assert.equal(out.status,"SUCCESS");
  assert.equal(out.providerRequests,5);
  assert.equal(out.forwardRows,0);
  assert.equal(out.inserted,228);
  const f=sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.current} WHERE pit_class=?`).get(EMPLOYMENT_R4_PIT_CLASSES.forwardObserved).n;
  assert.equal(f,0);
  sqlite.close();
});

test("repeat BED collection is NOOP and does not create false forward revisions",async()=>{
  const {sqlite,db}=sqliteD1();let tick=0;const now=()=>new Date(`2026-10-28T13:01:0${tick++}Z`);
  const rows=rowsFor(["2025-09-30","2025-12-31"]);
  const a=await collectEmploymentR4BedShadow({db,provider:provider(rows),now});
  const h1=sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.history}`).get().n;
  const b=await collectEmploymentR4BedShadow({db,provider:provider(rows),now});
  const h2=sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.history}`).get().n;
  assert.equal(a.forwardRows,0);
  assert.equal(b.forwardRows,0);
  assert.equal(b.noop,228);
  assert.equal(h2,h1);
  sqlite.close();
});

test("only a newly observed quarter after baseline is promoted to forward PIT",async()=>{
  const {sqlite,db}=sqliteD1();let tick=0;const now=()=>new Date(`2026-10-28T13:02:0${tick++}Z`);
  await collectEmploymentR4BedShadow({db,provider:provider(rowsFor(["2025-09-30","2025-12-31"])),now});
  const out=await collectEmploymentR4BedShadow({db,provider:provider(rowsFor(["2025-09-30","2025-12-31","2026-03-31"])),now});
  assert.equal(out.forwardRows,114);
  assert.equal(out.inserted,114);
  assert.equal(out.revised,0);
  const old=sqlite.prepare(`SELECT pit_class FROM ${EMPLOYMENT_R4_SHADOW_TABLES.current} WHERE provider_series_id=? AND observation_date='2025-12-31'`).get(EMPLOYMENT_R4_BED_SERIES_IDS[0]);
  assert.equal(old.pit_class,EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentVintage);
  sqlite.close();
});

test("partial missing-series response writes valid rows but reports PARTIAL",async()=>{
  const {sqlite,db}=sqliteD1();let tick=0;const now=()=>new Date(`2026-10-28T13:03:0${tick++}Z`);
  const missing=[EMPLOYMENT_R4_BED_SERIES_IDS.at(-1)];
  const rows=rowsFor(["2025-12-31"]).filter(r=>r.providerSeriesId!==missing[0]);
  const out=await collectEmploymentR4BedShadow({db,provider:provider(rows,missing),now});
  assert.equal(out.status,"PARTIAL");
  assert.equal(out.missingSeries.length,1);
  assert.equal(out.scoreComputed,false);
  sqlite.close();
});

test("BED collector remains separate, store-only, and does not alter public score",()=>{
  assert.equal(EMPLOYMENT_R4_BED_COLLECTOR_CONTRACT.separateQuarterlyLane,true);
  assert.equal(EMPLOYMENT_R4_BED_COLLECTOR_CONTRACT.tableReuse,true);
  assert.equal(EMPLOYMENT_R4_BED_COLLECTOR_CONTRACT.storeOnly,true);
  assert.equal(EMPLOYMENT_R4_BED_COLLECTOR_CONTRACT.scoreComputed,false);
  assert.equal(EMPLOYMENT_R4_BED_COLLECTOR_CONTRACT.publicScoreWiring,false);
});
