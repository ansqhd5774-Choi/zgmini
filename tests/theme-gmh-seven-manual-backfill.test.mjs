import test from 'node:test';
import assert from 'node:assert/strict';
import {retrieveGmhHourlyPages,retrieveGmhSevenManually,
 composeGmhSavedScoreSource,GMH_BACKFILL_PROVIDER}
 from '../scripts/pc-writer/theme-gmh-seven-manual-backfill.mjs';
import {GMH_SEVEN_SYMBOLS,parseSavedGmhBarSource}
 from '../scripts/pc-writer/theme-gmh-seven-private-bridge.mjs';
const bar=(symbol,index)=>JSON.stringify({
 symbol,timestamp:'2026-11-'+String(10+index).padStart(2,'0')+'T20:00:00Z',
 close:100+index,is_gap:false,gap_fill_method:0})+'\n';
test('manual-only free GMH 1h pages assemble and preserve every supplier bar',async()=>{
 const called=[];
 const get=async(url,opts)=>{
  called.push(url);
  assert.equal(opts.method,'GET');
  assert.equal(opts.redirect,'error');
  const parsed=new URL(url);
  assert.equal(parsed.host,'getmarkethistory.com');
  assert.equal(parsed.pathname,'/api/v1/bars/stocks/us/SPY/1h');
  assert.equal(parsed.searchParams.get('start'),'2026-11-01');
  assert.equal(parsed.searchParams.get('end'),'2026-11-16');
  assert.equal(parsed.searchParams.get('limit'),'5000');
  const next=parsed.searchParams.get('cursor');
  if(!next)return new Response(bar('SPY',0),{status:200,
   headers:{'x-next-cursor':'opaque_page1',
    'x-data-through':'2026-11-13T00:00:00Z'}});
  assert.equal(next,'opaque_page1');
  return new Response(bar('SPY',1),{status:200});
 };
 const r=await retrieveGmhHourlyPages({symbol:'SPY',
  start:'2026-11-01',end:'2026-11-16',fetcher:get});
 assert.equal(r.status,'PROVIDER_PAGES_COMPLETE');
 assert.equal(r.providerCalls,2);
 assert.equal(r.complete,true);
 assert.equal(r.pages.length,2);
 assert.equal(r.dataThrough,'2026-11-13T00:00:00.000Z');
 assert.equal(called.length,2);
 const stored=composeGmhSavedScoreSource(r);
 assert.equal(stored.provider,GMH_BACKFILL_PROVIDER);
 assert.equal(stored.sourcePages,2);
 assert.equal(stored.rawPagesSha256.length,2);
 const parsed=parseSavedGmhBarSource(stored);
 assert.equal(parsed.eligibleHours,2);
 assert.equal(parsed.inputRows,2);
 assert.equal(stored.d1Writes,0);
});
test('supplier 404 is recorded as provider HTTP, never discarded or guessed as invalid data',async()=>{
 const result=await retrieveGmhHourlyPages({
  symbol:'SPY',start:'2024-01-01',end:'2026-11-16',
  fetcher:async()=>new Response('unknown_ticker',{status:404})});
 assert.equal(result.status,'PROVIDER_HTTP_RESPONSE');
 assert.equal(result.providerHttpStatus,404);
 assert.equal(result.providerCalls,1);
 assert.equal(result.pages.length,0);
 assert.equal(result.complete,false);
 assert.throws(()=>composeGmhSavedScoreSource(result),
  {code:'GMH_BACKFILL_PAGES_NOT_COMPLETE'});
});
test('transport failure counts attempted call without retry',async()=>{
 let calls=0;
 const result=await retrieveGmhHourlyPages({
  symbol:'SPY',start:'2024-01-01',end:'2026-11-16',
  fetcher:async()=>{calls++;throw Error('TRANSIENT');}});
 assert.equal(result.status,'PROVIDER_REQUEST_FAILED');
 assert.equal(result.providerCalls,1);
 assert.equal(calls,1);
});
test('cyclic cursor is stopped, and already returned pages are not silently re-labeled complete',async()=>{
 let calls=0;
 await assert.rejects(()=>retrieveGmhHourlyPages({
  symbol:'SPY',start:'2024-01-01',end:'2026-11-16',
  fetcher:async()=>{calls++;return new Response(bar('SPY',0),
   {status:200,headers:{'x-next-cursor':'repeated'}});}}),
 {code:'GMH_BACKFILL_CURSOR_INVALID_OR_CYCLE_STOP'});
 assert.equal(calls,2);
 let limited=0;
 const result=await retrieveGmhHourlyPages({
  symbol:'SPY',start:'2024-01-01',end:'2026-11-16',maxPages:1,
  fetcher:async()=>{limited++;return new Response(bar('SPY',0),
   {status:200,headers:{'x-next-cursor':'next'}});}});
 assert.equal(limited,1);
 assert.equal(result.status,'PROVIDER_HAS_MORE_PAGES');
 assert.equal(result.pages.length,1);
 assert.equal(result.complete,false);
});
test('manual 14-source batch never runs a schedule or retries failed source',async()=>{
 let calls=0;
 const output=await retrieveGmhSevenManually({
  start:'2024-01-01',end:'2026-11-16',
  fetcher:async url=>{
   calls++;
   const sym=url.split('/').at(-2).replace('?',''); // Parsed below
   const ticker=new URL(url).pathname.split('/').at(-2);
   return new Response(bar(ticker,0),{status:ticker==='CLOU'?500:200});
  }});
 assert.equal(output.status,'PARTIAL_SOURCE_NOT_READY');
 assert.equal(output.providerCalls,calls);
 assert.equal(output.fetched,5); // SPY, BOTZ, ROBO, SKYY, CLOU
 assert.deepEqual(output.results.map(x=>x.symbol),GMH_SEVEN_SYMBOLS.slice(0,5));
 assert.equal(calls,5); // Stop after first failed symbol; no retry.
 assert.equal(output.results.at(-1).symbol,'CLOU');
 assert.equal(output.results.at(-1).status,'PROVIDER_HTTP_RESPONSE');
 assert.equal(output.results.at(-1).providerHttpStatus,500);
 assert.equal(output.d1Writes,0);
 assert.equal(output.schedulerChanges,0);
});
test('manual 14-source batch can collect all, without treating it as a scored 252-day result',async()=>{
 let calls=0;
 const out=await retrieveGmhSevenManually({start:'2024-01-01',end:'2026-11-16',
  fetcher:async url=>{
   calls++;
   const ticker=new URL(url).pathname.split('/').at(-2);
   return new Response(bar(ticker,0),{status:200});
  }});
 assert.equal(out.status,'COMPLETE_PRIVATE_RAW_PAGES');
 assert.equal(out.requested,14);
 assert.equal(out.fetched,14);
 assert.equal(out.providerCalls,14);
 assert.equal(calls,14);
 assert.equal(out.results.every(x=>x.complete),true);
 assert.equal(GMH_SEVEN_SYMBOLS.length,14);
 assert.equal(out.d1Writes,0);
});
