import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEarningsE1R5HistoricalTrend,mergeEarningsE1R5Trend} from '../lib/market-score/earnings-e1-r5-trend.mjs';

const dates=['2025-01-15','2025-04-15','2025-07-15','2025-10-15'];
const baseRows=dates.map((date,index)=>({
 date,
 raw:{
  S1:1+index,S2:2+index,S3:3+index,S4:4+index,S5:5+index,
  S7:7+index,S8:8+index,S9:9+index,S10:10-index,
 },
}));
const historyGrid=dates.map((date,index)=>({period:`2025Q${index+1}`,date,s12b:index+1}));
const forwardRows=dates.map((date,index)=>({date,s12aRaw:index+1,s13Raw:index+2}));
const beaRows=dates.map((end,index)=>({end,value:index+1}));
const ulcRows=dates.map((end,index)=>({end,value:10-index}));

test('E1-R5 historical trend reconstructs only from prior stored observations',()=>{
 const trend=buildEarningsE1R5HistoricalTrend({
  historyGrid,baseRows,beaRows,ulcRows,forwardRows,
  sourceVersion:'fixture',sourceStoredAt:'2025-10-15T00:00:00Z',limit:8,
 });
 assert.deepEqual(trend.map(row=>row.label),dates.slice(1));
 assert.ok(trend.every(row=>Number.isFinite(row.value)&&row.value>=0&&row.value<=100));
});

test('E1-R5 trend merge preserves published same-day values and current wins last',()=>{
 const out=mergeEarningsE1R5Trend({
  reconstructed:[{label:'2025-04-15',value:40},{label:'2025-07-15',value:50}],
  published:[{label:'2025-07-15',value:55},{label:'2025-10-15',value:60}],
  current:{asOfDate:'2025-10-15',score:73.5},
  limit:8,
 });
 assert.deepEqual(out,[
  {label:'2025-04-15',value:40},
  {label:'2025-07-15',value:55},
  {label:'2025-10-15',value:73.5},
 ]);
});

test('daily updates retain the annual quarterly anchors instead of truncating to eight points',()=>{
 const quarters=[{label:'2025-09-05',value:60},{label:'2025-12-05',value:61},{label:'2026-03-05',value:62},{label:'2026-06-05',value:63}];
 const daily=Array.from({length:20},(_,i)=>({label:`2026-10-${String(i+1).padStart(2,'0')}`,value:70+i/10}));
 const out=mergeEarningsE1R5Trend({reconstructed:quarters,published:daily,current:{asOfDate:'2026-10-21',score:73}});
 assert.equal(out.length,25);
 assert.deepEqual(out.slice(0,4),quarters);
 assert.equal(out.at(-1).value,73);
});

test('retention remains bounded and explicit smaller caller limits still work',()=>{
 const published=Array.from({length:450},(_,i)=>({label:new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),value:50}));
 assert.equal(mergeEarningsE1R5Trend({published}).length,400);
 assert.equal(mergeEarningsE1R5Trend({published,limit:8}).length,8);
});
