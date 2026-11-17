import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {splitCompositeChartProvenance} from '../lib/market-score/composite-chart-provenance-r4.mjs';
import {mergeCompositeObservedDisplay} from '../lib/market-score/composite-observed-display-r1.mjs';

const daily=[{label:'2026-11-14',value:44},{label:'2026-11-15',value:47}];
const archive=[{label:'2026-11-16T12:00:00Z',value:50}];
const published={label:'2026-11-16T12:05:00Z',value:53,boundToPublishedCard:true};

test('R4 #28 actual 1W display keeps original points but never connects two provenance series',()=>{
 const merged=mergeCompositeObservedDisplay(daily,archive,7,published);
 const classified=splitCompositeChartProvenance(merged);
 assert.deepEqual(classified.map(p=>({label:p.label,value:p.value})),merged);
 assert.deepEqual(classified.map(p=>p.reconstructedValue),[44,47,null,null]);
 assert.deepEqual(classified.map(p=>p.calculatedValue),[null,null,50,53]);
 assert.ok(classified.every(p=>(p.calculatedValue===null)!==(p.reconstructedValue===null)));
 assert.equal(classified.at(-1).label,'2026-11-16T12:05:00.000Z');
});

test('R4 #28 calculation points in 1D are only in the calculated series',()=>{
 const merged=mergeCompositeObservedDisplay(daily,archive,1,published);
 const classified=splitCompositeChartProvenance(merged);
 assert.deepEqual(classified.map(p=>p.calculatedValue),[50,53]);
 assert.ok(classified.every(p=>p.reconstructedValue===null));
});

test('R4 #28 current-vintage 6M/1Y remain reconstruction-only without a cross-source stroke',()=>{
 for(const period of [180,365]){
  const merged=mergeCompositeObservedDisplay(daily,archive,period,published);
  const classified=splitCompositeChartProvenance(merged);
  assert.deepEqual(classified.map(p=>p.reconstructedValue),[44,47]);
  assert.ok(classified.every(p=>p.calculatedValue===null));
 }
});

test('R4 #28 zero score stays numeric, missing input stays missing, no mutation',()=>{
 const input=[{label:'2026-11-15',value:0},{label:'2026-11-16T12:00:00.000Z',value:0}];
 const before=structuredClone(input),data=splitCompositeChartProvenance(input);
 assert.deepEqual(input,before);
 assert.deepEqual(data.map(p=>p.reconstructedValue),[0,null]);
 assert.deepEqual(data.map(p=>p.calculatedValue),[null,0]);
 assert.deepEqual(splitCompositeChartProvenance([]),[]);
});

test('R4 #28 Recharts uses two nullable provenance series with no bridge and honest tooltip',()=>{
 const chart=readFileSync(new URL('../components/dashboard-summary-chart.tsx',import.meta.url),'utf8');
 assert.match(chart,/splitCompositeChartProvenance\(data\)/);
 assert.match(chart,/<Area type="monotone" dataKey="reconstructedValue"[^>]*connectNulls=\{false\}/);
 assert.match(chart,/<Area type="monotone" dataKey="calculatedValue"[^>]*connectNulls=\{false\}/);
 assert.doesNotMatch(chart,/<Area type="monotone" dataKey="value"/);
 assert.match(chart,/현행 산식 재구성 · 당시 실계산점 아님/);
 assert.match(chart,/실제 계산시각 점 · 당시 방법론 버전 미확인/);
});
