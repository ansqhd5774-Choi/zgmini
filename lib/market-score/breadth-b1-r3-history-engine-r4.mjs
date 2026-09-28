import {B1_R3_HISTORY_MIN_COVERAGE,collectBreadthB1R3HistoricalBatchR4} from "./breadth-b1-r3-history-r4.mjs";
import {materializeBreadthB1R3StoredHistoricalScoresR4} from "./breadth-b1-r3-history-score-r4.mjs";

export const B1_R3_HISTORY_ENGINE_R4="B1-R3-HISTORY-ENGINE-R4";
export const B1_R3_HISTORY_ENGINE_SOURCE_CONTRACT="ZGMINI_B1_PRICE_SOURCE_CONTRACT_R4";
export const B1_R3_HISTORY_ENGINE_MODES=Object.freeze({
  INITIAL:"INITIAL_HISTORY",
  DAILY:"DAILY_MAINTENANCE",
});

const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const sortedUnique=xs=>[...new Set((xs??[]).map(x=>String(x??"").trim()).filter(Boolean))].sort();
const safeDate=(v,name="DATE")=>{const s=String(v??"");if(!DATE_RE.test(s))throw new TypeError(`${name}_INVALID`);return s};

export function classifyB1HistoryEngineErrorR4(error){
  const s=String(error?.code??error?.message??error??"");
  if(/429|5\d\d|TIMEOUT|ECONN|EAI_AGAIN|ENET|FETCH|SOCKET|TEMPORAR|RETRY/i.test(s))return "RETRYABLE";
  return "TERMINAL";
}

export function buildB1HistoryEntriesR4({scoreDates,dependencyDate,protectedCurrentDate=null}={}){
  if(!Array.isArray(scoreDates)||scoreDates.length<1)throw new TypeError("SCORE_DATES_REQUIRED");
  const dep=safeDate(dependencyDate,"DEPENDENCY_DATE"),out=[];let prior=dep,seen=new Set();
  for(const raw of scoreDates){
    const td=safeDate(raw,"TRADE_DATE");
    if(seen.has(td))throw new Error("DUPLICATE_TRADE_DATE");
    if(td<=prior)throw new Error("TRADE_DATES_NOT_ASCENDING");
    if(protectedCurrentDate&&td>=safeDate(protectedCurrentDate,"PROTECTED_CURRENT_DATE"))throw new Error("PROTECTED_CURRENT_DATE_INCLUDED");
    seen.add(td);out.push({tradeDate:td,previousDate:prior});prior=td;
  }
  return out;
}

export function planB1HistoryChunksR4({entries,chunkSize=20,alreadyCompleteDates=[],terminalRejectedDates=[],mode=B1_R3_HISTORY_ENGINE_MODES.INITIAL}={}){
  if(!Array.isArray(entries)||entries.length<1)throw new TypeError("ENTRIES_REQUIRED");
  if(!Number.isInteger(chunkSize)||chunkSize<1||chunkSize>50)throw new Error("CHUNK_SIZE_INVALID");
  if(!Object.values(B1_R3_HISTORY_ENGINE_MODES).includes(mode))throw new Error("ENGINE_MODE_INVALID");
  if(mode===B1_R3_HISTORY_ENGINE_MODES.DAILY&&entries.length>1)throw new Error("DAILY_MODE_ONE_DATE_ONLY");
  const done=new Set(sortedUnique(alreadyCompleteDates)),terminal=new Set(sortedUnique(terminalRejectedDates));
  const pending=entries.filter(x=>!done.has(x.tradeDate)&&!terminal.has(x.tradeDate));
  const chunks=[];let current=[];
  for(const entry of pending){
    const contiguous=current.length===0||entry.previousDate===current[current.length-1].tradeDate;
    if(!contiguous||current.length>=chunkSize){if(current.length)chunks.push(current);current=[];}
    current.push(entry);
  }
  if(current.length)chunks.push(current);
  return {mode,requestedDates:entries.map(x=>x.tradeDate),alreadyComplete:[...done],terminalRejected:[...terminal],pendingDates:pending.map(x=>x.tradeDate),chunks};
}

async function dateCompleteness(store,tradeDate,minCoverage){
  const u=await store.getUniverse(tradeDate);
  if(!u||!Number.isInteger(Number(u.memberCount))||Number(u.memberCount)<=0)return {complete:false,coverage:0,memberCount:0,rowCount:0};
  const rows=Number(await store.countForDate(tradeDate));
  const members=Number(u.memberCount),coverage=members>0?rows/members:0;
  return {complete:coverage>=minCoverage,coverage,memberCount:members,rowCount:rows};
}

function batchStats(collected){
  const rows=collected?.perDate??[];
  return rows.reduce((a,x)=>{
    a.inserted+=Number(x.inserted??0);a.updated+=Number(x.updated??0);a.noop+=Number(x.noop??0);
    if(String(x.status??"").startsWith("SKIPPED"))a.skipped++;
    return a;
  },{inserted:0,updated:0,noop:0,skipped:0});
}

