import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {appendPublishedDomainCurrent} from '../lib/market-score/published-domain-trend-r4.mjs';
import {miniTrendGeometry} from '../lib/market-score/mini-trend-geometry.mjs';

const daily=[{label:'2026-11-14',value:48},{label:'2026-11-16',value:50}];
const current=(score,at='2026-11-16T13:05:00.000Z')=>({label:at,value:score});

test('verified newly published domain score is the true short-period chart last point',()=>{
 const points=appendPublishedDomainCurrent(daily,current(57),7);
 assert.deepEqual(points.map(x=>x.value),[48,50,57]);
 assert.equal(points.at(-1).label,'2026-11-16T13:05:00.000Z');
 assert.deepEqual(daily,[{label:'2026-11-14',value:48},{label:'2026-11-16',value:50}]);
});

test('calculation-only repetition of the same score does not create a flat fake point',()=>{
 const points=appendPublishedDomainCurrent(daily,current(50),1);
 assert.deepEqual(points,daily);
});

test('zero is a legitimate change; null, missing, negative, NaN and >100 are not',()=>{
 const zero=appendPublishedDomainCurrent(daily,current(0),1);
 assert.equal(zero.at(-1).value,0);
 for(const value of [null,undefined,NaN,-1,101]){
  assert.deepEqual(appendPublishedDomainCurrent(daily,current(value),1),daily);
 }
});

test('a late network response with earlier calculation time does not regress chart endpoint',()=>{
 assert.deepEqual(appendPublishedDomainCurrent(daily,current(75,'2026-11-13T18:00:00Z'),7),daily);
});

test('only a timestamped verified calculation is eligible, not a date-only pseudo-event',()=>{
 assert.deepEqual(appendPublishedDomainCurrent(daily,current(60,'2026-11-16'),7),daily);
 assert.deepEqual(appendPublishedDomainCurrent(daily,current(60,'invalid'),7),daily);
});

test('6M and 1Y preserve approved daily history, without intraday interpolation',()=>{
 for(const days of [180,365])assert.deepEqual(appendPublishedDomainCurrent(daily,current(57),days),daily);
});

test('one verified real current score can be a single point; no past values are manufactured',()=>{
 assert.deepEqual(appendPublishedDomainCurrent([],current(57),1),[current(57)]);
});

test('mini card geometry uses the real published score as its last Y point',()=>{
 const points=appendPublishedDomainCurrent(daily,current(57),7);
 const geometry=miniTrendGeometry(points,7);
 assert.equal(geometry.last.y,Number((57-57*.54).toFixed(0))===geometry.last.y
  ?57-57*.54:57-57*.54);
 assert.equal(Number(geometry.last.x.toFixed(3))>0,true);
});

test('dashboard only offers the latest published score for READY domains',()=>{
 const page=readFileSync(new URL('../app/dashboard-ui.tsx',import.meta.url),'utf8');
 assert.match(page,/domain\?\.status==='READY'&&validPublicScore\(domain\.score\)/);
 assert.match(page,/appendPublishedDomainCurrent\(daily,current,periodDays\)/);
 assert.match(page,/\[market\?\.domains,market\?\.updatedAt,periodDays\]/);
});
