import {marketChartSource} from './helpers/market-chart-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chartExtrema} from '../lib/chart-extrema.mjs';

const read=path=>readFileSync(path,'utf8');

test('inflation 1Y detail reuses the same extrema overlay as the US market dashboard',()=>{
 const panel=read('app/inflation/inflation-panel.tsx');
 const chart=marketChartSource();
 const usa=read('app/fear-greed/usa/cnn-panel.tsx');
 const overlay=read('components/chart-extremum-point.tsx');
 assert.match(usa,/<MarketFearGreedChart\s+showExtrema/);
 assert.match(panel,/<MarketFearGreedChart\s+showExtrema\s+data=\{trend\}/);
 assert.match(chart,/showExtrema = false/);
 assert.match(chart,/chartExtrema\(data\.map/);
 assert.match(chart,/<ChartExtremumPoint point=\{point\}/);
 assert.match(overlay,/point\.kind==='min'\?'최저':point\.kind==='max'\?'최고'/);
 assert.match(overlay,/point\.value\.toFixed\(1\)/);
 assert.match(overlay,/point\.date\.slice\(5\)/);
 assert.match(overlay,/pointerEvents="none"/);
});

test('extrema use only displayed dated finite score points and latest ties',()=>{
 const history=[
  {date:'2026-05-31',value:52.4},
  {date:'2026-06-30',value:68.1},
  {date:'2026-07-31',value:41.0},
  {date:'2026-08-31',value:68.1},
  {date:'2026-09-30',value:44.1},
  {date:'2026-10-16',value:17.9},
  {date:'2026-10-17',value:null},
 ];
 assert.deepEqual(chartExtrema(history),[
  {date:'2026-10-16',value:17.9,index:5,kind:'min'},
  {date:'2026-08-31',value:68.1,index:3,kind:'max'},
 ]);
 assert.deepEqual(chartExtrema([{date:'2026-10-16',value:0,index:0}]),[
  {date:'2026-10-16',value:0,index:0,kind:'flat'},
 ]);
});

test('inflation chart extrema value labels are legible without altering shared extrema labels',()=>{
 const css=read('app/inflation/inflation-hero-typography-r1.css');
 const panel=read('app/inflation/inflation-panel.tsx');
 const overlay=read('components/chart-extremum-point.tsx');
 assert.match(panel,/import "\.\/inflation-hero-typography-r1\.css"/);
 assert.match(css,/\.fg-card\.fg-shared-shell\.inflation-target-card \.zg-chart-extremum text\{\s*font-size:12px/);
 assert.match(css,/\.zg-chart-extremum text tspan:nth-child\(2\)\{\s*font-size:10px/);
 assert.match(css,/@media\(max-width:767px\)\{[\s\S]*?\.zg-chart-extremum text\{\s*font-size:11px/);
 assert.match(overlay,/fontSize=\{10\}/);
 assert.doesNotMatch(css,/^\.zg-chart-extremum\s+text\s*\{|^\.recharts-surface\s+text\s*\{/m);
 assert.doesNotMatch(css,/--fg-shared-|\.fg-chart-slot\{|\.fg-renderer\{|transform:|overflow:/);
});
