import test from 'node:test';
import assert from 'node:assert/strict';
import {uniqueChartTooltipEntries} from '../lib/chart-tooltip-unique.mjs';

const seven=['로봇·자동화','클라우드·SaaS','자율주행','원전·SMR','방산','핀테크','사이버보안'];
const biotech='바이오·신약';
const item=(id,segment,value)=>({dataKey:`${id}__${segment}`,name:id,value});
const sevenRows=(segment)=>seven.map((id,i)=>item(id,segment,40+i));

test('10/19 and 10/20: one tooltip score per theme is unchanged',()=>{
 for(const date of ['2026-10-19','2026-10-20']){
  const payload=[...sevenRows('solid'),item(biotech,'solid',29)];
  assert.equal(uniqueChartTooltipEntries(payload).length,8,date);
 }
});

test('10/21: biotech anchor appears once despite solid and dashed lines',()=>{
 const payload=[...sevenRows('solid'),item(biotech,'solid',29),item(biotech,'dash',29)];
 const results=uniqueChartTooltipEntries(payload);
 assert.equal(results.length,8);
 assert.equal(results.filter(x=>x.name===biotech).length,1);
 assert.equal(results.find(x=>x.name===biotech).value,29);
 assert.equal(payload.length,9,'do not mutate the chart input');
});

test('10/22: seven anchor scores appear once, biotech stays independent',()=>{
 const payload=[...sevenRows('solid'),...sevenRows('dash'),item(biotech,'dash',26.5)];
 const results=uniqueChartTooltipEntries(payload);
 assert.equal(results.length,8);
 assert.equal(new Set(results.map(x=>x.name)).size,8);
 assert.equal(results.find(x=>x.name===biotech).value,26.5);
});

test('10/23: dashed points alone remain visible without duplicates',()=>{
 const payload=[...sevenRows('dash'),item(biotech,'dash',22.6)];
 assert.equal(uniqueChartTooltipEntries(payload).length,8);
});

test('same label with distinct IDs is preserved; only finite actual scores display',()=>{
 const input=[{dataKey:'idA__solid',name:'동명이인',value:20},{dataKey:'idB__dash',name:'동명이인',value:40},
  {dataKey:'noValue__solid',value:null},{dataKey:'bad__dash',value:NaN},{dataKey:'missing__dash',value:undefined}];
 assert.deepEqual(uniqueChartTooltipEntries(input).map(x=>x.value),[20,40]);
});
