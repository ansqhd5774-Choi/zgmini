import test from 'node:test';
import assert from 'node:assert/strict';
import {
 TREASURY_DIRECT_HISTORY_URL,buildTreasuryDirectSearchUrl,treasuryDirectHistoryUrl,
 parseTreasuryDirectAuctionRows,fetchTreasuryDirectAuctionHistory
} from '../lib/treasury-auction-history-taws.mjs';
import {parseTreasuryAuctionHistoryRows} from '../lib/treasury-auction-history.mjs';

const window={fromDate:'2025-11-10',toDate:'2026-11-09'};
const cusip=n=>'9'+n.toString(36).toUpperCase().padStart(8,'0');
const awarded=(n,overrides={})=>({
 cusip:cusip(n),competitiveAuctionCloseDate:'2026-11-05T00:00:00',
 announcementDate:'2026-11-03T00:00:00',issueDate:'2026-11-10T00:00:00',
 type:'Bill',securityType:'Bill',securityTerm:'4-Week',originalSecurityTerm:'17-Week',
 reopening:'No',inflationProtected:'No',floatingRate:'No',bidToCoverRatio:'2.46',
 ...overrides
});
const response=(rows,opts={})=>new Response(JSON.stringify(rows),{
 status:opts.status??200,
 headers:{'content-type':opts.type??'application/json;charset=utf-8',...opts.headers}
});

test('official issue-date search extends upper bound by 30 days, then auction dates are filtered',()=>{
 const url=new URL(treasuryDirectHistoryUrl(window));
 assert.equal(url.origin+url.pathname,TREASURY_DIRECT_HISTORY_URL);
 assert.equal(url.searchParams.get('startDate'),'2025-11-10');
 assert.equal(url.searchParams.get('endDate'),'2026-12-09');
 assert.equal(buildTreasuryDirectSearchUrl(window.fromDate,window.toDate),url.href);
 for(const options of [
  {fromDate:'2026-02-30',toDate:'2026-11-09'},
  {fromDate:'2026-11-10',toDate:'2026-11-09'},
  {fromDate:'2025-11-09',toDate:'2026-11-09'}
 ])assert.throws(()=>treasuryDirectHistoryUrl(options),/TREASURY_TAWS_WINDOW_INVALID/);
});

test('445 official shape: 436 completed, four pending and five outside auction window',async()=>{
 const complete=Array.from({length:436},(_,n)=>awarded(n));
 const pending=Array.from({length:4},(_,n)=>awarded(436+n,{
  competitiveAuctionCloseDate:'2026-11-09T00:00:00',
  announcementDate:'2026-11-05T00:00:00',issueDate:'2026-11-12T00:00:00',
  bidToCoverRatio:''
 }));
 const outside=Array.from({length:5},(_,n)=>awarded(440+n,{
  competitiveAuctionCloseDate:'2026-11-12T00:00:00',
  announcementDate:'2026-11-09T00:00:00',issueDate:'2026-11-17T00:00:00'
 }));
 const raw=[...outside,...pending,...complete];
 const normalized=parseTreasuryDirectAuctionRows(raw,window);
 assert.equal(raw.length,445);
 assert.equal(normalized.length,436);
 assert.deepEqual(Object.keys(normalized[0]).sort(),[
  'announcemt_date','auction_date','cusip','floating_rate','inflation_index_security',
  'original_security_term','reopening','security_term','security_type'
 ].sort());
 const events=parseTreasuryAuctionHistoryRows(normalized,window);
 assert.equal(events.length,872);
 assert.equal(events.filter(e=>e.title.includes('4주물 단기국채')).length,872);
 assert.equal(events.filter(e=>e.title.includes('17주물')).length,0);
 let fetched=0,tracked=0,requestedUrl;
 const collected=await fetchTreasuryDirectAuctionHistory({
  ...window,countRequest:()=>tracked++,
  fetchImpl:async(url,options)=>{
   fetched++;requestedUrl=url;
   assert.equal(options.redirect,'error');
   assert.equal(options.signal instanceof AbortSignal,true);
   return response(raw);
  }
 });
 assert.equal(fetched,1);
 assert.equal(tracked,1);
 assert.equal(requestedUrl,treasuryDirectHistoryUrl(window));
 assert.equal(collected.rawCount,445);
 assert.equal(collected.awardedCount,436);
 assert.equal(collected.bytes,new TextEncoder().encode(collected.text).length);
 assert.deepEqual(JSON.parse(collected.text),raw);
});

