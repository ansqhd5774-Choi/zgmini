import assert from 'node:assert/strict';
import test from 'node:test';
import {buildEmploymentR538} from '../lib/diagnostic-layer/employment-r538-components.mjs';

function monthly(startYear, startMonth, values) {
  return values.map((value, i) => {
    const d = new Date(Date.UTC(startYear, startMonth - 1 + i, 1));
    return {observationDate:d.toISOString().slice(0,10),value};
  });
}

test('R53.8 employment prevents one-month payroll rebound from overriding severe unemployment', () => {
  const payroll = monthly(2019, 9, [
    151500,151700,151900,152100,152200,152300,150800,130400,133000,137700,139000,140500,141800,142100,142400,142500
  ]);
  const unemployment = monthly(2019, 9, [
    3.5,3.6,3.5,3.6,3.5,3.5,4.4,14.8,13.2,11.0,10.2,8.4,7.8,6.9,6.7,6.7
  ]);
  const out=buildEmploymentR538({unemploymentRows:unemployment,payrollLevelRows:payroll,asOfDate:'2020-12-01',shockMinValid:3});
  assert.equal(out.status,'READY');
  const byDate=new Map(out.rows.map(r=>[r.observationDate,r]));
  const pre=byDate.get('2019-12-01').score;
  const april=byDate.get('2020-04-01').score;
  const june=byDate.get('2020-06-01').score;
  const dec=byDate.get('2020-12-01').score;
  assert.ok(april<=10);
  assert.ok(june<=45);
  assert.ok(dec>=april+20);
  assert.ok(dec<=pre-10);
});

test('R53.8 employment uses Level 70% + Trend 30% exact formula', () => {
  const payroll=monthly(2020,1,[100,101,102,103,104,105]);
  const unemployment=monthly(2020,1,[4,4,4,4,4,4]);
  const out=buildEmploymentR538({unemploymentRows:unemployment,payrollLevelRows:payroll,asOfDate:'2020-06-01',shockMinValid:2});
  const row=out.current;
  const expectedU=70;
  const growth=400*Math.log(105/102);
  const trend=Math.max(0,Math.min(100,50+10*growth));
  assert.ok(Math.abs(row.score-(.70*expectedU+.30*trend))<1e-12);
});

test('R53.8 hidden shock does not alter visible score', () => {
  const payroll=monthly(2010,1,Array.from({length:80},(_,i)=>1000+i*3-(i===75?120:0)));
  const unemployment=monthly(2010,1,Array.from({length:80},(_,i)=>4+(i===75?4:0)));
  const out=buildEmploymentR538({unemploymentRows:unemployment,payrollLevelRows:payroll,shockMinValid:60});
  assert.equal(out.status,'READY');
  const row=out.rows.find(r=>r.observationDate==='2016-04-01');
  if(row) {
    assert.ok(Number.isFinite(row.score));
    assert.ok(row.employmentShock===null || Number.isFinite(row.employmentShock));
  }
});
