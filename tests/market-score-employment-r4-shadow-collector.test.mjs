import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { collectEmploymentR4Shadow } from "../lib/market-score/employment-r4-shadow-collector.mjs";
import { parseEta539ShadowRows, parseBlsDiffusionShadowRows } from "../lib/market-score/employment-r4-shadow-provider.mjs";
import { EMPLOYMENT_R4_CORE_STATES, EMPLOYMENT_R4_DIFFUSION_SERIES, EMPLOYMENT_R4_PIT_CLASSES, EMPLOYMENT_R4_SHADOW_TABLES } from "../lib/market-score/employment-r4-shadow-contract.mjs";

function sqliteD1(){
  const sqlite=new DatabaseSync(":memory:");
  const db={prepare(sql){const p=sqlite.prepare(sql);function w(values=[]){return{bind(...n){return w(n)},async run(){return p.run(...values)},async first(){return p.get(...values)},async all(){return{results:p.all(...values)}}}}return w([])},async batch(ss){sqlite.exec("BEGIN");try{const r=[];for(const s of ss)r.push(await s.run());sqlite.exec("COMMIT");return r}catch(e){sqlite.exec("ROLLBACK");throw e}}};
  return{sqlite,db};
}
function claimsCsv(){
  const lines=["st,rptdate,c1,c2,c3,c8"];
  for(const [wi,date] of [[1,"09/05/2026"],[2,"09/12/2026"]])for(let i=0;i<EMPLOYMENT_R4_CORE_STATES.length;i++)lines.push(`${EMPLOYMENT_R4_CORE_STATES[i]},09/19/2026,${wi},${date},${1000+i+wi},9000`);
  lines.push("PR,09/19/2026,2,09/12/2026,9999,9999");
  return lines.join("\n");
}
function blsPayload(){return{Results:{series:Object.entries(EMPLOYMENT_R4_DIFFUSION_SERIES).map(([seriesID],idx)=>({seriesID,data:[{year:"2026",period:"M08",value:String(55+idx),footnotes:[]},{year:"2026",period:"M07",value:String(50+idx),footnotes:[]}]}))}}}

test("provider parsers preserve 51-state core and mark only latest provider observation FORWARD",async()=>{
  const rt="2026-09-20T00:00:00.000Z";
  const c=await parseEta539ShadowRows(claimsCsv(),{retrievedAt:rt,historyWeeks:2});
  assert.equal(c.rows.length,102);assert.equal(new Set(c.rows.map(x=>x.geographyCode)).size,51);assert.ok(!c.rows.some(x=>x.geographyCode==="PR"));
  assert.equal(c.rows.filter(x=>x.pitClass===EMPLOYMENT_R4_PIT_CLASSES.forwardObserved).length,51);
  const d=await parseBlsDiffusionShadowRows(blsPayload(),{retrievedAt:rt});
  assert.equal(d.rows.length,16);assert.equal(d.rows.filter(x=>x.pitClass===EMPLOYMENT_R4_PIT_CLASSES.forwardObserved).length,8);
  assert.equal(d.rows.filter(x=>x.availableAt===rt).length,8);
});

function sampleRow(logicalSeriesId,geo,value,hashChar="a"){return{logicalSeriesId,provider:"TEST",providerSeriesId:`TEST:${logicalSeriesId}`,geographyType:"STATE",geographyCode:geo,frequency:"WEEKLY",unit:"COUNT",seasonalAdjustment:"NA",populationCoverage:"TEST",observationDate:"2026-09-12",releaseDate:null,availableAt:"2026-09-20T00:00:00Z",retrievedAt:"2026-09-20T00:00:00Z",value,sourceRevision:null,sourceHash:hashChar.repeat(64),qualityStatus:"READY",pitClass:EMPLOYMENT_R4_PIT_CLASSES.forwardObserved,schemaVersion:1,provenance:{}}}
function goodProvider(value=10){return{async fetchStateClaims(){return{requestCount:1,rows:[sampleRow("STATE_INITIAL_CLAIMS","AL",value,"a")],meta:{}}},async fetchGeographicDiffusion(){return{requestCount:1,rows:[sampleRow("STATE_EMP_DIFFUSION_3M","ALL_STATES",60,"b")],meta:{}}}}}

