import {
  EMPLOYMENT_R4_PIT_CLASSES,
  EMPLOYMENT_R4_SHADOW_SCHEMA_VERSION,
} from "./employment-r4-shadow-contract.mjs";
import { createEmploymentR4ShadowProvider } from "./employment-r4-shadow-provider.mjs";
import { createEmploymentR4ShadowStore } from "./employment-r4-shadow-store.mjs";
import {
  planClaimsHistoryBackfill,
  planGeographicHistoryBackfill,
  requiredClaimsRawHistoryWeeks,
} from "./employment-r4-backfill-planner.mjs";

const DAY=86_400_000;
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const isoMonth=v=>{
  const s=String(v??"").slice(0,7);
  if(!/^\d{4}-\d{2}$/.test(s))throw new TypeError("ANCHOR_MONTH_INVALID");
  const [y,m]=s.split("-").map(Number);
  if(m<1||m>12||!Number.isInteger(y))throw new TypeError("ANCHOR_MONTH_INVALID");
  return s;
};
const monthIndex=s=>{
  const [y,m]=isoMonth(s).split("-").map(Number);
  return y*12+(m-1);
};
const monthFromIndex=n=>{
  const y=Math.floor(n/12),m=n-y*12+1;
  return `${y}-${String(m).padStart(2,"0")}`;
};
const monthOfDate=s=>String(s??"").slice(0,7);

function cloneHistorical(row,pitClass,kind){
  return {
    ...row,
    availableAt:null,
    pitClass,
    schemaVersion:Number(row?.schemaVersion??EMPLOYMENT_R4_SHADOW_SCHEMA_VERSION),
    provenance:{
      ...(row?.provenance??{}),
      historyBackfill:true,
      historyBackfillKind:kind,
      historicalClass:pitClass,
      truePitAsserted:false,
    },
  };
}

function identities(rows){
  return new Set(rows.map(r=>`${r.logical_series_id??r.logicalSeriesId}|${r.geography_type??r.geographyType}|${r.geography_code??r.geographyCode}|${r.observation_date??r.observationDate}`));
}

export function completeClaimsWeeksFromStoredRows(rows,{geographyCount=51}={}){
  if(!Array.isArray(rows))throw new TypeError("ROWS_REQUIRED");
  const by=new Map();
  for(const r of rows){
    const logical=String(r.logical_series_id??r.logicalSeriesId??"");
    if(logical!=="STATE_INITIAL_CLAIMS")continue;
    const d=String(r.observation_date??r.observationDate??"");
    const g=String(r.geography_code??r.geographyCode??"");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!g)continue;
    const set=by.get(d)??new Set();set.add(g);by.set(d,set);
  }
  return [...by.entries()].filter(([,s])=>s.size>=geographyCount).map(([d])=>d).sort();
}

export function geographicCoverageFromStoredRows(rows,seriesIds){
  if(!Array.isArray(rows)||!Array.isArray(seriesIds))throw new TypeError("ROWS_REQUIRED");
  const out={};
  for(const id of seriesIds)out[id]=new Set();
  for(const r of rows){
    const id=String(r.provider_series_id??r.providerSeriesId??"");
    if(!out[id])continue;
    const d=String(r.observation_date??r.observationDate??"");
    if(/^\d{4}-\d{2}-\d{2}$/.test(d))out[id].add(d.slice(0,7));
  }
  return Object.fromEntries(Object.entries(out).map(([k,s])=>[k,[...s].sort()]));
}

function selectClaimsChunk(rows,batch){
  const dates=[...new Set(rows.map(r=>String(r.observationDate)))].sort().reverse();
  const wanted=new Set(dates.slice(batch.newestWeekOffset,batch.oldestWeekOffset+1));
  return rows.filter(r=>wanted.has(String(r.observationDate)));
}

function selectGeographicMonths(rows,{anchorMonth,batch}){
  const anchor=monthIndex(anchorMonth);
  const newest=anchor-batch.newestMonthOffset;
  const oldest=anchor-batch.oldestMonthOffset;
  return rows.filter(r=>{
    const m=monthOfDate(r.observationDate);
    if(!/^\d{4}-\d{2}$/.test(m))return false;
    const i=monthIndex(m);
    return i>=oldest&&i<=newest;
  });
}

