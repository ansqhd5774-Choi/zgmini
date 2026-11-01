import {
  C1_R3_OPERATIONAL_CONFIG,
  C1_R3_REQUIRED_SOURCE_KEYS,
  C1_R3_BASELINE_SCORE_DATE,
} from "../lib/market-score/consumption-r3-operational-config.mjs";
import {
  latestCompletedQuarter,
  collectConsumptionR3NormalizedSources,
} from "./consumption-r3-provider-collector.mjs";
import {
  persistConsumptionR3SourcePayloads,
  sourceKeysMissingForScoreDate,
} from "./consumption-r3-source-store.mjs";
import {refreshConsumptionR3FromStored} from "./consumption-r3-refresh.mjs";

const REVISION="R3.45P";
const MAX_SOURCES_PER_RUN=10;
const HEAVY_SOURCE_KEYS=Object.freeze(new Set(["CENSUS:MARTS","NYFED:HHDC","EIA:WPSR"]));

export function selectConsumptionR3SourceBatch(missing=[],limit=MAX_SOURCES_PER_RUN){
  if(!Array.isArray(missing))throw new Error("C1_R3_BATCH_MISSING_INVALID");
  if(!Number.isSafeInteger(limit)||limit<1||limit>MAX_SOURCES_PER_RUN)throw new Error("C1_R3_BATCH_LIMIT_INVALID");
  const light=missing.filter(key=>!HEAVY_SOURCE_KEYS.has(key));
  if(light.length)return light.slice(0,limit);
  const heavy=missing.find(key=>HEAVY_SOURCE_KEYS.has(key));
  return heavy?[heavy]:[];
}
const initByDb=new WeakMap();

const validDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const alfredSeries=Object.freeze(
  [...new Set([
    ...C1_R3_OPERATIONAL_CONFIG.base99
      .filter(x=>C1_R3_OPERATIONAL_CONFIG.core95Ids.includes(x.candidate_id)&&x.route==="ALFRED")
      .map(x=>x.series_id),
    C1_R3_OPERATIONAL_CONFIG.helpers.CPI,
    C1_R3_OPERATIONAL_CONFIG.helpers.DPI,
    C1_R3_OPERATIONAL_CONFIG.helpers.AHE_NOMINAL,
  ])].sort()
);

