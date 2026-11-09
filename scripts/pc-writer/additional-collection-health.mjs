import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
const failed=status=>/FAILED|ERROR|BLOCKED/.test(status??'');
export function additionalCollectionEntries({iran=null,supply=null}={}){
 // AIS was retired from scheduled collection. Historical receipts remain intact,
 // but cannot keep the active news/official-source job permanently failed.
 const sources=Object.entries(iran?.sources??{}).filter(([id])=>!['ais','aisHealth'].includes(id)).map(([,source])=>source);
 const feeds=iran?.articleAnalysis?.feeds??[];
 const iranFailed=sources.some(s=>failed(s.status))||failed(iran?.marad?.status)||failed(iran?.backfill?.status)||feeds.some(s=>failed(s.status));
 const iranSuccess=iran?.storageVerified===true&&sources.length>0&&sources.every(s=>s.status==='COLLECTED')&&['RUNNING','CAUGHT_UP'].includes(iran?.backfill?.status)&&feeds.every(s=>s.status==='COLLECTED');
 const iranAt=Number.isFinite(iran?.finishedAt)?iran.finishedAt:null;
 return [
  {id:'job:iranArticles',storedAt:iran?.storageVerified?iranAt:null,checkedAt:iranAt,outcome:iranFailed?'failure':iranSuccess?'success':'unknown'},
  {id:'job:supplyR10',storedAt:supply?.storageVerified?supply.checkedAt:null,checkedAt:supply?.checkedAt??null,outcome:supply?.status==='COLLECTED'&&supply.storageVerified?'success':supply?.status==='SOURCE_FAILED'?'failure':'unknown',reason:supply?.reason,nextRetryAt:supply?.nextRetryAt},
 ];
}
export function readAdditionalCollectionEntries(base,iranBase=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13')){
 const read=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return null}};
 // Historical Alpaca receipts remain on disk for audit; this retired source
 // is no longer an active collection-health job.
 return additionalCollectionEntries({iran:read(path.join(iranBase,'collection-last-run.json')),supply:read(path.join(base,'local-supply-r10-collection.json'))});
}