export async function runBreadthB1R3HistoryEngineR4({
  store,scoreDates,dependencyDate,pitResolver,priceLoader,expectedPitRevision,
  protectedCurrentDate=null,mode=B1_R3_HISTORY_ENGINE_MODES.INITIAL,
  chunkSize=20,minCoverage=B1_R3_HISTORY_MIN_COVERAGE,
  terminalRejectedDates=[],checkpoint=null,onBatchEvidence=null,livePriorityGuard=async()=>({ok:true}),
  maxAttemptsPerSource=3,retryDelayMs=100,
}={}){
  if(!store)throw new TypeError("STORE_REQUIRED");
  if(typeof pitResolver!=="function")throw new TypeError("PIT_RESOLVER_REQUIRED");
  if(typeof priceLoader!=="function")throw new TypeError("PRICE_LOADER_REQUIRED");
  if(!finite(Number(minCoverage))||Number(minCoverage)<=0||Number(minCoverage)>1)throw new TypeError("MIN_COVERAGE_INVALID");
  if(checkpoint!=null&&typeof checkpoint!=="function")throw new TypeError("CHECKPOINT_CALLBACK_INVALID");
  if(onBatchEvidence!=null&&typeof onBatchEvidence!=="function")throw new TypeError("BATCH_EVIDENCE_CALLBACK_INVALID");
  if(typeof livePriorityGuard!=="function")throw new TypeError("LIVE_PRIORITY_GUARD_INVALID");
  await store.initialize();

  const entries=buildB1HistoryEntriesR4({scoreDates,dependencyDate,protectedCurrentDate});
  const completed=[];
  for(const e of entries){
    const c=await dateCompleteness(store,e.tradeDate,Number(minCoverage));
    if(c.complete)completed.push(e.tradeDate);
  }
  const plan=planB1HistoryChunksR4({entries,chunkSize,alreadyCompleteDates:completed,terminalRejectedDates,mode});
  const result={
    engineVersion:B1_R3_HISTORY_ENGINE_R4,sourceContract:B1_R3_HISTORY_ENGINE_SOURCE_CONTRACT,mode,
    requestedDates:plan.requestedDates.length,initialAlreadyComplete:plan.alreadyComplete.length,
    terminalRejectedSkipped:plan.terminalRejected.length,pendingDates:plan.pendingDates.length,
    completedDates:[...plan.alreadyComplete],validDates:[],rejectedDates:[...plan.terminalRejected],
    batches:[],providerRequestsOnScorePath:0,status:"RUNNING",nextCursor:plan.pendingDates[0]??null,
  };

  for(let i=0;i<plan.chunks.length;i++){
    const chunk=plan.chunks[i];
    const gate=await livePriorityGuard({mode,batchIndex:i,requestedDates:chunk.map(x=>x.tradeDate)});
    if(gate?.ok!==true){
      result.status="PAUSED_LIVE_PRIORITY";result.nextCursor=chunk[0]?.tradeDate??null;
      const snap={...result,checkpointReason:String(gate?.reason??"LIVE_PRIORITY")};
      if(checkpoint)await checkpoint(snap);
      return snap;
    }

    const batchId=i+1;
    const batch={batchId,requestedDates:chunk.map(x=>x.tradeDate),status:"RUNNING",sourceRevision:B1_R3_HISTORY_ENGINE_SOURCE_CONTRACT,d1Error:null};
    const before=await store.countRows();
    try{
      const collected=await collectBreadthB1R3HistoricalBatchR4({
        store,entries:chunk,pitResolver,priceLoader,expectedPitRevision,
        maxDates:Math.max(1,chunk.length),maxSourceCalls:Math.min(100,chunk.length+1),
        maxAttemptsPerSource,retryDelayMs,
      });
      const previousByDate=Object.fromEntries(chunk.map(x=>[x.tradeDate,x.previousDate]));
      const scored=await materializeBreadthB1R3StoredHistoricalScoresR4({
        store,tradeDates:chunk.map(x=>x.tradeDate),previousByDate,maxDates:Math.max(1,chunk.length),
      });
      const after=await store.countRows();
      const stats=batchStats(collected);
      const rejected=scored.rejected.map(x=>({tradeDate:x.tradeDate,missing:x.missing??[]}));
      batch.status="SUCCESS";batch.completedDates=chunk.map(x=>x.tradeDate);batch.sourceCalls=Number(collected.sourceCalls??0);
      batch.providerRequestsOnScorePath=Number(scored.providerRequests??0);batch.validDates=scored.scores.map(x=>x.tradeDate);
      batch.rejectedDates=rejected;batch.storedRows={before,after,inserted:stats.inserted,updated:stats.updated,noop:stats.noop,skipped:stats.skipped};
      result.completedDates.push(...chunk.map(x=>x.tradeDate));result.validDates.push(...batch.validDates);
      result.rejectedDates.push(...rejected.map(x=>x.tradeDate));result.providerRequestsOnScorePath+=batch.providerRequestsOnScorePath;
      result.batches.push(batch);
      const next=plan.chunks[i+1]?.[0]?.tradeDate??null;result.nextCursor=next;
      const snap={...result,status:next?"CHECKPOINT":"SUCCESS"};
      if(onBatchEvidence)await onBatchEvidence({batch:{...batch},checkpoint:{...snap}});
      if(checkpoint)await checkpoint(snap);
    }catch(e){
      const cls=classifyB1HistoryEngineErrorR4(e);batch.status=cls==="RETRYABLE"?"RETRYABLE_ERROR":"TERMINAL_ERROR";
      batch.d1Error=String(e?.message??e);result.batches.push(batch);result.status=cls==="RETRYABLE"?"RETRYABLE_STOP":"TERMINAL_STOP";
      result.nextCursor=chunk[0]?.tradeDate??null;
      const snap={...result,failureClass:cls,failureMessage:String(e?.message??e)};
      if(onBatchEvidence)await onBatchEvidence({batch:{...batch},checkpoint:{...snap}});
      if(checkpoint)await checkpoint(snap);
      return snap;
    }
  }

  result.status="SUCCESS";result.completedDates=sortedUnique(result.completedDates);result.validDates=sortedUnique(result.validDates);result.rejectedDates=sortedUnique(result.rejectedDates);result.nextCursor=null;
  if(checkpoint)await checkpoint({...result});
  return result;
}
