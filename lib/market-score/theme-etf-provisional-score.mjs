// R158: OFFLINE extension of the approved R135 T/R/V axes and R144 40:20:40,
// pair 50:50. Caller supplies existing PC joined-price history AND up to two
// independently obtained, licensed, reconciled close-price observations.
// No provider calls, no synthetic prices, no public DB writes.
export const R158_SYMBOLS=Object.freeze(['SPY','BOTZ','ROBO','SKYY','CLOU','DRIV','NLR','URA','ITA','SHLD','FINX','ARKF','CIBR','BUG']);
export const R158_PAIRS=Object.freeze([
 ['로봇·자동화',['BOTZ','ROBO']],['클라우드·SaaS',['SKYY','CLOU']],['자율주행',['DRIV','BOTZ']],
 ['원전·SMR',['NLR','URA']],['방산',['ITA','SHLD']],['핀테크',['FINX','ARKF']],['사이버보안',['CIBR','BUG']]
]);
export const R158_WEIGHTS=Object.freeze({trend:.4,relativeStrength:.2,volatility:.4});
const specs=Object.freeze({
 trend:[['m125',.5,false],['r60',.3,false],['r20',.2,false]],
 relativeStrength:[['rs20',.25,false],['rs60',.45,false],['rs125',.3,false]],
 volatility:[['rv20',.4,true],['dsv20',.35,true],['dd63',.25,false]]
});
const valid=n=>typeof n==='number'&&Number.isFinite(n);
const validPrice=n=>valid(n)&&n>0;
const score=n=>valid(n)&&n>=0&&n<=100;
const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x+'T00:00:00Z'));
const mean=a=>a.reduce((v,x)=>v+x,0)/a.length;
const std=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)));};
const fail=s=>{throw Error('THEME_R158_'+s)};
const round=x=>Number(x.toFixed(5));

