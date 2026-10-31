import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {earningsDisplaySnapshot,earningsDisplayHtml,earningsDisplayResponse} from '../lib/earnings-api-display.mjs';

const base=Date.parse('2026-10-29T00:00:00Z');
const days=Array.from({length:14},(_,i)=>new Date(base+i*86400000).toISOString().slice(0,10));
const event=(ticker,date,session='after_market',priority=false,company=ticker)=>({
 ticker,date,company,marketSession:session,kind:'earnings',country:'US',
 priority,verification:'VENDOR_UNVERIFIED',time:null,source:'earnings-api',
});
const projection=events=>({status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,
 redistribution:false,publicationStatus:'HELD_UNCONFIRMED',checkedAt:'2026-10-29T10:00:00.000Z',
 coveredDays:days,recordCount:events.length,priorityCount:events.filter(x=>x.priority).length,events});
const snapshot=events=>earningsDisplaySnapshot(projection(events));
const display=(data,opts={})=>earningsDisplayHtml(data,{start:days[0],end:days[1],...opts});

test('R35 assigns three stars to megacap tech and preserves two/one remaining levels',()=>{
 const state=snapshot([event('GOOG',days[0],'after_market',true,'Alphabet Inc.'),
  event('MSFT',days[0],'after_market',true,'Microsoft'),
  event('AMD',days[0],'before_market',true,'AMD'),event('ZM',days[0])]);
 assert.equal(state.recordCount,4);
 const result=display(state);
 assert.match(result.html,/aria-label="중요도 3">★★★/);
 assert.match(result.html,/aria-label="중요도 2">★★/);
 assert.match(result.html,/aria-label="중요도 1">★/);
 assert.ok(result.html.indexOf('Alphabet')<result.html.indexOf('AMD'));
});

test('R35 upgrades already-stored R32 HTML from two stars without republishing',()=>{
 const state=snapshot([event('NVDA',days[0],'after_market',true,'NVIDIA')]);
 state.byDay[days[0]][0]=state.byDay[days[0]][0].replace('중요도 3">★★★','중요도 2">★★');
 assert.match(state.byDay[days[0]][0],/중요도 2/);
 assert.match(display(state).html,/aria-label="중요도 3">★★★/);
});

test('R35 merges GOOG and GOOGL on same day, preserving both searchable aliases',()=>{
 const state=snapshot([event('GOOG',days[0],'after_market',true,'Alphabet Inc.'),
  event('GOOGL',days[0],'after_market',true,'Alphabet Inc.')]);
 assert.equal(state.recordCount,2); // unchanged stored evidence
 const result=display(state);
 assert.equal(result.count,1);
 assert.match(result.html,/GOOG·GOOGL/);
 assert.doesNotMatch(result.html,/정보 상충/);
 assert.equal(display(state,{query:'GOOG'}).count,1);
 assert.equal(display(state,{query:'GOOGL'}).count,1);
});

test('R35 refuses to invent a market session when two Alphabet classes disagree',()=>{
 const state=snapshot([event('GOOG',days[0],'before_market',true,'Alphabet Inc.'),
  event('GOOGL',days[0],'after_market',true,'Alphabet Inc.')]);
 const result=display(state);
 assert.equal(result.count,1);
 assert.match(result.html,/동일 날짜 정보 상충/);
 assert.match(result.html,/<time class=mc-time>시각 미정<\/time>/);
});

test('R35 importance filter applies to selected-day HTML and whole-range counts',async()=>{
 const state=snapshot([event('GOOG',days[0],'after_market',true,'Alphabet'),
  event('GOOGL',days[0],'after_market',true,'Alphabet'),
  event('AMD',days[0],'after_market',true,'AMD'),
  event('ZM',days[0]),event('AAPL',days[1],'after_market',true,'Apple')]);
 for(const [level,count] of [[3,2],[2,1],[1,1]]){
  const result=display(state,{importance:level});
  assert.equal(result.count,count);
 }
 const url=`https://zgmini.kr/api/earnings-calendar-display?start=${days[0]}&end=${days[1]}&day=${days[0]}&importance=3`;
 const response=earningsDisplayResponse(state,url);
 assert.equal(response.status,200);
 assert.equal(response.headers.get('x-display-day-counts'),`${days[0]}:1,${days[1]}:1`);
 assert.equal(response.headers.get('x-display-count'),'1');
 assert.match(await response.text(),/GOOG·GOOGL/);
 const bad=earningsDisplayResponse(state,url.replace('importance=3','importance=4'));
 assert.equal(bad.status,400);
});

test('R35 calendar controls apply same star selection to official rows and vendor HTML',()=>{
 const client=fs.readFileSync(fileURLToPath(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url)),'utf8');
 const vendor=fs.readFileSync(fileURLToPath(new URL('../app/market-calendar/earnings-display-client.tsx',import.meta.url)),'utf8');
 assert.match(client,/aria-label="중요도 필터"/);
 assert.match(client,/row\.importance===importance/);
 assert.match(client,/importance=\{importance\}/);
 assert.match(vendor,/params\.set\('importance',String\(importance\)\)/);
 const page=fs.readFileSync(fileURLToPath(new URL('../app/market-calendar/page.tsx',import.meta.url)),'utf8');
 assert.doesNotMatch(page,/미연결 기업 실적과 한국 일정은 제공하지 않습니다/);
 assert.match(page,/중요도 필터/);
});

test('R42 provisional five issuer exceptions become three-star candidates without changing other tiers',()=>{
 const tickers=['BRK.A','ARM','ANET','SHOP','DE'];
 const state=snapshot([...tickers.map(ticker=>event(ticker,days[0],'after_market',false,ticker)),
  event('AMD',days[0],'after_market',true,'AMD')]);
 assert.equal(state.recordCount,6);
 assert.equal(display(state,{importance:3}).count,5);
 assert.equal(display(state,{importance:2}).count,1);
 assert.equal(display(state,{importance:1}).count,0);
 const old=state.byDay[days[0]].find(html=>html.includes('data-search="arm arm"'));
 state.byDay[days[0]]=state.byDay[days[0]].map(html=>html===old?
  html.replace('중요도 3">★★★','중요도 1">★'):html);
 assert.equal(display(state,{importance:3}).count,5); // stored HTML upgraded at read
});

test('R42 Berkshire share classes merge by issuer, with both tickers searchable',()=>{
 const state=snapshot([event('BRK.A',days[0],'after_market',false,'Berkshire Hathaway'),
  event('BRK.B',days[0],'after_market',false,'Berkshire Hathaway')]);
 assert.equal(state.recordCount,2); // source observations preserved
 const result=display(state,{importance:3});
 assert.equal(result.count,1);
 assert.match(result.html,/BRK\.A·BRK\.B/);
 assert.equal(display(state,{query:'BRK.A'}).count,1);
 assert.equal(display(state,{query:'BRK.B'}).count,1);
 assert.doesNotMatch(result.html,/동일 날짜 정보 상충/);
});
