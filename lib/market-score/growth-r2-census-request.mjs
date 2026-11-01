const RETRY_HTTP=new Set([500,502,503,504]);
const NETWORK_CODES=new Set(['TIMEOUT','ETIMEDOUT','ECONNRESET','ECONNREFUSED','EAI_AGAIN','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_SOCKET']);
function temporary(error){return ['TimeoutError','AbortError'].includes(error?.name)||error?.message==='LOCAL_PROVIDER_NETWORK_ERROR'||NETWORK_CODES.has(error?.code)||NETWORK_CODES.has(error?.cause?.code);}
// Retry only this idempotent official Census GET, once. Quota/auth/invalid data never retry.
export async function requestGrowthCensusJson(fetchImpl,url,opts={}, {wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 const u=new URL(url);
 if(u.protocol!=='https:'||u.hostname!=='api.census.gov'||!['/data/timeseries/eits/m3','/data/timeseries/eits/bfs'].includes(u.pathname)||(opts.method??'GET')!=='GET')throw Error('GROWTH_CENSUS_REQUEST_NOT_ALLOWED');
 for(let attempt=1;attempt<=2;attempt++){
  let response,text;
  try{response=await fetchImpl(url,opts);if(response.ok)text=await response.text();}catch(error){
   if(error?.code==='PROVIDER_QUOTA_GUARD')throw error;
   if(attempt===1&&!opts.signal?.aborted&&temporary(error)){await wait(750);continue;}
   const failure=new Error('GROWTH_CENSUS_TRANSPORT_FAILED');failure.code='GROWTH_CENSUS_TRANSPORT_FAILED';throw failure;
  }
  if(attempt===1&&RETRY_HTTP.has(response.status)&&!opts.signal?.aborted){await response.body?.cancel().catch(()=>{});await wait(750);continue;}
  if(!response.ok){const failure=new Error('GROWTH_CENSUS_HTTP_'+response.status);failure.code='GROWTH_CENSUS_HTTP_'+response.status;throw failure;}
  let json;
  try{json=JSON.parse(text);}catch{throw Error('GROWTH_CENSUS_INVALID_JSON');}
  return {json,text,url,requestCount:attempt};
 }
 throw Error('GROWTH_CENSUS_TRANSPORT_FAILED');
}
