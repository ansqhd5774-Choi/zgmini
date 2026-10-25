const URL='https://api.bls.gov/publicAPI/v2/timeseries/data/';
const transient=new Set([429,500,502,503,504]);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function failure(code,diagnostic){const error=Error(code);error.sourceDiagnostic=diagnostic;return error;}
// Same official series and payload; no substitute provider, score or stale re-dating.
export async function requestGrowthBls({env={},ids,startYear,endYear,fetchImpl=fetch,wait=sleep,clock=Date.now}={}){
 const key=env.BLS_API_KEY?.trim()||env.BLS_REGISTRATION_KEY?.trim();
 const body=JSON.stringify({seriesid:ids,startyear:String(startYear),endyear:String(endYear),...(key?{registrationkey:key}:{})});
 let last;
 for(let attempt=1;attempt<=2;attempt++){
  let response,text;
  const diagnostic={provider:'BLS',httpStatus:null,attempts:attempt,registered:!!key};
  try{
   response=await fetchImpl(URL,{method:'POST',headers:{'content-type':'application/json'},body,signal:AbortSignal.timeout(20000)});
   diagnostic.httpStatus=response.status;
   text=await response.text();
  }catch(error){
   // Quota policy and diagnostic request ceilings must never be retried.
   if(error?.code==='PROVIDER_QUOTA_GUARD'||/BUDGET_EXCEEDED/.test(error?.message??''))throw error;
   last=failure('GROWTH_R2_BLS_NETWORK',diagnostic);
   if(attempt===2)throw last;
   await wait(2000);continue;
  }
  if(!response.ok){
   last=failure(`GROWTH_R2_BLS_HTTP:${response.status}`,diagnostic);
   if(!transient.has(response.status)||attempt===2)throw last;
   const retry=response.headers.get('retry-after');
   const seconds=retry&&/^\d+$/.test(retry)?Number(retry):null;
   const requested=retry?(seconds===null?Date.parse(retry)-clock():seconds*1000):2000;
   // A long server cooldown is left to the normal scheduled run, not ignored.
   if(Number.isFinite(requested)&&requested>10000)throw last;
   await wait(Number.isFinite(requested)?Math.max(1000,requested):2000);continue;
  }
  let json;try{json=JSON.parse(text);}catch{throw failure('GROWTH_R2_BLS_INVALID_JSON',diagnostic);}
  if(json?.status!=='REQUEST_SUCCEEDED')throw failure('GROWTH_R2_BLS_STATUS',diagnostic);
  const series=json.Results?.series;
  if(!Array.isArray(series)||!ids.every(id=>{
   const matches=series.filter(s=>s?.seriesID===id);
   return matches.length===1&&Array.isArray(matches[0].data)&&matches[0].data.some(row=>
    /^M(0[1-9]|1[0-2])$/.test(row?.period??'')&&/^\d{4}$/.test(String(row?.year??''))
    &&typeof row?.value==='string'&&row.value.trim()!==''&&Number.isFinite(Number(row.value)));
  }))throw failure('GROWTH_R2_BLS_REQUIRED_SERIES_MISSING',diagnostic);
  return {json,text,requestCount:attempt,diagnostic};
 }
 throw last;
}
