export const SECTOR_FEAR_GREED_R24_SPEC_METHOD="SECTOR-FEAR-GREED-R2.4-NORMALIZED-SPECULATIVE-APPETITE-SHADOW";
export const SECTOR_FEAR_GREED_R24_WEIGHTS=Object.freeze({lotterySuperiority:0.50,volumeSuperiority:0.50});
export const SECTOR_FEAR_GREED_R24_MIN_MEMBERS=8;
export const SECTOR_FEAR_GREED_R24_VOLUME_Z_WINDOW=60;

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
function activePitEntry(list,date){const matches=(list??[]).filter(item=>item.dateAdded<=date&&(!item.dateRemoved||date<item.dateRemoved));if(matches.length>1)throw new Error("SECTOR_R24_PIT_OVERLAP_CONFLICT");return matches[0]??null;}
function olsResiduals(yReturns,xReturns){
  if(yReturns.length!==xReturns.length||yReturns.length<2)return null;const xm=mean(xReturns),ym=mean(yReturns);let cov=0,varx=0;for(let i=0;i<yReturns.length;i++){const dx=xReturns[i]-xm;cov+=dx*(yReturns[i]-ym);varx+=dx*dx;}if(varx<=0)return null;const beta=cov/varx,alpha=ym-beta*xm,residuals=yReturns.map((value,i)=>value-(alpha+beta*xReturns[i]));return {std:stdPopulation(residuals),residuals};
}
function volumeChaseAt(series,index){if(index<19)return null;const dv5=mean(series.slice(index-4,index+1).map(row=>row.close*row.volume)),dv20=mean(series.slice(index-19,index+1).map(row=>row.close*row.volume));return dv5>0&&dv20>0?Math.log(dv5/dv20):null;}
function featureForDate(series,index,spyByDate,sectorEtfByDate){
  if(index<78)return null;const window=series.slice(index-60,index+1);if(window.length!==61)return null;const stockReturns=[],spyReturns=[],sectorEtfReturns=[];
  for(let i=1;i<window.length;i++){const prev=window[i-1],curr=window[i],spyPrev=spyByDate.get(prev.date),spyCurr=spyByDate.get(curr.date),etfPrev=sectorEtfByDate.get(prev.date),etfCurr=sectorEtfByDate.get(curr.date);if(!spyPrev||!spyCurr||!etfPrev||!etfCurr)return null;stockReturns.push(curr.close/prev.close-1);spyReturns.push(spyCurr/spyPrev-1);sectorEtfReturns.push(etfCurr/etfPrev-1);}
  const spyFit=olsResiduals(stockReturns,spyReturns),sectorFit=olsResiduals(stockReturns,sectorEtfReturns);if(!spyFit||!(spyFit.std>0)||!sectorFit||!(sectorFit.std>0)||sectorFit.residuals.length<20)return null;
  const lotteryZMax20=Math.max(...sectorFit.residuals.slice(-20))/sectorFit.std;
  const volumeHistory=[];for(let j=index-(SECTOR_FEAR_GREED_R24_VOLUME_Z_WINDOW-1);j<=index;j++){const value=volumeChaseAt(series,j);if(!finite(value))return null;volumeHistory.push(value);}const volumeStd=stdPopulation(volumeHistory);if(!(volumeStd>0))return null;const volumeZ=(volumeHistory.at(-1)-mean(volumeHistory))/volumeStd;
  return {date:window.at(-1).date,ticker:window.at(-1).ticker,ivol60:spyFit.std,lotteryZMax20,volumeZ};
}
export function rankSuperiorityScoreR24(highValues=[],lowValues=[]){
  const high=highValues.filter(finite),low=lowValues.filter(finite);if(!high.length||!low.length)return null;let wins=0,ties=0;for(const h of high)for(const l of low){if(h>l)wins++;else if(h===l)ties++;}return 100*(wins+0.5*ties)/(high.length*low.length);
}
export function buildSectorSpeculativeCrossSectionR24({rows=[],spyRows=[],etfRows=[],pitHistory,sectorId}={}){
  if(!pitHistory?.byTicker)throw new TypeError("SECTOR_R24_PIT_HISTORY_REQUIRED");
  const spyByDate=new Map(normalizeBenchmarkRows(spyRows).map(row=>[row.date,row.close])),sectorEtfByDate=new Map(normalizeBenchmarkRows(etfRows).map(row=>[row.date,row.close]));if(!spyByDate.size||!sectorEtfByDate.size)return [];
  const byTicker=normalizeStockRows(rows),byDate=new Map();
  for(const [ticker,series] of byTicker){for(let i=78;i<series.length;i++){const feature=featureForDate(series,i,spyByDate,sectorEtfByDate);if(!feature)continue;const active=activePitEntry(pitHistory.byTicker[ticker],feature.date);if(!active||active.sectorId!==sectorId)continue;const list=byDate.get(feature.date)??[];list.push(feature);byDate.set(feature.date,list);}}
  const history=[];
  for(const [date,features] of [...byDate.entries()].sort((a,b)=>a[0].localeCompare(b[0]))){if(features.length<SECTOR_FEAR_GREED_R24_MIN_MEMBERS)continue;const sorted=[...features].sort((a,b)=>a.ivol60-b.ivol60||a.ticker.localeCompare(b.ticker)),q=Math.max(2,Math.floor(sorted.length*0.25)),low=sorted.slice(0,q),high=sorted.slice(-q),lotteryScore=rankSuperiorityScoreR24(high.map(item=>item.lotteryZMax20),low.map(item=>item.lotteryZMax20)),volumeScore=rankSuperiorityScoreR24(high.map(item=>item.volumeZ),low.map(item=>item.volumeZ));if(!finite(lotteryScore)||!finite(volumeScore))continue;history.push({date,memberObservations:features.length,quartileSize:q,lotterySuperiority:lotteryScore,volumeSuperiority:volumeScore,score:SECTOR_FEAR_GREED_R24_WEIGHTS.lotterySuperiority*lotteryScore+SECTOR_FEAR_GREED_R24_WEIGHTS.volumeSuperiority*volumeScore});}
  return history;
}
export function buildSectorSpeculativeCandidateR24(input={}){
  const history=buildSectorSpeculativeCrossSectionR24(input),current=history.at(-1)??null;return {methodologyVersion:SECTOR_FEAR_GREED_R24_SPEC_METHOD,mode:"SHADOW_RESEARCH_ONLY",economicIntent:"TICKER_NORMALIZED_CROSS_SECTIONAL_SPECULATIVE_SUPERIORITY",productionFormulaChanged:false,publicMutation:false,dbSchemaChanged:false,sectorId:input?.sectorId??null,status:current?"READY_CROSS_SECTION":"PARTIAL",score:current?.score??null,weights:{...SECTOR_FEAR_GREED_R24_WEIGHTS},historicalReferenceRequired:false,minimumMembers:SECTOR_FEAR_GREED_R24_MIN_MEMBERS,normalization:{lottery:"SECTOR_RESIDUAL_MAX20_DIVIDED_BY_60D_RESIDUAL_STD",volume:"CURRENT_LOG_DV5_DV20_ZSCORE_VS_60_RECENT_OBSERVATIONS"},metrics:{lotterySuperiority:current?.lotterySuperiority??null,volumeSuperiority:current?.volumeSuperiority??null},history};
}
