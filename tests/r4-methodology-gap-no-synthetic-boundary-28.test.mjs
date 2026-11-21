import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {marketTrendWindowR1} from '../lib/market-score/market-trend-window-r1.mjs';

const real=[
 {label:'2026-10-01',value:42},
 {label:'2026-11-10',value:47},
 {label:'2026-11-16',value:51},
];

test('R4 #28 verified composite history never invents a point at the window cutoff',()=>{
 const strict=marketTrendWindowR1(real,7,{includeBoundaryCarry:false});
 assert.deepEqual(strict,[
  {label:'2026-11-10',value:47},
  {label:'2026-11-16',value:51},
 ]);
 assert.equal(strict.some(p=>p.label==='2026-11-09'),false);
 assert.equal(strict.length,2);
});

test('R4 #28 legacy window option remains available for unrelated consumers',()=>{
 const legacy=marketTrendWindowR1(real,7);
 assert.deepEqual(legacy,[
  {label:'2026-11-09',value:42},
  {label:'2026-11-10',value:47},
  {label:'2026-11-16',value:51},
 ]);
});

test('R4 #28 strict 1M boundary does not fabricate an observation on a missing date',()=>{
 const strict=marketTrendWindowR1([
  {label:'2026-08-01',value:38},
  {label:'2026-10-30',value:43},
  {label:'2026-11-16',value:50},
 ],30,{includeBoundaryCarry:false});
 assert.deepEqual(strict,[
  {label:'2026-10-30',value:43},
  {label:'2026-11-16',value:50},
 ]);
 assert.equal(strict.some(p=>p.label==='2026-10-17'),false);
});

test('R4 #28 does not turn missing/partial values into flat or zero points',()=>{
 const strict=marketTrendWindowR1([
  {label:'2026-10-30',value:40},
  {label:'2026-11-10',value:null},
  {label:'2026-11-12',value:0},
  {label:'2026-11-16',value:53},
 ],7,{includeBoundaryCarry:false});
 assert.deepEqual(strict,[
  {label:'2026-11-12',value:0},
  {label:'2026-11-16',value:53},
 ]);
});

test('R4 #28 composite and domain chart rendering both opt out of synthetic cutoff dates',()=>{
 const source=readFileSync(new URL('../app/dashboard-ui.tsx',import.meta.url),'utf8');
 assert.match(source,/marketTrendWindowR1\(amplifyCompositeDisplayTrend\(verifiedOverallHistory\),periodDays,\{includeBoundaryCarry:false\}\)/);
 assert.ok(source.includes('const daily=marketTrendWindowR1(normalizeMarketTrendPointsR4(domain?.trend,market?.updatedAt),periodDays,{includeBoundaryCarry:false});'));
});
