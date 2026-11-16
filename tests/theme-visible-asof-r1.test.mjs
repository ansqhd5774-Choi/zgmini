import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isRealThemeAsOfDay,latestVisibleThemeDay} from '../lib/theme-visible-asof-r1.mjs';

test('W06 header picks current configured date when old legacy is unavailable',()=>{
 const feed={status:'UNAVAILABLE',observationDate:'2026-10-28'};
 const themes=[{name:'새 등록 테마',date:'2026-11-15',score:51}];
 // The legacy status/date never becomes an argument to the display selector.
 assert.equal(latestVisibleThemeDay(themes),'2026-11-15');
 assert.notEqual(latestVisibleThemeDay(themes),feed.observationDate);
});

test('top-scored older theme must not overwrite the newest actually displayed date',()=>{
 const ranking=[
  {name:'1위 오래된 테마',date:'2026-11-06',score:99},
  {name:'2위 새 테마',date:'2026-11-13',score:31},
  {name:'3위 오늘 갱신',date:'2026-11-15',score:18},
 ];
 assert.equal(latestVisibleThemeDay(ranking),'2026-11-15');
 assert.notEqual(ranking[0].date,'2026-11-15');
});

test('last displayed verified provisional point extends the visible as-of day',()=>{
 const ready=[
  {name:'기존 확정',date:'2026-11-13'},
  {name:'신규 확정',date:'2026-11-14'},
  {name:'등록 테마 정상 잠정',date:'2026-11-15'},
 ];
 assert.equal(latestVisibleThemeDay(ready),'2026-11-15');
});

test('impossible date cannot silently roll forward to a false latest date',()=>{
 assert.ok(Number.isFinite(Date.parse('2026-02-30T00:00:00Z')));
 for(const value of ['2026-02-30','2026-11-31','2026-13-01','2026-1-01','not-a-date'])
  assert.equal(isRealThemeAsOfDay(value),false,value);
 assert.equal(latestVisibleThemeDay([
  {date:'2026-02-28'}, {date:'2026-02-30'}, {date:'2026-03-01'},
 ]),'2026-03-01');
});

test('leap-day and year-end date boundaries are accepted',()=>{
 for(const day of ['2024-02-29','2026-11-15','2026-12-31'])
  assert.equal(isRealThemeAsOfDay(day),true,day);
 assert.equal(latestVisibleThemeDay([{date:'2024-02-29'},{date:'2024-03-01'}]),'2024-03-01');
});

test('empty/missing/broken ranking date never invents observation day',()=>{
 for(const rows of [null,undefined,[],[{}],[{date:null}],[{date:'2026-02-30'}]])
  assert.equal(latestVisibleThemeDay(rows),null);
});

test('W06 real ThemeDetailCharts header derives as-of from accepted visible ranking',()=>{
 const src=readFileSync(new URL('../app/theme-fear-greed/theme-detail-charts.tsx',import.meta.url),'utf8');
 assert.match(src,/import \{latestVisibleThemeDay\} from ['"]\.\.\/\.\.\/lib\/theme-visible-asof-r1\.mjs['"]/);
 assert.match(src,/const displayAsOf=latestVisibleThemeDay\(ready\);/);
 assert.match(src,/최신 관측일 /);
 assert.match(src,/displayAsOf\.replaceAll/);
 assert.doesNotMatch(src,/payload\?\.observationDate\?\?ready\[0\]\.date/);
 assert.doesNotMatch(src,/validDate\(payload\?\.observationDate\)\?payload\?\.observationDate/);
});
