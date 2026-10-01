import {
  B1_R3_BATCH_SIZE,B1_R3_MIN_COVERAGE,B1_R3_METHOD,B1_R3_UNIVERSE_PROVIDER,B1_R3_PROVIDER,IEX_ATTRIBUTION,
  B1_R3_LIVE_SOURCE_METHOD,B1_R3_MARKETPARQUET_SOURCE_CONTRACT,
} from "./breadth-b1-r3-contract.mjs";
import {fetchSp500Universe,fetchBarsCatalogue,fetchTickerPair,selectTradeDateFromCatalogue} from "./breadth-b1-r3-provider.mjs";
import {fetchMarketParquetLatestPairs} from "./breadth-b1-r6-marketparquet-provider.mjs";
import {createBreadthB1R3Store} from "./breadth-b1-r3-store.mjs";

const nowIso=now=>(typeof now==="function"?now():new Date()).toISOString();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const retryable=e=>/HTTP_(429|5\d\d)|TIMEOUT|ECONN|EAI_AGAIN|ENET|FETCH|SOCKET/i.test(String(e?.message??e??""));
async function withRetry(fn,counter,{maxAttempts=2,delayMs=300}={}){
  let last;
  for(let i=1;i<=maxAttempts;i++){counter.providerRequests++;try{return await fn()}catch(e){last=e;if(i===maxAttempts||!retryable(e))throw e;await sleep(delayMs*i)}}
  throw last;
}
async function mapLimit(items,limit,fn){const out=new Array(items.length);let next=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{for(;;){const i=next++;if(i>=items.length)return;out[i]=await fn(items[i],i)}}));return out}
export const B1_R3_COLLECTOR="B1-R3-COLLECTOR-R3";

