import test from 'node:test';
import assert from 'node:assert/strict';
import {rankR43Issuers,r43ImportanceIndex,R43_METHOD} from '../lib/market-calendar-r43-issuer-rank.mjs';
import {earningsDisplaySnapshot,earningsDisplayHtml} from '../lib/earnings-api-display.mjs';

const asOf='2026-10-30',now=Date.parse('2026-10-31T12:00:00Z');
const rows=Array.from({length:2634},(_,i)=>({ticker:`T${i}`,eligible:true,
 tradeDate:asOf,price:100+i,volume:1000+i*10,relativeVolume:1+i/1000,
 dividendYield:i%5,eps:i/10,dailyChangePct:i%7,epsGrowthPct:i%40}));
const ranked=rankR43Issuers(rows,{asOf});
const index=r43ImportanceIndex(ranked,{now});
const day='2026-10-31',dates=Array.from({length:14},(_,i)=>
 new Date(Date.parse(day+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
const event=(ticker,priority=false)=>({ticker,company:ticker,date:day,
 marketSession:'after_market',priority,time:null,verification:'VENDOR_UNVERIFIED',source:'earnings-api'});
const projection=events=>({status:'READY_PRIVATE',scope:'PC_PRIVATE',publicDisplay:false,
 redistribution:false,publicationStatus:'HELD_UNCONFIRMED',coveredDays:dates,
 checkedAt:'2026-10-31T10:00:00Z',recordCount:events.length,priorityCount:events.filter(x=>x.priority).length,events});

test('R43 full-universe rank controls the HTML ★★★ selection and old hardcodes no longer override it',()=>{
 const top=ranked.rankings[0].tickers[0];
 const outside=ranked.rankings.at(-1).tickers[0];
 const display=earningsDisplaySnapshot(projection([event(top),event(outside,true),event('NVDA',true)]),{importanceIndex:index});
 assert.equal(display.impactModel,R43_METHOD);
 const html=earningsDisplayHtml(display,{start:day,end:day});
 assert.equal(html.count,3);
 assert.equal(earningsDisplayHtml(display,{start:day,end:day,importance:3}).count,1);
 assert.equal(earningsDisplayHtml(display,{start:day,end:day,importance:2}).count,2);
 assert.match(html.html,new RegExp(`${top} \\(${top}\\)`));
 assert.equal(earningsDisplayHtml(earningsDisplaySnapshot(projection([event('NVDA',true)])),
  {start:day,end:day,importance:3}).count,1); // legacy snapshots remain unchanged
});

test('R43 refuses to attach an incomplete ranking map to a public-facing HTML snapshot',()=>{
 assert.throws(()=>earningsDisplaySnapshot(projection([event('NVDA')]),{importanceIndex:new Map([['NVDA',3]])}),
  /R43_IMPORTANCE_INDEX_INVALID/);
});
