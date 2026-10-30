// Independent new-key compare-and-swap D1 writer with exact readback.
// No write privileges for the existing nine theme keys or source tables.
import fs from 'node:fs';
import path from 'node:path';
import {SPACE_SATELLITE_PUBLIC_KEY,SPACE_SATELLITE_PUBLIC_VERSION} from
 '../../worker/theme-space-satellite-r1.mjs';
import {SPACE_SATELLITE_R2_PUBLIC_KEY,SPACE_SATELLITE_R2_PUBLIC_VERSION} from
 '../../worker/theme-space-satellite-r2.mjs';

const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const SELECT="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
export async function spaceSatelliteD1R29({dataRoot,tokenFn,fetchImpl=fetch,clock=Date.now,
 publicKey=SPACE_SATELLITE_PUBLIC_KEY,
 publicVersion=SPACE_SATELLITE_PUBLIC_VERSION}={}){
 need(typeof dataRoot==='string'&&typeof tokenFn==='function',
 'SPACE_R29_D1_ARGUMENTS_INVALID');
 need((publicKey===SPACE_SATELLITE_PUBLIC_KEY&&
  publicVersion===SPACE_SATELLITE_PUBLIC_VERSION)||
  (publicKey===SPACE_SATELLITE_R2_PUBLIC_KEY&&
   publicVersion===SPACE_SATELLITE_R2_PUBLIC_VERSION),
 'SPACE_R29_D1_PUBLIC_CONTRACT_DENIED');
 const cfg=JSON.parse(fs.readFileSync(path.join(dataRoot,'pc-writer','config.json'),'utf8'));
 need(/^[a-f0-9]{32}$/.test(cfg.account)&&/^[a-f0-9-]{36}$/.test(cfg.core),
 'SPACE_R29_D1_CONFIG_INVALID');
 const token=await tokenFn({dataRoot});
 need(typeof token==='string'&&token.length>10,'SPACE_R29_D1_AUTH_UNAVAILABLE');
 let writeAttempted=false;
 async function query(sql,params,{write=false}={}){
  if(write)writeAttempted=true;
  let response,body;
  try{
   response=await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${cfg.account}/d1/database/${cfg.core}/query`,{
    method:'POST',headers:{Authorization:`Bearer ${token}`,'content-type':'application/json'},
    body:JSON.stringify({batch:[{sql,params}]}),signal:AbortSignal.timeout(30000),redirect:'error'});
   body=await response.json();
  }catch{throw Object.assign(new Error(writeAttempted?
   'SPACE_R29_D1_WRITE_OUTCOME_UNKNOWN':'SPACE_R29_D1_READ_FAILED'),{
   code:writeAttempted?'SPACE_R29_D1_WRITE_OUTCOME_UNKNOWN':'SPACE_R29_D1_READ_FAILED'});}
  need(response.ok&&body.success!==false&&body.result?.length===1&&
   body.result[0].success!==false,writeAttempted?
   'SPACE_R29_D1_WRITE_OUTCOME_UNKNOWN':'SPACE_R29_D1_READ_FAILED');
  return body.result[0];
 }
 async function read(key){
  need(key===publicKey,'SPACE_R29_D1_READ_KEY_DENIED');
  const row=(await query(SELECT,[key])).results?.[0];
  if(!row)return null;
  need(typeof row.body==='string'&&Number.isSafeInteger(Number(row.stored_at)),
   'SPACE_R29_D1_BAD_ROW');
  return {body:JSON.parse(row.body),storedAt:Number(row.stored_at)};
 }
 return {read,async writeVersioned(key,record,expectedStoredAt){
  need(key===publicKey&&
   record?.version===publicVersion&&
   record.publicationAuthorized===true,'SPACE_R29_D1_WRITE_KEY_DENIED');
  const before=await read(key),encoded=JSON.stringify(record);
  if(before){
   need(before.body?.version===record.version&&
    before.body.methodologyVersion===record.methodologyVersion&&
    before.body.observationDate<=record.observationDate&&
    before.body.historicalWeightMode===record.historicalWeightMode,
    'SPACE_R29_D1_PUBLIC_CONTRACT_DRIFT');
   const oldByDate=new Map(before.body.history.map(p=>[p.date,p.score]));
   need(record.history.some(p=>oldByDate.has(p.date))&&
    record.history.every(p=>!oldByDate.has(p.date)||oldByDate.get(p.date)===p.score),
    'SPACE_R29_D1_PUBLISHED_HISTORY_DRIFT');
   if(before.body.observationDate===record.observationDate){
    need(before.body.score===record.score,
     'SPACE_R29_D1_SAME_DATE_SCORE_CHANGED');
    if(before.body.sourceVersion===record.sourceVersion&&
     before.body.candidateFileSha256===record.candidateFileSha256)
     return {status:'UNCHANGED',changes:0};
   }
  }
  need((before?.storedAt??null)===(expectedStoredAt??null),
   'SPACE_R29_D1_COMPARE_AND_SWAP_PRECHECK_FAILED');
  const stamp=clock();
  need(Number.isSafeInteger(stamp)&&stamp>(expectedStoredAt??0),
   'SPACE_R29_D1_CLOCK_INVALID');
  let result;
  if(before)result=await query(
   "UPDATE public_feed_snapshots_v1 SET body=?,stored_at=? WHERE kind='output' AND feed_key=? AND snapshot_key='current' AND stored_at=?",
   [encoded,stamp,key,expectedStoredAt],{write:true});
  else result=await query(
   'INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES(?,?,?,?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO NOTHING',
   ['output',key,'current',encoded,stamp],{write:true});
  need(result.meta?.changes===1,'SPACE_R29_D1_COMPARE_AND_SWAP_NOT_APPLIED');
  const after=await read(key);
  need(after?.storedAt===stamp&&JSON.stringify(after.body)===encoded,
   'SPACE_R29_D1_READBACK_MISMATCH');
  return {status:'WRITTEN',changes:1,storedAt:stamp};
 }};
}
