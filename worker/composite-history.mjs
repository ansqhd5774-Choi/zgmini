const finiteScore=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);

const pointDate=point=>{
  const value=point?.label??point?.date??point?.observationDate??point?.asOfDate??null;
  return validDate(value)?value:null;
};

export function mergeStoredCompositeTrend({
  legacyTrend=[],
  storedSnapshots=[],
  currentScore=null,
  currentDate=null,
  maxPoints=370,
}={}){
  const byDate=new Map();

  for(const point of Array.isArray(legacyTrend)?legacyTrend:[]){
    const date=pointDate(point);
    const value=finiteScore(point?.value)?point.value:finiteScore(point?.score)?point.score:null;
    if(date&&value!==null)byDate.set(date,{label:date,value});
  }

  for(const snapshot of Array.isArray(storedSnapshots)?storedSnapshots:[]){
    const date=validDate(snapshot?.date)?snapshot.date:pointDate(snapshot);
    const value=finiteScore(snapshot?.score)
      ? snapshot.score
      : snapshot?.body?.overall?.status==="READY"&&finiteScore(snapshot?.body?.overall?.score)
        ? snapshot.body.overall.score
        : null;
    if(date&&value!==null)byDate.set(date,{label:date,value});
  }

  if(validDate(currentDate)&&finiteScore(currentScore)){
    byDate.set(currentDate,{label:currentDate,value:currentScore});
  }

  return [...byDate.values()]
    .sort((a,b)=>a.label.localeCompare(b.label))
    .slice(-Math.max(1,Math.trunc(maxPoints)||370));
}

export function oneYearHistoryStart(now){
  const date=now instanceof Date?new Date(now):new Date(now??Date.now());
  if(Number.isNaN(date.valueOf()))throw new Error("INVALID_HISTORY_TIME");
  date.setUTCFullYear(date.getUTCFullYear()-1);
  return date.toISOString().slice(0,10);
}
