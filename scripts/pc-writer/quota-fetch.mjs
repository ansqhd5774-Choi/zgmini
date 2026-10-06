import {QuotaLedger} from './quota-ledger.mjs';
import {providerForUrl} from './quota-policy.mjs';

export function createQuotaFetch({base,originalFetch,mode=process.env.ZGMINI_QUOTA_MODE??'observe'}={}){
 const ledger=new QuotaLedger(base,{mode});
 const fetch=async(input,init)=>{
  const provider=providerForUrl(typeof input==='string'||input instanceof URL?input:input.url);
  if(!provider)return originalFetch(input,init);
  ledger.beforeRequest(provider,Date.now());
  try{
   const response=await originalFetch(input,init);
   ledger.afterResponse(provider,{status:response.status,ok:response.ok,at:Date.now()});
   return response;
  }catch(error){
   if(error?.code==='PROVIDER_QUOTA_GUARD')throw error;
   ledger.afterResponse(provider,{status:null,ok:false,error,at:Date.now()});
   throw error;
  }
 };
 return {fetch,ledger,summary:()=>ledger.summary()};
}