test('all security subtypes and official Yes/No flags normalize through existing event parser',()=>{
 const rows=[
  awarded(1,{type:'Bill',securityTerm:'4-Week',originalSecurityTerm:'17-Week',reopening:'Yes'}),
  awarded(2,{type:'CMB',securityTerm:'6-Week',originalSecurityTerm:'6-Week'}),
  awarded(3,{type:'Note',securityType:'Note',securityTerm:'9-Year',originalSecurityTerm:'10-Year'}),
  awarded(4,{type:'Bond',securityType:'Bond',securityTerm:'19-Year',originalSecurityTerm:'20-Year'}),
  awarded(5,{type:'FRN',securityType:'Note',securityTerm:'2-Year',originalSecurityTerm:'2-Year',floatingRate:'',reopening:'Yes'}),
  awarded(6,{type:'TIPS',securityType:'Note',securityTerm:'9-Year',originalSecurityTerm:'10-Year',inflationProtected:''})
 ];
 const normalized=parseTreasuryDirectAuctionRows(rows,window);
 assert.deepEqual(normalized.map(r=>r.security_type),[
  'Bill','Cash Management Bill','Note','Bond','FRN','TIPS'
 ]);
 assert.equal(normalized[0].reopening,'Yes');
 assert.equal(normalized[4].floating_rate,'Yes');
 assert.equal(normalized[5].inflation_index_security,'Yes');
 const titles=parseTreasuryAuctionHistoryRows(normalized,window).map(event=>event.title);
 assert.ok(titles.some(title=>title.includes('4주물 단기국채')&&title.includes('재발행')));
 assert.ok(titles.some(title=>title.includes('6주물 단기국채')));
 assert.ok(titles.some(title=>title.includes('10년물 국채')));
 assert.ok(titles.some(title=>title.includes('20년물 국채')));
 assert.ok(titles.some(title=>title.includes('2년물 변동금리국채')));
 assert.ok(titles.some(title=>title.includes('10년물 물가연동국채')));
});

test('source rows must be awarded, valid, chronological, and uniquely keyed by CUSIP plus auction date',()=>{
 const bad=[
  [null,'TREASURY_TAWS_ROW_INVALID'],
  [awarded(1,{competitiveAuctionCloseDate:'2026-11-31T00:00:00'}),'TREASURY_TAWS_AUCTION_DATE_INVALID'],
  [awarded(1,{bidToCoverRatio:'2.4garbage'}),'TREASURY_TAWS_RESULT_INVALID'],
  [awarded(1,{cusip:'BAD'}),'TREASURY_TAWS_CUSIP_INVALID'],
  [awarded(1,{announcementDate:'2026-11-06T00:00:00'}),'TREASURY_TAWS_CHRONOLOGY_INVALID'],
  [awarded(1,{issueDate:'2026-11-04T00:00:00'}),'TREASURY_TAWS_CHRONOLOGY_INVALID'],
  [awarded(1,{type:'Unknown'}),'TREASURY_TAWS_TYPE_INVALID'],
  [awarded(1,{reopening:'maybe'}),'TREASURY_TAWS_REOPENING_INVALID'],
  [awarded(1,{securityTerm:''}),'TREASURY_TAWS_TERM_INVALID']
 ];
 for(const [row,code] of bad)assert.throws(()=>parseTreasuryDirectAuctionRows([row],window),new RegExp(code));
 assert.throws(()=>parseTreasuryDirectAuctionRows([awarded(1),awarded(1)],window),/TREASURY_TAWS_DUPLICATE_AUCTION/);
 assert.throws(()=>parseTreasuryDirectAuctionRows([awarded(1,{bidToCoverRatio:''})],window),/TREASURY_TAWS_AWARDED_DATES_MISSING/);
 assert.throws(()=>parseTreasuryDirectAuctionRows([],window),/TREASURY_TAWS_ROWS_INVALID/);
 assert.throws(()=>parseTreasuryDirectAuctionRows(new Array(2001).fill(awarded(1)),window),/TREASURY_TAWS_ROWS_INVALID/);
});

test('fetch rejects provider errors, oversized bodies, wrong media, and malformed JSON',async()=>{
 const fetchOnce=fetchImpl=>fetchTreasuryDirectAuctionHistory({...window,fetchImpl});
 await assert.rejects(fetchOnce(async()=>response([awarded(1)],{status:500})),/TREASURY_TAWS_HTTP_500/);
 await assert.rejects(fetchOnce(async()=>response([awarded(1)],{type:'text/html'})),/TREASURY_TAWS_CONTENT_TYPE_INVALID/);
 await assert.rejects(fetchOnce(async()=>response([awarded(1)],{headers:{'content-length':'6291457'}})),/TREASURY_TAWS_TOO_LARGE/);
 const oversized=new ReadableStream({start(controller){
  controller.enqueue(new Uint8Array(6*1024*1024+1));controller.close();
 }});
 await assert.rejects(fetchOnce(async()=>new Response(oversized,{
  headers:{'content-type':'application/json'}
 })),/TREASURY_TAWS_TOO_LARGE/);
 await assert.rejects(fetchOnce(async()=>new Response('{bad json',{headers:{'content-type':'application/json'}})),/TREASURY_TAWS_JSON_INVALID/);
 await assert.rejects(fetchOnce(async()=>{throw Error('secret credentials should not leak');}),/TREASURY_TAWS_FETCH_FAILED/);
 await assert.rejects(fetchOnce(async()=>new Response('[]',{headers:{'content-type':'application/json'}})),/TREASURY_TAWS_ROWS_INVALID/);
 await assert.rejects(fetchTreasuryDirectAuctionHistory({...window,fetchImpl:null}),/TREASURY_TAWS_CLIENT_INVALID/);
});
