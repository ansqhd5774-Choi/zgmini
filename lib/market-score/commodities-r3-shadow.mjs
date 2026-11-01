import {buildCommodityShockScoreSeries} from "./public-domain-producers-r2.mjs";

export const COMMODITIES_R3_SHADOW_METHOD="COMMODITIES_R3_SHADOW_R1";
export const COMMODITIES_R3_SHADOW_WEIGHTS=Object.freeze({
  oilShock:0.50,
  gasolineBurden:0.20,
  copperGrowth:0.30,
});

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const finiteScore=value=>finite(value)&&value>=0&&value<=100;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const monthIndex=date=>{
  if(!validDate(date))return null;
  const [year,month]=date.slice(0,7).split("-").map(Number);
  return year*12+month-1;
};
const shiftMonth=(date,delta)=>{
  if(!validDate(date))return null;
  const [y,m]=date.slice(0,7).split("-").map(Number);
  const d=new Date(Date.UTC(y,m-1+delta,1));
  return d.toISOString().slice(0,10);
};
const clamp=value=>Math.max(0,Math.min(100,value));
function normalizeRows(rows=[]){
  const map=new Map();
  for(const row of rows??[]){
    const date=row?.observationDate??row?.date;
    const value=Number(row?.value);
    if(validDate(date)&&finite(value))map.set(date.slice(0,7)+"-01",{observationDate:date.slice(0,7)+"-01",value});
  }
  return [...map.values()].sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
}
function percentile(values,current){
  if(!values.length||!finite(current))return null;
  let below=0,equal=0;
  for(const value of values){if(value<current)below++;else if(value===current)equal++}
  return 100*(below+0.5*equal)/values.length;
}
export function buildCopperGrowthScoreSeries(rows=[],{lookback=240,minValid=60}={}){
  const normalized=normalizeRows(rows),byMonth=new Map(normalized.map(row=>[row.observationDate.slice(0,7),row]));
  const changes=normalized.map(row=>{
    const prior=byMonth.get(shiftMonth(row.observationDate,-3)?.slice(0,7));
    const value=prior&&prior.value>0&&row.value>0?100*Math.log(row.value/prior.value):null;
    return {observationDate:row.observationDate,value};
  });
  return changes.flatMap((row,index)=>{
    if(!finite(row.value))return [];
    const ref=changes.slice(Math.max(0,index-lookback+1),index+1).map(item=>item.value).filter(finite);
    if(ref.length<minValid)return [];
    const score=percentile(ref,row.value);
    return finiteScore(score)?[{observationDate:row.observationDate,score,change3m:row.value}]:[];
  });
}
function latestFresh(series,asOfDate,maxLagMonths=2){
  const current=(series??[]).filter(row=>validDate(row?.observationDate)&&row.observationDate<=asOfDate&&finiteScore(row?.score)).sort((a,b)=>a.observationDate.localeCompare(b.observationDate)).at(-1)??null;
  if(!current)return null;
  const lag=monthIndex(asOfDate)-monthIndex(current.observationDate);
  return Number.isInteger(lag)&&lag>=0&&lag<=maxLagMonths?{...current,lagMonths:lag}:null;
}
export function buildCommoditiesR3Shadow({
  wtiRows=[],brentRows=[],gasolineRows=[],copperRows=[],asOfDate,maxLagMonths=2,
}={}){
  if(!validDate(asOfDate))return {status:"PARTIAL",score:null,reason:"COMMODITIES_R3_ASOF_INVALID",methodologyVersion:COMMODITIES_R3_SHADOW_METHOD,mode:"SHADOW_ONLY"};
  const series={
    wti:buildCommodityShockScoreSeries(wtiRows),
    brent:buildCommodityShockScoreSeries(brentRows),
    gasoline:buildCommodityShockScoreSeries(gasolineRows),
    copper:buildCopperGrowthScoreSeries(copperRows),
  };
  const current={
    wti:latestFresh(series.wti,asOfDate,maxLagMonths),
    brent:latestFresh(series.brent,asOfDate,maxLagMonths),
    gasoline:latestFresh(series.gasoline,asOfDate,maxLagMonths),
    copper:latestFresh(series.copper,asOfDate,maxLagMonths),
  };
  const missing=Object.entries(current).filter(([,value])=>!value).map(([key])=>key);
  if(missing.length)return {status:"PARTIAL",score:null,reason:"COMMODITIES_R3_INPUT_MISSING",missingFactors:missing,methodologyVersion:COMMODITIES_R3_SHADOW_METHOD,mode:"SHADOW_ONLY"};
  const oilShock=0.5*current.wti.score+0.5*current.brent.score;
  const score=clamp(
    COMMODITIES_R3_SHADOW_WEIGHTS.oilShock*oilShock+
    COMMODITIES_R3_SHADOW_WEIGHTS.gasolineBurden*current.gasoline.score+
    COMMODITIES_R3_SHADOW_WEIGHTS.copperGrowth*current.copper.score
  );
  const dates=[...new Set(Object.values(series).flatMap(rows=>rows.map(row=>row.observationDate)))].filter(date=>date<=asOfDate).sort();
  const trend=[];
  for(const date of dates){
    const point={
      wti:latestFresh(series.wti,date,maxLagMonths),
      brent:latestFresh(series.brent,date,maxLagMonths),
      gasoline:latestFresh(series.gasoline,date,maxLagMonths),
      copper:latestFresh(series.copper,date,maxLagMonths),
    };
    if(Object.values(point).some(value=>!value))continue;
    const oil=0.5*point.wti.score+0.5*point.brent.score;
    trend.push({label:date,value:clamp(
      COMMODITIES_R3_SHADOW_WEIGHTS.oilShock*oil+
      COMMODITIES_R3_SHADOW_WEIGHTS.gasolineBurden*point.gasoline.score+
      COMMODITIES_R3_SHADOW_WEIGHTS.copperGrowth*point.copper.score
    )});
  }
  return {
    status:"READY",score,
    components:{
      oilShock,
      gasolineBurden:current.gasoline.score,
      copperGrowth:current.copper.score,
      wti:current.wti.score,
      brent:current.brent.score,
    },
    weights:{...COMMODITIES_R3_SHADOW_WEIGHTS},
    trend:trend.slice(-24),
    methodologyVersion:COMMODITIES_R3_SHADOW_METHOD,
    interpretation:"Shadow R3: WTI/Brent combined oil shock 50% + gasoline burden 20% + copper 3M growth signal 30%.",
    mode:"SHADOW_ONLY",productionFormulaChanged:false,
  };
}
