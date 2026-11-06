// LOCAL DESIGN PROTOTYPE ONLY. Not wired to PC, D1, or public Reader.
// The legacy actual-only ER1 method stays unchanged in production.
export const FORECAST_METHOD = 'ER1_FORECAST_FALLBACK_60_40_97_DRAFT_20261106';
export const FORECAST_WEIGHTS = Object.freeze({revenuePercentile:60,epsProfitability:40});
export const FORECAST_STAR3_THRESHOLD = 97;

const ID=/^[A-Z0-9_.:\-]{1,80}$/;
const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const DAY=/^20\d\d-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const clamp=x=>Math.max(0,Math.min(1,x));
const fail=code=>{throw Error(code)};
const validDay=x=>typeof x==='string'&&DAY.test(x)&&
  !Number.isNaN(Date.parse(x+'T00:00:00Z'))&&
  new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;

const elapsedDays=(later,earlier)=>
  (Date.parse(later+'T00:00:00Z')-Date.parse(earlier+'T00:00:00Z'))/86400000;

function midrankPercentiles(values){
  const sorted=values.map((value,index)=>({value,index})).sort((a,b)=>
    a.value-b.value||a.index-b.index);
  const percentiles=Array(values.length);
  for(let start=0;start<sorted.length;){
    let end=start+1;
    while(end<sorted.length&&sorted[start].value===sorted[end].value)end++;
    const p=(start+end)/(2*sorted.length);
    for(let i=start;i<end;i++)percentiles[sorted[i].index]=p;
    start=end;
  }
  return percentiles;
}

const issuerAlias=t=>t==='GOOG'||t==='GOOGL'?'ALPHABET':
  /^BRK[.\-][AB]$/.test(t)?'BERKSHIRE':t;

function normalizedVendorRow(raw,symbol){
  if(!raw||raw.symbol!==symbol||!validDay(raw.date))
    fail('ER1_FORECAST_RECORD_INVALID');
  const v={date:raw.date};
  for(const key of ['eps','revenue','epsEstimate','revenueEstimate']){
    const value=raw[key]===undefined?null:raw[key];
    if(value!==null&&(!finite(value)||
      (key==='revenue'||key==='revenueEstimate')&&value<0))
      fail('ER1_FORECAST_VALUE_INVALID');
    v[key]=value;
  }
  return v;
}

function sourceForIssuer(issuer,asOf){
  if(!issuer.tickers.includes(issuer.earningsSymbol)||
    !Array.isArray(issuer.releases))fail('ER1_FORECAST_SOURCE_REQUIRED');
  const grouped=new Map();
  for(const raw of issuer.releases){
    const r=normalizedVendorRow(raw,issuer.earningsSymbol);
    const prior=grouped.get(r.date);
    if(prior&&JSON.stringify(prior)!==JSON.stringify(r))
      fail('ER1_FORECAST_DUPLICATE_CONFLICT');
    grouped.set(r.date,r);
  }
  const all=[...grouped.values()];
  // The next scheduled event carries analyst forecasts. Actuals on future
  // dates are NOT usable even if a provider returns non-null numbers.
  const planned=all.filter(r=>r.date>asOf).sort((a,b)=>
    a.date.localeCompare(b.date))[0]??null;
  const past=all.filter(r=>r.date<asOf).sort((a,b)=>
    b.date.localeCompare(a.date)).slice(0,4);
  // Same-day records are excluded because there is no confirmed event time.
  let validHistory=!!past.length&&elapsedDays(asOf,past[0].date)<=140;
  for(let i=1;i<past.length;i++){
    const gap=elapsedDays(past[i-1].date,past[i].date);
    if(gap<60||gap>120)validHistory=false;
  }
  const recentPast=validHistory?past:[];
  const withActual=(key)=>recentPast.map(r=>r[key]).filter(finite);
  const pastEPS=withActual('eps'),pastRevenue=withActual('revenue');
  const actualEPS=pastEPS.length?pastEPS.reduce((sum,v)=>sum+v,0)/pastEPS.length:null;
  const actualRevenue=pastRevenue.length?
    pastRevenue.reduce((sum,v)=>sum+v,0)/pastRevenue.length:null;
  const epsEstimate=planned?.epsEstimate??null;
  const revenueEstimate=planned?.revenueEstimate??null;
  const useEPS=finite(epsEstimate)?epsEstimate:actualEPS;
  const useRevenue=finite(revenueEstimate)?revenueEstimate:actualRevenue;
  if(!finite(useEPS)||!finite(useRevenue))return {reason:
    'ER1_FORECAST_METRICS_MISSING'};
  const epsBasis=finite(epsEstimate)?'ESTIMATE':'ACTUAL';
  const revenueBasis=finite(revenueEstimate)?'ESTIMATE':'ACTUAL';
  const basis=epsBasis===revenueBasis?epsBasis:'MIXED';
  // Legacy EPS profitability structure: use the latest forecast per upcoming
  // release, or past actual mean with its original mean-absolute denominator.
  const denominator=epsBasis==='ESTIMATE'?Math.abs(useEPS):
    pastEPS.reduce((sum,v)=>sum+Math.abs(v),0)/pastEPS.length;
  const profitability=clamp(.5*(1+useEPS/Math.max(.01,denominator)));
  return {revenue:useRevenue,profitability,basis,epsBasis,revenueBasis,
    referenceDate:basis==='ACTUAL'?recentPast[0]?.date:
      planned?.date??recentPast[0]?.date??null};
}

