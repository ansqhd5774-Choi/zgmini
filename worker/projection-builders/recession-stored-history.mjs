// Read-only display fields from approved R13 Current Vintage calculation rows.
// Never changes the recessionDefense scorer, weights, source dates or storage layout.
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
function shiftMonth(date,offset){
 if(!validDate(date))return null;
 const [year,month,day]=date.split("-").map(Number);
 const total=year*12+month-1+offset;
 const y=Math.floor(total/12),m=((total%12)+12)%12;
 const lastDay=new Date(Date.UTC(y,m+1,0)).getUTCDate();
 return new Date(Date.UTC(y,m,Math.min(day,lastDay))).toISOString().slice(0,10);
}
export const recessionOneYearStart=asOf=>shiftMonth(asOf,-12);
function sourcePeriodDate(date,id){
 if(id!=="realGdp")return date;
 const [year,month]=date.split("-").map(Number);
 return `${year}-${String(Math.floor((month-1)/3)*3+1).padStart(2,"0")}-01`;
}
export function enrichRecessionCoreComponents(rows,components,asOf){
 const start=shiftMonth(asOf,-12);
 return (Array.isArray(components)?components:[]).map(component=>{
  const readings=new Map();
  for(const row of Array.isArray(rows)?rows:[]){
   const date=row?.observationDate;
   if(!validDate(date)||!validDate(asOf)||date>asOf||!finite(row?.[component.id]))continue;
   const observed=sourcePeriodDate(date,component.id);
   readings.set(observed,{date:observed,value:row[component.id]});
  }
  const ordered=[...readings.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const current=ordered.at(-1)??null,previous=ordered.at(-2)??null;
  // R13 component remains the authority; never replace score, weight or value.
  const validCurrent=finite(component.value)&&current?.value===component.value;
  return {
   ...component,
   observationDate:validCurrent?current.date:component.observationDate,
   previousValue:validCurrent&&previous?previous.value:null,
   previousObservationDate:validCurrent&&previous?previous.date:null,
   trend:validCurrent&&start?ordered.filter(item=>item.date>=start&&item.date<=asOf):[],
  };
 });
}
export function recessionStoredScoreComparisons(trend,asOf,currentScore){
 const blank={week:null,month:null,threeMonth:null,sixMonth:null,year:null};
 if(!validDate(asOf)||!finite(currentScore))return blank;
 const byDate=new Map((Array.isArray(trend)?trend:[])
  .filter(point=>validDate(point?.label)&&finite(point?.value))
  .map(point=>[point.label,point.value]));
 // Do not use a nearby monthly point as a weekly observation.
 if(byDate.get(asOf)!==currentScore)return blank;
 const difference=months=>{
  const prior=byDate.get(shiftMonth(asOf,-months));
  return finite(prior)?currentScore-prior:null;
 };
 return {week:null,month:difference(1),threeMonth:difference(3),sixMonth:difference(6),year:difference(12)};
}
