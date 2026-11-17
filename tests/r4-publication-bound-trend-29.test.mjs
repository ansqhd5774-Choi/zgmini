import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeMarketTrendPointsR4} from '../lib/market-score/market-trend-normalize-r4.mjs';
import {marketTrendWindowR1} from '../lib/market-score/market-trend-window-r1.mjs';
import {compositeDayDelta,compositePeriodDelta} from '../lib/market-score/composite-day-delta.mjs';
import {amplifyCompositeDisplayScore} from '../lib/market-score/composite-display-sensitivity-r1.mjs';
import {appendPublishedDomainCurrent} from '../lib/market-score/published-domain-trend-r4.mjs';

// W06 #29 scope: browser display only, no Writer/SQLite/D1 or archive contract change.
const published='2026-11-17T07:20:38.096Z';

test('#29 publication-bound READY history excludes future dated points without changing persisted input',()=>{
 const original=[
  {date:'2026-11-16',value:50,status:'READY'},
  {date:'2026-11-17',value:53,status:'READY'},
  {date:'2026-11-18',value:99,status:'READY'},
  {date:'2026-11-16',value:96,status:'PROVISIONAL'},
 ];
 const before=structuredClone(original);
 assert.deepEqual(normalizeMarketTrendPointsR4(original,published),[
  {label:'2026-11-16',value:50},{label:'2026-11-17',value:53},
 ]);
 assert.deepEqual(original,before,'source observations and status are never mutated');
 assert.deepEqual(normalizeMarketTrendPointsR4(original),[
  {label:'2026-11-16',value:50},{label:'2026-11-17',value:53},
  {label:'2026-11-18',value:99},
 ],'unbounded compatibility for existing callers remains unchanged');
});

test('#29 within-day future calculation after accepted public snapshot cannot overwrite the card/chart',()=>{
 const accepted=[
  {label:'2026-11-17T07:00:00.000Z',value:50,status:'READY'},
  {label:published,value:53,status:'READY'},
  {label:'2026-11-17T07:20:39.000Z',value:99,status:'READY'},
  {label:'2026-11-17T09:00:00.000Z',value:80,status:'PARTIAL'},
 ];
 assert.deepEqual(normalizeMarketTrendPointsR4(accepted,published),[
  {label:'2026-11-17T07:00:00.000Z',value:50},
  {label:published,value:53},
 ]);
});

test('#29 impossible date and ambiguous timezone are not promoted into published observed points',()=>{
 const points=[
  {date:'2026-02-30',value:99},
  {label:'2026-11-17T08:00:00',value:90},
  {label:'2026-11-17T07:20:38.096+00:00',value:53},
  {label:'2026-11-17',value:0},
  {label:'2026-11-18',value:0},
  {label:'2026-11-16',value:null},
  {label:'2026-11-16',value:101},
 ];
 assert.deepEqual(normalizeMarketTrendPointsR4(points,published),[
  {label:'2026-11-17T07:20:38.096+00:00',value:53},
  {label:'2026-11-17',value:0},
 ]);
});

test('#29 approved 6 periods and day change use only real non-future published dates',()=>{
 const incoming=[
  {label:'2026-10-15',value:48},
  {label:'2026-11-16',value:50},
  {label:'2026-11-17',value:53},
  {label:'2026-11-18',value:92},
 ];
 const normalized=normalizeMarketTrendPointsR4(incoming,published);
 for(const days of [1,7,30,90,180,365]){
  const chart=marketTrendWindowR1(normalized,days);
  assert.ok(chart.length>=1);
  assert.equal(chart.at(-1).label,'2026-11-17');
  assert.ok(!chart.some(p=>p.label>'2026-11-17'));
 }
 const day=compositeDayDelta(normalized,53);
 const period=compositePeriodDelta(normalized,53,1);
 assert.equal(day.delta,10.5);
 assert.equal(period.delta,10.5);
 assert.equal(day.currentDate,'2026-11-17');
 assert.equal(period.previousDate,'2026-11-16');
 assert.equal(amplifyCompositeDisplayScore(53),60.5,'3.5x approved transform unchanged');
});

test('#29 domain cards do not plot an unverified future daily point ahead of their card',()=>{
 const domain=normalizeMarketTrendPointsR4([
  {date:'2026-11-16',score:49,status:'READY'},
  {date:'2026-11-17',score:50,status:'READY'},
  {date:'2026-11-18',score:100,status:'READY'},
 ],published);
 for(const days of [1,7,30,90,180,365]){
  const series=marketTrendWindowR1(domain,days);
  const appended=appendPublishedDomainCurrent(series,{label:published,value:53},days);
  assert.ok(appended.every(p=>p.label<='2026-11-17T07:20:38.096Z'));
  assert.ok(!appended.some(p=>p.label.startsWith('2026-11-18')));
 }
});

test('#29 dashboard binds the same accepted publication timestamp to history, comparisons, domains and period availability',()=>{
 const ui=readFileSync(new URL('../app/dashboard-ui.tsx',import.meta.url),'utf8');
 assert.match(ui,/normalizeMarketTrendPointsR4\(market\?\.overall\?\.trend,market\?\.updatedAt\)/);
 assert.match(ui,/compositeDayDelta\(verifiedOverallHistory,overallRawScore\)/);
 assert.match(ui,/compositePeriodDelta\(verifiedOverallHistory,overallRawScore,periodDays\)/);
 assert.match(ui,/marketTrendWindow\(amplifyCompositeDisplayTrend\(verifiedOverallHistory\),periodDays\)/);
 assert.match(ui,/normalizeMarketTrendPointsR4\(domain\?\.trend,market\?\.updatedAt\)/);
 assert.match(ui,/normalizeMarketTrendPointsR4\(data,market\?\.updatedAt\)/);
});
