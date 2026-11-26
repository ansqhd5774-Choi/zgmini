import {throwMarketParquetRemoved} from '../marketparquet-retirement.mjs';

import {buildBreadthB1R1} from "./breadth-b1-r1.mjs";
import {B1_R3_METHOD,B1_R3_MIN_COVERAGE} from "./breadth-b1-r3-contract.mjs";
import {createBreadthB1R3Store} from "./breadth-b1-r3-store.mjs";

export const B1_R3_HISTORY_SCORE_R4="B1-R3-HISTORY-STORED-SCORE-R4";
export const B1_R3_HISTORY_PRICE_SOURCE="MarketParquet Free Sample";
export const B1_R3_HISTORY_SOURCE_CONTRACT="ZGMINI_B1_PRICE_SOURCE_CONTRACT_R4";

const validDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const finite=n=>typeof n==="number"&&Number.isFinite(n);

function partial(reason,tradeDate,extra={}){
  return {
    id:"breadth",
    status:"PARTIAL",
    score:null,
    methodologyVersion:B1_R3_METHOD,
    source:B1_R3_HISTORY_PRICE_SOURCE,
    provider:"MARKETPARQUET_FREE",
    historicalSourceContract:B1_R3_HISTORY_SOURCE_CONTRACT,
    observationDate:tradeDate??null,
    missing:[reason],
    providerRequests:0,
    storageMode:"D1_STORED_ONLY",
    ...extra,
  };
}

function normalizeStoredPair(row,tradeDate){
  const ticker=String(row?.ticker??"").trim();
  const previousDate=String(row?.previous_date??row?.previousDate??"").trim();
  const currentDate=String(row?.trade_date??row?.currentDate??"").trim();
  const previousClose=Number(row?.previous_close??row?.previousClose);
  const currentClose=Number(row?.current_close??row?.currentClose);
  const currentVolume=Number(row?.current_volume??row?.currentVolume);
  if(!ticker||currentDate!==tradeDate||!validDate(previousDate)||previousDate>=tradeDate)return null;
  if(!finite(previousClose)||!finite(currentClose)||!finite(currentVolume)||previousClose<=0||currentClose<=0||currentVolume<0)return null;
  return {ticker,previousDate,currentDate,previousClose,currentClose,currentVolume};
}

export async function readBreadthB1R3StoredHistoricalScoreR4(){return throwMarketParquetRemoved();}

export async function materializeBreadthB1R3StoredHistoricalScoresR4(){return throwMarketParquetRemoved();}
