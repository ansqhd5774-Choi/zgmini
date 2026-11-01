// Separate, additive Space provisional D1 key; immutable R32 confirmed key.
import fs from 'node:fs';
import path from 'node:path';
import {SPACE_PROVISIONAL_KEY,SPACE_PROVISIONAL_VERSION} from
 '../../worker/theme-space-satellite-provisional-r1.mjs';
import {SPACE_SATELLITE_R2_PUBLIC_KEY} from '../../worker/theme-space-satellite-r2.mjs';

const SELECT="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};

export async function spaceProvisionalD1R8({dataRoot,tokenFn,fetchImpl=fetch,clock=Date.now}={}){
 need(typeof dataRoot==='string'&&typeof tokenFn==='function','SPACE_R8_D1_ARGUMENTS_INVALID');
 const cfg=JSON.parse(fs.readFileSync(path.join(dataRoot,'pc-writer','config.json'),'utf8'));
 need(/^[a-f0-9]{32}$/.test(cfg.account)&&/^[a-f0-9-]{36}$/.test(cfg.core),
  'SPACE_R8_D1_CONFIG_INVALID');
 const token=await tokenFn({dataRoot});
 need(typeof token==='string'&&token.length>10,'SPACE_R8_D1_CREDENTIAL_MISSING');
 let attemptedWrite=false;
 async function query(sql,params,{write=false}={}){
  if(write)attemptedWrite=true;
  let response,json;
  try{
   response=await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${cfg.account}/d1/database/${cfg.core}/query`,{
    method:'POST',headers:{Authorization:`Bearer ${token}`,'content-type':'application/json'},
    body:JSON.stringify({batch:[{sql,params}]}),signal:AbortSignal.timeout(30000),redirect:'error'});
   json=await response.json();
  }catch{need(false,attemptedWrite?'SPACE_R8_D1_WRITE_OUTCOME_UNKNOWN':'SPACE_R8_D1_READ_FAILED');}
  need(response.ok&&json?.success!==false&&json?.result?.length===1&&
   json.result[0].success!==false,attemptedWrite?'SPACE_R8_D1_WRITE_OUTCOME_UNKNOWN':'SPACE_R8_D1_READ_FAILED');
  return json.result[0];
 }
 async function read(key){
  need([SPACE_SATELLITE_R2_PUBLIC_KEY,SPACE_PROVISIONAL_KEY].includes(key),
   'SPACE_R8_D1_READ_KEY_DENIED');
  const row=(await query(SELECT,[key])).results?.[0];
  if(!row)return null;
  need(typeof row.body==='string'&&Number.isSafeInteger(Number(row.stored_at)),
   'SPACE_R8_D1_BAD_ROW');
  return {body:JSON.parse(row.body),storedAt:Number(row.stored_at)};
 }
 return {read,async writeVersioned(key,record,expectedStoredAt){
  need(key===SPACE_PROVISIONAL_KEY&&record?.version===SPACE_PROVISIONAL_VERSION&&
   record.publicationAuthorized===true,'SPACE_R8_D1_WRITE_KEY_DENIED');
  const before=await read(key),encoded=JSON.stringify(record);
  if(before){
   need(before.body?.version===record.version&&
    before.body.confirmedObservationDate<=record.confirmedObservationDate,
    'SPACE_R8_D1_CONTRACT_DRIFT');
   if(before.body?.sourceVersion===record.sourceVersion&&
    JSON.stringify(before.body.points)===JSON.stringify(record.points))
    return {status:'UNCHANGED',changes:0};
  }
  need((before?.storedAt??null)===(expectedStoredAt??null),
   'SPACE_R8_D1_CAS_PRECHECK');
  const stamp=clock();
  need(Number.isSafeInteger(stamp)&&stamp>(expectedStoredAt??0),
   'SPACE_R8_D1_CLOCK_INVALID');
  const result=before?await query(
   "UPDATE public_feed_snapshots_v1 SET body=?,stored_at=? WHERE kind='output' AND feed_key=? AND snapshot_key='current' AND stored_at=?",
   [encoded,stamp,key,expectedStoredAt],{write:true}):await query(
    'INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES(?,?,?,?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO NOTHING',
    ['output',key,'current',encoded,stamp],{write:true});
  need(result.meta?.changes===1,'SPACE_R8_D1_CAS_NOT_APPLIED');
  const after=await read(key);
  need(after?.storedAt===stamp&&JSON.stringify(after.body)===encoded,
   'SPACE_R8_D1_READBACK_MISMATCH');
  return {status:'WRITTEN',changes:1,storedAt:stamp};
 }};
}
