import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scoreER1Issuers} from '../lib/market-calendar-er1-earnings-score.mjs';
import {makeER1PublicDisplay,validateER1PublicDisplay,
 ER1_EARNINGS_DISPLAY_PUBLIC_KEY} from '../lib/market-calendar-er1-public-display.mjs';
import {earningsDisplaySnapshot,earningsDisplayResponse} from '../lib/earnings-api-display.mjs';

const day='2026-10-30';
const dates=Array.from({length:14},(_,i)=>new Date(Date.parse(`${day}T00:00:00Z`)+86400000*i)
 .toISOString().slice(0,10));
const event=ticker=>({ticker,company:ticker,date:day,marketSession:'after_market',
 time:null,priority:true,verification:'VENDOR_UNVERIFIED',source:'earnings-api'});
const projection=events=>({status:'READY_PRIVATE',scope:'PC_PRIVATE',
 publicDisplay:false,redistribution:false,publicationStatus:'HELD_UNCONFIRMED',
 checkedAt:'2026-10-30T10:00:00Z',coveredDays:dates,recordCount:events.length,
 priorityCount:events.length,events});
const url=`https://zgmini.kr/api/earnings-calendar-display?start=${day}&end=${day}`;
const sampleRows=Array.from({length:838},(_,i)=>({
 issuerId:`X${i}`,tickers:[`X${i}`],earningsSymbol:`X${i}`,
 releases:[{date:'2026-10-30',symbol:`X${i}`,eps:1,revenue:i+1}]}));

test('838 simulated observed symbols are scored at the fixed 97-point threshold',()=>{
 const candidate=scoreER1Issuers(sampleRows,{asOf:'2026-11-02'});
 assert.equal(candidate.status,'READY_SHADOW');
 assert.equal(candidate.coverage.scoreableIssuers,838);
 assert.equal(candidate.coverage.inputSymbols,838);
 assert.equal(candidate.star3Count,42);
 const publicDerived=makeER1PublicDisplay(candidate);
 assert.equal(publicDerived.recordCount,838);
 assert.equal(publicDerived.star3Count,42);
 assert.equal(publicDerived.scores.length,838);
 assert.equal(Object.hasOwn(publicDerived.scores[0],'revenue'),false);
 assert.equal(Object.hasOwn(publicDerived.scores[0],'eps'),false);
 assert.equal(ER1_EARNINGS_DISPLAY_PUBLIC_KEY,'market-calendar:earnings-er1-score-public');
});

test('saved observed-symbol comparison does not assert or require a full market roster',()=>{
 const observed=scoreER1Issuers(sampleRows,{asOf:'2026-11-02'});
 assert.equal(observed.status,'READY_SHADOW');
 assert.equal(observed.coverage.observedIssuers,838);
 assert.equal(Object.hasOwn(observed.coverage,'expectedEligibleIssuers'),false);
 assert.ok(validateER1PublicDisplay(makeER1PublicDisplay(observed)));
});

test('838 actuals plus unavailable symbols display score only for actuals, others as hyphen',async()=>{
 const missing=Array.from({length:3},(_,i)=>({
  issuerId:`M${i}`,tickers:[`M${i}`],earningsSymbol:`M${i}`,releases:[]}));
 const candidate=scoreER1Issuers([...sampleRows,...missing],{asOf:'2026-11-02'});
 assert.equal(candidate.status,'READY_SHADOW');
 assert.equal(candidate.coverage.inputSymbols,841);
 assert.equal(candidate.coverage.scoreableIssuers,838);
 assert.equal(candidate.coverage.unscoreableReasons.ER1_RELEASE_HISTORY_INSUFFICIENT,3);
 assert.equal(candidate.rankings.length,838);
 assert.equal(candidate.star3Count,42);
 const scores=makeER1PublicDisplay(candidate);
 assert.ok(validateER1PublicDisplay(scores));
 const state=earningsDisplaySnapshot(projection([event('X837'),event('M0'),event('NVDA')]));
 state.byDay[day]=state.byDay[day].map(html=>html.replace(
  '<div class=mc-importance aria-label="기업 실적 점수 없음">-</div>',
  '<div class=mc-importance aria-label="중요도 3">★★★</div>'));
 const html=await earningsDisplayResponse(state,url,scores).text();
 assert.equal((html.match(/>★★★<\/div>/g)??[]).length,1);
 assert.equal((html.match(/aria-label="기업 실적 점수 없음">-<\/div>/g)??[]).length,2);
 const filtered=earningsDisplayResponse(state,url+'&importance=3',scores);
 assert.equal(filtered.headers.get('x-display-count'),'1');
 assert.match(await filtered.text(),/X837/);
});

test('saved legacy stars are removed, scored issuers receive numeric ER1 star bands, missing show hyphen',async()=>{
 const candidate=scoreER1Issuers(sampleRows,{asOf:'2026-11-02'});
 const publicDerived=makeER1PublicDisplay(candidate);
 const state=earningsDisplaySnapshot(projection([event('X837'),event('X0'),event('NVDA')]));
 state.byDay[day]=state.byDay[day].map(html=>html.replace(
  '<div class=mc-importance aria-label="기업 실적 점수 없음">-</div>',
  '<div class=mc-importance aria-label="중요도 3">★★★</div>'));
 const full=earningsDisplayResponse(state,url,publicDerived);
 assert.equal(full.status,200);
 const html=await full.text();
 assert.equal((html.match(/>★★★<\/div>/g)??[]).length,1);
 assert.equal((html.match(/>★<\/div>/g)??[]).length,1);
 assert.equal((html.match(/aria-label="기업 실적 점수 없음">-<\/div>/g)??[]).length,1);
 assert.match(html,/기업 실적 점수 40\.03점/);
 assert.doesNotMatch(html,/재무건전성|시장 중요도|중요도 [123]/);
 const filtered=earningsDisplayResponse(state,url+'&importance=3',publicDerived);
 assert.equal(filtered.headers.get('x-display-count'),'1');
 assert.match(await filtered.text(),/X837/);
 assert.equal(earningsDisplayResponse(state,url+'&importance=1',publicDerived)
  .headers.get('x-display-count'),'1');
 assert.equal(earningsDisplayResponse(state,url+'&importance=2',publicDerived)
  .headers.get('x-display-count'),'0');
});