async function writeChunked(store,chunks,now){
  const summary={inserted:0,revised:0,noop:0,rejected:0,historyRowsAdded:0,batches:[]};
  for(const [i,rows] of chunks.entries()){
    if(!rows.length){summary.batches.push({batchIndex:i+1,rows:0,skipped:true});continue;}
    const w=await store.upsertRows({rows,retrievedAt:now().toISOString()});
    summary.inserted+=Number(w.inserted??0);
    summary.revised+=Number(w.revised??0);
    summary.noop+=Number(w.noop??0);
    summary.rejected+=Number(w.rejected??0);
    summary.historyRowsAdded+=Number(w.historyRowsAdded??0);
    summary.batches.push({
      batchIndex:i+1,rows:rows.length,inserted:Number(w.inserted??0),revised:Number(w.revised??0),
      noop:Number(w.noop??0),rejected:Number(w.rejected??0),
    });
  }
  return summary;
}

export async function collectClaimsHistoricalCurrent({
  db,
  provider=createEmploymentR4ShadowProvider(),
  storeFactory=createEmploymentR4ShadowStore,
  now=()=>new Date(),
  totalWeeks=requiredClaimsRawHistoryWeeks(),
  batchWeeks=8,
  geographyCount=51,
}={}){
  if(!db||typeof db.prepare!=="function")throw new TypeError("D1_DATABASE_REQUIRED");
  const store=storeFactory(db,{now});
  await store.initialize();
  const prior=await store.getCurrentRows("STATE_INITIAL_CLAIMS");
  const complete=completeClaimsWeeksFromStoredRows(prior,{geographyCount});
  if(complete.length>=totalWeeks){
    return {status:"SKIPPED_COVERAGE_READY",family:"claims",providerRequests:0,totalWeeks,completeWeeks:complete.length,scoreComputed:false};
  }

  const plan=planClaimsHistoryBackfill({totalWeeks,batchWeeks,geographyCount});
  const fetched=await provider.fetchStateClaims({historyWeeks:totalWeeks});
  const raw=(fetched?.rows??[]).filter(r=>r?.logicalSeriesId==="STATE_INITIAL_CLAIMS");
  const historical=raw.map(r=>cloneHistorical(r,EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentOrRevised,"CLAIMS_CURRENT_OR_REVISED"));
  const chunks=plan.batches.map(b=>selectClaimsChunk(historical,b));
  for(let i=0;i<chunks.length;i++){
    if(chunks[i].length>plan.batches[i].maxRows)throw new Error(`CLAIMS_BATCH_BOUND_EXCEEDED:${i+1}`);
  }
  const write=await writeChunked(store,chunks,now);
  return {
    status:write.rejected?"PARTIAL":"SUCCESS",
    family:"claims",
    providerRequests:Number(fetched?.requestCount??1),
    fetchedRows:raw.length,
    storedCandidateRows:historical.length,
    plan,
    write,
    scoreComputed:false,
    pitClass:EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentOrRevised,
  };
}

