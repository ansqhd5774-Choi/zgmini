import {
  EMPLOYMENT_R4_SHADOW_TABLES,
} from "./employment-r4-shadow-contract.mjs";
import {
  createEmploymentR4ShadowStore,
} from "./employment-r4-shadow-store.mjs";
import {
  collectEmploymentR4BedShadow,
} from "./employment-r4-bed-collector.mjs";
import {
  createEmploymentR4BedProvider,
  EMPLOYMENT_R4_BED_PROVIDER_CONTRACT,
} from "./employment-r4-bed-provider.mjs";

const DAY_MS=24*60*60*1000;
const QUARTERLY_MIN_MS=90*DAY_MS;
const RETRY_TTL_MS=24*60*60*1000;
const BED_RUNTIME_PROVIDER="EMPLOYMENT_R4_BED_RUNTIME";
const BED_RUNTIME_REVISION="EMP-R4-BED-RUNTIME-R1";
const EXISTING_RUNTIME_PROVIDER="EMPLOYMENT_R4_RUNTIME";
const BLS_UNREGISTERED_DAILY_QUERY_LIMIT=25;
const EXISTING_RUNTIME_MAX_BLS_PER_ATTEMPT=2;
const BED_REQUESTS_PER_ATTEMPT=EMPLOYMENT_R4_BED_PROVIDER_CONTRACT.requestsPerRun;

function asDate(value) {
  const out=value instanceof Date?value:new Date(value);
  if(!Number.isFinite(out.getTime())) throw new TypeError("NOW_INVALID");
  return out;
}
function n(value){const out=Number(value ?? 0);return Number.isFinite(out)?out:0;}
function ageMs(thenIso,now) {
  const t=Date.parse(String(thenIso ?? ""));
  return Number.isFinite(t)?Math.max(0,now.getTime()-t):Infinity;
}

export async function readEmploymentR4BedRuntimeGate({db,now=()=>new Date()}={}) {
  if(!db||typeof db.prepare!=="function") throw new TypeError("D1_DATABASE_REQUIRED");
  const current=asDate(now());
  const since=new Date(current.getTime()-DAY_MS).toISOString();
  const latest=await db.prepare(`SELECT status,completed_at FROM ${EMPLOYMENT_R4_SHADOW_TABLES.runs}
    WHERE provider=? ORDER BY completed_at DESC LIMIT 1`).bind(BED_RUNTIME_PROVIDER).first();
  const existingCount=await db.prepare(`SELECT COUNT(*) AS n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.runs}
    WHERE provider=? AND completed_at>=?`).bind(EXISTING_RUNTIME_PROVIDER,since).first();
  const bedCount=await db.prepare(`SELECT COUNT(*) AS n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.runs}
    WHERE provider=? AND completed_at>=?`).bind(BED_RUNTIME_PROVIDER,since).first();
  return {
    latestStatus:latest?.status ?? null,
    latestCompletedAt:latest?.completed_at ?? null,
    existingRuntimeAttempts24h:n(existingCount?.n),
    bedRuntimeAttempts24h:n(bedCount?.n),
  };
}

function gateDecision(gate,now) {
  if(String(gate?.latestStatus ?? "")==="SUCCESS" && ageMs(gate?.latestCompletedAt,now)<QUARTERLY_MIN_MS) {
    return "SKIPPED_QUARTERLY_CADENCE";
  }
  if(n(gate?.bedRuntimeAttempts24h)>=1) return "SKIPPED_BED_DAILY_ATTEMPT";
  const conservativeUsed=n(gate?.existingRuntimeAttempts24h)*EXISTING_RUNTIME_MAX_BLS_PER_ATTEMPT;
  if(conservativeUsed+BED_REQUESTS_PER_ATTEMPT>BLS_UNREGISTERED_DAILY_QUERY_LIMIT) {
    return "SKIPPED_BLS_SHARED_BUDGET";
  }
  return null;
}

