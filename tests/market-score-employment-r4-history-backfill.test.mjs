import test from "node:test";
import assert from "node:assert/strict";
import {
  collectClaimsHistoricalCurrent,
  collectGeographicHistoricalCurrent,
  completeClaimsWeeksFromStoredRows,
  geographicCoverageFromStoredRows,
  EMPLOYMENT_R4_HISTORY_BACKFILL_CONTRACT,
} from "../lib/market-score/employment-r4-history-backfill.mjs";

const DAY=86_400_000;
const iso=d=>new Date(d).toISOString();
const date=d=>iso(d).slice(0,10);

function fakeStoreFactory({initial=[]}={}){
  const writes=[];
  const store={
    async initialize(){},
    async getCurrentRows(id=null){return id?initial.filter(r=>(r.logical_series_id??r.logicalSeriesId)===id):initial;},
    async upsertRows({rows}){
      writes.push(rows);
      return {inserted:rows.length,revised:0,noop:0,rejected:0,historyRowsAdded:rows.length,currentRows:initial.length+rows.length};
    },
    async recordRun(){throw new Error("FORWARD_RUN_TABLE_MUST_NOT_BE_TOUCHED");},
  };
  return {factory:()=>store,writes,store};
}

function claimsRows(weeks=108,geos=51){
  const start=Date.UTC(2024,0,6),out=[];
  for(let w=0;w<weeks;w++)for(let g=0;g<geos;g++){
    const d=start+w*7*DAY;
    out.push({
      logicalSeriesId:"STATE_INITIAL_CLAIMS",provider:"DOL_ETA",providerSeriesId:"ETA539:C3",
      geographyType:"STATE",geographyCode:`S${String(g).padStart(2,"0")}`,frequency:"WEEKLY",
      observationDate:date(d),availableAt:iso(d+4*DAY),retrievedAt:iso(d+4*DAY),
      value:100+w+g,sourceHash:"a".repeat(64),qualityStatus:"READY_CORE_51",
      pitClass:w===weeks-1?"FORWARD_OBSERVED_TRUE_PIT":"HISTORICAL_CURRENT_OR_REVISED_PROVIDER_HISTORY",
      schemaVersion:1,provenance:{fixture:true},
    });
  }
  return out;
}

