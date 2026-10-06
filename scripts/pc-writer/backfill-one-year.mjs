import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {localDatabase} from './local-db.mjs';
import {loadLocalProviders,installLocalRuntime} from './local-env.mjs';
import {createQuotaFetch} from './quota-fetch.mjs';
import {save} from './d1.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const DEFAULT_BASE=path.join(os.homedir(),'.zgmini','pc-writer');
const REPORT_NAME='local-one-year-backfill-last-run.json';
const LOCK_NAME='local-one-year-backfill.lock';
const ONE_YEAR_MIN_SPAN_DAYS=330;
const EMPLOYMENT_CLAIMS_WEEKS=108;
const EARNINGS_QUARTERS=5;
const GENERIC_JOBS=Object.freeze(['macroCredit','macro','rates','credit','supply','fundFlows','bisDsr','bisTc','inflation','growth']);

const dateOnly=value=>new Date(value).toISOString().slice(0,10);
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const daysBetween=(a,b)=>Math.floor((Date.parse(`${b}T00:00:00Z`)-Date.parse(`${a}T00:00:00Z`))/86400000);
const cleanStatus=value=>typeof value==='string'&&/^[A-Za-z0-9_.:-]{1,120}$/.test(value)?value:'UNKNOWN';

export function shiftDateMonths(iso,delta){
 if(!validDate(iso)||!Number.isInteger(delta))throw new TypeError('DATE_SHIFT_INVALID');
 const [y,m,d]=iso.split('-').map(Number);
 const first=new Date(Date.UTC(y,m-1+delta,1));
 const lastDay=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
 return `${first.getUTCFullYear()}-${String(first.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(d,lastDay)).padStart(2,'0')}`;
}

export function earningsAnchors(asOf,count=EARNINGS_QUARTERS){
 if(!validDate(asOf)||!Number.isInteger(count)||count<1)throw new TypeError('EARNINGS_ANCHOR_INVALID');
 return Array.from({length:count},(_,i)=>shiftDateMonths(asOf,-3*i));
}

function trendCoverage(domain){
 const rows=Array.isArray(domain?.trend)?domain.trend:[];
 const dates=rows.map(row=>row?.label??row?.date??row?.observationDate).filter(validDate).sort();
 const first=dates.at(0)??null,last=dates.at(-1)??null;
 const spanDays=first&&last?daysBetween(first,last):0;
 return {
  id:String(domain?.id??''),name:String(domain?.name??''),status:String(domain?.status??'UNKNOWN'),
  points:dates.length,first,last,spanDays,oneYear:spanDays>=ONE_YEAR_MIN_SPAN_DAYS,
 };
}

function lock(base){
 const file=path.join(base,LOCK_NAME);
 if(fs.existsSync(file)){
  let alive=true;
  try{const prior=JSON.parse(fs.readFileSync(file,'utf8'));process.kill(prior.pid,0);}catch(error){if(error?.code==='ESRCH'||error instanceof SyntaxError)alive=false;}
  if(alive)throw Object.assign(new Error('ONE_YEAR_BACKFILL_ALREADY_RUNNING'),{code:'ONE_YEAR_BACKFILL_ALREADY_RUNNING'});
  fs.renameSync(file,file+'.interrupted-'+Date.now());
 }
 fs.writeFileSync(file,JSON.stringify({pid:process.pid,at:Date.now()}),{flag:'wx'});
 return ()=>{try{fs.unlinkSync(file)}catch{}};
}

