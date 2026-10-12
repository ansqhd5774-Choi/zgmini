export const SECTOR_FEAR_GREED_R23_SPEC_METHOD="SECTOR-FEAR-GREED-R2.3-SPECULATIVE-APPETITE-SHADOW";
export const SECTOR_FEAR_GREED_R23_WEIGHTS=Object.freeze({lotterySuperiority:0.50,volumeSuperiority:0.50});
export const SECTOR_FEAR_GREED_R23_MIN_MEMBERS=8;

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(`${value}T00:00:00Z`));
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const stdPopulation=values=>{if(!values.length)return null;const m=mean(values);return Math.sqrt(mean(values.map(value=>(value-m)**2)));};

function normalizeBenchmarkRows(rows=[]){
  const byDate=new Map();
  for(const row of Array.isArray(rows)?rows:[]){const date=String(row?.date??row?.tradeDate??row?.trade_date??"").slice(0,10),close=Number(row?.close??row?.currentClose??row?.current_close);if(validDate(date)&&finite(close)&&close>0)byDate.set(date,{date,close});}
  return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function normalizeStockRows(rows=[]){
  const byTicker=new Map();
  for(const row of Array.isArray(rows)?rows:[]){const date=String(row?.tradeDate??row?.trade_date??row?.date??"").slice(0,10),ticker=String(row?.ticker??"").trim(),close=Number(row?.currentClose??row?.current_close??row?.close),volume=Number(row?.currentVolume??row?.current_volume??row?.volume);if(!validDate(date)||!ticker||!finite(close)||close<=0||!finite(volume)||volume<0)continue;const list=byTicker.get(ticker)??[];list.push({date,ticker,close,volume});byTicker.set(ticker,list);}
  for(const list of byTicker.values())list.sort((a,b)=>a.date.localeCompare(b.date));return byTicker;
}
function activePitEntry(list,date){const matches=(list??[]).filter(item=>item.dateAdded<=date&&(!item.dateRemoved||date<item.dateRemoved));if(matches.length>1)throw new Error("SECTOR_R23_PIT_OVERLAP_CONFLICT");return matches[0]??null;}
function olsResiduals(yReturns,xReturns){
  if(yReturns.length!==xReturns.length||yReturns.length<2)return null;const xm=mean(xReturns),ym=mean(yReturns);let cov=0,varx=0;for(let i=0;i<yReturns.length;i++){const dx=xReturns[i]-xm;cov+=dx*(yReturns[i]-ym);varx+=dx*dx;}if(varx<=0)return null;const beta=cov/varx,alpha=ym-beta*xm,residuals=yReturns.map((value,i)=>value-(alpha+beta*xReturns[i]));return {std:stdPopulation(residuals),residuals};
}
function featureForDate(series,index,spyByDate,sectorEtfByDate){
  if(index<60)return null;const window=series.slice(index-60,index+1);if(window.length!==61)return null;const stockReturns=[],spyReturns=[],sectorEtfReturns=[];
  for(let i=1;i<window.length;i++){const prev=window[i-1],curr=window[i],spyPrev=spyByDate.get(prev.date),spyCurr=spyByDate.get(curr.date),etfPrev=sectorEtfByDate.get(prev.date),etfCurr=sectorEtfByDate.get(curr.date);if(!spyPrev||!spyCurr||!etfPrev||!etfCurr)return null;stockReturns.push(curr.close/prev.close-1);spyReturns.push(spyCurr/spyPrev-1);sectorEtfReturns.push(etfCurr/etfPrev-1);}
  const spyFit=olsResiduals(stockReturns,spyReturns),sectorFit=olsResiduals(stockReturns,sectorEtfReturns);if(!spyFit||!finite(spyFit.std)||!sectorFit?.residuals?.length)return null;
  const residualMax20=Math.max(...sectorFit.residuals.slice(-20)),dv5=mean(window.slice(-5).map(row=>row.close*row.volume)),dv20=mean(window.slice(-20).map(row=>row.close*row.volume));if(!finite(residualMax20)||!(dv5>0&&dv20>0))return null;
  return {date:window.at(-1).date,ticker:window.at(-1).ticker,ivol60:spyFit.std,residualMax20,volumeChase:Math.log(dv5/dv20)};
}
export function rankSuperiorityScore(highValues=[],lowValues=[]){
  const high=highValues.filter(finite),low=lowValues.filter(finite);if(!high.length||!low.length)return null;let wins=0,ties=0;for(const h of high)for(const l of low){if(h>l)wins++;else if(h===l)ties++;}return 100*(wins+0.5*ties)/(high.length*low.length);
}
export function buildSectorSpeculativeCrossSectionR23({rows=[],spyRows=[],etfRows=[],pitHistory,sectorId}={}){
  if(!pitHistory?.byTicker)throw new TypeError("SECTOR_R23_PIT_HISTORY_REQUIRED");
  const spyByDate=new Map(normalizeBenchmarkRows(spyRows).map(row=>[row.date,row.close])),sectorEtfByDate=new Map(normalizeBenchmarkRows(etfRows).map(row=>[row.date,row.close]));if(!spyByDate.size||!sectorEtfByDate.size)return [];
  const byTicker=normalizeStockRows(rows),byDate=new Map();
  for(const [ticker,series] of byTicker){for(let i=60;i<series.length;i++){const feature=featureForDate(series,i,spyByDate,sectorEtfByDate);if(!feature)continue;const active=activePitEntry(pitHistory.byTicker[ticker],feature.date);if(!active||active.sectorId!==sectorId)continue;const list=byDate.get(feature.date)??[];list.push(feature);byDate.set(feature.date,list);}}
  const history=[];
  for(const [date,features] of [...byDate.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){if(features.length<SECTOR_FEAR_GREED_R23_MIN_MEMBERS)continue;const sorted=[...features].sort((a,b)=>a.ivol60-b.ivol60||a.ticker.localeCompare(b.ticker)),q=Math.max(2,Math.floor(sorted.length*0.25)),low=sorted.slice(0,q),high=sorted.slice(-q),lotteryScore=rankSuperiorityScore(high.map(item=>item.residualMax20),low.map(item=>item.residualMax20)),volumeScore=rankSuperiorityScore(high.map(item=>item.volumeChase),low.map(item=>item.volumeChase));if(!finite(lotteryScore)||!finite(volumeScore))continue;history.push({date,memberObservations:features.length,quartileSize:q,lotterySuperiority:lotteryScore,volumeSuperiority:volumeScore,score:SECTOR_FEAR_GREED_R23_WEIGHTS.lotterySuperiority*lotteryScore+SECTOR_FEAR_GREED_R23_WEIGHTS.volumeSuperiority*volumeScore});}
  return history;
}
export function buildSectorSpeculativeCandidateR23(input={}){
  const history=buildSectorSpeculativeCrossSectionR23(input),current=history.at(-1)??null;return {methodologyVersion:SECTOR_FEAR_GREED_R23_SPEC_METHOD,mode:"SHADOW_RESEARCH_ONLY",economicIntent:"NONPARAMETRIC_CROSS_SECTIONAL_SPECULATIVE_SUPERIORITY",productionFormulaChanged:false,publicMutation:false,dbSchemaChanged:false,sectorId:input?.sectorId??null,status:current?"READY_CROSS_SECTION":"PARTIAL",score:current?.score??null,weights:{...SECTOR_FEAR_GREED_R23_WEIGHTS},historicalReferenceRequired:false,minimumMembers:SECTOR_FEAR_GREED_R23_MIN_MEMBERS,metrics:{lotterySuperiority:current?.lotterySuperiority??null,volumeSuperiority:current?.volumeSuperiority??null},history};
}
