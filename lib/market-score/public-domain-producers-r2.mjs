import {normalizeRows} from "../diagnostic-layer/series-math.mjs";

export const K1_R2_METHOD="K1-R2-INDEPENDENT-LATEST-R1";
export const K1_R2_MAX_LAG_MONTHS=2;
export const K1_R2_WEIGHTS=Object.freeze({
  wti:0.30,
  brent:0.25,
  copper:0.25,
  gasoline:0.20,
});

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const finiteScore=value=>finite(value)&&value>=0&&value<=100;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const monthKey=date=>validDate(date)?date.slice(0,7):null;
const monthIndex=date=>{
  const key=monthKey(date);
  if(!key)return null;
  const [year,month]=key.split("-").map(Number);
  return year*12+month-1;
};
const monthDate=month=>`${month}-01`;

function shiftMonth(month,delta){
  const m=/^(\d{4})-(\d{2})$/.exec(month??"");
  if(!m)return null;
  const total=Number(m[1])*12+Number(m[2])-1+delta;
  const year=Math.floor(total/12),mo=total-year*12+1;
  return `${String(year).padStart(4,"0")}-${String(mo).padStart(2,"0")}`;
}
function lastByMonth(rows){
  const map=new Map();
  for(const row of normalizeRows(rows))map.set(monthKey(row.observationDate),row.value);
  return map;
}
function safeLogRatio(a,b){return a>0&&b>0?Math.log(a/b):null;}
function trailingPercentile(values,index,{lookback=240,minValid=60,inverse=true}={}){
  const current=values[index];
  if(!finite(current))return null;
  const ref=values.slice(Math.max(0,index-lookback+1),index+1).filter(finite);
  if(ref.length<minValid)return null;
  let lower=0,equal=0;
  for(const value of ref){
    if(value<current)lower++;
    else if(value===current)equal++;
  }
  const rank=(lower+0.5*equal)/ref.length;
  return 100*(inverse?1-rank:rank);
}

export function buildCommodityShockScoreSeries(rows=[]){
  const values=lastByMonth(rows);
  const months=[...values.keys()].filter(Boolean).sort();
  const shocks=months.map(month=>{
    const current=values.get(month);
    const prior1=values.get(shiftMonth(month,-1));
    const prior3=values.get(shiftMonth(month,-3));
    const one=safeLogRatio(current,prior1);
    const three=safeLogRatio(current,prior3);
    return [one,three].every(finite)?Math.max(0,one,three):null;
  });
  return months.flatMap((month,index)=>{
    const score=trailingPercentile(shocks,index,{lookback:240,minValid:60,inverse:true});
    return finiteScore(score)?[{
      observationDate:monthDate(month),
      score,
      shock:shocks[index],
    }]:[];
  });
}

function latestFresh(series,asOfDate,maxLagMonths){
  const asOfIndex=monthIndex(asOfDate);
  if(asOfIndex===null)return {status:"UNAVAILABLE",row:null,lagMonths:null};
  const row=(Array.isArray(series)?series:[])
    .filter(item=>validDate(item?.observationDate)&&item.observationDate<=asOfDate&&finiteScore(item?.score))
    .sort((a,b)=>a.observationDate.localeCompare(b.observationDate))
    .at(-1)??null;
  if(!row)return {status:"UNAVAILABLE",row:null,lagMonths:null};
  const rowIndex=monthIndex(row.observationDate);
  const lagMonths=rowIndex===null?null:asOfIndex-rowIndex;
  if(!Number.isInteger(lagMonths)||lagMonths<0||lagMonths>maxLagMonths){
    return {status:"STALE",row,lagMonths};
  }
  return {status:"READY",row,lagMonths};
}

const COMPONENTS=Object.freeze([
  Object.freeze({key:"wti",name:"WTI",weight:K1_R2_WEIGHTS.wti,source:"FRED/EIA MCOILWTICO",missing:"WTI_SCORE_MISSING",stale:"WTI_SCORE_STALE"}),
  Object.freeze({key:"brent",name:"Brent",weight:K1_R2_WEIGHTS.brent,source:"FRED/EIA MCOILBRENTEU",missing:"BRENT_SCORE_MISSING",stale:"BRENT_SCORE_STALE"}),
  Object.freeze({key:"copper",name:"구리",weight:K1_R2_WEIGHTS.copper,source:"World Bank Pink Sheet",missing:"COPPER_SCORE_MISSING",stale:"COPPER_SCORE_STALE"}),
  Object.freeze({key:"gasoline",name:"휘발유",weight:K1_R2_WEIGHTS.gasoline,source:"FRED/EIA GASREGCOVM",missing:"GASOLINE_SCORE_MISSING",stale:"GASOLINE_SCORE_STALE"}),
]);

