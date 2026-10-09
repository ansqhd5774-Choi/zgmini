import {normalCdf} from './nyfed-worldbank-components.mjs';
export const weights=Object.freeze({G:.35,E:.25,O:.15,P:.15,I:.10});
const finite=Number.isFinite;
export function combineRisk(scores){
 const missing=Object.keys(weights).filter(k=>typeof scores[k]!=='number'||!finite(scores[k])||scores[k]<0||scores[k]>100);
 if(missing.length)return {status:'PARTIAL',score:null,missing};
 const contributions=Object.fromEntries(Object.entries(weights).map(([k,w])=>[k,w*scores[k]]));
 return {status:'READY',score:100-Object.values(contributions).reduce((a,b)=>a+b,0),contributions,missing:[]};
}
export function percentile(values,index){
 const current=values[index];if(typeof current!=='number'||!finite(current))return null;
 const ref=values.slice(Math.max(0,index-240),index).filter(v=>typeof v==='number'&&finite(v));
 if(ref.length<60)return null;
 return 100*ref.reduce((sum,v)=>sum+(v<current?1:v===current?.5:0),0)/ref.length;
}
// Standardized regressors and pivoted elimination; no automatic variable removal.
export function predictOls(training,current){
 const n=training.length,p=current.length;
 if(n<120||training.some(r=>!finite(r.y)||r.x.length!==p||r.x.some(v=>!finite(v)))||current.some(v=>!finite(v)))return null;
 const means=current.map((_,j)=>training.reduce((s,r)=>s+r.x[j],0)/n);
 const scales=means.map((m,j)=>Math.sqrt(training.reduce((s,r)=>s+(r.x[j]-m)**2,0)/n));
 if(scales.some(s=>s<1e-12))return null;
 const design=x=>[1,...x.map((v,j)=>(v-means[j])/scales[j])];
 const size=p+1,a=Array.from({length:size},()=>Array(size+1).fill(0));
 for(const row of training){const x=design(row.x);for(let i=0;i<size;i++){for(let j=0;j<size;j++)a[i][j]+=x[i]*x[j];a[i][size]+=x[i]*row.y;}}
 for(let j=0;j<size;j++){
  let pivot=j;for(let i=j+1;i<size;i++)if(Math.abs(a[i][j])>Math.abs(a[pivot][j]))pivot=i;
  if(Math.abs(a[pivot][j])<1e-9)return null;
  [a[j],a[pivot]]=[a[pivot],a[j]];const d=a[j][j];for(let k=j;k<=size;k++)a[j][k]/=d;
  for(let i=0;i<size;i++)if(i!==j){const f=a[i][j];for(let k=j;k<=size;k++)a[i][k]-=f*a[j][k];}
 }
 const x=design(current);return x.reduce((s,v,j)=>s+v*a[j][size],0);
}
export function monthly(rows,{weekly=false,stock=false,dayWeighted=false}={}){
 if(weekly&&!stock&&dayWeighted){
  const daily=new Map();
  for(const row of rows){
   if(typeof row.value!=='number'||!finite(row.value))throw new Error('INVALID_INPUT');
   const end=new Date(`${row.observationDate}T00:00:00Z`);
   if(!finite(end.getTime())||end.toISOString().slice(0,10)!==row.observationDate||end.getUTCDay()!==5)throw new Error('INVALID_WEEK_END');
   for(let offset=0;offset<7;offset++){const date=new Date(end);date.setUTCDate(date.getUTCDate()-offset);const key=date.toISOString().slice(0,10);if(daily.has(key))throw new Error('DUPLICATE_DATE');daily.set(key,row.value);}
  }
  const groups=new Map();for(const [date,value]of daily){const month=date.slice(0,7);if(!groups.has(month))groups.set(month,[]);groups.get(month).push(value);}
  return new Map([...groups].map(([month,values])=>{const [y,m]=month.split('-').map(Number),days=new Date(Date.UTC(y,m,0)).getUTCDate();return [month,values.length===days?values.reduce((a,b)=>a+b,0)/days:null];}));
 }
 const groups=new Map();
 for(const row of rows){if(!/^\d{4}-\d{2}-\d{2}$/.test(row.observationDate)||typeof row.value!=='number'||!finite(row.value))throw new Error('INVALID_INPUT');
  const key=row.observationDate.slice(0,7);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);
 }
 return new Map([...groups].map(([key,group])=>{group.sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
  if(new Set(group.map(r=>r.observationDate)).size!==group.length)throw new Error('DUPLICATE_DATE');
  // A month missing any expected Friday is incomplete, never silently averaged.
  if(weekly){const [year,month]=key.split('-').map(Number),expected=[];for(let d=1;d<=31;d++){const date=new Date(Date.UTC(year,month-1,d));if(date.getUTCMonth()!==month-1)break;if(date.getUTCDay()===5)expected.push(date.toISOString().slice(0,10));}
   if(expected.length!==group.length||expected.some(date=>!group.some(r=>r.observationDate===date)))return [key,null];}
  return [key,stock?group.at(-1).value:group.reduce((s,r)=>s+r.value,0)/group.length];
 }));
}
function monthsBetween(first,last){const out=[];let date=new Date(`${first}-01T00:00:00Z`);while(date.toISOString().slice(0,7)<=last){out.push(date.toISOString().slice(0,7));date.setUTCMonth(date.getUTCMonth()+1);}return out;}
export function calculateCandidate(input,{dayWeighted=false,controls=true}={}){
 const keys=['gscpi','pce','wti','gas','ip','consumption','stocks','production','refining','imports','exports','supplied'];
 const data=Object.fromEntries(keys.map(k=>[k,monthly(input[k]??[],{weekly:['stocks','production','refining','imports','exports','supplied'].includes(k),stock:k==='stocks',dayWeighted})]));
 const dates=Object.values(data).flatMap(map=>[...map.keys()]).sort();if(!dates.length)return {rows:[]};
 const months=monthsBetween(dates[0],dates.at(-1));
 const get=(key,i)=>data[key].get(months[i])??null;
 const log=(key,i)=>get(key,i)>0?Math.log(get(key,i)):null;
 const change=(key,i)=>log(key,i)!==null&&log(key,i-1)!==null?log(key,i)-log(key,i-1):null;
 const dummy=i=>Array.from({length:11},(_,m)=>Number(Number(months[i].slice(5))===m+1));
 const models={};
 for(const key of ['stocks','production','refining'])models[key]=months.map((_,i)=>({y:log(key,i),x:[...dummy(i),i,log(key,i-1),log('supplied',i),get('imports',i)!==null&&get('exports',i)!==null?get('imports',i)-get('exports',i):null]}));
 models.oil=months.map((_,i)=>({y:change('wti',i),x:[change('wti',i-1),change('supplied',i)]}));
 models.gas=months.map((_,i)=>({y:change('gas',i),x:[...dummy(i),change('gas',i-1),change('wti',i)]}));
 models.ip=months.map((_,i)=>({y:change('ip',i),x:[change('consumption',i),change('ip',i-1)]}));
 if(!controls){
  for(const key of ['stocks','production','refining'])models[key]=months.map((_,i)=>({y:log(key,i),x:[...dummy(i),i,log(key,i-1)]}));
  models.oil=months.map((_,i)=>({y:change('wti',i),x:[change('wti',i-1)]}));
  models.gas=months.map((_,i)=>({y:change('gas',i),x:[...dummy(i),change('gas',i-1)]}));
  models.ip=months.map((_,i)=>({y:change('ip',i),x:[change('ip',i-1)]}));
 }
 const valid=row=>typeof row.y==='number'&&finite(row.y)&&row.x.every(v=>typeof v==='number'&&finite(v));
 const residuals=Object.fromEntries(Object.entries(models).map(([key,rows])=>[key,rows.map((row,i)=>{
  if(!valid(row))return null;const history=rows.slice(0,i).filter(valid).slice(-120);const predicted=predictOls(history,row.x);return predicted===null?null:row.y-predicted;
 })]));
 const rank=Object.fromEntries(Object.entries(residuals).map(([key,values])=>{const directed=values.map(v=>v===null?null:(['oil','gas'].includes(key)?v:-v));return [key,directed.map((_,i)=>percentile(directed,i))];}));
 const p=months.map((_,i)=>get('pce',i));
 const average=(...values)=>values.every(v=>typeof v==='number'&&finite(v))?values.reduce((a,b)=>a+b,0)/values.length:null;
 const rows=months.map((month,i)=>{
  const g=get('gscpi',i);const scores={G:g===null?null:100*normalCdf(g),E:average(rank.stocks[i],rank.production[i],rank.refining[i]),O:average(rank.oil[i],rank.gas[i]),P:percentile(p,i),I:rank.ip[i]};
  return {month,scores,...combineRisk(scores),residuals:Object.fromEntries(Object.entries(residuals).map(([key,values])=>[key,values[i]]))};
 });
 return {methodologyVersion:'SUPPLY_SHOCK_R10_CANDIDATE',variant:{dayWeighted,controls},historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false,latest:rows.filter(r=>r.status==='READY').at(-1)??null,rows};
}
