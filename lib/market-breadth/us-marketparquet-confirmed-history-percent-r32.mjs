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
export function validFullMarketPercentHistoryRecord(){return false;}

/** Read a separately approved FINAL snapshot; never fall back to R1 or staging. */
export async function readFullMarketPercentHistory(){return {ok:false,httpStatus:503,reason:'PROVIDER_REMOVED_MARKETPARQUET_PUBLICATION_DENIED'};}
