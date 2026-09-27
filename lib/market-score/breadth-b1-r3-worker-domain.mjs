import {B1_R3_BATCH_SIZE,B1_R3_METHOD,B1_R3_PROVIDER} from "./breadth-b1-r3-contract.mjs";
import {collectBreadthB1R3ToStore} from "./breadth-b1-r3-collector.mjs";
import {createBreadthB1R3Store} from "./breadth-b1-r3-store.mjs";
import {readBreadthB1R3StoredScore} from "./breadth-b1-r3-reader.mjs";

export const B1_R3_WORKER_DOMAIN="B1-R3-WORKER-DOMAIN-R1";

const validDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const pct=v=>finite(v)?Math.max(0,Math.min(100,100*v)):null;

const DETAILS=Object.freeze([
  {id:"breadth-37",name:"상승종목비율"},
  {id:"breadth-38",name:"상승거래대금비율"},
  {id:"breadth-39",name:"수익률커버리지"},
  {id:"breadth-40",name:"거래대금커버리지"},
]);

export function buildBreadthB1R3UnavailablePublicDomain(reason="B1_R3_UNAVAILABLE",asOfDate=null,updatedAt=null){
  return {
    id:"breadth",name:"수급·폭",source:B1_R3_PROVIDER,methodologyVersion:B1_R3_METHOD,
    status:"PARTIAL",score:null,state:null,interpretation:null,trend:[],
    indicators:DETAILS.map(def=>({
      id:def.id,name:def.name,label:def.name,status:"PARTIAL",score:null,value:null,unit:"%",
      asOfDate:null,observationDate:null,source:B1_R3_PROVIDER,sourceKey:def.id,
      freshness:"UNAVAILABLE",missing:[reason],
    })),
    freshness:"UNAVAILABLE",updatedAt,asOfDate,missingFactors:[reason],
  };
}

export function projectBreadthB1R3PublicDomain(result={},updatedAt=null){
  const ready=result?.status==="READY"&&finite(result?.score);
  if(!ready){
    return buildBreadthB1R3UnavailablePublicDomain(
      result?.missing?.[0]??result?.missingFactors?.[0]??"B1_R3_STORED_COVERAGE_MISSING",
      result?.runtime?.asOfDate??null,
      updatedAt,
    );
  }
  const components=result?.components??{},quality=result?.quality??{};
  const vals=[
    pct(components.advanceRatio),
    pct(components.advanceValueShare),
    pct(quality.returnCoverage),
    pct(quality.tradingValueCoverage),
  ];
  const observationDate=result?.observationDate??result?.runtime?.observationDate??null;
  const lag=Number(result?.runtime?.lagTradingSessions??quality?.lagTradingSessions??0);
  const freshness=Number.isFinite(lag)?(lag===0?"CURRENT":`LAG_${lag}_SESSIONS`):"UNKNOWN";
  return {
    id:"breadth",name:"수급·폭",source:result?.source??B1_R3_PROVIDER,
    methodologyVersion:result?.methodologyVersion??B1_R3_METHOD,
    status:"READY",score:result.score,state:result?.state??null,
    interpretation:result?.interpretation??null,trend:[],
    indicators:DETAILS.map((def,i)=>({
      id:def.id,name:def.name,label:def.name,status:finite(vals[i])?"READY":"PARTIAL",
      score:vals[i],value:vals[i],unit:"%",
      asOfDate:observationDate,observationDate,source:result?.source??B1_R3_PROVIDER,sourceKey:def.id,
      freshness,missing:finite(vals[i])?[]:["B1_R3_DETAIL_VALUE_MISSING"],
    })),
    freshness,updatedAt,asOfDate:result?.runtime?.asOfDate??null,
    missingFactors:[],
    attribution:result?.attribution??null,
  };
}

export function assertBreadthB1R3PublicContract(domain){
  if(!domain||domain.id!=="breadth"||domain.name!=="수급·폭")throw new Error("B1_R3_PUBLIC_ID_INVALID");
  if(!Array.isArray(domain.indicators)||domain.indicators.length!==4)throw new Error("B1_R3_PUBLIC_DETAIL_COUNT_INVALID");
  if(JSON.stringify(domain.indicators.map(x=>x.id))!==JSON.stringify(DETAILS.map(x=>x.id)))throw new Error("B1_R3_PUBLIC_DETAIL_ORDER_INVALID");
  if(domain.status==="READY"&&!finite(domain.score))throw new Error("B1_R3_PUBLIC_READY_SCORE_INVALID");
  if(domain.status!=="READY"&&domain.score!==null)throw new Error("B1_R3_PUBLIC_PARTIAL_SCORE_MUST_BE_NULL");
  return true;
}

export async function collectBreadthB1R3StoreOnlyR1({
  env={},asOf,fetchImpl=globalThis.fetch,
  storeFactory=createBreadthB1R3Store,collector=collectBreadthB1R3ToStore,
}={}){
  if(!validDate(asOf))return {status:"SKIPPED_INVALID_ASOF",providerRequests:0,scoreComputed:false};
  if(!env?.DB)return {status:"SKIPPED_STORAGE_CONFIGURATION_MISSING",providerRequests:0,scoreComputed:false};
  const store=storeFactory(env.DB);
  await store.initialize();
  const prior=await store.latestSuccessfulRun(asOf);
  if(prior)return {status:"SKIPPED_ALREADY_SUCCESS",providerRequests:0,scoreComputed:false,priorRunId:prior.run_id??prior.runId??null};
  return await collector({
    env,db:env.DB,store,asOfDate:asOf,fetchImpl,
    batchSize:B1_R3_BATCH_SIZE,
    concurrency:8,
    // Cloudflare Free request budget: universe + catalogue + 40 ticker files = 42.
    // No same-run retry; failed tickers are retried by the next background collection run.
    maxAttemptsPerCall:1,
  });
}

export async function readBreadthB1R3StoredPublicDomainR1({
  env={},asOf,runtimeOptions={},storedScoreReader=readBreadthB1R3StoredScore,
}={}){
  const now=runtimeOptions?.now??(()=>new Date());
  const instant=now();
  const updatedAt=instant instanceof Date&&!Number.isNaN(instant.valueOf())?instant.toISOString():null;
  if(!validDate(asOf))return buildBreadthB1R3UnavailablePublicDomain("B1_R3_ASOF_INVALID",asOf,updatedAt);
  if(!env?.DB)return buildBreadthB1R3UnavailablePublicDomain("B1_R3_STORAGE_CONFIGURATION_MISSING",asOf,updatedAt);
  try{
    const result=await storedScoreReader({env,db:env.DB,asOfDate:asOf,now:()=>instant});
    const domain=projectBreadthB1R3PublicDomain(result,updatedAt);
    assertBreadthB1R3PublicContract(domain);
    return domain;
  }catch{
    return buildBreadthB1R3UnavailablePublicDomain("B1_R3_STORED_RUNTIME_UNAVAILABLE",asOf,updatedAt);
  }
}
