import {collectDiagnosticLiveInputs,fetchBisBulkDataset} from './diagnostic-v1-canary.mjs';
import {collectRateR2Inputs} from '../lib/market-score/rate-r2-provider.mjs';
import {collectBreadthB1R3StoreOnlyR1} from '../lib/market-score/breadth-b1-r3-worker-domain.mjs';
import {readBreadthB1R5StoredPublicDomainR1} from '../lib/market-score/breadth-b1-r5-worker-domain.mjs';
import {collectInflationR2StoreOnly} from './inflation-r2-collector.mjs';
import {collectEarningsE1R4ToStore} from '../lib/market-score/sec-earnings-e1-r4-provider.mjs';
import {runEmploymentR4ShadowRuntimeStep} from '../lib/market-score/employment-r4-runtime-trigger.mjs';
import {runConsumptionR3OperationalRefresh} from './consumption-r3-operational-refresh.mjs';
import {collectGrowthR2StoreOnlyR1} from '../lib/market-score/growth-r2-worker-domain-r1.mjs';
import {createMarketScoreR1Handler} from './market-score-r1.mjs';
import {buildFullDiagnosticOrchestrator} from '../lib/diagnostic-layer/full-diagnostic-orchestrator.mjs';
import {marketOperationalStore,readStoredMarketInputs} from './market-operational-store.mjs';

