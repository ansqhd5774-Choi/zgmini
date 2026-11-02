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
const sampleRows=Array.from({length:838},(_,i)=>({eligible:true,
 issuerId:`X${i}`,tickers:[`X${i}`],earningsSymbol:`X${i}`,
 releases:[{date:'2026-10-30',symbol:`X${i}`,eps:1,revenue:i+1}]}));

test('838 simulated issuers are scored at the approved 97-point threshold, without forced top 5%',()=>{
 const candidate=scoreER1Issuers(sampleRows,{asOf:'2026-11-02',expectedEligibleIssuers:838});
 assert.equal(candidate.status,'READY_SHADOW');
 assert.equal(candidate.coverage.scoreableIssuers,838);
 assert.equal(candidate.star3Count,42);
 const publicDerived=makeER1PublicDisplay(candidate);
 assert.equal(publicDerived.recordCount,838);
 assert.equal(publicDerived.star3Count,42);
 assert.equal(publicDerived.scores.length,838);
 assert.equal(Object.hasOwn(publicDerived.scores[0],'revenue'),false);
 assert.equal(Object.hasOwn(publicDerived.scores[0],'eps'),false);
 assert.equal(ER1_EARNINGS_DISPLAY_PUBLIC_KEY,'market-calendar:earnings-er1-score-public');
});

test('838 are NOT sufficient for the approved full eligible universe unless coverage is independently verified',()=>{
 const blocked=scoreER1Issuers(sampleRows,{asOf:'2026-11-02',expectedEligibleIssuers:2634});
 assert.equal(blocked.status,'BLOCKED');
 assert.equal(blocked.rankings.length,0);
 assert.throws(()=>makeER1PublicDisplay(blocked),/ER1_ONLY_VALIDATED_COMPLETE_RESULT/);
});

test('saved legacy stars are removed, scored issuers show 97-point ER1 result, missing show literal hyphen',async()=>{
 const candidate=scoreER1Issuers(sampleRows,{asOf:'2026-11-02',expectedEligibleIssuers:838});
 const publicDerived=makeER1PublicDisplay(candidate);
 const state=earningsDisplaySnapshot(projection([event('X837'),event('X0'),event('NVDA')]));
 state.byDay[day]=state.byDay[day].map(html=>html.replace(
  '<div class=mc-importance aria-label="기업 실적 점수 없음">-</div>',
  '<div class=mc-importance aria-label="중요도 3">★★★</div>'));
 const full=earningsDisplayResponse(state,url,publicDerived);
 assert.equal(full.status,200);
 const html=await full.text();
 assert.equal((html.match(/>★★★<\/div>/g)??[]).length,1);
 assert.equal((html.match(/aria-label="기업 실적 점수 없음">-<\/div>/g)??[]).length,1);
 assert.match(html,/기업 실적 점수 40\.04점/);
 assert.doesNotMatch(html,/재무건전성|시장 중요도|중요도 [123]/);
 const filtered=earningsDisplayResponse(state,url+'&importance=3',publicDerived);
 assert.equal(filtered.headers.get('x-display-count'),'1');
 assert.match(await filtered.text(),/X837/);
 for(const level of [1,2])assert.equal(earningsDisplayResponse(state,
  url+`&importance=${level}`,publicDerived).headers.get('x-display-count'),'0');
});

test('absent, incomplete or tampered score snapshots never restore old FHS/R43 stars',async()=>{
 const state=earningsDisplaySnapshot(projection([event('NVDA'),event('AMD')]));
 state.byDay[day]=state.byDay[day].map(html=>html.replace(
  '<div class=mc-importance aria-label="기업 실적 점수 없음">-</div>',
  '<div class=mc-importance aria-label="중요도 3">★★★</div>'));
 const candidate=scoreER1Issuers(sampleRows,{asOf:'2026-11-02',expectedEligibleIssuers:838});
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

test('official-feed earnings without an ER1 score also use hyphen and are excluded from star filters',()=>{
 const source=fs.readFileSync(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url),'utf8');
 assert.match(source,/importance:earningsEvent\?null:releaseImportance/);
 assert.match(source,/row\.importance===null\?<div className="mc-importance"/);
 const route=fs.readFileSync(new URL('../app/api/earnings-calendar-display/route.ts',import.meta.url),'utf8');
 assert.match(route,/ER1_EARNINGS_DISPLAY_PUBLIC_KEY/);
 assert.doesNotMatch(route,/FHS_R3_PUBLIC_KEY|R43_MARKET_IMPORTANCE_PUBLIC_KEY/);
});
