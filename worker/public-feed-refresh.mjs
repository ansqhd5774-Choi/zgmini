import {FEED_POLICY,publicFeedStore} from './public-feed-store.mjs';
import {marketOperationalStore} from './market-operational-store.mjs';
import {acceptsStoredUpdate} from '../lib/market-score/live-refresh.mjs';
import {mergeCnnObservedHistory} from '../lib/cnn-observed-history-r1.mjs';
import {assertFeedOutput} from './public-feed-input-safety.mjs';

// Explicit PC-only candidate tick; ordinary Core and other feeds stay unchanged.
export const CNN_MINUTE_INTERVAL_MS=60_000;
const CNN_ERROR_DELAY_MS=5*60_000;
function cnnRetryAt(response,now){
 const raw=response?.headers?.get('retry-after');
 const parsed=raw&&/^\d+$/.test(raw)?now+Number(raw)*1000:Date.parse(raw??'');
 return Math.max(now+CNN_ERROR_DELAY_MS,Number.isSafeInteger(parsed)&&parsed<=8.64e15?parsed:0);
}

// Authenticated scheduler only. Independent source failures retain last good output.
/** @param {{env?:import('./runtime-contracts').DataEnv,collectors?:Record<string,(store:ReturnType<typeof publicFeedStore>,now:number)=>Promise<unknown>>,now?:number,store?:ReturnType<typeof publicFeedStore>,locks?:ReturnType<typeof marketOperationalStore>,maxFeedsPerRun?:number,cnnMinuteOnly?:boolean}} [options] */
export async function refreshPublicFeeds({env,collectors,now=Date.now(),store,locks,maxFeedsPerRun=Infinity,cnnMinuteOnly=false}={}){
 if(cnnMinuteOnly&&env?.ZGMINI_COMPUTE_TARGET!=='pc')throw Error('CNN_MINUTE_PC_ONLY');
 store??=publicFeedStore(env.DB);locks??=marketOperationalStore(env.DB);
 const lease=await locks.claim('public-feeds',now);if(!lease)return {status:'ALREADY_RUNNING'};
 const results=[];
 try{
  await store.initialize();
  const queue=cnnMinuteOnly?['fear-greed']:Object.keys(FEED_POLICY);
  const limit=Number.isFinite(maxFeedsPerRun)?Math.max(0,Math.floor(maxFeedsPerRun)):Infinity;
  let attempted=0;
  async function work(){while(queue.length){const key=queue.shift();
   const attempt='feed:'+key;
   const interval=cnnMinuteOnly?CNN_MINUTE_INTERVAL_MS:FEED_POLICY[key].intervalMs;
   const previous=await store.readOutput(key);
   if(previous&&now>=previous.storedAt&&now-previous.storedAt<interval){results.push({key,status:'CACHED'});continue}
   const lastAttempt=await store.readAttempt(key);
   if((key==='fear-greed'&&Number.isFinite(lastAttempt?.body?.retryAt)&&lastAttempt.body.retryAt>now)||
      (lastAttempt&&now>=lastAttempt.storedAt&&now-lastAttempt.storedAt<interval)){results.push({key,status:'COOLDOWN'});continue}
   if(attempted>=limit){results.push({key,status:'DEFERRED'});continue}
   attempted++;
   const token=await locks.claim(attempt,now);if(!token){results.push({key,status:'RUNNING'});continue}
   try{
    await store.writeAttempt(key,now);
    const response=await collectors[key](store,now,cnnMinuteOnly&&typeof store.appendCnnHttpCheck==='function'?{recordHttpCheck:check=>store.appendCnnHttpCheck(check)}:undefined);
    if(!response.ok){
     if(cnnMinuteOnly)await store.writeAttempt(key,now,{retryAt:cnnRetryAt(response,now)});
     throw Error('PROVIDER_UNAVAILABLE');
    }
    const body=await response.json();
    if(body.status==='fallback'||body.status==='FAILED'||body.status==='unavailable')throw Error('INVALID_OUTPUT');
    if(!acceptsStoredUpdate(previous?.body,body)){
     // CNN's valid late original observation belongs in the date archive,
     // not in the current headline. Use the existing correction/deduplication
     // rules for its actual source timestamp; never relabel a polling time.
     const priorAt=Date.parse(previous?.body?.observedAt??'');
     const receivedAt=Date.parse(body?.observedAt??'');
     if(key==='fear-greed'&&body.status==='verified'&&Number.isFinite(priorAt)&&
        Number.isFinite(receivedAt)&&receivedAt<priorAt&&
        typeof store.appendVerifiedObservations==='function'){
      assertFeedOutput(key,body);
      // Only the newly verified headline enters this path. Do not replay
      // stale sidecar arrays over newer archived corrections.
      await store.appendVerifiedObservations({status:'verified',observedAt:body.observedAt,score:body.score},now);
      await locks.finish(attempt,token,now,'COMPLETE');
      results.push({key,status:'COMPLETE',archivedLateObservation:true});continue;
     }
     throw Error('OBSERVATION_REGRESSION');
    }
    // Archive only verified, distinct CNN observation timestamps. Do this
    // before advancing the current snapshot, so failures can safely retry.
    // Other feeds and Korean market data do not enter this archive.
    const output=key==='fear-greed'?mergeCnnObservedHistory(previous?.body,body,now):body;
    if(key==='fear-greed'&&typeof store.appendVerifiedObservations==='function')
      await store.appendVerifiedObservations(output,now);
    await store.writeOutput(key,output,now);
    await locks.finish(attempt,token,now,'COMPLETE');results.push({key,status:'COMPLETE'});
   }catch(error){
    if(cnnMinuteOnly){
     try{const last=await store.readAttempt(key);if(!(last?.body?.retryAt>now))await store.writeAttempt(key,now,{retryAt:now+CNN_ERROR_DELAY_MS});}catch{/* original failure remains */}
    }
    await locks.finish(attempt,token,now,'FAILED');results.push({key,status:'FAILED',...(Array.isArray(error?.providerDiagnostics)?{providers:error.providerDiagnostics}: {})})}
  }}
  const workers=cnnMinuteOnly?1:limit===Infinity?Object.keys(FEED_POLICY).length:1;
  await Promise.all(Array.from({length:workers},()=>work()));
  const status=results.some(r=>r.status==='FAILED')?'PARTIAL':results.some(r=>r.status==='DEFERRED')?'BACKLOG':'COMPLETE';
  return {status,attempted,feeds:results};
 }finally{await locks.finish('public-feeds',lease,now,'IDLE')}
}
