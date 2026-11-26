import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {splitCompositeChartProvenance} from '../lib/market-score/composite-chart-provenance-r4.mjs';
import {mergeCompositeObservedDisplay} from '../lib/market-score/composite-observed-display-r1.mjs';

const daily=[{label:'2026-11-14',value:44},{label:'2026-11-15',value:47}];
const archive=[{label:'2026-11-16T12:00:00Z',value:50}];
const published={label:'2026-11-16T12:05:00Z',value:53,boundToPublishedCard:true};

test('R4 #28 actual 1W display retains original values and two provenance types',()=>{
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

test('R4 #28 Recharts keeps observed score provenance in data while tooltip shows only date and score',()=>{
 const chart=readFileSync(new URL('../components/dashboard-summary-chart.tsx',import.meta.url),'utf8');
 assert.match(chart,/splitCompositeChartProvenance\(data\)/);
 assert.equal((chart.match(/<Area type="monotone"/g)??[]).length,1,"one visible score series");
 assert.match(chart,/<Area type="monotone" dataKey="value" stroke=\{color\} fill="none" strokeWidth=\{2\.1\} dot=\{false\}[^>]*connectNulls=\{false\}/);
 assert.doesNotMatch(chart,/<Area type="monotone" dataKey="(?:reconstructedValue|calculatedValue)"/);
 assert.doesNotMatch(chart,/dataKey="reconstructedValue"[^>]*strokeDasharray=/);
 assert.match(chart,/point.label.includes\('T'\)/,"actual timestamps remain preserved for the data layer");
 assert.doesNotMatch(chart,/현행 산식 재구성 · 당시 실계산점 아님/);
 assert.doesNotMatch(chart,/실제 계산시각 점 · 당시 방법론 버전 미확인/);
 assert.doesNotMatch(chart,/\(계산 시각\)|현재 게시 계산점 ·/);
});

// Interleaved provenance markers are not missing measurements inside either
// separately sourced series. Each series has its own independent sample order.
test('R4 #69 interleaved reconstructed and archived samples keep distinct line sequences',()=>{
 const daily=[
  {label:'2026-11-12',value:42},
  {label:'2026-11-14',value:44},
  {label:'2026-11-16',value:46},
 ];
 const archive=[
  {label:'2026-11-13T12:00:00Z',value:48},
  {label:'2026-11-15T12:00:00Z',value:49},
 ];
 const original=structuredClone({daily,archive});
 const merged=mergeCompositeObservedDisplay(daily,archive,7);
 const classified=splitCompositeChartProvenance(merged);
 assert.deepEqual(classified.map(p=>p.label),[
  '2026-11-12','2026-11-13T12:00:00.000Z','2026-11-14',
  '2026-11-15T12:00:00.000Z','2026-11-16',
 ]);
 assert.deepEqual(classified.map(p=>p.reconstructedValue),[42,null,44,null,46]);
 assert.deepEqual(classified.map(p=>p.calculatedValue),[null,48,null,49,null]);
 assert.deepEqual(classified.filter(p=>p.reconstructedValue!==null).map(p=>p.reconstructedValue),[42,44,46]);
 assert.deepEqual(classified.filter(p=>p.calculatedValue!==null).map(p=>p.calculatedValue),[48,49]);
 assert.deepEqual({daily,archive},original);
 const chart=readFileSync(new URL('../components/dashboard-summary-chart.tsx',import.meta.url),'utf8');
 assert.equal((chart.match(/<Area type="monotone"/g)??[]).length,1);
 assert.match(chart,/dataKey="value"[^>]*connectNulls=\{false\}/);
 assert.doesNotMatch(chart,/<Area type="monotone" dataKey="(?:reconstructedValue|calculatedValue)"/);
});

test('W06 #28 impossible daily, archived, and published dates never become chart points',()=>{
 const invalidDay='2026-02-30';
 const invalidTime=invalidDay+'T12:00:00Z';
 const validDay='2024-02-29';
 const future='2026-03-02T12:10:00Z';
 const originalDaily=[{label:invalidDay,value:99},{label:validDay,value:0}];
 const originalArchive=[{label:invalidTime,value:88},{label:'2026-03-02T12:00:00Z',value:50}];
 const before=structuredClone({originalDaily,originalArchive});
 const values=mergeCompositeObservedDisplay(originalDaily,originalArchive,7,{label:invalidTime,value:100,boundToPublishedCard:true});
 assert.ok(!values.some(p=>p.value===99||p.value===88||p.value===100),'impossible days cannot be retimed into actual points');
 assert.ok(values.some(p=>p.value===50),'valid actual archive remains unchanged');
 assert.deepEqual({originalDaily,originalArchive},before,'input histories are never mutated');
 assert.deepEqual(mergeCompositeObservedDisplay([],[],1,{label:invalidTime,value:40,boundToPublishedCard:true}),[]);
 assert.deepEqual(mergeCompositeObservedDisplay([],[],1,{label:future,value:0,boundToPublishedCard:true}),
  [{label:'2026-03-02T12:10:00.000Z',value:0}],'genuine valid zero survives');
 assert.deepEqual(mergeCompositeObservedDisplay([{label:validDay,value:0}],[],365),[{label:validDay,value:0}]);
});
