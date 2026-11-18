// User-directed manual GMH-only historical 1h page retrieval.
// Fetches ONLY after explicit call. No writes, retries, schedules, D1,
// credentials, publication or automatic calculation. Keep provider responses
// as given; downstream score qualification is a separate stage.
import {createHash} from 'node:crypto';
import {GMH_SEVEN_SYMBOLS} from './theme-gmh-seven-private-bridge.mjs';
const SHA=x=>createHash('sha256').update(x).digest('hex');
const DATE=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\d$/.test(x)&&
 new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const fail=code=>{throw Object.assign(Error('GMH_BACKFILL_'+code),{
 code:'GMH_BACKFILL_'+code});};
const need=(ok,code)=>{if(!ok)fail(code);};
const MAX_PAGES=12;
const LIMIT=5000;
const MAX_PAGE_BYTES=10_000_000;
const HOST='https://getmarkethistory.com';
export const GMH_BACKFILL_PROVIDER='GETMARKETHISTORY_STOCKS_US_1H';
export const GMH_BACKFILL_METHOD='MANUAL_SAVED_RAW_ONLY';

function buildUrl(symbol,start,end,cursor){
 need(GMH_SEVEN_SYMBOLS.includes(symbol)&&DATE(start)&&DATE(end)&&start<=end,
  'REQUEST_SCOPE_STOP');
 const url=new URL('/api/v1/bars/stocks/us/'+symbol+'/1h',HOST);
 url.searchParams.set('start',start);
 url.searchParams.set('end',end);
 url.searchParams.set('limit',String(LIMIT));
 if(cursor)url.searchParams.set('cursor',cursor);
 return url.toString();
}
function sanitizedDataThrough(header){
 return typeof header==='string'&&header.length<=40&&
  !Number.isNaN(Date.parse(header))?new Date(header).toISOString():null;
}
export async function retrieveGmhHourlyPages({
 symbol,start,end,fetcher=fetch,maxPages=MAX_PAGES
}={}){
 need(Number.isInteger(maxPages)&&maxPages>=1&&maxPages<=MAX_PAGES,
  'PAGE_BOUND_STOP');
 need(GMH_SEVEN_SYMBOLS.includes(symbol)&&DATE(start)&&DATE(end)&&start<=end,
  'REQUEST_SCOPE_STOP');
 let cursor=null,attempts=0,seen=new Set(),lastDataThrough=null;
 const pages=[];
 for(let index=0;index<maxPages;index++){
  const url=buildUrl(symbol,start,end,cursor);
  let response;
  attempts++;
  try{response=await fetcher(url,{method:'GET',redirect:'error'});}
  catch{
   return {status:'PROVIDER_REQUEST_FAILED',symbol,attempts,pages,
    providerCalls:attempts,complete:false,source:'GETMARKETHISTORY_STOCKS_US_1H',
    dataThrough:lastDataThrough,rawUnmodified:true,d1Writes:0,pcWrites:0};
  }
  if(!response||response.status!==200){
   return {status:'PROVIDER_HTTP_RESPONSE',symbol,
    providerHttpStatus:Number.isInteger(response?.status)?response.status:null,
    attempts,pages,providerCalls:attempts,complete:false,
    source:'GETMARKETHISTORY_STOCKS_US_1H',dataThrough:lastDataThrough,
    rawUnmodified:true,d1Writes:0,pcWrites:0};
  }
  let bytes;
  try{bytes=Buffer.from(await response.arrayBuffer());}catch{
   return {status:'PROVIDER_BODY_UNREADABLE',symbol,attempts,pages,
    providerCalls:attempts,complete:false,source:'GETMARKETHISTORY_STOCKS_US_1H',
    dataThrough:lastDataThrough,rawUnmodified:true,d1Writes:0,pcWrites:0};
  }
  need(bytes.length<=MAX_PAGE_BYTES,'RESPONSE_RESOURCE_BOUND_STOP');
  const next=response.headers?.get('x-next-cursor')??null;
  lastDataThrough=sanitizedDataThrough(
   response.headers?.get('x-data-through'))??lastDataThrough;
  pages.push({sha256:SHA(bytes),bytes,
   contentLength:bytes.length,sequence:index+1});
  if(next===null||next===''){
   return {status:'PROVIDER_PAGES_COMPLETE',symbol,attempts,pages,
    providerCalls:attempts,complete:true,source:'GETMARKETHISTORY_STOCKS_US_1H',
    dataThrough:lastDataThrough,rawUnmodified:true,d1Writes:0,pcWrites:0};
  }
  need(typeof next==='string'&&next.length<=4096&&!seen.has(next),
   'CURSOR_INVALID_OR_CYCLE_STOP');
  seen.add(next);cursor=next;
 }
 return {status:'PROVIDER_HAS_MORE_PAGES',symbol,attempts,pages,
  providerCalls:attempts,complete:false,source:'GETMARKETHISTORY_STOCKS_US_1H',
  dataThrough:lastDataThrough,rawUnmodified:true,d1Writes:0,pcWrites:0};
}
export function composeGmhSavedScoreSource(result){
 need(result?.status==='PROVIDER_PAGES_COMPLETE'&&result.complete===true&&
  GMH_SEVEN_SYMBOLS.includes(result.symbol)&&
  Array.isArray(result.pages)&&result.pages.length>0&&
  result.pages.length<=MAX_PAGES,'PAGES_NOT_COMPLETE');
 const all=result.pages.map((page,index)=>{
  need(page?.sequence===index+1&&Buffer.isBuffer(page.bytes)&&
   page.bytes.length<=MAX_PAGE_BYTES&&page.sha256===SHA(page.bytes),
   'PAGE_BYTES_OR_SHA_DRIFT');
  return page.bytes;
 });
 // Each provider JSONL response remains independently hashed above.
 // Trim only transport line separators to form a valid combined JSONL body;
 // supplier observations are not filtered or normalized by the collector.
 const bytes=Buffer.concat(all.flatMap((b,i)=>i===0?[b]:[
  b.length&&all[i-1].at(-1)!==10?Buffer.from('\n'):Buffer.alloc(0),b]));
 return {symbol:result.symbol,provider:GMH_BACKFILL_PROVIDER,
  format:'jsonl',bytes,sha256:SHA(bytes),
  complete:true,sourcePages:all.length,providerCalls:result.providerCalls,
  dataThrough:result.dataThrough,rawPagesSha256:result.pages.map(p=>p.sha256),
  d1Writes:0,pcWrites:0};
}
export async function retrieveGmhSevenManually({
 start,end,fetcher=fetch,maxPages=MAX_PAGES
}={}){
 need(DATE(start)&&DATE(end)&&start<=end,'REQUEST_SCOPE_STOP');
 const results=[];
 for(const symbol of GMH_SEVEN_SYMBOLS){
  const r=await retrieveGmhHourlyPages({symbol,start,end,fetcher,maxPages});
  results.push(r);
  // Preserve every prior supplier response even if one symbol fails.
  // Do not fabricate all-14 success, and never auto retry.
  if(!r.complete)return {status:'PARTIAL_SOURCE_NOT_READY',
   results,requested:GMH_SEVEN_SYMBOLS.length,
   fetched:results.length,
   providerCalls:results.reduce((n,x)=>n+x.providerCalls,0),
   d1Writes:0,pcWrites:0,schedulerChanges:0};
 }
 return {status:'COMPLETE_PRIVATE_RAW_PAGES',results,
  requested:14,fetched:14,
  providerCalls:results.reduce((n,x)=>n+x.providerCalls,0),
  d1Writes:0,pcWrites:0,schedulerChanges:0};
}
