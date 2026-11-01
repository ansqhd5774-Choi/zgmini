// Visibility only: score formulas, comparison baselines and refresh cadence are unchanged.
export const SCORE_ARROW_TTL_MS=24*60*60*1000;
export const SCORE_ARROW_VERSION='SCORE_ARROW_24H_V1';
export const scoreValue=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?Number(value.toFixed(1)):null;
export function nextArrowState(previous,samples,now){
 if(!Number.isSafeInteger(now)||now<=0)throw Error('ARROW_CLOCK_INVALID');
 const entries={...(previous?.version===SCORE_ARROW_VERSION?previous.entries:{})};
 for(const [id,sample] of Object.entries(samples)){
  const value=scoreValue(sample?.score),sourceAt=sample?.sourceAt;
  if(value===null||!Number.isSafeInteger(sourceAt)||sourceAt<=0||sourceAt>now)continue;
  const old=entries[id];
  if(old&&sourceAt<=old.sourceAt)continue;
  const method=sample.method??null;
  const comparable=old&&old.method===method&&scoreValue(old.value)!==null;
  entries[id]={value,method,sourceAt,changedAt:comparable?(old.value===value?old.changedAt:sourceAt):null,previousValue:comparable?(old.value===value?(old.previousValue??null):old.value):null};
 }
 return {version:SCORE_ARROW_VERSION,publishedAt:now,entries};
}
export function arrowVisible(entry,score,now=Date.now()){
 const value=scoreValue(score),changedAt=entry?.changedAt;
 return value!==null&&entry?.value===value&&Number.isSafeInteger(changedAt)&&changedAt>0&&changedAt<=now&&now-changedAt<SCORE_ARROW_TTL_MS;
}
export function storedArrowDelta(entry,score,now=Date.now()){
 if(!arrowVisible(entry,score,now)||scoreValue(entry?.previousValue)===null)return null;
 const delta=Number((entry.value-entry.previousValue).toFixed(1));
 return delta===0?null:delta;
}
export function nextArrowExpiry(entries,now){
 const expiries=Object.values(entries??{}).map(e=>e?.changedAt).filter(t=>Number.isSafeInteger(t)&&t>0&&t<=now&&t+SCORE_ARROW_TTL_MS>now).map(t=>t+SCORE_ARROW_TTL_MS);
 return expiries.length?Math.min(...expiries):null;
}
/**
 * @param {Record<string,{changedAt:number|null}>} entries
 * @param {(time:number)=>void} update
 * @param {{now?:()=>number,setTimer?:typeof setTimeout,clearTimer?:typeof clearTimeout,target?:EventTarget,documentTarget?:EventTarget}} [options]
 */
export function startArrowClock(entries,update,{now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout,target,documentTarget}={}){
 let timer;
 const tick=()=>{clearTimer(timer);const time=now();update(time);const expiry=nextArrowExpiry(entries,time);if(expiry!==null)timer=setTimer(tick,Math.max(1,expiry-time));};
 tick();
 target?.addEventListener('focus',tick);target?.addEventListener('pageshow',tick);documentTarget?.addEventListener('visibilitychange',tick);
 return()=>{clearTimer(timer);target?.removeEventListener('focus',tick);target?.removeEventListener('pageshow',tick);documentTarget?.removeEventListener('visibilitychange',tick);};
}
