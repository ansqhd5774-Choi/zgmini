import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCnnObservedHistory,CNN_OBSERVED_HISTORY_VERSION} from '../lib/cnn-observed-history-r1.mjs';
import {refreshPublicFeeds} from '../worker/public-feed-refresh.mjs';
import {readFileSync} from 'node:fs';

const point=(date,score)=>({status:'verified',observedAt:date,score,history:[{timestamp:date,score}]});
const run=(old,next)=>mergeCnnObservedHistory(old,next,Date.parse(next.observedAt)+1000);

test('preserves the intraday 17.9 dip and rebound without rewriting closing history',()=>{
 const a=run(null,point('2026-10-23T13:30:00Z',35));
 const b=run(a,point('2026-10-23T15:00:00Z',17.9));
 const c=run(b,point('2026-10-23T20:00:00Z',28));
 assert.equal(c.observedHistoryVersion,CNN_OBSERVED_HISTORY_VERSION);
 assert.deepEqual(c.intradayObservations.map(p=>p.score),[35,17.9,28]);
 assert.deepEqual(c.dailyObservedRanges[0],{
  date:'2026-10-23',first:{observedAt:'2026-10-23T13:30:00.000Z',score:35},
  last:{observedAt:'2026-10-23T20:00:00.000Z',score:28},
  low:{observedAt:'2026-10-23T15:00:00.000Z',score:17.9},
  high:{observedAt:'2026-10-23T13:30:00.000Z',score:35},
 });
 assert.deepEqual(c.history,point('2026-10-23T20:00:00Z',28).history);
});

test('repeated verified observation does not fabricate extra 15-minute samples',()=>{
 const a=run(null,point('2026-10-23T15:00:00Z',0));
 const b=run(a,point('2026-10-23T15:00:00Z',0));
 assert.equal(b.intradayObservations.length,1);
 assert.equal(b.dailyObservedRanges[0].low.score,0);
});

test('keeps older daily extrema after recent detail expires; never backfills missing hours',()=>{
 const a=run(null,point('2026-10-01T15:00:00Z',17.9));
 const b=run(a,point('2026-10-01T20:00:00Z',30));
 const c=run(b,point('2026-10-17T15:00:00Z',45));
 assert.deepEqual(c.intradayObservations.map(p=>p.score),[45]);
 assert.deepEqual(c.dailyObservedRanges.map(p=>p.low.score),[17.9,45]);
 assert.equal(c.dailyObservedRanges[0].last.score,30);
});

test('legacy current headline seeds one real point without synthetic historical points',()=>{
 const old=point('2026-10-23T15:00:00Z',17.9);
 const c=run(old,point('2026-10-23T20:00:00Z',28));
 assert.deepEqual(c.intradayObservations.map(p=>p.score),[17.9,28]);
 assert.equal(c.dailyObservedRanges.length,1);
});

test('rejects invalid/future/regressing observation without altering existing output',()=>{
 const old=run(null,point('2026-10-23T15:00:00Z',17.9));
 assert.throws(()=>mergeCnnObservedHistory(old,point('2026-10-23T14:00:00Z',30),Date.parse('2026-10-23T15:00:00Z')),/REGRESSION/);
 assert.throws(()=>mergeCnnObservedHistory(old,point('2026-10-23T16:00:00Z',101),Date.parse('2026-10-23T16:00:00Z')),/INVALID/);
 assert.throws(()=>mergeCnnObservedHistory(old,point('2026-10-24T16:00:00Z',30),Date.parse('2026-10-23T16:00:00Z')),/INVALID/);
 assert.equal(old.dailyObservedRanges[0].low.score,17.9);
});

test('PC feed path stores bounded observed scores without changing other feed outputs',async()=>{
 const outputs=new Map();let time=Date.parse('2026-10-23T15:00:00Z');let score=17.9;
 const store={
  initialize:async()=>{},readOutput:async key=>outputs.get(key)??null,readAttempt:async()=>null,
  writeAttempt:async()=>{},writeOutput:async(key,body,now)=>{outputs.set(key,{body,storedAt:now});},
 };
 const locks={claim:async()=>1,finish:async()=>{}};
 const collectors={'fear-greed':async()=>Response.json(point(new Date(time).toISOString(),score))};
 let result=await refreshPublicFeeds({store,locks,collectors,now:time,maxFeedsPerRun:1});
 assert.equal(result.feeds.find(row=>row.key==='fear-greed').status,'COMPLETE');
 time+=15*60000;score=28;
 result=await refreshPublicFeeds({store,locks,collectors,now:time,maxFeedsPerRun:1});
 assert.equal(result.feeds.find(row=>row.key==='fear-greed').status,'COMPLETE');
 assert.deepEqual(outputs.get('fear-greed').body.intradayObservations.map(row=>row.score),[17.9,28]);
 assert.equal(outputs.size,1);
});

test('US-only 1D button and observed ranges reuse the current chart; Korea gets no new period',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const cnn=read('app/fear-greed/usa/cnn-panel.tsx');
 const kr=read('app/korea-composite-view.tsx');
 const controls=read('app/market-period-controls.tsx');
 const shared=read('app/market-card-shared.ts');
 const css=read('app/globals.css');
 const store=read('worker/public-feed-store.mjs');
 assert.match(cnn,/<MarketPeriodControls[\s\S]*?includeOneDay\s*\/>/);
 assert.match(cnn,/observedRanges=\{observedRanges\}/);
 assert.match(cnn,/selectedPeriod==="1D"\?intradayLabel:dateLabel/);
 assert.doesNotMatch(kr,/includeOneDay/);
 assert.match(controls,/data-usa-one-day=/);
 assert.doesNotMatch(shared,/key:\s*["']1D["']/);
 assert.match(css,/data-usa-one-day="true"/);
 assert.match(store,/intervalMs:15\*60000/);
});

test('six US period buttons widen toward the chart without growing the rail height',()=>{
 const mobile=readFileSync(new URL('../app/fear-greed/usa/usa-mobile-r8.css',import.meta.url),'utf8');
 const dashboard=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
 assert.match(mobile,/grid-template-columns: minmax\(0, 1fr\) 60px;/);
 assert.match(mobile,/\.cnn-period-toolbar\[data-usa-one-day="true"\] \{\s*width: 56px;[\s\S]*?height: 176px;/);
 assert.match(mobile,/\.cnn-period-toolbar\[data-usa-one-day="true"\] \.cnn-period-button \{\s*width: 56px;[\s\S]*?height: 25px;/);
 assert.match(dashboard,/\.usa-target-card\.fg-shared-shell \.fg-analysis-slot\{\s*grid-template-columns:minmax\(0,1fr\) 60px;/);
 assert.doesNotMatch(mobile,/\.zg-fg-korea/);
});
