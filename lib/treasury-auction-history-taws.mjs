// TreasuryDirect TA_WS publishes awarded marketable securities more promptly
// than FiscalData. This module does not access the network on import, persist
// raw data, or publish events. The PC collector owns those steps.
export const TREASURY_DIRECT_HISTORY_URL='https://www.treasurydirect.gov/TA_WS/securities/search';

const DAY_MS=86400000;
const MAX_RESPONSE_BYTES=6*1024*1024;
const MAX_RESULT_ROWS=2000;
const dateMs=value=>{
 if(typeof value!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(value))return null;
 const ms=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===value?ms:null;
};
const sourceDate=value=>{
 if(typeof value!=='string')return null;
 // TA_WS currently serializes civil dates at midnight without a zone.
 if(!/^20\d{2}-\d{2}-\d{2}T00:00:00(?:\.0+)?Z?$/.test(value))return null;
 const day=value.slice(0,10);
 return dateMs(day)===null?null:day;
};
const boundedWindow=(fromDate,toDate)=>{
 const from=dateMs(fromDate),to=dateMs(toDate);
 if(from===null||to===null||to<from||to-from>=365*DAY_MS)
  throw Error('TREASURY_TAWS_WINDOW_INVALID');
 return {from,to};
};
const yes=value=>value===true||/^(Y|Yes)$/i.test(value??'');
const no=value=>value===false||/^(N|No)$/i.test(value??'');
const text=value=>typeof value==='string'?value.trim():'';

export function buildTreasuryDirectSearchUrl(fromDate,toDate){
 const {to}=boundedWindow(fromDate,toDate);
 // TA_WS `startDate`/`endDate` filter *issueDate*, not auction date.
 // Include the settlement lag, then filter the actual auction day below.
 const extended=new Date(to+30*DAY_MS).toISOString().slice(0,10);
 const url=new URL(TREASURY_DIRECT_HISTORY_URL);
 url.searchParams.set('startDate',fromDate);
 url.searchParams.set('endDate',extended);
 return url.href;
}
export const treasuryDirectHistoryUrl=({fromDate,toDate}={})=>
 buildTreasuryDirectSearchUrl(fromDate,toDate);

/**
 * Convert *awarded* TA_WS rows into the minimal, already-supported FiscalData
 * raw-field contract. Returned rows are private input for the existing event
 * normalizer. Draft auctions with no bid-to-cover result are excluded.
 */
export function parseTreasuryDirectAuctionRows(raw,{fromDate,toDate}={}){
 const {from,to}=boundedWindow(fromDate,toDate);
 if(!Array.isArray(raw)||raw.length===0||raw.length>MAX_RESULT_ROWS)
  throw Error('TREASURY_TAWS_ROWS_INVALID');
 const results=[],seen=new Set();
 for(const row of raw){
  if(!row||typeof row!=='object'||Array.isArray(row))throw Error('TREASURY_TAWS_ROW_INVALID');
  const auction=sourceDate(row.competitiveAuctionCloseDate);
  if(auction===null)throw Error('TREASURY_TAWS_AUCTION_DATE_INVALID');
  const auctionMs=dateMs(auction);
  if(auctionMs<from||auctionMs>to)continue;
  const ratio=text(row.bidToCoverRatio);
  if(!ratio||ratio.toLowerCase()==='null')continue; // Announced, not awarded.
  if(!/^\d+(?:\.\d+)?$/.test(ratio))throw Error('TREASURY_TAWS_RESULT_INVALID');
  const cusip=text(row.cusip).toUpperCase();
  if(!/^[A-Z0-9]{9}$/.test(cusip))throw Error('TREASURY_TAWS_CUSIP_INVALID');
  const announced=sourceDate(row.announcementDate);
  const issued=sourceDate(row.issueDate);
  if(announced===null||issued===null||announced>auction||issued<auction)
   throw Error('TREASURY_TAWS_CHRONOLOGY_INVALID');
  const type=text(row.type).toUpperCase();
  const securityType={BILL:'Bill',BOND:'Bond',CMB:'Cash Management Bill',
   FRN:'FRN',NOTE:'Note',TIPS:'TIPS'}[type];
  if(!securityType)throw Error('TREASURY_TAWS_TYPE_INVALID');
  const reopening=text(row.reopening);
  if(!yes(reopening)&&!no(reopening))throw Error('TREASURY_TAWS_REOPENING_INVALID');
  const term=text(row.securityTerm),original=text(row.originalSecurityTerm);
  if(!term||!original)throw Error('TREASURY_TAWS_TERM_INVALID');
  const key=cusip+':'+auction;
  if(seen.has(key))throw Error('TREASURY_TAWS_DUPLICATE_AUCTION');
  seen.add(key);
  results.push({cusip,auction_date:auction,announcemt_date:announced,
   security_type:securityType,security_term:term,original_security_term:original,
   reopening:yes(reopening)?'Yes':'No',
   inflation_index_security:yes(row.inflationProtected)||type==='TIPS'?'Yes':'No',
   floating_rate:yes(row.floatingRate)||type==='FRN'?'Yes':'No'});
 }
 if(!results.length)throw Error('TREASURY_TAWS_AWARDED_DATES_MISSING');
 return results.sort((a,b)=>a.auction_date.localeCompare(b.auction_date)||a.cusip.localeCompare(b.cusip));
}

