export const BREADTH_R2_PUBLIC_DOMAIN_R1 = "BREADTH-R2-PUBLIC-DOMAIN-R1";

const DEFINITIONS = Object.freeze([
  {id:"breadth-37",name:"해외 포트폴리오 주식수급",source:"BEA ITA"},
  {id:"breadth-38",name:"주식공급 폭",source:"SEC XBRL Frames"},
  {id:"breadth-39",name:"기관 선물 포지션",source:"CFTC TFF"},
  {id:"breadth-40",name:"레버리지 선물 포지션",source:"CFTC TFF"},
]);

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const scoreOk=value=>finite(value)&&value>=0&&value<=100;
const mean=values=>{
  const usable=values.filter(finite);
  return usable.length?usable.reduce((sum,value)=>sum+value,0)/usable.length:null;
};

function detailDate(candidate,id){
  const detail=(candidate?.details??[]).find(item=>item?.id===id);
  return detail?.observationDate??null;
}

function sourceFreshness(result,id){
  if(id==="breadth-37")return result?.sources?.bea?.status??null;
  if(id==="breadth-38"){
    const a=result?.sources?.secPrevious?.status??null;
    const b=result?.sources?.secCurrent?.status??null;
    return a===b?a:[a,b].filter(Boolean).join("+")||null;
  }
  return result?.sources?.cftc?.status??null;
}

function rawValue(item,id){
  if(id==="breadth-37")return finite(item?.value)?item.value:null;
  if(id==="breadth-38")return finite(item?.breadth)?100*item.breadth:null;
  if(id==="breadth-39"||id==="breadth-40")return mean((item?.components??[]).map(x=>x?.levelPct));
  return null;
}

function unitFor(result,id){
  if(id==="breadth-37"){
    const input=result?.candidate?.inputs?.foreignPortfolio;
    return input?.unitMult===6?"백만달러":(input?.sourceUnit??"");
  }
  if(id==="breadth-38")return "%";
  if(id==="breadth-39"||id==="breadth-40")return "% OI";
  return "";
}

function observationFor(result,candidate,id){
  if(id==="breadth-38")return result?.secPeriodPolicy?.current?.frame??detailDate(candidate,id);
  return detailDate(candidate,id);
}

export function buildBreadthR2UnavailablePublicDomain(reason="BREADTH_R2_UNAVAILABLE",updatedAt=null){
  return {
    id:"breadth",
    name:"수급·폭",
    source:"ZGMINI_BREADTH_R2_METHOD_R1",
    methodologyVersion:"ZGMINI_BREADTH_R2_METHOD_R1",
    status:"PARTIAL",
    score:null,
    state:null,
    interpretation:null,
    trend:[],
    indicators:DEFINITIONS.map(def=>({
      id:def.id,name:def.name,label:def.name,status:"PARTIAL",score:null,value:null,unit:"",
      asOfDate:null,observationDate:null,source:def.source,sourceKey:def.id,
      freshness:null,missing:[reason],
    })),
    freshness:"UNAVAILABLE",
    updatedAt,
    asOfDate:null,
    missingFactors:[reason],
  };
}

export function projectBreadthR2FinalPublicDomain(result={}){
  const candidate=result?.candidate??null;
  if(!candidate){
    return buildBreadthR2UnavailablePublicDomain(
      result?.missingFactors?.[0]??"BREADTH_R2_CANDIDATE_UNAVAILABLE",
      result?.runtime?.now??null,
    );
  }

  const byId=new Map((candidate?.indicators??[]).map(item=>[item?.id,item]));
  const indicators=DEFINITIONS.map(def=>{
    const item=byId.get(def.id)??null;
    const ready=item?.status==="READY"&&scoreOk(item?.score);
    const observationDate=observationFor(result,candidate,def.id);
    const value=rawValue(item,def.id);
    return {
      id:def.id,
      name:def.name,
      label:def.name,
      status:ready?"READY":"PARTIAL",
      score:ready?item.score:null,
      value,
      unit:unitFor(result,def.id),
      asOfDate:observationDate,
      observationDate,
      source:def.source,
      sourceKey:def.id,
      freshness:sourceFreshness(result,def.id),
      missing:ready?[]:[item?.reason??"BREADTH_R2_DETAIL_NOT_READY"],
    };
  });

  const ready=result?.status==="READY"&&scoreOk(result?.score);
  const detailMissing=indicators
    .filter(item=>item.status!=="READY")
    .flatMap(item=>item.missing??[]);

  return {
    id:"breadth",
    name:"수급·폭",
    source:"ZGMINI_BREADTH_R2_METHOD_R1",
    methodologyVersion:result?.methodologyVersion??"ZGMINI_BREADTH_R2_METHOD_R1",
    status:ready?"READY":"PARTIAL",
    score:ready?result.score:null,
    state:ready?(result?.state??null):null,
    interpretation:ready?(result?.interpretation??null):null,
    trend:[],
    indicators,
    freshness:"MIXED_FREQUENCY",
    updatedAt:result?.runtime?.now??null,
    asOfDate:result?.runtime?.asOfDate??null,
    missingFactors:[
      ...new Set([
        ...(Array.isArray(result?.missingFactors)?result.missingFactors:[]),
        ...detailMissing,
      ]),
    ],
  };
}

export function assertBreadthR2PublicContract(domain){
  if(!domain||domain.id!=="breadth")throw new Error("BREADTH_PUBLIC_ID_INVALID");
  if(domain.name!=="수급·폭")throw new Error("BREADTH_PUBLIC_NAME_INVALID");
  if(!Array.isArray(domain.indicators)||domain.indicators.length!==4)throw new Error("BREADTH_PUBLIC_DETAIL_COUNT_INVALID");
  const ids=domain.indicators.map(item=>item.id);
  if(JSON.stringify(ids)!==JSON.stringify(DEFINITIONS.map(x=>x.id)))throw new Error("BREADTH_PUBLIC_DETAIL_ORDER_INVALID");
  if(domain.status==="READY"&&!scoreOk(domain.score))throw new Error("BREADTH_PUBLIC_READY_SCORE_INVALID");
  if(domain.status!=="READY"&&domain.score!==null)throw new Error("BREADTH_PUBLIC_PARTIAL_SCORE_MUST_BE_NULL");
  return true;
}