function componentSnapshot(seriesByKey,asOfDate,maxLagMonths){
  return COMPONENTS.map(spec=>{
    const found=latestFresh(seriesByKey[spec.key],asOfDate,maxLagMonths);
    const ready=found.status==="READY";
    return {
      ...spec,
      status:ready?"READY":"UNAVAILABLE",
      score:ready?found.row.score:null,
      asOfDate:found.row?.observationDate??null,
      lagMonths:found.lagMonths,
      freshness:ready?(found.lagMonths===0?"CURRENT_MONTH":`LAG_${found.lagMonths}_MONTHS`):"UNAVAILABLE",
      reason:ready?null:(found.status==="STALE"?spec.stale:spec.missing),
    };
  });
}
function scoreSnapshot(components){
  return components.reduce((sum,item)=>sum+item.weight*item.score,0);
}
function buildTrend(seriesByKey,asOfDate,maxLagMonths){
  const dates=[...new Set(Object.values(seriesByKey).flatMap(series=>
    (Array.isArray(series)?series:[]).map(row=>row.observationDate)
  ))].filter(date=>validDate(date)&&date<=asOfDate).sort();

  let trend=[],previousMonth=null;
  for(const date of dates){
    const currentMonth=monthIndex(date);
    if(previousMonth!==null&&currentMonth!==previousMonth+1)trend=[];
    previousMonth=currentMonth;

    const snapshot=componentSnapshot(seriesByKey,date,maxLagMonths);
    if(!snapshot.every(item=>item.status==="READY")){
      trend=[];
      continue;
    }
    trend.push({label:date,value:scoreSnapshot(snapshot)});
  }
  return trend;
}

export function buildCommoditiesK1R2({
  wtiRows=[],
  brentRows=[],
  copperRows=[],
  gasolineRows=[],
  asOfDate,
  maxLagMonths=K1_R2_MAX_LAG_MONTHS,
}={}){
  if(!validDate(asOfDate))return {
    status:"PARTIAL",score:null,missingFactors:["K1_R2_ASOF_INVALID"],indicators:[],trend:[],
    freshness:"UNAVAILABLE",updatedAt:null,methodologyVersion:K1_R2_METHOD,
  };
  const seriesByKey={
    wti:buildCommodityShockScoreSeries(wtiRows),
    brent:buildCommodityShockScoreSeries(brentRows),
    copper:buildCommodityShockScoreSeries(copperRows),
    gasoline:buildCommodityShockScoreSeries(gasolineRows),
  };
  const components=componentSnapshot(seriesByKey,asOfDate,maxLagMonths);
  const missingFactors=components.filter(item=>item.status!=="READY").map(item=>item.reason);
  const indicators=components.map(item=>({
    name:item.name,
    score:item.score,
    status:item.status,
    asOfDate:item.asOfDate,
    observationDate:item.asOfDate,
    source:item.source,
    freshness:item.freshness,
    lagMonths:item.lagMonths,
  }));
  if(missingFactors.length){
    return {
      status:"PARTIAL",score:null,missingFactors,indicators,trend:[],
      freshness:`INDEPENDENT_LATEST_MAX_${maxLagMonths}_MONTHS`,
      updatedAt:null,methodologyVersion:K1_R2_METHOD,
      interpretation:"K1-R2: WTI 30% + Brent 25% + 구리 25% + 휘발유 20%; 각 구성요소 최신 유효 점수를 독립 선택하며 결측 재가중 금지",
    };
  }
  const score=scoreSnapshot(components);
  const updatedAt=components.map(item=>item.asOfDate).filter(Boolean).sort().at(-1)??null;
  return {
    status:"READY",score,missingFactors:[],indicators,
    trend:buildTrend(seriesByKey,asOfDate,maxLagMonths),
    freshness:`INDEPENDENT_LATEST_MAX_${maxLagMonths}_MONTHS`,
    updatedAt,methodologyVersion:K1_R2_METHOD,
    interpretation:"K1-R2: WTI 30% + Brent 25% + 구리 25% + 휘발유 20%; 각 구성요소 최신 유효 점수를 독립 선택하며 결측 재가중 금지",
    percentileContract:"INVERSE_TRAILING_240_MONTHLY_MIN60",
  };
}
