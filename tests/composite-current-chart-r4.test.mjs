import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeCompositeObservedDisplay} from '../lib/market-score/composite-observed-display-r1.mjs';

const daily=[
 {label:'2026-11-15',value:48},
 {label:'2026-11-16',value:50},
];
const observed=[{label:'2026-11-16T12:00:00Z',value:50}];
const at=(time,value)=>({label:'2026-11-16T'+time+'Z',value});

test('published current calculation updates the 1D last point before the 15-minute archive interval',()=>{
 const trend=mergeCompositeObservedDisplay(daily,observed,1,at('12:05:00',53));
 assert.deepEqual(trend.map(p=>p.value),[50,53]);
 assert.equal(trend.at(-1).label,'2026-11-16T12:05:00.000Z');
 assert.equal(observed.length,1,'published current is display-only, not an archive mutation');
});
test('latest published calculation replaces prior ephemeral overlay, not the confirmed archive',()=>{
 const trend=mergeCompositeObservedDisplay(daily,observed,1,at('12:10:00',56));
 assert.deepEqual(trend.map(p=>p.value),[50,56]);
});
test('unchanged published score must not add a synthetic flat observation',()=>{
 assert.deepEqual(mergeCompositeObservedDisplay(daily,observed,1,at('12:10:00',50)).map(p=>p.value),[50]);
});
test('older current response cannot overtake newer saved observation',()=>{
 assert.deepEqual(mergeCompositeObservedDisplay(daily,observed,1,at('11:50:00',56)).map(p=>p.value),[50]);
});
test('null, missing, and invalid current values are not converted to zero',()=>{
 for(const value of [null,undefined,NaN,-1,101]){
  assert.deepEqual(mergeCompositeObservedDisplay(daily,observed,1,at('12:10:00',value)).map(p=>p.value),[50]);
 }
});
test('short multiday curves combine existing history with the latest verified current',()=>{
 const trend=mergeCompositeObservedDisplay(daily,observed,7,at('12:10:00',56));
 assert.deepEqual(trend.map(p=>p.value),[48,50,56]);
 assert.equal(trend.at(-1).label,'2026-11-16T12:10:00.000Z');
});
test('long range continues using only approved daily confirmed points',()=>{
 for(const days of [180,365]){
  const trend=mergeCompositeObservedDisplay(daily,observed,days,at('12:10:00',56));
  assert.deepEqual(trend,daily);
 }
});
test('no archive means one actual verified current calculation, not invented historic points',()=>{
 assert.deepEqual(mergeCompositeObservedDisplay([],[],1,at('12:10:00',56)),
  [{label:'2026-11-16T12:10:00.000Z',value:56}]);
});
test('dashboard passes stored publication score and timestamp, without changing calculation or archive schedule',()=>{
 const page=readFileSync(new URL('../app/dashboard-ui.tsx',import.meta.url),'utf8');
 assert.match(page,/const current=overallScore===null\|\|!market\?\.updatedAt\?null:/);
 assert.match(page,/mergeCompositeObservedDisplay\(daily,archived,periodDays,current\)/);
 assert.match(page,/market\?\.updatedAt,overallScore,compositeArchive,periodDays/);
 const archive=readFileSync(new URL('../lib/composite-observed-history-r1.mjs',import.meta.url),'utf8');
 assert.match(archive,/COMPOSITE_OBSERVED_INTERVAL_MS=15\*60000/);
});