export async function collectGeographicHistoricalCurrent({
  db,
  provider=createEmploymentR4ShadowProvider(),
  storeFactory=createEmploymentR4ShadowStore,
  now=()=>new Date(),
  anchorMonth,
  totalMonths=428,
  batchMonths=24,
  seriesIds=null,
}={}){
  if(!db||typeof db.prepare!=="function")throw new TypeError("D1_DATABASE_REQUIRED");
  const store=storeFactory(db,{now});
  await store.initialize();

  const targetSeries=seriesIds??[
    "SMS00000000000000021","SMS00000000000000022","SMS00000000000000023","SMS00000000000000024",
    "SMS99999990000000021","SMS99999990000000022","SMS99999990000000023","SMS99999990000000024",
  ];
  const anchor=isoMonth(anchorMonth);
  const prior=await store.getCurrentRows();
  const coverage=geographicCoverageFromStoredRows(prior,targetSeries);
  const ready=targetSeries.every(id=>(coverage[id]?.length??0)>=totalMonths);
  if(ready){
    return {status:"SKIPPED_COVERAGE_READY",family:"geographic",providerRequests:0,totalMonths,scoreComputed:false,coverage:Object.fromEntries(targetSeries.map(id=>[id,coverage[id].length]))};
  }

  const plan=planGeographicHistoryBackfill({totalMonths,batchMonths,seriesCount:targetSeries.length});
  let providerRequests=0;
  const seen=new Set();
  const allWrites=[];
  const batchResults=[];

  for(const batch of plan.batches){
    const a=monthIndex(anchor);
    const newest=monthFromIndex(a-batch.newestMonthOffset);
    const oldest=monthFromIndex(a-batch.oldestMonthOffset);
    const startyear=oldest.slice(0,4),endyear=newest.slice(0,4);
    const fetched=await provider.fetchGeographicDiffusion({startyear,endyear});
    providerRequests+=Number(fetched?.requestCount??1);
    const raw=(fetched?.rows??[]).filter(r=>targetSeries.includes(String(r?.providerSeriesId)));
    const selected=selectGeographicMonths(raw,{anchorMonth:anchor,batch});
    const historical=[];
    for(const r of selected){
      const key=`${r.logicalSeriesId}|${r.geographyType}|${r.geographyCode}|${r.observationDate}`;
      if(seen.has(key))continue;
      seen.add(key);
      historical.push(cloneHistorical(r,EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentVintage,"GEOGRAPHIC_CURRENT_VINTAGE"));
    }
    if(historical.length>batch.maxRows)throw new Error(`GEOGRAPHIC_BATCH_BOUND_EXCEEDED:${batch.batchIndex}`);
    const w=await store.upsertRows({rows:historical,retrievedAt:now().toISOString()});
    allWrites.push(w);
    batchResults.push({
      batchIndex:batch.batchIndex,oldestMonth:oldest,newestMonth:newest,startyear,endyear,
      fetchedRows:raw.length,selectedRows:historical.length,inserted:Number(w.inserted??0),
      revised:Number(w.revised??0),noop:Number(w.noop??0),rejected:Number(w.rejected??0),
    });
  }

  const write={
    inserted:allWrites.reduce((s,w)=>s+Number(w.inserted??0),0),
    revised:allWrites.reduce((s,w)=>s+Number(w.revised??0),0),
    noop:allWrites.reduce((s,w)=>s+Number(w.noop??0),0),
    rejected:allWrites.reduce((s,w)=>s+Number(w.rejected??0),0),
    historyRowsAdded:allWrites.reduce((s,w)=>s+Number(w.historyRowsAdded??0),0),
  };
  return {
    status:write.rejected?"PARTIAL":"SUCCESS",
    family:"geographic",
    providerRequests,
    plan,
    batches:batchResults,
    write,
    scoreComputed:false,
    pitClass:EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentVintage,
  };
}

export const EMPLOYMENT_R4_HISTORY_BACKFILL_CONTRACT=Object.freeze({
  collectionLaneOnly:true,
  scoreComputed:false,
  forwardRunsTableTouched:false,
  directPublicScoreWiring:false,
  claimsFetchStrategy:"ONE_BULK_FETCH_THEN_BOUNDED_D1_WRITES",
  claimsDefaultRawWeeks:requiredClaimsRawHistoryWeeks(),
  claimsDefaultBatchWeeks:8,
  geographicStrategy:"24_MONTH_REQUEST_WINDOWS_AND_BOUNDED_D1_WRITES",
  geographicDefaultBatchMonths:24,
  historicalAvailability:"NULL_UNLESS_OFFICIAL_FIRST_KNOWN_ARCHIVE",
  neverRelabelHistoricalAsForward:true,
  cumulativeStore:true,
});


const CORE_GEO_DEFAULT=51;
const GEO_SERIES_DEFAULT=Object.freeze([
  "SMS00000000000000021","SMS00000000000000022","SMS00000000000000023","SMS00000000000000024",
  "SMS99999990000000021","SMS99999990000000022","SMS99999990000000023","SMS99999990000000024",
]);

function batchMonths(anchorMonth,batch){
  const a=monthIndex(anchorMonth);
  const out=[];
  for(let offset=batch.newestMonthOffset;offset<=batch.oldestMonthOffset;offset++){
    out.push(monthFromIndex(a-offset));
  }
  return out;
}

