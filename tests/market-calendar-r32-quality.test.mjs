import test from 'node:test';
import assert from 'node:assert/strict';
import {earningsDisplaySnapshot,earningsDisplayHtml,earningsDisplayResponse}
 from '../lib/earnings-api-display.mjs';

const dates=Array.from({length:14},(_,i)=>new Date(Date.UTC(2026,9,29+i)).toISOString().slice(0,10));
const event=(ticker,date,session='unknown',core=false,company=ticker)=>({
 ticker,date,company,marketSession:session,kind:'earnings',country:'US',
 priority:core,verification:'VENDOR_UNVERIFIED',time:null,source:'earnings-api',
});
const source=events=>({status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,
 redistribution:false,publicationStatus:'HELD_UNCONFIRMED',
 checkedAt:'2026-10-29T11:00:00.000Z',coveredDays:dates,
 recordCount:events.length,priorityCount:events.filter(row=>row.priority).length,events});
const html=events=>earningsDisplaySnapshot(source(events));

test('R32 places core issuers first even when the stored rows arrive unordered',()=>{
 const snapshot=html([
  event('ZM',dates[0]),event('TSLA',dates[0],'after_market',true,'Tesla'),
  event('AMD',dates[0]),event('GOOGL',dates[0],'before_market',true,'Alphabet'),
 ]);
 const displayed=earningsDisplayHtml(snapshot,{start:dates[0],end:dates[0]});
 assert.equal(displayed.count,4);
 assert.ok(displayed.html.indexOf('Alphabet')<displayed.html.indexOf('AMD'));
 assert.ok(displayed.html.indexOf('Tesla')<displayed.html.indexOf('ZM'));
 assert.equal((displayed.html.match(/핵심기업/g)??[]).length,2);
});

test('R32 eliminates exact duplicate same-day ticker rows from the presentation only',()=>{
 const snapshot=html([event('AAPL',dates[0],'after_market',true,'Apple'),
  event('AAPL',dates[0],'after_market',true,'Apple')]);
 assert.equal(snapshot.recordCount,2); // never mutate the private source snapshot
 const result=earningsDisplayHtml(snapshot,{start:dates[0],end:dates[0]});
 assert.equal(result.count,1);
 assert.equal((result.html.match(/mc-vendor-row/g)??[]).length,1);
 assert.doesNotMatch(result.html,/정보 상충/);
});

test('R32 does not guess a market session when same-date observations conflict',()=>{
 const snapshot=html([event('NVDA',dates[0],'before_market',true,'NVIDIA'),
  event('NVDA',dates[0],'after_market',true,'NVIDIA')]);
 const result=earningsDisplayHtml(snapshot,{start:dates[0],end:dates[0]});
 assert.equal(result.count,1);
 assert.match(result.html,/동일 날짜 정보 상충/);
 assert.match(result.html,/<time class=mc-time>시각 미정<\/time>/);
 assert.doesNotMatch(result.html,/<time class=mc-time>장전<\/time>/);
});

test('R32 flags ticker reported on two days but keeps both unverified dates',()=>{
 const result=earningsDisplayHtml(html([event('AAPL',dates[0]),event('AAPL',dates[1])]),
  {start:dates[0],end:dates[1]});
 assert.equal(result.count,2);
 assert.equal((result.html.match(/여러 날짜 중복 · 확인 필요/g)??[]).length,2);
 assert.deepEqual(result.counts,{[dates[0]]:1,[dates[1]]:1});
});

test('R32 full snapshot replacement naturally removes a prior vendor date',()=>{
 const first=earningsDisplayHtml(html([event('MSFT',dates[0])]),{start:dates[0],end:dates[1]});
 const next=earningsDisplayHtml(html([event('MSFT',dates[1])]),{start:dates[0],end:dates[1]});
 assert.deepEqual(first.counts,{[dates[0]]:1,[dates[1]]:0});
 assert.deepEqual(next.counts,{[dates[0]]:0,[dates[1]]:1});
 assert.doesNotMatch(next.html,/여러 날짜 중복/);
});

test('R32 selected-day HTML preserves whole-range date counts and search',async()=>{
 const snapshot=html([event('NVDA',dates[0]),event('AAPL',dates[1]),event('NVDA',dates[1])]);
 const url=`https://zgmini.kr/api/earnings-calendar-display?start=${dates[0]}&end=${dates[1]}&day=${dates[1]}&q=nvda`;
 const response=earningsDisplayResponse(snapshot,url);
 assert.equal(response.status,200);
 assert.equal(response.headers.get('x-display-day-counts'),`${dates[0]}:1,${dates[1]}:1`);
 assert.equal(response.headers.get('x-display-count'),'1');
 assert.match(await response.text(),/여러 날짜 중복 · 확인 필요/);
});
