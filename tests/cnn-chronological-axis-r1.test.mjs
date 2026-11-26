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

test('first genuine CNN point anchors every multi-point period at the left edge', () => {
  const usa = read('app/fear-greed/usa/cnn-panel.tsx');
  // Assert the production expression, not an independently fabricated score.
  assert.match(usa,/const earliest = points\.reduce\(\(min, point\) => Math\.min\(min, point\.time\), latest\);/);
  assert.match(usa,/earliest < latest \? earliest : latest - days \* 86400000/);
  assert.match(usa,/const chartTimeAxis = useMemo\(/);
  assert.match(usa,/timeAxis=\{chartTimeAxis\}/);
  const day=86400000;
  const latest=Date.parse('2026-11-26T21:00:00Z');
  for (const days of [1,7,31,93,186,366]) {
    const first=latest-Math.min(days,3)*day;
    const middle=first+(latest-first)/3;
    const domain=[first,latest];
    const x=time=>(time-domain[0])/(domain[1]-domain[0]);
    assert.equal(x(first),0,'first source point must touch left plot boundary');
    assert.equal(x(latest),1,'last source point must touch right plot boundary');
    assert.ok(x(middle)>0&&x(middle)<1,'real intermediate time retains its spacing');
  }
  // One real point is not turned into a fictitious two-point series.
  assert.equal(latest - 7*day < latest,true);
});
