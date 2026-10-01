import {readBreadthB1R5StoredScore} from "./breadth-b1-r5-reader.mjs";
import {B1_R5_METHOD,B1_R5_SOURCE} from "./breadth-b1-r5-contract.mjs";

export const B1_R5_WORKER_DOMAIN="B1-R5-WORKER-DOMAIN-R1";

const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const pct=value=>finite(value)?Math.max(0,Math.min(100,100*value)):null;

const DETAILS=Object.freeze([
  {id:"breadth-41",name:"상승종목비율",unit:"%"},
  {id:"breadth-42",name:"상승거래대금비율",unit:"%"},
  {id:"breadth-43",name:"5일 수급 EMA",unit:"점"},
  {id:"breadth-44",name:"20일 수급 EMA",unit:"점"},
]);

export function buildBreadthB1R5UnavailablePublicDomain(reason="B1_R5_UNAVAILABLE",asOfDate=null,updatedAt=null){
  return {
    id:"breadth",name:"수급·폭",source:B1_R5_SOURCE,methodologyVersion:B1_R5_METHOD,
    status:"PARTIAL",score:null,state:null,interpretation:null,trend:[],
    indicators:DETAILS.map(def=>({
      id:def.id,name:def.name,label:def.name,status:"PARTIAL",score:null,value:null,unit:def.unit,
      asOfDate:null,observationDate:null,source:B1_R5_SOURCE,sourceKey:def.id,
      freshness:"UNAVAILABLE",missing:[reason],
    })),
    freshness:"UNAVAILABLE",updatedAt,asOfDate,missingFactors:[reason],
  };
}

export function projectBreadthB1R5PublicDomain(result={},updatedAt=null){
  const ready=result?.status==="READY"&&finite(result?.score);
  if(!ready){
    return buildBreadthB1R5UnavailablePublicDomain(
      result?.missing?.[0]??result?.missingFactors?.[0]??"B1_R5_STORED_COVERAGE_MISSING",
      result?.runtime?.asOfDate??null,
      updatedAt,
    );
  }

  const components=result?.components??{},smoothing=result?.smoothing??{};
  const values=[
    pct(components.advanceRatio),
    pct(components.advanceValueShare),
    finite(smoothing.ema5)?Math.max(0,Math.min(100,smoothing.ema5)):null,
    finite(smoothing.ema20)?Math.max(0,Math.min(100,smoothing.ema20)):null,
  ];
  const observationDate=result?.observationDate??result?.runtime?.observationDate??null;
  const lag=Number(result?.runtime?.lagTradingSessions??result?.quality?.lagTradingSessions??0);
  const freshness=Number.isFinite(lag)?(lag===0?"CURRENT":`LAG_${lag}_SESSIONS`):"UNKNOWN";
  const source=result?.source??B1_R5_SOURCE;

  return {
    id:"breadth",name:"수급·폭",source,
    methodologyVersion:result?.methodologyVersion??B1_R5_METHOD,
    status:"READY",score:result.score,state:result?.state??null,
    interpretation:result?.interpretation??null,
    trend:Array.isArray(result?.trend)?result.trend:[],
    indicators:DETAILS.map((def,index)=>({
      id:def.id,name:def.name,label:def.name,status:finite(values[index])?"READY":"PARTIAL",
      score:values[index],value:values[index],unit:def.unit,
      asOfDate:observationDate,observationDate,source,sourceKey:def.id,
      freshness,missing:finite(values[index])?[]:["B1_R5_DETAIL_VALUE_MISSING"],
    })),
    freshness,updatedAt,asOfDate:result?.runtime?.asOfDate??null,
    missingFactors:[],
    smoothing:result?.smoothing??null,
    factors:result?.factors??null,
    sourceList:Array.isArray(result?.sourceList)?result.sourceList:[],
  };
}

export function assertBreadthB1R5PublicContract(domain){
  if(!domain||domain.id!=="breadth"||domain.name!=="수급·폭")throw new Error("B1_R5_PUBLIC_ID_INVALID");
  if(!Array.isArray(domain.indicators)||domain.indicators.length!==4)throw new Error("B1_R5_PUBLIC_DETAIL_COUNT_INVALID");
  if(JSON.stringify(domain.indicators.map(x=>x.id))!==JSON.stringify(DETAILS.map(x=>x.id)))throw new Error("B1_R5_PUBLIC_DETAIL_ORDER_INVALID");
  if(domain.status==="READY"&&!finite(domain.score))throw new Error("B1_R5_PUBLIC_READY_SCORE_INVALID");
  if(domain.status!=="READY"&&domain.score!==null)throw new Error("B1_R5_PUBLIC_PARTIAL_SCORE_MUST_BE_NULL");
  return true;
}

export async function readBreadthB1R5StoredPublicDomainR1({
  env={},asOf,runtimeOptions={},storedScoreReader=readBreadthB1R5StoredScore,
}={}){
  const now=runtimeOptions?.now??(()=>new Date());
  const instant=now();
  const updatedAt=instant instanceof Date&&!Number.isNaN(instant.valueOf())?instant.toISOString():null;
  if(!validDate(asOf))return buildBreadthB1R5UnavailablePublicDomain("B1_R5_ASOF_INVALID",asOf,updatedAt);
  if(!env?.DB)return buildBreadthB1R5UnavailablePublicDomain("B1_R5_STORAGE_CONFIGURATION_MISSING",asOf,updatedAt);
  try{
    const result=await storedScoreReader({env,db:env.DB,asOfDate:asOf,now:()=>instant});
    const domain=projectBreadthB1R5PublicDomain(result,updatedAt);
    assertBreadthB1R5PublicContract(domain);
    return domain;
  }catch{
    return buildBreadthB1R5UnavailablePublicDomain("B1_R5_STORED_RUNTIME_UNAVAILABLE",asOf,updatedAt);
  }
}
