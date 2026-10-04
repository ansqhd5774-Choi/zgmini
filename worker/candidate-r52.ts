import handler from 'vinext/server/app-router-entry';
import {candidate2dbWorker} from './candidate-2db-guard.mjs';
import {staticShell} from './candidate-shell-r7.mjs';
import {PROJECTION_ROUTES,readProjectionResponse} from './projection-runtime-r52.mjs';
import {marketOperationalStore} from './candidate-market-operational-store.mjs';
const http=candidate2dbWorker({async fetch(request,env,ctx){
 const path=decodeURIComponent(new URL(request.url).pathname).replace(/\/+/g,'/').replace(/\/$/,'')||'/';
 if(path==='/api/candidate-input-metadata'){
  const store=marketOperationalStore(env.DB_CORE);
  const [macro,credit]=await Promise.all([store.readInput('macro'),store.readInput('credit')]);
  const summarize=x=>({storedAt:x?.storedAt??null,seriesKeys:Object.keys(x?.body?.series??{}),externalKeys:Object.keys(x?.body?.external??{}),providerKeys:Object.keys(x?.body?.providerSummary??{})});
  return Response.json({macro:summarize(macro),credit:summarize(credit)},{headers:{'cache-control':'no-store'}});
 }
 const id=PROJECTION_ROUTES[path];
 if(id)return readProjectionResponse(request,env.DB_CORE,id);
 const shell=await staticShell(request,env);if(shell)return shell;
 if(env.ASSETS&&/\.(?:css|js|svg|png|jpg|webp|ico|xml|txt)$/.test(path))return env.ASSETS.fetch(request);
 if(path==='/api/session')return Response.json({user:null});
 return handler.fetch(request,env,ctx);
}});
export default Object.freeze({...http,async scheduled(controller,native,ctx){
 const {enqueueAfterStoredSourceSuccess}=await import('./projection-queue-r52.ts');
 ctx.waitUntil(enqueueAfterStoredSourceSuccess(native,{sourceSucceeded:true}));
},async queue(batch,native,ctx){
 const {consumeProjectionBatch}=await import('./projection-queue-r52.ts');
 const result=await consumeProjectionBatch(batch,native,ctx);
 console.log(JSON.stringify({projectionQueue:true,processed:result.processed,results:result.results}));
}});
