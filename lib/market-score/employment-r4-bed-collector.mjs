import {
  EMPLOYMENT_R4_PIT_CLASSES,
} from "./employment-r4-shadow-contract.mjs";
import {
  createEmploymentR4ShadowStore,
} from "./employment-r4-shadow-store.mjs";
import {
  createEmploymentR4BedProvider,
  EMPLOYMENT_R4_BED_PROVIDER_CONTRACT,
} from "./employment-r4-bed-provider.mjs";

export const EMPLOYMENT_R4_BED_COLLECTOR_REVISION = "EMP-R4-BED-COLLECTOR-R1";
const BED_RUN_PROVIDER = "EMPLOYMENT_R4_BED";

function priorMaxBySeries(rows) {
  const out=new Map();
  for (const r of rows ?? []) {
    if (String(r?.provider ?? "") !== "BLS_BED") continue;
    const id=String(r?.provider_series_id ?? r?.providerSeriesId ?? "");
    const date=String(r?.observation_date ?? r?.observationDate ?? "");
    if (!id || !date) continue;
    const old=out.get(id);
    if (!old || date>old) out.set(id,date);
  }
  return out;
}
function upgradeNewForwardRows(rows, existingRows, retrievedAt) {
  const prior=priorMaxBySeries(existingRows);
  const latest=new Map();
  for (const r of rows ?? []) {
    const id=String(r?.providerSeriesId ?? "");
    if (!id) continue;
    const date=String(r?.observationDate ?? "");
    const old=latest.get(id);
    if (!old || date>old) latest.set(id,date);
  }
  let forwardRows=0;
  const upgraded=(rows ?? []).map(r=>{
    const id=String(r?.providerSeriesId ?? "");
    const date=String(r?.observationDate ?? "");
    const old=prior.get(id) ?? null;
    const isLatest=date && latest.get(id)===date;
    const isNewLatest=isLatest && old!=null && date>old;
    if (!isNewLatest) return r;
    forwardRows++;
    return {
      ...r,
      availableAt:retrievedAt,
      pitClass:EMPLOYMENT_R4_PIT_CLASSES.forwardObserved,
      provenance:{
        ...(r.provenance ?? {}),
        forwardObservedAt:retrievedAt,
        priorStoredObservationDate:old,
      },
    };
  });
  return {rows:upgraded,forwardRows,priorSeries:prior.size};
}

export async function collectEmploymentR4BedShadow({
  db,
  provider=createEmploymentR4BedProvider(),
  now=()=>new Date(),
  storeFactory=createEmploymentR4ShadowStore,
  lockTtlMs=10*60*1000,
  startyear=null,
  endyear=null,
}={}) {
  if(!db||typeof db.prepare!=="function") throw new TypeError("D1_DATABASE_REQUIRED");
  const store=storeFactory(db,{now});
  await store.initialize();
  const lease=await store.acquire("employment-r4-bed-quarterly-collector",{ttlMs:lockTtlMs});
  if(!lease?.acquired) {
    return {status:"SKIPPED_LOCKED",scoreComputed:false,providerRequests:0,collectedRows:0,forwardRows:0};
  }

  const startedAt=now().toISOString();
  let runRecorded=false;
  try {
    const existing=await store.getCurrentRows();
    const fetched=await provider.fetchBedQuarterly({startyear,endyear});
    const prepared=upgradeNewForwardRows(fetched.rows,existing,fetched.retrievedAt ?? now().toISOString());
    const write=prepared.rows.length
      ? await store.upsertRows({rows:prepared.rows,retrievedAt:fetched.retrievedAt ?? now().toISOString()})
      : {inserted:0,revised:0,noop:0,rejected:0,rejections:[],accepted:0,currentRows:(await store.countRows()).current,historyRowsAdded:0};

    const missing=Array.isArray(fetched?.meta?.missingSeries)?fetched.meta.missingSeries:[];
    const status=missing.length || write.rejected ? "PARTIAL" : "SUCCESS";
    const completedAt=now().toISOString();
    const runId=await store.recordRun({
      provider:BED_RUN_PROVIDER,
      collectorRevision:EMPLOYMENT_R4_BED_COLLECTOR_REVISION,
      status,
      startedAt,
      completedAt,
      providerRequests:Number(fetched?.requestCount ?? 0),
      collectedRows:prepared.rows.length,
      insertedCount:write.inserted,
      revisedCount:write.revised,
      noopCount:write.noop,
      rejectedCount:write.rejected,
      partialCount:(missing.length?1:0)+(write.rejected?1:0),
      currentRows:write.currentRows,
      historyRowsAdded:write.historyRowsAdded,
      failureCode:missing.length?"BED_SERIES_PARTIAL":write.rejected?"ROW_REJECTED":null,
      detail:{
        missingSeries:missing,
        providerMeta:fetched?.meta ?? null,
        forwardRows:prepared.forwardRows,
        priorSeries:prepared.priorSeries,
        scoreComputed:false,
        publicScoreChanged:false,
        activeMethodologyChanged:false,
      },
    });
    runRecorded=true;
    return {
      status,
      runId,
      providerRequests:Number(fetched?.requestCount ?? 0),
      collectedRows:prepared.rows.length,
      forwardRows:prepared.forwardRows,
      priorSeries:prepared.priorSeries,
      inserted:write.inserted,
      revised:write.revised,
      noop:write.noop,
      rejected:write.rejected,
      currentRows:write.currentRows,
      historyRowsAdded:write.historyRowsAdded,
      missingSeries:missing,
      scoreComputed:false,
      publicScoreChanged:false,
      activeMethodologyChanged:false,
    };
  } catch(error) {
    if(!runRecorded) {
      const completedAt=now().toISOString();
      await store.recordRun({
        provider:BED_RUN_PROVIDER,
        collectorRevision:EMPLOYMENT_R4_BED_COLLECTOR_REVISION,
        status:"FAIL",
        startedAt,
        completedAt,
        providerRequests:0,
        collectedRows:0,
        failureCode:"BED_COLLECTOR_EXCEPTION",
        detail:{error:String(error?.message ?? error),scoreComputed:false,publicScoreChanged:false},
      }).catch(()=>null);
    }
    throw error;
  } finally {
    await store.release(lease).catch(()=>false);
  }
}

export const EMPLOYMENT_R4_BED_COLLECTOR_CONTRACT = Object.freeze({
  revision:EMPLOYMENT_R4_BED_COLLECTOR_REVISION,
  provider:BED_RUN_PROVIDER,
  storeOnly:true,
  scoreComputed:false,
  publicScoreWiring:false,
  activeMethodologyChanged:false,
  separateQuarterlyLane:true,
  providerRequestsPerRun:EMPLOYMENT_R4_BED_PROVIDER_CONTRACT.requestsPerRun,
  tableReuse:true,
});