async function ensureClaimTable(db){
  let p=initByDb.get(db);
  if(!p){
    p=db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS c1_r3_refresh_claims_v1 (
        revision TEXT NOT NULL,
        score_date TEXT NOT NULL,
        attempt_date TEXT NOT NULL,
        claim_key TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        detail TEXT,
        PRIMARY KEY(revision,score_date,attempt_date,claim_key)
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS c1_r3_refresh_claim_lookup_v1
        ON c1_r3_refresh_claims_v1(revision,score_date,attempt_date)`),
    ]).catch(error=>{initByDb.delete(db);throw error});
    initByDb.set(db,p);
  }
  await p;
}
async function all(db,sql,args=[]){
  const r=await db.prepare(sql).bind(...args).all();
  return Array.isArray(r?.results)?r.results:[];
}
async function defaultHasCompleteCalculation(db,{scoreDate}={}){
  if(!db||typeof db.prepare!=="function")return false;
  const rows=await all(db,`SELECT COUNT(*) AS row_count
    FROM c1_r3_candidate_scores_v1
    WHERE revision=? AND score_date=?`,[REVISION,scoreDate]);
  return Number(rows[0]?.row_count??0)===95;
}
async function defaultClaimBatch(db,{scoreDate,attemptDate,claimKey,startedAt}={}){
  await ensureClaimTable(db);
  const result=await db.batch([
    db.prepare(`INSERT OR IGNORE INTO c1_r3_refresh_claims_v1(
      revision,score_date,attempt_date,claim_key,status,started_at
    ) VALUES(?,?,?,?,?,?)`).bind(
      REVISION,scoreDate,attemptDate,claimKey,"STARTED",startedAt
    ),
  ]);
  const changes=Number(result?.[0]?.meta?.changes??result?.[0]?.meta?.rows_written??0);
  return Number.isFinite(changes)&&changes>0;
}
async function defaultFinishClaim(db,{scoreDate,attemptDate,claimKey,status,finishedAt,detail}={}){
  if(!db||typeof db.prepare!=="function")return;
  await db.batch([
    db.prepare(`UPDATE c1_r3_refresh_claims_v1
      SET status=?,finished_at=?,detail=?
      WHERE revision=? AND score_date=? AND attempt_date=? AND claim_key=?`).bind(
      status,finishedAt,detail??null,REVISION,scoreDate,attemptDate,claimKey
    ),
  ]);
}

/** @param {{env?:import('./runtime-contracts').DataEnv,asOf?:string,fetchImpl?:typeof fetch,now?:()=>Date,maxSourcesPerRun?:number,dependencies?:{hasCompleteCalculation?:typeof defaultHasCompleteCalculation,sourceKeysMissing?:typeof sourceKeysMissingForScoreDate,claimBatch?:typeof defaultClaimBatch,finishClaim?:typeof defaultFinishClaim,collectSources?:typeof collectConsumptionR3NormalizedSources,persistSources?:typeof persistConsumptionR3SourcePayloads,refreshFromStored?:typeof refreshConsumptionR3FromStored}}} [options] */
export async function runConsumptionR3OperationalRefresh({
  env,
  asOf,
  fetchImpl=globalThis.fetch,
  now=()=>new Date(),
  maxSourcesPerRun=MAX_SOURCES_PER_RUN,
  dependencies={},
}={}){
  if(!validDate(asOf))throw new Error("C1_R3_RUNTIME_ASOF_INVALID");
  const db=env?.DB;
  if(!db||typeof db.prepare!=="function"){
    return {status:"SKIPPED_DB_UNAVAILABLE",providerRequests:0,calculated:false};
  }

  const target=latestCompletedQuarter(asOf);
  if(target.scoreDate<=C1_R3_BASELINE_SCORE_DATE){
    return {
      status:"SKIPPED_BASELINE_CURRENT",
      quarter:target.quarter,
      scoreDate:target.scoreDate,
      providerRequests:0,
      calculated:false,
    };
  }

  const hasComplete=dependencies.hasCompleteCalculation??defaultHasCompleteCalculation;
  const missingKeys=dependencies.sourceKeysMissing??sourceKeysMissingForScoreDate;
  const claimBatch=dependencies.claimBatch??defaultClaimBatch;
  const finishClaim=dependencies.finishClaim??defaultFinishClaim;
  const collect=dependencies.collectSources??collectConsumptionR3NormalizedSources;
  const persist=dependencies.persistSources??persistConsumptionR3SourcePayloads;
  const refresh=dependencies.refreshFromStored??refreshConsumptionR3FromStored;

  if(await hasComplete(db,{scoreDate:target.scoreDate})){
    return {
      status:"SKIPPED_SCORE_ALREADY_COMPLETE",
      quarter:target.quarter,
      scoreDate:target.scoreDate,
      providerRequests:0,
      calculated:false,
    };
  }

  let missing=await missingKeys(db,{scoreDate:target.scoreDate});
  if(!Array.isArray(missing))throw new Error("C1_R3_RUNTIME_MISSING_KEYS_INVALID");
  const unknown=missing.filter(x=>!C1_R3_REQUIRED_SOURCE_KEYS.includes(x));
  if(unknown.length)throw new Error(`C1_R3_RUNTIME_UNKNOWN_MISSING_KEYS:${unknown.join("|")}`);

  if(!missing.length){
    const calc=await refresh(db,{asOf,computedAt:now().toISOString()});
    return {...calc,providerRequests:0,quarter:target.quarter,scoreDate:target.scoreDate};
  }

  const batch=selectConsumptionR3SourceBatch(missing,maxSourcesPerRun);
  const attemptDate=asOf;
  const claimKey=batch[0];
  const startedAt=now().toISOString();
  const claimed=await claimBatch(db,{
    scoreDate:target.scoreDate,
    attemptDate,
    claimKey,
    startedAt,
  });
  if(!claimed){
    return {
      status:"SKIPPED_BATCH_ALREADY_CLAIMED_TODAY",
      quarter:target.quarter,
      scoreDate:target.scoreDate,
      providerRequests:0,
      calculated:false,
      remainingSources:missing.length,
    };
  }

  try{
    const collected=await collect({
      scoreDate:target.scoreDate,
      alfredSeries,
      sourceKeys:batch,
      fetchImpl,
    });
    const keys=Object.keys(collected?.payloads??{});
    if(collected?.scoreComputed!==false)throw new Error("C1_R3_RUNTIME_COLLECTOR_SCORED");
    if(keys.length!==batch.length||batch.some(k=>!keys.includes(k))){
      throw new Error(`C1_R3_RUNTIME_BATCH_INCOMPLETE:${keys.length}/${batch.length}`);
    }

    await persist(db,{
      scoreDate:target.scoreDate,
      quarter:target.quarter,
      payloads:collected.payloads,
      sourceUrls:collected.sourceUrls??{},
      retrievedAt:now().toISOString(),
    });

    missing=await missingKeys(db,{scoreDate:target.scoreDate});
    if(!Array.isArray(missing))throw new Error("C1_R3_RUNTIME_MISSING_KEYS_INVALID_AFTER_STORE");

    let calc=null;
    if(!missing.length){
      calc=await refresh(db,{asOf,computedAt:now().toISOString()});
    }
    const status=calc?.calculated===true?"CALCULATED_AND_STORED":"SOURCE_BATCH_STORED";
    await finishClaim(db,{
      scoreDate:target.scoreDate,
      attemptDate,
      claimKey,
      status,
      finishedAt:now().toISOString(),
      detail:JSON.stringify({stored:keys.length,remaining:missing.length}),
    });
    return {
      status,
      quarter:target.quarter,
      scoreDate:target.scoreDate,
      providerRequests:Number(collected?.providerRequests??keys.length),
      storedSources:keys.length,
      remainingSources:missing.length,
      calculated:calc?.calculated===true,
      flat7:calc?.flat7??null,
    };
  }catch(error){
    await finishClaim(db,{
      scoreDate:target.scoreDate,
      attemptDate,
      claimKey,
      status:"FAILED",
      finishedAt:now().toISOString(),
      detail:String(error?.message??error).slice(0,1000),
    }).catch(()=>undefined);
    throw error;
  }
}

export const C1_R3_OPERATIONAL_REFRESH_CONTRACT=Object.freeze({
  revision:REVISION,
  operationalRevision:"C1-OP-R3",
  trigger:"EXTERNAL_HTTP_PRIMARY_WITH_INTERNAL_FALLBACKS",
  primaryTrigger:"AUTHENTICATED_EXTERNAL_HTTP_SCHEDULER",
  secondaryTrigger:"CLOUDFLARE_SCHEDULED_CRON",
  fallbackTrigger:"PUBLIC_MARKET_SCORE_WAITUNTIL",
  externalRoute:"/api/internal/c1-r3-refresh",
  target:"LATEST_COMPLETED_QUARTER_ONLY",
  maxProviderSourcesPerInvocation:MAX_SOURCES_PER_RUN,
  externalMaxSourcesPerInvocation:1,
  maxHeavySourcesPerInvocation:1,
  retry:"ON_NEXT_UTC_DATE_FOR_SAME_FAILED_BATCH",
  sourcePersistence:"D1_BEFORE_CALCULATION",
  calculation:"STORED_SOURCE_ONLY",
  responsePathIndependent:true,
});
