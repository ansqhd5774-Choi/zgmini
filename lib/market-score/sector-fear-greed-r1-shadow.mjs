export const SECTOR_FEAR_GREED_R1_METHOD="SECTOR-FEAR-GREED-R1-SHADOW";
export const SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS=756;
export const SECTOR_FEAR_GREED_R1_WEIGHTS=Object.freeze({
  trend:0.20,
  breadth:0.20,
  demand:0.15,
  relativeStrength:0.15,
  volatility:0.15,
  options:0.15,
});

export const SECTOR_FEAR_GREED_R1_ETFS=Object.freeze({
  technology:"XLK",
  communication:"XLC",
  discretionary:"XLY",
  staples:"XLP",
  financials:"XLF",
  healthcare:"XLV",
  industrials:"XLI",
  energy:"XLE",
  materials:"XLB",
  realEstate:"XLRE",
  utilities:"XLU",
});

export const SECTOR_FEAR_GREED_R1_GICS=Object.freeze({
  "Information Technology":"technology",
  "Communication Services":"communication",
  "Consumer Discretionary":"discretionary",
  "Consumer Staples":"staples",
  "Financials":"financials",
  "Health Care":"healthcare",
  "Industrials":"industrials",
  "Energy":"energy",
  "Materials":"materials",
  "Real Estate":"realEstate",
  "Utilities":"utilities",
});

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));

function stdPopulation(values){
  const m=mean(values);
  return Math.sqrt(mean(values.map(value=>(value-m)**2)));
}

function normalizePriceSeries(rows=[]){
  const byDate=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=String(row?.date??row?.tradeDate??"");
    const close=Number(row?.close??row?.currentClose);
    if(!validDate(date)||!finite(close)||close<=0)continue;
    byDate.set(date,{date,close});
  }
  return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

function normalizeBreadthSeries(rows=[]){
  const byDate=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=String(row?.date??row?.tradeDate??"");
    const b50=Number(row?.b50??row?.aboveMa50);
    const b200=Number(row?.b200??row?.aboveMa200);
    const highLowNet=Number(row?.highLowNet??row?.highLowNet52w);
    if(!validDate(date)||![b50,b200,highLowNet].every(finite))continue;
    byDate.set(date,{date,b50,b200,highLowNet});
  }
  return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

function normalizeDemandSeries(rows=[]){
  const byDate=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=String(row?.date??row?.tradeDate??"");
    const value=Number(row?.value??row?.volumeBreadth);
    if(!validDate(date)||!finite(value))continue;
    byDate.set(date,{date,value:clamp(value,-1,1)});
  }
  return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

export function percentileScore(values,current,{minimum=SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS}={}){
  const clean=(Array.isArray(values)?values:[]).filter(finite);
  if(!finite(current)||clean.length<minimum)return null;
  const sample=clean.slice(-minimum);
  let below=0,equal=0;
  for(const value of sample){
    if(value<current)below++;
    else if(value===current)equal++;
  }
  return clamp(100*(below+0.5*equal)/sample.length,0,100);
}

function scoreMetricSeries(values){
  const clean=values.filter(finite);
  const current=clean.at(-1);
  const score=percentileScore(clean,current);
  return {current:finite(current)?current:null,referenceObservations:Math.min(clean.length,SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS),score};
}

export function computeTrendComponent(rows=[]){
  const prices=normalizePriceSeries(rows);
  const m125=[],r60=[],r20=[];
  let date=null;
  for(let i=124;i<prices.length;i++){
    const current=prices[i].close;
    const ma125=mean(prices.slice(i-124,i+1).map(row=>row.close));
    m125.push(current/ma125-1);
    if(i>=60)r60.push(current/prices[i-60].close-1);
    if(i>=20)r20.push(current/prices[i-20].close-1);
    date=prices[i].date;
  }
  const metrics={m125:scoreMetricSeries(m125),r60:scoreMetricSeries(r60),r20:scoreMetricSeries(r20)};
  const ready=Object.values(metrics).every(metric=>finite(metric.score));
  return {status:ready?"READY":"PARTIAL",date,score:ready?0.50*metrics.m125.score+0.30*metrics.r60.score+0.20*metrics.r20.score:null,metrics,requiredReferenceObservations:SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS};
}

export function computeBreadthComponent(rows=[]){
  const series=normalizeBreadthSeries(rows);
  const b50=scoreMetricSeries(series.map(row=>row.b50));
  const b200=scoreMetricSeries(series.map(row=>row.b200));
  const highLowNet=scoreMetricSeries(series.map(row=>row.highLowNet));
  const metrics={b50,b200,highLowNet};
  const ready=Object.values(metrics).every(metric=>finite(metric.score));
  return {status:ready?"READY":"PARTIAL",date:series.at(-1)?.date??null,score:ready?0.35*b50.score+0.35*b200.score+0.30*highLowNet.score:null,metrics,requiredReferenceObservations:SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS};
}

export function computeDemandComponent(rows=[]){
  const series=normalizeDemandSeries(rows);
  const vb5=[],vb20=[];
  let date=null;
  for(let i=0;i<series.length;i++){
    if(i>=4)vb5.push(mean(series.slice(i-4,i+1).map(row=>row.value)));
    if(i>=19)vb20.push(mean(series.slice(i-19,i+1).map(row=>row.value)));
    date=series[i].date;
  }
  const metrics={vb5:scoreMetricSeries(vb5),vb20:scoreMetricSeries(vb20)};
  const ready=Object.values(metrics).every(metric=>finite(metric.score));
  return {status:ready?"READY":"PARTIAL",date,score:ready?0.60*metrics.vb5.score+0.40*metrics.vb20.score:null,metrics,requiredReferenceObservations:SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS};
}

