// D1 compare-and-swap writer: only a new biotech-specific provisional key.
// Does not write the seven-theme rolling key, confirmed biotech R2, or R1.
import fs from 'node:fs';
import path from 'node:path';
import {BIOTECH_PROVISIONAL_KEY,BIOTECH_PROVISIONAL_VERSION} from './theme-biotech-provisional-r8.mjs';

const sqlRead="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
const fail=s=>{throw Object.assign(new Error(s),{code:s});};
const check=(v,s)=>{if(!v)fail(s);};

export function biotechProvisionalD1R8({dataRoot,tokenFn,fetchImpl=fetch,clock=Date.now}={}){
 const cfg=JSON.parse(fs.readFileSync(path.join(dataRoot,'pc-writer','config.json'),'utf8'));
 check(/^[a-f0-9]{32}$/.test(cfg.account)&&/^[a-f0-9-]{36}$/.test(cfg.core)&&
  typeof tokenFn==='function','R8_D1_CONFIG_OR_AUTH_MISSING');
 const token=tokenFn({dataRoot});
 let attemptedWrite=false;
 async function query(sql,params,{write=false}={}){
  if(write)attemptedWrite=true;
  let response,payload;
  try{
   response=await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${cfg.account}/d1/database/${cfg.core}/query`,{
    method:'POST',headers:{Authorization:`Bearer ${token}`,'content-type':'application/json'},
    body:JSON.stringify({batch:[{sql,params}]}),signal:AbortSignal.timeout(30000),redirect:'error'});
   payload=await response.json();
  }catch{fail(attemptedWrite?'R8_D1_WRITE_OUTCOME_UNKNOWN':'R8_D1_READ_FAILED');}
  check(response.ok&&payload.success!==false&&payload.result?.length===1&&payload.result[0].success!==false,
   attemptedWrite?'R8_D1_WRITE_OUTCOME_UNKNOWN':'R8_D1_READ_FAILED');
  return payload.result[0];
 }
 async function read(key){
  check(['theme-biotech-optional-r2',BIOTECH_PROVISIONAL_KEY].includes(key),'R8_D1_READ_KEY_DENIED');
  const record=(await query(sqlRead,[key])).results?.[0];
  if(!record)return null;
  check(typeof record.body==='string'&&Number.isSafeInteger(Number(record.stored_at)),'R8_D1_INVALID_RECORD');
  return {body:JSON.parse(record.body),storedAt:Number(record.stored_at)};
 }
 return {read,async writeVersioned(key,record,expectedStoredAt){
  check(key===BIOTECH_PROVISIONAL_KEY&&record?.version===BIOTECH_PROVISIONAL_VERSION,
   'R8_D1_WRITE_KEY_DENIED');
  const old=await read(key),json=JSON.stringify(record);
  // No timestamp refresh or re-publication for unchanged source evidence.
  if(old?.body?.sourceVersion===record.sourceVersion&&
   JSON.stringify(old.body.points)===JSON.stringify(record.points))return {status:'UNCHANGED',changes:0};
  check((old?.storedAt??null)===(expectedStoredAt??null),'R8_D1_CAS_PRECHECK');
  const stamp=clock();check(Number.isSafeInteger(stamp)&&stamp>(expectedStoredAt??0),'R8_D1_CLOCK_REGRESSION');
  const result=old?await query("UPDATE public_feed_snapshots_v1 SET body=?,stored_at=? WHERE kind='output' AND feed_key=? AND snapshot_key='current' AND stored_at=?",
   [json,stamp,key,expectedStoredAt],{write:true}):await query(
   'INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES(?,?,?,?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO NOTHING',
   ['output',key,'current',json,stamp],{write:true});
  check(result.meta?.changes===1,'R8_D1_CAS_NOT_APPLIED');
  const after=await read(key);
  check(after?.storedAt===stamp&&JSON.stringify(after.body)===json,'R8_D1_READBACK_MISMATCH');
  return {status:'WRITTEN',changes:1,storedAt:stamp};
 }};
}
