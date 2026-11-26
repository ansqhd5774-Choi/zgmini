// DeltaScreener dated CSV, OFFLINE/STORED-DATA ONLY. No network, DB, publication or UI effects.
// The complete CSV is private PC source input; only aggregate coverage and derived
// R44 importance grades may leave the PC under the separately approved publisher.
import {marketCapImportanceUsd} from './market-calendar-r44-marketcap.mjs';

export const DELTASCREENER_AS_OF='2026-11-03';
export const DELTASCREENER_URL='https://deltascreener.com/data/us-stock-universe-2026-11-03.csv';
export const DELTASCREENER_CREDIT_URL='https://deltascreener.com/data';
export const DELTASCREENER_UPLOAD_SHA256='dc3652b804a82857cbb4ddfcb2ad96ce22b0554c93afd2d9f53384859a744984';
const REQUIRED=['ticker','name','exchange','sector','industry','country','price','mktCap'];
const US_LISTED=new Set(['NASDAQ','NYSE','AMEX','NCM','NMS','NYQ','NGM','ASE','XNYS','CBOE']);
const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const DECIMAL=/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const fail=code=>{throw Error(code)};
const usd=s=>{
 if(typeof s!=='string'||!DECIMAL.test(s.trim()))return null;
 const n=Number(s);return Number.isFinite(n)&&n>0?n:null;
};

function parseCsv(text){
 if(typeof text!=='string'||!text.length||text.length>2_500_000||text.includes('\0'))
  fail('DELTA_CSV_SIZE_INVALID');
 const src=text.charCodeAt(0)===0xFEFF?text.slice(1):text;
 const rows=[],row=[];let field='',inQuotes=false;
 for(let i=0;i<src.length;i++){
  const c=src[i];
  if(inQuotes){
   if(c==='"'&&src[i+1]==='"'){field+='"';i++}
   else if(c==='"')inQuotes=false;
   else field+=c;
  }else if(c==='"'){
   if(field!=='')fail('DELTA_CSV_QUOTING_INVALID');
   inQuotes=true;
  }else if(c===','){row.push(field);field=''}
  else if(c==='\n'){
   row.push(field);if(row.length>1||row[0]!=='')rows.push([...row]);
   row.length=0;field='';
  }else if(c==='\r'&&src[i+1]==='\n'){}
  else field+=c;
 }
 if(inQuotes)fail('DELTA_CSV_QUOTING_INVALID');
 if(field!==''||row.length){row.push(field);rows.push(row)}
 return rows;
}

export function parseDeltaScreenerCsv(csv){
 const rows=parseCsv(csv);
 const header=rows.shift()??[];
 if(new Set(header).size!==header.length||REQUIRED.some(col=>!header.includes(col)))
  fail('DELTA_CSV_HEADER_INVALID');
 const pos=Object.fromEntries(REQUIRED.map(col=>[col,header.indexOf(col)]));
 const seen=new Set(),conflicts=new Set(),profiles=new Map();
 let invalidRows=0,nonListedRows=0;
 for(const row of rows){
  if(row.length!==header.length)fail('DELTA_CSV_ROW_WIDTH_INVALID');
  const ticker=row[pos.ticker]?.trim(),cap=usd(row[pos.mktCap]?.trim());
  if(!TICKER.test(ticker??'')||!cap||
     !row[pos.name]?.trim()||!row[pos.sector]?.trim()||
     !row[pos.industry]?.trim()||!usd(row[pos.price]?.trim())){
    invalidRows++;continue;
  }
  if(seen.has(ticker)){conflicts.add(ticker);profiles.delete(ticker);continue}
  seen.add(ticker);
  if(!US_LISTED.has(row[pos.exchange]?.trim().toUpperCase())){nonListedRows++;continue}
  profiles.set(ticker,{marketCapUsd:cap,sector:row[pos.sector].trim(),
   industry:row[pos.industry].trim(),country:row[pos.country]?.trim()||null,
   observationDate:DELTASCREENER_AS_OF});
 }
 for(const ticker of conflicts)profiles.delete(ticker);
 return {profiles,coverage:{rawRows:rows.length,validListedTickers:profiles.size,
  invalidRows,nonListedRows,duplicateTickerConflicts:conflicts.size},
  source:DELTASCREENER_URL,sourceAsOf:DELTASCREENER_AS_OF,
  credit:DELTASCREENER_CREDIT_URL};
}

const issuerAlias=t=>t==='GOOG'||t==='GOOGL'?'ALPHABET':
 /^BRK[.\-][AB]$/.test(t)?'BERKSHIRE':t;

// Use the existing approved R44 thresholds, not the ER1 EPS percentile.
// Never infer an issuer-level cap when two classes disagree.
export function gradeCalendarTickersFromDelta(parsed,tickers){
 if(!(parsed?.profiles instanceof Map)||!Array.isArray(tickers)||
    tickers.some(t=>!TICKER.test(t)))fail('DELTA_CALENDAR_INPUT_INVALID');
 const unique=[...new Set(tickers)].sort(),byIssuer=new Map(),conflicts=new Set();
 for(const t of unique){
  const p=parsed.profiles.get(t);if(!p)continue;
  const issuer=issuerAlias(t),prior=byIssuer.get(issuer);
  if(prior&&prior.cap!==p.marketCapUsd){
   conflicts.add(t);for(const k of prior.tickers)conflicts.add(k);
  }else if(prior)prior.tickers.push(t);
  else byIssuer.set(issuer,{cap:p.marketCapUsd,tickers:[t]});
 }
 const grades={},counts={one:0,two:0,three:0,missing:0,conflicting:0};
 for(const t of unique){
  const p=parsed.profiles.get(t);
  if(conflicts.has(t)){grades[t]=null;counts.conflicting++}
  else if(!p){grades[t]=null;counts.missing++}
  else{
   const star=marketCapImportanceUsd(p.marketCapUsd);grades[t]=star;
   counts[star===3?'three':star===2?'two':'one']++;
  }
 }
 return {source:parsed.source,sourceAsOf:parsed.sourceAsOf,credit:parsed.credit,
  calendarTickerCount:unique.length,coveredTickerCount:counts.one+counts.two+counts.three,
  counts,grades};
}