/** Identical metrics and 252-observation per-metric midrank to R135. */
export function r158ScorePrices(own,spy){
 if(!Array.isArray(own)||!Array.isArray(spy)||own.length!==spy.length||own.length<500)fail('HISTORY_TOO_SHORT');
 const raw=Object.fromEntries(Object.keys(specs).map(k=>[k,Array(own.length).fill(null)]));
 for(let i=0;i<own.length;i++){
  if(i>=124&&own.slice(i-124,i+1).every(validPrice)){
   const c=own[i];raw.trend[i]={m125:c/mean(own.slice(i-124,i+1))-1,r60:c/own[i-60]-1,r20:c/own[i-20]-1};
  }
  if(i>=125&&own.slice(i-125,i+1).every(validPrice)&&spy.slice(i-125,i+1).every(validPrice)){
   const rel=j=>(own[i]/own[i-j]-1)-(spy[i]/spy[i-j]-1);
   raw.relativeStrength[i]={rs20:rel(20),rs60:rel(60),rs125:rel(125)};
  }
  if(i>=62&&own.slice(i-62,i+1).every(validPrice)){
   const returns=[];for(let j=i-19;j<=i;j++)returns.push(own[j]/own[j-1]-1);
   const high=Math.max(...own.slice(i-62,i+1));
   raw.volatility[i]={rv20:std(returns)*Math.sqrt(252),
    dsv20:Math.sqrt(252*mean(returns.map(x=>Math.min(x,0)**2))),dd63:own[i]/high-1};
  }
 }
 const indices=[own.length-1,own.length-2,own.length-3].filter(i=>i>=0),result={};
 for(const i of indices){
  const axes={};
  for(const [axis,spec] of Object.entries(specs)){
   const part=raw[axis].slice(i-251,i+1);
   if(part.length!==252||part.some(row=>!row||spec.some(([k])=>!valid(row[k]))))fail('INCOMPLETE_NORMALIZATION_'+axis);
   let sum=0;
   for(const [key,weight,invert] of spec){
    const current=raw[axis][i][key];
    const below=part.filter(row=>row[key]<current).length,equal=part.filter(row=>row[key]===current).length;
    const midrank=100*(below+.5*equal)/252;
    sum+=weight*(invert?100-midrank:midrank);
   }
   axes[axis]=sum;
  }
  result[i]=axes.trend*.4+axes.relativeStrength*.2+axes.volatility*.4;
  if(!score(result[i]))fail('BAD_SCORE');
 }
 return result;
}
/** joined: map of 14 symbol -> {days:[{date,proxyClose}]}; newPrices: 1-2 rows {date,prices:{symbol:close}} */
export function buildPrivateThemeTwoDayCandidate({joined,confirmed,newPrices,sourceName,sourceStoredAt,asOf}={}){
 if(!confirmed||!Array.isArray(confirmed.themes)||confirmed.themes.length!==7||!date(confirmed.observationDate))fail('CONFIRMED_REQUIRED');
 if(!Array.isArray(newPrices)||newPrices.length<1||newPrices.length>2)fail('TWO_SESSIONS_MAX');
 if(typeof sourceName!=='string'||!sourceName.trim()||!Number.isFinite(Date.parse(sourceStoredAt))||!Number.isFinite(Date.parse(asOf)))fail('SOURCE_PROVENANCE_REQUIRED');
 if(!joined||typeof joined!=='object')fail('LOCAL_PRICE_HISTORY_REQUIRED');
 const baseline=new Map(),allDates=[],prices={};
 for(const ticker of R158_SYMBOLS){
  const doc=joined[ticker],days=doc?.days;
  if(!Array.isArray(days)||days.length<701)fail('PRICE_WARMUP_MISSING_'+ticker);
  const dates=days.map(row=>row.date),values=days.map(row=>row.proxyClose);
  if(dates.some((d,i)=>!date(d)||(i>0&&d<=dates[i-1]))||dates.at(-1)!==confirmed.observationDate)fail('PRICE_DATES_'+ticker);
  if(!values.slice(-502).every(validPrice))fail('PRICE_INVALID_'+ticker);
  if(!allDates.length)allDates.push(...dates);
  if(allDates.length!==dates.length||dates.some((d,i)=>allDates[i]!==d))fail('PRICE_DATE_ALIGNMENT_'+ticker);
  baseline.set(ticker,values);prices[ticker]=[...values];
 }
 let previous=confirmed.observationDate;
 for(const row of newPrices){
  if(!date(row?.date)||row.date<=previous||!row.prices||Object.keys(row.prices).length!==14)fail('NEW_PRICE_DATE_OR_COVERAGE');
  for(const ticker of R158_SYMBOLS){
   if(!validPrice(row.prices[ticker]))fail('NEW_PRICE_MISSING_'+ticker);
   prices[ticker].push(row.prices[ticker]);
  }
  previous=row.date;
 }
 const axisScores={};for(const ticker of R158_SYMBOLS.slice(1))axisScores[ticker]=r158ScorePrices(prices[ticker],prices.SPY);
 // Recompute the unchanged previous confirmed point from local prices.
 for(const [theme,tickers] of R158_PAIRS){
  const row=confirmed.themes.find(t=>t.theme===theme);
  if(!row||row.etfs?.join(',')!==tickers.join(',')||!score(row.score??row.latestScore))fail('CONFIRMED_PAIR_'+theme);
  const oldIndex=allDates.length-1;
  const oldAvg=(axisScores[tickers[0]][oldIndex]+axisScores[tickers[1]][oldIndex])/2;
  if(!valid(oldAvg)||Math.abs(oldAvg-(row.score??row.latestScore))>0.000011)fail('CONFIRMED_RECALC_DRIFT_'+theme);
 }
 const points=newPrices.map((row,k)=>{
  const i=allDates.length+k;
  return {date:row.date,scores:Object.fromEntries(R158_PAIRS.map(([theme,tickers])=>[theme,round((axisScores[tickers[0]][i]+axisScores[tickers[1]][i])/2)]))};
 });
 return {status:'PRIVATE_RESEARCH_READY_NOT_PUBLIC',phase:'PROVISIONAL',methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',
  individualStocksUsed:0,publicationAuthorized:false,upstreamCommercialRightsVerified:false,derivedLicenseVerified:false,
  sourcePriceReconciled:false,sourceName,sourceVersion:'R158_OFFLINE_TWO_DAY_RESEARCH',asOf,sourceStoredAt,
  confirmedObservationDate:confirmed.observationDate,observationDate:previous,
  coverage:{etfs:13,benchmark:'SPY',complete:true},points};
}
