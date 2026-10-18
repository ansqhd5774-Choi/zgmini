import test from 'node:test';
import assert from 'node:assert/strict';
import {auditR20ThreeAxisDatePotential,checkedR20Rows} from '../lib/market-score/theme-fear-greed-r20-price-window-gate.mjs';
const d=n=>Array.from({length:n},(_,i)=>new Date(Date.parse('2022-01-03T00:00:00Z')+i*86400000).toISOString().slice(0,10));
const bars=n=>d(n).map((date,i)=>({date,close:100+i/10,volume:100+i}));
test('R3 price input date windows need 628 aligned ETF + benchmark rows',()=>{
 const x=auditR20ThreeAxisDatePotential('SMH',bars(628),bars(800));
 assert.equal(x.trendPercentilePossibleDates,253);
 assert.equal(x.volatilityPercentilePossibleDates,315);
 assert.equal(x.relativeStrengthPercentilePossibleDates,252);
 assert.equal(x.threeAxisCommonDates,252);
 assert.equal(x.fiveAxisScoreReady,false);
});
test('627 rows cannot supply 252 post-normalization relative strength dates',()=>{
 const x=auditR20ThreeAxisDatePotential('SMH',bars(627),bars(800));
 assert.equal(x.threeAxisCommonDates,251);
 assert.equal(x.threeAxis252DatePotential,false);
});
test('fund launch or strategy cutover cannot borrow past ticker history',()=>{
 const rows=bars(800);
 const x=auditR20ThreeAxisDatePotential('COOL',rows,bars(900),rows[650].date);
 assert.equal(x.postKnownBoundaryBars,150);
 assert.equal(x.relativeStrengthPercentilePossibleDates,0);
 assert.equal(x.threeAxis252DatePotential,false);
});
test('benchmark missing trading days reduce date potential',()=>{
 const x=auditR20ThreeAxisDatePotential('SMH',bars(628),bars(800).filter((_,i)=>i%3!==0));
 assert.ok(x.benchmarkAlignedBars<628);
 assert.equal(x.threeAxis252DatePotential,false);
});
test('explicitly reject duplicates, impossible dates, invalid prices and cutovers',()=>{
 assert.throws(()=>checkedR20Rows([{date:'2026-02-30',close:1,volume:2}]),/R20_PRICE_ROW_INVALID_OR_UNSORTED/);
 assert.throws(()=>checkedR20Rows([{date:'2026-01-02',close:1,volume:2},{date:'2026-01-02',close:1,volume:2}]),/R20_PRICE_ROW_INVALID_OR_UNSORTED/);
 assert.throws(()=>auditR20ThreeAxisDatePotential('COOL',bars(628),bars(800),'2026-02-30'),/R20_CUTOVER_INVALID/);
});
test('PIT, reference and two non-price axes always remain UNVERIFIED',()=>{
 const x=auditR20ThreeAxisDatePotential('BOTZ',bars(750),bars(900));
 assert.equal(x.reference756Verified,false);
 assert.equal(x.securityContinuityVerified,false);
 assert.equal(x.threeAxesActuallyScored,false);
 assert.equal(x.breadthVerified,false);
 assert.equal(x.demandVerified,false);
 assert.equal(x.publicationApproved,false);
});
