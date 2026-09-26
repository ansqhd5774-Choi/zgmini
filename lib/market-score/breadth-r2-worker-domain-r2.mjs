import { collectBreadthR2ToStore } from "./breadth-r2-collector-r2.mjs";
import { createBreadthR2D1StoreR2 } from "./breadth-r2-d1-store-r2.mjs";
import { readBreadthR2StoredScore } from "./breadth-r2-stored-score-r2.mjs";
import {
  projectBreadthR2FinalPublicDomain,
  buildBreadthR2UnavailablePublicDomain,
  assertBreadthR2PublicContract,
} from "./breadth-r2-public-domain-r1.mjs";

export const BREADTH_R2_WORKER_DOMAIN_R2 = "BREADTH-R2-WORKER-DOMAIN-R2";

const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);

export async function collectBreadthR2StoreOnlyR2({
  env={},
  asOf,
  storeFactory=createBreadthR2D1StoreR2,
  collector=collectBreadthR2ToStore,
}={}){
  if(!validDate(asOf))return {status:"SKIPPED_INVALID_ASOF",providerRequests:0,scoreComputed:false};
  if(!env?.DB)return {status:"SKIPPED_STORAGE_CONFIGURATION_MISSING",providerRequests:0,scoreComputed:false};
  if(typeof env?.BEA_USER_ID!=="string"||!env.BEA_USER_ID.trim()){
    return {status:"SKIPPED_PROVIDER_CONFIGURATION_MISSING",providerRequests:0,scoreComputed:false};
  }
  const store=storeFactory(env.DB);
  await store.initialize();
  const prior=await store.latestSuccessfulRun(asOf);
  if(prior){
    return {
      status:"SKIPPED_ALREADY_SUCCESS",
      providerRequests:0,
      scoreComputed:false,
      priorRunId:prior.run_id??prior.runId??null,
    };
  }
  return await collector({
    env,
    db:env.DB,
    store,
    asOfDate:asOf,
    beaUserId:env.BEA_USER_ID,
  });
}

export async function readBreadthR2StoredPublicDomainR2({
  env={},
  asOf,
  runtimeOptions={},
  storedScoreReader=readBreadthR2StoredScore,
}={}){
  if(!validDate(asOf))return buildBreadthR2UnavailablePublicDomain("BREADTH_R2_ASOF_INVALID");
  if(!env?.DB)return buildBreadthR2UnavailablePublicDomain("BREADTH_R2_STORAGE_CONFIGURATION_MISSING");
  try{
    const result=await storedScoreReader({
      env,
      db:env.DB,
      asOfDate:asOf,
      includeBenchmark:false,
      now:runtimeOptions?.now??(()=>new Date()),
    });
    const domain=projectBreadthR2FinalPublicDomain(result);
    assertBreadthR2PublicContract(domain);
    return domain;
  }catch{
    return buildBreadthR2UnavailablePublicDomain("BREADTH_R2_STORED_RUNTIME_UNAVAILABLE");
  }
}
