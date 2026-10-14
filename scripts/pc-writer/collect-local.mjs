import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {localDatabase} from './local-db.mjs';
import {loadLocalProviders,installLocalRuntime} from './local-env.mjs';
import {save} from './d1.mjs';
import {createQuotaFetch} from './quota-fetch.mjs';
import {recordCollectionChecks} from './collection-checks.mjs';
import {collectConsumptionR5} from './consumption-r5.mjs';
import {overdueRateJob} from './rate-refresh-priority.mjs';

export async function collectLocal(base,{lane='core',importOnly=false,job=null}={}){
 const core=localDatabase(path.join(base,'storage','core.sqlite'));
 const history=localDatabase(path.join(base,'storage','history.sqlite'));
 const env={...loadLocalProviders(base),DB:core,DB_CORE:core,DB_HISTORY:history,ZGMINI_COMPUTE_TARGET:'pc'};
 const hooks=installLocalRuntime(env);
 const originalFetch=globalThis.fetch,providers={};
 const quota=createQuotaFetch({base,originalFetch});
 globalThis.fetch=async(input,init)=>{
  const host=new URL(typeof input==='string'||input instanceof URL?input:input.url).hostname;
  const item=providers[host]??={requests:0,statuses:{}};item.requests++;
  try{const response=await quota.fetch(input,init);item.statuses[response.status]=(item.statuses[response.status]??0)+1;return response;}
  catch(error){const status=error?.code??'NETWORK_ERROR';item.statuses[status]=(item.statuses[status]??0)+1;if(error?.code==='PROVIDER_QUOTA_GUARD')throw error;throw Error('LOCAL_PROVIDER_NETWORK_ERROR');}
 };
 try{
  const {runPublicFeeds}=await import('../../worker/public-feed-collectors.ts');
  const {runMarketOperationalRefresh}=await import('../../worker/market-operational-refresh.mjs');
  const {refreshKoreaRev7}=await import('../../worker/korea-rev7-refresh.mjs');
  const {Rev7D1Store}=await import('../../worker/korea-rev7-d1.mjs');
  if(importOnly)return {status:'LOCAL_IMPORT_PASS'};
  let result;
  if(lane==='korea')result=await refreshKoreaRev7({env:{...env,DB:history},store:new Rev7D1Store(history,{leaseMs:600000}),now:new Date(),maxDates:1,deferCalculation:true});
  else{
   const collectors={consumption:()=>collectConsumptionR5({db:core,fetchImpl:globalThis.fetch})};
   const now=Date.now();
   job??=await overdueRateJob(core,now);
   if(job)result=await runMarketOperationalRefresh({env,job,now,fetchImpl:globalThis.fetch,collectors,calculate:async()=>({calculation:'PC_PENDING'})});
   else{
    const feed=await runPublicFeeds({env,maxFeedsPerRun:1});
    result=feed.attempted>0||feed.status!=='COMPLETE'?{...feed,lane:'public-feed'}:await runMarketOperationalRefresh({env,now:Date.now(),fetchImpl:globalThis.fetch,collectors,calculate:async()=>({calculation:'PC_PENDING'})});
   }
  }
  // Reports contain statuses only; provider URLs and exception messages are excluded.
  const report={at:new Date().toISOString(),lane,status:result.status,job:result.job??null,attempted:result.attempted??null,feeds:result.feeds?.map(({key,status})=>({key,status})),providers,quota:quota.summary()};
  for(const key of ['phase','reason','sourceStatus'])if(typeof result?.[key]==='string'&&/^[A-Za-z0-9_.:-]{1,120}$/.test(result[key]))report[key]=result[key];
  save(path.join(base,'local-collection-last-run.json'),report);
  recordCollectionChecks(base,report);
  return report;
 }finally{globalThis.fetch=originalFetch;hooks.deregister();core.close();history.close();}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const jobArg=process.argv.find(arg=>arg.startsWith('--job='));
  const job=jobArg?jobArg.slice('--job='.length):null;
  console.log(JSON.stringify(await collectLocal(process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),{lane:process.argv.includes('--korea')?'korea':'core',importOnly:process.argv.includes('--import-only'),job})));
 }
 catch(error){console.log(JSON.stringify({status:'FAILED',code:error.code??'LOCAL_COLLECTION_FAILED',...(process.argv.includes('--import-only')?{importError:error.message}:{})}));process.exitCode=1;}
}
