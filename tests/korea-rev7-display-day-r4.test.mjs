import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {koreaRev7DisplayDayMs,koreaRev7VisibleHistoryDays,koreaRev7ChartScore} from '../lib/korea-rev7-display-day-r4.mjs';
import {publicSnapshot} from '../worker/korea-funds.mjs';
import {REV7_VERSION,REV7_FACTORS} from '../worker/korea-rev7-engine.mjs';

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
 assert.match(src,/import \{koreaRev7DisplayDayMs,koreaRev7VisibleHistoryDays,koreaRev7ChartScore\}/);
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


test('W06 #37 public displayScore null never silently falls back to a private/raw score',()=>{
 assert.equal(koreaRev7ChartScore({date:anchor,score:70.25,displayScore:null}),null);
 assert.equal(koreaRev7ChartScore({date:anchor,score:70.25,displayScore:Number.NaN}),null);
 assert.equal(koreaRev7ChartScore({date:anchor,score:70.25,displayScore:101}),null);
 assert.equal(koreaRev7ChartScore({date:anchor,score:0,displayScore:0}),0);
 assert.equal(koreaRev7ChartScore({date:anchor,score:53.249,displayScore:53.2}),53.2);
 assert.equal(koreaRev7ChartScore({date:anchor,score:53.249}),53.249,'legacy missing display field can use valid raw');
 assert.equal(koreaRev7ChartScore({date:anchor,score:101}),null,'invalid fallback remains missing');
});

test('W06 #37 existing Rev7 stored Reader gives completed day card and each period real last chart point',async()=>{
 const makeRow=(date,score,status='READY')=>({
  date,methodology_version:REV7_VERSION,
  factors_json:JSON.stringify(Object.fromEntries(REV7_FACTORS.map(id=>[id,{id,score:score===null?null:50}]))),
  composite_json:JSON.stringify({status,score,observationDate:date}),
  history_mode:'RECONSTRUCTED_CURRENT_VINTAGE',point_in_time_verified:0,
  calculated_at:'2026-11-18T15:00:00.000Z',
 });
 const saved=[
  makeRow('20261113',44.44),
  makeRow('20261114',null,'WARMUP'),
  makeRow('20261117',0),
  makeRow('20261118',53.249),
  makeRow('20261119',null,'WARMUP'),
 ];
 let loadCount=0;
 const snapshot=await publicSnapshot({},{
  loadProgress:async()=>({status:'COMPLETE',successfulTradingDates:1030}),
  loadRows:async()=>{loadCount++;return saved;},
  clock:()=>new Date('2026-11-19T00:00:00.000Z'),
 });
 assert.equal(loadCount,1,'only the stored Reader is used, never an upstream provider');
 assert.equal(snapshot.composite.methodologyVersion,REV7_VERSION);
 assert.equal(snapshot.composite.observationDate,'20261118');
 assert.equal(snapshot.composite.displayScore,53.2);
 assert.equal(snapshot.composite.history.at(-1).displayScore,null,'incomplete next date remains null');
 for(const days of [7,30,90,180,365]){
  const points=koreaRev7VisibleHistoryDays(snapshot.composite.history,snapshot.composite.observationDate,days);
  assert.equal(points.at(-1).date,'20261118');
  assert.equal(koreaRev7ChartScore(points.at(-1)),snapshot.composite.displayScore,'period '+days);
  assert.ok(points.every(p=>p.date<='20261118'),'never render incomplete or future stored trading day');
  assert.ok(points.some(p=>p.date==='20261117'&&koreaRev7ChartScore(p)===0),'zero is real');
  assert.ok(points.some(p=>p.date==='20261114'&&koreaRev7ChartScore(p)===null),'gap stays missing');
 }
 const next=await publicSnapshot({},{
  loadProgress:async()=>({status:'COMPLETE',successfulTradingDates:1031}),
  loadRows:async()=>saved.map(x=>x.date==='20261119'?makeRow('20261119',54.76):x),
  clock:()=>new Date('2026-11-19T15:00:00.000Z'),
 });
 assert.equal(next.composite.observationDate,'20261119');
 assert.equal(next.composite.displayScore,54.8);
 assert.equal(koreaRev7ChartScore(koreaRev7VisibleHistoryDays(
  next.composite.history,next.composite.observationDate,7).at(-1)),54.8,'only actual newly completed day advances chart');
 assert.equal(snapshot.composite.history.at(-1).displayScore,null,'prior stored snapshot remains unchanged');
});

test('W06 #37 source card and both plot renderers use the same public score/null contract',()=>{
 const ui=readFileSync(new URL('../app/korea-composite-view.tsx',import.meta.url),'utf8');
 const plot=readFileSync(new URL('../components/korea-composite-plot.tsx',import.meta.url),'utf8');
 assert.match(ui,/const score=koreaRev7ChartScore\(point\)/);
 assert.match(ui,/const score=valid\?c!\.displayScore!:null/);
 assert.match(plot,/chartScore:koreaRev7ChartScore\(row\)/);
 assert.match(plot,/<LineChart data=\{plottedRows\}/);
 assert.match(plot,/<Line type="linear" dataKey="chartScore"/);
 assert.match(plot,/p\.chartScore===null\?'자료 없음'/);
});