export async function backfillOneYear(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{asOf=dateOnly(Date.now())}={}){
 if(!validDate(asOf))throw new TypeError('BACKFILL_ASOF_INVALID');
 const release=lock(base);
 const reportFile=path.join(base,REPORT_NAME);
 const report={version:1,status:'RUNNING',asOf,startedAt:new Date().toISOString(),noPublish:true,stages:[],coverage:[],storageEvidence:{},quota:null};
 const checkpoint=()=>save(reportFile,report);
 const stage=(name,result)=>{report.stages.push({name,status:cleanStatus(result?.status??result?.sourceStatus??'COMPLETE'),providerRequests:Number(result?.providerRequests??result?.requestCount??0)||0,...(result?.financialPeriodEnd?{financialPeriodEnd:result.financialPeriodEnd}:{}),...(result?.scoreDate?{scoreDate:result.scoreDate}:{}),...(result?.reason&&/^[A-Za-z0-9_.:-]{1,120}$/.test(result.reason)?{reason:result.reason}:{}),});checkpoint();};

 const core=localDatabase(path.join(base,'storage','core.sqlite'));
 const history=localDatabase(path.join(base,'storage','history.sqlite'));
 const env={...loadLocalProviders(base),DB:core,DB_CORE:core,DB_HISTORY:history,ZGMINI_COMPUTE_TARGET:'pc'};
 const hooks=installLocalRuntime(env);
 const originalFetch=globalThis.fetch;
 const quota=createQuotaFetch({base,originalFetch,mode:'enforce'});
 globalThis.fetch=quota.fetch;
 try{
  const [{runMarketOperationalRefresh}, {marketOperationalStore}, employmentHistory, employmentProvider, employmentStore, earningsModule, consumptionSeed, consumptionSeedJson, {calculateMarket}]=await Promise.all([
   import('../../worker/market-operational-refresh.mjs'),
   import('../../worker/market-operational-store.mjs'),
   import('../../lib/market-score/employment-r4-history-backfill.mjs'),
   import('../../lib/market-score/employment-r4-shadow-provider.mjs'),
   import('../../lib/market-score/employment-r4-shadow-store.mjs'),
   import('../../lib/market-score/sec-earnings-e1-r4-provider.mjs'),
   import('../../worker/consumption-r3-seed.mjs'),
   Promise.resolve((()=>{const text=fs.readFileSync(path.join(root,'lib','market-score','c1-r3-e6-seed.json'),'utf8');return {seed:JSON.parse(text),sha256:createHash('sha256').update(text).digest('hex')}})()),
   import('./market.mjs'),
  ]);
  const store=marketOperationalStore(core);
  const calc=async()=>({calculation:'PC_ONE_YEAR_BACKFILL_PENDING'});

  let pipelineBusy=false;
  for(const job of GENERIC_JOBS){
   const result=await runMarketOperationalRefresh({env,job,store,now:Date.now(),fetchImpl:globalThis.fetch,calculate:calc});
   stage(`job:${job}`,result);
   if(result?.status==='ALREADY_RUNNING'){pipelineBusy=true;break;}
   report.quota=quota.summary();
   if((report.quota?.guarded??0)>0)break;
  }

  if(!pipelineBusy&&(quota.summary()?.guarded??0)===0){
   const currentEmployment=await runMarketOperationalRefresh({env,job:'employment',store,now:Date.now(),fetchImpl:globalThis.fetch,calculate:calc});
   stage('job:employment-current',currentEmployment);
   if(currentEmployment?.status==='ALREADY_RUNNING')pipelineBusy=true;

   if(!pipelineBusy){
   const now=()=>new Date();
   const empStore=employmentStore.createEmploymentR4ShadowStore(core,{now});
   await empStore.initialize();
   const lease=await empStore.acquire('employment-r4-history-claims',{ttlMs:15*60*1000});
   if(!lease?.acquired)stage('employment:claims-108w',{status:'SKIPPED_LOCKED',providerRequests:0});
   else{
    try{
     const provider=employmentProvider.createEmploymentR4ShadowProvider({fetchImpl:globalThis.fetch,now});
     const result=await employmentHistory.collectClaimsHistoricalCurrent({db:core,provider,now,totalWeeks:EMPLOYMENT_CLAIMS_WEEKS,batchWeeks:8,geographyCount:51});
     stage('employment:claims-108w',result);
    }finally{await empStore.release(lease).catch(()=>false)}
   }
   }
  }

  if(!pipelineBusy&&(quota.summary()?.guarded??0)===0){
   const seeded=await consumptionSeed.persistConsumptionC1R3AcceptedSeed(core,consumptionSeedJson.seed,{seedSha256:consumptionSeedJson.sha256});
   stage('consumption:accepted-16q-seed',{status:seeded.status,providerRequests:0});
  }

  if(!pipelineBusy&&(quota.summary()?.guarded??0)===0){
   for(const anchor of earningsAnchors(asOf)){
    const result=await earningsModule.collectEarningsE1R4ToStore({asOf:anchor,fetchImpl:globalThis.fetch,now:()=>new Date(),db:core});
    stage(`earnings:${anchor}`,result);
    report.quota=quota.summary();
    if((report.quota?.guarded??0)>0)break;
   }
  }

  if(!pipelineBusy&&(quota.summary()?.guarded??0)===0){
   const breadth=await runMarketOperationalRefresh({env,job:'breadth',store,now:Date.now(),fetchImpl:globalThis.fetch,calculate:calc});
   stage('job:breadth-current',breadth);
   stage('breadth:one-year-history',{status:'DEFERRED_PIT_UNIVERSE_SOURCE_NOT_WIRED',providerRequests:0});
  }

  const evidence=async(sql,params=[])=>{try{return (await core.prepare(sql).bind(...params).all()).results??[]}catch{return []}};
  const claims=await evidence(`SELECT observation_date,COUNT(DISTINCT geography_code) AS n FROM market_score_employment_r4_shadow_current_v1 WHERE logical_series_id='STATE_INITIAL_CLAIMS' GROUP BY observation_date HAVING n>=51 ORDER BY observation_date`);
  report.storageEvidence.employmentClaims={completeWeeks:claims.length,first:claims.at(0)?.observation_date??null,last:claims.at(-1)?.observation_date??null,targetWeeks:EMPLOYMENT_CLAIMS_WEEKS};
  const consumption=await evidence(`SELECT score_date,COUNT(*) AS n FROM c1_r3_candidate_scores_v1 GROUP BY score_date HAVING n=95 ORDER BY score_date`);
  report.storageEvidence.consumption={completeQuarters:consumption.length,first:consumption.at(0)?.score_date??null,last:consumption.at(-1)?.score_date??null};
  const earnings=await evidence(`SELECT period_end,COUNT(*) AS n FROM market_score_earnings_e1_r3_current_v1 GROUP BY period_end ORDER BY period_end`);
  report.storageEvidence.earnings={periods:earnings.length,first:earnings.at(0)?.period_end??null,last:earnings.at(-1)?.period_end??null,targetPeriods:EARNINGS_QUARTERS};
  const breadth=await evidence(`SELECT trade_date,COUNT(*) AS n FROM market_score_breadth_b1_r3_current_v1 GROUP BY trade_date ORDER BY trade_date`);
  report.storageEvidence.breadth={sessions:breadth.length,first:breadth.at(0)?.trade_date??null,last:breadth.at(-1)?.trade_date??null};

  const body=await calculateMarket(root,core,Date.now());
  report.coverage=(Array.isArray(body?.domains)?body.domains:[]).map(trendCoverage);
  report.quota=quota.summary();
  const allOneYear=report.coverage.length===12&&report.coverage.every(x=>x.oneYear);
  const quotaGuarded=(report.quota?.guarded??0)>0;
  report.status=allOneYear?'COMPLETE':pipelineBusy?'RUNNING_PIPELINE_BUSY':quotaGuarded?'RUNNING_QUOTA_GUARDED':'PARTIAL';
  report.completedAt=new Date().toISOString();
  checkpoint();
  return report;
 }catch(error){
  report.status='FAILED';
  report.error=/^[A-Z0-9_:-]+$/.test(String(error?.message??''))?String(error.message):String(error?.code??'ONE_YEAR_BACKFILL_FAILED');
  report.completedAt=new Date().toISOString();
  report.quota=quota.summary();
  checkpoint();
  throw error;
 }finally{
  globalThis.fetch=originalFetch;
  hooks.deregister();
  core.close();history.close();release();
 }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 backfillOneYear().then(result=>console.log(JSON.stringify(result))).catch(error=>{
  console.log(JSON.stringify({status:'FAILED',code:/^[A-Z0-9_:-]+$/.test(String(error?.message??''))?String(error.message):String(error?.code??'ONE_YEAR_BACKFILL_FAILED')}));
  process.exitCode=1;
 });
}
