import {persistInflationPitBatch} from "./inflation-pit-backfill.mjs";
import {persistInflationPcePc1,INFLATION_PCE_PC1_MODE} from "./inflation-pce-pc1-store.mjs";

const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
async function firstRow(db,sql,args){
  const statement=db.prepare(sql).bind(...args);
  if(typeof statement.first==="function")return await statement.first();
  if(typeof statement.all==="function"){
    const out=await statement.all();
    return Array.isArray(out?.results)?out.results[0]??null:null;
  }
  throw new Error("INFLATION_R2_DB_READ_UNSUPPORTED");
}
async function alreadyCollected(db,asOf){
  if(!db||typeof db.prepare!=="function")return false;
  try{
    const row=await firstRow(
      db,
      `SELECT snapshot_sha256 FROM api_history_snapshots_v1
        WHERE provider=? AND dataset=? AND history_mode=? AND as_of=?
        ORDER BY retrieved_at DESC LIMIT 1`,
      ["FRED","PCEPILFE",INFLATION_PCE_PC1_MODE,asOf],
    );
    return Boolean(row?.snapshot_sha256);
  }catch{
    return false;
  }
}
export async function collectInflationR2StoreOnly({
  env,
  asOf,
  fetchImpl=globalThis.fetch,
}={}){
  if(!validDate(asOf))throw new Error("INFLATION_R2_ASOF_INVALID");
  const db=env?.DB;
  const key=typeof env?.FRED_API_KEY==="string"?env.FRED_API_KEY.trim():"";
  if(!db||typeof db.prepare!=="function"||typeof db.batch!=="function"){
    return {status:"SKIPPED_DB_UNAVAILABLE",requestCount:0,automaticRetries:0};
  }
  if(!key)return {status:"SKIPPED_FRED_KEY_MISSING",requestCount:0,automaticRetries:0};
  if(await alreadyCollected(db,asOf)){
    return {status:"SKIPPED_ALREADY_STORED_TODAY",requestCount:0,automaticRetries:0};
  }

  const [batch1,batch2]=await Promise.all([
    persistInflationPitBatch(db,{key,batch:1,observationEnd:asOf,fetchImpl}),
    persistInflationPitBatch(db,{key,batch:2,observationEnd:asOf,fetchImpl}),
  ]);
  const requestCount=(batch1.requestCount??0)+(batch2.requestCount??0);
  if(batch1.status!=="STORED"||batch2.status!=="STORED"){
    return {
      status:"PARTIAL_PIT_STORE",
      requestCount,
      automaticRetries:0,
      batches:[batch1.status,batch2.status],
      pcePc1:null,
    };
  }
  const pcePc1=await persistInflationPcePc1(db,{key,asOf,fetchImpl});
  return {
    status:pcePc1.status==="STORED"?"STORED":"PARTIAL_PCE_PC1_STORE",
    requestCount:requestCount+(pcePc1.requestCount??0),
    automaticRetries:0,
    batches:[batch1.status,batch2.status],
    pcePc1:pcePc1.status,
  };
}

export const INFLATION_R2_COLLECTOR_CONTRACT=Object.freeze({
  schemaVersion:1,
  role:"API_COLLECTION_AND_STORAGE_ONLY",
  scoreReadsProvider:false,
  pitBatches:2,
  pitRequestsPerBatch:8,
  pcePc1Requests:2,
  maxProviderRequestsWhenDue:18,
  automaticRetries:0,
  skipsWhenPcePc1SnapshotAlreadyStoredForAsOf:true,
});
