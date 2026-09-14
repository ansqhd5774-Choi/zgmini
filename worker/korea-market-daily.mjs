import {fetchMarketDate} from './korea-market-v2.mjs';

const nextDate = date => { const d=new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T00:00:00Z`); d.setUTCDate(d.getUTCDate()+1); return d.toISOString().slice(0,10).replaceAll('-',''); };
const weekend = date => [0,6].includes(new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T00:00:00Z`).getUTCDay());
const safe = new Set(['UPSTREAM_HTTP_ERROR','BODY_MISSING','BODY_LIMIT','INVALID_JSON','UPSTREAM_SCHEMA_OR_API_ERROR','TIMEOUT','TOTAL_COUNT_CHANGED','PAGE_SIZE_EXCEEDED','REPEATED_PAGE','ROW_COUNT_EXCEEDED','INCOMPLETE_SNAPSHOT','REQUEST_CAP_REACHED']);

/** Forward-only DAILY update. It never rewrites an existing market date or snapshot. */
export async function runKoreaMarketDaily({store,key,fetchImpl=globalThis.fetch,runId,componentIndicators=[],requestCap=1,maxCalendarCandidates=14,now=Date.now}={}) {
  if (!store || typeof store.acquireLease!=='function' || typeof store.getLatestMarketDate!=='function' || typeof fetchImpl!=='function') return {status:'FAILED',reason:'INVALID_DAILY_CONFIGURATION'};
  if (!Number.isSafeInteger(requestCap)||requestCap<1||requestCap>10) return {status:'FAILED',reason:'INVALID_REQUEST_CAP'};
  if (!(await store.acquireLease(runId))) return {status:'NO_OP',reason:'ALREADY_RUNNING'};
  let requests=0, examined=0;
  try {
    let latest=await store.getLatestMarketDate();
    if (!latest) return {status:'FAILED',reason:'NO_STORED_ANCHOR',requestCount:0};
    let date=nextDate(latest);
    while (examined<maxCalendarCandidates && requests<requestCap) {
      examined++;
      if (weekend(date)) { date=nextDate(date); continue; }
      const existing=await store.getMarketDate(date);
      if (existing) { date=nextDate(date); latest=date; continue; }
      let snapshot;
      try { snapshot=await fetchMarketDate(date,key,{fetchImpl,now,policy:{maxPages:5}}); requests+=snapshot.requestCount??0; }
      catch { return {status:'FAILED',reason:'PROVIDER_FAILURE',requestCount:requests,examined}; }
      if (!snapshot.complete) return {status:'PARTIAL',reason:safe.has(snapshot.safeErrorCode)?snapshot.safeErrorCode:'INCOMPLETE_SNAPSHOT',requestCount:requests,examined,lastKnownGoodDate:latest};
      if (snapshot.status==='NO_TRADING_OBSERVATION') {
        try { await store.saveMarketDate(snapshot); } catch { return {status:'FAILED',reason:'NO_TRADING_DATE_SAVE_FAILED',requestCount:requests,examined}; }
        return {status:'NO_OP',reason:'NO_TRADING_OBSERVATION',requestCount:requests,examined,checkedDate:date,lastKnownGoodDate:latest};
      }
      if (snapshot.status!=='SUCCESS') return {status:'PARTIAL',reason:'VALIDATION_FAILED',requestCount:requests,examined,lastKnownGoodDate:latest};
      try { await store.saveMarketDate(snapshot); } catch { return {status:'FAILED',reason:'MARKET_DATE_SAVE_FAILED',requestCount:requests,examined,lastKnownGoodDate:latest}; }
      let snapshotWritten=false;
      try { snapshotWritten=await store.saveResearchSnapshotForDate(date,componentIndicators); } catch { return {status:'PARTIAL',reason:'RESEARCH_SNAPSHOT_NOT_PROMOTED',requestCount:requests,examined,updatedDate:date,lastKnownGoodDate:latest}; }
      return {status:snapshotWritten?'UPDATED':'NO_OP',reason:snapshotWritten?null:'SNAPSHOT_ALREADY_PRESENT',requestCount:requests,examined,updatedDate:date,lastKnownGoodDate:latest};
    }
    return {status:'NO_OP',reason:'NO_NEW_DAILY_DATA',requestCount:requests,examined,lastKnownGoodDate:latest};
  } finally { await store.releaseLease(); }
}
