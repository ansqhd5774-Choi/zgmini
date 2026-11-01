// Independent tenth-theme-only D1 compare-and-swap writer with exact readback.
// Reuses existing PC Cloudflare authentication; never accesses another feed key.
import fs from 'node:fs';
import path from 'node:path';
import {DC_POWER_PUBLIC_KEY,DC_POWER_PUBLIC_VERSION}
 from '../../worker/theme-data-center-power-r1.mjs';

const need=(condition,code)=>{if(!condition)throw Object.assign(new Error(code),{code});};
const READ="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";

export function dcPowerVersionedD1({dataRoot,fetchImpl=fetch,tokenFn,clock=Date.now}={}){
 const cfg=JSON.parse(fs.readFileSync(path.join(dataRoot,'pc-writer','config.json'),'utf8'));
 need(/^[a-f0-9]{32}$/.test(cfg.account)&&/^[a-f0-9-]{36}$/.test(cfg.core),
  'DC_POWER_R3_D1_CONFIG_INVALID');
 need(typeof tokenFn==='function','DC_POWER_R3_EXISTING_AUTH_ADAPTER_MISSING');
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
  }catch{throw Object.assign(new Error('DC_POWER_R3_D1_REQUEST_FAILED'),{
   code:writeAttempted?'D1_WRITE_OUTCOME_UNKNOWN':'D1_READ_FAILED'});}
  need(response.ok&&body.success!==false&&body.result?.length===1&&body.result[0].success!==false,
   writeAttempted?'D1_WRITE_OUTCOME_UNKNOWN':'D1_READ_FAILED');
  return body.result[0];
 }
 const read=async key=>{
  need(key===DC_POWER_PUBLIC_KEY,'DC_POWER_R3_READ_KEY_DENIED');
  const row=(await query(READ,[key])).results?.[0];
  if(!row)return null;
  need(typeof row.body==='string'&&Number.isSafeInteger(Number(row.stored_at)),
   'DC_POWER_R3_D1_BAD_ROW');
  return {body:JSON.parse(row.body),storedAt:Number(row.stored_at)};
 };
 return {read,async writeVersioned(key,record,expectedStoredAt){
  need(key===DC_POWER_PUBLIC_KEY&&record?.version===DC_POWER_PUBLIC_VERSION&&
   record.publicationAuthorized===true,'DC_POWER_R3_WRITE_KEY_DENIED');
  const before=await read(key),encoded=JSON.stringify(record);
  if(before){
   // Only genuinely new sessions are allowed. Never silently revise a prior
   // public point/ETF/methodology/rights or let an older session overwrite it.
   need(before.body.version===record.version&&before.body.methodologyVersion===record.methodologyVersion&&
    before.body.etfs?.join(',')===record.etfs?.join(',')&&
    before.body.rightsBasis===record.rightsBasis&&
    before.body.observationDate<=record.observationDate,'DC_POWER_R3_PUBLIC_CONTRACT_DRIFT');
   const oldByDate=new Map(before.body.history.map(p=>[p.date,p.score]));
   need(record.history.some(p=>oldByDate.has(p.date))&&
    record.history.every(p=>!oldByDate.has(p.date)||oldByDate.get(p.date)===p.score),
    'DC_POWER_R3_PUBLIC_HISTORY_DRIFT');
   if(before.body.observationDate===record.observationDate){
    need(before.body.score===record.score,'DC_POWER_R3_SAME_DATE_SCORE_CHANGED');
    return {status:'UNCHANGED',changes:0};
   }
  }
  need((before?.storedAt??null)===(expectedStoredAt??null),
   'DC_POWER_R3_COMPARE_AND_SWAP_PRECHECK_FAILED');
  const stamp=clock();need(Number.isSafeInteger(stamp)&&stamp>(expectedStoredAt??0),
   'DC_POWER_R3_CLOCK_REGRESSION');
  let result;
  if(before){
   result=await query("UPDATE public_feed_snapshots_v1 SET body=?,stored_at=? WHERE kind='output' AND feed_key=? AND snapshot_key='current' AND stored_at=?",
    [encoded,stamp,key,expectedStoredAt],{write:true});
  }else{
   result=await query('INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES(?,?,?,?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO NOTHING',
    ['output',key,'current',encoded,stamp],{write:true});
  }
  need(result.meta?.changes===1,'DC_POWER_R3_COMPARE_AND_SWAP_NOT_APPLIED');
  const after=await read(key);
  need(after?.storedAt===stamp&&JSON.stringify(after.body)===encoded,
   'DC_POWER_R3_D1_READBACK_MISMATCH');
  return {status:'WRITTEN',changes:1,storedAt:stamp};
 }};
}
