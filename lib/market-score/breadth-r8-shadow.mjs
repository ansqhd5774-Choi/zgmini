export const BREADTH_R8_SHADOW_METHOD="BREADTH_R8_13FACTOR_SHADOW_R1";
export const BREADTH_R8_MIN_COVERAGE=0.98;
export const BREADTH_R8_WEIGHTS=Object.freeze({
  advance1d:0.05,
  advanceValue1d:0.05,
  breadthEma5:0.05,
  breadthEma20:0.05,
  advance20d:0.10,
  ma50:0.125,
  ma200:0.125,
  highLow52w:0.075,
  ad20:0.075,
  mcclellanOscillator:0.075,
  mcclellanSummation:0.05,
  zweigStyleThrust:0.05,
  equalCapRelativeStrength:0.125,
});

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const clamp=value=>Math.max(0,Math.min(100,value));

function numericOrNull(value){
  if(value===null||value===undefined||value==="")return null;
  const n=Number(value);
  return finite(n)?n:null;
}
function mean(values){return values.reduce((sum,value)=>sum+value,0)/values.length}
function ema(values,period){
  if(!Array.isArray(values)||!values.length||!Number.isInteger(period)||period<1)return null;
  const alpha=2/(period+1);
  let out=null;
  for(const value of values){
    if(!finite(value))continue;
    out=out===null?value:alpha*value+(1-alpha)*out;
  }
  return out;
}
function normalizeRows(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const tradeDate=String(row?.trade_date??row?.tradeDate??row?.date??"");
    const ticker=String(row?.ticker??row?.symbol??"").trim();
    const previousDate=String(row?.previous_date??row?.previousDate??"");
    const previousClose=numericOrNull(row?.previous_close??row?.previousClose);
    const currentClose=numericOrNull(row?.current_close??row?.currentClose??row?.close);
    const currentVolume=numericOrNull(row?.current_volume??row?.currentVolume??row?.volume);
    if(!validDate(tradeDate)||!ticker||!finite(currentClose)||currentClose<=0||!finite(currentVolume)||currentVolume<0)continue;
    map.set(`${tradeDate}|${ticker}`,{tradeDate,ticker,previousDate:validDate(previousDate)?previousDate:null,previousClose,currentClose,currentVolume});
  }
  return [...map.values()].sort((a,b)=>a.tradeDate.localeCompare(b.tradeDate)||a.ticker.localeCompare(b.ticker));
}
function normalizeUniverses(universes=[]){
  return (Array.isArray(universes)?universes:[])
    .filter(row=>validDate(row?.tradeDate??row?.trade_date)&&Array.isArray(row?.members))
    .map(row=>({
      tradeDate:String(row.tradeDate??row.trade_date),
      members:[...new Set(row.members.map(x=>String(x??"").trim()).filter(Boolean))].sort(),
    }))
    .filter(row=>row.members.length>=490)
    .sort((a,b)=>a.tradeDate.localeCompare(b.tradeDate));
}
export function breadthR8UniverseForDate(universes=[],date){
  let found=null;
  for(const row of normalizeUniverses(universes)){
    if(row.tradeDate<=date)found=row;
    else break;
  }
  return found;
}
function normalizeIndexSeries(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=String(row?.date??row?.tradeDate??row?.observationDate??"");
    const value=Number(row?.value??row?.close??row?.currentClose);
    if(validDate(date)&&finite(value)&&value>0)map.set(date,value);
  }
  return [...map.entries()].map(([date,value])=>({date,value})).sort((a,b)=>a.date.localeCompare(b.date));
}
function percentileRankCurrent(values,window=252){
  const clean=(Array.isArray(values)?values:[]).filter(finite);
  if(clean.length<window)return null;
  const sample=clean.slice(-window);
  const current=sample.at(-1);
  const less=sample.filter(value=>value<current).length;
  const equal=sample.filter(value=>value===current).length;
  return clamp(100*(less+0.5*equal)/sample.length);
}
function buildTickerSeries(rows){
  const byTicker=new Map();
  for(const row of rows){
    const list=byTicker.get(row.ticker)??[];
    list.push(row);byTicker.set(row.ticker,list);
  }
  return byTicker;
}
function buildDailyBreadthStats({rows,universes,minCoverage}){
  const byDate=new Map();
  for(const row of rows){
    const map=byDate.get(row.tradeDate)??new Map();
    map.set(row.ticker,row);byDate.set(row.tradeDate,map);
  }
  const dates=[...byDate.keys()].sort();
  const out=[];
  for(let dateIndex=0;dateIndex<dates.length;dateIndex++){
    const date=dates[dateIndex];
    const universe=breadthR8UniverseForDate(universes,date);
    if(!universe)continue;
    const required=Math.ceil(universe.members.length*minCoverage);
    const currentRows=byDate.get(date);
    const previousRows=dateIndex>0?byDate.get(dates[dateIndex-1]):null;
    let ready=0,up=0,down=0,flat=0,valueReady=0,upValue=0,flatValue=0,totalValue=0;
    for(const ticker of universe.members){
      const row=currentRows?.get(ticker);
      if(!row)continue;
      const fallbackPrior=previousRows?.get(ticker)?.currentClose??null;
      const prior=finite(row.previousClose)&&row.previousClose>0?row.previousClose:fallbackPrior;
      if(!finite(prior)||prior<=0)continue;
      ready++;
      let direction=0;
      if(row.currentClose>prior){up++;direction=1}
      else if(row.currentClose<prior){down++;direction=-1}
      else flat++;
      const turnover=row.currentClose*row.currentVolume;
      if(finite(turnover)&&turnover>=0){
        valueReady++;totalValue+=turnover;
        if(direction>0)upValue+=turnover;
        else if(direction===0)flatValue+=turnover;
      }
    }
    const coverage=universe.members.length?ready/universe.members.length:0;
    const valueCoverage=universe.members.length?valueReady/universe.members.length:0;
    const readyFlag=ready>=required&&valueReady>=required&&totalValue>0;
    if(!readyFlag){
      out.push({date,status:"PARTIAL",memberCount:universe.members.length,required,coverage,valueCoverage});
      continue;
    }
    const advanceRatio=(up+0.5*flat)/ready;
    const advanceValueShare=(upValue+0.5*flatValue)/totalValue;
    const dailyBreadth=100*(0.60*advanceRatio+0.40*advanceValueShare);
    const directional=up+down;
    const normalizedAd=directional>0?(up-down)/directional:0;
    const zweigRatio=directional>0?up/directional:0.5;
    out.push({
      date,status:"READY",memberCount:universe.members.length,required,coverage,valueCoverage,
      up,down,flat,advanceRatio,advanceValueShare,dailyBreadth,normalizedAd,zweigRatio,
    });
  }
  return out;
}
function exactWindowCloses(seriesByDate,dates){
  const values=[];
  for(const date of dates){
    const close=seriesByDate.get(date);
    if(!finite(close)||close<=0)return null;
    values.push(close);
  }
  return values;
}
function currentTickerFactors({rows,universes,currentDate,minCoverage}){
  const universe=breadthR8UniverseForDate(universes,currentDate);
  if(!universe)return {status:"PARTIAL",reason:"BREADTH_R8_CURRENT_UNIVERSE_MISSING"};
  const dates=[...new Set(rows.filter(row=>row.tradeDate<=currentDate).map(row=>row.tradeDate))].sort();
  const currentIndex=dates.lastIndexOf(currentDate);
  if(currentIndex<0)return {status:"PARTIAL",reason:"BREADTH_R8_CURRENT_DATE_MISSING"};
  const byTicker=new Map();
  for(const row of rows){
    if(row.tradeDate>currentDate)continue;
    const map=byTicker.get(row.ticker)??new Map();
    map.set(row.tradeDate,row.currentClose);byTicker.set(row.ticker,map);
  }
  const required=Math.ceil(universe.members.length*minCoverage);
  const date20=currentIndex>=20?dates[currentIndex-20]:null;
  const dates50=currentIndex>=49?dates.slice(currentIndex-49,currentIndex+1):[];
  const dates200=currentIndex>=199?dates.slice(currentIndex-199,currentIndex+1):[];
  const dates252=currentIndex>=251?dates.slice(currentIndex-251,currentIndex+1):[];
  let ready20=0,up20=0,ready50=0,above50=0,ready200=0,above200=0,ready252=0,newHigh=0,newLow=0;
  for(const ticker of universe.members){
    const series=byTicker.get(ticker);
    if(!series)continue;
    const latest=series.get(currentDate);
    if(!finite(latest)||latest<=0)continue;
    if(date20){
      const prior20=series.get(date20);
      if(finite(prior20)&&prior20>0){ready20++;if(latest>prior20)up20++}
    }
    if(dates50.length===50){
      const sample=exactWindowCloses(series,dates50);
      if(sample){ready50++;if(latest>mean(sample))above50++}
    }
    if(dates200.length===200){
      const sample=exactWindowCloses(series,dates200);
      if(sample){ready200++;if(latest>mean(sample))above200++}
    }
    if(dates252.length===252){
      const sample=exactWindowCloses(series,dates252);
      if(sample){
        ready252++;
        if(latest>=Math.max(...sample))newHigh++;
        if(latest<=Math.min(...sample))newLow++;
      }
    }
  }
  const readiness={twentyDay:ready20>=required,ma50:ready50>=required,ma200:ready200>=required,highLow52w:ready252>=required};
  const coverage={universe:universe.members.length,required,twentyDay:ready20,ma50:ready50,ma200:ready200,highLow52w:ready252};
  return {
    status:Object.values(readiness).every(Boolean)?"READY":"PARTIAL",
    reason:Object.values(readiness).every(Boolean)?null:"BREADTH_R8_LONG_HISTORY_INCOMPLETE",
    readiness,coverage,
    scores:{
      advance20d:ready20?100*up20/ready20:null,
      ma50:ready50?100*above50/ready50:null,
      ma200:ready200?100*above200/ready200:null,
      highLow52w:ready252?(newHigh+newLow>0?100*newHigh/(newHigh+newLow):50):null,
    },
    counts52w:{ready:ready252,newHigh,newLow},
  };
}
function rollingMcclellan(dailyReady){
  const out=[];
  let ema19=null,ema39=null,summation=0;
  const a19=2/20,a39=2/40;
  for(const row of dailyReady){
    ema19=ema19===null?row.normalizedAd:a19*row.normalizedAd+(1-a19)*ema19;
    ema39=ema39===null?row.normalizedAd:a39*row.normalizedAd+(1-a39)*ema39;
    const oscillator=ema19-ema39;
    summation+=oscillator;
    out.push({...row,mcclellanOscillator:oscillator,mcclellanSummation:summation});
  }
  return out;
}
function scoreEqualCapRelativeStrength(relativeSeries,asOfDate){
  const equal=normalizeIndexSeries(relativeSeries?.equalWeighted??[]).filter(row=>!asOfDate||row.date<=asOfDate);
  const cap=normalizeIndexSeries(relativeSeries?.capWeighted??[]).filter(row=>!asOfDate||row.date<=asOfDate);
  const capByDate=new Map(cap.map(row=>[row.date,row.value]));
  const ratios=equal.filter(row=>capByDate.has(row.date)).map(row=>({date:row.date,value:row.value/capByDate.get(row.date)}));
  if(ratios.length<315)return {score:null,rows:ratios.length,last:ratios.at(-1)?.date??null,reason:"BREADTH_R8_RELATIVE_HISTORY_SHORT"};
  const returns=[];
  for(let i=63;i<ratios.length;i++)returns.push({date:ratios[i].date,value:ratios[i].value/ratios[i-63].value-1});
  const score=percentileRankCurrent(returns.map(row=>row.value),252);
  return {score,rows:ratios.length,last:ratios.at(-1)?.date??null,relativeReturn63:returns.at(-1)?.value??null};
}

