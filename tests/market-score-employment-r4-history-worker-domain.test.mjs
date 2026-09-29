import test from "node:test";
import assert from "node:assert/strict";
import {
  collectClaimsHistoricalOneBatch,
  collectGeographicHistoricalOneBatch,
  latestGeographicAnchorMonth,
  EMPLOYMENT_R4_HISTORY_STEP_CONTRACT,
} from "../lib/market-score/employment-r4-history-backfill.mjs";
import {
  runEmploymentR4HistoryBackfillOneStep,
  EMPLOYMENT_R4_HISTORY_WORKER_CONTRACT,
} from "../lib/market-score/employment-r4-history-worker-domain.mjs";

const DAY=86400000;
const iso=d=>new Date(d).toISOString();
const day=d=>iso(d).slice(0,10);
const GEO_IDS=[
  "SMS00000000000000021","SMS00000000000000022","SMS00000000000000023","SMS00000000000000024",
  "SMS99999990000000021","SMS99999990000000022","SMS99999990000000023","SMS99999990000000024",
];

function claimsRows(weeks=108,geos=51){
  const start=Date.UTC(2024,0,6),out=[];
  for(let w=0;w<weeks;w++)for(let g=0;g<geos;g++){
    const d=start+w*7*DAY;
    out.push({
      logicalSeriesId:"STATE_INITIAL_CLAIMS",provider:"DOL_ETA",providerSeriesId:"ETA539:C3",
      geographyType:"STATE",geographyCode:`S${String(g).padStart(2,"0")}`,frequency:"WEEKLY",
      observationDate:day(d),availableAt:iso(d+4*DAY),retrievedAt:iso(d+4*DAY),
      value:100+w+g,sourceHash:"a".repeat(64),qualityStatus:"READY_CORE_51",
      pitClass:w>=106?"FORWARD_OBSERVED_TRUE_PIT":"HISTORICAL_CURRENT_OR_REVISED_PROVIDER_HISTORY",
      schemaVersion:1,provenance:{fixture:true},
    });
  }
  return out;
}
function monthIndex(s){const [y,m]=s.split("-").map(Number);return y*12+m-1;}
function monthFromIndex(n){const y=Math.floor(n/12),m=n-y*12+1;return `${y}-${String(m).padStart(2,"0")}`;}
function geoRows(startyear,endyear){
  const out=[];
  for(let y=Number(startyear);y<=Number(endyear);y++)for(let m=1;m<=12;m++)for(const [i,id] of GEO_IDS.entries()){
    out.push({
      logicalSeriesId:id.startsWith("SMS000")?`STATE_EMP_DIFFUSION_${[1,3,6,12][i%4]}M`:`MSA_EMP_DIFFUSION_${[1,3,6,12][i%4]}M`,
      provider:"BLS_CES_SAE",providerSeriesId:id,geographyType:"AGGREGATE_GROUP",
      geographyCode:id.startsWith("SMS000")?"ALL_STATES":"ALL_MSAS",frequency:"MONTHLY",
      observationDate:`${y}-${String(m).padStart(2,"0")}-01`,availableAt:`${y}-${String(m).padStart(2,"0")}-20T00:00:00Z`,
      retrievedAt:`${endyear}-12-31T00:00:00Z`,value:50+i+m,sourceHash:"b".repeat(64),
      qualityStatus:"READY",pitClass:"FORWARD_OBSERVED_TRUE_PIT",schemaVersion:1,provenance:{fixture:true},
    });
  }
  return out;
}
function storeFactory(initial=[]){
  const writes=[],leases=[],releases=[];
  const store={
    async initialize(){},
    async getCurrentRows(id=null){return id?initial.filter(r=>(r.logical_series_id??r.logicalSeriesId)===id):initial;},
    async upsertRows({rows}){writes.push(rows);return{inserted:rows.length,revised:0,noop:0,rejected:0,historyRowsAdded:rows.length};},
    async acquire(key,{ttlMs}){leases.push({key,ttlMs});return{acquired:true,key,token:key+"-t"};},
    async release(lease){releases.push(lease.key);return true;},
    async recordRun(){throw new Error("FORWARD_RUN_TABLE_MUST_NOT_BE_TOUCHED");},
  };
  return {factory:()=>store,writes,leases,releases};
}

test("Claims one-step backfill chooses oldest missing batch and keeps <=408 rows",async()=>{
  const fs=storeFactory([]);
  let calls=0;
  const provider={async fetchStateClaims({historyWeeks}){calls++;assert.equal(historyWeeks,108);return{rows:claimsRows(),requestCount:1}}};
  const out=await collectClaimsHistoricalOneBatch({db:{prepare(){}},provider,storeFactory:fs.factory,now:()=>new Date("2026-09-29T00:00:00Z")});
  assert.equal(out.status,"PROGRESS");
  assert.equal(calls,1);
  assert.equal(out.batch.batchIndex,14);
  assert.equal(out.batch.weekCount,4);
  assert.equal(out.batch.selectedRows,204);
  assert.ok(out.batch.selectedRows<=408);
  assert.ok(fs.writes.flat().every(r=>r.pitClass==="HISTORICAL_CURRENT_OR_REVISED_PROVIDER_HISTORY"));
});

