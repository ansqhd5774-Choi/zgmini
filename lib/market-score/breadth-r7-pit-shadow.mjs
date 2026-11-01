import {buildBreadthR6Components} from "./breadth-r6-shadow.mjs";

export const BREADTH_R7_PIT_SHADOW_METHOD="BREADTH_R7_PIT_MEMBERSHIP_SHADOW_R1";
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const finite=value=>typeof value==="number"&&Number.isFinite(value);

function normalizeRows(rows=[]){
  const map=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
    const tradeDate=String(row?.trade_date??row?.tradeDate??"");
    const ticker=String(row?.ticker??"").trim();
    const currentClose=Number(row?.current_close??row?.currentClose);
    const currentVolume=Number(row?.current_volume??row?.currentVolume??0);
    const previousCloseRaw=row?.previous_close??row?.previousClose;
    const previousClose=previousCloseRaw==null?null:Number(previousCloseRaw);
    if(!validDate(tradeDate)||!ticker||!finite(currentClose)||currentClose<=0||!finite(currentVolume)||currentVolume<0)continue;
    map.set(tradeDate+"|"+ticker,{
      trade_date:tradeDate,ticker,
      previous_close:finite(previousClose)&&previousClose>0?previousClose:null,
      current_close:currentClose,current_volume:currentVolume,
    });
  }
  return [...map.values()].sort((a,b)=>a.trade_date.localeCompare(b.trade_date)||a.ticker.localeCompare(b.ticker));
}
function normalizeUniverses(universes=[]){
  return (Array.isArray(universes)?universes:[])
    .filter(row=>validDate(row?.tradeDate)&&Array.isArray(row?.members))
    .map(row=>({
      tradeDate:row.tradeDate,
      members:[...new Set(row.members.map(x=>String(x??"").trim()).filter(Boolean))].sort(),
    }))
    .sort((a,b)=>a.tradeDate.localeCompare(b.tradeDate));
}
export function monthEndPitDates(universes=[],count=13){
  const byMonth=new Map();
  for(const row of normalizeUniverses(universes))byMonth.set(row.tradeDate.slice(0,7),row.tradeDate);
  return [...byMonth.values()].sort().slice(-Math.max(1,Number(count)||13));
}
export function universeForDate(universes=[],date){
  const rows=normalizeUniverses(universes);
  let found=null;
  for(const row of rows){if(row.tradeDate<=date)found=row;else break}
  return found;
}
export function buildBreadthR7PitTrend({rows=[],universes=[],dates=[],minCoverage=.98}={}){
  const normalizedRows=normalizeRows(rows);
  const normalizedUniverses=normalizeUniverses(universes);
  const results=[],trend=[];
  for(const date of dates??[]){
    if(!validDate(date))continue;
    const universe=universeForDate(normalizedUniverses,date);
    if(!universe){results.push({date,status:"PARTIAL",reason:"BREADTH_R7_PIT_UNIVERSE_MISSING"});continue}
    const result=buildBreadthR6Components({rows:normalizedRows,members:universe.members,asOfDate:date,minCoverage});
    results.push({date,memberCount:universe.members.length,...result});
    if(result.status==="READY"&&finite(result.score))trend.push({label:date,value:result.score,components:result.components,memberCount:universe.members.length});
  }
  return {
    methodologyVersion:BREADTH_R7_PIT_SHADOW_METHOD,
    mode:"SHADOW_ONLY",
    productionFormulaChanged:false,
    targetDates:(dates??[]).filter(validDate),
    readyDates:trend.length,
    results,trend,
  };
}
export function deficientPitTickers({rows=[],universes=[],dates=[],minSessions=252}={}){
  const normalizedRows=normalizeRows(rows);
  const byTicker=new Map();
  for(const row of normalizedRows){
    const list=byTicker.get(row.ticker)??[];list.push(row.trade_date);byTicker.set(row.ticker,list);
  }
  const need=new Map();
  for(const date of dates??[]){
    const universe=universeForDate(universes,date);
    if(!universe)continue;
    for(const ticker of universe.members){
      const n=(byTicker.get(ticker)??[]).filter(d=>d<=date).length;
      if(n<minSessions){
        const item=need.get(ticker)??{ticker,missingDates:0,minSessionsObserved:Infinity};
        item.missingDates++;
        item.minSessionsObserved=Math.min(item.minSessionsObserved,n);
        need.set(ticker,item);
      }
    }
  }
  return [...need.values()].sort((a,b)=>b.missingDates-a.missingDates||a.minSessionsObserved-b.minSessionsObserved||a.ticker.localeCompare(b.ticker));
}
