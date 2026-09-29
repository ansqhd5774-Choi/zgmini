import { EMPLOYMENT_R4_SHADOW_TABLES } from "./employment-r4-shadow-contract.mjs";
import { createEmploymentR4ShadowProvider } from "./employment-r4-shadow-provider.mjs";
import { createEmploymentR4ShadowStore } from "./employment-r4-shadow-store.mjs";
import { collectEmploymentR4Shadow } from "./employment-r4-shadow-collector.mjs";
import { runEmploymentR4HistoryBackfillOneStep } from "./employment-r4-history-worker-domain.mjs";
import { runEmploymentR4BedQuarterlyStep } from "./employment-r4-bed-runtime.mjs";

const DAY_MS=24*60*60*1000;
const RETRY_TTL_MS=10*60*1000;
const RUNTIME_PROVIDER="EMPLOYMENT_R4_RUNTIME";
const RUNTIME_REVISION="EMP-R4-RUNTIME-WIRING-R1";
const MAX_ATTEMPTS_24H=12;

function asDate(value){
  const out=value instanceof Date?value:new Date(value);
  if(!Number.isFinite(out.getTime()))throw new TypeError("NOW_INVALID");
  return out;
}
function n(value){const out=Number(value??0);return Number.isFinite(out)?out:0;}
function ageMs(thenIso,now){
  const t=Date.parse(String(thenIso??""));
  return Number.isFinite(t)?Math.max(0,now.getTime()-t):Infinity;
}
function historyWriteSummary(history){
  const parts=[history?.claims?.write,history?.geographic?.write].filter(Boolean);
  return {
    inserted:parts.reduce((s,x)=>s+n(x?.inserted),0),
    revised:parts.reduce((s,x)=>s+n(x?.revised),0),
    noop:parts.reduce((s,x)=>s+n(x?.noop),0),
    rejected:parts.reduce((s,x)=>s+n(x?.rejected),0),
    rows:parts.reduce((s,x)=>s+n(x?.accepted),0),
    historyRowsAdded:parts.reduce((s,x)=>s+n(x?.historyRowsAdded),0),
  };
}

export async function readEmploymentR4RuntimeGate({db,now=()=>new Date()}={}){
  if(!db||typeof db.prepare!=="function")throw new TypeError("D1_DATABASE_REQUIRED");
  const current=asDate(now());
  const since=new Date(current.getTime()-DAY_MS).toISOString();
  const latest=await db.prepare(`SELECT status,completed_at FROM ${EMPLOYMENT_R4_SHADOW_TABLES.runs} WHERE provider=? ORDER BY completed_at DESC LIMIT 1`).bind(RUNTIME_PROVIDER).first();
  const count=await db.prepare(`SELECT COUNT(*) AS n FROM ${EMPLOYMENT_R4_SHADOW_TABLES.runs} WHERE provider=? AND completed_at>=?`).bind(RUNTIME_PROVIDER,since).first();
  return {
    latestStatus:latest?.status??null,
    latestCompletedAt:latest?.completed_at??null,
    attempts24h:n(count?.n),
  };
}

function gateDecision(gate,now){
  if(String(gate?.latestStatus??"")==="SUCCESS"&&ageMs(gate?.latestCompletedAt,now)<DAY_MS){
    return "SKIPPED_SUCCESS_CADENCE";
  }
  if(n(gate?.attempts24h)>=MAX_ATTEMPTS_24H)return "SKIPPED_PROVIDER_BUDGET";
  return null;
}

