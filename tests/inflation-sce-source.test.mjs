import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSceYearAheadInflationRows, SCE_YEAR_AHEAD_HEADER } from '../scripts/inflation-sce-source.mjs';

const rows = (...dataRows) => [
  ['Federal Reserve Bank of New York'],
  [],
  ['Data current to September 2026'],
  ['Survey date', SCE_YEAR_AHEAD_HEADER, '3-year inflation', null, null, null, null,
    'Median point prediction one-year ahead inflation rate'],
  ...dataRows,
];

test('extracts column B only, preserves percent and chronological monthly observations', () => {
  const result = parseSceYearAheadInflationRows(rows(
    [202608, 3.579437017440796, null, null, null, null, null, 7.77],
    [202609, 3.902742862701416, null, null, null, null, null, 8.88],
  ));
  assert.deepEqual(result.observations, [
    { observationDate: '2026-08-01', value: 3.579437017440796 },
    { observationDate: '2026-09-01', value: 3.902742862701416 },
  ]);
  assert.equal(result.latestObservation.value, 3.902742862701416);
  assert.equal(result.latestMonth, '2026-09-01');
  assert.deepEqual(result.missing, []);
});

test('distinguishes explicit 0, null, blank, #N/A, absent cell, and absent month', () => {
  const result = parseSceYearAheadInflationRows(rows(
    ['202601', 0],
    ['202602', null],
    ['202603', ''],
    ['202604', '#N/A'],
    ['202605'],
    ['202607', '2.50'],
  ));
  assert.deepEqual(result.observations, [
    { observationDate: '2026-01-01', value: 0 },
    { observationDate: '2026-07-01', value: 2.5 },
  ]);
  assert.deepEqual(result.missing, [
    { observationDate: '2026-02-01', reason: 'null_cell' },
    { observationDate: '2026-03-01', reason: 'blank_cell' },
    { observationDate: '2026-04-01', reason: 'source_na' },
    { observationDate: '2026-05-01', reason: 'absent_cell' },
    { observationDate: '2026-06-01', reason: 'absent_month' },
  ]);
});

test('detects duplicate monthly rows instead of merging or silently replacing', () => {
  assert.throws(() => parseSceYearAheadInflationRows(rows(
    [202609, 3.9], [202609, 4.0],
  )), /duplicate observation month: 2026-09-01/);
});

test('rejects malformed month and numerically invalid values', () => {
  assert.throws(() => parseSceYearAheadInflationRows(rows([202613, 3.9])), /invalid YYYYMM/);
  assert.throws(() => parseSceYearAheadInflationRows(rows(['2026-09', 3.9])), /invalid YYYYMM/);
  assert.throws(() => parseSceYearAheadInflationRows(rows([202609, Infinity])), /invalid percentage/);
  assert.throws(() => parseSceYearAheadInflationRows(rows([202609, '3.9%'])), /invalid percentage/);
  assert.throws(() => parseSceYearAheadInflationRows(rows([202609, '0x10'])), /invalid percentage/);
});

test('rejects altered/missing/duplicate primary header and wholly missing values', () => {
  assert.throws(() => parseSceYearAheadInflationRows([['Date', 'Median point prediction one-year ahead inflation rate'], [202609, 3.9]]), /column B header/);
  assert.throws(() => parseSceYearAheadInflationRows(rows([202609, 3.9], [202610, 3.5],
    [202611, 4.0], ['Survey date', SCE_YEAR_AHEAD_HEADER])), /column B header/);
  assert.throws(() => parseSceYearAheadInflationRows(rows([202609, null])), /no numeric/);
  assert.throws(() => parseSceYearAheadInflationRows(rows()), /no dated observations/);
});

test('handles XLSX-style cell objects and unsorted rows without losing the latest date', () => {
  const result = parseSceYearAheadInflationRows(rows(
    [{ v: 202609 }, { v: 3.9 }],
    [{ v: 202608 }, { v: 3.6 }],
  ));
  assert.equal(result.firstMonth, '2026-08-01');
  assert.equal(result.latestMonth, '2026-09-01');
  assert.deepEqual(result.observations.map((entry) => entry.value), [3.6, 3.9]);
});

test('accepts actual xlsx-lite worksheet row descriptors', () => {
  const result = parseSceYearAheadInflationRows([
    {rowNum: 4, cells: {A4: {value: 'YYYYMM'}, B4: {value: SCE_YEAR_AHEAD_HEADER}}},
    {rowNum: 5, cells: {A5: {value: '202608'}, B5: {value: '3.579437017440796'}}},
    {rowNum: 6, cells: {A6: {value: '202609'}, B6: {value: '3.902742862701416'}, H6: {value: '100'}}},
  ]);
  assert.deepEqual(result.latestObservation, {observationDate:'2026-09-01',value:3.902742862701416});
  assert.equal(result.observations.length, 2);
});