function claimsBatchDates(rows,batch){
  const dates=[...new Set(rows.map(r=>String(r.observationDate)))].sort().reverse();
  return dates.slice(batch.newestWeekOffset,batch.oldestWeekOffset+1).sort();
}

function oldestMissingClaimsBatch(plan,rawRows,completeWeeks){
  const complete=new Set(completeWeeks);
  for(const batch of [...plan.batches].reverse()){
    const dates=claimsBatchDates(rawRows,batch);
    if(!dates.length)continue;
    if(dates.some(d=>!complete.has(d)))return {batch,dates};
  }
  return null;
}

function oldestMissingGeographicBatch(plan,coverage,seriesIds,anchorMonth){
  for(const batch of [...plan.batches].reverse()){
    const months=batchMonths(anchorMonth,batch);
    const complete=seriesIds.every(id=>{
      const have=new Set(coverage[id]??[]);
      return months.every(m=>have.has(m));
    });
    if(!complete)return {batch,months};
  }
  return null;
}

export function latestGeographicAnchorMonth(rows,seriesIds=GEO_SERIES_DEFAULT){
  const wanted=new Set(seriesIds);
  const months=rows
    .filter(r=>wanted.has(String(r.provider_series_id??r.providerSeriesId??"")))
    .map(r=>monthOfDate(r.observation_date??r.observationDate))
    .filter(m=>/^\d{4}-\d{2}$/.test(m))
    .sort();
  return months.at(-1)??null;
}

export async function collectClaimsHistoricalOneBatch({
  db,
  provider=createEmploymentR4ShadowProvider(),
  storeFactory=createEmploymentR4ShadowStore,
  now=()=>new Date(),
  totalWeeks=requiredClaimsRawHistoryWeeks(),
  batchWeeks=8,
  geographyCount=CORE_GEO_DEFAULT,
}={}){
  if(!db||typeof db.prepare!=="function")throw new TypeError("D1_DATABASE_REQUIRED");
  const store=storeFactory(db,{now});
  await store.initialize();

  const prior=await store.getCurrentRows("STATE_INITIAL_CLAIMS");
  const complete=completeClaimsWeeksFromStoredRows(prior,{geographyCount});
  if(complete.length>=totalWeeks){
    return {
      status:"SKIPPED_COVERAGE_READY",family:"claims",providerRequests:0,
      completeWeeks:complete.length,totalWeeks,batch:null,scoreComputed:false,
    };
  }

  const plan=planClaimsHistoryBackfill({totalWeeks,batchWeeks,geographyCount});
  const fetched=await provider.fetchStateClaims({historyWeeks:totalWeeks});
  const raw=(fetched?.rows??[]).filter(r=>r?.logicalSeriesId==="STATE_INITIAL_CLAIMS");
  const next=oldestMissingClaimsBatch(plan,raw,complete);
  if(!next){
    return {
      status:"REVIEW_PROVIDER_RANGE_INCOMPLETE",family:"claims",
      providerRequests:Number(fetched?.requestCount??1),completeWeeks:complete.length,
      totalWeeks,batch:null,scoreComputed:false,
    };
  }

  const wanted=new Set(next.dates);
  const historical=raw
    .filter(r=>wanted.has(String(r.observationDate)))
    .map(r=>cloneHistorical(r,EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentOrRevised,"CLAIMS_CURRENT_OR_REVISED"));

  if(historical.length>next.batch.maxRows)throw new Error(`CLAIMS_BATCH_BOUND_EXCEEDED:${next.batch.batchIndex}`);
  const write=await store.upsertRows({rows:historical,retrievedAt:now().toISOString()});
  return {
    status:Number(write.rejected??0)>0?"PARTIAL":"PROGRESS",
    family:"claims",
    providerRequests:Number(fetched?.requestCount??1),
    completeWeeksBefore:complete.length,
    totalWeeks,
    batch:{
      batchIndex:next.batch.batchIndex,
      weekCount:next.dates.length,
      oldestDate:next.dates[0]??null,
      newestDate:next.dates.at(-1)??null,
      selectedRows:historical.length,
      maxRows:next.batch.maxRows,
    },
    write,
    scoreComputed:false,
    pitClass:EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentOrRevised,
  };
}

