// SEC permit compatibility adapter for installed PC quota-fetch variants.
//
// Deliberately does not modify or replace an existing PC quota-fetch.mjs.
// The legacy quota ledger remains responsible for recording HTTP diagnostics;
// only SEC calls are admitted through the additional shared permit.
import path from 'node:path';
import {createQuotaFetch} from './quota-fetch.mjs';
import {providerForUrl} from './quota-policy.mjs';
import {createSecSharedLimiter,fetchSecControlled} from './sec-request-controls.mjs';

const fail=code=>{throw Object.assign(new Error(code),{code});};
const MARK=Symbol.for('zgmini.sec.permit.fetch.v1');

export function createCompatibleSecQuotaFetch({
 base,originalFetch,mode=process.env.ZGMINI_QUOTA_MODE??'observe',
 secSharedGuard=false,secSharedBase=null
}={}){
 if(secSharedGuard!==true&&secSharedGuard!==false)fail('SEC_GUARD_ENABLE_FLAG_INVALID');
 if(secSharedGuard&&(typeof secSharedBase!=='string'||
     !path.isAbsolute(secSharedBase)))fail('SEC_GLOBAL_PERMIT_SCOPE_REQUIRED');

 // SEC protection in this file is independent of newer quota-fetch internals.
 // Explicit false avoids double reservations on a newer source, while a legacy
 // source that ignores this option continues operating unchanged.
 const quota=createQuotaFetch({base,originalFetch,mode,secSharedGuard:false});
 if(!secSharedGuard)return quota;
 const gate=createSecSharedLimiter({base:path.resolve(secSharedBase)});
 const underlying=quota.fetch;
 if(typeof underlying!=='function')fail('SEC_LEGACY_QUOTA_FETCH_UNAVAILABLE');
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
 return {...quota,fetch};
}
