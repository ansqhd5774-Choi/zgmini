// R44: deterministic OFFLINE/SHADOW evaluation only; no provider calls or DB changes.
export const EARNINGS_MARKETCAP_R44=Object.freeze({threeStarUsd:200_000_000_000,twoStarUsd:20_000_000_000,unit:'USD'});
const validDay=s=>typeof s==='string'&&/^20\d\d-\d\d-\d\d$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const ticker=s=>typeof s==='string'&&/^[A-Z0-9.\-]{1,12}$/.test(s);
const cap=n=>typeof n==='number'&&Number.isFinite(n)&&n>0;
export function marketCapImportanceUsd(n){return !cap(n)?null:n>=EARNINGS_MARKETCAP_R44.threeStarUsd?3:n>=EARNINGS_MARKETCAP_R44.twoStarUsd?2:1;}
export function tickerFromEarningsHtml(row){
 if(typeof row!=='string')return null;
 const match=/^<article class="mc-row mc-vendor-row" data-search="([a-z0-9.\-]{1,12}) [^"]*">/.exec(row);
 return match?.[1]?.toUpperCase()??null;
}
export function inspectEarningsDisplay(snapshot){
 if(snapshot?.status!=='READY_DISPLAY'||snapshot.mode!=='OWN_SITE_HTML_ONLY'||
  snapshot.rawVendorJsonExposed!==false||snapshot.publicJsonFeed!==false||snapshot.redistribution!==false||
  !Array.isArray(snapshot.coveredDays)||snapshot.coveredDays.length!==14||
  !snapshot.byDay||typeof snapshot.byDay!=='object'||Array.isArray(snapshot.byDay))throw Error('R44_DISPLAY_CONTRACT_INVALID');
 const days=snapshot.coveredDays;
 if(new Set(days).size!==days.length||days.some(d=>!validDay(d))||days.some((d,i)=>i>0&&d<=days[i-1]))throw Error('R44_DATES_INVALID');
 const symbols=new Set();let eventCount=0;const perDay={};
 for(const day of days){
  if(!Array.isArray(snapshot.byDay[day]))throw Error('R44_DAY_ROWS_INVALID');
  const rows=snapshot.byDay[day];perDay[day]=rows.length;
  for(const row of rows){
   const key=tickerFromEarningsHtml(row);
   if(!key||row.length>1600||!row.endsWith('</article>'))throw Error('R44_ROW_CONTRACT_INVALID');
   symbols.add(key);eventCount++;
  }
 }
 if(!Number.isSafeInteger(snapshot.recordCount)||snapshot.recordCount!==eventCount||eventCount>5000)throw Error('R44_RECORD_COUNT_MISMATCH');
 return {eventCount,uniqueTickerCount:symbols.size,symbols:[...symbols].sort(),coveredDays:[...days],perDay,checkedAt:snapshot.checkedAt??null};
}
export function inspectMarketCapCoverage(snapshot,verifiedCaps=[]){
 const inspected=inspectEarningsDisplay(snapshot);
 if(!Array.isArray(verifiedCaps))throw Error('R44_CAP_ROWS_INVALID');
 const index=new Map();const conflicts=new Set();
 for(const row of verifiedCaps){
  if(!ticker(row?.ticker))continue;
  const symbol=row.ticker;
  const ok=row.validated===true&&row.issuerLevel===true&&row.currency==='USD'&&cap(row.marketCapUsd)&&
   validDay(row.observationDate)&&typeof row.source==='string'&&row.source.trim().length>0;
  if(!ok)continue;
  const prior=index.get(symbol);
  if(prior&&(prior.marketCapUsd!==row.marketCapUsd||prior.observationDate!==row.observationDate||prior.issuerId!==row.issuerId)){
   conflicts.add(symbol);continue;
  }
  index.set(symbol,{marketCapUsd:row.marketCapUsd,observationDate:row.observationDate,issuerId:row.issuerId??symbol});
 }
 for(const symbol of conflicts)index.delete(symbol);
 // Refuse mismatching issuer-level caps across linked share classes.
 const byIssuer=new Map();
 for(const [symbol,row]of index){
  const prior=byIssuer.get(row.issuerId);
  if(prior&&(prior.marketCapUsd!==row.marketCapUsd||prior.observationDate!==row.observationDate)){
   conflicts.add(symbol);conflicts.add(prior.symbol);
  }else byIssuer.set(row.issuerId,{...row,symbol});
 }
 for(const symbol of conflicts)index.delete(symbol);
 const gradeByTicker={};const missing=[];
 for(const symbol of inspected.symbols){
  const row=index.get(symbol);
  if(!row){gradeByTicker[symbol]=null;missing.push(symbol);continue;}
  gradeByTicker[symbol]={importance:marketCapImportanceUsd(row.marketCapUsd),observationDate:row.observationDate};
 }
 return {status:missing.length?'PARTIAL':'READY_FOR_CONTRACT_REVIEW',eventCount:inspected.eventCount,
  uniqueTickerCount:inspected.uniqueTickerCount,coveredCount:inspected.uniqueTickerCount-missing.length,
  missingCount:missing.length,missingSymbols:missing,conflictingSymbols:[...conflicts].sort(),gradeByTicker};
}
