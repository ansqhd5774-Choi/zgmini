import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {koreaRev7DisplayDayMs,koreaRev7VisibleHistoryDays} from '../lib/korea-rev7-display-day-r4.mjs';

const anchor='20261117';
const row=(date,score)=>({date,score,displayScore:score});
test('W06 #37 Gregorian KRX YYYYMMDD trading day is not Date.parse-normalized',()=>{
 for(const bad of ['20260230','20261131','20261301','20260001','20250229',
  '2026-11-17','20261117T00','2026111','not-a-day','20260100',null,undefined,7]){
  assert.equal(Number.isFinite(koreaRev7DisplayDayMs(bad)),false,String(bad));
 }
 assert.equal(koreaRev7DisplayDayMs('20240229'),Date.parse('2024-02-29T00:00:00.000Z'));
 assert.equal(koreaRev7DisplayDayMs(anchor),Date.parse('2026-11-17T00:00:00.000Z'));
});

test('W06 #37 current published trading date is strict upper bound, irrespective of input ordering',()=>{
 const records=[
  row('20261118',100),
  row('20261117',0),
  row('20261116',53),
  row('20260230',80),
  row('20261115',52),
  row('20261201',99),
 ];
 const copy=structuredClone(records);
 const view=koreaRev7VisibleHistoryDays(records,anchor,7);
 assert.deepEqual(view.map(x=>x.date),['20261115','20261116','20261117']);
 assert.deepEqual(view.map(x=>x.score),[52,53,0]);
 assert.deepEqual(records,copy);
 assert.equal(view.at(-1).time,koreaRev7DisplayDayMs(anchor));
});

test('W06 #37 invalid or missing published observation day makes chart empty, never future history',()=>{
 const records=[row('20261116',40),row('20261118',80)];
 for(const date of [null,undefined,'20260230','20261131','20261117T00','']){
  assert.deepEqual(koreaRev7VisibleHistoryDays(records,date,7),[],String(date));
 }
});

test('W06 #37 all existing 1W/1M/3M/6M/1Y cutoffs preserve true dates and score zero',()=>{
 const records=[
  row('20251001',10),row('20260501',20),row('20260801',30),
  row('20261017',40),row('20261115',50),row('20261117',0),
  row('20261118',90),
 ];
 for(const days of [7,30,90,180,365]){
  const window=koreaRev7VisibleHistoryDays(records,anchor,days);
  assert.equal(window.at(-1).score,0,days);
  assert.equal(window.at(-1).date,anchor,days);
  assert.ok(window.every(x=>x.date<=anchor),days);
  assert.ok(window.every(x=>Number.isFinite(x.time)),days);
  assert.ok(!window.some(x=>x.date==='20261118'),days);
 }
});

test('W06 #37 daily gaps remain gaps and 0/null are not filled or re-scored',()=>{
 const records=[row('20261113',null),row('20261117',0)];
 const data=koreaRev7VisibleHistoryDays(records,anchor,7);
 assert.equal(data.length,2);
 assert.deepEqual(data.map(x=>x.score),[null,0]);
 assert.ok(data.every(x=>x.date!=='20261114'));
});

test('W06 #37 cards and chart use same valid observation-day guard in real TSX',()=>{
 const src=readFileSync(new URL('../app/korea-composite-view.tsx',import.meta.url),'utf8');
 assert.match(src,/import \{koreaRev7DisplayDayMs,koreaRev7VisibleHistoryDays\}/);
 assert.match(src,/const time=\(d:string\)=>koreaRev7DisplayDayMs\(d\)/);
 assert.match(src,/const ms=koreaRev7DisplayDayMs\(value\)/);
 assert.match(src,/const rows=koreaRev7VisibleHistoryDays\(item\.history,item\.observationDate,activeDays\)/);
 assert.match(src,/const chartHistory=useMemo\(\(\)=>koreaRev7VisibleHistoryDays/);
 assert.match(src,/allHistory,c\?\.observationDate,getMarketPeriodConfig\(selectedPeriod\)\.days/);
 assert.match(src,/composite:valid\?c:null/);
 assert.match(src,/valid&&c\?\.status==='STALE'/);
 assert.match(src,/score=valid\?c!\.displayScore!:null/);
 assert.match(src,/value:loading\|\|score===null\?'—':score\.toFixed\(1\)/);
});
