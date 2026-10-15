import {test} from 'node:test';import assert from 'node:assert/strict';
import {compositeDayDelta,compositePeriodDelta} from '../lib/market-score/composite-day-delta.mjs';
test('uses distinct stored days and the displayed score transformation',()=>{
 const result=compositeDayDelta([{label:'2026-10-15',value:51},{label:'2026-10-16',value:51.2}],51.2);
 assert.equal(result.delta,0.7);assert.equal(result.previousDate,'2026-10-15');
});
test('preserves zero, clipping and missing comparisons',()=>{
 assert.equal(compositeDayDelta([{label:'2026-10-15',value:0},{label:'2026-10-16',value:0}],0).delta,0);
 assert.equal(compositeDayDelta([{label:'2026-10-15',value:90},{label:'2026-10-16',value:95}],95).delta,0);
 assert.equal(compositeDayDelta([{label:'2026-10-15',value:null},{label:'2026-10-16',value:51}],51),null);
 assert.equal(compositeDayDelta([{label:'2026-10-16',value:51}],51),null);
});
test('rejects a current score from a different history vintage',()=>{
 assert.equal(compositeDayDelta([{label:'2026-10-15',value:50},{label:'2026-10-16',value:51}],52),null);
});
test('selected period uses its dated baseline and requires sufficient history',()=>{
 const history=[{label:'2026-09-16',value:49},{label:'2026-10-09',value:50},{label:'2026-10-15',value:51},{label:'2026-10-16',value:51.2}];
 assert.equal(compositePeriodDelta(history,51.2,7).delta,4.2);
 assert.equal(compositePeriodDelta(history,51.2,30).delta,7.7);
 assert.equal(compositePeriodDelta(history,51.2,365),null);
 assert.equal(compositePeriodDelta(history,52,7),null);
});
