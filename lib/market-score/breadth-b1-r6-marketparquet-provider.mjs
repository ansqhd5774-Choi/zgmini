// MarketParquet implementation removed. Historical imports fail explicitly.
import {isMarketSession} from './breadth-b1-r3-calendar.mjs';
import {throwMarketParquetRemoved} from '../marketparquet-retirement.mjs';
export const B1_R6_MARKETPARQUET_PROVIDER='REMOVED_MARKETPARQUET';
const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s??'');
const previousCalendarDate=s=>new Date(Date.parse(s+'T00:00:00Z')-86400000).toISOString().slice(0,10);
export function previousMarketSession(date){
  if(!validDate(date))return null;
  let cursor=previousCalendarDate(date);
  for(let guard=0;guard<10;guard++){
    if(isMarketSession(cursor))return cursor;
    cursor=previousCalendarDate(cursor);
  }
  return null;
}
export function marketParquetTickerCandidates(){return throwMarketParquetRemoved();}
export function buildMarketParquetPairs(){return throwMarketParquetRemoved();}
export async function fetchMarketParquetLatestPairs(){return throwMarketParquetRemoved();}
export async function fetchMarketParquetDateSnapshot(){return throwMarketParquetRemoved();}
