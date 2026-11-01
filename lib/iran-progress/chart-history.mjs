const DAY=86400000;
// Chart-only KST calendar: Seoul uses UTC+09:00. Source article dates stay unchanged.
export function kstCalendarDate(now=Date.now()){
 return new Date(now+9*3600000).toISOString().slice(0,10);
}
// Daily display of the saved model state, not extra observations or collected events.
export function dailyReferenceHistory(data,{hidePreEventCarry=false}={}){
 const end=Date.parse(data.asOfDate+'T00:00:00Z'),start=end-13*DAY;
 const changes=new Map(data.history.map(p=>[p.date,p]));
 const first=data.history[0];
 let value=hidePreEventCarry?null:first&&Number.isFinite(first.delta)?Number((first.value-first.delta).toFixed(2)):first?null:data.score;
 if(value!==null&&(value<0||value>100))value=null;
 const points=[];
 for(let at=start;at<=end;at+=DAY){
  const date=new Date(at).toISOString().slice(0,10),change=changes.get(date);
  if(change)value=change.value;
  if(value!==null)points.push({date,at,value,carried:!change});
 }
 return points;
}
