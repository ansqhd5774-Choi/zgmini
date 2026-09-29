import { createEmploymentR4ShadowProvider } from "./employment-r4-shadow-provider.mjs";
import { createEmploymentR4ShadowStore } from "./employment-r4-shadow-store.mjs";
import {
  collectClaimsHistoricalOneBatch,
  collectGeographicHistoricalOneBatch,
} from "./employment-r4-history-backfill.mjs";

const LOCK_TTL_MS=10*60*1000;

async function runFamily({
  family,
  db,
  provider,
  storeFactory,
  now,
  lockKey,
  collect,
}){
  const store=storeFactory(db,{now});
  await store.initialize();
  const lease=await store.acquire(lockKey,{ttlMs:LOCK_TTL_MS});
  if(!lease?.acquired){
    return {family,status:"SKIPPED_LOCKED",providerRequests:0,dbWrites:0,released:false};
  }

  let release=true;
  try{
    const result=await collect({db,provider,storeFactory,now});
    return {
      ...result,
      dbWrites:Number(result?.write?.inserted??0)+Number(result?.write?.revised??0)+Number(result?.write?.noop??0),
      released:true,
    };
  }catch(error){
    // Keep the lease until TTL expiry on failure. This is the retry throttle;
    // no new table or external scheduler is required.
    release=false;
    return {
      family,status:"FAILED",providerRequests:0,dbWrites:0,released:false,
      failureCode:String(error?.message??error),
    };
  }finally{
    if(release)await store.release(lease);
  }
}

export async function runEmploymentR4HistoryBackfillOneStep({
  env,
  fetchImpl=globalThis.fetch,
  now=()=>new Date(),
  storeFactory=createEmploymentR4ShadowStore,
  providerFactory=createEmploymentR4ShadowProvider,
}={}){
  const db=env?.DB;
  if(!db||typeof db.prepare!=="function"){
    return {
      status:"SKIPPED_DB_UNAVAILABLE",
      providerRequests:0,
      dbWrites:0,
      scoreComputed:false,
      claims:{status:"SKIPPED_DB_UNAVAILABLE"},
      geographic:{status:"SKIPPED_DB_UNAVAILABLE"},
    };
  }

  const claimsProvider=providerFactory({fetchImpl,now});
  const geographicProvider=providerFactory({fetchImpl,now});

  const [claims,geographic]=await Promise.all([
    runFamily({
      family:"claims",db,provider:claimsProvider,storeFactory,now,
      lockKey:"employment-r4-history-claims",
      collect:collectClaimsHistoricalOneBatch,
    }),
    runFamily({
      family:"geographic",db,provider:geographicProvider,storeFactory,now,
      lockKey:"employment-r4-history-geographic",
      collect:collectGeographicHistoricalOneBatch,
    }),
  ]);

  const providerRequests=Number(claims?.providerRequests??0)+Number(geographic?.providerRequests??0);
  const dbWrites=Number(claims?.dbWrites??0)+Number(geographic?.dbWrites??0);
  const failed=[claims,geographic].filter(x=>x?.status==="FAILED");
  const ready=[claims,geographic].every(x=>["SKIPPED_COVERAGE_READY","SKIPPED_NO_FORWARD_ANCHOR"].includes(x?.status));
  return {
    status:failed.length?"PARTIAL":ready?"IDLE_OR_READY":"PROGRESS",
    providerRequests,
    dbWrites,
    scoreComputed:false,
    claims,
    geographic,
  };
}

export const EMPLOYMENT_R4_HISTORY_WORKER_CONTRACT=Object.freeze({
  collectionLaneOnly:true,
  parallelFamilies:true,
  maxProviderRequestsPerStep:2,
  claimsLock:"employment-r4-history-claims",
  geographicLock:"employment-r4-history-geographic",
  failureRetryThrottleMs:LOCK_TTL_MS,
  failureRetryThrottleMechanism:"UNRELEASED_LEASE_UNTIL_TTL",
  forwardRunsTableTouched:false,
  scoreComputed:false,
  activeScoreChanged:false,
  publicUiChanged:false,
});
