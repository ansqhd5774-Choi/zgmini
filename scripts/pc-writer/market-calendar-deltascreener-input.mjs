// PC-only, one-shot pinned public CSV acquisition. No raw upload to D1/GitHub.
// Always re-read the private input before accepting a successful import.
import {createHash} from 'node:crypto';
import {parseDeltaScreenerCsv,DELTASCREENER_AS_OF,
 DELTASCREENER_UPLOAD_SHA256,DELTASCREENER_URL} from '../../lib/market-calendar-deltascreener-snapshot.mjs';

export const DELTA_PRIVATE_INPUT_KEY='market-calendar:deltascreener:2026-11-03:raw';
const hash=text=>createHash('sha256').update(Buffer.from(text,'utf8')).digest('hex');
const validate=text=>{
 if(typeof text!=='string'||hash(text)!==DELTASCREENER_UPLOAD_SHA256)
  throw Error('DELTA_UPLOAD_SHA_MISMATCH');
 const parsed=parseDeltaScreenerCsv(text);
 if(parsed.coverage.rawRows!==4894||parsed.coverage.validListedTickers<4500)
  throw Error('DELTA_UPLOAD_COVERAGE_MISMATCH');
 return parsed;
};

export async function collectPinnedDeltaOnce({store,fetchImpl,now=Date.now()}={}){
 if(!store||typeof store.readInput!=='function'||typeof store.writeInput!=='function'||
    typeof fetchImpl!=='function'||!Number.isSafeInteger(now)||now<1)
  throw Error('DELTA_COLLECT_INPUT_INVALID');
 const existing=await store.readInput(DELTA_PRIVATE_INPUT_KEY);
 if(existing){
  try{
   const p=validate(existing.body?.text);
   return {status:'CACHED_PRIVATE',providerRequests:0,rowCount:p.coverage.rawRows,
    usableTickerCount:p.coverage.validListedTickers,asOf:DELTASCREENER_AS_OF};
  }catch{return {status:'EXISTING_INPUT_INVALID_PRESERVED',providerRequests:0}}
 }
 let providerRequests=0;
 try{
  providerRequests=1;
  const res=await fetchImpl(DELTASCREENER_URL,{redirect:'error',
   signal:AbortSignal.timeout(15000),headers:{accept:'text/csv'}});
  if(!res?.ok||res.status!==200)throw Error('DELTA_HTTP_UNAVAILABLE');
  if(res.url&&res.url!==DELTASCREENER_URL)throw Error('DELTA_UNEXPECTED_REDIRECT');
  const type=res.headers?.get?.('content-type')??'';
  if(type&&!/^(?:text\/csv|application\/(?:csv|octet-stream))(?:;|$)/i.test(type))
   throw Error('DELTA_CONTENT_TYPE_INVALID');
  const bytes=Buffer.from(await res.arrayBuffer());
  if(bytes.length<1_000_000||bytes.length>1_750_000)
   throw Error('DELTA_UPLOAD_SIZE_INVALID');
  if(createHash('sha256').update(bytes).digest('hex')!==DELTASCREENER_UPLOAD_SHA256)
   throw Error('DELTA_UPLOAD_SHA_MISMATCH');
  // Raw input only; the generic publisher selects kind=output, never input.
  const text=bytes.toString('utf8'),p=validate(text);
  const body={text,asOf:DELTASCREENER_AS_OF,sha256:DELTASCREENER_UPLOAD_SHA256,
   sourceUrl:DELTASCREENER_URL};
  await store.writeInput(DELTA_PRIVATE_INPUT_KEY,body,now);
  const saved=await store.readInput(DELTA_PRIVATE_INPUT_KEY);
  if(saved?.body?.sha256!==DELTASCREENER_UPLOAD_SHA256||
     hash(saved.body.text)!==DELTASCREENER_UPLOAD_SHA256||
     saved.body.asOf!==DELTASCREENER_AS_OF)
   throw Error('DELTA_INPUT_READBACK_MISMATCH');
  return {status:'READY_PRIVATE',providerRequests,rowCount:p.coverage.rawRows,
   usableTickerCount:p.coverage.validListedTickers,asOf:DELTASCREENER_AS_OF};
 }catch(error){
  const code=String(error?.message??'');
  return {status:'FAILED_PREVIOUS_INPUT_PRESERVED',providerRequests,
   code:/^DELTA_[A-Z_]+$/.test(code)?code:'DELTA_IMPORT_UNAVAILABLE'};
 }
}
