// W03 GMH-only 7-theme private bridge.
// Consumes caller-supplied, already stored GMH 1h bar bytes. No network,
// filesystem, D1, scheduler, publication, or rights mutation.
import {createHash} from 'node:crypto';
import {regularHour15Rows,scoreAll252} from './theme-optional-score-r188.mjs';
import {THEME_ETF_ONLY_PAIRS,THEME_ETF_ONLY_METHOD}
 from '../../worker/theme-etf-only-public.mjs';

export const GMH_SEVEN_REQUIRED_SESSIONS=628;
export const GMH_SEVEN_HISTORY_POINTS=252;
export const GMH_SEVEN_SYMBOLS=Object.freeze(['SPY',...new Set(
 THEME_ETF_ONLY_PAIRS.flatMap(p=>p.etfs))]);
const HASH=b=>createHash('sha256').update(b).digest('hex');
const SHA=/^[a-f0-9]{64}$/;
const fail=code=>{throw Object.assign(Error('GMH_SEVEN_'+code),{
 code:'GMH_SEVEN_'+code});};
const need=(ok,code)=>{if(!ok)fail(code);};
const date=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&
 !Number.isNaN(Date.parse(s+'T00:00:00Z'))&&
 new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const allowedFormats=new Set(['jsonl','json']);

// Preserve the original supplier-response bytes outside this pure computation.
// No local "API acceptance threshold" is imposed at collection time.
// This only checks whether *saved* bars can be used to calculate this 628-day
// approved model; missing/invalid observations never become fabricated prices.
export function parseSavedGmhBarSource({symbol,format,bytes,sha256,provider}={}){
 need(GMH_SEVEN_SYMBOLS.includes(symbol)&&
  provider==='GETMARKETHISTORY_STOCKS_US_1H'&&
  allowedFormats.has(format),'PROVENANCE_NOT_GMH_ONE_HOUR');
 need(Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=20_000_000&&
  SHA.test(sha256??'')&&HASH(bytes)===sha256,'RAW_SHA_OR_BYTES_INVALID');
 const raw=bytes.toString('utf8');
 need(!raw.includes('\0')&&Buffer.from(raw,'utf8').equals(bytes),
  'RAW_UTF8_INVALID');
 let rows;
 try{
  if(format==='jsonl')rows=raw.split(/\r?\n/).filter(Boolean).map(JSON.parse);
  else{
   const data=JSON.parse(raw);
   rows=Array.isArray(data)?data:Array.isArray(data?.rows)?data.rows:null;
  }
 }catch{fail('RAW_JSON_INVALID');}
 need(Array.isArray(rows)&&rows.length>0&&rows.length<=100_000,
  'RAW_ROWS_UNAVAILABLE');
 const saved=new Map();let skippedGaps=0;
 for(const bar of rows){
  need(bar&&typeof bar==='object'&&!Array.isArray(bar)&&
   bar.symbol===symbol&&typeof bar.timestamp==='string'&&
   !Number.isNaN(Date.parse(bar.timestamp))&&
   bar.timestamp.length<=40,'RAW_INSTRUMENT_OR_TIME_INVALID');
  if(bar.is_gap===true){skippedGaps++;continue;}
  // A supplied close must be a numeric, strictly positive traded price.
  // This is calculator eligibility, not provider payload rejection.
  need(typeof bar.close==='number'&&Number.isFinite(bar.close)&&
   bar.close>0,'RAW_PRICE_UNUSABLE_FOR_SCORE');
  const old=saved.get(bar.timestamp);
  need(old===undefined||old===bar.close,
   'RAW_CONFLICTING_DUPLICATE');
  saved.set(bar.timestamp,bar.close);
 }
 need(saved.size>0,'RAW_ALL_GAPS');
 const ordered=[...saved].sort(([a],[b])=>a.localeCompare(b))
  .map(([timestamp,close])=>({timestamp,close}));
 return Object.freeze({symbol,provider,sha256,
  inputRows:rows.length,eligibleHours:ordered.length,skippedGaps,
  rows:ordered});
}
const expectedOrder=(received)=>received.length===GMH_SEVEN_SYMBOLS.length&&
 GMH_SEVEN_SYMBOLS.every(symbol=>received.some(x=>x?.symbol===symbol))&&
 new Set(received.map(x=>x?.symbol)).size===GMH_SEVEN_SYMBOLS.length;