/** Collect raw official JSON only. Caller must save and re-read the exact
 * `text` through the approved PC private input store before normalization. */
export async function fetchTreasuryDirectAuctionHistory({
 fromDate,toDate,fetchImpl=fetch,countRequest=()=>{}
}={}){
 const url=treasuryDirectHistoryUrl({fromDate,toDate});
 if(typeof fetchImpl!=='function'||typeof countRequest!=='function')
  throw Error('TREASURY_TAWS_CLIENT_INVALID');
 countRequest();
 let response;
 try{
  response=await fetchImpl(url,{signal:AbortSignal.timeout(15000),redirect:'error',
   headers:{'user-agent':'ZGMINI/1.0 (+https://zgmini.kr/about/)'}});
 }catch(error){throw Error(error?.name==='TimeoutError'||error?.name==='AbortError'?
  'TREASURY_TAWS_TIMEOUT':'TREASURY_TAWS_FETCH_FAILED');}
 if(!response?.ok)throw Error('TREASURY_TAWS_HTTP_'+(response?.status??'UNKNOWN'));
 if(response.redirected||(response.url&&response.url!==url))
  throw Error('TREASURY_TAWS_REDIRECT_NOT_ALLOWED');
 if(!/^application\/json\b/i.test(response.headers?.get('content-type')??''))
  throw Error('TREASURY_TAWS_CONTENT_TYPE_INVALID');
 const length=Number(response.headers?.get('content-length'));
 if(Number.isFinite(length)&&length>MAX_RESPONSE_BYTES)
  throw Error('TREASURY_TAWS_TOO_LARGE');
 // Read a bounded stream: chunked responses may omit Content-Length entirely.
 let rawText,bytes=0;
 try{
  if(!response.body?.getReader)throw Error('TREASURY_TAWS_BODY_STREAM_MISSING');
  const reader=response.body.getReader();
  const decoder=new TextDecoder('utf-8',{fatal:true});
  const chunks=[];
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   bytes+=value.byteLength;
   if(bytes>MAX_RESPONSE_BYTES){await reader.cancel();throw Error('TREASURY_TAWS_TOO_LARGE');}
   chunks.push(decoder.decode(value,{stream:true}));
  }
  chunks.push(decoder.decode());
  rawText=chunks.join('');
 }catch(error){
  if(error?.message==='TREASURY_TAWS_TOO_LARGE')throw error;
  throw Error('TREASURY_TAWS_BODY_READ_FAILED');
 }
 if(!bytes||bytes>MAX_RESPONSE_BYTES)throw Error('TREASURY_TAWS_TOO_LARGE');
 let raw;
 try{raw=JSON.parse(rawText);}catch{throw Error('TREASURY_TAWS_JSON_INVALID');}
 const rows=parseTreasuryDirectAuctionRows(raw,{fromDate,toDate});
 return {text:rawText,bytes,rawCount:raw.length,awardedCount:rows.length,url};
}
