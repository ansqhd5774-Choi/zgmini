import test from 'node:test';
import assert from 'node:assert/strict';
import {treasuryAuctionHistoryUrl,fetchTreasuryAuctionHistoryPages}
 from '../lib/treasury-auction-history-source.mjs';

const range={fromDate:'2025-11-10',toDate:'2026-11-09'};
const fixture=length=>Array.from({length},(_,index)=>({
 cusip:`912797${index.toString(36).toUpperCase().padStart(3,'0')}`,
 auction_date:'2026-10-22',announcemt_date:'2026-10-19',
 security_type:'Bill',security_term:'4-Week',original_security_term:'4-Week',
 reopening:'No',inflation_index_security:'No',floating_rate:'No'
}));
const officialResponse=(data,total,{count=data.length,pages=Math.ceil(total/500)}={})=>
 new Response(JSON.stringify({data,meta:{count,'total-count':total,'total-pages':pages}}),
  {headers:{'content-type':'application/json'}});

test('URL requests one whole year, bounded fields, deterministic sort, and 500 rows',()=>{
 const url=new URL(treasuryAuctionHistoryUrl(range));
 assert.equal(url.hostname,'api.fiscaldata.treasury.gov');
 assert.equal(url.searchParams.get('filter'),
  'auction_date:gte:2025-11-10,auction_date:lte:2026-11-09');
 assert.equal(url.searchParams.get('sort'),'auction_date,cusip');
 assert.equal(url.searchParams.get('page[number]'),'1');
 assert.equal(url.searchParams.get('page[size]'),'500');
 assert.ok(url.searchParams.get('fields').includes('announcemt_date'));
 assert.equal(url.searchParams.get('fields').split(',').length,9);
 assert.throws(()=>treasuryAuctionHistoryUrl({...range,fromDate:'2025-11-09'}),/WINDOW_INVALID/);
 assert.throws(()=>treasuryAuctionHistoryUrl({...range,pageNumber:6}),/PAGE_INVALID/);
});

test('415 official-like rows fit one GET and return exact private raw page',async()=>{
 const sample=fixture(415),urls=[];
 let requests=0;
 const fetched=await fetchTreasuryAuctionHistoryPages({...range,
  fetchImpl:async url=>{urls.push(url);return officialResponse(sample,415);},
  countRequest:()=>requests++});
 assert.equal(requests,1);
 assert.equal(urls.length,1);
 assert.deepEqual({total:fetched.totalCount,pages:fetched.pageCount,rows:fetched.rows.length},
  {total:415,pages:1,rows:415});
 assert.equal(fetched.pages[0].count,415);
 assert.deepEqual(JSON.parse(fetched.pages[0].text).data,sample);
 assert.equal(fetched.pages[0].bytes,fetched.totalBytes);
});

test('multi-page collection verifies totals and every row without truncation',async()=>{
 const sample=fixture(650);
 let calls=0;
 const fetched=await fetchTreasuryAuctionHistoryPages({...range,
  fetchImpl:async url=>{
   const page=Number(new URL(url).searchParams.get('page[number]'));
   calls++;
   return officialResponse(sample.slice((page-1)*500,page*500),650);
  }});
 assert.equal(calls,2);
 assert.equal(fetched.totalCount,650);
 assert.equal(fetched.rows.length,650);
 assert.deepEqual(fetched.pages.map(p=>p.count),[500,150]);
});

test('missing, inconsistent, and overlapping pages fail closed',async()=>{
 const sample=fixture(550);
 const malformed=[
  async()=>officialResponse(sample.slice(0,500),550,{count:499}),
  async()=>officialResponse(sample.slice(0,500),550,{pages:1}),
  async()=>new Response('{invalid',{headers:{'content-type':'application/json'}}),
  async()=>new Response('HTML',{headers:{'content-type':'text/html'}})
 ];
 for(const fetchImpl of malformed){
  await assert.rejects(()=>fetchTreasuryAuctionHistoryPages({...range,fetchImpl}),
   /TREASURY_HISTORY_/);
 }
 await assert.rejects(()=>fetchTreasuryAuctionHistoryPages({...range,
  fetchImpl:async url=>Number(new URL(url).searchParams.get('page[number]'))===1?
   officialResponse(sample.slice(0,500),550):officialResponse(sample.slice(499,549),550)
 }),/PAGE_DUPLICATE/);
 await assert.rejects(()=>fetchTreasuryAuctionHistoryPages({...range,
  fetchImpl:async url=>Number(new URL(url).searchParams.get('page[number]'))===1?
   officialResponse(sample.slice(0,500),550):officialResponse(sample.slice(500,549),550)
 }),/PAGE_(?:META_INVALID|COUNT_MISMATCH)/);
});

test('provider network, HTTP, redirect, and oversized response errors remain bounded',async()=>{
 await assert.rejects(()=>fetchTreasuryAuctionHistoryPages({...range,
  fetchImpl:async()=>{throw Error('provider URL contained a secret');}
 }),error=>error.message==='TREASURY_HISTORY_FETCH_FAILED');
 await assert.rejects(()=>fetchTreasuryAuctionHistoryPages({...range,
  fetchImpl:async()=>new Response('Unavailable',{status:503})
 }),/TREASURY_HISTORY_HTTP_503/);
 const redirect=officialResponse(fixture(1),1);
 Object.defineProperty(redirect,'url',{value:'https://example.com/redirected'});
 await assert.rejects(()=>fetchTreasuryAuctionHistoryPages({...range,
  fetchImpl:async()=>redirect
 }),/REDIRECT_NOT_ALLOWED/);
 await assert.rejects(()=>fetchTreasuryAuctionHistoryPages({...range,
  fetchImpl:async()=>new Response('x',{headers:{
   'content-type':'application/json','content-length':'1800001'}})
 }),/PAGE_TOO_LARGE/);
});
