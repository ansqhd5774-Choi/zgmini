// Forecast-only shadow candidate. Not wired to PC publication, D1, or Reader.
// Raw per-share EPS rank is sensitive to share splits; method is explicit.
export const FORECAST_METHOD = 'ER1_ESTIMATED_EPS_SIGNED_RANK_60_40_97_DRAFT_20261106';
export const FORECAST_WEIGHTS = Object.freeze({revenuePercentile:60,epsCohortPercentile:40});
export const FORECAST_STAR3_THRESHOLD = 97;

const ID=/^[A-Z0-9_.:\-]{1,80}$/;
const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const DAY=/^20\d\d-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const fail=code=>{throw Error(code)};
const validDay=x=>typeof x==='string'&&DAY.test(x)&&
  !Number.isNaN(Date.parse(x+'T00:00:00Z'))&&
  new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;

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
  // Include the as-of-day calendar event even if its announcement time is
  // unknown: only saved estimates are ever read into this scoring method.
  const planned=all.filter(r=>r.date>=asOf).sort((a,b)=>
    a.date.localeCompare(b.date))[0]??null;
  const epsEstimate=planned?.epsEstimate??null;
  const revenueEstimate=planned?.revenueEstimate??null;
  // Do not infer a future score from past or not-yet-announced actuals.
  if(!finite(epsEstimate)||!finite(revenueEstimate))return {reason:
    'ER1_FORECAST_METRICS_MISSING'};
  // Signed raw EPS cohort ranks distinguish -1, 0, +0.01, and +10.
  return {revenue:revenueEstimate,eps:epsEstimate,basis:'ESTIMATE',
    epsBasis:'ESTIMATE',revenueBasis:'ESTIMATE',referenceDate:planned.date};
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
    actualOnly:0,estimateOnly:scored.length,mixed:0};
  if(!scored.length)return {status:'BLOCKED',reason:'ER1_FORECAST_NO_SCOREABLE',
    method:FORECAST_METHOD,asOf,coverage,threshold:FORECAST_STAR3_THRESHOLD,
    star3Count:0,rankings:[],previewOnly:true};
  const revenuePercentiles=midrankPercentiles(scored.map(x=>Math.log1p(x.revenue)));
  const epsPercentiles=midrankPercentiles(scored.map(x=>x.eps));
  const rankings=scored.map((r,i)=>({issuerId:r.issuerId,tickers:r.tickers,
    score:FORECAST_WEIGHTS.revenuePercentile*revenuePercentiles[i]+
      FORECAST_WEIGHTS.epsCohortPercentile*epsPercentiles[i],
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
    earningsRankUnit:'RAW_EPS_PER_SHARE_NOT_SPLIT_ADJUSTED',
    rankings,previewOnly:true};
}
