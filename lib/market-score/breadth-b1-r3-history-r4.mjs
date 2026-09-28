import {createBreadthB1R3Store} from "./breadth-b1-r3-store.mjs";

export const B1_R3_HISTORY_R4="B1-R3-HISTORY-COLLECTOR-R4";
export const B1_R3_HISTORY_SOURCE_CONTRACT="ZGMINI_B1_PRICE_SOURCE_CONTRACT_R4";
export const B1_R3_HISTORY_PROVIDER="MARKETPARQUET_FREE_SAMPLE";
export const B1_R3_HISTORY_FEED="stock_daily";
export const B1_R3_HISTORY_DEPENDENCY_DATE="2025-09-29";
export const B1_R3_HISTORY_FIRST_SCORE_DATE="2025-09-30";
export const B1_R3_HISTORY_TARGET_END="2026-09-23";
export const B1_R3_HISTORY_MIN_COVERAGE=0.98;

const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const isoNow=now=>{const x=typeof now==="function"?now():new Date();const d=x instanceof Date?x:new Date(x);if(Number.isNaN(d.valueOf()))throw new Error("NOW_INVALID");return d.toISOString()};
const uuid=()=>globalThis.crypto?.randomUUID?.()??`${Date.now()}-${Math.random()}`;

function date(v,name="DATE"){
  const s=String(v??"");
  if(!DATE_RE.test(s))throw new TypeError(`${name}_INVALID`);
  return s;
}
function assertTradeDateRange(d){
  if(d<B1_R3_HISTORY_FIRST_SCORE_DATE||d>B1_R3_HISTORY_TARGET_END)throw new Error("TRADE_DATE_OUTSIDE_R4_FREEZE");
}
function sortedUnique(xs){return [...new Set(xs.map(x=>String(x??"").trim()).filter(Boolean))].sort()}
function sameStrings(a,b){return a.length===b.length&&a.every((x,i)=>x===b[i])}
function retryable(e){return /429|5\d\d|TIMEOUT|ECONN|EAI_AGAIN|ENET|FETCH|SOCKET|TEMPORAR/i.test(String(e?.message??e??""))}

export function marketParquetSymbolVariants(ticker){
  const t=String(ticker??"").trim();
  if(!t)return [];
  const base=new Set([t]);
  if(t.includes(".")){
    base.add(t.replaceAll(".","-"));
    base.add(t.replaceAll(".","/"));
  }
  const out=[];
  for(const x of base)out.push(x,`${x}-DELISTED`);
  return [...new Set(out)];
}

export function buildMarketParquetDailyMap(rows,{requestedDate=null}={}){
  if(!Array.isArray(rows))throw new TypeError("PRICE_ROWS_REQUIRED");
  const map=new Map();
  const invalid=[];
  for(const raw of rows){
    const symbol=String(raw?.symbol??"").trim();
    if(!symbol){invalid.push({reason:"SYMBOL_MISSING"});continue}
    if(map.has(symbol))throw new Error(`DUPLICATE_SOURCE_SYMBOL:${symbol}`);
    const close=Number(raw?.close),volume=Number(raw?.volume);
    if(!finite(close)||close<=0||!finite(volume)||volume<0){invalid.push({symbol,reason:"INVALID_CLOSE_OR_VOLUME"});continue}
    if(raw?.date!=null&&requestedDate!=null&&String(raw.date)!==requestedDate)throw new Error(`SOURCE_ROW_DATE_MISMATCH:${symbol}`);
    map.set(symbol,{close,volume});
  }
  return {map,invalid};
}

export function resolveMarketParquetTicker(map,ticker){
  if(!(map instanceof Map))throw new TypeError("PRICE_MAP_REQUIRED");
  const hits=marketParquetSymbolVariants(ticker).filter(x=>map.has(x));
  if(hits.length===0)return {status:"missing",ticker};
  if(hits.length>1)return {status:"ambiguous",ticker,hits};
  const symbol=hits[0];
  const mode=symbol===ticker?"exact":symbol.endsWith("-DELISTED")?"delisted_suffix":"class_variant";
  return {status:"ok",ticker,symbol,mode,row:map.get(symbol)};
}

