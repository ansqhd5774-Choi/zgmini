/** Full-market US EOD breadth arithmetic. Pure/stored-input-only and NEVER a publisher. */
import {calculateMarketBreadthCounts} from './compute.mjs';
import {previousMarketSession} from '../market-score/breadth-b1-r6-marketparquet-provider.mjs';

export const FULL_MARKET_CONFIRMED_CANDIDATE='MARKETPARQUET_STOCK_DAILY_FULL_MARKET_R2';
const dateOf=value=>{
  if(value instanceof Date)return Number.isFinite(value.valueOf())?value.toISOString().slice(0,10):null;
  if(Number.isInteger(value)&&value>10000&&value<100000)return new Date(value*86400000).toISOString().slice(0,10);
  return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}/.test(value)?value.slice(0,10):null;
};

function normalizeStockDaily(rows,expectedDate){
  const stocks=new Map();
  let discardedNonStocks=0,delisted=0,invalid=0,sourceDuplicates=0,otherDates=0;
  for(const row of rows){
    if(dateOf(row?.date??row?.timestamp)!==expectedDate){otherDates++;continue;}
    if(row?.asset_type!=null&&String(row.asset_type).toLowerCase()!=='stock'){
      discardedNonStocks++;continue;
    }
    const symbol=typeof row?.symbol==='string'?row.symbol.trim():'';
    if(!symbol){invalid++;continue;}
    if(symbol.endsWith('-DELISTED')){delisted++;continue;}
    if(stocks.has(symbol)){sourceDuplicates++;continue;}
    // Keep invalid-price securities in the expected denominator. Never count as unchanged.
    const close=row.close==null?NaN:Number(row.close);
    const volume=row.volume==null?NaN:Number(row.volume);
    stocks.set(symbol,{close,valid:Number.isFinite(close)&&close>0&&Number.isFinite(volume)&&volume>=0});
    if(!stocks.get(symbol).valid)invalid++;
  }
  return {stocks,discardedNonStocks,delisted,invalid,sourceDuplicates,otherDates};
}

/**
 * The caller must independently prove BOTH complete stored daily files, their
 * dates, origin and same split-adjusted price basis before publishing anything.
 * This returns a candidate only; no 503/SP500 filter, DB write or D1 key.
 */
export function calculateFullMarketConfirmedCandidate({observationDate,previousDate,currentRows,previousRows}={}){
  const common={revision:FULL_MARKET_CONFIRMED_CANDIDATE,phase:'CONFIRMED',
    provider:'MarketParquet',feed:'stock_daily',priceMode:'SPLIT_ADJUSTED_DIVIDEND_UNADJUSTED',
    observationDate,previousDate,publicationAllowed:false};
  if(!Array.isArray(currentRows)||!Array.isArray(previousRows))
    return {...common,status:'SOURCE_ROWS_MISSING'};
  if(previousMarketSession(observationDate)!==previousDate)
    return {...common,status:'NON_ADJACENT_TRADING_SESSIONS'};
  if(currentRows.length===0||previousRows.length===0)return {...common,status:'SOURCE_ROWS_EMPTY'};
  const current=normalizeStockDaily(currentRows,observationDate);
  const previous=normalizeStockDaily(previousRows,previousDate);
  const diagnostics={currentSourceRows:currentRows.length,previousSourceRows:previousRows.length,
    currentActiveSymbols:current.stocks.size,previousActiveSymbols:previous.stocks.size,
    currentDelisted:current.delisted,previousDelisted:previous.delisted,
    currentNonStocks:current.discardedNonStocks,previousNonStocks:previous.discardedNonStocks,
    currentInvalidPrices:current.invalid,previousInvalidPrices:previous.invalid,
    currentDuplicates:current.sourceDuplicates,previousDuplicates:previous.sourceDuplicates,
    currentOtherDates:current.otherDates,previousOtherDates:previous.otherDates};
  if(current.sourceDuplicates||previous.sourceDuplicates)return {...common,status:'DUPLICATE_SOURCE_SYMBOL',diagnostics};
  if(current.otherDates||previous.otherDates)return {...common,status:'WRONG_DATE_IN_SOURCE',diagnostics};
  if(current.stocks.size===0)return {...common,status:'NO_ACTIVE_STOCKS',diagnostics};
  const rows=[];
  for(const [securityId,cur] of current.stocks){
    const prior=previous.stocks.get(securityId);
    rows.push({securityId,change:cur.valid&&prior?.valid?cur.close-prior.close:null});
  }
  // Existing 98% source coverage gate is CONFIRMED-only, never provisional.
  const result=calculateMarketBreadthCounts({market:'usa',observationDate,
    expectedCount:current.stocks.size,rows,minimumCoverage:.98});
  if(!result)return {...common,status:'COUNT_INVALID',diagnostics};
  return {...common,status:result.status==='READY'?'CALCULATED_UNPUBLISHED':'INSUFFICIENT_CONFIRMED_COVERAGE',
    expectedCount:result.expectedCount,eligibleCount:result.eligibleCount,
    missingCount:result.expectedCount-result.eligibleCount,coverage:result.coverage,
    counts:result.counts,methodologyVersion:result.methodologyVersion,diagnostics};
}
