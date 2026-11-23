// Official FiscalData auction history is a PC-only source. This module does
// not fetch on import, store anything, or publish provider rows.
export const TREASURY_AUCTION_HISTORY_URL=
 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query';

const FIELDS='cusip,auction_date,announcemt_date,security_type,security_term,'+
 'original_security_term,reopening,inflation_index_security,floating_rate';
const PAGE_SIZE=500;
const MAX_PAGES=5;
const MAX_PAGE_BYTES=1800000;
const DAY_MS=24*60*60*1000;

const day=value=>{
 if(typeof value!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(value))return null;
 const parsed=Date.parse(value+'T00:00:00Z');
 return Number.isFinite(parsed)&&new Date(parsed).toISOString().slice(0,10)===value?parsed:null;
};
const integer=value=>{
 if(typeof value!=='number'&&typeof value!=='string')return null;
 if(typeof value==='string'&&!/^\d+$/.test(value))return null;
 const parsed=Number(value);
 return Number.isSafeInteger(parsed)&&parsed>=0?parsed:null;
};

export function treasuryAuctionHistoryUrl({fromDate,toDate,pageNumber=1}={}){
 const from=day(fromDate),to=day(toDate);
 if(from===null||to===null||to<from||to-from>=365*DAY_MS)
  throw Error('TREASURY_HISTORY_WINDOW_INVALID');
 if(!Number.isInteger(pageNumber)||pageNumber<1||pageNumber>MAX_PAGES)
  throw Error('TREASURY_HISTORY_PAGE_INVALID');
 const url=new URL(TREASURY_AUCTION_HISTORY_URL);
 url.searchParams.set('fields',FIELDS);
 url.searchParams.set('filter',`auction_date:gte:${fromDate},auction_date:lte:${toDate}`);
 url.searchParams.set('sort','auction_date,cusip');
 url.searchParams.set('page[number]',String(pageNumber));
 url.searchParams.set('page[size]',String(PAGE_SIZE));
 return url.href;
}

/**
 * Retrieve every official page for one inclusive 365-day window. The caller
 * must persist `pages[].text` in its existing PC SQLite input lane and
 * re-read it before normalizing. No implicit source refresh or publication.
 */
export async function fetchTreasuryAuctionHistoryPages({
 fromDate,toDate,fetchImpl=fetch,countRequest=()=>{}
}={}){
 treasuryAuctionHistoryUrl({fromDate,toDate});
 if(typeof fetchImpl!=='function'||typeof countRequest!=='function')
  throw Error('TREASURY_HISTORY_CLIENT_INVALID');
 let expectedTotal=null,expectedPages=null,totalBytes=0;
 const pages=[],rows=[],seen=new Set();
 for(let pageNumber=1;pageNumber<=(expectedPages??1);pageNumber++){
  const url=treasuryAuctionHistoryUrl({fromDate,toDate,pageNumber});
  countRequest();
  let response;
  try{
   response=await fetchImpl(url,{signal:AbortSignal.timeout(15000),redirect:'error',
    headers:{'user-agent':'ZGMINI/1.0 (+https://zgmini.kr/about/)'}});
  }catch(error){
   throw Error(error?.name==='TimeoutError'||error?.name==='AbortError'?
    'TREASURY_HISTORY_TIMEOUT':'TREASURY_HISTORY_FETCH_FAILED');
  }
  if(!response?.ok)throw Error('TREASURY_HISTORY_HTTP_'+(response?.status??'UNKNOWN'));
  if(response.redirected||(response.url&&response.url!==url))
   throw Error('TREASURY_HISTORY_REDIRECT_NOT_ALLOWED');
  if(!/^application\/(?:json|[^;]+\+json)\b/i.test(response.headers?.get('content-type')??''))
   throw Error('TREASURY_HISTORY_CONTENT_TYPE_INVALID');
  const length=integer(response.headers?.get('content-length'));
  if(length!==null&&length>MAX_PAGE_BYTES)throw Error('TREASURY_HISTORY_PAGE_TOO_LARGE');
  let text;
  try{text=await response.text();}catch{throw Error('TREASURY_HISTORY_BODY_READ_FAILED');}
  const bytes=new TextEncoder().encode(text).length;
  if(!bytes||bytes>MAX_PAGE_BYTES)throw Error('TREASURY_HISTORY_PAGE_TOO_LARGE');
  let parsed;
  try{parsed=JSON.parse(text);}catch{throw Error('TREASURY_HISTORY_JSON_INVALID');}
  const pageRows=parsed?.data;
  const count=integer(parsed?.meta?.count);
  const total=integer(parsed?.meta?.['total-count']);
  const pageCount=integer(parsed?.meta?.['total-pages']);
  if(!Array.isArray(pageRows)||!Number.isInteger(count)||count!==pageRows.length||
   !Number.isInteger(total)||total<1||!Number.isInteger(pageCount)||pageCount<1||
   pageCount>MAX_PAGES||pageCount!==Math.ceil(total/PAGE_SIZE))
   throw Error('TREASURY_HISTORY_PAGE_META_INVALID');
  if(expectedTotal===null){expectedTotal=total;expectedPages=pageCount;}
  if(total!==expectedTotal||pageCount!==expectedPages||
   count!==Math.min(PAGE_SIZE,total-(pageNumber-1)*PAGE_SIZE))
   throw Error('TREASURY_HISTORY_PAGE_COUNT_MISMATCH');
  for(const row of pageRows){
   if(!row||typeof row!=='object'||typeof row.cusip!=='string'||
    typeof row.auction_date!=='string')throw Error('TREASURY_HISTORY_ROW_KEY_INVALID');
   const key=row.cusip.toUpperCase()+':'+row.auction_date;
   if(seen.has(key))throw Error('TREASURY_HISTORY_PAGE_DUPLICATE');
   seen.add(key);
  }
  pages.push({number:pageNumber,text,bytes,count});
  rows.push(...pageRows);
  totalBytes+=bytes;
 }
 if(rows.length!==expectedTotal||seen.size!==expectedTotal)
  throw Error('TREASURY_HISTORY_TOTAL_MISMATCH');
 return {pages,rows,totalCount:expectedTotal,pageCount:expectedPages,totalBytes};
}
