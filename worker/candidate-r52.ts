import handler from 'vinext/server/app-router-entry';
import {candidate2dbWorker} from './candidate-2db-guard.mjs';
import {staticShell} from './candidate-shell-r7.mjs';
import {PROJECTION_ROUTES,readProjectionResponse} from './projection-runtime-r52.mjs';
import {marketOperationalStore,readStoredMarketInputsSelected} from './candidate-market-operational-store.mjs';
import {publicProjectionStore,PUBLIC_PROJECTION_KEYS} from './market-public-projection-store.mjs';
const http=candidate2dbWorker({async fetch(request,env,ctx){
 const path=decodeURIComponent(new URL(request.url).pathname).replace(/\/+/g,'/').replace(/\/$/,'')||'/';
 if(path==='/api/candidate-input-metadata'){
  const store=marketOperationalStore(env.DB_CORE);
  const [macro,credit,snapshot]=await Promise.all([store.readInput('macro'),store.readInput('credit'),store.readScore()]);
  const selected=await readStoredMarketInputsSelected(store,['macro','credit'],Number(snapshot?.storedAt)||Date.now(),{anchorToLatestBatch:true});
  const count=v=>Array.isArray(v)?v.length:(v&&typeof v==='object'?Object.keys(v).length:0);
  const summarize=x=>({storedAt:x?.storedAt??null,seriesKeys:Object.keys(x?.body?.series??{}),externalKeys:Object.keys(x?.body?.external??{}),providerKeys:Object.keys(x?.body?.providerSummary??{})});
  const creditProjection=await publicProjectionStore(env.DB_CORE).read(PUBLIC_PROJECTION_KEYS.creditRisk);
  const cp=creditProjection?.body?.projection??null;
  return Response.json({
   creditProjection:{storedAt:creditProjection?.storedAt??null,builtAt:cp?.builtAt??null,sourceStoredAt:cp?.sourceStoredAt??null,sourceVersion:cp?.sourceVersion??null,status:cp?.status??null},
   snapshotStoredAt:snapshot?.storedAt??null,
   macro:summarize(macro),credit:summarize(credit),
   directCounts:{DGS2:count(macro?.body?.series?.DGS2),DGS5:count(macro?.body?.series?.DGS5),DGS10:count(macro?.body?.series?.DGS10),DGS30:count(macro?.body?.series?.DGS30),cmdiRows:count(credit?.body?.external?.cmdiRows)},
   selectedCounts:{DGS2:count(selected?.series?.DGS2),DGS5:count(selected?.series?.DGS5),DGS10:count(selected?.series?.DGS10),DGS30:count(selected?.series?.DGS30),cmdiRows:count(selected?.external?.cmdiRows)}
  },{headers:{'cache-control':'no-store'}});
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
 ctx.waitUntil(enqueueProjectionIds(native,['creditRisk'],{sourceSucceeded:true,skipReady:false}));
},async queue(batch,native,ctx){
 const {consumeProjectionBatch}=await import('./projection-queue-r52.ts');
 const result=await consumeProjectionBatch(batch,native,ctx);
 console.log(JSON.stringify({projectionQueue:true,processed:result.processed,results:result.results}));
}});
