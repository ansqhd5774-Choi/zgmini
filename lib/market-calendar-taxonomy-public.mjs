// Published classification labels only; no issuer price, market cap, raw CSV or earnings data.
// DeltaScreener dataset licence requires visible credit and a link at point of display.
import {DELTASCREENER_AS_OF,DELTASCREENER_CREDIT_URL} from './market-calendar-deltascreener-snapshot.mjs';
import {validateDeltaR44Public} from './market-calendar-deltascreener-public.mjs';

export const MARKET_CALENDAR_TAXONOMY_KEY='market-calendar:earnings-taxonomy-2026-11-public';
const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const TEXT=/^[^<>\x00-\x1f\x7f]{1,100}$/;
const validLabel=s=>typeof s==='string'&&s===s.trim()&&TEXT.test(s);
export function validateMarketCalendarTaxonomy(body){
 if(body?.status!=='READY_TAXONOMY_PUBLIC'||body.month!=='2026-11'||
  body.sourceAsOf!==DELTASCREENER_AS_OF||body.creditUrl!==DELTASCREENER_CREDIT_URL||
  !Number.isSafeInteger(body.tickerCount)||body.tickerCount<1||body.tickerCount>10000||
  !Number.isSafeInteger(body.classifiedCount)||body.classifiedCount<1||
  body.classifiedCount>body.tickerCount||!body.rows||typeof body.rows!=='object'||
  Array.isArray(body.rows)||Object.keys(body).sort().join(',')!==
    'classifiedCount,creditUrl,month,rows,sourceAsOf,status,tickerCount')return null;
 const keys=Object.keys(body.rows);
 if(keys.length!==body.classifiedCount||
  keys.some(t=>!TICKER.test(t)||!body.rows[t]||typeof body.rows[t]!=='object'||
  Object.keys(body.rows[t]).sort().join(',')!=='industry,sector'||
  !validLabel(body.rows[t].sector)||!validLabel(body.rows[t].industry)))return null;
 return body;
}
export function makeMarketCalendarTaxonomyPublic(parsed,delta){
 const grades=validateDeltaR44Public(delta);
 if(!grades||!(parsed?.profiles instanceof Map)||parsed.sourceAsOf!==DELTASCREENER_AS_OF)
  throw Error('TAXONOMY_SOURCE_INVALID');
 const tickers=Object.keys(grades.grades).sort(),rows={};
 for(const ticker of tickers){
  if(grades.grades[ticker]===null)continue;
  const p=parsed.profiles.get(ticker);
  if(!p||!validLabel(p.sector)||!validLabel(p.industry))continue;
  rows[ticker]={sector:p.sector,industry:p.industry};
 }
 const body={status:'READY_TAXONOMY_PUBLIC',month:grades.month,
  sourceAsOf:DELTASCREENER_AS_OF,creditUrl:DELTASCREENER_CREDIT_URL,
  tickerCount:tickers.length,classifiedCount:Object.keys(rows).length,rows};
 if(!validateMarketCalendarTaxonomy(body))throw Error('TAXONOMY_PUBLIC_INVALID');
 return body;
}
export function taxonomyOptions(body){
 const taxonomy=validateMarketCalendarTaxonomy(body);
 if(!taxonomy)return null;
 const map=new Map();
 for(const {sector,industry} of Object.values(taxonomy.rows)){
  if(!map.has(sector))map.set(sector,new Set());
  map.get(sector).add(industry);
 }
 const sectors=Object.fromEntries([...map].sort(([a],[b])=>a.localeCompare(b)).map(([sector,industries])=>[sector,[...industries].sort((a,b)=>a.localeCompare(b))]));
 return {status:'READY_TAXONOMY_OPTIONS',sourceAsOf:taxonomy.sourceAsOf,
  creditUrl:taxonomy.creditUrl,sectors};
}
