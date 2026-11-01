// Additive presentation fields from previously saved local observations only.
// Score methods, weights, public score, and source-history semantics are unchanged.
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const dated=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const utcDate=value=>new Date(value+"T00:00:00Z");
function yearStart(date){
 if(!dated(date))return null;
 const d=utcDate(date);d.setUTCFullYear(d.getUTCFullYear()-1);
 return d.toISOString().slice(0,10);
}
function shiftDate(date,days){
 const d=utcDate(date);d.setUTCDate(d.getUTCDate()+days);
 return d.toISOString().slice(0,10);
}
export function enrichLiquidityDisplayRows(indicators,sources,asOf){
 return indicators.map((indicator,index)=>{
  const [sourceRows,valueOf]=sources[index]??[];
  if(!Array.isArray(sourceRows)||typeof valueOf!=="function"||!dated(indicator.observationDate)){
   return {...indicator,previousValue:null,previousObservationDate:null,trend:[]};
  }
  const dates=new Map();
  for(const row of sourceRows){
   const date=row?.observationDate,number=valueOf(row);
   if(dated(date)&&date<=indicator.observationDate&&date<=asOf&&finite(number))dates.set(date,{date,value:number});
  }
  const actual=[...dates.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const earlier=actual.filter(p=>p.date<indicator.observationDate).at(-1)??null;
  const start=yearStart(indicator.observationDate);
  const monthly=new Map();
  for(const p of actual)if(start&&p.date>=start)monthly.set(p.date.slice(0,7),p);
  return {...indicator,previousValue:earlier?.value??null,previousObservationDate:earlier?.date??null,trend:[...monthly.values()].map(p=>({date:p.date,value:p.value}))};
 });
}
// Deltas use actual stored score snapshots; missing periods never become zero.
export function liquidityStoredScoreComparisons(trend,asOf,score){
 const empty={week:null,month:null,threeMonth:null,sixMonth:null,year:null};
 if(!dated(asOf)||!finite(score)||!Array.isArray(trend))return empty;
 const series=trend.filter(p=>dated(p?.label)&&p.label<=asOf&&finite(p.value)).sort((a,b)=>a.label.localeCompare(b.label));
 const current=series.at(-1);
 if(!current||Math.abs(current.value-score)>1e-6)return empty;
 const currentDate=current.label;
 const periods={week:[7,7],month:[30,14],threeMonth:[90,21],sixMonth:[180,30],year:[365,45]};
 const answer={...empty};
 for(const [key,[days,tolerance]] of Object.entries(periods)){
  const target=shiftDate(currentDate,-days);
  const earlier=series.filter(p=>p.label<=target).at(-1);
  if(!earlier)continue;
  const lag=(utcDate(target).getTime()-utcDate(earlier.label).getTime())/86400000;
  if(lag>tolerance)continue;
  answer[key]=Math.round((score-earlier.value)*10)/10;
 }
 return answer;
}
