export const REFRESH_INTERVAL_MS=5*60*1000;
const time=value=>typeof value==='number'?value:typeof value==='string'?Date.parse(/^\d{8}$/.test(value)?`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`:value):NaN;
export function observationTime(body){return time(body?.observedAt??body?.observationDate??body?.composite?.observationDate??body?.asOfDate??body?.observationAt);}
export function publicationTime(body){return time(body?.updatedAt??body?.publishedAt??body?.sourceStoredAt);}
export function acceptsStoredUpdate(previous,next){
 if(!next||typeof next!=='object')return false;
 if(!previous)return true;
 const oldPublished=publicationTime(previous),newPublished=publicationTime(next);
 if(Number.isFinite(oldPublished)&&Number.isFinite(newPublished)&&newPublished<oldPublished)return false;
 const oldObserved=observationTime(previous),newObserved=observationTime(next);
 return !(Number.isFinite(oldObserved)&&Number.isFinite(newObserved)&&newObserved<oldObserved);
}
// One in-flight request per subscriber. Resume events cannot create races.
export function startStoredRefresh(load,{target=window,documentTarget=document,intervalMs=REFRESH_INTERVAL_MS}={}){
 let stopped=false,busy=false,controller;
 const run=async()=>{if(stopped||busy)return;busy=true;controller=new AbortController();const timeout=target.setTimeout(()=>controller.abort(),30000);try{await load(controller.signal);}catch{}finally{target.clearTimeout(timeout);busy=false;}};
 const visible=()=>{if(documentTarget.visibilityState==='visible')void run();};
 const timer=target.setInterval(()=>{if(documentTarget.visibilityState==='visible')void run();},intervalMs);
 target.addEventListener('focus',visible);target.addEventListener('pageshow',visible);documentTarget.addEventListener('visibilitychange',visible);
 void run();
 return()=>{stopped=true;controller?.abort();target.clearInterval(timer);target.removeEventListener('focus',visible);target.removeEventListener('pageshow',visible);documentTarget.removeEventListener('visibilitychange',visible);};
}