export function validateHistoricalEntriesR4(entries,{maxDates=20}={}){
  if(!Array.isArray(entries)||entries.length<1)throw new TypeError("HISTORY_ENTRIES_REQUIRED");
  if(!Number.isInteger(maxDates)||maxDates<1||maxDates>50)throw new Error("MAX_DATES_INVALID");
  if(entries.length>maxDates)throw new Error("HISTORY_BATCH_EXCEEDS_BOUND");
  const seen=new Set();let prior=null;
  return entries.map((raw,i)=>{
    const tradeDate=date(raw?.tradeDate,"TRADE_DATE");
    const previousDate=date(raw?.previousDate,"PREVIOUS_DATE");
    assertTradeDateRange(tradeDate);
    if(previousDate<tradeDate&&previousDate>=B1_R3_HISTORY_DEPENDENCY_DATE){}else throw new Error("PREVIOUS_DATE_OUTSIDE_R4_FREEZE");
    if(seen.has(tradeDate))throw new Error("DUPLICATE_TRADE_DATE");
    seen.add(tradeDate);
    if(prior&&tradeDate<=prior)throw new Error("HISTORY_ENTRIES_NOT_ASCENDING");
    prior=tradeDate;
    if(i>0&&previousDate!==entries[i-1].tradeDate)throw new Error("PREVIOUS_DATE_NOT_PRIOR_BATCH_OBSERVATION");
    return {tradeDate,previousDate};
  });
}

async function withRetry(fn,counter,{maxAttempts=3,retryDelayMs=100}={}){
  if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>5)throw new Error("MAX_ATTEMPTS_INVALID");
  let last;
  for(let i=1;i<=maxAttempts;i++){
    counter.sourceCalls++;
    try{return await fn()}catch(e){last=e;if(i===maxAttempts||!retryable(e))throw e;await sleep(retryDelayMs*i)}
  }
  throw last;
}

function normalizeSnapshot(snapshot,tradeDate,expectedPitRevision){
  if(!snapshot||String(snapshot.tradeDate??"")!==tradeDate)throw new Error("PIT_SNAPSHOT_DATE_MISMATCH");
  const members=sortedUnique(snapshot.members??[]);
  if(members.length<490||members.length>520)throw new Error("PIT_UNIVERSE_COUNT_OUT_OF_RANGE");
  const sourceRevision=String(snapshot?.provenance?.sourceContractRevision??snapshot?.sourceContractRevision??"").trim();
  if(expectedPitRevision&&sourceRevision!==expectedPitRevision)throw new Error("PIT_SOURCE_REVISION_MISMATCH");
  if(!sourceRevision)throw new Error("PIT_SOURCE_REVISION_MISSING");
  return {members,sourceRevision,provenance:snapshot.provenance??{}};
}

function normalizeLoadedPrice(payload,requestedDate){
  if(!payload||String(payload.date??"")!==requestedDate)throw new Error("PRICE_SOURCE_DATE_MISMATCH");
  const sourceRevision=String(payload.sourceContractRevision??payload?.provenance?.sourceContractRevision??"").trim();
  if(sourceRevision!==B1_R3_HISTORY_SOURCE_CONTRACT)throw new Error("PRICE_SOURCE_REVISION_MISMATCH");
  const {map,invalid}=buildMarketParquetDailyMap(payload.rows,{requestedDate});
  return {map,invalid,provenance:payload.provenance??{},sourceRevision};
}

