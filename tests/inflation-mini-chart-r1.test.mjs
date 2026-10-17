import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildFeatureTrend1Y} from '../worker/projection-builders/inflation.mjs';

const read=path=>readFileSync(path,'utf8');

test('inflation feature trend keeps only stored points available within trailing 1Y',()=>{
 const rows=[
  {observationDate:'2025-08-01',availableAt:'2025-09-15',value:1.1},
  {observationDate:'2025-10-01',availableAt:'2025-10-17',value:1.2},
  {observationDate:'2026-03-01',availableAt:'2026-04-15',value:1.5},
  {observationDate:'2026-09-01',availableAt:'2026-10-15',value:1.3},
  {observationDate:'2026-10-01',availableAt:'2026-10-20',value:1.7},
 ];
 assert.deepEqual(buildFeatureTrend1Y(rows,'2026-10-17'),[
  {date:'2025-10-01',value:1.2},
  {date:'2026-03-01',value:1.5},
  {date:'2026-09-01',value:1.3},
 ]);
});

test('inflation indicator table renders judgement then mini chart(1Y) then help',()=>{
 const panel=read('app/inflation/inflation-panel.tsx');
 const mini=read('app/inflation/inflation-mini-chart.tsx');
 const css=read('app/inflation/inflation-mini-chart-r1.css');
 const builder=read('worker/projection-builders/inflation.mjs');
 assert.match(panel,/<th>판단<\/th><th>미니차트\(1Y\)<\/th><th><span className="sr-only">도움말<\/span>ⓘ<\/th>/);
 assert.match(panel,/InflationMiniChart label=\{meta\.label\} points=\{row\?\.trend\}/);
 assert.match(panel,/inflation-r2-mobile-spark/);
 assert.match(builder,/trend:buildFeatureTrend1Y\(rows,asOf\)/);
 assert.match(mini,/viewBox=\{`0 0 \$\{WIDTH\} \$\{HEIGHT\}`\}/);
 assert.match(mini,/<path className="inflation-mini-chart-line"/);
 assert.doesNotMatch(mini,/<(?:text|circle|rect|line)\b/);
 assert.match(css,/\.inflation-mini-chart-line\{fill:none;stroke:#59c8f8;stroke-width:2/);
 assert.match(css,/td:nth-child\(8\)\{width:130px;text-align:center\}/);
 assert.match(css,/td:nth-child\(9\)\{width:50px;text-align:center\}/);
});