export const MARKET_COLLECTION_JOBS=Object.freeze(['macro','rates','credit','supply','fundFlows','bisDsr','bisTc','earnings','consumption','breadth','inflation','employment','growth']);
const SOURCE_GROUPS={macro:['fetchFred'],credit:['fetchOfr','fetchCmdi'],supply:['fetchGscpi','fetchCopper'],fundFlows:['fetchFundFlows']};
const EXTERNAL_KEYS={macro:['publicDomainScores'],credit:['dvpRepoRows','triPartyRepoRows','cmdiRows'],supply:['gscpiRows','copperRows'],fundFlows:['registeredFundFlowRows']};
async function collectGroup(args,group){
 const adapters=Object.fromEntries(['fetchFred','fetchOfr','fetchCmdi','fetchGscpi','fetchCopper','fetchFundFlows','fetchBis'].filter(key=>!SOURCE_GROUPS[group].includes(key)).map(key=>[key,async()=>({status:'SKIPPED_JOB'})]));
 const out=await collectDiagnosticLiveInputs({...args,requestCap:48,adapters});
 return {...(group==='macro'?{series:out.series,inputSettled:out.inputSettled}:{}),external:Object.fromEntries(EXTERNAL_KEYS[group].map(key=>[key,out.external[key]]))};
}
const unavailableFetch=async()=>{throw Error('SCORE_CALCULATION_NETWORK_FORBIDDEN')};
export async function calculateStoredMarketScore(env,store,now){
 const handler=createMarketScoreR1Handler({env,fetchImpl:unavailableFetch,
  collectInputs:()=>readStoredMarketInputs(store,now),orchestrate:buildFullDiagnosticOrchestrator,
  collectBreadthDomain:readBreadthB1R5StoredPublicDomainR1,now:()=>new Date(now)});
 const response=await handler(new Request('https://zgmini.kr/api/market-score'));
 if(!response.ok)throw Error('STORED_CALCULATION_FAILED');
 const body=await response.json();
 if(body.status!=='SUCCESS'||body.domains?.length!==12)throw Error('SCORE_CONTRACT_FAILED');
 await store.writeScore(body,now);
 return {readyDomains:body.dataQuality?.readyDomains??body.domains.filter(x=>x.status==='READY').length};
}
export async function refreshStoredMarketScoreSnapshot({env,store,now=Date.now()}={}){
 if(!env?.DB&&!store)return {status:'CONFIGURATION_MISSING'};
 store??=marketOperationalStore(env.DB);
 try{
  const result=await calculateStoredMarketScore(env,store,now);
  return {status:'COMPLETE',providerRequests:0,...result};
 }catch(error){
  const reason=['STORED_CALCULATION_FAILED','SCORE_CONTRACT_FAILED'].includes(error?.message)?error.message:'STORED_PRECOMPUTE_FAILED';
  return {status:'ERROR',providerRequests:0,reason};
 }
}
function boundedFetch(fetchImpl){return async(input,init={})=>{
 const timeout=AbortSignal.timeout(20000);
 const signal=init.signal?AbortSignal.any([init.signal,timeout]):timeout;
 return Reflect.apply(fetchImpl,globalThis,[input,{...init,signal}]);
};}
export async function runMarketOperationalRefresh({env,job,store,now=Date.now(),fetchImpl=globalThis.fetch,collectors={},calculate=calculateStoredMarketScore}={}){
 if(!env?.DB&&!store)return {status:'CONFIGURATION_MISSING'};
 if(job&&!MARKET_COLLECTION_JOBS.includes(job))return {status:'INVALID_JOB'};
 store??=marketOperationalStore(env.DB);
 const lease=await store.claim('pipeline',now);
 if(!lease)return {status:'ALREADY_RUNNING'};
 let selected,jobLease,phase='SELECT';
 try{
  selected=job??await store.next(MARKET_COLLECTION_JOBS);
  jobLease=await store.claim(selected,now);
  if(!jobLease)return {status:'ALREADY_RUNNING',job:selected};
  const asOf=new Date(now).toISOString().slice(0,10),requestFetch=boundedFetch(fetchImpl);
  const args={env,asOf,fetchImpl:requestFetch};
  const jobs={
   macro:()=>collectGroup(args,'macro'),
   credit:()=>collectGroup(args,'credit'),
   supply:()=>collectGroup(args,'supply'),
   fundFlows:()=>collectGroup(args,'fundFlows'),
   bisDsr:async()=>{const r=await fetchBisBulkDataset('WS_DSR',{fetchImpl:requestFetch,country:'US'});return {status:r.status,external:{bisDsrParsed:r.parsed}}},
   bisTc:async()=>{const r=await fetchBisBulkDataset('WS_TC',{fetchImpl:requestFetch,country:'US'});return {status:r.status,external:{bisDebtGdpParsed:r.parsed}}},
   rates:()=>collectRateR2Inputs(args),
   earnings:()=>collectEarningsE1R4ToStore({...args,db:env.DB}),
   consumption:()=>runConsumptionR3OperationalRefresh({...args,maxSourcesPerRun:1}),
   breadth:()=>collectBreadthB1R3StoreOnlyR1(args),
   inflation:()=>collectInflationR2StoreOnly(args),
   employment:()=>runEmploymentR4ShadowRuntimeStep(args),
   growth:()=>collectGrowthR2StoreOnlyR1(args),
   ...collectors,
  };
  phase='COLLECT';const collected=await jobs[selected]();
  if(['macro','rates','credit','supply','fundFlows','bisDsr','bisTc'].includes(selected)){
   phase='STORE';
   // Keep normalized observations, not URLs, request logs or credentials.
   const {series,external,inputSettled,rateR2,providerSummary}=collected;
   const input={...(series?{series}:{}),...(external?{external}:{}),...(inputSettled?{inputSettled}:{}),...(rateR2?{rateR2}:{}),providerSummary};
   await store.writeInput(selected,input,now);
  }
  phase='CALCULATE';const result=await calculate(env,store,now);
  const sourceStatus=collected?.status??collected?.rateR2?.status??'COLLECTED';
  const failed=/^(FAIL|FAILED|ERROR)$/.test(sourceStatus);
  await store.finish(selected,jobLease,now,failed?'SOURCE_FAILED':'COMPLETE');
  return {status:failed?'SOURCE_FAILED':'COMPLETE',job:selected,sourceStatus,...result};
 }catch(error){
  if(jobLease)await store.finish(selected,jobLease,now,`${phase}_FAILED`).catch(()=>{});
  const reason=['INPUT_STORAGE_LIMIT','STORED_CALCULATION_FAILED','SCORE_CONTRACT_FAILED'].includes(error?.message)?error.message:(String(error?.message??'').match(/^GROWTH_R2_[A-Z0-9_]+/)?.[0]??null);
  return {status:'ERROR',job:selected,phase,...(reason?{reason}:{})};
 }finally{await store.finish('pipeline',lease,now,'IDLE')}
}
