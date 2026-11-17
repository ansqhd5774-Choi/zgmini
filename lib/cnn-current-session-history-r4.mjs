// CNN 1D must not reuse checks or observed history from an earlier US session.
// PC checkedAt is a verification event, never a new CNN observation.
const nyParts=new Intl.DateTimeFormat('en-US',{
 timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',
});
export function cnnNyObservationDay(value){
 if(typeof value!=='string')return null;
 const ms=Date.parse(value);
 if(!Number.isFinite(ms))return null;
 const pieces=Object.fromEntries(nyParts.formatToParts(new Date(ms)).map(p=>[p.type,p.value]));
 return [pieces.year,pieces.month,pieces.day].join('-');
}
const scoreValid=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const chartPoint=(at,score)=>{
 const ms=typeof at==='string'?Date.parse(at):NaN;
 return Number.isFinite(ms)&&scoreValid(score)?{date:new Date(ms).toISOString(),time:ms,score}:null;
};

/**
 * @param {string | null | undefined} currentObservedAt
 * @param {Array<{checkedAt:string,sourceObservedAt:string,score:number}>} [checkedPoints]
 */
export function currentCnnSessionCheckedPoints(currentObservedAt,checkedPoints=[]){
 const session=cnnNyObservationDay(currentObservedAt);
 if(!session)return [];
 // PC checks from a different US market day are not source observations.
 // A check on the following NY day cannot extend yesterday's 1D chart.
 return (Array.isArray(checkedPoints)?checkedPoints:[]).flatMap(p=>{
  if(cnnNyObservationDay(p?.sourceObservedAt)!==session ||
     cnnNyObservationDay(p?.checkedAt)!==session)return [];
  const parsed=chartPoint(p?.checkedAt,p?.score);
  if(!parsed || parsed.time<Date.parse(p.sourceObservedAt))return [];
  return [parsed];
 });
}

/**
 * @param {string | null | undefined} currentObservedAt
 * @param {{
 *  checkedPoints?: Array<{checkedAt:string,sourceObservedAt:string,score:number}>,
 *  observedPoints?: Array<{observedAt:string,score:number}>,
 *  intradayObservations?: Array<{observedAt:string,score:number}>,
 * }} [options]
 */
export function currentCnnSessionHistory(currentObservedAt,{
 checkedPoints=[],observedPoints=[],intradayObservations=[],
}={}){
 const session=cnnNyObservationDay(currentObservedAt);
 if(!session)return [];
 const checks=currentCnnSessionCheckedPoints(currentObservedAt,checkedPoints);
 const observations=(Array.isArray(observedPoints)?observedPoints:[]).flatMap(p=>{
  if(cnnNyObservationDay(p?.observedAt)!==session)return [];
  const parsed=chartPoint(p?.observedAt,p?.score);
  return parsed?[parsed]:[];
 });
 const intraday=(Array.isArray(intradayObservations)?intradayObservations:[]).flatMap(p=>{
  if(cnnNyObservationDay(p?.observedAt)!==session)return [];
  const parsed=chartPoint(p?.observedAt,p?.score);
  return parsed?[parsed]:[];
 });
 // At least two verified checks are required before drawing check-time history.
 // Real CNN source timestamps remain the fallback. Never interpolate or invent.
 const archive=checks.length>=2?checks:observations;
 const selected=archive.length>=2?[...archive,...intraday]:intraday.length?intraday:archive;
 const byTimestamp=new Map(selected.map(point=>[point.date,point]));
 return [...byTimestamp.values()].sort((a,b)=>a.time-b.time);
}
