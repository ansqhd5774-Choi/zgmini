export const COMPOSITE_MODEL_VERSION = "CM-R1";

export const DOMAIN_WEIGHTS = Object.freeze([
  Object.freeze({id:"inflation",name:"물가",weight:8}),
  Object.freeze({id:"employment",name:"고용",weight:7}),
  Object.freeze({id:"rates",name:"금리",weight:10}),
  Object.freeze({id:"credit",name:"채권·신용",weight:10}),
  Object.freeze({id:"growth",name:"경기",weight:8}),
  Object.freeze({id:"consumption",name:"소비",weight:7}),
  Object.freeze({id:"earnings",name:"실적",weight:13}),
  Object.freeze({id:"liquidity",name:"유동성",weight:10}),
  Object.freeze({id:"fundFlows",name:"자금흐름",weight:8}),
  Object.freeze({id:"breadth",name:"수급·폭",weight:8}),
  Object.freeze({id:"dollarFx",name:"달러·환율",weight:5}),
  Object.freeze({id:"commodities",name:"유가·원자재",weight:6}),
]);

const finiteScore=(v)=>Number.isFinite(v)&&v>=0&&v<=100;

export function buildCompositeMarketScore(domainResults,{updatedAt=null}={}){
  const byId=new Map((domainResults??[]).map(d=>[d?.id,d]));
  const domains=DOMAIN_WEIGHTS.map(spec=>{
    const src=byId.get(spec.id)??null;
    const ready=src?.status==="READY"&&finiteScore(src?.score);
    return {
      id:spec.id,
      name:spec.name,
      weight:spec.weight,
      score:ready?src.score:null,
      status:ready?"READY":(src?.status??"UNAVAILABLE"),
      state:ready?(src?.state??null):null,
      interpretation:src?.interpretation??null,
      trend:Array.isArray(src?.trend)?src.trend:[],
      indicators:Array.isArray(src?.indicators)?src.indicators:[],
      freshness:src?.freshness??null,
      updatedAt:src?.updatedAt??null,
      ...(spec.id==="breadth"?{methodologyVersion:src?.methodologyVersion??null,asOfDate:src?.asOfDate??null}:{}),
      ...(spec.id==="earnings"?{methodologyVersion:src?.methodologyVersion??null}:{}),
      missingFactors:Array.isArray(src?.missingFactors)?src.missingFactors:[],
    };
  });

  const ready=domains.filter(d=>d.status==="READY"&&finiteScore(d.score));
  const missingDomains=domains.filter(d=>d.status==="UNAVAILABLE").map(d=>d.id);
  const partialDomains=domains.filter(d=>d.status!=="READY"&&d.status!=="UNAVAILABLE").map(d=>d.id);
  const coverageWeight=ready.reduce((sum,d)=>sum+d.weight,0);
  const overallComputable=ready.length===DOMAIN_WEIGHTS.length&&coverageWeight===100;

  const score=overallComputable
    ? domains.reduce((sum,d)=>sum+d.score*d.weight,0)/100
    : null;

  return {
    modelVersion:COMPOSITE_MODEL_VERSION,
    overall:{
      score,
      status:overallComputable?"READY":"PARTIAL",
      state:null,
      trend:[],
    },
    domains,
    updatedAt,
    dataQuality:{
      readyDomains:ready.length,
      totalDomains:DOMAIN_WEIGHTS.length,
      missingDomains,
      partialDomains,
      coverageWeight,
      overallComputable,
      reweighted:false,
    },
  };
}