function geographicRows(startyear,endyear,ids){
  const out=[];
  for(let y=Number(startyear);y<=Number(endyear);y++)for(let m=1;m<=12;m++)for(const [i,id] of ids.entries()){
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

test("Claims historical lane fetches once, writes 14 bounded batches, and never writes TRUE PIT",async()=>{
  const fs=fakeStoreFactory();
  let calls=0;
  const provider={async fetchStateClaims({historyWeeks}){calls++;assert.equal(historyWeeks,108);return{rows:claimsRows(),requestCount:1}}};
  const out=await collectClaimsHistoricalCurrent({db:{prepare(){}},provider,storeFactory:fs.factory,now:()=>new Date("2026-09-29T00:00:00Z")});
  assert.equal(out.status,"SUCCESS");
  assert.equal(calls,1);
  assert.equal(out.providerRequests,1);
  assert.equal(out.plan.batchCount,14);
  assert.equal(fs.writes.length,14);
  assert.ok(fs.writes.every(rows=>rows.length<=408));
  assert.equal(fs.writes.flat().length,5508);
  assert.ok(fs.writes.flat().every(r=>r.pitClass==="HISTORICAL_CURRENT_OR_REVISED_PROVIDER_HISTORY"));
  assert.ok(fs.writes.flat().every(r=>r.availableAt===null));
  assert.ok(fs.writes.flat().every(r=>r.provenance.truePitAsserted===false));
});

test("Claims lane makes zero provider calls when 108 complete weeks are already stored",async()=>{
  const initial=claimsRows().map(r=>({
    logical_series_id:r.logicalSeriesId,geography_code:r.geographyCode,observation_date:r.observationDate
  }));
  const fs=fakeStoreFactory({initial});
  let calls=0;
  const provider={async fetchStateClaims(){calls++;throw new Error("MUST_NOT_CALL")}};
  const out=await collectClaimsHistoricalCurrent({db:{prepare(){}},provider,storeFactory:fs.factory});
  assert.equal(out.status,"SKIPPED_COVERAGE_READY");
  assert.equal(out.providerRequests,0);
  assert.equal(calls,0);
  assert.equal(fs.writes.length,0);
});

test("Claims coverage helper counts only complete geography weeks",()=>{
  const rows=claimsRows(2,3).map(r=>({logical_series_id:r.logicalSeriesId,geography_code:r.geographyCode,observation_date:r.observationDate}));
  rows.pop();
  assert.equal(completeClaimsWeeksFromStoredRows(rows,{geographyCount:3}).length,1);
});

test("Geographic lane uses 18 bounded 24-month batches, retags all rows historical current-vintage",async()=>{
  const ids=[
    "SMS00000000000000021","SMS00000000000000022","SMS00000000000000023","SMS00000000000000024",
    "SMS99999990000000021","SMS99999990000000022","SMS99999990000000023","SMS99999990000000024",
  ];
  const fs=fakeStoreFactory();
  let calls=0;
  const provider={async fetchGeographicDiffusion({startyear,endyear}){calls++;return{rows:geographicRows(startyear,endyear,ids),requestCount:1}}};
  const out=await collectGeographicHistoricalCurrent({
    db:{prepare(){}},provider,storeFactory:fs.factory,anchorMonth:"2026-08",totalMonths:428,batchMonths:24,seriesIds:ids,
    now:()=>new Date("2026-09-29T00:00:00Z")
  });
  assert.equal(out.status,"SUCCESS");
  assert.equal(out.plan.batchCount,18);
  assert.equal(calls,18);
  assert.equal(out.providerRequests,18);
  assert.equal(fs.writes.length,18);
  assert.ok(fs.writes.every(rows=>rows.length<=192));
  assert.ok(fs.writes.flat().every(r=>r.pitClass==="HISTORICAL_CURRENT_VINTAGE"));
  assert.ok(fs.writes.flat().every(r=>r.availableAt===null));
  assert.ok(fs.writes.flat().every(r=>r.provenance.truePitAsserted===false));
  assert.equal(new Set(fs.writes.flat().map(r=>`${r.providerSeriesId}|${r.observationDate}`)).size,428*8);
});

test("Geographic lane makes zero provider calls when all 8 series already have required coverage",async()=>{
  const ids=[
    "SMS00000000000000021","SMS00000000000000022","SMS00000000000000023","SMS00000000000000024",
    "SMS99999990000000021","SMS99999990000000022","SMS99999990000000023","SMS99999990000000024",
  ];
  const initial=[];
  let idx=2026*12+7;
  for(let k=0;k<428;k++){
    const y=Math.floor((idx-k)/12),m=(idx-k)-y*12+1;
    for(const id of ids)initial.push({provider_series_id:id,observation_date:`${y}-${String(m).padStart(2,"0")}-01`});
  }
  const fs=fakeStoreFactory({initial});
  let calls=0;
  const provider={async fetchGeographicDiffusion(){calls++;throw new Error("MUST_NOT_CALL")}};
  const out=await collectGeographicHistoricalCurrent({db:{prepare(){}},provider,storeFactory:fs.factory,anchorMonth:"2026-08",seriesIds:ids});
  assert.equal(out.status,"SKIPPED_COVERAGE_READY");
  assert.equal(out.providerRequests,0);
  assert.equal(calls,0);
  assert.equal(fs.writes.length,0);
});

test("History lane contract never computes score or touches forward cadence run table",()=>{
  assert.equal(EMPLOYMENT_R4_HISTORY_BACKFILL_CONTRACT.scoreComputed,false);
  assert.equal(EMPLOYMENT_R4_HISTORY_BACKFILL_CONTRACT.forwardRunsTableTouched,false);
  assert.equal(EMPLOYMENT_R4_HISTORY_BACKFILL_CONTRACT.neverRelabelHistoricalAsForward,true);
  assert.equal(EMPLOYMENT_R4_HISTORY_BACKFILL_CONTRACT.cumulativeStore,true);
});