test("Claims one-step skips provider when 108 complete weeks already exist",async()=>{
  const initial=claimsRows().map(r=>({logical_series_id:r.logicalSeriesId,geography_code:r.geographyCode,observation_date:r.observationDate}));
  const fs=storeFactory(initial);
  let calls=0;
  const out=await collectClaimsHistoricalOneBatch({
    db:{prepare(){}},provider:{async fetchStateClaims(){calls++;throw new Error("NO")}},storeFactory:fs.factory
  });
  assert.equal(out.status,"SKIPPED_COVERAGE_READY");
  assert.equal(calls,0);
});

test("Geographic one-step requires a stored forward anchor and then chooses oldest missing batch",async()=>{
  const forward=GEO_IDS.map((id,i)=>({
    provider_series_id:id,observation_date:"2026-08-01",logical_series_id:id.startsWith("SMS000")?`STATE_EMP_DIFFUSION_${[1,3,6,12][i%4]}M`:`MSA_EMP_DIFFUSION_${[1,3,6,12][i%4]}M`
  }));
  assert.equal(latestGeographicAnchorMonth(forward),"2026-08");
  const fs=storeFactory(forward);
  let calls=0;
  const provider={async fetchGeographicDiffusion({startyear,endyear}){calls++;return{rows:geoRows(startyear,endyear),requestCount:1}}};
  const out=await collectGeographicHistoricalOneBatch({db:{prepare(){}},provider,storeFactory:fs.factory,now:()=>new Date("2026-09-29T00:00:00Z")});
  assert.equal(out.status,"PROGRESS");
  assert.equal(calls,1);
  assert.equal(out.batch.batchIndex,18);
  assert.equal(out.batch.monthCount,20);
  assert.equal(out.batch.selectedRows,160);
  assert.ok(out.batch.selectedRows<=192);
  assert.ok(fs.writes.flat().every(r=>r.pitClass==="HISTORICAL_CURRENT_VINTAGE"));
});

test("Geographic one-step makes zero provider calls before first forward anchor exists",async()=>{
  const fs=storeFactory([]);
  let calls=0;
  const out=await collectGeographicHistoricalOneBatch({
    db:{prepare(){}},provider:{async fetchGeographicDiffusion(){calls++;throw new Error("NO")}},storeFactory:fs.factory
  });
  assert.equal(out.status,"SKIPPED_NO_FORWARD_ANCHOR");
  assert.equal(calls,0);
});

test("Combined worker runs Claims and Geographic as independent locked lanes with max two provider requests",async()=>{
  const forward=GEO_IDS.map((id,i)=>({
    provider_series_id:id,observation_date:"2026-08-01",logical_series_id:id.startsWith("SMS000")?`STATE_EMP_DIFFUSION_${[1,3,6,12][i%4]}M`:`MSA_EMP_DIFFUSION_${[1,3,6,12][i%4]}M`
  }));
  const fs=storeFactory(forward);
  const providerFactory=()=>({
    async fetchStateClaims(){return{rows:claimsRows(),requestCount:1}},
    async fetchGeographicDiffusion({startyear,endyear}){return{rows:geoRows(startyear,endyear),requestCount:1}},
  });
  const out=await runEmploymentR4HistoryBackfillOneStep({
    env:{DB:{prepare(){}}},providerFactory,storeFactory:fs.factory,now:()=>new Date("2026-09-29T00:00:00Z")
  });
  assert.equal(out.status,"PROGRESS");
  assert.equal(out.providerRequests,2);
  assert.ok(out.dbWrites>0);
  assert.deepEqual(fs.leases.map(x=>x.key).sort(),["employment-r4-history-claims","employment-r4-history-geographic"]);
  assert.deepEqual(fs.releases.sort(),["employment-r4-history-claims","employment-r4-history-geographic"]);
});

test("Failure keeps the family lease until TTL, creating bounded retry throttle without new infrastructure",async()=>{
  const forward=GEO_IDS.map((id,i)=>({
    provider_series_id:id,observation_date:"2026-08-01",logical_series_id:id.startsWith("SMS000")?`STATE_EMP_DIFFUSION_${[1,3,6,12][i%4]}M`:`MSA_EMP_DIFFUSION_${[1,3,6,12][i%4]}M`
  }));
  const fs=storeFactory(forward);
  const providerFactory=()=>({
    async fetchStateClaims(){throw new Error("DOL_DOWN")},
    async fetchGeographicDiffusion(){throw new Error("BLS_DOWN")},
  });
  const out=await runEmploymentR4HistoryBackfillOneStep({
    env:{DB:{prepare(){}}},providerFactory,storeFactory:fs.factory
  });
  assert.equal(out.status,"PARTIAL");
  assert.equal(fs.releases.length,0);
  assert.ok(fs.leases.every(x=>x.ttlMs===10*60*1000));
});

test("History step contracts do not compute score or touch the forward RUN cadence",()=>{
  assert.equal(EMPLOYMENT_R4_HISTORY_STEP_CONTRACT.maximumProviderRequestsPerCombinedStep,2);
  assert.equal(EMPLOYMENT_R4_HISTORY_STEP_CONTRACT.scoreComputed,false);
  assert.equal(EMPLOYMENT_R4_HISTORY_STEP_CONTRACT.forwardRunsTableTouched,false);
  assert.equal(EMPLOYMENT_R4_HISTORY_WORKER_CONTRACT.parallelFamilies,true);
  assert.equal(EMPLOYMENT_R4_HISTORY_WORKER_CONTRACT.maxProviderRequestsPerStep,2);
  assert.equal(EMPLOYMENT_R4_HISTORY_WORKER_CONTRACT.forwardRunsTableTouched,false);
  assert.equal(EMPLOYMENT_R4_HISTORY_WORKER_CONTRACT.scoreComputed,false);
});
