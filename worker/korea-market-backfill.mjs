import {fetchMarketDate,validMarketDate,MARKET_V2_POLICY} from './korea-market-v2.mjs';

export const BACKFILL_POLICY=Object.freeze({anchor:'20260910',maxProviderRequests:10,concurrency:1,retry:0,targetAdditionalDates:5,maxCalendarCandidates:64,researchOnly:true,productionEligible:false});
const running=new WeakSet();
export function previousMarketCandidate(date){if(!validMarketDate(date))throw Error('INVALID_DATE');const d=new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T00:00:00Z`);d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10).replaceAll('-','');}
const weekend=date=>[0,6].includes(new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T00:00:00Z`).getUTCDay());
const emptyCheckpoint=()=>({latestProcessedDate:null,oldestProcessedDate:null,successfulTradingDates:0,requestCount:0,rowsProcessed:0,status:'IDLE',lastAttemptedDate:null,lastSuccessfulDate:null,lastFailureCode:null});
function validateCheckpoint(p){
 for(const k of ['latestProcessedDate','oldestProcessedDate'])if(p[k]!==null&&(!validMarketDate(p[k])||p[k]>=BACKFILL_POLICY.anchor))throw Error('INVALID_CHECKPOINT');
 if((p.latestProcessedDate===null)!==(p.oldestProcessedDate===null)||p.oldestProcessedDate>p.latestProcessedDate)throw Error('INVALID_CHECKPOINT');
 for(const k of ['successfulTradingDates','requestCount','rowsProcessed'])if(!Number.isSafeInteger(p[k])||p[k]<0)throw Error('INVALID_CHECKPOINT');
}
function snapshotKind(s,date){
 if(!s||s.requestedDate!==date||!s.complete||!Number.isSafeInteger(s.totalCount)||s.rowsReceived!==s.totalCount||!Array.isArray(s.rows))return 'INVALID';
 if(s.status==='NO_TRADING_OBSERVATION'&&s.rowsReceived===0&&s.rows.length===0)return 'EMPTY';
 if(s.status!=='SUCCESS'||s.rowsReceived<=0||s.rows.length===0||s.latestObservationDate!==date||s.breadth?.status!=='VALID'||!Number.isFinite(s.breadth.score)||s.breadth.score<0||s.breadth.score>100)return 'INVALID';
 if(s.rows.some(r=>r.date!==date||!r.securityId||!['KOSPI','KOSDAQ'].includes(r.market)))return 'INVALID';
 if(new Set(s.rows.map(r=>r.securityId)).size!==s.rows.length)return 'INVALID';
 return 'VALID';
}
const factorOf=s=>({factor:'Breadth',advanceRatio:s.breadth.advanceRatio,advanceValueShare:s.breadth.advanceValueShare,score:s.breadth.score,status:s.breadth.status,
 coverage:{return:s.returnCoverage,tradingValue:s.tradingValueCoverage,marketCap:s.marketCapCoverage}});

