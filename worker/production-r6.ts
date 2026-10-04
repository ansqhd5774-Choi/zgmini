import baseWorker from './index.ts';
import {staticShell} from './candidate-shell-r7.mjs';
import {PROJECTION_ROUTES,readProjectionResponse} from './projection-runtime-r52.mjs';
import {consumeProjectionBatch,enqueueProjectionIds} from './projection-queue-r52.ts';

const NON_KFG_PROJECTIONS=Object.freeze([
 'inflation','recession','liquidityCrisis','creditRisk',
 'earningsRecession','assetBubble','debtRisk','supplyShock',
]);

function withCoreDb(native:any){
 return new Proxy(native,{get(target,property,receiver){
  if(property==='DB')return Reflect.get(target,'DB_CORE',receiver);
  return Reflect.get(target,property,receiver);
 }});
}

function pathOf(request:Request){
 const url=new URL(request.url);
 let path=decodeURIComponent(url.pathname).replace(/\/+/g,'/').replace(/\/$/,'');
 return path||'/';
}

export default Object.freeze({
 async fetch(request:Request,native:any,ctx:any){
  const path=pathOf(request);
  const projectionId=(PROJECTION_ROUTES as Record<string,string>)[path];
  if(projectionId)return readProjectionResponse(request,native.DB_CORE,projectionId);
  const shell=await staticShell(request,native);
  if(shell)return shell;
  if(native.ASSETS&&/\.(?:css|js|svg|png|jpg|webp|ico|xml|txt)$/.test(path))return native.ASSETS.fetch(request);
  return baseWorker.fetch(request,withCoreDb(native),ctx);
 },
 async scheduled(controller:any,native:any,ctx:any){
  await baseWorker.scheduled(controller,withCoreDb(native),ctx);
  const ids=controller.cron==='37 * * * *'?['koreaFearGreed']:NON_KFG_PROJECTIONS;
  ctx.waitUntil(enqueueProjectionIds(native,ids,{sourceSucceeded:true,skipReady:true}));
 },
 async queue(batch:any,native:any,ctx:any){
  const result=await consumeProjectionBatch(batch,native,ctx);
  console.log(JSON.stringify({productionProjectionQueue:true,processed:result.processed,results:result.results}));
 }
});
