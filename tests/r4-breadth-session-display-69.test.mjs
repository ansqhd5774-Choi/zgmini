import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {currentUsIexDisplaySession} from '../lib/market-breadth/us-iex-display-session-r69.mjs';
import {usProvisionalSlot} from '../lib/market-breadth/us-provisional-r1.mjs';

const before=iso=>Date.parse(iso);
const day='2026-11-17';
const mid='2026-11-17T15:01:00.000Z'; // 10:01 EST on a regular session
const correct='2026-11-17T15:00:00.000Z';

test('R4 #69 the display uses the same eligible NYSE slot as the public producer',()=>{
 const slot=usProvisionalSlot(before(mid));
 assert.equal(slot?.observationDate,day);
 assert.equal(slot?.slotEndUtc,correct);
 assert.equal(currentUsIexDisplaySession(day,correct,before(mid)),true);
});

test('R4 #69 the previous real 15m slot remains valid during its actual 30m lifetime',()=>{
 assert.equal(currentUsIexDisplaySession(day,'2026-11-17T14:45:00.000Z',before(mid)),true);
 assert.equal(currentUsIexDisplaySession(day,'2026-11-17T14:30:00.000Z',before(mid)),false);
 assert.equal(currentUsIexDisplaySession(day,'2026-11-17T15:15:00.000Z',before(mid)),false);
});

test('R4 #69 a 16:00 ET slot may not linger in UI after 16:15 session close',()=>{
 assert.equal(currentUsIexDisplaySession(day,'2026-11-17T21:00:00.000Z',before('2026-11-17T21:14:00Z')),true);
 assert.equal(currentUsIexDisplaySession(day,'2026-11-17T21:00:00.000Z',before('2026-11-17T21:15:00Z')),false);
 assert.equal(currentUsIexDisplaySession(day,'2026-11-17T21:00:00.000Z',before('2026-11-17T21:20:00Z')),false);
});

test('R4 #69 early-close day uses existing producer 13:15 ET cutoff',()=>{
 const early='2026-11-27';
 assert.equal(currentUsIexDisplaySession(early,'2026-11-27T18:00:00.000Z',before('2026-11-27T18:14:00Z')),true);
 assert.equal(currentUsIexDisplaySession(early,'2026-11-27T18:00:00.000Z',before('2026-11-27T18:15:00Z')),false);
});

test('R4 #69 weekends, exchange holidays and before first completed slot remain unready',()=>{
 assert.equal(currentUsIexDisplaySession('2026-11-21','2026-11-21T17:00:00.000Z',before('2026-11-21T17:01:00Z')),false);
 assert.equal(currentUsIexDisplaySession('2026-11-26','2026-11-26T15:00:00.000Z',before('2026-11-26T15:01:00Z')),false);
 assert.equal(currentUsIexDisplaySession(day,'2026-11-17T14:30:00.000Z',before('2026-11-17T14:44:00Z')),false);
});

test('R4 #69 old/future/invalid timestamps and wrong trading day cannot pass',()=>{
 for(const [date,stamp,now] of [
  ['2026-11-16',correct,mid],
  ['2026-11-18',correct,mid],
  [day,'2026-02-30T15:00:00.000Z',mid],
  [day,'not-a-date',mid],
  [day,null,mid],
  [null,correct,mid],
  [day,correct,NaN],
 ]){
  assert.equal(currentUsIexDisplaySession(date,stamp,before(now??'invalid')),false,String(date));
 }
});

test('R4 #69 real US percentage strip keeps 4 IEX shares including explicit unobserved; no new score',()=>{
 const ui=readFileSync(new URL('../app/market-breadth-strip.tsx',import.meta.url),'utf8');
 const api=readFileSync(new URL('../app/api/market-breadth/route.ts',import.meta.url),'utf8');
 assert.match(ui,/currentUsIexDisplaySession\(record\.observationDate, record\.slotEndUtc\)/);
 assert.match(ui,/near100\(record\.risingPct, record\.fallingPct, record\.unchangedPct, record\.unobservedPct\)/);
 assert.match(ui,/activeProvisional\.unobservedPct\.toFixed\(1\)/);
 assert.match(ui,/\$\{pct\.toFixed\(1\)\}%/);
 assert.match(api,/if\(!currentUsIexProvisional\(record\)\)/);
 assert.match(api,/usIexPublicPercentOnly\(record\)/);
 assert.doesNotMatch(ui,/amplifyCompositeDisplayScore|calculateMarketBreadthCounts|marketOperationalStore/);
});

test('R4 #69 Korea D04 is not fabricated from US provisional data and missing counts remain missing',()=>{
 const ui=readFileSync(new URL('../app/market-breadth-strip.tsx',import.meta.url),'utf8');
 const kr=readFileSync(new URL('../app/korea-composite-view.tsx',import.meta.url),'utf8');
 assert.match(ui,/const data = market === "usa" \? activeProvisional : normalizedCounts\(counts\)/);
 assert.match(ui,/market === "usa" \? "미제공" : "연결 예정"/);
 assert.match(ui,/pct === undefined \? "—"/);
 assert.match(kr,/<MarketBreadthStrip market="korea"\/>/);
 assert.doesNotMatch(kr,/<MarketBreadthStrip market="korea" counts=/);
});

test('R4 #69 existing period controls do not turn US current-only or Korea unconnected into six fake histories',()=>{
 const ui=readFileSync(new URL('../app/market-breadth-strip.tsx',import.meta.url),'utf8');
 assert.match(ui,/period\?: MarketPeriod \| '1D'/);
 assert.doesNotMatch(ui,/history\?|readScoreHistory|fetch\('\/api\/market-breadth\/history/);
 assert.match(ui,/const activeProvisional = market === "usa"/);
 assert.match(ui,/return \(\s*<section/);
});
