import test from 'node:test';
import assert from 'node:assert/strict';
import {marketTrendWindowR1} from '../lib/market-score/market-trend-window-r1.mjs';

// Frozen pre-optimization behavior: retain boundary carry-forward, duplicates,
// invalid input filtering and date-label semantics exactly.
function reference(data=[],days=365){
 const dated=(Array.isArray(data)?data:[])
  .filter(p=>typeof p?.label==='string'&&/^\d{4}-\d{2}-\d{2}/.test(p.label)&&Number.isFinite(Date.parse(p.label))&&typeof p.value==='number'&&Number.isFinite(p.value)&&p.value>=0&&p.value<=100)
  .map(p=>({label:String(p.label).slice(0,10),value:p.value}))
  .sort((a,b)=>Date.parse(a.label)-Date.parse(b.label));
 if(!dated.length)return [];
 const end=Date.parse(dated.at(-1).label),span=Math.max(1,Math.trunc(Number(days)||365));
 const start=end-span*86400000,startLabel=new Date(start).toISOString().slice(0,10);
 const inside=dated.filter(p=>Date.parse(p.label)>=start);
 if(inside[0]?.label===startLabel)return inside;
 const prior=dated.filter(p=>Date.parse(p.label)<start).at(-1);
 return prior?[{label:startLabel,value:prior.value},...inside]:inside;
}

test('optimized windows preserve reference results across shuffled daily/monthly and invalid histories',()=>{
 let seed=51;
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
 const edge=[null,{}, {label:'bad',value:50},{label:'2026-02-30',value:0},
  {label:'2026-01-01T23:00:00-05:00',value:100},{label:'2026-01-01',value:0},
  {label:'2026-01-01',value:100},{label:'2026-01-02',value:null},
  {label:'2026-01-03',value:NaN},{label:'2026-01-04',value:101}];
 for(let sample=0;sample<200;sample++){
  const data=[...edge];
  for(let i=0;i<60;i++)data.push({label:new Date(Date.UTC(2024,0,1)+Math.floor(random()*1000)*86400000).toISOString().slice(0,10),value:Math.floor(random()*101)});
  for(let i=data.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[data[i],data[j]]=[data[j],data[i]];}
  const before=structuredClone(data);
  for(const days of [1,7,30,90,180,365,0,-1,'30',null])assert.deepEqual(marketTrendWindowR1(data,days),reference(data,days));
  assert.deepEqual(data,before,'Input history is never mutated');
 }
 for(const input of [null,undefined,{},[],edge])assert.deepEqual(marketTrendWindowR1(input),reference(input));
});
