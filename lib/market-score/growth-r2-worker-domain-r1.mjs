import {GROWTH_R2_FEATURE_IDS,GROWTH_R2_METHOD,GROWTH_R2_WEIGHTS} from "./growth-r2-contract.mjs";
import {GROWTH_R2_SEED_ROWS} from "./growth-r2-seed-r1.mjs";
import {collectGrowthR2ForwardRecords} from "./growth-r2-forward-provider-r1.mjs";
import {collectGrowthR2RecentChartHistory,GROWTH_R2_CHART_STORAGE_MONTHS} from "./growth-r2-chart-history-r1.mjs";
import {ensureGrowthR2HistoricalSeed,persistGrowthR2ForwardBatch,readGrowthR2History,persistGrowthR2ChartHistory,readGrowthR2ChartHistory} from "./growth-r2-d1-store-r1.mjs";

const finite=v=>typeof v==="number"&&Number.isFinite(v);
const clamp=v=>Math.max(0,Math.min(100,v));
function addMonths(iso,n){const d=new Date(iso);if(Number.isNaN(d.getTime()))return null;const y=d.getUTCFullYear(),m=d.getUTCMonth()+n;return new Date(Date.UTC(y+Math.floor(m/12),((m%12)+12)%12,d.getUTCDate(),23,59,59,999)).toISOString();}
function latestHistory(rows,id,asOf){const by=new Map();for(const r of rows){if(r.candidateId!==id||r.pitEligible!==true||r.availableAt>asOf||!finite(r.harmonizedValue))continue;const p=by.get(r.observationDate);if(!p||r.availableAt>p.availableAt)by.set(r.observationDate,r);}return [...by.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate));}
function percentile(rows){const out=[];const h=[];for(const r of rows){const x=r.harmonizedValue;h.push(x);if(h.length<GROWTH_R2_METHOD.minHistory)continue;const less=h.filter(v=>v<x).length,eq=h.filter(v=>v===x).length;out.push({...r,featureScore:clamp(100*(less+0.5*(eq-1))/(h.length-1)),validHistory:h.length});}return out;}
async function hashIdentity(v){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(v)));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("");}

function evaluateStoredGrowthAt(rows,asOf){
  const factors={},missingFactors=[],staleFactors=[],identity=[],cutoff=`${asOf}T23:59:59.999Z`;
  for(const id of GROWTH_R2_FEATURE_IDS){
    const scored=percentile(latestHistory(rows,id,cutoff)),r=scored.at(-1);
    if(!r){missingFactors.push(id);continue;}
    const deadline=addMonths(r.availableAt,2);
    if(!deadline||cutoff>deadline){staleFactors.push(id);continue;}
    factors[id]={score:r.featureScore,observationDate:r.observationDate,availableAt:r.availableAt,validHistory:r.validHistory};
    identity.push([id,r.observationDate,r.availableAt,r.harmonizedValue,r.sourceHash]);
  }
  const coverage=Object.keys(factors).length;
  if(missingFactors.length||staleFactors.length||coverage!==24)return {status:"NOT_READY",score:null,coverage,missingFactors,staleFactors,factors,identity};
  let score=0;for(const id of GROWTH_R2_FEATURE_IDS)score+=factors[id].score*GROWTH_R2_WEIGHTS[id];
  return {status:"READY",score:clamp(score),coverage,missingFactors:[],staleFactors:[],factors,identity};
}
function oneYearMonths(asOf){const d=new Date(`${asOf}T00:00:00Z`);if(Number.isNaN(d.getTime()))return [];const out=[];for(let n=12;n>=0;n--)out.push(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-n,1)).toISOString().slice(0,10));return out;}
function buildStoredGrowthTrend(chartRows,asOf,currentScore){
  const out=[];
  for(const label of oneYearMonths(asOf)){
    const synthetic=chartRows.filter(r=>r.observationDate<=label).map(r=>({...r,pitEligible:true,availableAt:`${asOf}T12:00:00.000Z`}));
    const r=evaluateStoredGrowthAt([...GROWTH_R2_SEED_ROWS,...synthetic],asOf);
    if(r.status==="READY"&&finite(r.score))out.push({label,value:r.score});
  }
  if(finite(currentScore)){const month=asOf.slice(0,7),i=out.findIndex(x=>x.label.slice(0,7)===month);if(i>=0)out.splice(i,1,{label:asOf,value:currentScore});else out.push({label:asOf,value:currentScore});}
  return out.sort((a,b)=>a.label.localeCompare(b.label)).slice(-13);
}

