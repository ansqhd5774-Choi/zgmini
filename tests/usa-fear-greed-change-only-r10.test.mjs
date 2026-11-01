import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCheckDay} from '../tools/cnn-verified-checks-r9/verified-checks-r9.mjs';
import {mergeCompositeObservedDay,COMPOSITE_OBSERVED_VERSION} from '../lib/composite-observed-history-r1.mjs';
const sample=(at,score,source)=>({checkedAt:at,sourceObservedAt:source,score,sourceStoredAt:Date.parse(at)});
test('CNN unchanged source timestamp and score skips new check',()=>{
 const day='2026-11-01',source='2026-10-31T20:00:00.000Z';
 const first=sample('2026-11-01T00:00:00.000Z',25,source);
 const old={version:'CNN_VERIFIED_CHECKS_R1',date:day,checks:[first]};
 const repeat=mergeCheckDay(old,day,sample('2026-11-01T00:15:00.000Z',25,source));
 assert.equal(repeat.changed,false);
 const changed=mergeCheckDay(old,day,sample('2026-11-01T00:15:00.000Z',26,source));
 assert.equal(changed.changed,true);
});
test('composite signature repeats skip and changed signature appends after 15 minutes',()=>{
 const date='2026-11-01';
 const first={calculatedAt:'2026-11-01T00:00:00.000Z',score:40,signature:'same'};
 const old={version:COMPOSITE_OBSERVED_VERSION,date,points:[first]};
 assert.equal(mergeCompositeObservedDay(old,date,{...first,calculatedAt:'2026-11-01T00:15:00.000Z'}).changed,false);
 assert.equal(mergeCompositeObservedDay(old,date,{...first,calculatedAt:'2026-11-01T00:15:00.000Z',signature:'changed'}).changed,true);
});
