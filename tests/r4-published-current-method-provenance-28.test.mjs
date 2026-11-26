import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publishedCompositeMethodLabel,splitCompositeChartProvenance} from '../lib/market-score/composite-chart-provenance-r4.mjs';
import {mergeCompositeObservedDisplay} from '../lib/market-score/composite-observed-display-r1.mjs';
import {amplifyCompositeDisplayScore} from '../lib/market-score/composite-display-sensitivity-r1.mjs';

const stamp='2026-11-16T12:10:00.000Z';
const value=amplifyCompositeDisplayScore(53);
const current={updatedAt:stamp,displayScore:value,modelVersion:'CM-R1'};
const archived=[{label:'2026-11-16T12:00:00.000Z',value:50}];
const day=[{label:'2026-11-15',value:47},{label:'2026-11-16',value:50}];
const published={label:stamp,value,boundToPublishedCard:true};
const points=days=>splitCompositeChartProvenance(mergeCompositeObservedDisplay(day,archived,days,published));

test('R4 #28 current READY published instant alone has a verifiable model version',()=>{
 const rows=points(7);
 assert.equal(value,60.5);
 assert.deepEqual(rows.map(p=>p.label),[
  '2026-11-15','2026-11-16T12:00:00.000Z',stamp,
 ]);
 assert.deepEqual(rows.map(p=>publishedCompositeMethodLabel(p,current)),[null,null,'CM-R1']);
 assert.deepEqual(rows.map(p=>p.value),[47,50,60.5]);
});

test('R4 #28 historical archive dots with unknown model versions remain unidentified',()=>{
 const old={...points(7)[1],value:value,calculatedValue:value};
 assert.equal(publishedCompositeMethodLabel(old,current),null,'same numeric score is not model evidence');
 assert.equal(publishedCompositeMethodLabel({...old,label:'2026-11-15T12:10:00.000Z'},current),null);
});

test('R4 #28 same timestamp without matching published score cannot inherit current method',()=>{
 const p={...points(7).at(-1)};
 for(const bad of [0,50,60.499,61,NaN,null,undefined]){
  assert.equal(publishedCompositeMethodLabel({...p,value:bad,calculatedValue:bad},current),null,String(bad));
 }
 assert.equal(publishedCompositeMethodLabel({...p,calculatedValue:null},current),null);
});

test('R4 #28 absent, mistyped and incompatible method identities do not fabricate version',()=>{
 const p=points(1).at(-1);
 for(const modelVersion of ['',null,undefined,5,'CM','CM-R1-CANDIDATE','CURRENT','<b>CM-R1</b>']){
  assert.equal(publishedCompositeMethodLabel(p,{...current,modelVersion}),null,String(modelVersion));
 }
 assert.equal(publishedCompositeMethodLabel(p,null),null);
});

test('R4 #28 current timestamp must be a canonical exact published calculation instant',()=>{
 const p=points(1).at(-1);
 for(const updatedAt of ['2026-11-16','2026-11-16T12:10:00Z','2026-11-16T21:10:00+09:00',
  '2026-02-30T12:10:00.000Z','2026-11-17T12:10:00.000Z']){
  assert.equal(publishedCompositeMethodLabel(p,{...current,updatedAt}),null,updatedAt);
 }
 assert.equal(publishedCompositeMethodLabel({...p,label:'2026-11-16'},current),null);
});

test('R4 #28 actual score zero and 100 are legitimate current cards, never missing',()=>{
 for(const raw of [0,100]){
  const score=amplifyCompositeDisplayScore(raw);
  const p={label:stamp,value:score,calculatedValue:score,reconstructedValue:null};
  assert.equal(publishedCompositeMethodLabel(p,{...current,displayScore:score}),'CM-R1');
 }
});

test('R4 #28 6M and 1Y keep reconstructed daily-only history without method assignment',()=>{
 for(const days of [180,365]){
  const rows=points(days);
  assert.ok(rows.every(p=>p.calculatedValue===null),String(days));
  assert.deepEqual(rows.map(p=>publishedCompositeMethodLabel(p,current)),[null,null]);
 }
});

test('R4 #28 same timestamp and score only identify the current publication, not older same-day points',()=>{
 const earlier=[{label:'2026-11-16T12:00:00.000Z',value:60.5}];
 const currentPoint={...points(1).at(-1)};
 assert.equal(publishedCompositeMethodLabel(
  splitCompositeChartProvenance(earlier)[0],current),null);
 assert.equal(publishedCompositeMethodLabel(currentPoint,current),'CM-R1');
});

test('R4 #28 mapping and identity checks never mutate source points or current publication',()=>{
 const rows=points(7);
 const before=structuredClone(rows),identity=structuredClone(current);
 rows.forEach(point=>publishedCompositeMethodLabel(point,current));
 assert.deepEqual(rows,before);
 assert.deepEqual(current,identity);
});

test('R4 #28 production UI only passes current published modelVersion; historical fallback stays explicit',()=>{
 const page=readFileSync(new URL('../app/dashboard-ui.tsx',import.meta.url),'utf8');
 const chart=readFileSync(new URL('../components/dashboard-summary-chart.tsx',import.meta.url),'utf8');
 assert.match(page,/currentPublished=\{overallScore!==null&&market\?\.updatedAt&&typeof market\?\.modelVersion==='string'/);
 assert.match(page,/updatedAt:market\.updatedAt,displayScore:overallScore,modelVersion:market\.modelVersion/);
 assert.match(chart,/publishedCompositeMethodLabel\(point,currentPublished\?\?null\)/);
 assert.match(chart,/현재 게시 계산점 · \$\{currentMethod\}/);
 assert.match(chart,/실제 계산시각 점 · 당시 방법론 버전 미확인/);
 assert.doesNotMatch(chart,/현행 산식 재구성 · 당시 실계산점 아님/);
 assert.match(chart,/latestCurrentMethod=latest\?publishedCompositeMethodLabel\(latest,currentPublished\?\?null\):null/);
 assert.match(chart,/data-testid="w06-touch-tooltip"/);
 assert.match(chart,/\(currentMethod\|\|point\?\.calculatedValue!=null\)&&<span>/);
 assert.match(chart,/\(latestCurrentMethod\|\|\(latest as DashboardPoint&\{calculatedValue\?:number\|null\}\)\.calculatedValue!=null\)&&<span>/);
 assert.match(chart,/<Area type="monotone" dataKey="value"[^>]*connectNulls=\{false\}/);
});
