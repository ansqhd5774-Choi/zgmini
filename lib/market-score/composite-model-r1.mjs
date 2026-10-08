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

const dateKey=value=>{
  if(typeof value!=="string")return null;
  const match=value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?match[1]:null;
};

const trendPointScore=point=>{
  const value=finiteScore(point?.value)?point.value:finiteScore(point?.score)?point.score:null;
  const date=dateKey(point?.label)??dateKey(point?.date)??dateKey(point?.observationDate)??dateKey(point?.asOfDate);
  return value===null||date===null?null:{date,value};
};

function compositeAnchors(series,asOfDate,count=370){
  const key=dateKey(asOfDate);
  if(!key)return [];
  const dates=new Set([key]);
  for(const rows of series.values()){
    for(const point of rows){
      if(point.date<=key)dates.add(point.date);
    }
  }
  const ordered=[...dates].sort();
  const limit=Math.max(1,Math.trunc(Number(count)||370));
  return ordered.slice(-limit);
}

function latestAtOrBefore(points,anchor){
  let found=null;
  for(const point of points){
    if(point.date>anchor)break;
    found=point;
  }
  return found;
}

export function buildCompositeTrend(domains,{asOfDate=null,currentScore=null,points=370}={}){
  const series=new Map();
  for(const spec of DOMAIN_WEIGHTS){
    const domain=(domains??[]).find(item=>item?.id===spec.id)??null;
    const rows=(Array.isArray(domain?.trend)?domain.trend:[])
      .map(trendPointScore)
      .filter(Boolean)
      .sort((a,b)=>a.date.localeCompare(b.date));
    series.set(spec.id,rows);
  }
  const anchors=compositeAnchors(series,asOfDate,points);
  if(!anchors.length)return [];
  const currentKey=anchors.at(-1);
  const history=[];
  for(const anchor of anchors.slice(0,-1)){
    let complete=true;
    let weighted=0;
    for(const spec of DOMAIN_WEIGHTS){
      const point=latestAtOrBefore(series.get(spec.id)??[],anchor);
      if(!point){complete=false;break;}
      weighted+=point.value*spec.weight;
    }
    if(complete)history.push({label:anchor,value:weighted/100});
  }
  if(finiteScore(currentScore)&&currentKey){
    history.push({label:currentKey,value:currentScore});
  }
  return history;
}

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
      ...(spec.id==="rates"?{modelVersion:src?.modelVersion??null}:{}),
      ...(spec.id==="credit"?{methodologyVersion:src?.methodologyVersion??null}:{}),
      ...(spec.id==="dollarFx"?{methodologyVersion:src?.methodologyVersion??null}:{}),
      ...(spec.id==="fundFlows"?{methodologyVersion:src?.methodologyVersion??null}:{}),
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

  const trend=overallComputable
    ? buildCompositeTrend(domains,{asOfDate:updatedAt,currentScore:score,points:370})
    : [];

  return {
    modelVersion:COMPOSITE_MODEL_VERSION,
    overall:{
      score,
      status:overallComputable?"READY":"PARTIAL",
      state:null,
      trend,
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
