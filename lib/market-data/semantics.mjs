import {ProviderError,numberValue} from './providers.mjs';
/** Convert SA employment levels (thousands) to consecutive monthly changes. */
export function payrollChanges(points){
 const months=new Map();
 for(const point of points){
  if(!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(point.date)||numberValue(point.value)===null)throw new ProviderError('INVALID_RESPONSE');
  if(months.has(point.date)&&months.get(point.date)!==point.value)throw new ProviderError('INVALID_RESPONSE');
  months.set(point.date,point.value);
 }
 const ordered=[...months].sort(([a],[b])=>a.localeCompare(b));
 const serial=d=>Number(d.slice(0,4))*12+Number(d.slice(5,7));
 if(ordered.length<3||serial(ordered.at(-1)[0])-serial(ordered.at(-2)[0])!==1||serial(ordered.at(-2)[0])-serial(ordered.at(-3)[0])!==1)throw new ProviderError('INSUFFICIENT_HISTORY');
 const changes=[];
 for(let i=1;i<ordered.length;i++)if(serial(ordered[i][0])-serial(ordered[i-1][0])===1)changes.push({date:ordered[i][0],value:ordered[i][1]-ordered[i-1][1]});
 return changes;
}
