import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('USA CNN opts into a continuous time axis for all six periods, Korea stays unchanged', () => {
  const usa = read('app/fear-greed/usa/cnn-panel.tsx');
  const korea = read('app/korea-composite-view.tsx');
  const shared = read('app/market-fear-greed-chart-renderer.tsx');
  assert.match(usa, /timeAxis=\{chartTimeAxis\}/);
  assert.match(usa, /period === "1D" \? 1 : getMarketPeriodConfig\(period\)\.days/);
  for (const period of ['1D', '1W', '1M', '3M', '6M', '1Y']) {
    assert.ok(usa.includes(`period === "${period}"`) || period === '1Y');
  }
  assert.doesNotMatch(korea, /timeAxis=/);
  assert.match(shared, /type=\{timeAxis\?"number":"category"\}/);
  assert.match(shared, /dataKey=\{timeAxis\?"chartTime":"date"\}/);
  assert.match(shared, /allowDataOverflow=\{Boolean\(timeAxis\)\}/);
  assert.match(shared, /const chartX=\(date:string\)=>timeAxis\?Date\.parse\(date\):date/);
  assert.match(shared, /const sourceLabel=timeAxis&&typeof tooltipPayload/);
  assert.match(shared, /samples=\{data\.map\(p=>\(\{x:chartX\(p\.date\)/);
});

test('one observation day cannot consume more than its calendar share of each window', () => {
  const day = 86400000;
  const last = Date.parse('2026-11-03T10:10:00Z');
  const oneDayEarlier = last - day;
  const recentChecks = [
    '2026-11-03T09:04:16Z',
    '2026-11-03T09:34:16Z',
    '2026-11-03T09:54:16Z',
  ].map(Date.parse);
  for (const days of [1, 7, 31, 93, 186, 366]) {
    const start = last - days * day;
    const position = time => (time - start) / (last - start);
    assert.ok(Math.abs(position(last) - position(oneDayEarlier) - 1 / days) < 1e-10);
    const checkSpread = position(recentChecks.at(-1)) - position(recentChecks[0]);
    assert.ok(checkSpread <= 1 / days);
  }
});
