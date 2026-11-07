// Forecast-only offline input adapter. Callers supply saved calendar day bodies.
// No historical earnings lookup, provider, DB, file, or network I/O.
import {earningsApiNewYorkDay} from './earnings-api-calendar.mjs';
const SYMBOL=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const GROUPS=['pre','after','notSupplied'];
const fail=code=>{throw Error(code)};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const validDay=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\d$/.test(s)&&
  !Number.isNaN(Date.parse(s+'T00:00:00Z'))&&
  new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const alias=s=>s==='GOOG'||s==='GOOGL'?'ALPHABET':
  /^BRK[.\-][AB]$/.test(s)?'BERKSHIRE':s;

function metric(raw,key){
  const value=raw[key]??null;
  if(value!==null&&(!finite(value)||
    (key==='revenue'||key==='revenueEstimate')&&value<0))
    fail('ER1_FORECAST_SAVED_METRIC_INVALID');
  return value;
}
function observation(raw,symbol,date){
  if(!raw||raw.symbol!==symbol||!validDay(date))
    fail('ER1_FORECAST_SAVED_ROW_INVALID');
  return {symbol,date,eps:metric(raw,'eps'),revenue:metric(raw,'revenue'),
    epsEstimate:metric(raw,'epsEstimate'),
    revenueEstimate:metric(raw,'revenueEstimate')};
}
function mergeSameInstant(prior,next,onConflict,conflicts){
  const merged={symbol:prior.symbol,date:prior.date};
  for(const key of ['eps','revenue','epsEstimate','revenueEstimate']){
    if(conflicts.has(key)){
      // Once contradicted at the same timestamp, later duplicate rows may
      // not arbitrarily restore a value for that metric.
      merged[key]=null;
    }else if(prior[key]!==null&&next[key]!==null&&prior[key]!==next[key]){
      // Same observation time, conflicting vendor rows: mark this metric
      // missing instead of inventing an ordering or making another GET.
      onConflict();conflicts.add(key);merged[key]=null;
    }else merged[key]=prior[key]??next[key];
  }
  return merged;
}

const instant=value=>{
  const timestamp=Date.parse(value);
  if(typeof value!=='string'||!Number.isFinite(timestamp)||
    !/^20\d\d-\d\d-\d\dT/.test(value))
    fail('ER1_FORECAST_SAVED_TIMESTAMP_INVALID');
  return timestamp;
};

/**
 * @param {object} input
 * @param {Array<{day: string, body: object, storedAt: string}>} input.savedDays
 *   Approved November/December saved calendar payloads; not provider GETs.
 * @param {string} input.asOf Date for selecting current/future forecasts.
 * @param {string} [input.asOfStoredAt] Optional precise UTC cutoff. Defaults to
 *   the end of asOf's UTC calendar day; no later snapshots may contribute.
 * @returns {{issuerRows: Array<object>, coverage: object, previewOnly: true}}
 */
export function forecastRowsFromSaved({savedDays,asOf,asOfStoredAt}={}){
  if(!Array.isArray(savedDays)||!savedDays.length||!validDay(asOf))
    fail('ER1_FORECAST_SAVED_INPUT_INVALID');
  const cutoff=asOfStoredAt?instant(asOfStoredAt):
    Date.parse(asOf+'T23:59:59.999Z');
  // The default is the legacy UTC as-of-day cutoff. A caller-provided instant
  // represents an actual NY observation moment, which may cross UTC midnight.
  if((asOfStoredAt?earningsApiNewYorkDay(cutoff):
    new Date(cutoff).toISOString().slice(0,10))!==asOf)
    fail('ER1_FORECAST_SAVED_CUTOFF_INVALID');
  const seenDays=new Set(),perSymbol=new Map();let calendarRows=0,
    ignoredLateSnapshots=0,sameTimeConflicts=0,
    acceptedSnapshots=0,newestStoredAt=0;
  const append=(symbol,row,storedAt)=>{
    const byDate=perSymbol.get(symbol)??new Map();
    const previous=byDate.get(row.date);
    if(!previous||storedAt>previous.storedAt)
      byDate.set(row.date,{row,storedAt,conflicts:new Set()});
    else if(storedAt===previous.storedAt)
      byDate.set(row.date,{row:mergeSameInstant(previous.row,row,()=>{
        sameTimeConflicts++;},previous.conflicts),storedAt,
        conflicts:previous.conflicts});
    perSymbol.set(symbol,byDate);
  };
  for(const saved of savedDays){
    const {day,body,storedAt}=saved??{};
    if(!validDay(day)||body?.date!==day||
      !GROUPS.every(name=>Array.isArray(body[name])))
      fail('ER1_FORECAST_SAVED_DAY_INVALID');
    const when=instant(storedAt);
    if(when>cutoff){ignoredLateSnapshots++;continue;}
    seenDays.add(day);
    acceptedSnapshots++;newestStoredAt=Math.max(newestStoredAt,when);
    for(const group of GROUPS){
      if(body[group].length>5000)fail('ER1_FORECAST_SAVED_DAY_INVALID');
      for(const raw of body[group]){
        if(!raw||!SYMBOL.test(raw.symbol)||typeof raw.name!=='string'||
          !raw.name.trim())fail('ER1_FORECAST_SAVED_ROW_INVALID');
        append(raw.symbol,observation(raw,raw.symbol,day),when);calendarRows++;
      }
    }
  }
  const candidates=new Map();
  for(const [symbol,byDate] of perSymbol){
    if(![...byDate.keys()].some(date=>date>=asOf))continue;
    const a=alias(symbol),group=candidates.get(a)??[];
    group.push(symbol);candidates.set(a,group);
  }
  const issuerRows=[];
  for(const [issuerId,tickers] of [...candidates].sort((a,b)=>a[0].localeCompare(b[0]))){
    // GOOG/GOOGL and BRK.A/BRK.B are one issuer. If both share classes exist,
    // prefer a saved EPS estimate over a sibling with only revenue.
    const choice=tickers.map(symbol=>{
      const nearest=[...perSymbol.get(symbol).values()].map(x=>x.row)
        .filter(row=>row.date>=asOf).sort((a,b)=>a.date.localeCompare(b.date))[0];
      const hasEPS=Number(finite(nearest.epsEstimate));
      return {symbol,nearestDate:nearest.date,hasEPS};
    }).sort((a,b)=>a.nearestDate.localeCompare(b.nearestDate)||
      b.hasEPS-a.hasEPS||a.symbol.localeCompare(b.symbol))[0];
    issuerRows.push({issuerId,tickers:tickers.sort(),
      earningsSymbol:choice.symbol,
      releases:[...perSymbol.get(choice.symbol).values()].map(x=>x.row)
        .sort((a,b)=>a.date.localeCompare(b.date))});
  }
  return {issuerRows,coverage:{savedDays:seenDays.size,acceptedSnapshots,
    ignoredLateSnapshots,sameTimeConflicts,calendarRows,
    futureSymbols:[...candidates.values()].reduce((n,syms)=>n+syms.length,0),
    futureIssuers:issuerRows.length,
    latestSourceStoredAt:newestStoredAt?new Date(newestStoredAt).toISOString():null},
    previewOnly:true};
}