function alignPrices(leftRows,rightRows){
  const left=normalizePriceSeries(leftRows),right=normalizePriceSeries(rightRows);
  const rightByDate=new Map(right.map(row=>[row.date,row.close]));
  return left.filter(row=>rightByDate.has(row.date)).map(row=>({date:row.date,left:row.close,right:rightByDate.get(row.date)}));
}

export function computeRelativeStrengthComponent(sectorRows=[],spyRows=[]){
  const prices=alignPrices(sectorRows,spyRows);
  const rs20=[],rs60=[],rs125=[];
  let date=null;
  for(let i=125;i<prices.length;i++){
    const relative=lookback=>(prices[i].left/prices[i-lookback].left-1)-(prices[i].right/prices[i-lookback].right-1);
    rs20.push(relative(20));rs60.push(relative(60));rs125.push(relative(125));date=prices[i].date;
  }
  const metrics={rs20:scoreMetricSeries(rs20),rs60:scoreMetricSeries(rs60),rs125:scoreMetricSeries(rs125)};
  const ready=Object.values(metrics).every(metric=>finite(metric.score));
  return {status:ready?"READY":"PARTIAL",date,score:ready?0.25*metrics.rs20.score+0.45*metrics.rs60.score+0.30*metrics.rs125.score:null,metrics,requiredReferenceObservations:SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS};
}

export function computeVolatilityComponent(rows=[]){
  const prices=normalizePriceSeries(rows);
  const rv20=[],dsv20=[],dd63=[];
  let date=null;
  for(let i=62;i<prices.length;i++){
    if(i>=20){
      const returns=[];
      for(let j=i-19;j<=i;j++)returns.push(prices[j].close/prices[j-1].close-1);
      rv20.push(stdPopulation(returns)*Math.sqrt(252));
      dsv20.push(Math.sqrt(252*mean(returns.map(value=>Math.min(value,0)**2))));
    }
    const high=Math.max(...prices.slice(i-62,i+1).map(row=>row.close));
    dd63.push(prices[i].close/high-1);
    date=prices[i].date;
  }
  const rv=scoreMetricSeries(rv20),dsv=scoreMetricSeries(dsv20),dd=scoreMetricSeries(dd63);
  const metrics={rv20:rv,dsv20:dsv,dd63:dd};
  const ready=Object.values(metrics).every(metric=>finite(metric.score));
  return {status:ready?"READY":"PARTIAL",date,score:ready?0.40*(100-rv.score)+0.35*(100-dsv.score)+0.25*dd.score:null,metrics,requiredReferenceObservations:SECTOR_FEAR_GREED_R1_REFERENCE_OBSERVATIONS};
}

export function buildSectorFearGreedR1Shadow({sectorId,etfSeries=[],spySeries=[],breadthSeries=[],volumeBreadthSeries=[],optionsScore=null}={}){
  const trend=computeTrendComponent(etfSeries);
  const breadth=computeBreadthComponent(breadthSeries);
  const demand=computeDemandComponent(volumeBreadthSeries);
  const relativeStrength=computeRelativeStrengthComponent(etfSeries,spySeries);
  const volatility=computeVolatilityComponent(etfSeries);
  const optionReady=finite(optionsScore)&&optionsScore>=0&&optionsScore<=100;
  const options={status:optionReady?"READY":"BLOCKED",score:optionReady?optionsScore:null,reason:optionReady?null:"OPTIONS_BLOCKED_BY_DATA_LICENSE"};
  const components={trend,breadth,demand,relativeStrength,volatility,options};
  const fiveReady=[trend,breadth,demand,relativeStrength,volatility].every(component=>component.status==="READY"&&finite(component.score));
  const availableWeight=fiveReady?0.85:0;
  const weightedContribution=fiveReady?SECTOR_FEAR_GREED_R1_WEIGHTS.trend*trend.score+SECTOR_FEAR_GREED_R1_WEIGHTS.breadth*breadth.score+SECTOR_FEAR_GREED_R1_WEIGHTS.demand*demand.score+SECTOR_FEAR_GREED_R1_WEIGHTS.relativeStrength*relativeStrength.score+SECTOR_FEAR_GREED_R1_WEIGHTS.volatility*volatility.score:null;
  const ready=fiveReady&&optionReady;
  const score=ready?weightedContribution+SECTOR_FEAR_GREED_R1_WEIGHTS.options*options.score:null;
  return {methodologyVersion:SECTOR_FEAR_GREED_R1_METHOD,mode:"SHADOW_ONLY",productionFormulaChanged:false,dbSchemaChanged:false,noPublish:true,sectorId:String(sectorId??""),etf:SECTOR_FEAR_GREED_R1_ETFS[String(sectorId??"")]??null,status:ready?"READY":"PARTIAL",reason:ready?null:!fiveReady?"REFERENCE_HISTORY_INCOMPLETE":"OPTIONS_BLOCKED_BY_DATA_LICENSE",score,availableWeight,weightedContribution,renormalized:false,weights:{...SECTOR_FEAR_GREED_R1_WEIGHTS},components};
}