test('absent, incomplete or tampered score snapshots never restore old FHS/R43 stars',async()=>{
 const state=earningsDisplaySnapshot(projection([event('NVDA'),event('AMD')]));
 state.byDay[day]=state.byDay[day].map(html=>html.replace(
  '<div class=mc-importance aria-label="기업 실적 점수 없음">-</div>',
  '<div class=mc-importance aria-label="중요도 3">★★★</div>'));
 const candidate=scoreER1Issuers(sampleRows,{asOf:'2026-11-02'});
 const publicDerived=makeER1PublicDisplay(candidate);
 const bad={...publicDerived,star3Count:1};
 assert.equal(validateER1PublicDisplay(bad),null);
 for(const invalid of [null,bad]){
  const html=await earningsDisplayResponse(state,url,invalid).text();
  assert.equal((html.match(/aria-label="기업 실적 점수 없음">-<\/div>/g)??[]).length,2);
  assert.doesNotMatch(html,/★/);
  assert.equal(earningsDisplayResponse(state,url+'&importance=3',invalid)
   .headers.get('x-display-count'),'0');
 }
});

test('public snapshot gate rejects stale dates, raw fields and false observed-symbol counts',()=>{
 const result=scoreER1Issuers(sampleRows,{asOf:'2026-11-02'});
 const valid=makeER1PublicDisplay(result);
 assert.equal(validateER1PublicDisplay({...valid,rawRevenueVendor:{X0:123}}),null);
 assert.equal(validateER1PublicDisplay({...valid,asOf:'2024-11-02'}),null);
 assert.equal(validateER1PublicDisplay({...valid,coverage:{...valid.coverage,inputSymbols:700}}),null);
 assert.equal(validateER1PublicDisplay({...valid,coverage:{...valid.coverage,observedIssuers:839}}),null);
 assert.ok(validateER1PublicDisplay(valid));
});

test('scores just below 97 do not round up to ★★★ and instead show ★★',async()=>{
 const result=scoreER1Issuers(sampleRows,{asOf:'2026-11-02'});
 const valid=makeER1PublicDisplay(result);
 const match=valid.scores.find(row=>row.tickers.includes('X0'));
 match.score=96.995;
 valid.star3Count=valid.scores.filter(row=>row.score>=97).length;
 const state=earningsDisplaySnapshot(projection([event('X0')]));
 const html=await earningsDisplayResponse(state,url,valid).text();
 assert.match(html,/96\.99점/);
 assert.match(html,/>★★<\/div>/);
 assert.doesNotMatch(html,/>★★★<\/div>/);
 assert.equal(earningsDisplayResponse(state,url+'&importance=2',valid)
  .headers.get('x-display-count'),'1');
 assert.equal(earningsDisplayResponse(state,url+'&importance=3',valid)
  .headers.get('x-display-count'),'0');
});

test('fixed 97 and 85 boundaries produce exclusive ★★★/★★/★ bands and keep zero distinct from missing',async()=>{
 const result=scoreER1Issuers(sampleRows,{asOf:'2026-11-02'});
 const publicDerived=makeER1PublicDisplay(result);
 const newScores=new Map([['X0',97],['X1',96.999],['X2',85],
  ['X3',84.999],['X4',0]]);
 for(const row of publicDerived.scores){
  if(newScores.has(row.issuerId))row.score=newScores.get(row.issuerId);
 }
 publicDerived.star3Count=publicDerived.scores.filter(row=>row.score>=97).length;
 assert.ok(validateER1PublicDisplay(publicDerived));
 const state=earningsDisplaySnapshot(projection([
  ...[...newScores.keys()].map(event),event('MISSING')
 ]));
 const all=earningsDisplayResponse(state,url,publicDerived);
 assert.equal(all.headers.get('x-display-count'),'6');
 const html=await all.text();
 assert.equal((html.match(/>★★★<\/div>/g)??[]).length,1);
 assert.equal((html.match(/>★★<\/div>/g)??[]).length,2);
 assert.equal((html.match(/>★<\/div>/g)??[]).length,2);
 assert.equal((html.match(/기업 실적 점수 없음">-<\/div>/g)??[]).length,1);
 for(const [level,count] of [[3,1],[2,2],[1,2]]){
  assert.equal(earningsDisplayResponse(state,url+`&importance=${level}`,publicDerived)
   .headers.get('x-display-count'),String(count));
 }
 assert.equal(earningsDisplayResponse(state,url+'&importance=1,2,3',publicDerived)
  .headers.get('x-display-count'),'5');
});

test('main keeps the economic calendar separate; only verified ER1 vendor display owns earnings stars',()=>{
 const source=fs.readFileSync(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url),'utf8');
 assert.match(source,/kind:'economic'/);
 assert.match(source,/importance\.includes\(row\.importance\)/);
 const route=fs.readFileSync(new URL('../app/api/earnings-calendar-display/route.ts',import.meta.url),'utf8');
 assert.match(route,/ER1_EARNINGS_DISPLAY_PUBLIC_KEY/);
 assert.doesNotMatch(route,/FHS_R3_PUBLIC_KEY|R43_MARKET_IMPORTANCE_PUBLIC_KEY/);
});
