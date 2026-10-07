export const BREADTH_R6_SHADOW_METHOD="BREADTH_R6_COMPONENTS_SHADOW_R1";
export const BREADTH_R6_MIN_COVERAGE=0.98;

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);

function normalizeRows(rows=[]){
  return (Array.isArray(rows)?rows:[])
    .map(row=>({
      tradeDate:String(row?.trade_date??row?.tradeDate??""),
      ticker:String(row?.ticker??"").trim(),
      previousClose:Number(row?.previous_close??row?.previousClose),
      currentClose:Number(row?.current_close??row?.currentClose),
      currentVolume:Number(row?.current_volume??row?.currentVolume),
    }))
    .filter(row=>validDate(row.tradeDate)&&row.ticker&&finite(row.previousClose)&&row.previousClose>0&&finite(row.currentClose)&&row.currentClose>0&&finite(row.currentVolume)&&row.currentVolume>=0)
    .sort((a,b)=>a.tradeDate.localeCompare(b.tradeDate)||a.ticker.localeCompare(b.ticker));
}

function mean(values){return values.reduce((sum,value)=>sum+value,0)/values.length}

export function buildBreadthR6Components({rows=[],members=[],asOfDate=null,minCoverage=BREADTH_R6_MIN_COVERAGE}={}){
  const normalized=normalizeRows(rows).filter(row=>!asOfDate||row.tradeDate<=asOfDate);
  const currentDate=normalized.at(-1)?.tradeDate??null;
  const universe=[...new Set((members??[]).map(x=>String(x??"").trim()).filter(Boolean))].sort();
  if(!currentDate||universe.length<490)return {status:"PARTIAL",reason:"BREADTH_R6_CURRENT_UNIVERSE_MISSING",methodologyVersion:BREADTH_R6_SHADOW_METHOD,mode:"SHADOW_ONLY"};

  const byTicker=new Map();
  for(const row of normalized){
    const arr=byTicker.get(row.ticker)??[];
    arr.push(row);byTicker.set(row.ticker,arr);
  }
  const currentRows=new Map(normalized.filter(row=>row.tradeDate===currentDate).map(row=>[row.ticker,row]));
  const required=Math.ceil(universe.length*minCoverage);

  let ready1d=0,up1d=0,valueUp=0,valueTotal=0;
  let ready20=0,up20=0;
  let ready50=0,above50=0;
  let ready200=0,above200=0;
  let ready252=0,newHigh=0,newLow=0;

  for(const ticker of universe){
    const series=(byTicker.get(ticker)??[]).filter(row=>row.tradeDate<=currentDate);
    const current=currentRows.get(ticker);
    if(current){
      ready1d++;
      const adv=current.currentClose>current.previousClose;
      if(adv)up1d++;
      const turnover=current.currentClose*current.currentVolume;
      if(finite(turnover)&&turnover>=0){
        valueTotal+=turnover;
        if(adv)valueUp+=turnover;
      }
    }
    if(series.length>=21){
      ready20++;
      if(series.at(-1).currentClose>series.at(-21).currentClose)up20++;
    }
    if(series.length>=50){
      ready50++;
      const sample=series.slice(-50).map(row=>row.currentClose);
      if(series.at(-1).currentClose>mean(sample))above50++;
    }
    if(series.length>=200){
      ready200++;
      const sample=series.slice(-200).map(row=>row.currentClose);
      if(series.at(-1).currentClose>mean(sample))above200++;
    }
    if(series.length>=252){
      ready252++;
      const sample=series.slice(-252).map(row=>row.currentClose);
      const latest=series.at(-1).currentClose;
      if(latest>=Math.max(...sample))newHigh++;
      if(latest<=Math.min(...sample))newLow++;
    }
  }

  const ratios={
    advance1d:ready1d?up1d/ready1d:null,
    advanceValueShare1d:valueTotal>0?valueUp/valueTotal:null,
    advance20d:ready20?up20/ready20:null,
    aboveMa50:ready50?above50/ready50:null,
    aboveMa200:ready200?above200/ready200:null,
    newHigh52w:ready252?newHigh/ready252:null,
    newLow52w:ready252?newLow/ready252:null,
    highLowNet52w:ready252?(newHigh-newLow)/ready252:null,
  };
  const coverage={
    universe:universe.length,required,
    oneDay:ready1d,twentyDay:ready20,ma50:ready50,ma200:ready200,highLow52w:ready252,
  };
  const readiness={
    oneDay:ready1d>=required,
    twentyDay:ready20>=required,
    ma50:ready50>=required,
    ma200:ready200>=required,
    highLow52w:ready252>=required,
  };
  const allReady=Object.values(readiness).every(Boolean);
  return {
    status:allReady?"READY":"PARTIAL",
    reason:allReady?null:"BREADTH_R6_HISTORY_INCOMPLETE",
    asOfDate:currentDate,
    methodologyVersion:BREADTH_R6_SHADOW_METHOD,
    mode:"SHADOW_ONLY",
    productionFormulaChanged:false,
    score:null,
    scoreStatus:"PENDING_WEIGHT_APPROVAL",
    coverage,readiness,ratios,
  };
}
