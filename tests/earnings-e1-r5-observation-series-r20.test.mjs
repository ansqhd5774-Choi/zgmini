import test from 'node:test';
import assert from 'node:assert/strict';
import {buildEarningsDatedSourceComparison as build,E1_R5_OBSERVATION_BASIS as BASIS} from '../lib/market-score/earnings-e1-r5-observation-series.mjs';

const source=[
 {end:'2025-03-31',value:.01},{end:'2025-06-30',value:.02},
 {end:'2025-09-30',value:.03},{end:'2025-12-31',value:.04},
 {end:'2026-03-31',value:.05},{end:'2026-06-30',value:.06},
];
test('S6 source-period quarter series converts current and previous into existing display units, never changes score',()=>{
 const r=build({observations:source,asOfDate:'2026-10-17',currentValue:6,scale:100});
 assert.equal(r.historyKind,BASIS);
 assert.equal(r.sourcePeriodEnd,'2026-06-30');
 assert.equal(r.previousPeriodEnd,'2026-03-31');
 assert.equal(r.previousValue,5);
 assert.deepEqual(r.sourceHistory1Y.map(x=>x.date),['2025-12-31','2026-03-31','2026-06-30']);
 assert.equal(r.sourceHistory1Y.at(-1).value,6);
});
test('S11 current-vintage official series may legitimately include negative values',()=>{
 const r=build({observations:[{end:'2026-03-31',value:2.5},{end:'2026-06-30',value:-1.3}],asOfDate:'2026-10-17',currentValue:-1.3});
 assert.equal(r.previousValue,2.5);
 assert.equal(r.sourceHistory1Y.length,2);
});
test('invalid, stale, conflicting and non-identical source values never produce fabricated display data',()=>{
 const common={observations:source,asOfDate:'2026-10-17',currentValue:6,scale:100};
 assert.equal(build({...common,currentValue:6.1}),null);
 assert.equal(build({...common,asOfDate:'n/a'}),null);
 assert.equal(build({...common,observations:[...source,{end:'2026-06-30',value:999}]}),null);
 assert.equal(build({...common,observations:[{end:'2026-06-30',value:.06}]}).sourceHistory1Y.length,0);
});
test('future-period observations are dropped, not smuggled into one-year chart',()=>{
 const r=build({observations:[...source,{end:'2027-03-31',value:99}],asOfDate:'2026-10-17',currentValue:6,scale:100});
 assert.equal(r.sourcePeriodEnd,'2026-06-30');
 assert.equal(r.sourceHistory1Y.at(-1).value,6);
});