export async function collectBreadthB1R3ToStore({
  env={},db=env?.DB,asOfDate,fetchImpl=globalThis.fetch,store=null,
  now=()=>new Date(),batchSize=B1_R3_BATCH_SIZE,concurrency=8,maxAttemptsPerCall=2,retryDelayMs=300,
  universeFetcher=fetchSp500Universe,catalogueFetcher=fetchBarsCatalogue,pairFetcher=fetchTickerPair,
  recoveryFetcher=fetchMarketParquetLatestPairs,
}={}){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(asOfDate??"")))throw new TypeError("AS_OF_DATE_INVALID");
  if(!db&&!store)throw new Error("D1_DATABASE_REQUIRED");
  if(!Number.isInteger(batchSize)||batchSize<1||batchSize>44)throw new Error("BATCH_SIZE_INVALID");
  const s=store??createBreadthB1R3Store(db),startedAt=nowIso(now),runId=globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`;
  await s.initialize();
  const lock=await s.acquire("breadth-b1-r3-collect");
  if(!lock.acquired)return {collectorVersion:B1_R3_COLLECTOR,status:"SKIPPED_LOCKED",providerRequests:0,scoreComputed:false};
  const counter={providerRequests:0};let tradeDate=null;
  try{
    const upstreamStart=Date.now();
    const universe=await withRetry(()=>universeFetcher({fetchImpl}),counter,{maxAttempts:maxAttemptsPerCall,delayMs:retryDelayMs});
    const retrievedAt=nowIso(now);
    let catalogue=null,selection=null,pairs=[],failures=[],batch=[],sourceMode="MARKETPARQUET_PRIMARY",primaryFailure=null;
    try{
      counter.providerRequests+=2;
      const primary=await recoveryFetcher({symbols:universe.symbols,asOfDate,fetchImpl});
      if(!primary?.tradeDate||Number(primary?.coverage??0)<B1_R3_MIN_COVERAGE)throw new Error("MARKETPARQUET_COVERAGE_BELOW_MINIMUM");
      tradeDate=primary.tradeDate;
      selection={eligible:primary.pairs.map(row=>row.ticker)};
      await s.putUniverse({
        tradeDate,members:universe.symbols,retrievedAt,
        provenance:{
          provider:B1_R3_UNIVERSE_PROVIDER,sourceUrl:universe.sourceUrl,methodology:B1_R3_LIVE_SOURCE_METHOD,
          priceProvider:primary.provider,sourceContractRevision:B1_R3_MARKETPARQUET_SOURCE_CONTRACT,
        },
      });
      const existing=new Set(await s.existingTickers(tradeDate));
      batch=primary.pairs.filter(row=>!existing.has(row.ticker));
      pairs=batch;
      failures=(primary.missing??[]).map(ticker=>({ticker,error:"MARKETPARQUET_TICKER_MISSING"}));
    }catch(error){
      primaryFailure=String(error?.message??error);
      sourceMode="IEX_HIST_FALLBACK";
      catalogue=await withRetry(()=>catalogueFetcher({fetchImpl}),counter,{maxAttempts:maxAttemptsPerCall,delayMs:retryDelayMs});
      selection=selectTradeDateFromCatalogue(universe.symbols,catalogue,{minCoverage:B1_R3_MIN_COVERAGE});
      tradeDate=selection.tradeDate;
      if(!tradeDate)throw new Error("PROVIDER_COVERAGE_BELOW_MINIMUM");
      await s.putUniverse({
        tradeDate,members:universe.symbols,retrievedAt,
        provenance:{
          provider:B1_R3_UNIVERSE_PROVIDER,sourceUrl:universe.sourceUrl,methodology:B1_R3_METHOD,
          catalogueUpdated:catalogue.updated??null,primaryFailure,
        },
      });
      const existing=new Set(await s.existingTickers(tradeDate));
      const pending=selection.eligible.filter(x=>!existing.has(x));
      batch=pending.slice(0,batchSize);
      const settled=await mapLimit(batch,concurrency,async ticker=>{
        try{return {ok:true,value:await withRetry(()=>pairFetcher({ticker,tradeDate,fetchImpl}),counter,{maxAttempts:maxAttemptsPerCall,delayMs:retryDelayMs})}}
        catch(error){return {ok:false,ticker,error:String(error?.message??error)}}
      });
      pairs=settled.filter(x=>x.ok).map(x=>({...x.value,provenance:{provider:B1_R3_PROVIDER,attribution:IEX_ATTRIBUTION}}));
      failures=settled.filter(x=>!x.ok);
    }
    const writeStart=Date.now();
    const stats=await s.upsertPairs({asOfDate,tradeDate,pairs,retrievedAt:nowIso(now)});
    const storageWriteMs=Date.now()-writeStart;
    const currentRows=await s.countForDate(tradeDate),coverage=currentRows/universe.symbols.length;
    const remaining=Math.max(0,universe.symbols.length-currentRows);
    const status=coverage>=B1_R3_MIN_COVERAGE?"SUCCESS":"PARTIAL_BATCH";
    const completedAt=nowIso(now);
    await s.recordRun({
      runId,asOfDate,tradeDate,status,startedAt,completedAt,providerRequests:counter.providerRequests,collectedRows:pairs.length,
      insertedCount:stats.inserted,updatedCount:stats.updated,noopCount:stats.noop,currentRows,historyRowsAdded:stats.historyRowsAdded,
      coverage,upstreamMs:Date.now()-upstreamStart-storageWriteMs,storageWriteMs,failureCode:null,
      detail:{batchSize:batch.length,remaining,failedTickers:failures.map(x=>x.ticker),catalogueUpdated:catalogue?.updated??null,sourceMode,primaryFailure},
    });
    return {
      collectorVersion:B1_R3_COLLECTOR,status,runId,tradeDate,providerRequests:counter.providerRequests,scoreComputed:false,
      universeCount:universe.symbols.length,eligibleCount:selection.eligible.length,batchRequested:batch.length,collectedRows:pairs.length,
      inserted:stats.inserted,updated:stats.updated,noop:stats.noop,currentRows,coverage,remaining,sourceMode,primaryFailure,failedTickers:failures.map(x=>x.ticker),
    };
  }catch(error){
    const completedAt=nowIso(now);
    await s.recordRun({runId,asOfDate,tradeDate,status:"FAILED",startedAt,completedAt,providerRequests:counter.providerRequests,failureCode:String(error?.message??error),detail:{}});
    return {collectorVersion:B1_R3_COLLECTOR,status:"FAILED",runId,tradeDate,providerRequests:counter.providerRequests,scoreComputed:false,failureCode:String(error?.message??error)};
  }finally{await s.release(lock).catch(()=>false)}
}
