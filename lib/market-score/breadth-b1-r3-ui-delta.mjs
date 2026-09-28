import {isMarketSession} from "./breadth-b1-r3-calendar.mjs";

const finiteScore=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;
const isoDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)?value:null;

function previousCalendarDate(date){
  const [y,m,d]=date.split("-").map(Number);
  const x=new Date(Date.UTC(y,m-1,d)-86400000);
  return x.toISOString().slice(0,10);
}

export function previousCompletedMarketSession(date){
  if(!isoDate(date)||!isMarketSession(date))return null;
  let cursor=previousCalendarDate(date);
  for(let guard=0;guard<10;guard++){
    if(isMarketSession(cursor))return cursor;
    cursor=previousCalendarDate(cursor);
  }
  return null;
}

export function breadthB1R3PreviousSessionDelta(trend=[]){
  const points=(Array.isArray(trend)?trend:[]).flatMap(point=>{
    const label=isoDate(point?.label)??isoDate(point?.date);
    const raw=finiteScore(point?.value)?point.value:finiteScore(point?.score)?point.score:null;
    return label!==null&&raw!==null?[{label,value:raw}]:[];
  }).sort((a,b)=>a.label.localeCompare(b.label));

  if(points.length<2)return null;
  if(new Set(points.map(x=>x.label)).size!==points.length)return null;

  const current=points.at(-1);
  const expectedPrevious=previousCompletedMarketSession(current.label);
  if(expectedPrevious===null)return null;

  const previous=points.at(-2);
  if(previous.label!==expectedPrevious)return null;

  return {
    previousDate:previous.label,
    currentDate:current.label,
    delta:current.value-previous.value,
  };
}
