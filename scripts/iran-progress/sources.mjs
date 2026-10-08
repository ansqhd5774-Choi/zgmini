import {AIS_DAILY_URL,parseAisDaily} from './ais.mjs';
export async function boundedRead(url,{fetcher=fetch,maxBytes=4000000}={}){
 const response=await fetcher(url,{signal:AbortSignal.timeout(20000),headers:{Accept:'application/json, application/rss+xml, text/plain, text/html'}});
 if(!response.ok)return {status:'SOURCE_FAILED',httpStatus:response.status,retryAfter:response.headers.get('retry-after')};
 if(!response.body)throw Error('SOURCE_BODY_MISSING');
 const reader=response.body.getReader();const parts=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes)throw Error('SOURCE_PAYLOAD_LIMIT');parts.push(value);}}
 finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length;}
 return {status:'COLLECTED',httpStatus:response.status,body:new TextDecoder().decode(bytes)};
}
export async function collectSources({now=Date.now(),fetcher=fetch}={}){
 const specs={
  ais:AIS_DAILY_URL,
  marad:'https://www.maritime.dot.gov/msci-advisories',
  gdelt:'https://data.gdeltproject.org/gdeltv2/lastupdate.txt',
  ukmto:'https://www.ukmto.org/recent-incidents',
  iaea:'https://www.iaea.org/feeds/topnews',
 };
 const output={};
 for(const [id,url] of Object.entries(specs)){
  try{const r=await boundedRead(url,{fetcher});output[id]={...r,url,sourceStoredAt:now,lastAttemptAt:now};
   if(id==='ais'&&r.status==='COLLECTED'){const sanitized=parseAisDaily(r.body,{now});output[id]={...output[id],...sanitized,body:JSON.stringify(sanitized)};}
   // Discovery/feeds do not establish complete event coverage or independently verified facts.
  }catch{output[id]={status:'SOURCE_FAILED',reason:'SOURCE_READ_OR_PARSE_FAILED',url,lastAttemptAt:now};}
 }
 return output;
}
