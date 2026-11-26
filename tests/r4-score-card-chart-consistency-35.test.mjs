import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeCompositeObservedDisplay} from '../lib/market-score/composite-observed-display-r1.mjs';
import {appendPublishedDomainCurrent} from '../lib/market-score/published-domain-trend-r4.mjs';
import {amplifyCompositeDisplayScore,amplifyCompositeDisplayTrend} from '../lib/market-score/composite-display-sensitivity-r1.mjs';
import {marketTrendWindowR1} from '../lib/market-score/market-trend-window-r1.mjs';
import {DOMAIN_WEIGHTS} from '../lib/market-score/composite-model-r1.mjs';

const iso=(time,value)=>({label:'2026-11-16T'+time+'Z',value});
const daily=[{label:'2026-11-15',value:48},{label:'2026-11-16',value:50}];
const verified=(raw,clock='12:10:00')=>({...iso(clock,amplifyCompositeDisplayScore(raw)),boundToPublishedCard:true});
const summary=(raw,clock,archive=[],days=1)=>mergeCompositeObservedDisplay(
 marketTrendWindowR1(amplifyCompositeDisplayTrend(daily),days),
 archive.map(p=>({...p,value:amplifyCompositeDisplayScore(p.value)})),
 days,raw===null?null:verified(raw,clock)
);
const domainCurve=(score,clock,days)=>appendPublishedDomainCurrent(
 marketTrendWindowR1(daily,days),
 score===null?null:iso(clock,score),days
);
const score=(p)=>p?.value??null;
const equal=(a,b)=>Math.abs(a-b)<1e-7;

test('R4 #35 published 53 and archive 50 yield matching 60.5 card/chart 1D endpoint',()=>{
 const curve=summary(53,'12:10:00',[iso('12:00:00',50)],1);
 assert.deepEqual(curve.map(p=>p.value),[50,60.5]);
 assert.ok(equal(score(curve.at(-1)),amplifyCompositeDisplayScore(53)));
 assert.equal(curve.at(-1).label,'2026-11-16T12:10:00.000Z');
});

test('R4 #35 future archive cannot overtake an older verified current market response',()=>{
 for(const days of [1,7,30,90]){
  const archive=[iso('12:00:00',50),iso('12:20:00',56)];
  const before=structuredClone(archive);
  const curve=summary(53,'12:10:00',archive,days);
  assert.ok(equal(score(curve.at(-1)),60.5),String(days));
  assert.equal(curve.at(-1).label,'2026-11-16T12:10:00.000Z');
  assert.ok(!curve.some(p=>p.label.includes('12:20')),String(days));
  assert.deepEqual(archive,before,'chart never edits saved PC archive');
 }
});

test('R4 #35 same calculation timestamp conflict cannot replace verified card value',()=>{
 for(const days of [1,7,30,90]){
  const curve=summary(53,'12:10:00',[iso('12:00:00',50),iso('12:10:00',56)],days);
  assert.ok(equal(score(curve.at(-1)),60.5),String(days));
  assert.equal(curve.filter(p=>p.label.includes('12:10')).length,1);
 }
});

test('R4 #35 matching archive at current timestamp remains a single genuine calculation',()=>{
 const curve=summary(53,'12:10:00',[iso('12:00:00',50),iso('12:10:00',53)],1);
 assert.deepEqual(curve.map(p=>p.value),[50,60.5]);
});

test('R4 #35 repeated publication of the same score does not generate fake flat points',()=>{
 const curve=summary(50,'12:10:00',[iso('12:00:00',50)],1);
 assert.deepEqual(curve.map(p=>p.value),[50]);
});

test('R4 #35 official zero remains a genuine eligible score and nonnumeric values never become zero',()=>{
 const curve=summary(0,'12:10:00',[iso('12:00:00',50)],1);
 assert.equal(curve.at(-1).value,0);
 for(const bad of [null,undefined,NaN,-1,101]){
  assert.equal(amplifyCompositeDisplayScore(bad),null);
 }
});

test('R4 #35 6M/1Y use only confirmed daily history rather than inventing intraday observations',()=>{
 for(const days of [180,365]){
  const real=summary(53,'12:10:00',[iso('12:20:00',56)],days);
  assert.deepEqual(real,marketTrendWindowR1(amplifyCompositeDisplayTrend(daily),days));
 }
});

test('R4 #35 a missing current market score does not invent a card or fresh chart calculation',()=>{
 const curve=summary(null,'12:10:00',[iso('12:00:00',50)],1);
 assert.equal(amplifyCompositeDisplayScore(null),null);
 assert.deepEqual(curve.map(p=>p.value),[50]);
});

test('R4 #35 domain cards use all 12 approved identities without applying composite 3.5 sensitivity',()=>{
 assert.equal(DOMAIN_WEIGHTS.length,12);
 assert.equal(new Set(DOMAIN_WEIGHTS.map(d=>d.id)).size,12);
 for(const id of DOMAIN_WEIGHTS.map(d=>d.id)){
  for(const days of [1,7,30,90]){
   const curve=domainCurve(53,'12:10:00',days);
   assert.equal(score(curve.at(-1)),53,id+'/'+days);
   assert.equal(curve.at(-1).label,'2026-11-16T12:10:00.000Z',id+'/'+days);
  }
 }
});

test('R4 #35 domain 0, null, backwards timestamp and repeated score have correct semantics',()=>{
 const zero=domainCurve(0,'12:10:00',7);
 assert.equal(zero.at(-1).value,0);
 assert.deepEqual(domainCurve(null,'12:10:00',7),marketTrendWindowR1(daily,7));
 assert.deepEqual(domainCurve(50,'12:10:00',7),marketTrendWindowR1(daily,7));
 const earlier=appendPublishedDomainCurrent(daily,iso('00:00:00',53),7);
 assert.deepEqual(earlier,daily);
});

test('R4 #35 domain 6M/1Y preserve confirmed daily points and valid original units',()=>{
 for(const days of [180,365]){
  assert.deepEqual(domainCurve(53,'12:10:00',days),marketTrendWindowR1(daily,days));
 }
});

test('R4 #35 absent history is not backfilled with fake calculations',()=>{
 const actual=mergeCompositeObservedDisplay([],[],1,verified(53));
 assert.deepEqual(actual,[{label:'2026-11-16T12:10:00.000Z',value:60.5}]);
});

test('R4 #35 UI uses exactly the same publication for both current cards and chart overlays',()=>{
 const page=readFileSync(new URL('../app/dashboard-ui.tsx',import.meta.url),'utf8');
 assert.match(page,/overallRawScore===null\?null:amplifyCompositeDisplayScore\(overallRawScore\)/);
 assert.match(page,/const current=overallScore===null\|\|!market\?\.updatedAt\?null:/);
 assert.match(page,/mergeCompositeObservedDisplay\(daily,archived,periodDays,current\)/);
 assert.match(page,/domain\?\.status==='READY'&&validPublicScore\(domain\.score\)/);
 assert.match(page,/appendPublishedDomainCurrent\(daily,current,domainChartDays\)/);
});

test('R4 #35 generic unbound display keeps newer actual archive as existing contract requires',()=>{
 const archived=[iso('12:00:00',50)];
 const current=iso('11:50:00',56);
 assert.deepEqual(mergeCompositeObservedDisplay(daily,archived,1,current).map(p=>p.value),[50]);
});
