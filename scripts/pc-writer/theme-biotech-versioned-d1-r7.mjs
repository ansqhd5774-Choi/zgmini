// Biotech-only versioned R2 D1 writer. R1 and the seven original themes are
// deliberately not writable. CAS and readback are required for every change.
import fs from 'node:fs';
import path from 'node:path';

const requireValid=(check,code)=>{if(!check)throw Object.assign(new Error(code),{code});};
const D1_KEY='theme-biotech-optional-r2';
const SQL_READ="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";

export function biotechVersionedD1({dataRoot,fetchImpl=fetch,tokenFn,clock=Date.now}={}){
 const cfg=JSON.parse(fs.readFileSync(path.join(dataRoot,'pc-writer','config.json'),'utf8'));
 requireValid(/^[a-f0-9]{32}$/.test(cfg.account)&&/^[a-f0-9-]{36}$/.test(cfg.core),'BIOTECH_R7_D1_CONFIG_INVALID');
 requireValid(typeof tokenFn==='function','BIOTECH_R7_AUTH_ADAPTER_MISSING');
 const token=tokenFn({dataRoot});
 let writeAttempted=false;
 async function query(sql,params,{write=false}={}){
  if(write)writeAttempted=true;
  let response,body;
  try{
   response=await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${cfg.account}/d1/database/${cfg.core}/query`,{
    method:'POST',headers:{Authorization:`Bearer ${token}`,'content-type':'application/json'},
    body:JSON.stringify({batch:[{sql,params}]}),signal:AbortSignal.timeout(30000),redirect:'error'});
   body=await response.json();
  }catch{throw Object.assign(new Error('BIOTECH_R7_D1_REQUEST_FAILED'),{code:writeAttempted?'D1_WRITE_OUTCOME_UNKNOWN':'D1_READ_FAILED'});}
  requireValid(response.ok&&body.success!==false&&body.result?.length===1&&body.result[0].success!==false,
   writeAttempted?'D1_WRITE_OUTCOME_UNKNOWN':'D1_READ_FAILED');
  return body.result[0];
 }
 const read=async key=>{
  requireValid([D1_KEY,'theme-biotech-optional-r1'].includes(key),'BIOTECH_R7_READ_KEY_DENIED');
  const row=(await query(SQL_READ,[key])).results?.[0];
  if(!row)return null;
  requireValid(typeof row.body==='string'&&Number.isSafeInteger(Number(row.stored_at)),'BIOTECH_R7_D1_BAD_ROW');
  return {body:JSON.parse(row.body),storedAt:Number(row.stored_at)};
 };
 return {read,async writeVersioned(key,record,expectedStoredAt){
  requireValid(key===D1_KEY&&record?.version==='THEME_BIOTECH_GMH_CONTINUATION_R2_PUBLIC_V1',
   'BIOTECH_R7_WRITE_KEY_DENIED');
  const before=await read(key),encoded=JSON.stringify(record);
  if(before&&before.body.observationDate===record.observationDate&&before.body.score===record.score&&
   JSON.stringify(before.body.history)===JSON.stringify(record.history))return {status:'UNCHANGED',changes:0};
  requireValid((before?.storedAt??null)===(expectedStoredAt??null),'BIOTECH_R7_COMPARE_AND_SWAP_PRECHECK_FAILED');
  const stamp=clock();requireValid(Number.isSafeInteger(stamp)&&stamp>(expectedStoredAt??0),'BIOTECH_R7_CLOCK_REGRESSION');
  let result;
  if(before){
   result=await query("UPDATE public_feed_snapshots_v1 SET body=?,stored_at=? WHERE kind='output' AND feed_key=? AND snapshot_key='current' AND stored_at=?",
    [encoded,stamp,key,expectedStoredAt],{write:true});
  }else{
   result=await query('INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES(?,?,?,?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO NOTHING',
    ['output',key,'current',encoded,stamp],{write:true});
  }
  requireValid(result.meta?.changes===1,'BIOTECH_R7_COMPARE_AND_SWAP_NOT_APPLIED');
  const after=await read(key);
  requireValid(after?.storedAt===stamp&&JSON.stringify(after.body)===encoded,'BIOTECH_R7_D1_READBACK_MISMATCH');
  return {status:'WRITTEN',changes:1,storedAt:stamp};
 }};
}
