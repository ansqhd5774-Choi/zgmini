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
