import {throwMarketParquetRemoved} from '../../lib/marketparquet-retirement.mjs';
import {QuotaLedger} from './quota-ledger.mjs';
import {providerForUrl} from './quota-policy.mjs';
import {createSecSharedLimiter,fetchSecControlled} from './sec-request-controls.mjs';

function guardError(code){const e=new Error(code);e.code=code;throw e;}

// opt-in only. A verified *shared* root or globally atomic coordinator must be
// provided: a caller-specific base cannot establish a global SEC rate limit.
// Do not enable production until every active SEC caller shares this permit.
export function createQuotaFetch({
 base,originalFetch,mode=process.env.ZGMINI_QUOTA_MODE??'observe',
 secSharedGuard=false,secSharedBase=null,secCoordinator=null
}={}){
 if(typeof originalFetch!=='function')guardError('QUOTA_FETCH_UNAVAILABLE');
 const ledger=new QuotaLedger(base,{mode});
 let secGate=null;
 if(secSharedGuard){
  if(secCoordinator!==null){
   if(typeof secCoordinator.reserve!=='function'||typeof secCoordinator.noteResponse!=='function')
    guardError('SEC_GLOBAL_COORDINATOR_INVALID');
   secGate=secCoordinator;
  }else{
   if(typeof secSharedBase!=='string'||!secSharedBase)
    guardError('SEC_GLOBAL_PERMIT_SCOPE_REQUIRED');
   secGate=createSecSharedLimiter({base:secSharedBase});
  }
 }
 const recordedFetch=async(input,init,provider)=>{
  ledger.beforeRequest(provider,Date.now());
  try{
   const response=await originalFetch(input,init);
   ledger.afterResponse(provider,{status:response.status,ok:response.ok,at:Date.now(),
    headers:provider==='ALPACA'?response.headers:null});
   return response;
  }catch(error){
   if(provider==='ALPACA'&&error&&typeof error==='object')error.requestReserved=true;
   if(error?.code==='PROVIDER_QUOTA_GUARD')throw error;
   ledger.afterResponse(provider,{status:null,ok:false,error,at:Date.now()});
   throw error;
  }
 };
 const fetch=async(input,init)=>{
  const isRequest=typeof Request==='function'&&input instanceof Request;
  const url=typeof input==='string'||input instanceof URL?input:isRequest?input.url:input?.url;
  const provider=providerForUrl(url);
  if(provider==='MARKETPARQUET')throwMarketParquetRemoved();
  if(!provider)return originalFetch(input,init);
  if(provider==='SEC'&&secGate){
   const method=String(init?.method??(isRequest?input.method:'GET')).toUpperCase();
   const headers=init?.headers??(isRequest?input.headers:undefined);
   const signal=init?.signal??(isRequest?input.signal:undefined);
   // Init method overrides Request.method, exactly as Fetch does.
   const options={...init,method,headers,signal,redirect:'manual'};
   const {response}=await fetchSecControlled({
    gate:secGate,url:String(url),init:options,maxAttempts:3,
    fetchImpl:(target,attemptInit)=>{
     const nextInput=isRequest?new Request(target,{method,headers,signal,redirect:'manual'}):target;
     return recordedFetch(nextInput,{...options,...attemptInit,redirect:'manual'},provider);
    },
   });
   return response;
  }
  return recordedFetch(input,init,provider);
 };
 if(secGate)Object.defineProperty(fetch,Symbol.for('zgmini.sec.permit.fetch.v1'),{value:true});
 return {fetch,ledger,summary:()=>ledger.summary()};
}
