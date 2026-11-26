import assert from 'node:assert/strict';
import {test} from 'node:test';
import {trailingFiveSessionBreadthMean} from '../app/market-breadth-trend.ts';

test('trailing SMA uses exactly five observed sessions, never future observations', () => {
  const points = [
    ['2026-10-19', 10], ['2026-10-20', 20], ['2026-10-21', 30],
    ['2026-10-22', 40], ['2026-10-23', 50], ['2026-10-26', -20],
  ].map(([date, value]) => ({date, value}));
  const result = trailingFiveSessionBreadthMean(points);
  assert.deepEqual([...result.entries()], [['2026-10-23', 30], ['2026-10-26', 24]]);
  assert.equal(trailingFiveSessionBreadthMean(points.slice(0, 5)).get('2026-10-23'), 30);
  assert.equal(trailingFiveSessionBreadthMean(points.slice(1)).get('2026-10-26'), 24);
});

test('a prolonged missing-data gap resets the average rather than connecting unrelated intervals', () => {
  const points = [
    ['2026-09-01', 50], ['2026-09-02', 50], ['2026-09-03', 50],
    ['2026-09-04', 50], ['2026-09-07', 50],
    ['2026-09-17', -40], ['2026-09-18', -40], ['2026-09-21', -40],
    ['2026-09-22', -40], ['2026-09-23', -40],
  ].map(([date, value]) => ({date, value}));
  const result = trailingFiveSessionBreadthMean(points);
  assert.equal(result.get('2026-09-07'), 50);
  for (const day of ['2026-09-17','2026-09-18','2026-09-21','2026-09-22']) assert.equal(result.has(day), false);
  assert.equal(result.get('2026-09-23'), -40);
});

test('out-of-order, duplicated, and invalid values cannot create an invented trend sample', () => {
  const points = [
    {date:'2026-10-05',value:6}, {date:'2026-09-28',value:1},
    {date:'2026-09-29',value:2}, {date:'2026-09-30',value:3},
    {date:'2026-10-01',value:4}, {date:'2026-10-02',value:5},
    {date:'2026-10-05',value:100},
    {date:'2026-10-06',value:Number.NaN},
  ];
  const result = trailingFiveSessionBreadthMean(points);
  assert.equal(result.get('2026-10-02'), 3);
  assert.equal(result.has('2026-10-05'), false);
  assert.equal(result.has('2026-10-06'), false);
});
