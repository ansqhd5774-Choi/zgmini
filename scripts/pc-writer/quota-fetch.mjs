import {QuotaLedger} from './quota-ledger.mjs';
import {providerForUrl} from './quota-policy.mjs';

const R6_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const blsGuard=reason=>{
 const error=Error('PROVIDER_QUOTA_GUARD');
 error.code='PROVIDER_QUOTA_GUARD';
 error.provider='BLS';
 error.reason=reason;
 return error;
};

// The classifier only examines bytes already supplied to fetch. A Request is
// cloned so the original HTTP body remains untouched and no key is logged.
async function blsRequestClass(input,init){
 let url;
 try{url=new URL(typeof input==='string'||input instanceof URL?input:input.url);}
 catch{throw blsGuard('BLS_REQUEST_URL_UNKNOWN');}
 const version=/^\/publicAPI\/v([12])\/timeseries\/data\/?$/.exec(url.pathname)?.[1];
 const method=init?.method??(typeof Request!=='undefined'&&input instanceof Request?input.method:'GET');
 const verb=String(method).toUpperCase();
 // R4 geographic-diffusion retries a missing v1 series using a GET against
 // /data/{seriesId}. Each retry is one unregistered provider request too.
 // Official BLS series IDs can contain underscore, dash and hash. A literal
 // hash in an ID must be percent-encoded in an HTTP path (%23).
 const v1Single=/^\/publicAPI\/v1\/timeseries\/data\/((?:[A-Za-z0-9_-]|%23){1,80})\/?$/.test(url.pathname);
 if(v1Single&&verb==='GET'&&!url.search&&!url.hash&&
   (init?.body===undefined||init.body===null))return 'unregistered';
 if(!version||verb!=='POST')
  throw blsGuard('BLS_REQUEST_SHAPE_UNVERIFIED');
 if(version==='1')return 'unregistered';
 let raw=init?.body;
 if(raw===undefined||raw===null){
  if(typeof Request==='undefined'||!(input instanceof Request))
   throw blsGuard('BLS_V2_BODY_UNVERIFIED');
  try{raw=await input.clone().text();}catch{throw blsGuard('BLS_V2_BODY_UNVERIFIED');}
 }
 if(typeof raw!=='string')throw blsGuard('BLS_V2_BODY_UNVERIFIED');
 let json;
 try{json=JSON.parse(raw);}catch{throw blsGuard('BLS_V2_BODY_UNVERIFIED');}
 if(!json||typeof json!=='object'||Array.isArray(json))
  throw blsGuard('BLS_V2_BODY_UNVERIFIED');
 if(json.registrationkey===undefined||json.registrationkey===null||json.registrationkey==='')
  return 'unregistered';
 if(typeof json.registrationkey!=='string'||!json.registrationkey.trim())
  throw blsGuard('BLS_V2_KEY_UNVERIFIED');
 return 'registered';
}

// This remains *inactive* unless a trusted, already approved PC entry point
// passes enabled:true and the canonical approvedBase. No environment variable
// enables this by itself. The live Core wrapper is unchanged until deployed.
export function createQuotaFetch({
 base,originalFetch,mode=process.env.ZGMINI_QUOTA_MODE??'observe',
 blsUnregistered={enabled:false},
}={}){
 const ledger=new QuotaLedger(base,{mode});
 const guardedFetch=async(input,init,{r6LeaseId=null}={})=>{
  const provider=providerForUrl(typeof input==='string'||input instanceof URL?input:input.url);
  if(!provider)return originalFetch(input,init);
  if(r6LeaseId!==null&&provider!=='BLS')
   return ordinaryFetch(input,init,provider);
  return ordinaryFetch(input,init,provider,r6LeaseId);
 };
 const ordinaryFetch=async(input,init,provider,r6LeaseId=null)=>{
  // Validate the BLS request *before* writing the ordinary quota ledger.
  // Existing registered 500/day behavior is preserved.
  const isGuarded=provider==='BLS'&&blsUnregistered?.enabled===true;
  const requestType=isGuarded?await blsRequestClass(input,init):null;
  if(isGuarded&&r6LeaseId!==null&&requestType!=='unregistered')
   throw blsGuard('BLS_R6_LEASE_EXPECTED_UNREGISTERED');
  if(isGuarded&&requestType==='unregistered'){
   const opts={base,approvedBase:blsUnregistered.approvedBase,now:Date.now()};
   try{
    // Optional sidecar: never make its import mandatory for legacy PC source.
    // A missing or damaged approved module fails closed before network I/O.
    const reservation=await import('./bls-unregistered-reservation.mjs');
    if(r6LeaseId===null)reservation.reserveOneUnregisteredBlsRequest(opts);
    else reservation.spendR6UnregisteredBlsSlot({...opts,requestId:r6LeaseId});
   }catch(error){
    if(error?.code?.startsWith('BLS_UNREG_'))throw blsGuard(error.code);
    throw error;
   }
  }
  // Failed reservation means zero physical requests and must not be written as
  // a provider attempt in the older quota-ledger. If its own gate refuses
  // after a reservation, the new slot is conservatively retained.
  ledger.beforeRequest(provider,Date.now());
  try{
   const response=await originalFetch(input,init);
   ledger.afterResponse(provider,{status:response.status,ok:response.ok,at:Date.now(),
    headers:provider==='ALPACA'?response.headers:null});
   return response;
  }catch(error){
   // The provider may have received a reserved request even when the network
   // reply fails. Never refund or silently retry it.
   if((provider==='ALPACA'||isGuarded&&requestType==='unregistered')&&error&&typeof error==='object')
    error.requestReserved=true;
   if(error?.code==='PROVIDER_QUOTA_GUARD')throw error;
   ledger.afterResponse(provider,{status:null,ok:false,error,at:Date.now()});
   throw error;
  }
 };
 const fetch=(input,init)=>guardedFetch(input,init);
 const fetchR6WithLease=requestId=>{
  if(blsUnregistered?.enabled!==true)throw blsGuard('BLS_R6_LEASE_INACTIVE');
  if(typeof requestId!=='string'||!R6_UUID.test(requestId))
   throw blsGuard('BLS_R6_LEASE_ID_INVALID');
  return (input,init)=>guardedFetch(input,init,{r6LeaseId:requestId});
 };
 return {fetch,fetchR6WithLease,ledger,summary:()=>ledger.summary()};
}
