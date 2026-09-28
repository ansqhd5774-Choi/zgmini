import {createBreadthB1R3Store} from "./breadth-b1-r3-store.mjs";
import {
  B1_R3_HISTORY_SOURCE_CONTRACT,
  B1_R3_HISTORY_MIN_COVERAGE,
  B1_R3_HISTORY_FIRST_SCORE_DATE,
} from "./breadth-b1-r3-history-r4.mjs";
import {materializeBreadthB1R3StoredHistoricalScoresR4} from "./breadth-b1-r3-history-score-r4.mjs";

export const B1_R3_HISTORY_INGEST_R1="B1-R3-HISTORY-PROD-INGEST-R1";
export const B1_R3_HISTORY_PAYLOAD_R1="B1-R3-HISTORY-PAYLOAD-R1";
export const B1_R3_HISTORY_PIT_REVISION="B1_HISTORY_SOURCE_CONTRACT_R2";
export const B1_R3_HISTORY_PROTECTED_CURRENT="2026-09-23";
export const B1_R3_HISTORY_LAST_BACKFILL_DATE="2026-09-22";
export const B1_R3_HISTORY_LIVE_LOCK="breadth-b1-r3-collect";

const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const sortedUnique=xs=>[...new Set((xs??[]).map(x=>String(x??"").trim()).filter(Boolean))].sort();
const sameStrings=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
const asDate=(v,n)=>{
  const s=String(v??"");
  if(!DATE_RE.test(s))throw new TypeError(`${n}_INVALID`);
  return s;
};

function normalizeMembers(raw){
  if(!Array.isArray(raw))throw new TypeError("UNIVERSE_MEMBERS_REQUIRED");
  const members=sortedUnique(raw);
  if(members.length!==raw.length)throw new Error("UNIVERSE_DUPLICATE_TICKER");
  if(members.length<490||members.length>520)throw new Error("UNIVERSE_COUNT_OUT_OF_RANGE");
  return members;
}

function normalizeRows(rawRows,tradeDate,previousDate,members){
  if(!Array.isArray(rawRows))throw new TypeError("ROWS_REQUIRED");
  if(rawRows.length<1||rawRows.length>520)throw new Error("ROWS_COUNT_OUT_OF_RANGE");
  const memberSet=new Set(members),seen=new Set(),out=[];
  for(const raw of rawRows){
    const ticker=String(raw?.ticker??"").trim();
    if(!ticker)throw new Error("ROW_TICKER_REQUIRED");
    if(seen.has(ticker))throw new Error(`ROW_DUPLICATE_TICKER:${ticker}`);
    if(!memberSet.has(ticker))throw new Error(`ROW_TICKER_NOT_IN_UNIVERSE:${ticker}`);
    seen.add(ticker);
    const pc=Number(raw?.previousClose),cc=Number(raw?.currentClose),cv=Number(raw?.currentVolume);
    if(!finite(pc)||pc<=0||!finite(cc)||cc<=0||!finite(cv)||cv<0)throw new Error(`ROW_VALUE_INVALID:${ticker}`);
    const currentResolvedSymbol=String(raw?.currentResolvedSymbol??ticker).trim();
    const previousResolvedSymbol=String(raw?.previousResolvedSymbol??ticker).trim();
    const currentResolution=String(raw?.currentResolution??"exact").trim();
    const previousResolution=String(raw?.previousResolution??"exact").trim();
    out.push({
      ticker,previousDate,currentDate:tradeDate,previousClose:pc,currentClose:cc,currentVolume:cv,
      source:"MarketParquet Free Sample",feed:"stock_daily",
      provenance:{
        provider:"MARKETPARQUET_FREE_SAMPLE",
        sourceContractRevision:B1_R3_HISTORY_SOURCE_CONTRACT,
        pitSourceContractRevision:B1_R3_HISTORY_PIT_REVISION,
        currentResolvedSymbol,previousResolvedSymbol,currentResolution,previousResolution,
        splitAdjusted:true,dividendAdjusted:false,
      },
    });
  }
  return out.sort((a,b)=>a.ticker.localeCompare(b.ticker));
}

export function validateBreadthB1R3HistoryPayloadR1(payload){
  if(!payload||typeof payload!=="object")throw new TypeError("PAYLOAD_REQUIRED");
  if(String(payload.payloadRevision??"")!==B1_R3_HISTORY_PAYLOAD_R1)throw new Error("PAYLOAD_REVISION_MISMATCH");
  if(String(payload.sourceContractRevision??"")!==B1_R3_HISTORY_SOURCE_CONTRACT)throw new Error("PRICE_SOURCE_CONTRACT_MISMATCH");
  if(String(payload.pitSourceContractRevision??"")!==B1_R3_HISTORY_PIT_REVISION)throw new Error("PIT_SOURCE_CONTRACT_MISMATCH");

  const tradeDate=asDate(payload.tradeDate,"TRADE_DATE");
  const previousDate=asDate(payload.previousDate,"PREVIOUS_DATE");
  if(tradeDate<B1_R3_HISTORY_FIRST_SCORE_DATE||tradeDate>B1_R3_HISTORY_LAST_BACKFILL_DATE)throw new Error("TRADE_DATE_OUTSIDE_APPROVED_BACKFILL");
  if(tradeDate>=B1_R3_HISTORY_PROTECTED_CURRENT)throw new Error("PROTECTED_CURRENT_DATE_INCLUDED");
  if(previousDate>=tradeDate)throw new Error("PREVIOUS_DATE_INVALID_ORDER");

  const members=normalizeMembers(payload?.universe?.members);
  const rows=normalizeRows(payload.rows,tradeDate,previousDate,members);
  const provenance={
    ...(payload?.universe?.provenance&&typeof payload.universe.provenance==="object"?payload.universe.provenance:{}),
    sourceContractRevision:B1_R3_HISTORY_PIT_REVISION,
    historicalPriceContract:B1_R3_HISTORY_SOURCE_CONTRACT,
    productionBackfillIngest:B1_R3_HISTORY_INGEST_R1,
  };
  return {tradeDate,previousDate,members,rows,provenance};
}