export async function buildStoredGrowthR2Domain(rows,{asOf,trendRows=[]}={}){
  const current=evaluateStoredGrowthAt(rows,asOf),inputSnapshotId=await hashIdentity(current.identity);
  if(current.status!=="READY")return {status:"NOT_READY",score:null,coverage:current.coverage,requiredCoverage:24,missingFactors:current.missingFactors,staleFactors:current.staleFactors,factors:current.factors,inputSnapshotId,methodologyVersion:GROWTH_R2_METHOD.methodologyVersion,trend:[],indicators:[],freshness:"STORED_D1_HISTORY_ONLY",updatedAt:null};
  const factors=current.factors,score=current.score;
  const ui=["G010","G019","G035","G060"].map(id=>({id,score:factors[id].score,status:"READY",observationDate:factors[id].observationDate}));
  const latest=Object.values(factors).map(x=>x.observationDate).sort().at(-1)??null;
  const trend=buildStoredGrowthTrend(trendRows,asOf,score);
  return {status:"READY",score,coverage:current.coverage,requiredCoverage:24,missingFactors:[],staleFactors:[],factors,inputSnapshotId,methodologyVersion:GROWTH_R2_METHOD.methodologyVersion,trend,indicators:ui,freshness:"STORED_D1_HISTORY_ONLY",updatedAt:latest,interpretation:"Growth R2: 24/24 stored feature history -> expanding percentile -> approved W2 weights; no missing reweight"};
}
export async function loadStoredGrowthR2PublicDomainR1(db,{asOf}={}){
  if(!db?.prepare)return {status:"NOT_READY",score:null,coverage:0,requiredCoverage:24,missingFactors:["GROWTH_R2_DB_UNAVAILABLE"],staleFactors:[],methodologyVersion:GROWTH_R2_METHOD.methodologyVersion};
  try{const [rows,trendRows]=await Promise.all([readGrowthR2History(db,{asOf,initializeSchema:false}),readGrowthR2ChartHistory(db,{initializeSchema:false})]);return await buildStoredGrowthR2Domain(rows,{asOf,trendRows});}
  catch(e){return {status:"NOT_READY",score:null,coverage:0,requiredCoverage:24,missingFactors:[`GROWTH_R2_READ:${e instanceof Error?e.message:"UNKNOWN"}`],staleFactors:[],methodologyVersion:GROWTH_R2_METHOD.methodologyVersion};}
}
export async function ensureGrowthR2ChartHistoryR1({env,asOf,fetchImpl=fetch,now=()=>new Date()}={}){
  if(!env?.DB)return {status:"SKIPPED_DB_UNAVAILABLE"};
  const existing=await readGrowthR2ChartHistory(env.DB),d=new Date(`${asOf}T00:00:00Z`),target=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-2,1)).toISOString().slice(0,10),requiredStart=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-(GROWTH_R2_CHART_STORAGE_MONTHS-1),1)).toISOString().slice(0,10),latestBy=new Map(),earliestBy=new Map();
  for(const r of existing){if(!latestBy.has(r.candidateId)||r.observationDate>latestBy.get(r.candidateId))latestBy.set(r.candidateId,r.observationDate);if(!earliestBy.has(r.candidateId)||r.observationDate<earliestBy.get(r.candidateId))earliestBy.set(r.candidateId,r.observationDate);}
  const missing=GROWTH_R2_FEATURE_IDS.filter(id=>(latestBy.get(id)??"")<target||(earliestBy.get(id)??"9999-12-31")>requiredStart);
  if(!missing.length)return {status:"READY",rowsWritten:0,recordCount:existing.length,target,requiredStart};
  const collected=await collectGrowthR2RecentChartHistory({env,asOf,fetchImpl,now}),stored=await persistGrowthR2ChartHistory(env.DB,{records:collected.records});
  return {status:"STORED",rowsWritten:stored.rowsWritten,recordCount:collected.records.length,cutoff:collected.cutoff,target,requiredStart};
}
export async function collectGrowthR2StoreOnlyR1({env,asOf,fetchImpl=fetch,now=()=>new Date()}={}){
  if(!env?.DB)return {status:"SKIPPED_DB_UNAVAILABLE"};
  const step=async(phase,run)=>{
    console.log('GROWTH_R2_COLLECTION_PHASE',JSON.stringify({phase,status:'START'}));
    try{const result=await run();console.log('GROWTH_R2_COLLECTION_PHASE',JSON.stringify({phase,status:'COMPLETE'}));return result;}
    catch(error){
      const reason=String(error?.message??'').match(/^GROWTH_R2_[A-Z0-9_]+/)?.[0]??(['TimeoutError','AbortError'].includes(error?.name)?error.name:'UNCLASSIFIED');
      console.warn('GROWTH_R2_COLLECTION_PHASE',JSON.stringify({phase,status:'ERROR',reason}));throw error;
    }
  };
  const seed=await step('SEED',()=>ensureGrowthR2HistoricalSeed(env.DB,{nowIso:now().toISOString()}));
  const chart=await step('CHART',()=>ensureGrowthR2ChartHistoryR1({env,asOf,fetchImpl,now}));
  const forward=await step('FORWARD',()=>collectGrowthR2ForwardRecords({env,asOf,fetchImpl,seedRows:GROWTH_R2_SEED_ROWS,now}));
  const stored=await step('STORE',()=>persistGrowthR2ForwardBatch(env.DB,forward));
  return {status:"STORED",seed,chart,forward:{recordCount:forward.records.length,providerRequestCount:forward.providerRequestCount,retrievedAt:forward.retrievedAt},stored};
}
export const GROWTH_R2_WORKER_DOMAIN_CONTRACT=Object.freeze({collectorRole:"EXTERNAL_FETCH_NORMALIZE_STORE_ONLY",calculatorRole:"D1_STORED_HISTORY_ONLY",calculatorNetworkRequests:0,activationPolicy:"PUBLIC_GROWTH_OVERRIDE_ONLY_WHEN_READY_24_OF_24; OTHERWISE PRESERVE_D2"});
