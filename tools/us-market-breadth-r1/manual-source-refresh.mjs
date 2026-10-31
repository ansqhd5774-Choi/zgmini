import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// An existing successful B1 run may refer to an older trading date. Only a
// manual, missing-latest-session case may request one fresh bounded source run.
export function needsOneFreshSourceAttempt({collection,prepared,latestStoredTradeDate}={}){
  return collection?.job==='breadth'&&collection.status==='SKIPPED'
    &&collection.sourceStatus==='SKIPPED_ALREADY_SUCCESS'
    &&prepared?.prepared===false
    &&['LATEST_SESSION_NOT_STORED','SOURCE_AUDIT_NOT_READY'].includes(prepared.status)
    &&/^\d{4}-\d{2}-\d{2}$/.test(prepared.expectedDate??'')
    &&/^\d{4}-\d{2}-\d{2}$/.test(latestStoredTradeDate??'')
    &&latestStoredTradeDate<prepared.expectedDate;
}

export async function attemptFreshUsSource({root,home,asOfDate}){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate))throw Error('US_SOURCE_DATE_INVALID');
  const databaseFile=path.join(home,'storage','core.sqlite');
  if(!fs.existsSync(databaseFile)||fs.statSync(databaseFile).size===0)
    throw Error('APPROVED_CORE_DATABASE_MISSING');
  const src=relative=>pathToFileURL(path.join(root,relative)).href;
  const [{localDatabase},{createQuotaFetch},{collectBreadthB1R3ToStore}]=await Promise.all([
    import(src('scripts/pc-writer/local-db.mjs')),
    import(src('scripts/pc-writer/quota-fetch.mjs')),
    import(src('lib/market-score/breadth-b1-r3-collector.mjs')),
  ]);
  if([localDatabase,createQuotaFetch,collectBreadthB1R3ToStore].some(x=>typeof x!=='function'))
    throw Error('APPROVED_SOURCE_REFRESH_UNAVAILABLE');
  const quota=createQuotaFetch({base:home,originalFetch:globalThis.fetch});
  const fetchImpl=(input,init={})=>{
    const signal=init.signal?AbortSignal.any([init.signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000);
    return quota.fetch(input,{...init,signal});
  };
  const db=localDatabase(databaseFile);
  try{
    const out=await collectBreadthB1R3ToStore({env:{DB:db},db,asOfDate,
      fetchImpl,maxAttemptsPerCall:1,batchSize:40,concurrency:8});
    return {status:out?.status??'UNKNOWN',tradeDate:out?.tradeDate??null,
      providerRequests:out?.providerRequests??0};
  }finally{db.close()}
}