function compareExisting(row,incoming){
  return String(row?.previous_date??"")===incoming.previousDate
    && String(row?.trade_date??"")===incoming.currentDate
    && Number(row?.previous_close)===incoming.previousClose
    && Number(row?.current_close)===incoming.currentClose
    && Number(row?.current_volume)===incoming.currentVolume;
}

export async function ingestBreadthB1R3HistoricalPayloadR1({
  env={},db=env?.DB,store=null,payload,now=()=>new Date(),lockTtlMs=60000,
}={}){
  const normalized=validateBreadthB1R3HistoryPayloadR1(payload);
  const s=store??createBreadthB1R3Store(db);
  await s.initialize();

  const lock=await s.acquire(B1_R3_HISTORY_LIVE_LOCK,{ttlMs:lockTtlMs});
  if(!lock.acquired){
    return {
      ingestVersion:B1_R3_HISTORY_INGEST_R1,status:"PAUSED_LIVE_PRIORITY",
      tradeDate:normalized.tradeDate,providerRequests:0,scoreProviderRequests:0,writeApplied:false,
    };
  }

  try{
    const existingUniverse=await s.getUniverse(normalized.tradeDate);
    if(existingUniverse){
      const oldMembers=sortedUnique(existingUniverse.members??[]);
      if(!sameStrings(oldMembers,normalized.members))throw new Error("EXISTING_UNIVERSE_MISMATCH");
    }

    const existingPairs=await s.getPairs(normalized.tradeDate);
    const existingByTicker=new Map(existingPairs.map(row=>[String(row.ticker),row]));
    for(const incoming of normalized.rows){
      const old=existingByTicker.get(incoming.ticker);
      if(old&&!compareExisting(old,incoming))throw new Error(`EXISTING_PAIR_CONFLICT:${incoming.ticker}`);
    }

    const pending=normalized.rows.filter(row=>!existingByTicker.has(row.ticker));
    const retrievedAt=(typeof now==="function"?now():new Date()).toISOString();

    let universeInserted=false;
    if(!existingUniverse){
      await s.putUniverse({
        tradeDate:normalized.tradeDate,members:normalized.members,
        provenance:normalized.provenance,retrievedAt,
      });
      universeInserted=true;
    }

    let stats={inserted:0,updated:0,noop:0,validSeen:0,currentRows:existingPairs.length,historyRowsAdded:0};
    if(pending.length){
      stats=await s.upsertPairs({
        asOfDate:normalized.tradeDate,tradeDate:normalized.tradeDate,pairs:pending,retrievedAt,
      });
      if(Number(stats.updated??0)!==0)throw new Error("CURRENT_PROTECTION_UPDATE_DETECTED");
    }

    const currentRows=await s.countForDate(normalized.tradeDate);
    const coverage=currentRows/normalized.members.length;
    const scored=await materializeBreadthB1R3StoredHistoricalScoresR4({
      store:s,tradeDates:[normalized.tradeDate],
      previousByDate:{[normalized.tradeDate]:normalized.previousDate},
      maxDates:1,
    });
    const numeric=scored.scores[0]??null;
    const rejected=scored.rejected[0]??null;
    const status=numeric?"READY":"PARTIAL";

    await s.recordRun({
      runId:`prod-hbf-${normalized.tradeDate}-${globalThis.crypto?.randomUUID?.()??Date.now()}`,
      asOfDate:normalized.tradeDate,tradeDate:normalized.tradeDate,
      status:coverage>=B1_R3_HISTORY_MIN_COVERAGE?"SUCCESS":"PARTIAL",
      startedAt:retrievedAt,completedAt:(typeof now==="function"?now():new Date()).toISOString(),
      providerRequests:0,collectedRows:pending.length,
      insertedCount:Number(stats.inserted??0),updatedCount:0,noopCount:Number(stats.noop??0),
      currentRows,historyRowsAdded:Number(stats.historyRowsAdded??0),coverage,
      failureCode:null,
      detail:{
        historicalCollector:B1_R3_HISTORY_INGEST_R1,
        sourceContractRevision:B1_R3_HISTORY_SOURCE_CONTRACT,
        pitSourceContractRevision:B1_R3_HISTORY_PIT_REVISION,
        previousDate:normalized.previousDate,
        universeInserted,payloadRows:normalized.rows.length,pendingRows:pending.length,
        scoreProviderRequests:0,publicResponseGenerated:false,
      },
    });

    return {
      ingestVersion:B1_R3_HISTORY_INGEST_R1,
      payloadRevision:B1_R3_HISTORY_PAYLOAD_R1,
      status,tradeDate:normalized.tradeDate,previousDate:normalized.previousDate,
      memberCount:normalized.members.length,payloadRows:normalized.rows.length,
      inserted:Number(stats.inserted??0),updated:0,noopExisting:normalized.rows.length-pending.length,
      currentRows,coverage,
      score:numeric?.score??null,
      components:numeric?.components??null,
      quality:numeric?.quality??null,
      rejected:rejected?{missing:rejected.missing??[]}:null,
      providerRequests:0,scoreProviderRequests:Number(scored.providerRequests??0),
      storageMode:"D1_STORED_ONLY",writeApplied:universeInserted||Number(stats.inserted??0)>0,
    };
  }finally{
    await s.release(lock).catch(()=>false);
  }
}
