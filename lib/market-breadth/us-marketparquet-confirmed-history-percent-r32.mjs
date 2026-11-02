/**
 * R32 percent-only PUBLIC_FINAL history reader for MarketParquet US breadth R2.
 *
 * The independently verified PC ledger retains internal counts and SHA audits.
 * Only published percentages reach visitors. This module never publishes,
 * computes prices, touches the legacy R1 key, or writes to D1/Core.
 */
import {latestCompletedSession} from '../market-score/breadth-b1-r3-calendar.mjs';
import {previousMarketSession} from '../market-score/breadth-b1-r6-marketparquet-provider.mjs';
import {US_FULL_MARKET_SOURCE,US_FULL_MARKET_METHOD,US_FULL_MARKET_PRICE_MODE,
  US_FULL_MARKET_UNIVERSE} from './us-marketparquet-confirmed-public-r2.mjs';

export const US_FULL_MARKET_HISTORY_PERCENT_KEY=
  'public:market-breadth-confirmed-r2:usa:history-percent:v1';
export const US_FULL_MARKET_PERCENT_HISTORY_KEY=US_FULL_MARKET_HISTORY_PERCENT_KEY;

const RECORD_FIELDS=['finalizedAt','firstDate','lastDate','market','methodologyVersion',
  'phase','points','priceMode','publicationStage','source','status','universe','version'].join(',');
const POINT_FIELDS='date,fallingPct,risingPct,unchangedPct';
const isExactFields=(record,fields)=>!!record&&typeof record==='object'
  &&!Array.isArray(record)&&Object.keys(record).sort().join(',')===fields;
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)
  &&Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  &&new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;
const validInstant=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))
  &&new Date(value).toISOString()===value;
const validPct=value=>typeof value==='number'&&Number.isFinite(value)
  &&value>=0&&value<=100;

/**
 * Only 249 or 250 authentic adjacent comparison dates are accepted. A missing
 * earliest baseline day is not fabricated or counted as a 250th observation.
 * The per-day shape is EXACTLY four fields and no stock counts or raw prices.
 */
export function validFullMarketPercentHistoryRecord(record){
 if(!isExactFields(record,RECORD_FIELDS)
   ||record.version!==2||record.market!=='usa'||record.phase!=='CONFIRMED'
   ||record.status!=='READY'||record.publicationStage!=='PUBLIC_FINAL'
   ||record.source!==US_FULL_MARKET_SOURCE
   ||record.universe!==US_FULL_MARKET_UNIVERSE
   ||record.methodologyVersion!==US_FULL_MARKET_METHOD
   ||record.priceMode!==US_FULL_MARKET_PRICE_MODE
   ||!validInstant(record.finalizedAt)
   ||!validDate(record.firstDate)||!validDate(record.lastDate)
   ||!Array.isArray(record.points)||![249,250].includes(record.points.length)
   ||record.points[0]?.date!==record.firstDate
   ||record.points.at(-1)?.date!==record.lastDate)return false;

 for(let i=0;i<record.points.length;i++){
  const point=record.points[i];
  if(!isExactFields(point,POINT_FIELDS)||!validDate(point.date)
    ||!validPct(point.risingPct)||!validPct(point.fallingPct)
    ||!validPct(point.unchangedPct)
    ||Math.abs(point.risingPct+point.fallingPct+point.unchangedPct-100)>0.15)
   return false;
  if(i>0&&previousMarketSession(point.date)!==record.points[i-1].date)
   return false;
 }
 return true;
}

/** Read a separately approved FINAL snapshot; never fall back to R1 or staging. */
export async function readFullMarketPercentHistory(readSnapshot,{now=Date.now()}={}){
 const fail=reason=>({ok:false,httpStatus:503,reason});
 if(typeof readSnapshot!=='function'||!Number.isFinite(now)||now<=0)
  return fail('FULL_MARKET_PERCENT_HISTORY_READER_INVALID');
 let row;
 try{row=await readSnapshot(US_FULL_MARKET_HISTORY_PERCENT_KEY);}
 catch{return fail('FULL_MARKET_PERCENT_HISTORY_STORAGE_UNAVAILABLE');}
 if(!row)return fail('FULL_MARKET_PERCENT_HISTORY_NOT_PUBLISHED');
 let record;
 try{record=JSON.parse(row.body);}catch{return fail('FULL_MARKET_PERCENT_HISTORY_INVALID_JSON');}
 if(!validFullMarketPercentHistoryRecord(record))
  return fail('FULL_MARKET_PERCENT_HISTORY_NOT_VERIFIED_FINAL');
 const stamp=Number(row.stored_at);
 if(!Number.isSafeInteger(stamp)||stamp<=0||stamp>now+60_000
   ||Date.parse(record.finalizedAt)>now+60_000)
  return fail('FULL_MARKET_PERCENT_HISTORY_INVALID_PUBLICATION_TIME');
 if(record.lastDate>latestCompletedSession(new Date(now)))
  return fail('FULL_MARKET_PERCENT_HISTORY_FUTURE_SESSION');
 return {ok:true,httpStatus:200,body:record,
  headers:{'Cache-Control':'no-store',
   'x-data-snapshot-at':new Date(stamp).toISOString()}};
}
