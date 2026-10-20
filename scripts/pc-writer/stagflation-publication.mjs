import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {calculateStagflationS21} from '../../lib/diagnostic-layer/stagflation-s21.mjs';
import {STAGFLATION_PUBLIC_KEY,validateStagflationRecord} from '../../worker/stagflation-public.mjs';
import {PUBLIC_DISPLAY_MAX_AGE_MS} from '../../worker/public-display-freshness.mjs';

// Opt-in only. No writes and no provider fetch while preparing the derived result.
export async function prepareStagflation(core,{enabled=false,now=Date.now()}={}){
 if(enabled!==true)return {status:'DISABLED',prepared:false};
 const source=await core.prepare("SELECT body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE 'macro:%' ORDER BY stored_at DESC LIMIT 1").first();
 if(!source)return {status:'PARTIAL',prepared:false,reason:'STORED_MACRO_MISSING'};
 const stamp=Number(source.stored_at);
 if(!Number.isSafeInteger(stamp)||stamp>now||now-stamp>=PUBLIC_DISPLAY_MAX_AGE_MS)return {status:'STALE',prepared:false,reason:'STORED_MACRO_STALE'};
 let input;try{input=JSON.parse(source.body.startsWith('gzip:')?gunzipSync(Buffer.from(source.body.slice(5),'base64'),{maxOutputLength:32000000}).toString('utf8'):source.body)}catch{return {status:'PARTIAL',prepared:false,reason:'STORED_MACRO_INVALID'}}
 const result=calculateStagflationS21({series:input.series,sourceHash:createHash('sha256').update(source.body).digest('hex')});
 if(result.status!=='READY')return {status:'PARTIAL',prepared:false,reason:'STAGFLATION_INPUT_INCOMPLETE'};
 const body={methodVersion:result.methodVersion,historyPolicy:result.historyPolicy,status:'READY',publicationAuthorized:true,score:result.score,sourceHash:result.sourceHash,sourceStoredAt:new Date(stamp).toISOString(),observationMonth:result.observationMonth,
  history:result.history.map(p=>({observationMonth:p.observationMonth,score:p.score,status:p.status,axes:p.axes,contraction:p.contraction}))};
 if(!validateStagflationRecord(body)||Buffer.byteLength(JSON.stringify(body))>30000)return {status:'PARTIAL',prepared:false,reason:'STAGFLATION_PROJECTION_INVALID'};
 return {status:'PREPARED',prepared:true,body,storedAt:stamp};
}

export async function publishStagflation(remote,db,prepared){
 if(prepared?.prepared!==true)return {status:'SKIPPED_NOT_READY'};
 if(!validateStagflationRecord(prepared.body)||prepared.storedAt!==Date.parse(prepared.body.sourceStoredAt))throw Error('STAGFLATION_PUBLICATION_INVALID');
 const encoded=JSON.stringify(prepared.body),storedAt=prepared.storedAt;
 const select=()=>remote.query(db,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',[STAGFLATION_PUBLIC_KEY]);
 const before=(await select()).results?.[0]??null;
 if(before&&Number(before.stored_at)>storedAt)return {status:'REMOTE_NEWER_PRESERVED'};
 if(before&&before.body===encoded&&Number(before.stored_at)===storedAt)return {status:'UNCHANGED'};
 let writeError;
 try{await remote.request(db,[{sql:'INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE market_public_snapshots_v1.stored_at=? AND market_public_snapshots_v1.body=?',params:[STAGFLATION_PUBLIC_KEY,encoded,storedAt,before?.stored_at??-1,before?.body??'']}]);}catch(e){writeError=e;}
 // A timeout is not a reason to submit the write again. Read back once.
 let after;try{after=(await select()).results?.[0]??null;}catch{throw Error('STAGFLATION_PUBLICATION_OUTCOME_UNKNOWN')}
 if(!after||Number(after.stored_at)!==storedAt||after.body!==encoded)throw Error(writeError?'STAGFLATION_PUBLICATION_OUTCOME_UNKNOWN':'STAGFLATION_PUBLICATION_READBACK_MISMATCH');
 return {status:'VERIFIED',observationMonth:prepared.body.observationMonth,storedAt};
}
