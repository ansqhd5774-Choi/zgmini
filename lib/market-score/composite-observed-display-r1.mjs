import {sampleCnnObservedPoints} from '../cnn-observed-sampling-r1.mjs';
const valid=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const DAY=86400000;

// Composite chart-only overlay. Keep older genuine daily points, substitute
// actual archived times on dates with a saved calculation, never interpolate.
export function mergeCompositeObservedDisplay(daily=[],observed=[],periodDays=365){
 const base=(Array.isArray(daily)?daily:[]).filter(p=>valid(p?.value)&&Number.isFinite(Date.parse(p?.label??'')));
 const detail=(Array.isArray(observed)?observed:[]).flatMap(p=>{
  const date=Date.parse(p?.label??'');
  return valid(p?.value)&&Number.isFinite(date)&&typeof p?.label==='string'&&p.label.includes('T')
   ?[{label:new Date(date).toISOString(),value:p.value}]:[];
 });
 if(periodDays<=1){
  const last=detail.at(-1)?.label.slice(0,10);
  return last?detail.filter(p=>p.label.slice(0,10)===last).sort((a,b)=>a.label.localeCompare(b.label)):[];
 }
 if(!detail.length)return base;
 const latest=Math.max(...[...base,...detail].map(p=>Date.parse(p.label)));
 const cutoff=latest-Math.max(1,periodDays)*DAY;
 const included=detail.filter(p=>Date.parse(p.label)>=cutoff&&Date.parse(p.label)<=latest);
 const dated=new Set(included.map(p=>p.label.slice(0,10)));
 const all=[...base.filter(p=>Date.parse(p.label)>=cutoff&&!dated.has(p.label.slice(0,10))),...included].sort((a,b)=>Date.parse(a.label)-Date.parse(b.label));
 if(all.length<=1200)return all;
 const sampled=sampleCnnObservedPoints(all.map(p=>({observedAt:new Date(p.label).toISOString(),score:p.value})));
 const kept=new Set(sampled.map(p=>p.observedAt));
 return all.filter(p=>kept.has(new Date(p.label).toISOString()));
}