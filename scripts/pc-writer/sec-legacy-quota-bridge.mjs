// SEC permit compatibility adapter for installed PC quota-fetch variants.
//
// Keep the installed PC's existing quota-fetch/QuotaLedger unchanged. This
// adapter can wrap an already constructed quota object with ONE insertion,
// or construct that object for newer collectors that opt into the bridge.
import path from 'node:path';
import {createQuotaFetch} from './quota-fetch.mjs';
import {providerForUrl} from './quota-policy.mjs';
import {createSecSharedLimiter,fetchSecControlled} from './sec-request-controls.mjs';

const fail=code=>{throw Object.assign(new Error(code),{code});};
const MARK=Symbol.for('zgmini.sec.permit.fetch.v1');

export function attachSecSharedPermitToQuota(quota,{
 secSharedGuard=false,secSharedBase=null
}={}){
 if(secSharedGuard!==true&&secSharedGuard!==false)fail('SEC_GUARD_ENABLE_FLAG_INVALID');
 if(!quota||typeof quota.fetch!=='function')fail('SEC_LEGACY_QUOTA_FETCH_UNAVAILABLE');
 if(!secSharedGuard)return quota; // exact legacy behavior, including events
 if(typeof secSharedBase!=='string'||!path.isAbsolute(secSharedBase))
  fail('SEC_GLOBAL_PERMIT_SCOPE_REQUIRED');
 const underlying=quota.fetch;
 if(underlying[MARK]===true)fail('SEC_QUOTA_ALREADY_PROTECTED');
 const gate=createSecSharedLimiter({base:path.resolve(secSharedBase)});
 const fetch=async(input,init)=>{
  const request=typeof Request==='function'&&input instanceof Request;
  const url=typeof input==='string'||input instanceof URL?input:request?input.url:input?.url;
  if(providerForUrl(url)!=='SEC')return underlying(input,init);
  const method=String(init?.method??(request?input.method:'GET')).toUpperCase();
  const headers=init?.headers??(request?input.headers:undefined);
  const signal=init?.signal??(request?input.signal:undefined);
  const options={...init,method,headers,signal,redirect:'manual'};
  const {response}=await fetchSecControlled({
   gate,url:String(url),init:options,maxAttempts:3,
   fetchImpl:(target,hopOptions)=>{
    const targetInput=request
     ?new Request(target,{method,headers,signal,redirect:'manual'})
     :target;
    return underlying(targetInput,{...options,...hopOptions,redirect:'manual'});
   },
  });
  return response;
 };
 Object.defineProperty(fetch,MARK,{value:true});
 // Change only the fetch property. Existing ledgers, events and summary methods
 // remain the same object and retain their original behavior.
 quota.fetch=fetch;
 return quota;
}

export function createCompatibleSecQuotaFetch({
 base,originalFetch,mode=process.env.ZGMINI_QUOTA_MODE??'observe',
 secSharedGuard=false,secSharedBase=null
}={}){
 if(secSharedGuard!==true&&secSharedGuard!==false)fail('SEC_GUARD_ENABLE_FLAG_INVALID');
 if(secSharedGuard&&(typeof secSharedBase!=='string'||
     !path.isAbsolute(secSharedBase)))fail('SEC_GLOBAL_PERMIT_SCOPE_REQUIRED');
 // Explicit false avoids double-reservation in newer quota-fetch versions;
 // installed legacy versions may simply ignore this optional argument.
 const quota=createQuotaFetch({base,originalFetch,mode,secSharedGuard:false});
 return attachSecSharedPermitToQuota(quota,{secSharedGuard,secSharedBase});
}
