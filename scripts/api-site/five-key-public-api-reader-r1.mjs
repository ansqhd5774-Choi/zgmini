// W05 owner-supplied HTTP reader. Public GET only; no credentials, D1,
// provider calls, SQL, filesystem or automatic scheduling. The protected PC
// process keeps returned bodies in memory for collectFiveKeyInPlace().
export const W05_PUBLIC_API_URLS=Object.freeze({
 inflation19:'https://zgmini.kr/api/inflation-causal-inputs',
 inflation7:'https://zgmini.kr/api/inflation-candidate-inputs',
 calendar:'https://zgmini.kr/api/release-calendar',
 theme:'https://zgmini.kr/api/theme-fear-greed',
 employment:'https://zgmini.kr/api/employment-r6/observations',
});
export const W05_PUBLIC_MAX_BODY_BYTES=1_800_000;
const REQUEST_TIMEOUT_MS=12_000;
const jsonType=value=>/^application\/json(?:\s*;|$)/i.test(value??'');
const assertSlot=slot=>{
 if(!Object.hasOwn(W05_PUBLIC_API_URLS,slot))throw Error('W05_PUBLIC_SLOT_NOT_ALLOWED');
 return W05_PUBLIC_API_URLS[slot];
};
const reject=code=>{throw Error(code)};

async function readBoundedJson(response){
 const contentLength=response.headers?.get?.('content-length');
 if(contentLength!==null&&contentLength!==undefined){
  if(!/^(0|[1-9][0-9]*)$/.test(contentLength)||
     Number(contentLength)>W05_PUBLIC_MAX_BODY_BYTES)
   reject('W05_PUBLIC_RESPONSE_SIZE_DENIED');
 }
 const stream=response.body;
 if(!stream||typeof stream.getReader!=='function')
  reject('W05_PUBLIC_RESPONSE_STREAM_MISSING');
 const reader=stream.getReader(),chunks=[];
 let size=0;
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   if(!(value instanceof Uint8Array))
    reject('W05_PUBLIC_RESPONSE_BYTES_INVALID');
   size+=value.byteLength;
   if(size>W05_PUBLIC_MAX_BODY_BYTES){
    await reader.cancel().catch(()=>{});
    reject('W05_PUBLIC_RESPONSE_SIZE_DENIED');
   }
   chunks.push(value);
  }
 }finally{try{reader.releaseLock();}catch{}}
 const bytes=new Uint8Array(size);
 let cursor=0;
 for(const chunk of chunks){bytes.set(chunk,cursor);cursor+=chunk.byteLength;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
 catch{reject('W05_PUBLIC_JSON_INVALID');}
}

// Only the 5 literal URL destinations above are permitted; no caller URL,
// query, credential, header injection or redirected fetch is accepted.
// Response bodies are not logged or returned as execution receipts.
export async function readW05PublicApi(slot,{fetcher=fetch}={}){
 const url=assertSlot(slot);
 if(typeof fetcher!=='function')reject('W05_PUBLIC_FETCHER_REQUIRED');
 let response;
 try{response=await fetcher(url,{
  method:'GET',redirect:'error',cache:'no-store',
  headers:{accept:'application/json','cache-control':'no-cache'},
  signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS),
 });}
 catch{reject('W05_PUBLIC_NETWORK_UNVERIFIED');}
 if(!Number.isInteger(response?.status)||response.status<100||response.status>599||
    typeof response.headers?.get!=='function')
  reject('W05_PUBLIC_HTTP_RESPONSE_INVALID');
 const statusCode=response.status;
 const contentType=response.headers.get('content-type');
 if(!jsonType(contentType)){
  if(statusCode===200)reject('W05_PUBLIC_CONTENT_TYPE_INVALID');
  return {statusCode,body:null,headers:{}};
 }
 const body=await readBoundedJson(response);
 if(body===null||typeof body!=='object'||Array.isArray(body))
  reject('W05_PUBLIC_JSON_SHAPE_INVALID');
 // The Worker sends this marker only on the paid-theme Reader response.
 const marker=slot==='theme'?response.headers.get('x-zgmini-theme-source'):null;
 return {statusCode,body,headers:slot==='theme'&&typeof marker==='string'&&
  marker.length<=80?{'x-zgmini-theme-source':marker}:{}};
}
