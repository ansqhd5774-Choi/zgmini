import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {miniTrendTimestamp,cleanInflationMiniTrend,inflationMiniChartPath} from '../lib/inflation-mini-chart-geometry.mjs';

const row=(date,value,breakBefore=false)=>({date,value,breakBefore});
test('real leap day and YYYY-MM monthly labels remain valid',()=>{
 assert.ok(Number.isFinite(miniTrendTimestamp('2024-02-29')));
 assert.equal(miniTrendTimestamp('2026-10'),Date.parse('2026-10-01T00:00:00Z'));
 assert.deepEqual(cleanInflationMiniTrend([row('2026-10',1),row('2026-11-02',2)]).map(p=>p.date),['2026-10','2026-11-02']);
});
test('impossible leap/calendar days are rejected, not normalized to March',()=>{
 for(const invalid of ['2026-02-29','2026-02-31','2024-02-30','2026-04-31','2026-11-31'])assert.equal(miniTrendTimestamp(invalid),null,invalid);
});
test('invalid formats and out-of-range months are rejected',()=>{
 for(const invalid of ['not-a-date','2026-13','2026-00','2026-11-00','2026-11-3','2026/11/03','2026-01-01T00:00:00Z',''])assert.equal(miniTrendTimestamp(invalid),null,invalid);
});
test('valid zero and negative observations survive while NaN and infinity do not',()=>{
 const rows=cleanInflationMiniTrend([row('2026-10-01',0),row('2026-10-02',-1),row('2026-10-03',NaN),row('2026-10-04',Infinity)]);
 assert.deepEqual(rows.map(p=>p.value),[0,-1]);
});
test('bad dates cannot become last displayed point, including when invalid sorts last',()=>{
 const rows=cleanInflationMiniTrend([row('2026-09-01',1),row('not-a-date',99),row('2026-10-01',2),row('2026-02-31',77)]);
 assert.deepEqual(rows.map(p=>p.date),['2026-09-01','2026-10-01']);
 assert.equal(rows.at(-1).value,2);
});
test('invalid date alone is not a renderable two-point chart',()=>{
 assert.equal(cleanInflationMiniTrend([row('2026-10-01',2),row('not-a-date',3)]).length,1);
 assert.equal(inflationMiniChartPath([row('2026-10-01',2),row('not-a-date',3)]),'');
});
test('geometry uses observed UTC intervals rather than fabricated array positions',()=>{
 const rows=cleanInflationMiniTrend([row('2026-01-11',3),row('2026-01-02',2),row('2026-01-01',1)]);
 const path=inflationMiniChartPath(rows);
 assert.match(path,/^M3\.00 /);
 assert.match(path,/L13\.60 /);
 assert.match(path,/L109\.00 /);
 assert.ok(!/NaN|Infinity/.test(path));
});
test('breakBefore retains explicit gap and no line is connected across it',()=>{
 const rows=cleanInflationMiniTrend([row('2026-01-01',1),row('2026-02-01',2,true),row('2026-03-01',3)]);
 assert.deepEqual([...inflationMiniChartPath(rows).matchAll(/(?:^| )([ML])\d+\.\d+ \d+\.\d+/g)].map(m=>m[1]),['M','M','L']);
});
test('source component uses tested geometry and preserves existing SVG contracts',()=>{
 const src=readFileSync(new URL('../app/inflation/inflation-mini-chart.tsx',import.meta.url),'utf8');
 assert.match(src,/cleanInflationMiniTrend\(points\)/);
 assert.match(src,/inflationMiniChartPath\(data\)/);
 assert.match(src,/viewBox=\{`0 0 \$\{WIDTH\} \$\{HEIGHT\}`\}/);
 assert.match(src,/<path className="inflation-mini-chart-line"/);
});
