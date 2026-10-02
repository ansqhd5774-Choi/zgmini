import {GROWTH_R2_FEATURE_IDS,GROWTH_R2_METHOD,GROWTH_R2_WEIGHTS} from "./growth-r2-contract.mjs";
import {GROWTH_R2_SEED_ROWS} from "./growth-r2-seed-r1.mjs";
import {collectGrowthR2ForwardStage,GROWTH_R2_FORWARD_STAGE_IDS} from "./growth-r2-forward-stage-r1.mjs";
import {collectGrowthR2RecentChartHistory} from "./growth-r2-chart-history-r1.mjs";
import {ensureGrowthR2HistoricalSeed,persistGrowthR2ForwardBatch,persistGrowthR2ForwardStage,readGrowthR2ForwardStage,clearGrowthR2ForwardStage,readGrowthR2History,persistGrowthR2ChartHistory,readGrowthR2ChartHistory} from "./growth-r2-d1-store-r1.mjs";

const finite=v=>typeof v==="number"&&Number.isFinite(v);
const clamp=v=>Math.max(0,Math.min(100,v));
function addMonths(iso,n){const d=new Date(iso);if(Number.isNaN(d.getTime()))return null;const y=d.getUTCFullYear(),m=d.getUTCMonth()+n;return new Date(Date.UTC(y+Math.floor(m/12),((m%12)+12)%12,d.getUTCDate(),23,59,59,999)).toISOString();}
function latestHistory(rows,id,asOf){const by=new Map();for(const r of rows){if(r.candidateId!==id||r.pitEligible!==true||r.availableAt>asOf||!finite(r.harmonizedValue))continue;const p=by.get(r.observationDate);if(!p||r.availableAt>p.availableAt)by.set(r.observationDate,r);}return [...by.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate));}
function percentile(rows){const out=[];const h=[];for(const r of rows){const x=r.harmonizedValue;h.push(x);if(h.length<GROWTH_R2_METHOD.minHistory)continue;const less=h.filter(v=>v<x).length,eq=h.filter(v=>v===x).length;out.push({...r,featureScore:clamp(100*(less+0.5*(eq-1))/(h.length-1)),validHistory:h.length});}return out;}
async function hashIdentity(v){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(v)));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("");}
function evaluateStoredGrowthAt(rows,asOf){
  const factors={},missingFactors=[],staleFactors=[],identity=[];const cutoff=`${asOf}T23:59:59.999Z`;
  for(const id of GROWTH_R2_FEATURE_IDS){const scored=percentile(latestHistory(rows,id,cutoff));const r=scored.at(-1);if(!r){missingFactors.push(id);continue;}const deadline=addMonths(r.availableAt,2);if(!deadline||cutoff>deadline){staleFactors.push(id);continue;}factors[id]={score:r.featureScore,observationDate:r.observationDate,availableAt:r.availableAt,validHistory:r.validHistory};identity.push([id,r.observationDate,r.availableAt,r.harmonizedValue,r.sourceHash]);}
  const coverage=Object.keys(factors).length;if(missingFactors.length||staleFactors.length||coverage!==24)return {status:"NOT_READY",score:null,coverage,missingFactors,staleFactors,factors,identity};
  let score=0;for(const id of GROWTH_R2_FEATURE_IDS)score+=factors[id].score*GROWTH_R2_WEIGHTS[id];return {status:"READY",score:clamp(score),coverage,missingFactors:[],staleFactors:[],factors,identity};
}
function oneYearMonths(asOf){const d=new Date(`${asOf}T00:00:00Z`);if(Number.isNaN(d.getTime()))return [];const out=[];for(let n=11;n>=0;n--)out.push(new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-n,1)).toISOString().slice(0,10));return out;}
function buildStoredGrowthTrend(chartRows,asOf,currentScore,currentLabel){const out=[];for(const label of oneYearMonths(asOf)){const synthetic=chartRows.filter(r=>r.observationDate<=label).map(r=>({...r,pitEligible:true,availableAt:`${asOf}T12:00:00.000Z`}));const r=evaluateStoredGrowthAt([...GROWTH_R2_SEED_ROWS,...synthetic],asOf);if(r.status==="READY"&&finite(r.score))out.push({label,value:r.score});}if(finite(currentScore)&&currentLabel){const i=out.findIndex(x=>x.label===currentLabel);if(i>=0)out.splice(i,1);out.push({label:currentLabel,value:currentScore});}return out.sort((a,b)=>a.label.localeCompare(b.label)).slice(-13);}
export async function buildStoredGrowthR2Domain(rows,{asOf,trendRows=[]}={}){
  const current=evaluateStoredGrowthAt(rows,asOf);const inputSnapshotId=await hashIdentity(current.identity);
  if(current.status!=="READY")return {status:"NOT_READY",score:null,coverage:current.coverage,requiredCoverage:24,missingFactors:current.missingFactors,staleFactors:current.staleFactors,factors:current.factors,inputSnapshotId,methodologyVersion:GROWTH_R2_METHOD.methodologyVersion,trend:[],indicators:[],freshness:"STORED_D1_HISTORY_ONLY",updatedAt:null};
  const factors=current.factors,score=current.score;const ui=["G010","G019","G035","G060"].map(id=>({id,score:factors[id].score,status:"READY",observationDate:factors[id].observationDate}));const latest=Object.values(factors).map(x=>x.observationDate).sort().at(-1)??null;const trend=buildStoredGrowthTrend(trendRows,asOf,score,asOf);return {status:"READY",score,coverage:current.coverage,requiredCoverage:24,missingFactors:[],staleFactors:[],factors,inputSnapshotId,methodologyVersion:GROWTH_R2_METHOD.methodologyVersion,trend,indicators:ui,freshness:"STORED_D1_HISTORY_ONLY",updatedAt:latest,interpretation:"Growth R2: 24/24 stored feature history -> expanding percentile -> approved W2 weights; no missing reweight"};
}
export async function loadStoredGrowthR2PublicDomainR1(db,{asOf}={}){if(!db?.prepare)return {status:"NOT_READY",score:null,coverage:0,requiredCoverage:24,missingFactors:["GROWTH_R2_DB_UNAVAILABLE"],staleFactors:[],methodologyVersion:GROWTH_R2_METHOD.methodologyVersion};try{const [rows,trendRows]=await Promise.all([readGrowthR2History(db,{asOf}),readGrowthR2ChartHistory(db)]);return await buildStoredGrowthR2Domain(rows,{asOf,trendRows});}catch(e){return {status:"NOT_READY",score:null,coverage:0,requiredCoverage:24,missingFactors:[`GROWTH_R2_READ:${e instanceof Error?e.message:"UNKNOWN"}`],staleFactors:[],methodologyVersion:GROWTH_R2_METHOD.methodologyVersion};}}
export async function ensureGrowthR2ChartHistoryR1({env,asOf,fetchImpl=fetch,now=()=>new Date()}={}){
 if(!env?.DB)return {status:"SKIPPED_DB_UNAVAILABLE"};
 const chartExisting=await readGrowthR2ChartHistory(env.DB),d=new Date(`${asOf}T00:00:00Z`),target=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-2,1)).toISOString().slice(0,10),latestBy=new Map();
 for(const r of chartExisting)if(!latestBy.has(r.candidateId)||r.observationDate>latestBy.get(r.candidateId))latestBy.set(r.candidateId,r.observationDate);
 const missing=GROWTH_R2_FEATURE_IDS.filter(id=>(latestBy.get(id)??"")<target);if(!missing.length)return {status:"READY",rowsWritten:0,recordCount:chartExisting.length,target};
 const collected=await collectGrowthR2RecentChartHistory({env,asOf,fetchImpl,seedRows:GROWTH_R2_SEED_ROWS,now});const stored=await persistGrowthR2ChartHistory(env.DB,{records:collected.records});
 return {status:"STORED",rowsWritten:stored.rowsWritten,recordCount:collected.records.length,cutoff:collected.cutoff,target};
}
export async function collectGrowthR2StoreOnlyR1({env,asOf,fetchImpl=fetch,now=()=>new Date()}={}){
 if(!env?.DB)return {status:"SKIPPED_DB_UNAVAILABLE"};
 const seed=await ensureGrowthR2HistoricalSeed(env.DB,{nowIso:now().toISOString()});
 const chart=await ensureGrowthR2ChartHistoryR1({env,asOf,fetchImpl,now});
 const staged=await readGrowthR2ForwardStage(env.DB),have=new Set(staged.map(r=>r.candidateId));const stage=Object.entries(GROWTH_R2_FORWARD_STAGE_IDS).find(([,ids])=>ids.some(id=>!have.has(id)))?.[0]??null;
 if(stage){const forward=await collectGrowthR2ForwardStage({stage,env,asOf,fetchImpl,seedRows:GROWTH_R2_SEED_ROWS,now});const stagedWrite=await persistGrowthR2ForwardStage(env.DB,forward);const all=await readGrowthR2ForwardStage(env.DB);if(all.length<24)return {status:"PARTIAL_BATCH",stage,seed,chart,forward:{recordCount:forward.records.length,providerRequestCount:forward.providerRequestCount,retrievedAt:forward.retrievedAt},staged:all.length,stagedWrite};}
 const all=await readGrowthR2ForwardStage(env.DB);if(all.length!==24)return {status:"PARTIAL_BATCH",stage:null,seed,chart,staged:all.length};const stored=await persistGrowthR2ForwardBatch(env.DB,{records:all,snapshots:[]});await clearGrowthR2ForwardStage(env.DB);return {status:"STORED",stage:"FINALIZE",seed,chart,forward:{recordCount:all.length,providerRequestCount:0,retrievedAt:now().toISOString()},stored};
}
export const GROWTH_R2_WORKER_DOMAIN_CONTRACT=Object.freeze({collectorRole:"EXTERNAL_FETCH_NORMALIZE_STORE_ONLY",calculatorRole:"D1_STORED_HISTORY_ONLY",calculatorNetworkRequests:0,activationPolicy:"PUBLIC_GROWTH_OVERRIDE_ONLY_WHEN_READY_24_OF_24; OTHERWISE PRESERVE_D2"});