test("collector is store-only; repeat is NOOP/history-dedup; RUN recorded",async()=>{
  const {sqlite,db}=sqliteD1();let tick=0;const now=()=>new Date(`2026-09-20T00:00:0${tick++}Z`);
  const first=await collectEmploymentR4Shadow({db,provider:goodProvider(),now});
  assert.equal(first.status,"SUCCESS");assert.equal(first.scoreComputed,false);assert.equal(first.providerRequests,2);assert.equal(first.inserted,2);
  const h1=sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.history}`).get().n;
  const second=await collectEmploymentR4Shadow({db,provider:goodProvider(),now});
  const h2=sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.history}`).get().n;
  assert.equal(second.noop,2);assert.equal(h2,h1);
  assert.equal(sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.runs}`).get().n,2);
  sqlite.close();
});

test("partial upstream failure never deletes valid CURRENT rows",async()=>{
  const {sqlite,db}=sqliteD1();let tick=0;const now=()=>new Date(`2026-09-20T01:00:0${tick++}Z`);
  await collectEmploymentR4Shadow({db,provider:goodProvider(),now});
  const before=sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.current}`).get().n;
  const partial=goodProvider();partial.fetchStateClaims=async()=>{throw new Error("HTTP_503")};
  const out=await collectEmploymentR4Shadow({db,provider:partial,now});
  assert.equal(out.status,"PARTIAL");
  const after=sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.current}`).get().n;
  assert.equal(after,before);
  sqlite.close();
});

function claimsCsvWeeks(weeks){
  const lines=["st,rptdate,c1,c2,c3,c8"];
  for(let wi=0;wi<weeks.length;wi++){
    const date=weeks[wi],report=date;
    for(let i=0;i<EMPLOYMENT_R4_CORE_STATES.length;i++){
      lines.push(`${EMPLOYMENT_R4_CORE_STATES[i]},${report},${wi+1},${date},${1000+i+wi},9000`);
    }
  }
  return lines.join("\n");
}
function blsPayloadMonths(months){
  return {Results:{series:Object.entries(EMPLOYMENT_R4_DIFFUSION_SERIES).map(([seriesID],idx)=>({
    seriesID,
    data:months.map((m,j)=>({year:m.slice(0,4),period:`M${m.slice(5,7)}`,value:String(50+idx+j),footnotes:[]})).reverse()
  }))}};
}

test("real parser progression adds only new observations; response hash and moving-latest availability do not create false revisions",async()=>{
  const {sqlite,db}=sqliteD1();
  let run=0;
  const provider={
    async fetchStateClaims(){
      const rt=run===0?"2026-09-20T00:00:00.000Z":"2026-09-27T00:00:00.000Z";
      const weeks=run===0?["09/05/2026","09/12/2026"]:["09/05/2026","09/12/2026","09/19/2026"];
      const parsed=await parseEta539ShadowRows(claimsCsvWeeks(weeks),{retrievedAt:rt,historyWeeks:3});
      return {...parsed,requestCount:1,retrievedAt:rt};
    },
    async fetchGeographicDiffusion(){
      const rt=run===0?"2026-09-20T00:00:00.000Z":"2026-09-27T00:00:00.000Z";
      const months=run===0?["2026-07","2026-08"]:["2026-07","2026-08","2026-09"];
      const parsed=await parseBlsDiffusionShadowRows(blsPayloadMonths(months),{retrievedAt:rt});
      return {...parsed,requestCount:1,retrievedAt:rt};
    }
  };
  let tick=0;
  const now=()=>new Date(`2026-09-2${tick++}T01:00:00Z`);
  const first=await collectEmploymentR4Shadow({db,provider,now,claimsHistoryWeeks:3});
  assert.equal(first.status,"SUCCESS");
  assert.equal(first.inserted,118); // 51*2 claims + 8*2 diffusion
  const h1=sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.history}`).get().n;
  run=1;
  const second=await collectEmploymentR4Shadow({db,provider,now,claimsHistoryWeeks:3});
  assert.equal(second.status,"SUCCESS");
  assert.equal(second.inserted,59); // 51 new claims + 8 new diffusion
  assert.equal(second.revised,0);
  assert.equal(second.noop,118);
  const h2=sqlite.prepare(`SELECT COUNT(*) n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.history}`).get().n;
  assert.equal(h2-h1,59);
  const oldForward=sqlite.prepare(`SELECT available_at,pit_class FROM ${EMPLOYMENT_R4_SHADOW_TABLES.current}
    WHERE logical_series_id='STATE_INITIAL_CLAIMS' AND geography_code='AL' AND observation_date='2026-09-12'`).get();
  assert.equal(oldForward.available_at,"2026-09-20T00:00:00.000Z");
  assert.equal(oldForward.pit_class,EMPLOYMENT_R4_PIT_CLASSES.forwardObserved);
  sqlite.close();
});