export async function collectBreadthB1R3HistoricalBatchR4({
  db=null,store=null,entries,pitResolver,priceLoader,expectedPitRevision,
  now=()=>new Date(),maxDates=20,maxSourceCalls=25,maxAttemptsPerSource=3,retryDelayMs=100,
  runIdFactory=uuid,
}={}){
  if(typeof pitResolver!=="function")throw new TypeError("PIT_RESOLVER_REQUIRED");
  if(typeof priceLoader!=="function")throw new TypeError("PRICE_LOADER_REQUIRED");
  if(!store&&!db)throw new TypeError("D1_DATABASE_OR_STORE_REQUIRED");
  if(!Number.isInteger(maxSourceCalls)||maxSourceCalls<1||maxSourceCalls>100)throw new Error("MAX_SOURCE_CALLS_INVALID");
  const batch=validateHistoricalEntriesR4(entries,{maxDates});
  const s=store??createBreadthB1R3Store(db);
  await s.initialize();
  const counter={sourceCalls:0};
  const priceCache=new Map();
  const perDate=[];

  async function load(dateValue){
    if(priceCache.has(dateValue))return priceCache.get(dateValue);
    const p=(async()=>{
      const loaded=await withRetry(()=>priceLoader({date:dateValue}),counter,{maxAttempts:maxAttemptsPerSource,retryDelayMs});
      if(counter.sourceCalls>maxSourceCalls)throw new Error("SOURCE_CALL_BUDGET_EXCEEDED");
      return normalizeLoadedPrice(loaded,dateValue);
    })();
    priceCache.set(dateValue,p);
    try{return await p}catch(e){priceCache.delete(dateValue);throw e}
  }

  for(const entry of batch){
    const startedAt=isoNow(now),runId=String(runIdFactory());
    const pit=normalizeSnapshot(await pitResolver({date:entry.tradeDate}),entry.tradeDate,expectedPitRevision);
    const existingUniverse=await s.getUniverse(entry.tradeDate);
    if(existingUniverse){
      const old=sortedUnique(existingUniverse.members??[]);
      if(!sameStrings(old,pit.members))throw new Error("EXISTING_UNIVERSE_MISMATCH");
    }else{
      await s.putUniverse({
        tradeDate:entry.tradeDate,members:pit.members,retrievedAt:startedAt,
        provenance:{...pit.provenance,sourceContractRevision:pit.sourceRevision,historicalPriceContract:B1_R3_HISTORY_SOURCE_CONTRACT},
      });
    }

    const existing=sortedUnique(await s.existingTickers(entry.tradeDate));
    const existingSet=new Set(existing);
    const beforeRows=existing.length;
    const existingCoverage=beforeRows/pit.members.length;
    if(existingCoverage>=B1_R3_HISTORY_MIN_COVERAGE){
      const completedAt=isoNow(now);
      await s.recordRun({runId,asOfDate:entry.tradeDate,tradeDate:entry.tradeDate,status:"SUCCESS",startedAt,completedAt,providerRequests:0,collectedRows:0,insertedCount:0,updatedCount:0,noopCount:0,currentRows:beforeRows,historyRowsAdded:0,coverage:existingCoverage,detail:{historicalCollector:B1_R3_HISTORY_R4,sourceContractRevision:B1_R3_HISTORY_SOURCE_CONTRACT,skipped:"ALREADY_VALID",previousDate:entry.previousDate}});
      perDate.push({tradeDate:entry.tradeDate,previousDate:entry.previousDate,status:"SKIPPED_ALREADY_VALID",memberCount:pit.members.length,beforeRows,currentRows:beforeRows,coverage:existingCoverage,inserted:0,updated:0,sourceCalls:counter.sourceCalls});
      continue;
    }

    const pending=pit.members.filter(t=>!existingSet.has(t));
    const [current,previous]=await Promise.all([load(entry.tradeDate),load(entry.previousDate)]);
    const pairs=[];const missing=[];const ambiguous=[];const invalid=[];
    for(const ticker of pending){
      const c=resolveMarketParquetTicker(current.map,ticker);
      const p=resolveMarketParquetTicker(previous.map,ticker);
      if(c.status==="ambiguous"||p.status==="ambiguous"){
        ambiguous.push({ticker,current:c.status==="ambiguous"?c.hits:[],previous:p.status==="ambiguous"?p.hits:[]});
        continue;
      }
      if(c.status!=="ok"||p.status!=="ok"){
        missing.push({ticker,current:c.status,previous:p.status});
        continue;
      }
      if(!finite(c.row.close)||c.row.close<=0||!finite(c.row.volume)||c.row.volume<0||!finite(p.row.close)||p.row.close<=0){
        invalid.push(ticker);continue;
      }
      pairs.push({
        ticker,previousDate:entry.previousDate,currentDate:entry.tradeDate,
        previousClose:p.row.close,currentClose:c.row.close,currentVolume:c.row.volume,
        source:"MarketParquet Free Sample",feed:B1_R3_HISTORY_FEED,
        provenance:{provider:B1_R3_HISTORY_PROVIDER,sourceContractRevision:B1_R3_HISTORY_SOURCE_CONTRACT,
          currentResolvedSymbol:c.symbol,previousResolvedSymbol:p.symbol,currentResolution:c.mode,previousResolution:p.mode,
          splitAdjusted:true,dividendAdjusted:false},
      });
    }

    const stats=await s.upsertPairs({asOfDate:entry.tradeDate,tradeDate:entry.tradeDate,pairs,retrievedAt:isoNow(now)});
    if(Number(stats.updated??0)!==0)throw new Error("CURRENT_PROTECTION_UPDATE_DETECTED");
    const currentRows=await s.countForDate(entry.tradeDate);
    if(currentRows<beforeRows)throw new Error("CURRENT_ROW_COUNT_DECREASED");
    const coverage=currentRows/pit.members.length;
    const status=coverage>=B1_R3_HISTORY_MIN_COVERAGE?"SUCCESS":"PARTIAL";
    const completedAt=isoNow(now);
    await s.recordRun({
      runId,asOfDate:entry.tradeDate,tradeDate:entry.tradeDate,status,startedAt,completedAt,
      providerRequests:0,collectedRows:pairs.length,insertedCount:Number(stats.inserted??0),updatedCount:Number(stats.updated??0),noopCount:Number(stats.noop??0),
      currentRows,historyRowsAdded:Number(stats.historyRowsAdded??0),coverage,failureCode:null,
      detail:{historicalCollector:B1_R3_HISTORY_R4,sourceContractRevision:B1_R3_HISTORY_SOURCE_CONTRACT,previousDate:entry.previousDate,
        pendingCount:pending.length,missingCount:missing.length,ambiguousCount:ambiguous.length,invalidCount:invalid.length,
        sourceCallsAtCompletion:counter.sourceCalls,scoreComputed:false,publicResponseGenerated:false},
    });
    perDate.push({tradeDate:entry.tradeDate,previousDate:entry.previousDate,status,memberCount:pit.members.length,beforeRows,currentRows,coverage,
      inserted:Number(stats.inserted??0),updated:Number(stats.updated??0),noop:Number(stats.noop??0),missing,ambiguous,invalid,sourceCalls:counter.sourceCalls});
  }

  if(counter.sourceCalls>maxSourceCalls)throw new Error("SOURCE_CALL_BUDGET_EXCEEDED");
  return {
    collectorVersion:B1_R3_HISTORY_R4,sourceContractRevision:B1_R3_HISTORY_SOURCE_CONTRACT,provider:B1_R3_HISTORY_PROVIDER,
    status:perDate.every(x=>x.coverage>=B1_R3_HISTORY_MIN_COVERAGE)?"SUCCESS":"PARTIAL",
    providerRequests:counter.sourceCalls,sourceCalls:counter.sourceCalls,scoreComputed:false,publicResponseGenerated:false,
    dateCount:perDate.length,perDate,nextCursor:perDate.at(-1)?.tradeDate??null,
  };
}
