const valid=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
export function domainObservationDelta(trend=[],score,previousObservation=null){
 if(!valid(score))return null;
 if(previousObservation&&valid(previousObservation.score)&&/^\d{4}-\d{2}-\d{2}$/.test(previousObservation.date)&&/^\d{4}-\d{2}-\d{2}$/.test(previousObservation.currentDate)&&previousObservation.date<previousObservation.currentDate)
  return {currentDate:previousObservation.currentDate,previousDate:previousObservation.date,delta:score-previousObservation.score};
 const dates=new Map();
 for(const point of Array.isArray(trend)?trend:[]){
  const date=point?.date??point?.label;
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date)))continue;
  const value=point.value??point.score;
  if(dates.has(date)&&dates.get(date)!==value)return null;
  dates.set(date,value);
 }
 const points=[...dates].sort(([a],[b])=>a.localeCompare(b));
 const current=points.at(-1),previous=points.at(-2);
 // Never compare across a missing observation or a different current vintage.
 if(!current||!previous||!valid(current[1])||!valid(previous[1])||Math.abs(current[1]-score)>1e-6)return null;
 return {currentDate:current[0],previousDate:previous[0],delta:score-previous[1]};
}
