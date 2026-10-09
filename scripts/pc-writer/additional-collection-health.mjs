import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
const failed=status=>/FAILED|ERROR|BLOCKED/.test(status??'');
export function additionalCollectionEntries({iran=null,alpaca=null}={}){
 const sources=Object.values(iran?.sources??{});
 const feeds=iran?.articleAnalysis?.feeds??[];
 const iranFailed=sources.some(s=>failed(s.status))||failed(iran?.marad?.status)||failed(iran?.backfill?.status)||feeds.some(s=>failed(s.status));
 const iranSuccess=iran?.storageVerified===true&&sources.length>0&&sources.every(s=>s.status==='COLLECTED')&&['RUNNING','CAUGHT_UP'].includes(iran?.backfill?.status)&&feeds.every(s=>s.status==='COLLECTED');
 const iranAt=Number.isFinite(iran?.finishedAt)?iran.finishedAt:null;
 // A resumed no-request run cannot refresh the provider check timestamp.
 const alpacaAt=alpaca?.runRequests>0&&Number.isFinite(Date.parse(alpaca?.checkedAt))?Date.parse(alpaca.checkedAt):null;
 const alpacaSuccess=alpaca?.status==='COLLECTED_PENDING_VALIDATION'&&alpaca?.completedGroups>0&&alpaca.completedGroups===alpaca.totalGroups&&alpaca?.errorCode===null;
 return [
  {id:'job:iranArticles',storedAt:iran?.storageVerified?iranAt:null,checkedAt:iranAt,outcome:iranFailed?'failure':iranSuccess?'success':'unknown'},
  {id:'job:assetR10Alpaca',storedAt:alpacaSuccess?alpacaAt:null,checkedAt:alpacaAt,outcome:alpaca?.status==='BLOCKED'?'failure':alpacaSuccess?'success':'unknown'},
 ];
}
export function readAdditionalCollectionEntries(base,iranBase=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13')){
 const read=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch{return null}};
 return additionalCollectionEntries({iran:read(path.join(iranBase,'collection-last-run.json')),alpaca:read(path.join(base,'local-asset-bubble-r10-alpaca-collection.json'))});
}
