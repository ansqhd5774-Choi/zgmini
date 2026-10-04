import handler from 'vinext/server/app-router-entry';
import {candidate2dbWorker} from './candidate-2db-guard.mjs';
import {staticShell} from './candidate-shell-r7.mjs';
import {PROJECTION_ROUTES,readProjectionResponse} from './projection-runtime-r52.mjs';
import {publicProjectionStore,PUBLIC_PROJECTION_KEYS} from './market-public-projection-store.mjs';
const http=candidate2dbWorker({async fetch(request,env,ctx){
 const path=decodeURIComponent(new URL(request.url).pathname).replace(/\/+/g,'/').replace(/\/$/,'')||'/';
 if(path==='/api/candidate-projection-readmeta'){
  const rows={};
  for(const [id,key] of Object.entries(PUBLIC_PROJECTION_KEYS)){
   let meta=null;
   const store=publicProjectionStore(env.DB_CORE,{onRead:m=>meta=m});
   const row=await store.read(key);
   rows[id]={present:Boolean(row),rowsRead:Number(meta?.rows_read??NaN),storedAt:row?.storedAt??null,status:row?.body?.projection?.status??null};
  }
  return Response.json({rows},{headers:{'cache-control':'no-store'}});
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