export async function collectGeographicHistoricalOneBatch({
  db,
  provider=createEmploymentR4ShadowProvider(),
  storeFactory=createEmploymentR4ShadowStore,
  now=()=>new Date(),
  totalMonths=428,
  batchMonths=24,
  seriesIds=GEO_SERIES_DEFAULT,
}={}){
  if(!db||typeof db.prepare!=="function")throw new TypeError("D1_DATABASE_REQUIRED");
  const store=storeFactory(db,{now});
  await store.initialize();

  const prior=await store.getCurrentRows();
  const anchorMonth=latestGeographicAnchorMonth(prior,seriesIds);
  if(!anchorMonth){
    return {
      status:"SKIPPED_NO_FORWARD_ANCHOR",family:"geographic",providerRequests:0,
      totalMonths,batch:null,scoreComputed:false,
    };
  }

  const coverage=geographicCoverageFromStoredRows(prior,seriesIds);
  const ready=seriesIds.every(id=>(coverage[id]?.length??0)>=totalMonths);
  if(ready){
    return {
      status:"SKIPPED_COVERAGE_READY",family:"geographic",providerRequests:0,
      anchorMonth,totalMonths,batch:null,scoreComputed:false,
      coverage:Object.fromEntries(seriesIds.map(id=>[id,coverage[id].length])),
    };
  }

  const plan=planGeographicHistoryBackfill({totalMonths,batchMonths,seriesCount:seriesIds.length});
  const next=oldestMissingGeographicBatch(plan,coverage,seriesIds,anchorMonth);
  if(!next){
    return {
      status:"REVIEW_COVERAGE_STATE",family:"geographic",providerRequests:0,
      anchorMonth,totalMonths,batch:null,scoreComputed:false,
    };
  }

  const newest=next.months[0],oldest=next.months.at(-1);
  const fetched=await provider.fetchGeographicDiffusion({
    startyear:oldest.slice(0,4),
    endyear:newest.slice(0,4),
  });
  const raw=(fetched?.rows??[]).filter(r=>seriesIds.includes(String(r?.providerSeriesId)));
  const wanted=new Set(next.months);
  const historical=raw
    .filter(r=>wanted.has(monthOfDate(r.observationDate)))
    .map(r=>cloneHistorical(r,EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentVintage,"GEOGRAPHIC_CURRENT_VINTAGE"));

  const unique=new Map();
  for(const r of historical){
    const key=`${r.providerSeriesId}|${r.observationDate}`;
    unique.set(key,r);
  }
  const selected=[...unique.values()];
  if(selected.length>next.batch.maxRows)throw new Error(`GEOGRAPHIC_BATCH_BOUND_EXCEEDED:${next.batch.batchIndex}`);

  const write=await store.upsertRows({rows:selected,retrievedAt:now().toISOString()});
  return {
    status:Number(write.rejected??0)>0?"PARTIAL":"PROGRESS",
    family:"geographic",
    providerRequests:Number(fetched?.requestCount??1),
    anchorMonth,
    totalMonths,
    batch:{
      batchIndex:next.batch.batchIndex,
      monthCount:next.months.length,
      oldestMonth:oldest,
      newestMonth:newest,
      selectedRows:selected.length,
      maxRows:next.batch.maxRows,
    },
    write,
    scoreComputed:false,
    pitClass:EMPLOYMENT_R4_PIT_CLASSES.historicalCurrentVintage,
  };
}

export const EMPLOYMENT_R4_HISTORY_STEP_CONTRACT=Object.freeze({
  claims:Object.freeze({
    strategy:"OLDEST_MISSING_BATCH_FIRST",
    providerRequestsPerStepMax:1,
    maxRowsPerWriteStep:408,
  }),
  geographic:Object.freeze({
    strategy:"OLDEST_MISSING_BATCH_FIRST",
    providerRequestsPerStepMax:1,
    maxRowsPerWriteStep:192,
    requiresForwardAnchor:true,
  }),
  maximumProviderRequestsPerCombinedStep:2,
  scoreComputed:false,
  forwardRunsTableTouched:false,
  cumulativeStore:true,
});
