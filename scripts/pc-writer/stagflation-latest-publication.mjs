import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {calculateLatestStagflation} from '../../lib/diagnostic-layer/stagflation-latest-provisional.mjs';
import {calculateStagflationS21} from '../../lib/diagnostic-layer/stagflation-s21.mjs';
import {STAGFLATION_LATEST_KEY,validLatestStagflation} from '../../lib/diagnostic-layer/stagflation-latest-record.mjs';
import {PUBLIC_DISPLAY_MAX_AGE_MS} from '../../worker/public-display-freshness.mjs';
export async function prepareLatestStagflation(core,{enabled=false,now=Date.now()}={}){
 if(enabled!==true)return {status:'DISABLED',prepared:false};
 const row=await core.prepare("SELECT body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE 'macro:%' ORDER BY stored_at DESC LIMIT 1").first();
 const stamp=Number(row?.stored_at);
 if(!row||!Number.isSafeInteger(stamp)||stamp>now||now-stamp>=PUBLIC_DISPLAY_MAX_AGE_MS)return {status:'STALE',prepared:false};
 let input;try{input=JSON.parse(row.body.startsWith('gzip:')?gunzipSync(Buffer.from(row.body.slice(5),'base64'),{maxOutputLength:32000000}).toString('utf8'):row.body);}catch{return {status:'PARTIAL',prepared:false};}
 const result=calculateLatestStagflation({series:input.series,asOfDate:new Date(now).toISOString().slice(0,10)});
 const confirmed=calculateStagflationS21({series:input.series});
 if(result.status!=='READY'||confirmed.status!=='READY')return {status:'PARTIAL',prepared:false};
 if(result.newestInputMonth<=confirmed.observationMonth)return {status:'NO_NEWER_INPUTS',prepared:false};
 const inputSignature=createHash('sha256').update(JSON.stringify({score:result.score,axes:result.axes,inputMonths:result.inputMonths})).digest('hex');
 return {status:'PREPARED',prepared:true,body:{...result,publicationAuthorized:true,confirmedObservationMonth:confirmed.observationMonth,
  sourceStoredAt:new Date(stamp).toISOString(),calculatedAt:new Date(now).toISOString(),inputSignature},storedAt:now};
}
export async function publishLatestStagflation(remote,db,prepared){
 if(prepared?.prepared!==true)return {status:'SKIPPED_NOT_READY'};
 if(!Number.isSafeInteger(prepared.storedAt)||prepared.storedAt!==Date.parse(prepared.body?.calculatedAt))throw Error('STAG_LATEST_PUBLICATION_CLOCK_INVALID');
 const read=()=>remote.query(db,'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',[STAGFLATION_LATEST_KEY]);
 const before=(await read()).results?.[0]??null;
 if(before&&Number(before.stored_at)>prepared.storedAt)return {status:'REMOTE_NEWER_PRESERVED'};
 let previous;try{previous=before?JSON.parse(before.body):null;}catch{}
 const old=validLatestStagflation(previous)?previous:null;
 let history=old?.history.map(p=>({observedAt:p.observedAt,score:p.score}))??[];
 if(old?.inputSignature!==prepared.body.inputSignature){
  if(history.length&&Date.parse(history.at(-1).observedAt)>=prepared.storedAt)throw Error('STAG_LATEST_OBSERVATION_CLOCK_CONFLICT');
  history=[...history,{observedAt:prepared.body.calculatedAt,score:prepared.body.score}].slice(-370);
 }
 const body={...prepared.body,history};
 if(!validLatestStagflation(body)||Buffer.byteLength(JSON.stringify(body))>50000)throw Error('STAG_LATEST_PUBLICATION_INVALID');
 const encoded=JSON.stringify(body),storedAt=prepared.storedAt;
 let writeError;
 try{await remote.request(db,[{sql:'INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE market_public_snapshots_v1.stored_at=? AND market_public_snapshots_v1.body=?',params:[STAGFLATION_LATEST_KEY,encoded,storedAt,before?.stored_at??-1,before?.body??'']}]);}catch{writeError=true;}
 const after=(await read()).results?.[0]??null;
 if(after&&Number(after.stored_at)>storedAt)return {status:'REMOTE_NEWER_PRESERVED'};
 if(after?.body!==encoded||Number(after?.stored_at)!==storedAt)throw Error(writeError?'STAG_LATEST_OUTCOME_UNKNOWN':'STAG_LATEST_READBACK_MISMATCH');
 return {status:'VERIFIED',score:body.score,historyPoints:history.length,observedAt:history.at(-1).observedAt};
}
