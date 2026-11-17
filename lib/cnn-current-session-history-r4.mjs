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

export function currentCnnSessionHistory(currentObservedAt,{
 checkedPoints=[],observedPoints=[],intradayObservations=[],
}={}){
 const session=cnnNyObservationDay(currentObservedAt);
 if(!session)return [];
 // An unchanged CNN source can have several distinct, successful PC checks.
 // Qualify the actual source observation day, not the PC check day.
 const checks=(Array.isArray(checkedPoints)?checkedPoints:[]).flatMap(p=>{
  if(cnnNyObservationDay(p?.sourceObservedAt)!==session)return [];
  const parsed=chartPoint(p?.checkedAt,p?.score);
  return parsed?[parsed]:[];
 });
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