export function buildBreadthR8Components({rows=[],universes=[],relativeSeries=null,asOfDate=null,minCoverage=BREADTH_R8_MIN_COVERAGE}={}){
  const normalizedRows=normalizeRows(rows).filter(row=>!asOfDate||row.tradeDate<=asOfDate);
  const normalizedUniverses=normalizeUniverses(universes).filter(row=>!asOfDate||row.tradeDate<=asOfDate);
  const currentDate=normalizedRows.at(-1)?.tradeDate??null;
  const base={
    methodologyVersion:BREADTH_R8_SHADOW_METHOD,mode:"SHADOW_ONLY",productionFormulaChanged:false,
    asOfDate:currentDate,weights:{...BREADTH_R8_WEIGHTS},minCoverage,
  };
  if(!currentDate||!normalizedUniverses.length)return {...base,status:"PARTIAL",score:null,reason:"BREADTH_R8_INPUT_MISSING",missingFactors:["INPUTS"]};

  const daily=buildDailyBreadthStats({rows:normalizedRows,universes:normalizedUniverses,minCoverage});
  const readyDaily=daily.filter(row=>row.status==="READY"&&row.date<=currentDate);
  const currentDaily=readyDaily.at(-1);
  if(!currentDaily||currentDaily.date!==currentDate)return {...base,status:"PARTIAL",score:null,reason:"BREADTH_R8_CURRENT_DAILY_INCOMPLETE",missingFactors:["S1","S2","S3","S4","S9","S10","S11","S12"]};

  const long=currentTickerFactors({rows:normalizedRows,universes:normalizedUniverses,currentDate,minCoverage});
  const mc=rollingMcclellan(readyDaily);
  const mcOscScores=mc.map((row,i)=>i<251?null:percentileRankCurrent(mc.slice(0,i+1).map(x=>x.mcclellanOscillator),252));
  const mcSumScores=mc.map((row,i)=>i<251?null:percentileRankCurrent(mc.slice(0,i+1).map(x=>x.mcclellanSummation),252));
  const currentMc=mc.at(-1);
  const currentMcoScore=mcOscScores.at(-1)??null;
  const currentMsiScore=mcSumScores.at(-1)??null;
  const adRows=readyDaily.slice(-20);
  const adDen=adRows.reduce((sum,row)=>sum+row.up+row.down,0);
  const adNum=adRows.reduce((sum,row)=>sum+row.up-row.down,0);
  const ad20=adRows.length>=20&&adDen>0?clamp(50+50*adNum/adDen):null;
  const zweig=readyDaily.length>=10?clamp(100*ema(readyDaily.map(row=>row.zweigRatio),10)):null;
  const breadthEma5=readyDaily.length>=5?clamp(ema(readyDaily.map(row=>row.dailyBreadth),5)):null;
  const breadthEma20=readyDaily.length>=20?clamp(ema(readyDaily.map(row=>row.dailyBreadth),20)):null;
  const relative=scoreEqualCapRelativeStrength(relativeSeries,currentDate);

  const components={
    advance1d:clamp(100*currentDaily.advanceRatio),
    advanceValue1d:clamp(100*currentDaily.advanceValueShare),
    breadthEma5,
    breadthEma20,
    advance20d:long.scores?.advance20d??null,
    ma50:long.scores?.ma50??null,
    ma200:long.scores?.ma200??null,
    highLow52w:long.scores?.highLow52w??null,
    ad20,
    mcclellanOscillator:currentMcoScore,
    mcclellanSummation:currentMsiScore,
    zweigStyleThrust:zweig,
    equalCapRelativeStrength:relative.score,
  };
  const missingFactors=Object.entries(components).filter(([,value])=>!finite(value)).map(([key])=>key);
  const allReady=missingFactors.length===0&&long.status==="READY";
  const score=allReady?clamp(Object.entries(BREADTH_R8_WEIGHTS).reduce((sum,[key,weight])=>sum+weight*components[key],0)):null;
  return {
    ...base,status:allReady?"READY":"PARTIAL",score,
    reason:allReady?null:(long.status!=="READY"?long.reason:"BREADTH_R8_FACTOR_MISSING"),
    missingFactors,components,
    coverage:{daily:{memberCount:currentDaily.memberCount,required:currentDaily.required,returnCoverage:currentDaily.coverage,valueCoverage:currentDaily.valueCoverage},long:long.coverage},
    readiness:{long:long.readiness??null,dailySessions:readyDaily.length,mcclellanPercentile:readyDaily.length>=252,relativeHistory:finite(relative.score)},
    raw:{
      current:{up:currentDaily.up,down:currentDaily.down,flat:currentDaily.flat,advanceRatio:currentDaily.advanceRatio,advanceValueShare:currentDaily.advanceValueShare},
      mcclellanOscillator:currentMc?.mcclellanOscillator??null,
      mcclellanSummation:currentMc?.mcclellanSummation??null,
      relative,
      counts52w:long.counts52w??null,
    },
    finalSmoothing:"NONE",
    interpretation:"R8 Shadow: 13-factor PIT breadth score. Existing 4 short-term factors 20%; 20D/50DMA/200DMA 35%; A-D/McClellan 20%; 52W/Zweig-style 12.5%; equal-weight/cap-weight relative strength 12.5%. No missing-factor reweighting and no final EMA3.",
  };
}

export function buildBreadthR8Trend({rows=[],universes=[],relativeSeries=null,dates=[],minCoverage=BREADTH_R8_MIN_COVERAGE}={}){
  if(!Array.isArray(dates))throw new TypeError("BREADTH_R8_TREND_DATES_REQUIRED");
  const trend=[],results=[];
  for(const date of dates){
    if(!validDate(date))continue;
    const result=buildBreadthR8Components({rows,universes,relativeSeries,asOfDate:date,minCoverage});
    results.push({date,...result});
    if(result.status==="READY"&&finite(result.score))trend.push({label:date,value:result.score,components:result.components});
  }
  return {methodologyVersion:BREADTH_R8_SHADOW_METHOD,mode:"SHADOW_ONLY",productionFormulaChanged:false,results,trend};
}
