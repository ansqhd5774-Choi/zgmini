import {throwMarketParquetRemoved} from '../marketparquet-retirement.mjs';
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

export async function collectBreadthB1R3HistoricalBatchR4(){return throwMarketParquetRemoved();}
