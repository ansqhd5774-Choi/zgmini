import handler from 'vinext/server/app-router-entry';
import {candidate2dbWorker} from './candidate-2db-guard.mjs';
import {staticShell} from './candidate-shell-r7.mjs';
import {PROJECTION_ROUTES,readProjectionResponse} from './projection-runtime-r52.mjs';
import {readPublicFeedHealth} from './public-feed-store.mjs';
import {rssResponse} from './rss-feed.mjs';
import rssXml from '../public/rss.xml?raw';
const http=candidate2dbWorker({async fetch(request,env,ctx){
 const feed=rssResponse(request,rssXml);if(feed)return feed;
 const path=decodeURIComponent(new URL(request.url).pathname).replace(/\/+/g,'/').replace(/\/$/,'')||'/';
 const id=PROJECTION_ROUTES[path];
 if(id)return readProjectionResponse(request,env.DB_CORE,id);
 if(path==='/api/data-health')return readPublicFeedHealth(env.DB_CORE);
 const shell=await staticShell(request,env);if(shell)return shell;
 if(env.ASSETS&&/\.(?:css|js|svg|png|jpg|webp|ico|xml|txt)$/.test(path))return env.ASSETS.fetch(request);
 if(path==='/api/session')return Response.json({user:null});
 return handler.fetch(request,env,ctx);
}});
export default Object.freeze({...http,async scheduled(controller,native,ctx){
 if(controller.cron==='*/5 * * * *'){
  const {runOnceFredAuthProbe}=await import('./fred-auth-probe-r61.mjs');
  await runOnceFredAuthProbe(native,controller.scheduledTime);
  const {runNextFredSubsetProbe}=await import('./fred-subset-probe-r61.mjs');
  if(await runNextFredSubsetProbe(native,controller.scheduledTime))return;
 }
 const {runCandidateWriter}=await import('./candidate-writer-r1.mjs');
 const result=await runCandidateWriter(controller,native).catch(error=>({status:'ERROR',lane:'scheduled',reason:'WRITER_EXECUTION_FAILED',errorName:/^[A-Za-z]{1,40}$/.test(error?.name??'')?error.name:'Error',errorCode:/^[A-Z][A-Z0-9_]{1,80}$/.test(error?.message??'')?error.message:/no such table/i.test(error?.message??'')?'D1_TABLE_MISSING':'UNCLASSIFIED'}));
 console.log('CANDIDATE_WRITER_R2',JSON.stringify(result));
},async queue(batch,native,ctx){
 for(const message of batch.messages??[]){const job=message.body;if(job&&typeof job.id==='string'&&/^[A-Za-z]{1,32}$/.test(job.id)&&Number.isFinite(job.sourceStoredAt))console.log('R60_PROJECTION_BEGIN',JSON.stringify({id:job.id,sourceStoredAt:job.sourceStoredAt,stage:'before-consumer-import'}));}
 const {consumeProjectionBatch}=await import('./projection-queue-r52.ts');
 const result=await consumeProjectionBatch(batch,native,ctx);
 console.log(JSON.stringify({projectionQueue:true,processed:result.processed,results:result.results}));
}});