function selectedSessions(sources){
 // R188 needs 628 eligible hourly rows per symbol before 628 common days.
 // Keep one W03 fail-closed code for insufficient stored GMH history.
 const tables=Object.fromEntries(sources.map(s=>{
  need(s.rows.length>=GMH_SEVEN_REQUIRED_SESSIONS,
   'COMMON_628_GMH_SESSIONS_MISSING');
  return [s.symbol,new Map(regularHour15Rows(s.rows)
   .map(d=>[d.date,d.close]))];
 }));
 const common=[...tables.SPY.keys()]
  .filter(day=>date(day)&&GMH_SEVEN_SYMBOLS.every(symbol=>tables[symbol].has(day)))
  .sort();
 return {tables,common};
}
export function calculateGmhSevenPrivate252(savedSources,{asOf}={}){
 need(Array.isArray(savedSources)&&expectedOrder(savedSources),
  'EXACT_FOURTEEN_SOURCES_REQUIRED');
 need(typeof asOf==='string'&&!Number.isNaN(Date.parse(asOf)),
  'OBSERVATION_STAMP_REQUIRED');
 const sources=savedSources.map(parseSavedGmhBarSource);
 const {tables,common}=selectedSessions(sources);
 need(common.length>=GMH_SEVEN_REQUIRED_SESSIONS,
  'COMMON_628_GMH_SESSIONS_MISSING');
 const days=common.slice(-GMH_SEVEN_REQUIRED_SESSIONS);
 const latest=days.at(-1);
 const results=THEME_ETF_ONLY_PAIRS.map(pair=>{
  const individual=pair.etfs.map(sym=>{
   const own=days.map(day=>tables[sym].get(day));
   const benchmark=days.map(day=>tables.SPY.get(day));
   return scoreAll252(own,benchmark);
  });
  const history=days.slice(-GMH_SEVEN_HISTORY_POINTS).map((day,i)=>({
   date:day,score:Number(((individual[0][i]+individual[1][i])/2).toFixed(5))}));
  need(history.length===GMH_SEVEN_HISTORY_POINTS&&
   history.at(-1).date===latest,'INTERNAL_SCORE_MISMATCH');
  return {theme:pair.theme,etfs:[...pair.etfs],
   status:'RESEARCH_252_READY_NOT_PUBLIC',
   validPoints:GMH_SEVEN_HISTORY_POINTS,days:history,
   latestScore:history.at(-1).score};
 });
 const evidence=Object.freeze(Object.fromEntries(sources.map(s=>[s.symbol,
  {sha256:s.sha256,inputRows:s.inputRows,
   eligibleHours:s.eligibleHours,skippedGaps:s.skippedGaps}])));
 // This is the exact private R145/R149 research-envelope contract. The
 // existing R149 adapter may consume it, but it cannot publish or set rights.
 return Object.freeze({
  status:'PRIVATE_252_RESEARCH_READY_NO_PUBLICATION',
  version:'ZGMINI_W03_GMH_ONLY_PRIVATE_R1',
  methodologyVersion:THEME_ETF_ONLY_METHOD,
  observationDate:latest,computedAt:asOf,
  source:'GETMARKETHISTORY_STOCKS_US_1H',
  sourceOnlyGmh:true,sourceEvidence:evidence,
  commonSessions:common.length,scoreInputSessions:GMH_SEVEN_REQUIRED_SESSIONS,
  etf252Ready:13,themes252Ready:7,
  individualStocksUsed:0,scoreMethod:'ETF_ONLY_PROXY',
  weights:{trend:0.4,relativeStrength:0.2,volatility:0.4},
  pairWeight:0.5,
  // Never infer a publisher licence, adjusted close, or final D1 attestation.
  upstreamThirdPartyCommercialRightsVerified:false,
  adjustedCloseVerified:false,derivedProviderLicenseExists:false,
  publicationAuthorized:false,derivedLicenseVerified:false,
  themes:results,
  providerCalls:0,sqliteOpened:false,dbWrites:0,d1Writes:0,
  schedulerWrites:0,
 });
}
