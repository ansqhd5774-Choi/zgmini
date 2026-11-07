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

test('ER1 removes old core/priority stars when no verified EPS-revenue score is available',()=>{
 const state=snapshot([event('GOOG',days[0],'after_market',true,'Alphabet Inc.'),
  event('MSFT',days[0],'after_market',true,'Microsoft'),
  event('AMD',days[0],'before_market',true,'AMD'),event('ZM',days[0])]);
 assert.equal(state.recordCount,4);
 const result=display(state);
 assert.equal((result.html.match(/aria-label="기업 실적 점수 없음">-<\/div>/g)??[]).length,4);
 assert.doesNotMatch(result.html,/★/);
 assert.ok(result.html.indexOf('Alphabet')<result.html.indexOf('AMD'));
});

test('ER1 removes stars even in legacy stored R32 HTML',()=>{
 const state=snapshot([event('NVDA',days[0],'after_market',true,'NVIDIA')]);
 state.byDay[days[0]][0]=state.byDay[days[0]][0].replace('기업 실적 점수 없음">-','중요도 2">★★');
 assert.match(state.byDay[days[0]][0],/중요도 2/);
 assert.match(display(state).html,/aria-label="기업 실적 점수 없음">-<\/div>/);
 assert.doesNotMatch(display(state).html,/★/);
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

test('ER1 importance filter excludes issuers without verified numeric scores',async()=>{
 const state=snapshot([event('GOOG',days[0],'after_market',true,'Alphabet'),
  event('GOOGL',days[0],'after_market',true,'Alphabet'),
  event('AMD',days[0],'after_market',true,'AMD'),
  event('ZM',days[0]),event('AAPL',days[1],'after_market',true,'Apple')]);
 for(const [level,count] of [[3,0],[2,0],[1,0]]){
  const result=display(state,{importance:level});
  assert.equal(result.count,count);
 }
 const url=`https://zgmini.kr/api/earnings-calendar-display?start=${days[0]}&end=${days[1]}&day=${days[0]}&importance=3`;
 const response=earningsDisplayResponse(state,url);
 assert.equal(response.status,200);
 assert.equal(response.headers.get('x-display-day-counts'),`${days[0]}:0,${days[1]}:0`);
 assert.equal(response.headers.get('x-display-count'),'0');
 assert.equal(await response.text(),'');
 const bad=earningsDisplayResponse(state,url.replace('importance=3','importance=4'));
 assert.equal(bad.status,400);
});

test('R36 main preserves multi-select star control while vendor ER1 score uses the same filter',()=>{
 const client=fs.readFileSync(fileURLToPath(new URL('../app/market-calendar/market-calendar-client.tsx',import.meta.url)),'utf8');
 const vendor=fs.readFileSync(fileURLToPath(new URL('../app/market-calendar/earnings-display-client.tsx',import.meta.url)),'utf8');
 assert.match(client,/aria-label="별등급 필터/);
 assert.match(client,/importance\.includes\(row\.importance\)/);
 assert.match(client,/importance=\{importance\}/);
 assert.match(vendor,/importance\.join\(','\)/);
 const page=fs.readFileSync(fileURLToPath(new URL('../app/market-calendar/page.tsx',import.meta.url)),'utf8');
 assert.doesNotMatch(page,/미연결 기업 실적과 한국 일정은 제공하지 않습니다/);
 assert.match(page,/중요도 필터/);
});

test('ER1 excludes former R42 five issuer exceptions from unearned stars',()=>{
 const tickers=['BRK.A','ARM','ANET','SHOP','DE'];
 const state=snapshot([...tickers.map(ticker=>event(ticker,days[0],'after_market',false,ticker)),
  event('AMD',days[0],'after_market',true,'AMD')]);
 assert.equal(state.recordCount,6);
 assert.equal(display(state,{importance:3}).count,0);
 assert.equal(display(state,{importance:2}).count,0);
 assert.equal(display(state,{importance:1}).count,0);
 const old=state.byDay[days[0]].find(html=>html.includes('data-search="arm arm"'));
 state.byDay[days[0]]=state.byDay[days[0]].map(html=>html===old?
  html.replace('기업 실적 점수 없음">-','중요도 1">★'):html);
 assert.equal(display(state,{importance:3}).count,0); // old stored grade ignored
 assert.doesNotMatch(display(state).html,/★/);
});

test('R42 Berkshire share classes merge by issuer, with both tickers searchable',()=>{
 const state=snapshot([event('BRK.A',days[0],'after_market',false,'Berkshire Hathaway'),
  event('BRK.B',days[0],'after_market',false,'Berkshire Hathaway')]);
 assert.equal(state.recordCount,2); // source observations preserved
 const result=display(state);
 assert.equal(result.count,1);
 assert.equal(display(state,{importance:3}).count,0);
 assert.match(result.html,/BRK\.A·BRK\.B/);
 assert.equal(display(state,{query:'BRK.A'}).count,1);
 assert.equal(display(state,{query:'BRK.B'}).count,1);
 assert.doesNotMatch(result.html,/동일 날짜 정보 상충/);
});

test('known Korean company name is visible with untouched English issuer and ticker',()=>{
 const state=snapshot([event('AAPL',days[0],'after_market',true,'Apple Inc.'),
  event('PLTR',days[0],'after_market',false,'Palantir Technologies Inc.')]);
 const original=JSON.stringify(state.byDay);
 const result=display(state);
 assert.match(result.html,/애플 \(Apple Inc\. · AAPL\)/);
 assert.match(result.html,/팔란티어 테크놀로지스 \(Palantir Technologies Inc\. · PLTR\)/);
 assert.equal(JSON.stringify(state.byDay),original); // display only, saved HTML unchanged
 assert.equal(display(state,{query:'애플'}).count,1);
 assert.equal(display(state,{query:'팔란티어'}).count,1);
 assert.equal(display(state,{query:'apple'}).count,1);
 assert.equal(display(state,{query:'AAPL'}).count,1);
 assert.equal(display(state,{query:'pltr'}).count,1);
});

test('unverified names retain vendor English and search does not fabricate Korean names',()=>{
 const state=snapshot([event('AMD',days[0],'after_market',false,'Advanced Micro Devices, Inc.'),
  event('ZZZZ',days[0],'after_market',false,'Unknown & <Test>'),
  event('AAPL',days[0],'after_market',false,'Unrelated Company Inc.')]);
 const html=display(state).html;
 assert.match(html,/Advanced Micro Devices, Inc\. \(AMD\)/);
 assert.match(html,/Unknown &amp; &lt;Test&gt; \(ZZZZ\)/);
 assert.equal(display(state,{query:'에이엠디'}).count,0);
 assert.equal(display(state,{query:'Unknown'}).count,1);
 assert.match(html,/Unrelated Company Inc\. \(AAPL\)/);
 assert.equal(display(state,{query:'애플'}).count,0); // ticker reuse never mislabels a company
});

test('Korean issuer alias does not bypass escaping of an English company name',()=>{
 const state=snapshot([event('AAPL',days[0],'after_market',false,'Apple & <Partners>')]);
 const result=display(state);
 assert.match(result.html,/애플 \(Apple &amp; &lt;Partners&gt; · AAPL\)/);
 assert.doesNotMatch(result.html,/<Partners>/);
 assert.equal(display(state,{query:'애플'}).count,1);
});

test('Korean aliases preserve class deduplication, source HTML and star filters',()=>{
 const state=snapshot([event('BRK.A',days[0],'after_market',true,'Berkshire Hathaway Inc.'),
  event('BRK.B',days[0],'after_market',true,'Berkshire Hathaway Inc.')]);
 const result=display(state);
 assert.equal(result.count,1);
 assert.match(result.html,/버크셔 해서웨이 \(Berkshire Hathaway Inc\. · BRK\.A·BRK\.B\)/);
 assert.equal(display(state,{query:'버크셔'}).count,1);
 assert.equal(display(state,{query:'BRK.B'}).count,1);
 assert.equal(display(state,{importance:3}).count,0);
});

test('Alphabet share classes use a single Korean display name and both English tickers remain searchable',()=>{
 const state=snapshot([event('GOOG',days[0],'after_market',true,'Alphabet Inc.'),
  event('GOOGL',days[0],'after_market',true,'Alphabet Inc.')]);
 const result=display(state);
 assert.equal(result.count,1);
 assert.match(result.html,/알파벳 \(Alphabet Inc\. · GOOG·GOOGL\)/);
 assert.equal(display(state,{query:'알파벳'}).count,1);
 assert.equal(display(state,{query:'Alphabet'}).count,1);
 assert.equal(display(state,{query:'GOOGL'}).count,1);
});
