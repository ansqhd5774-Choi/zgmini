import {
  BREADTH_R8_MIN_COVERAGE,
  BREADTH_R8_WEIGHTS,
  breadthR8UniverseForDate,
  buildBreadthR8Components as buildBreadthR8ComponentsR1,
} from './breadth-r8-shadow.mjs';

export const BREADTH_R8_SHADOW_R2_METHOD='BREADTH_R8_13FACTOR_SHADOW_R2_VALID_SESSIONS';

const finite=value=>typeof value==='number'&&Number.isFinite(value);
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const clamp=value=>Math.max(0,Math.min(100,value));

function normalizeRows(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const tradeDate=String(row?.trade_date??row?.tradeDate??row?.date??'');
    const ticker=String(row?.ticker??row?.symbol??'').trim();
    const currentClose=Number(row?.current_close??row?.currentClose??row?.close);
    if(!validDate(tradeDate)||!ticker||!finite(currentClose)||currentClose<=0)continue;
    map.set(`${tradeDate}|${ticker}`,{tradeDate,ticker,currentClose});
  }
  return [...map.values()].sort((a,b)=>a.tradeDate.localeCompare(b.tradeDate)||a.ticker.localeCompare(b.ticker));
}

function mean(values){return values.reduce((sum,value)=>sum+value,0)/values.length}

function buildValidSessionLongFactors({rows=[],universes=[],currentDate,minCoverage=BREADTH_R8_MIN_COVERAGE}={}){
  const universe=breadthR8UniverseForDate(universes,currentDate);
  if(!universe)return {status:'PARTIAL',reason:'BREADTH_R8_CURRENT_UNIVERSE_MISSING'};
  const required=Math.ceil(universe.members.length*minCoverage);
  const memberSet=new Set(universe.members);
  const byTicker=new Map();
  for(const row of normalizeRows(rows)){
    if(row.tradeDate>currentDate||!memberSet.has(row.ticker))continue;
    const list=byTicker.get(row.ticker)??[];
    list.push(row);byTicker.set(row.ticker,list);
  }

  let ready20=0,up20=0,ready50=0,above50=0,ready200=0,above200=0,ready252=0,newHigh=0,newLow=0;
  for(const ticker of universe.members){
    const series=(byTicker.get(ticker)??[]).filter(row=>row.tradeDate<=currentDate);
    const latest=series.at(-1);
    if(!latest||latest.tradeDate!==currentDate)continue;
    if(series.length>=21){
      ready20++;
      if(latest.currentClose>series.at(-21).currentClose)up20++;
    }
    if(series.length>=50){
      ready50++;
      const sample=series.slice(-50).map(row=>row.currentClose);
      if(latest.currentClose>mean(sample))above50++;
    }
    if(series.length>=200){
      ready200++;
      const sample=series.slice(-200).map(row=>row.currentClose);
      if(latest.currentClose>mean(sample))above200++;
    }
    if(series.length>=252){
      ready252++;
      const sample=series.slice(-252).map(row=>row.currentClose);
      if(latest.currentClose>=Math.max(...sample))newHigh++;
      if(latest.currentClose<=Math.min(...sample))newLow++;
    }
  }
  const readiness={twentyDay:ready20>=required,ma50:ready50>=required,ma200:ready200>=required,highLow52w:ready252>=required};
  const coverage={universe:universe.members.length,required,twentyDay:ready20,ma50:ready50,ma200:ready200,highLow52w:ready252};
  return {
    status:Object.values(readiness).every(Boolean)?'READY':'PARTIAL',
    reason:Object.values(readiness).every(Boolean)?null:'BREADTH_R8_LONG_HISTORY_INCOMPLETE',
    readiness,coverage,
    scores:{
      advance20d:ready20?100*up20/ready20:null,
      ma50:ready50?100*above50/ready50:null,
      ma200:ready200?100*above200/ready200:null,
      highLow52w:ready252?(newHigh+newLow>0?100*newHigh/(newHigh+newLow):50):null,
    },
    counts52w:{ready:ready252,newHigh,newLow},
    historyWindowContract:'PER_TICKER_LAST_N_VALID_SESSIONS',
  };
}

export function buildBreadthR8ComponentsR2({rows=[],universes=[],relativeSeries=null,asOfDate=null,minCoverage=BREADTH_R8_MIN_COVERAGE}={}){
  const r1=buildBreadthR8ComponentsR1({rows,universes,relativeSeries,asOfDate,minCoverage});
  const currentDate=r1?.asOfDate??asOfDate;
  if(!validDate(currentDate)||!r1?.components){
    return {...r1,methodologyVersion:BREADTH_R8_SHADOW_R2_METHOD,historyWindowContract:'PER_TICKER_LAST_N_VALID_SESSIONS'};
  }
  const long=buildValidSessionLongFactors({rows,universes,currentDate,minCoverage});
  const components={
    ...r1.components,
    advance20d:long.scores?.advance20d??null,
    ma50:long.scores?.ma50??null,
    ma200:long.scores?.ma200??null,
    highLow52w:long.scores?.highLow52w??null,
  };
  const missingFactors=Object.entries(components).filter(([,value])=>!finite(value)).map(([key])=>key);
  const allReady=long.status==='READY'&&missingFactors.length===0;
  const score=allReady?clamp(Object.entries(BREADTH_R8_WEIGHTS).reduce((sum,[key,weight])=>sum+weight*components[key],0)):null;
  return {
    ...r1,
    methodologyVersion:BREADTH_R8_SHADOW_R2_METHOD,
    status:allReady?'READY':'PARTIAL',
    score,
    reason:allReady?null:(long.status!=='READY'?long.reason:'BREADTH_R8_FACTOR_MISSING'),
    missingFactors,
    components,
    coverage:{...r1.coverage,long:long.coverage},
    readiness:{...r1.readiness,long:long.readiness},
    raw:{...r1.raw,counts52w:long.counts52w},
    historyWindowContract:long.historyWindowContract,
    finalSmoothing:'NONE',
  };
}

export function buildBreadthR8TrendR2({rows=[],universes=[],relativeSeries=null,dates=[],minCoverage=BREADTH_R8_MIN_COVERAGE}={}){
  if(!Array.isArray(dates))throw new TypeError('BREADTH_R8_TREND_DATES_REQUIRED');
  const trend=[],results=[];
  for(const date of dates){
    if(!validDate(date))continue;
    const result=buildBreadthR8ComponentsR2({rows,universes,relativeSeries,asOfDate:date,minCoverage});
    results.push({date,...result});
    if(result.status==='READY'&&finite(result.score))trend.push({label:date,value:result.score,components:result.components});
  }
  return {methodologyVersion:BREADTH_R8_SHADOW_R2_METHOD,mode:'SHADOW_ONLY',productionFormulaChanged:false,results,trend};
}