async function runEmploymentR4ShadowRuntimeCore({
  env,
  fetchImpl=globalThis.fetch,
  now=()=>new Date(),
  storeFactory=createEmploymentR4ShadowStore,
  providerFactory=createEmploymentR4ShadowProvider,
  collectForward=collectEmploymentR4Shadow,
  collectHistory=runEmploymentR4HistoryBackfillOneStep,
  gateReader=readEmploymentR4RuntimeGate,
}={}){
  const db=env?.DB;
  if(!db||typeof db.prepare!=="function"){
    return {status:"SKIPPED_DB_UNAVAILABLE",providerRequests:0,dbWrites:0,scoreComputed:false};
  }

  const current=asDate(now());
  const store=storeFactory(db,{now});
  await store.initialize();

  let gate=await gateReader({db,now});
  let decision=gateDecision(gate,current);
  if(decision)return {status:decision,providerRequests:0,dbWrites:0,scoreComputed:false,gate};

  const lease=await store.acquire("employment-r4-runtime-dispatch",{ttlMs:RETRY_TTL_MS});
  if(!lease?.acquired){
    return {status:"SKIPPED_RETRY_THROTTLE",providerRequests:0,dbWrites:0,scoreComputed:false,gate};
  }

  let releaseLease=true;
  const startedAt=current.toISOString();
  try{
    gate=await gateReader({db,now});
    decision=gateDecision(gate,current);
    if(decision){
      await store.release(lease);
      return {status:decision,providerRequests:0,dbWrites:0,scoreComputed:false,gate};
    }

    const provider=providerFactory({fetchImpl,now});
    const forward=await collectForward({db,provider,now});
    const history=await collectHistory({env,fetchImpl,now});
    const historyWrite=historyWriteSummary(history);
    const forwardStatus=String(forward?.status??"UNKNOWN");
    const historyStatus=String(history?.status??"UNKNOWN");
    const status=(forwardStatus==="SUCCESS"&&historyStatus!=="PARTIAL"&&historyStatus!=="SKIPPED_DB_UNAVAILABLE")?"SUCCESS":"PARTIAL";
    const completedAt=asDate(now()).toISOString();
    const providerRequests=n(forward?.providerRequests)+n(history?.providerRequests);
    const dbWrites=n(forward?.inserted)+n(forward?.revised)+n(forward?.noop)+historyWrite.inserted+historyWrite.revised+historyWrite.noop;

    await store.recordRun({
      provider:RUNTIME_PROVIDER,
      collectorRevision:RUNTIME_REVISION,
      status,
      startedAt,
      completedAt,
      providerRequests,
      collectedRows:n(forward?.collectedRows)+historyWrite.rows,
      insertedCount:n(forward?.inserted)+historyWrite.inserted,
      revisedCount:n(forward?.revised)+historyWrite.revised,
      noopCount:n(forward?.noop)+historyWrite.noop,
      rejectedCount:n(forward?.rejected)+historyWrite.rejected,
      partialCount:status==="SUCCESS"?0:1,
      currentRows:n(forward?.currentRows),
      historyRowsAdded:n(forward?.historyRowsAdded)+historyWrite.historyRowsAdded,
      failureCode:status==="SUCCESS"?null:"RUNTIME_PARTIAL",
      detail:{
        forwardStatus,
        historyStatus,
        claimsStatus:history?.claims?.status??null,
        geographicStatus:history?.geographic?.status??null,
        scoreComputed:false,
        publicScoreChanged:false,
      },
    });

    if(status==="SUCCESS")await store.release(lease);
    else releaseLease=false;

    return {status,providerRequests,dbWrites,scoreComputed:false,forward,history,gate};
  }catch(error){
    releaseLease=false;
    const completedAt=asDate(now()).toISOString();
    await store.recordRun({
      provider:RUNTIME_PROVIDER,
      collectorRevision:RUNTIME_REVISION,
      status:"FAIL",
      startedAt,
      completedAt,
      providerRequests:0,
      collectedRows:0,
      failureCode:"RUNTIME_EXCEPTION",
      detail:{error:String(error?.message??error),scoreComputed:false,publicScoreChanged:false},
    }).catch(()=>null);
    return {status:"FAIL",providerRequests:0,dbWrites:0,scoreComputed:false,failureCode:String(error?.message??error)};
  }finally{
    if(releaseLease)await store.release(lease).catch(()=>false);
  }
}


export async function runEmploymentR4ShadowRuntimeStep(options={}){
  const {bedRuntimeStep=runEmploymentR4BedQuarterlyStep,...dailyOptions}=options??{};
  const daily=await runEmploymentR4ShadowRuntimeCore(dailyOptions);
  let bed;
  try{
    bed=await bedRuntimeStep({
      env:dailyOptions.env,
      fetchImpl:dailyOptions.fetchImpl??globalThis.fetch,
      now:dailyOptions.now??(()=>new Date()),
    });
  }catch(error){
    bed={
      status:"FAIL",
      providerRequests:0,
      dbWrites:0,
      scoreComputed:false,
      failureCode:`BED_RUNTIME_WRAPPER_EXCEPTION:${String(error?.message??error)}`,
    };
  }
  return {
    ...daily,
    bed,
    bedStatus:String(bed?.status??"UNKNOWN"),
    bedProviderRequests:n(bed?.providerRequests),
    bedDbWrites:n(bed?.dbWrites),
    scoreComputed:false,
  };
}

export const EMPLOYMENT_R4_RUNTIME_TRIGGER_CONTRACT=Object.freeze({
  revision:RUNTIME_REVISION,
  waitUntilOnly:true,
  storeOnly:true,
  scoreComputed:false,
  publicScoreChanged:false,
  activeMethodologyChanged:false,
  forwardBeforeHistory:true,
  successCadenceMs:DAY_MS,
  failureRetryThrottleMs:RETRY_TTL_MS,
  maxRuntimeAttemptsPer24h:MAX_ATTEMPTS_24H,
  maxBlsRequestsPerRuntimeAttempt:2,
  maxBlsRequestsPer24hByRuntime:MAX_ATTEMPTS_24H*2,
  bedSequentialAfterDaily:true,
  bedRouteWiredThroughExistingWaitUntil:true,
  bedFailureIsolatedFromDailyResult:true,
});
