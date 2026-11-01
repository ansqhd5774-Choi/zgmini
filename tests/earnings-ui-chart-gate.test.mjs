import test from 'node:test';
import assert from 'node:assert/strict';
import {collectEarningsChartMonths,inspectEarningsChartMonths} from '../scripts/earnings-ui-chart-gate.mjs';
const trend=['2025-09-05','2025-12-01','2026-03-05','2026-06-05','2026-10-16','2026-10-17'].map(label=>({label,value:73.5}));
const labels=['25/09','25/12','26/03','26/06','26/10'];
test('six observations legitimately have five unique monthly labels',()=>assert.equal(inspectEarningsChartMonths({labels,trend}).status,'PASS'));
test('no collected labels is automation blocked, never a duplicate-month failure',()=>assert.deepEqual(inspectEarningsChartMonths({labels:[],trend}),{status:'AUTOMATION_BLOCKED',reason:'AXIS_LABELS_NOT_COLLECTED'}));
test('actual duplicates and missing expected month remain failures',()=>{
 assert.equal(inspectEarningsChartMonths({labels:[...labels,'26/10'],trend}).reason,'DUPLICATE_AXIS_MONTH');
 assert.equal(inspectEarningsChartMonths({labels:labels.slice(1),trend}).status,'FAIL');
 assert.equal(inspectEarningsChartMonths({labels:['0','25','50'],trend}).status,'FAIL');
});
test('collector uses sibling tick-label layer without collecting the Y axis',()=>{
 const prior=globalThis.getComputedStyle;globalThis.getComputedStyle=()=>({display:'inline',visibility:'visible',opacity:'1'});
 try{
  const chart={querySelectorAll(selector){assert.match(selector,/\.recharts-xAxis-tick-labels /);assert.doesNotMatch(selector,/yAxis/);return labels.map(textContent=>({textContent,getBoundingClientRect:()=>({width:20,height:10})}));}};
  assert.deepEqual(collectEarningsChartMonths({querySelector:()=>chart}),labels);
 }finally{globalThis.getComputedStyle=prior;}
});