export async function runEmploymentR4BedQuarterlyStep({
  env,
  fetchImpl=globalThis.fetch,
  now=()=>new Date(),
  storeFactory=createEmploymentR4ShadowStore,
  providerFactory=createEmploymentR4BedProvider,
  collectBed=collectEmploymentR4BedShadow,
  gateReader=readEmploymentR4BedRuntimeGate,
}={}) {
  const db=env?.DB;
  if(!db||typeof db.prepare!=="function") {
    return {status:"SKIPPED_DB_UNAVAILABLE",providerRequests:0,dbWrites:0,scoreComputed:false};
  }
  const current=asDate(now());
  const store=storeFactory(db,{now});
  await store.initialize();

  let gate=await gateReader({db,now});
  let decision=gateDecision(gate,current);
  if(decision) return {status:decision,providerRequests:0,dbWrites:0,scoreComputed:false,gate};

  const lease=await store.acquire("employment-r4-bed-runtime-dispatch",{ttlMs:RETRY_TTL_MS});
  if(!lease?.acquired) {
    return {status:"SKIPPED_BED_RETRY_THROTTLE",providerRequests:0,dbWrites:0,scoreComputed:false,gate};
  }

  let releaseLease=true;
  const startedAt=current.toISOString();
  try {
    gate=await gateReader({db,now});
    decision=gateDecision(gate,current);
    if(decision) {
      await store.release(lease);
      return {status:decision,providerRequests:0,dbWrites:0,scoreComputed:false,gate};
    }

    const provider=providerFactory({fetchImpl,now});
    const bed=await collectBed({db,provider,now});
    const collectorStatus=String(bed?.status ?? "UNKNOWN");
    const forwardRows=n(bed?.forwardRows);
    const priorSeries=n(bed?.priorSeries);
    const status=collectorStatus!=="SUCCESS"
      ? "PARTIAL"
      : forwardRows>0
        ? "SUCCESS"
        : priorSeries===0
          ? "BASELINE_STORED"
          : "NO_NEW_FORWARD_RELEASE";
    const completedAt=asDate(now()).toISOString();
    const providerRequests=n(bed?.providerRequests);
    const dbWrites=n(bed?.inserted)+n(bed?.revised)+n(bed?.noop);

    await store.recordRun({
      provider:BED_RUNTIME_PROVIDER,
      collectorRevision:BED_RUNTIME_REVISION,
      status,
      startedAt,
      completedAt,
      providerRequests,
      collectedRows:n(bed?.collectedRows),
      insertedCount:n(bed?.inserted),
      revisedCount:n(bed?.revised),
      noopCount:n(bed?.noop),
      rejectedCount:n(bed?.rejected),
      partialCount:status==="PARTIAL"?1:0,
      currentRows:n(bed?.currentRows),
      historyRowsAdded:n(bed?.historyRowsAdded),
      failureCode:status==="PARTIAL"?"BED_RUNTIME_PARTIAL":null,
      detail:{
        bedStatus:bed?.status ?? null,
        forwardRows,
        priorSeries,
        missingSeries:bed?.missingSeries ?? [],
        scoreComputed:false,
        publicScoreChanged:false,
        activeMethodologyChanged:false,
      },
    });

    if(status!=="PARTIAL") await store.release(lease);
    else releaseLease=false;
    return {status,providerRequests,dbWrites,scoreComputed:false,bed,gate};
  } catch(error) {
    releaseLease=false;
    const completedAt=asDate(now()).toISOString();
    await store.recordRun({
      provider:BED_RUNTIME_PROVIDER,
      collectorRevision:BED_RUNTIME_REVISION,
      status:"FAIL",
      startedAt,
      completedAt,
      providerRequests:0,
      collectedRows:0,
      failureCode:"BED_RUNTIME_EXCEPTION",
      detail:{error:String(error?.message ?? error),scoreComputed:false,publicScoreChanged:false},
    }).catch(()=>null);
    return {status:"FAIL",providerRequests:0,dbWrites:0,scoreComputed:false,failureCode:String(error?.message ?? error)};
  } finally {
    if(releaseLease) await store.release(lease).catch(()=>false);
  }
}

export const EMPLOYMENT_R4_BED_RUNTIME_CONTRACT=Object.freeze({
  revision:BED_RUNTIME_REVISION,
  routeWiring:false,
  schedulerRequired:true,
  separateQuarterlyLane:true,
  storeOnly:true,
  scoreComputed:false,
  publicScoreChanged:false,
  activeMethodologyChanged:false,
  quarterlyMinimumCadenceMs:QUARTERLY_MIN_MS,
  failureRetryThrottleMs:RETRY_TTL_MS,
  maxBedRuntimeAttemptsPer24h:1,
  blsUnregisteredDailyQueryLimit:BLS_UNREGISTERED_DAILY_QUERY_LIMIT,
  existingRuntimeMaxBlsPerAttempt:EXISTING_RUNTIME_MAX_BLS_PER_ATTEMPT,
  bedRequestsPerAttempt:BED_REQUESTS_PER_ATTEMPT,
});
