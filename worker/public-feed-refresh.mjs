import {FEED_POLICY,publicFeedStore} from './public-feed-store.mjs';
import {marketOperationalStore} from './market-operational-store.mjs';
import {acceptsStoredUpdate} from '../lib/market-score/live-refresh.mjs';

// Authenticated scheduler only. Independent source failures retain last good output.
export async function refreshPublicFeeds({env,collectors,now=Date.now(),store,locks,maxFeedsPerRun=Infinity}={}){
 store??=publicFeedStore(env.DB);locks??=marketOperationalStore(env.DB);
 const lease=await locks.claim('public-feeds',now);if(!lease)return {status:'ALREADY_RUNNING'};
 const results=[];
 try{
  await store.initialize();
  const queue=Object.keys(FEED_POLICY);
  const limit=Number.isFinite(maxFeedsPerRun)?Math.max(0,Math.floor(maxFeedsPerRun)):Infinity;
  let attempted=0;
  async function work(){while(queue.length){const key=queue.shift();
   const attempt='feed:'+key;
   const previous=await store.readOutput(key);
   if(previous&&now>=previous.storedAt&&now-previous.storedAt<FEED_POLICY[key].intervalMs){results.push({key,status:'CACHED'});continue}
   const lastAttempt=await store.readAttempt(key);
   if(lastAttempt&&now>=lastAttempt.storedAt&&now-lastAttempt.storedAt<FEED_POLICY[key].intervalMs){results.push({key,status:'COOLDOWN'});continue}
   if(attempted>=limit){results.push({key,status:'DEFERRED'});continue}
   attempted++;
   const token=await locks.claim(attempt,now);if(!token){results.push({key,status:'RUNNING'});continue}
   try{
    await store.writeAttempt(key,now);
    const response=await collectors[key](store,now);if(!response.ok)throw Error('PROVIDER_UNAVAILABLE');
    const body=await response.json();
    if(body.status==='fallback'||body.status==='FAILED'||body.status==='unavailable')throw Error('INVALID_OUTPUT');
    if(!acceptsStoredUpdate(previous?.body,body))throw Error('OBSERVATION_REGRESSION');
    await store.writeOutput(key,body,now);
    await locks.finish(attempt,token,now,'COMPLETE');results.push({key,status:'COMPLETE'});
   }catch(error){await locks.finish(attempt,token,now,'FAILED');results.push({key,status:'FAILED',...(Array.isArray(error?.providerDiagnostics)?{providers:error.providerDiagnostics}: {})})}
  }}
  const workers=limit===Infinity?Object.keys(FEED_POLICY).length:1;
  await Promise.all(Array.from({length:workers},()=>work()));
  const status=results.some(r=>r.status==='FAILED')?'PARTIAL':results.some(r=>r.status==='DEFERRED')?'BACKLOG':'COMPLETE';
  return {status,attempted,feeds:results};
 }finally{await locks.finish('public-feeds',lease,now,'IDLE')}
}
