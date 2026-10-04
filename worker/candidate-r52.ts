import handler from 'vinext/server/app-router-entry';
import {candidate2dbWorker} from './candidate-2db-guard.mjs';
import {staticShell} from './candidate-shell-r7.mjs';
import {PROJECTION_ROUTES,readProjectionResponse} from './projection-runtime-r52.mjs';
import {PUBLIC_PROJECTION_KEYS,publicProjectionStore} from './market-public-projection-store.mjs';
const http=candidate2dbWorker({async fetch(request,env,ctx){
 const path=decodeURIComponent(new URL(request.url).pathname).replace(/\/+/g,'/').replace(/\/$/,'')||'/';
 if(path==='/api/candidate-projection-status'){
  const store=publicProjectionStore(env.DB_CORE);
  const entries=await Promise.all(Object.entries(PUBLIC_PROJECTION_KEYS).map(async([id,key])=>{const row=await store.read(key);const p=row?.body?.projection??null;return [id,{key,storedAt:row?.storedAt??null,status:p?.status??null,builtAt:p?.builtAt??null,sourceStoredAt:p?.sourceStoredAt??null,sourceVersion:p?.sourceVersion??null,expectedSourceStoredAt:p?.expectedSourceStoredAt??null,expectedSourceVersion:p?.expectedSourceVersion??null,asOf:p?.asOf??null,validUntil:p?.validUntil??null}]}));
  return Response.json(Object.fromEntries(entries),{headers:{'cache-control':'no-store'}});
 }
 const id=PROJECTION_ROUTES[path];
 if(id)return readProjectionResponse(request,env.DB_CORE,id);
 const shell=await staticShell(request,env);if(shell)return shell;
 if(env.ASSETS&&/\.(?:css|js|svg|png|jpg|webp|ico|xml|txt)$/.test(path))return env.ASSETS.fetch(request);
 if(path==='/api/session')return Response.json({user:null});
 return handler.fetch(request,env,ctx);
}});
export default Object.freeze({...http,async scheduled(controller,native,ctx){
 const {enqueueProjectionIds}=await import('./projection-queue-r52.ts');
 ctx.waitUntil(enqueueProjectionIds(native,['inflation','creditRisk','earningsRecession','assetBubble','debtRisk','supplyShock','koreaFearGreed'],{sourceSucceeded:true,skipReady:false}));
},async queue(batch,native,ctx){
 const {consumeProjectionBatch}=await import('./projection-queue-r52.ts');
 const result=await consumeProjectionBatch(batch,native,ctx);
 console.log(JSON.stringify({projectionQueue:true,processed:result.processed,results:result.results}));
}});
