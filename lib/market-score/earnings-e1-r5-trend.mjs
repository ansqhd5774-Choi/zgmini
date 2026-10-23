import {scoreEarningsE1R5Raw} from './earnings-e1-r5.mjs';

const BASE_KEYS=Object.freeze(['S1','S2','S3','S4','S5','S7','S8','S9','S10']);
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const before=(left,right)=>validDate(left)&&validDate(right)&&left<right;

function latestAt(rows,date){
 return (Array.isArray(rows)?rows:[])
  .filter(row=>validDate(row?.end)&&row.end<=date&&finite(row?.value))
  .sort((a,b)=>a.end.localeCompare(b.end))
  .at(-1)??null;
}
function priorValues(rows,date,key){
 return (Array.isArray(rows)?rows:[])
  .filter(row=>before(row?.date,date)&&finite(row?.[key]))
  .map(row=>row[key]);
}
function priorRawValues(rows,date,key){
 return (Array.isArray(rows)?rows:[])
  .filter(row=>before(row?.date,date)&&finite(row?.raw?.[key]))
  .map(row=>row.raw[key]);
}
function priorObservationValues(rows,current){
 return current?(Array.isArray(rows)?rows:[])
  .filter(row=>validDate(row?.end)&&row.end<current.end&&finite(row?.value))
  .map(row=>row.value):[];
}

export function buildEarningsE1R5HistoricalTrend({
 historyGrid=[],baseRows=[],beaRows=[],ulcRows=[],forwardRows=[],retrievedAt=null,
 sourceVersion=null,sourceStoredAt=null,limit=8,
}={}){
 const grids=(Array.isArray(historyGrid)?historyGrid:[])
  .filter(row=>validDate(row?.date)&&finite(Number(row?.s12b)))
  .map(row=>({...row,s12b:Number(row.s12b)}))
  .sort((a,b)=>a.date.localeCompare(b.date));
 const baseByDate=new Map((Array.isArray(baseRows)?baseRows:[]).filter(row=>validDate(row?.date)).map(row=>[row.date,row]));
 const forwardByDate=new Map((Array.isArray(forwardRows)?forwardRows:[]).filter(row=>validDate(row?.date)).map(row=>[row.date,row]));
 const points=[];
 for(let index=0;index<grids.length;index++){
  const item=grids[index],base=baseByDate.get(item.date),forward=forwardByDate.get(item.date),bea=latestAt(beaRows,item.date),ulc=latestAt(ulcRows,item.date);
  if(!base||!forward||!bea||!ulc)continue;
  const raw={};
  for(const key of BASE_KEYS)raw[key]=finite(base?.raw?.[key])?base.raw[key]:null;
  Object.assign(raw,{S6:bea.value,S11:ulc.value,S12A:forward.s12aRaw,S12B:item.s12b,S13:forward.s13Raw});
  const histories={};
  for(const key of BASE_KEYS)histories[key]=priorRawValues(baseRows,item.date,key);
  histories.S6=priorObservationValues(beaRows,bea);
  histories.S11=priorObservationValues(ulcRows,ulc);
  histories.S12B=grids.slice(0,index).map(row=>row.s12b).filter(finite);
  histories.S12A=priorValues(forwardRows,item.date,'s12aRaw');
  histories.S13=priorValues(forwardRows,item.date,'s13Raw');
  const scored=scoreEarningsE1R5Raw({
   raw,histories,asOfDate:item.date,retrievedAt:retrievedAt??`${item.date}T23:59:59Z`,
   sourceVersion,sourceStoredAt,historyMode:'CURRENT_VINTAGE_QUARTERLY_COMPONENT_HISTORY_WITH_SEC_ASOF_FORWARD',
  });
  if(scored?.status==='READY'&&finite(scored.score))points.push({label:item.date,value:scored.score});
 }
 const bounded=Math.max(1,Number.isInteger(limit)?limit:8);
 return points.sort((a,b)=>a.label.localeCompare(b.label)).slice(-bounded);
}

// Daily publications must not evict quarterly anchors after only eight updates.
// At most one value per date: 400 preserves a full year plus boundary history.
export function mergeEarningsE1R5Trend({reconstructed=[],published=[],current=null,limit=400}={}){
 const byDate=new Map(),add=row=>{
  const label=row?.label??row?.asOfDate,value=finite(row?.value)?row.value:finite(row?.score)?row.score:null;
  if(validDate(label)&&value!==null)byDate.set(label,{label,value});
 };
 for(const row of Array.isArray(reconstructed)?reconstructed:[])add(row);
 for(const row of Array.isArray(published)?published:[])add(row);
 add(current);
 const bounded=Math.max(1,Number.isInteger(limit)?limit:400);
 return [...byDate.values()].sort((a,b)=>a.label.localeCompare(b.label)).slice(-bounded);
}
