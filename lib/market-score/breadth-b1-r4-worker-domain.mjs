import {readBreadthB1R4StoredScore} from "./breadth-b1-r4-reader.mjs";
import {B1_R4_METHOD,B1_R4_SOURCE} from "./breadth-b1-r4-contract.mjs";

export const B1_R4_WORKER_DOMAIN="B1-R4-WORKER-DOMAIN-R1";

const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const pct=value=>finite(value)?Math.max(0,Math.min(100,100*value)):null;

const DETAILS=Object.freeze([
  {id:"breadth-37",name:"상승종목비율"},
  {id:"breadth-38",name:"상승거래대금비율"},
  {id:"breadth-39",name:"수익률커버리지"},
  {id:"breadth-40",name:"거래대금커버리지"},
]);

export function buildBreadthB1R4UnavailablePublicDomain(reason="B1_R4_UNAVAILABLE",asOfDate=null,updatedAt=null){
  return {
    id:"breadth",name:"수급·폭",source:B1_R4_SOURCE,methodologyVersion:B1_R4_METHOD,
    status:"PARTIAL",score:null,state:null,interpretation:null,trend:[],
    indicators:DETAILS.map(def=>({
      id:def.id,name:def.name,label:def.name,status:"PARTIAL",score:null,value:null,unit:"%",
      asOfDate:null,observationDate:null,source:B1_R4_SOURCE,sourceKey:def.id,
      freshness:"UNAVAILABLE",missing:[reason],
    })),
    freshness:"UNAVAILABLE",updatedAt,asOfDate,missingFactors:[reason],
  };
}

export function projectBreadthB1R4PublicDomain(result={},updatedAt=null){
  const ready=result?.status==="READY"&&finite(result?.score);
  if(!ready){
    return buildBreadthB1R4UnavailablePublicDomain(
      result?.missing?.[0]??result?.missingFactors?.[0]??"B1_R4_STORED_COVERAGE_MISSING",
      result?.runtime?.asOfDate??null,
      updatedAt,
    );
  }

  const components=result?.components??{},quality=result?.quality??{};
  const values=[
    pct(components.advanceRatio),
    pct(components.advanceValueShare),
    pct(quality.returnCoverage),
    pct(quality.tradingValueCoverage),
  ];
  const observationDate=result?.observationDate??result?.runtime?.observationDate??null;
  const lag=Number(result?.runtime?.lagTradingSessions??quality?.lagTradingSessions??0);
  const freshness=Number.isFinite(lag)?(lag===0?"CURRENT":`LAG_${lag}_SESSIONS`):"UNKNOWN";
  const source=result?.source??B1_R4_SOURCE;

  return {
    id:"breadth",name:"수급·폭",source,
    methodologyVersion:result?.methodologyVersion??B1_R4_METHOD,
    status:"READY",score:result.score,state:result?.state??null,
    interpretation:result?.interpretation??null,
    trend:Array.isArray(result?.trend)?result.trend:[],
    indicators:DETAILS.map((def,index)=>({
      id:def.id,name:def.name,label:def.name,status:finite(values[index])?"READY":"PARTIAL",
      score:values[index],value:values[index],unit:"%",
      asOfDate:observationDate,observationDate,source,sourceKey:def.id,
      freshness,missing:finite(values[index])?[]:["B1_R4_DETAIL_VALUE_MISSING"],
    })),
    freshness,updatedAt,asOfDate:result?.runtime?.asOfDate??null,
    missingFactors:[],
    smoothing:result?.smoothing??null,
    sourceList:Array.isArray(result?.sourceList)?result.sourceList:[],
  };
}

export function assertBreadthB1R4PublicContract(domain){
  if(!domain||domain.id!=="breadth"||domain.name!=="수급·폭")throw new Error("B1_R4_PUBLIC_ID_INVALID");
  if(!Array.isArray(domain.indicators)||domain.indicators.length!==4)throw new Error("B1_R4_PUBLIC_DETAIL_COUNT_INVALID");
  if(JSON.stringify(domain.indicators.map(x=>x.id))!==JSON.stringify(DETAILS.map(x=>x.id)))throw new Error("B1_R4_PUBLIC_DETAIL_ORDER_INVALID");
  if(domain.status==="READY"&&!finite(domain.score))throw new Error("B1_R4_PUBLIC_READY_SCORE_INVALID");
  if(domain.status!=="READY"&&domain.score!==null)throw new Error("B1_R4_PUBLIC_PARTIAL_SCORE_MUST_BE_NULL");
  return true;
}

export async function readBreadthB1R4StoredPublicDomainR1({
  env={},asOf,runtimeOptions={},storedScoreReader=readBreadthB1R4StoredScore,
}={}){
  const now=runtimeOptions?.now??(()=>new Date());
  const instant=now();
  const updatedAt=instant instanceof Date&&!Number.isNaN(instant.valueOf())?instant.toISOString():null;
  if(!validDate(asOf))return buildBreadthB1R4UnavailablePublicDomain("B1_R4_ASOF_INVALID",asOf,updatedAt);
  if(!env?.DB)return buildBreadthB1R4UnavailablePublicDomain("B1_R4_STORAGE_CONFIGURATION_MISSING",asOf,updatedAt);
  try{
    const result=await storedScoreReader({env,db:env.DB,asOfDate:asOf,now:()=>instant});
    const domain=projectBreadthB1R4PublicDomain(result,updatedAt);
    assertBreadthB1R4PublicContract(domain);
    return domain;
  }catch{
    return buildBreadthB1R4UnavailablePublicDomain("B1_R4_STORED_RUNTIME_UNAVAILABLE",asOf,updatedAt);
  }
}
