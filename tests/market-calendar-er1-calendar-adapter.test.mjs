import test from 'node:test';
import assert from 'node:assert/strict';
import {indexSavedER1CalendarDays} from '../lib/market-calendar-er1-calendar-adapter.mjs';
import {scoreER1Issuers} from '../lib/market-calendar-er1-earnings-score.mjs';

const daily=(date,pre=[],after=[],notSupplied=[])=>({
  storedAt:'2026-11-01T20:00:00Z',body:{date,pre,after,notSupplied},
});
const e=(symbol,eps,revenue,epsEstimate=999,revenueEstimate=1e15)=>({
  symbol,eps,revenue,epsEstimate,revenueEstimate,
});

test('official calendar daily groups join to latest four earnings reports, estimates ignored',()=>{
  const days=[
    daily('2025-10-30',[e('AAA',1,100)]),
    daily('2026-01-29',[],[e('AAA',null,100)]),
    daily('2026-04-30',[],[],[e('AAA',2,120)]),
    daily('2026-07-30',[e('AAA',3,null)]),
    daily('2026-11-02',[e('AAA',100,1000000000)]),
  ];
  const indexed=indexSavedER1CalendarDays(days,{asOf:'2026-11-02'});
  assert.equal(indexed.status,'READY_PRIVATE_INPUT');
  assert.equal(indexed.distinctSymbols,1);
  assert.equal(indexed.releasesBySymbol.AAA.length,4);
  assert.equal(indexed.releasesBySymbol.AAA[0].date,'2026-07-30');
  const result=scoreER1Issuers([{
    issuerId:'AAA',tickers:['AAA'],earningsSymbol:'AAA',
    releases:indexed.releasesBySymbol.AAA,
  }],{asOf:'2026-11-02'});
  assert.equal(result.status,'READY_SHADOW');
  assert.equal(result.rankings[0].epsReleases,3);
  assert.equal(result.rankings[0].revenueReleases,3);
  assert.equal(result.rankings[0].score,70);
});

test('a single saved day with one EPS and revenue actual scores without backfill',()=>{
  const indexed=indexSavedER1CalendarDays([
    daily('2026-07-30',[e('AAA',2.5,1200000000)]),
  ],{asOf:'2026-11-02'});
  assert.equal(indexed.storedDayCount,1);
  const scored=scoreER1Issuers([{
    issuerId:'AAA',tickers:['AAA'],earningsSymbol:'AAA',
    releases:indexed.releasesBySymbol.AAA,
  }],{asOf:'2026-11-02'});
  assert.equal(scored.status,'READY_SHADOW');
  assert.equal(scored.rankings[0].epsReleases,1);
  assert.equal(scored.rankings[0].revenueReleases,1);
});

test('past null/null date is retained and cannot be replaced by fifth older report',()=>{
  const dates=['2025-07-30','2025-10-30','2026-01-29','2026-04-30','2026-07-30'];
  const days=dates.map((date,i)=>daily(date,[e('AAA',i===4?null:1,i===4?null:10)]));
  const indexed=indexSavedER1CalendarDays(days,{asOf:'2026-11-02'});
  const releases=indexed.releasesBySymbol.AAA;
  assert.equal(releases.length,5);
  const scored=scoreER1Issuers([{
    issuerId:'AAA',tickers:['AAA'],earningsSymbol:'AAA',releases,
  }],{asOf:'2026-11-02'});
  assert.equal(scored.rankings[0].epsReleases,3);
  assert.equal(scored.rankings[0].revenueReleases,3);
});

test('duplicate days and invalid actuals fail closed',()=>{
  const one=daily('2026-07-30',[e('AAA',1,100)]);
  assert.throws(()=>indexSavedER1CalendarDays([one,one],{asOf:'2026-11-02'}),
    /ER1_CALENDAR_DAY_INVALID/);
  assert.throws(()=>indexSavedER1CalendarDays([daily('2026-07-30',[
    e('AAA',1,100),e('AAA',2,100),
  ])],{asOf:'2026-11-02'}),/ER1_CALENDAR_CONFLICTING_REPORT/);
  assert.throws(()=>indexSavedER1CalendarDays([daily('2026-07-30',[
    e('AAA',undefined,100),
  ])],{asOf:'2026-11-02'}),/ER1_CALENDAR_EVENT_INVALID/);
});
