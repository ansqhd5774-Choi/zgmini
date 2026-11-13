import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validThemeChartDay} from '../lib/theme-chart-day-r62.mjs';

test('real dates including leap day remain valid theme chart observations',()=>{
 for(const day of ['2024-02-29','2026-01-01','2026-11-14','2026-12-31'])
  assert.equal(validThemeChartDay(day),true,day);
});
test('impossible February dates cannot be normalized into another month',()=>{
 for(const day of ['2026-02-29','2026-02-30','2024-02-30'])
  assert.equal(validThemeChartDay(day),false,day);
});
test('impossible month ends cannot become the next month',()=>{
 for(const day of ['2026-04-31','2026-06-31','2026-11-31'])
  assert.equal(validThemeChartDay(day),false,day);
});
test('malformed and untyped dates are not chart points',()=>{
 for(const day of ['2026-13-01','2026-00-10','2026-11-00','2026-1-01','2026-11-1','2026-11-14T00:00:00Z','',null,0,undefined])
  assert.equal(validThemeChartDay(day),false,String(day));
});
test('a corrupted last stored or provisional date is rejected before axis/display',()=>{
 assert.equal(Number.isFinite(Date.parse('2026-02-30T00:00:00Z')),true,
  'baseline: JS Date.parse silently normalizes the impossible date');
 assert.equal(validThemeChartDay('2026-02-30'),false);
 assert.equal(validThemeChartDay('2026-03-02'),true);
});
test('theme chart wiring protects confirmed, provisional and header dates',()=>{
 const src=readFileSync(new URL('../app/theme-fear-greed/theme-detail-charts.tsx',import.meta.url),'utf8');
 assert.ok(src.includes('const validDate=(v:unknown):v is string=>validThemeChartDay(v);'));
 assert.ok(src.includes('validDate(p?.date)'), 'confirmed 252-point history');
 assert.ok(src.includes('validDate(extra?.date)'), 'provisional extension');
 assert.ok(src.includes('const displayAsOf=validDate(payload?.observationDate)'),
  'header cannot display a malformed observation date');
});