/**
 * Draft forecast-aware ER1. The input consists exclusively of saved
 * vendor observations. There are no network, storage, or publication effects.
 * This subset-only result must not be published as a whole-market ranking.
 */
export function scoreER1ForecastIssuers(rows,{asOf}={}){
  if(!Array.isArray(rows)||!rows.length||!validDay(asOf))
    fail('ER1_FORECAST_INPUT_INVALID');
  const ids=new Set(),tickers=new Set(),aliases=new Map(),scored=[];
  const unscoreableReasons={};
  for(const row of rows){
    if(!row||!ID.test(row.issuerId)||ids.has(row.issuerId)||
      !Array.isArray(row.tickers)||!row.tickers.length)
      fail('ER1_FORECAST_ISSUER_INVALID');
    ids.add(row.issuerId);
    for(const ticker of row.tickers){
      if(!TICKER.test(ticker)||tickers.has(ticker))
        fail('ER1_FORECAST_TICKER_INVALID');
      tickers.add(ticker);
      const alias=issuerAlias(ticker);
      if(aliases.has(alias)&&aliases.get(alias)!==row.issuerId)
        fail('ER1_FORECAST_SHARE_CLASS_SPLIT');
      aliases.set(alias,row.issuerId);
    }
    const data=sourceForIssuer(row,asOf);
    if(data.reason)unscoreableReasons[data.reason]=
      (unscoreableReasons[data.reason]??0)+1;
    else scored.push({issuerId:row.issuerId,tickers:[...row.tickers].sort(),...data});
  }
  const coverage={inputSymbols:tickers.size,observedIssuers:ids.size,
    scoreableIssuers:scored.length,unscoreableReasons,
    actualOnly:scored.filter(x=>x.basis==='ACTUAL').length,
    estimateOnly:scored.filter(x=>x.basis==='ESTIMATE').length,
    mixed:scored.filter(x=>x.basis==='MIXED').length};
  if(!scored.length)return {status:'BLOCKED',reason:'ER1_FORECAST_NO_SCOREABLE',
    method:FORECAST_METHOD,asOf,coverage,threshold:FORECAST_STAR3_THRESHOLD,
    star3Count:0,rankings:[],previewOnly:true};
  const revenuePercentiles=midrankPercentiles(scored.map(x=>Math.log1p(x.revenue)));
  const rankings=scored.map((r,i)=>({issuerId:r.issuerId,tickers:r.tickers,
    score:FORECAST_WEIGHTS.revenuePercentile*revenuePercentiles[i]+
      FORECAST_WEIGHTS.epsProfitability*r.profitability,
    basis:r.basis,epsBasis:r.epsBasis,revenueBasis:r.revenueBasis,
    referenceDate:r.referenceDate})).sort((a,b)=>b.score-a.score||
      a.issuerId.localeCompare(b.issuerId));
  for(let i=0;i<rankings.length;i++){
    rankings[i].rank=i+1;
    rankings[i].importance=rankings[i].score>=FORECAST_STAR3_THRESHOLD?3:null;
  }
  return {status:'READY_SHADOW',method:FORECAST_METHOD,asOf,coverage,
    threshold:FORECAST_STAR3_THRESHOLD,
    star3Count:rankings.filter(r=>r.importance===3).length,
    rankings,previewOnly:true};
}
