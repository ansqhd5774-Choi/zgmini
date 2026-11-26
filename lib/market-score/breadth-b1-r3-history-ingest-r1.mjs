import {throwMarketParquetRemoved} from '../marketparquet-retirement.mjs';
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

export async function ingestBreadthB1R3HistoricalPayloadR1(){return throwMarketParquetRemoved();}
