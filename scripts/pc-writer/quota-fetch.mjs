import {QuotaLedger} from './quota-ledger.mjs';
import {providerForUrl} from './quota-policy.mjs';
import {createSecSharedLimiter,fetchSecControlled} from './sec-request-controls.mjs';

// SEC is opt-in until every independent SEC collector uses the same reservation
// root and its PC source/approval has been verified. Default behavior unchanged.
export function createQuotaFetch({base,originalFetch,mode=process.env.ZGMINI_QUOTA_MODE??'observe',
  secSharedGuard=false}={}){
 const ledger=new QuotaLedger(base,{mode});
 const secGate=secSharedGuard?createSecSharedLimiter({base}):null;
 const recordedFetch=async(input,init,provider)=>{
  ledger.beforeRequest(provider,Date.now());
  try{
   const response=await originalFetch(input,init);
   ledger.afterResponse(provider,{status:response.status,ok:response.ok,at:Date.now(),
    headers:provider==='ALPACA'?response.headers:null});
   return response;
  }catch(error){
   // Reservation may have succeeded even if the response or logging failed.
   if(provider==='ALPACA'&&error&&typeof error==='object')error.requestReserved=true;
   if(error?.code==='PROVIDER_QUOTA_GUARD')throw error;
   ledger.afterResponse(provider,{status:null,ok:false,error,at:Date.now()});
   throw error;
  }
 };
 const fetch=async(input,init)=>{
  const url=typeof input==='string'||input instanceof URL?input:input.url;
  const provider=providerForUrl(url);
  if(!provider)return originalFetch(input,init);
  if(provider==='SEC'&&secGate){
   // Every network attempt, including retries, consumes a global reservation.
   // The existing quota ledger continues recording calls for diagnostics.
   const {response}=await fetchSecControlled({
    gate:secGate,url,init,fetchImpl:()=>recordedFetch(input,init,provider),maxAttempts:3,
   });
   return response;
  }
  return recordedFetch(input,init,provider);
 };
 return {fetch,ledger,summary:()=>ledger.summary()};
}
