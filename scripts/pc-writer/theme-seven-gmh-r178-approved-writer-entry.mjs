// W03 R178: opt-in connector for an EXISTING, separately approved PC Writer.
// This module does not acquire credentials, grant rights, schedule a task,
// install a PC source, or run at import time. No MarketParquet dependency.
import {runApprovedGmhSevenR178SavedOnce}
 from './theme-seven-gmh-r178-saved-to-cas-r1.mjs';
import {R32_KEY} from './theme-seven-gmh-r178-authorized-cas.mjs';
import {THEME_ETF_ROLLING_KEY}
 from '../../worker/theme-etf-rolling-public.mjs';
import {THEME_ETF_ONLY_PUBLIC_KEY}
 from '../../worker/theme-etf-only-public.mjs';

const fail=code=>{throw Object.assign(Error('W03_GMH_WRITER_'+code),
 {code:'W03_GMH_WRITER_'+code});};
const need=(ok,code)=>{if(!ok)fail(code);};
const ROW_SQL="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
const SEED_SQL='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
const CAS_SQL="UPDATE public_feed_snapshots_v1 SET body=?,stored_at=? WHERE kind='output' AND feed_key=? AND snapshot_key='current' AND stored_at=?";
const READ_KEYS=new Set([THEME_ETF_ROLLING_KEY,R32_KEY]);

function decoded(row){
 need(typeof row?.body==='string'&&
  Number.isSafeInteger(Number(row.stored_at))&&Number(row.stored_at)>0,
  'D1_ROW_MISSING_OR_INVALID');
 let body;
 try{body=JSON.parse(row.body);}catch{fail('D1_ROW_JSON_INVALID');}
 need(body&&typeof body==='object'&&!Array.isArray(body),
  'D1_ROW_BODY_INVALID');
 return {body,storedAt:Number(row.stored_at)};
}

// Adapter for scripts/pc-writer/d1.mjs client.query / client.request.
// No new SQL table, no upsert, no write except the one R178 stored_at CAS.
// A write or readback failure is terminal: never automatically retry a CAS.
export function approvedGmhSevenR178Storage({
 writerClient,coreDb,clock=Date.now
}={}){
 need(writerClient&&typeof writerClient.query==='function'&&
  typeof writerClient.request==='function'&&
  typeof coreDb==='string'&&/^[a-f0-9-]{36}$/.test(coreDb)&&
  typeof clock==='function','APPROVED_D1_CLIENT_REQUIRED');
 async function selectOne(sql,params){
  const response=await writerClient.query(coreDb,sql,params);
  need(Array.isArray(response?.results)&&response.results.length<=1,
   'D1_READ_RESULT_INVALID');
  return response.results[0];
 }
 return Object.freeze({
  async readSeed(){
   return decoded(await selectOne(SEED_SQL,[THEME_ETF_ONLY_PUBLIC_KEY])).body;
  },
  async read(key){
   need(READ_KEYS.has(key),'D1_READ_KEY_DENIED');
   return decoded(await selectOne(ROW_SQL,[key]));
  },
  async replace(key,record,previousStoredAt){
   need(key===THEME_ETF_ROLLING_KEY&&
    Number.isSafeInteger(previousStoredAt)&&previousStoredAt>0&&
    record&&typeof record==='object'&&!Array.isArray(record),
    'D1_CAS_SCOPE_DENIED');
   const storedAt=clock();
   need(Number.isSafeInteger(storedAt)&&storedAt>previousStoredAt,
    'D1_CAS_CLOCK_REGRESSION');
   const body=JSON.stringify(record);
   let result;
   try{
    result=await writerClient.request(coreDb,[{
     sql:CAS_SQL,params:[body,storedAt,key,previousStoredAt]
    }]);
   }catch{
    fail('D1_CAS_OUTCOME_UNKNOWN_NO_RETRY');
   }
   need(Array.isArray(result)&&result.length===1&&
    result[0]?.meta?.changes===1,
    'D1_CAS_NOT_APPLIED_NO_RETRY');
   const after=await selectOne(ROW_SQL,[key]);
   need(after?.body===body&&Number(after?.stored_at)===storedAt,
    'D1_CAS_READBACK_MISMATCH_NO_RETRY');
   return {storedAt};
  }
 });
}

// The approved Writer supplies its already authenticated d1.mjs client,
// approved public record and SHA-bound operator rights/price-policy verifier.
// No fallback to a self-asserted JSON flag, environment variable, or retired
// R179/MarketParquet credential path. The host must install/approve this source.
export async function runApprovedGmhSevenR178FromPcWriter({
 dataRoot,writerClient,coreDb,approvedRecord,verifyApprovedEffect,
 readSaved,readPrivate,now=Date.now(),clock=Date.now
}={}){
 // Reject before reading E: PC files, resolving auth or querying D1.
 need(approvedRecord&&typeof approvedRecord==='object'&&
  !Array.isArray(approvedRecord)&&
  typeof verifyApprovedEffect==='function'&&
  writerClient&&typeof writerClient.query==='function'&&
  typeof writerClient.request==='function',
  'APPROVAL_CONTEXT_REQUIRED');
 const storage=approvedGmhSevenR178Storage({writerClient,coreDb,clock});
 return runApprovedGmhSevenR178SavedOnce({
  dataRoot,storage,approvedRecord,verifyApprovedEffect,now,
  ...(readSaved?{readSaved}:{}),
  ...(readPrivate?{readPrivate}:{})
 });
}
