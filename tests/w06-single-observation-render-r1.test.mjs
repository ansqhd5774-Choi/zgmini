import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeCompositeObservedDisplay} from '../lib/market-score/composite-observed-display-r1.mjs';
import {amplifyCompositeDisplayScore} from '../lib/market-score/composite-display-sensitivity-r1.mjs';

const dashboard=readFileSync(new URL('../app/dashboard-ui.tsx',import.meta.url),'utf8');
const chart=readFileSync(new URL('../components/dashboard-summary-chart.tsx',import.meta.url),'utf8');
const observedAt='2026-11-22T00:00:50.969Z';
const score=45.137344974152676;
const display=amplifyCompositeDisplayScore(score);

test('W06: one real 1D archive observation remains renderable, never fabricates a second',()=>{
 const points=mergeCompositeObservedDisplay([],[{label:observedAt,value:display}],1,{label:observedAt,value:display,boundToPublishedCard:true});
 assert.equal(points.length,1);
 assert.equal(points[0].label,observedAt);
 assert.equal(points[0].value,display);
 assert.match(dashboard,/overallTrend\.length>0\s*\?\s*<SummaryTrend/);
 assert.match(chart,/singlePointLabel&&<span role="status"/);
 assert.match(chart,/ReferenceDot x=\{latest\.ts\} y=\{latest\.value\}/);
});

test('W06: zero points retain missing-data state, two genuine changes stay distinct',()=>{
 assert.deepEqual(mergeCompositeObservedDisplay([],[],1),[]);
 const later='2026-11-22T00:20:50.969Z';
 const points=mergeCompositeObservedDisplay([],[{label:observedAt,value:display},{label:later,value:display+1}],1);
 assert.equal(points.length,2);
 assert.deepEqual(points.map(p=>p.label),[observedAt,later]);
 assert.match(dashboard,/추이 데이터 준비 중/);
});

test('W06: raw and chart values use approved sensitivity once',()=>{
 assert.equal(display,Math.max(0,Math.min(100,50+(score-50)*3.5)));
 assert.equal(mergeCompositeObservedDisplay([],[{label:observedAt,value:display}],1)[0].value,display);
});
