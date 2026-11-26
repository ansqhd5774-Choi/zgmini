import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeCompositeObservedDisplay} from '../lib/market-score/composite-observed-display-r1.mjs';
import {publishedCompositeMethodLabel,splitCompositeChartProvenance} from '../lib/market-score/composite-chart-provenance-r4.mjs';

const source=readFileSync(new URL('../components/dashboard-summary-chart.tsx',import.meta.url),'utf8');

test('the displayed Nov 19, Nov 21, Nov 26 scores stay attached to their own times in a single visual timeline',()=>{
 // User-observed values are a test fixture, not substituted Production data.
 const daily=[{label:'2026-11-19',value:41.5}];
 const archived=[
  {label:'2026-11-21T00:05:00Z',value:33.5},
  {label:'2026-11-26T09:15:37.679Z',value:38.4},
 ];
 const inputs=structuredClone({daily,archived});
 const points=mergeCompositeObservedDisplay(daily,archived,30);
 const classified=splitCompositeChartProvenance(points);
 assert.deepEqual(points.map(p=>({label:p.label,value:p.value})),[
  {label:'2026-11-19',value:41.5},
  {label:'2026-11-21T00:05:00.000Z',value:33.5},
  {label:'2026-11-26T09:15:37.679Z',value:38.4},
 ]);
 assert.deepEqual(classified.map(p=>p.value),[41.5,33.5,38.4]);
 assert.deepEqual(classified.map(p=>p.reconstructedValue),[41.5,null,null]);
 assert.deepEqual(classified.map(p=>p.calculatedValue),[null,33.5,38.4]);
 assert.deepEqual({daily,archived},inputs,'never change stored inputs');
 assert.equal(points.length,3,'do not invent intermediate points to connect the chart');
});

test('the single solid curve retains per-point provenance and makes no historical version claim',()=>{
 assert.equal((source.match(/<Area type="monotone"/g)??[]).length,1);
 assert.match(source,/<Area type="monotone" dataKey="value" stroke=\{color\} fill="none"[^>]*connectNulls=\{false\}/);
 assert.doesNotMatch(source,/<Area type="monotone" dataKey="(?:reconstructedValue|calculatedValue)"/);
 assert.match(source,/splitCompositeChartProvenance\(data\)/);
 assert.doesNotMatch(source,/publishedCompositeMethodLabel\(point,currentPublished\?\?null\)/,'UI does not claim model provenance in the tooltip');
 assert.match(source,/function summaryTooltipDate\(point:DashboardPoint&\{ts:number\}\)/,'both tooltips use a shared calendar-date formatter');
 assert.doesNotMatch(source,/\(계산 시각\)|현재 게시 계산점 ·/,'tooltip is strictly date and score');
 const points=splitCompositeChartProvenance([
  {label:'2026-11-19',value:41.5},
  {label:'2026-11-21T00:05:00.000Z',value:33.5}
 ]);
 const current={updatedAt:'2026-11-26T09:15:37.679Z',displayScore:38.4,modelVersion:'CM-R2'};
 assert.equal(publishedCompositeMethodLabel(points[0],current),null);
 assert.equal(publishedCompositeMethodLabel(points[1],current),null);
});
