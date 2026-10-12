export const SECTOR_FEAR_GREED_R2_SPEC_METHOD="SECTOR-FEAR-GREED-R2-SPECULATIVE-APPETITE-SHADOW";
export const SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS=756;
export const SECTOR_FEAR_GREED_R2_SPEC_WEIGHTS=Object.freeze({
  tailBalance:0.40,
  speculativeLeadership:0.40,
  speculativeVolume:0.20,
});

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`));
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);if(!sorted.length)return null;const i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2;};
const stdPopulation=values=>{if(!values.length)return null;const m=mean(values);return Math.sqrt(mean(values.map(value=>(value-m)**2)));};

function normalizeSpyRows(rows=[]){
  const byDate=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10),close=Number(row?.close??row?.currentClose??row?.current_close);
    if(validDate(date)&&finite(close)&&close>0)byDate.set(date,{date,close});
  }
  return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
}

function normalizeStockRows(rows=[]){
  const byTicker=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const date=String(row?.tradeDate??row?.trade_date??row?.date??"").slice(0,10),ticker=String(row?.ticker??"").trim();
    const close=Number(row?.currentClose??row?.current_close??row?.close),volume=Number(row?.currentVolume??row?.current_volume??row?.volume);
    if(!validDate(date)||!ticker||!finite(close)||close<=0||!finite(volume)||volume<0)continue;
    const list=byTicker.get(ticker)??[];list.push({date,ticker,close,volume});byTicker.set(ticker,list);
  }
  for(const list of byTicker.values())list.sort((a,b)=>a.date.localeCompare(b.date));
  return byTicker;
}

function activePitEntry(list,date){
  const matches=(list??[]).filter(item=>item.dateAdded<=date&&(!item.dateRemoved||date<item.dateRemoved));
  if(matches.length>1)throw new Error("SECTOR_SPEC_PIT_OVERLAP_CONFLICT");
  return matches[0]??null;
}

function olsResidualStd(stockReturns,spyReturns){
  if(stockReturns.length!==spyReturns.length||stockReturns.length<2)return null;
  const xm=mean(spyReturns),ym=mean(stockReturns);
  let cov=0,varx=0;
  for(let i=0;i<stockReturns.length;i++){const dx=spyReturns[i]-xm;cov+=dx*(stockReturns[i]-ym);varx+=dx*dx;}
  if(varx<=0)return null;
  const beta=cov/varx,alpha=ym-beta*xm;
  return stdPopulation(stockReturns.map((value,i)=>value-(alpha+beta*spyReturns[i])));
}

function featureForDate(series,index,spyByDate){
  if(index<60)return null;
  const window=series.slice(index-60,index+1);
  if(window.length!==61)return null;
  const stockReturns=[],spyReturns=[];
  for(let i=1;i<window.length;i++){
    const prev=window[i-1],curr=window[i],spyPrev=spyByDate.get(prev.date),spyCurr=spyByDate.get(curr.date);
    if(!spyPrev||!spyCurr)return null;
    stockReturns.push(curr.close/prev.close-1);spyReturns.push(spyCurr/spyPrev-1);
  }
  const ivol60=olsResidualStd(stockReturns,spyReturns);
  if(!finite(ivol60))return null;
  const ret20=window.at(-1).close/window.at(-21).close-1;
  const recentReturns=stockReturns.slice(-20),max20=Math.max(...recentReturns),min20=Math.min(...recentReturns),tailBalance=max20+min20;
  const dv5=mean(window.slice(-5).map(row=>row.close*row.volume)),dv20=mean(window.slice(-20).map(row=>row.close*row.volume));
  if(!(dv5>0&&dv20>0))return null;
  const volumeChase=Math.log(dv5/dv20);
  return {date:window.at(-1).date,ticker:window.at(-1).ticker,ivol60,ret20,max20,min20,tailBalance,volumeChase};
}

function percentileScore(values,current,{minimum=SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS}={}){
  const clean=(Array.isArray(values)?values:[]).filter(finite);
  if(!finite(current)||clean.length<minimum)return null;
  const sample=clean.slice(-minimum);let below=0,equal=0;
  for(const value of sample){if(value<current)below++;else if(value===current)equal++;}
  return 100*(below+0.5*equal)/sample.length;
}

function summarizeMetric(history,key){
  const values=history.map(row=>row[key]).filter(finite),current=values.at(-1)??null;
  return {current,historyObservations:values.length,referenceObservations:Math.min(values.length,SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS),score:percentileScore(values,current)};
}

export function buildSectorSpeculativeRawHistory({rows=[],spyRows=[],pitHistory,sectorId}={}){
  if(!pitHistory?.byTicker)throw new TypeError("SECTOR_SPEC_PIT_HISTORY_REQUIRED");
  const spy=normalizeSpyRows(spyRows),spyByDate=new Map(spy.map(row=>[row.date,row.close])),byTicker=normalizeStockRows(rows),byDate=new Map();
  for(const [ticker,series] of byTicker){
    for(let i=60;i<series.length;i++){
      const feature=featureForDate(series,i,spyByDate);if(!feature)continue;
      const active=activePitEntry(pitHistory.byTicker[ticker],feature.date);if(!active||active.sectorId!==sectorId)continue;
      const list=byDate.get(feature.date)??[];list.push(feature);byDate.set(feature.date,list);
    }
  }
  const history=[];
  for(const [date,features] of [...byDate.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){
    if(features.length<8)continue;
    const sorted=[...features].sort((a,b)=>a.ivol60-b.ivol60||a.ticker.localeCompare(b.ticker));
    const q=Math.max(2,Math.floor(sorted.length*0.25)),low=sorted.slice(0,q),high=sorted.slice(-q);
    const tailBalance=median(features.map(item=>item.tailBalance));
    const maxLottery=median(features.map(item=>item.max20));
    const speculativeLeadership=mean(high.map(item=>item.ret20))-mean(low.map(item=>item.ret20));
    const speculativeVolume=mean(high.map(item=>item.volumeChase))-mean(low.map(item=>item.volumeChase));
    history.push({date,memberObservations:features.length,quartileSize:q,tailBalance,maxLottery,speculativeLeadership,speculativeVolume});
  }
  return history;
}

export function buildSectorSpeculativeCandidate({rows=[],spyRows=[],pitHistory,sectorId}={}){
  const history=buildSectorSpeculativeRawHistory({rows,spyRows,pitHistory,sectorId});
  const tailBalance=summarizeMetric(history,"tailBalance"),speculativeLeadership=summarizeMetric(history,"speculativeLeadership"),speculativeVolume=summarizeMetric(history,"speculativeVolume"),maxLottery=summarizeMetric(history,"maxLottery");
  const ready=[tailBalance,speculativeLeadership,speculativeVolume].every(metric=>finite(metric.score));
  const score=ready?SECTOR_FEAR_GREED_R2_SPEC_WEIGHTS.tailBalance*tailBalance.score+SECTOR_FEAR_GREED_R2_SPEC_WEIGHTS.speculativeLeadership*speculativeLeadership.score+SECTOR_FEAR_GREED_R2_SPEC_WEIGHTS.speculativeVolume*speculativeVolume.score:null;
  return {methodologyVersion:SECTOR_FEAR_GREED_R2_SPEC_METHOD,mode:"SHADOW_RESEARCH_ONLY",productionFormulaChanged:false,publicMutation:false,dbSchemaChanged:false,sectorId,status:ready?"READY":"PARTIAL",score,weights:{...SECTOR_FEAR_GREED_R2_SPEC_WEIGHTS},requiredReferenceObservations:SECTOR_FEAR_GREED_R2_SPEC_REFERENCE_OBSERVATIONS,metrics:{tailBalance,speculativeLeadership,speculativeVolume,maxLottery},history};
}
