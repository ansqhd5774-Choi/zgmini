import test from 'node:test';
import assert from 'node:assert/strict';
import {economicOneYearChart} from '../lib/economic-trend-chart-r60.mjs';

test('a published null point separates two actual economic scores',()=>{
 const rows=economicOneYearChart([
  {date:'2026-11-11',score:51},
  {date:'2026-11-12',score:null},
  {date:'2026-11-13',score:58},
 ]);
 assert.deepEqual(rows,[
  {date:'2026-11-11',score:51},
  {date:'2026-11-12',score:null},
  {date:'2026-11-13',score:58},
 ]);
});

test('trailing missing observation never becomes a new latest score',()=>{
 const rows=economicOneYearChart([
  {date:'2026-11-10',value:0},
  {date:'2026-11-13',value:null},
 ]);
 assert.deepEqual(rows.map(p=>p.score),[0,null]);
 assert.deepEqual(rows.filter(p=>typeof p.score==='number').at(-1),{date:'2026-11-10',score:0});
});

test('out-of-range and NaN values are gaps, not chart scores',()=>{
 const rows=economicOneYearChart([
  {date:'2026-11-10',score:32},
  {date:'2026-11-11',score:NaN},
  {date:'2026-11-12',score:150},
  {date:'2026-11-13',score:34},
 ]);
 assert.deepEqual(rows.map(p=>p.score),[32,null,null,34]);
});

test('one year is relative to the latest published date including missing entries',()=>{
 const rows=economicOneYearChart([
  {date:'2025-11-12',score:40},
  {date:'2025-11-13',score:42},
  {date:'2026-11-13',score:null},
 ]);
 assert.deepEqual(rows.map(p=>p.date),['2025-11-13','2026-11-13']);
});

test('rejects invalid calendar dates and keeps only one row per date',()=>{
 const rows=economicOneYearChart([
  {date:'2026-02-30',score:70},
  {date:'2026-02-01',score:33},
  {date:'2026-02-01',score:36},
 ]);
 assert.deepEqual(rows,[{date:'2026-02-01',score:36}]);
});

test('a latest valid observation remains the last marker even with earlier gaps',()=>{
 const rows=economicOneYearChart([
  {label:'2026-10-01',value:10},
  {label:'2026-10-03',value:null},
  {label:'2026-10-04',value:55},
 ]);
 const last=[...rows].reverse().find(point=>typeof point.score==='number');
 assert.deepEqual(last,{date:'2026-10-04',score:55});
});