/** Explicit injected transport only. No route, scheduling or implicit live fetch. */
export async function runKoreaMarketBackfill({store,key,fetchImpl,targetAdditionalDates=5,requestCap=BACKFILL_POLICY.maxProviderRequests,runId,now=Date.now,componentIndicators=[]}={}){
 if(!store||typeof fetchImpl!=='function'||!Number.isSafeInteger(targetAdditionalDates)||targetAdditionalDates<1||targetAdditionalDates>5)throw Error('INVALID_RUN_CONFIGURATION');
 if(!Number.isSafeInteger(requestCap)||requestCap<1||requestCap>BACKFILL_POLICY.maxProviderRequests)throw Error('INVALID_RUN_CONFIGURATION');
 if(running.has(store))throw Error('RUN_ALREADY_ACTIVE');running.add(store);
 let checkpoint=emptyCheckpoint(),requests=0,additional=0,rowsStored=0,reused=0,skippedWeekends=0,noObservations=0,examined=0;
 const report=(status,code=null)=>({researchOnly:true,productionEligible:false,status,safeErrorCode:code,requestCount:requests,additionalSuccessfulDates:additional,rowsStored,reusedDates:reused,skippedWeekends,noObservationDates:noObservations,checkpoint:structuredClone(checkpoint)});
 const stop=async code=>{const failure={...checkpoint,status:'ERROR',lastFailureCode:code};try{await store.saveBackfillProgress(failure);checkpoint=failure;}catch{return report('ERROR','CHECKPOINT_SAVE_FAILED');}return report('ERROR',code);};
 try{
  if(store.acquireLease && !await store.acquireLease(runId))return report('ALREADY_RUNNING');
  try{checkpoint=await store.getBackfillProgress()??emptyCheckpoint();validateCheckpoint(checkpoint);}catch{return report('ERROR','CHECKPOINT_READ_OR_VALIDATION_FAILED');}
  let date=previousMarketCandidate(checkpoint.oldestProcessedDate??BACKFILL_POLICY.anchor);
  while(additional<targetAdditionalDates&&requests<requestCap&&examined<BACKFILL_POLICY.maxCalendarCandidates){
   if(store.renewLease){try{await store.renewLease();}catch{return report('ERROR','LEASE_LOST');}}
   examined++;if(weekend(date)){skippedWeekends++;date=previousMarketCandidate(date);continue;}
   checkpoint={...checkpoint,lastAttemptedDate:date};let existing;
   try{existing=await store.getMarketDate(date);}catch{return await stop('MARKET_READ_FAILED');}
   let snapshot=existing,kind;
   if(existing){kind=snapshotKind(existing,date);if(kind==='INVALID')return await stop('STORED_DATE_CORRUPT');reused++;}
   else{
    const before=requests;
    try{snapshot=await fetchMarketDate(date,key,{now,policy:{...MARKET_V2_POLICY,maxPages:Math.min(MARKET_V2_POLICY.maxPages,requestCap-requests)},fetchImpl:(...args)=>{
     if(requests>=requestCap)throw Error('REQUEST_HARD_CAP');requests++;return Reflect.apply(fetchImpl,globalThis,args);
    }});}catch{checkpoint={...checkpoint,requestCount:checkpoint.requestCount+requests-before};return await stop('PROVIDER_FAILURE');}
    checkpoint={...checkpoint,requestCount:checkpoint.requestCount+requests-before};
    kind=snapshotKind(snapshot,date);if(kind==='INVALID')return await stop('PROVIDER_OR_SNAPSHOT_INVALID');
   }
   if(store.atomicMarketDateSave){
    // D1 commits rows, quality, Breadth and progress together; never repeat/increment
    // the memory adapter's separate writes. Completed dates are not rewritten.
    try{if(!existing)await store.saveMarketDate(snapshot);if(kind==='VALID'&&store.saveResearchSnapshotForDate)await store.saveResearchSnapshotForDate(date,componentIndicators);checkpoint=await store.getBackfillProgress();validateCheckpoint(checkpoint);}
    catch{return await stop('ATOMIC_DATE_SAVE_FAILED');}
    if(kind==='VALID'){additional++;if(!existing)rowsStored+=snapshot.rows.length;}else noObservations++;
    date=previousMarketCandidate(date);continue;
   }
   try{
    if(!existing)await store.saveMarketDate(snapshot);
    if(kind==='VALID'){
     const factor=factorOf(snapshot),stored=(await store.getFactorHistory()).find(f=>f.date===date);
     if(stored){const {date:storedDate,...savedFactor}=stored;if(JSON.stringify(savedFactor)!==JSON.stringify(factor))return await stop('STORED_FACTOR_CONFLICT');}
     else await store.saveFactorSnapshot(date,factor);
    }
   }catch{return await stop('DATE_OR_FACTOR_SAVE_FAILED');}
   const next={...checkpoint,latestProcessedDate:checkpoint.latestProcessedDate??date,oldestProcessedDate:date,
    successfulTradingDates:checkpoint.successfulTradingDates+(kind==='VALID'?1:0),rowsProcessed:checkpoint.rowsProcessed+snapshot.rows.length,
    lastSuccessfulDate:kind==='VALID'?date:checkpoint.lastSuccessfulDate,lastFailureCode:null,status:'RUNNING'};
   try{await store.saveBackfillProgress(next);}catch{return report('ERROR','CHECKPOINT_SAVE_FAILED');}
   checkpoint=next;if(kind==='VALID'){additional++;if(!existing)rowsStored+=snapshot.rows.length;}else noObservations++;
   date=previousMarketCandidate(date);
  }
  const final={...checkpoint,status:'PAUSED'};try{await store.saveBackfillProgress(final);checkpoint=final;}catch{return report('ERROR','CHECKPOINT_SAVE_FAILED');}
  return report(additional===targetAdditionalDates?'CHUNK_COMPLETE':'LIMIT_REACHED');
 }finally{try{if(store.releaseLease)await store.releaseLease();}finally{running.delete(store);}}
}
