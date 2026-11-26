import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {marketTrendWindowR1} from '../lib/market-score/market-trend-window-r1.mjs';
import {miniTrendGeometry} from '../lib/market-score/mini-trend-geometry.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ui=read('app/dashboard-ui.tsx');
const summary=read('components/dashboard-summary-chart.tsx');
const extra=read('components/dashboard-secondary-plots.tsx');

test('four monthly domains preserve genuine historical values while spanning the full plot width',()=>{
 const cases=[
  {id:'inflation',rows:[['2025-11-30',73.53],['2026-10-31',53.26],['2026-11-26',53.98]]},
  {id:'employment',rows:[['2025-12-01',20.92],['2026-10-01',59.10],['2026-11-26',43.16]]},
  {id:'growth',rows:[['2025-12-01',44.92],['2026-10-01',61.75],['2026-11-26',52.95]]},
  {id:'consumption',rows:[['2025-11-01',39.71],['2026-08-01',48.50],['2026-09-01',37.27]]},
 ];
 for(const item of cases){
  const stored=item.rows.map(([label,value])=>({label,value}));
  const before=structuredClone(stored);
  const plotted=marketTrendWindowR1(stored,365,{includeBoundaryCarry:false});
  const result=miniTrendGeometry(plotted,365);
  assert.equal(plotted.length,3,item.id+' historic data not discarded by 30-day filter');
  assert.match(result.path,/^M13\.000,/);
  assert.match(result.path,/L217\.000,[0-9.]+$/);
  assert.equal((result.path.match(/M/g)??[]).length,1,item.id+' no disconnected segments');
  assert.equal((result.path.match(/L/g)??[]).length,plotted.length-1,item.id+' each two actual points joined by a line segment');
  assert.deepEqual(stored,before,item.id+' no source changes');
 }
});

test('the mini curve joins only verified existing points and cannot invent a line from one point',()=>{
 const points=[{label:'2026-09-01',value:37.27},{label:'2026-11-01',value:40},{label:'2026-11-26',value:0}];
 const geometry=miniTrendGeometry(points,365,['2026-10-01']);
 assert.ok(geometry.path.startsWith('M13.000,'));
 assert.equal((geometry.path.match(/L/g)??[]).length,2);
 assert.equal((geometry.path.match(/M/g)??[]).length,1);
 assert.match(geometry.path,/L217\.000,57\.000$/,'real zero is the last point');
});

test('dashboard cards use the selected composite period and real observations',()=>{
 assert.match(ui,/const domainChartDays=periodDays/);
 assert.match(ui,/domain\?\.trend,market\?\.updatedAt\),domainChartDays,\{includeBoundaryCarry:false\}/);
 assert.match(ui,/CardTrend data=\{trend\}[^\n]*periodDays=\{domainChartDays\}/);
 assert.match(ui,/\[market\?\.domains,market\?\.updatedAt,periodDays\]/,'all 12 trends recompute on period selection');
 assert.doesNotMatch(ui,/<circle /,'mini charts do not draw marker dots');
 assert.doesNotMatch(ui,/geometry\.bridge/,'no dashed missing-data bridge overlay');
 assert.match(ui,/이력 부족/,'do not invent a line for a single observation');
});
test('composite and secondary plots are straight segments with no visible point markers',()=>{
 assert.match(summary,/const start=points\.length>1\?Math\.min\(\.\.\.points\.map\(point=>point\.ts\)\)/);
 assert.match(summary,/<Area type="linear" dataKey="value"[^>]*dot=\{false\} activeDot=\{false\}/);
 assert.match(summary,/chartExtrema\(scaled\.points\.map/,'minimum and maximum are computed only from visible observations');
 assert.match(summary,/showMarker=\{false\}/,'restore extrema value labels without point markers');
 const extremaView=read('components/chart-extremum-point.tsx');
 assert.match(extremaView,/showMarker&&<circle/,'extrema circles can be disabled without altering other chart consumers');
 assert.match(summary,/ReferenceDot x=\{latest\.ts\} y=\{latest\.value\} r=\{8\} fill="transparent" stroke="transparent"/,'invisible mobile touch target is retained');
 assert.doesNotMatch(extra,/type="monotone" dataKey="value"/);
 assert.doesNotMatch(extra,/activeDot=\{\{r:5\}\}/);
 assert.equal((extra.match(/activeDot=\{false\}/g)??[]).length,4,'all secondary plots suppress point markers even on hover');
 assert.match(extra,/<Line type="linear" dataKey="value"[^>]*dot=\{false\}/);
});
