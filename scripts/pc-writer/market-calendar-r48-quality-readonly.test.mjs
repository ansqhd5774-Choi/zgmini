import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {parseCalendar,mapIssuerCandidates,inspectSecShares,latestPriceBars,auditPc,runPc} from './market-calendar-r48-quality-readonly.mjs';

const asOf='2026-10-29';
const c='0000320193';
const shares=(tag,rows)=>({cik:320193,facts:{[tag==='dei'?'dei':'us-gaap']:{[tag==='dei'?'EntityCommonStockSharesOutstanding':'CommonStockSharesOutstanding']:{units:{shares:rows}}}}});
const fact=(val,end='2026-09-30',filed='2026-10-25')=>({val,end,filed,form:'10-Q'});
const bar=(ticker,tradeDate,close=120)=>({ticker,tradeDate,currentClose:close,source:'ALPACA',feed:'iex',adjustmentStatus:'split'});

test('SEC shares facts are structurally eligible but never verified issuer cap',()=>{
 const r=inspectSecShares(shares('dei',[fact(1000000)]),c,asOf);
 assert.equal(r.status,'SHARE_FACT_CANDIDATE');assert.equal(r.end,'2026-09-30');assert.equal('marketCapUsd' in r,false);
});
test('SEC missing and mismatched CIK are rejected',()=>{
 assert.equal(inspectSecShares(shares('dei',[]),c,asOf).status,'NO_USABLE_SHARE_FACTS');
 assert.equal(inspectSecShares(shares('dei',[fact(10)]),'0000000001',asOf).status,'CIK_MISMATCH');
});
test('future filing and invalid shares are excluded',()=>{
 const r=inspectSecShares(shares('dei',[fact(10,'2026-09-30','2026-11-01'),fact(-2)]),c,asOf);
 assert.equal(r.status,'NO_USABLE_SHARE_FACTS');
});
test('same end-date conflicting share facts are not treated as candidates',()=>{
 const r=inspectSecShares(shares('dei',[fact(100),fact(101)]),c,asOf);
 assert.equal(r.status,'SHARE_FACT_CONFLICT');
});
test('distinct share tags with identical values are reported, not graded',()=>{
 const doc=shares('dei',[fact(100)]);
 doc.facts['us-gaap']={CommonStockSharesOutstanding:{units:{shares:[fact(100)]}}};
 const r=inspectSecShares(doc,c,asOf);
 assert.equal(r.status,'SHARE_FACT_CANDIDATE');assert.equal(r.tagKinds,2);
});
test('mapping removes conflicting CIKs and counts multi-ticker issuers',()=>{
 const r=mapIssuerCandidates([{ticker:'GOOG',cik:1},{ticker:'GOOGL',cik:1},{ticker:'ABBV',cik:2},{ticker:'ABBV',cik:3}],new Set(['GOOG','GOOGL','ABBV']));
 assert.equal(r.mapping.size,2);assert.equal(r.multiTickerIssuerCount,1);assert.equal(r.conflictTickers,1);
});
test('latest split-adjusted IEX bar is selected, bad rows are rejected',()=>{
 const r=latestPriceBars([bar('ABBV','2026-10-27',110),bar('ABBV','2026-10-28',111),{...bar('ABBV','2026-10-29'),feed:'sip'}],new Set(['ABBV']),asOf);
 assert.equal(r.accepted,2);assert.equal(r.rejected,1);assert.equal(r.latest.get('ABBV').close,111);
});
test('conflicting price snapshots at the same date are discarded',()=>{
 const r=latestPriceBars([bar('ABBV','2026-10-28',110),bar('ABBV','2026-10-28',115)],new Set(['ABBV']),asOf);
 assert.equal(r.conflicts.size,1);assert.equal(r.latest.size,0);
});
test('stored HTML contract and 14 ascending days are enforced',()=>{
 const dates=Array.from({length:14},(_,i)=>new Date(Date.UTC(2026,9,1+i)).toISOString().slice(0,10));
 const row='<article class="mc-row mc-vendor-row" data-search="abbv abbvie">ok</article>';
 const data={status:'READY_DISPLAY',mode:'OWN_SITE_HTML_ONLY',rawVendorJsonExposed:false,publicJsonFeed:false,redistribution:false,
  coveredDays:dates,byDay:Object.fromEntries(dates.map((d,i)=>[d,i===0?[row]:[]])),recordCount:1};
 assert.equal(parseCalendar(data).tickers.has('ABBV'),true);
 data.recordCount=2;assert.throws(()=>parseCalendar(data),/R48_DISPLAY_COUNT_INVALID/);
});
test('missing PC database does not fabricate market cap coverage',()=>{
 const r=auditPc({pcHome:'/nonexistent-r48-root',asOf});
 assert.equal(r.status,'R48_PC_DB_MISSING');assert.equal(r.gradeableTickerCount,0);assert.equal(r.marketCapValuesComputed,0);assert.equal(r.providerRequests,0);
});
test('end-to-end local SQLite and files remain untouched and output contains aggregates only',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'r48-quality-test-'));
 try{
  const base=path.join(tmp,'pc'),out=path.join(tmp,'reports');fs.mkdirSync(path.join(base,'storage'),{recursive:true});fs.mkdirSync(out);
  const secDir=path.join(base,'manual-input','e1-r5','incoming','companyfacts'),priceDir=path.join(base,'asset-r10-alpaca','incremental');
  fs.mkdirSync(secDir,{recursive:true});fs.mkdirSync(priceDir,{recursive:true});
  const db=new DatabaseSync(path.join(base,'storage','core.sqlite'));
  db.exec('CREATE TABLE public_feed_snapshots_v1(kind TEXT,feed_key TEXT,snapshot_key TEXT,body TEXT)');
  db.exec('CREATE TABLE market_score_earnings_e1_r3_universe_v1(body_json TEXT,period_end TEXT)');
  const dates=Array.from({length:14},(_,i)=>new Date(Date.UTC(2026,9,1+i)).toISOString().slice(0,10));
  const html='<article class="mc-row mc-vendor-row" data-search="aapl apple">ok</article>';
  const snapshot={status:'READY_DISPLAY',mode:'OWN_SITE_HTML_ONLY',rawVendorJsonExposed:false,publicJsonFeed:false,redistribution:false,recordCount:1,
   coveredDays:dates,byDay:Object.fromEntries(dates.map((d,i)=>[d,i===0?[html]:[]])),checkedAt:'2026-10-29T00:00:00Z'};
  db.prepare('INSERT INTO public_feed_snapshots_v1 VALUES(?,?,?,?)').run('output','market-calendar:earnings-display-html','current',JSON.stringify(snapshot));
  db.prepare('INSERT INTO market_score_earnings_e1_r3_universe_v1 VALUES(?,?)').run(JSON.stringify({members:[{ticker:'AAPL',cik:320193}]}),'2026-06-30');db.close();
  fs.writeFileSync(path.join(secDir,'CIK0000320193.json'),JSON.stringify(shares('dei',[fact(1000000)])));
  fs.writeFileSync(path.join(priceDir,'2026-10-01-2026-10-28-group-1.json'),JSON.stringify([bar('AAPL','2026-10-28',200)]));
  const report=auditPc({pcHome:base,asOf});
  assert.equal(report.status,'R48_READONLY_QUALITY_RETRIEVED');assert.equal(report.secShareFactCandidates,1);
  assert.equal(report.storedPriceTickerCandidates,1);assert.equal(report.shareFactAndPriceCandidates,1);
  assert.equal(report.gradeableTickerCount,0);assert.equal(report.marketCapValuesComputed,0);
  const once=runPc({pcHome:base,asOf,outputDir:out});assert.equal(once.status,'R48_READONLY_QUALITY_RETRIEVED');
  const text=fs.readFileSync(path.join(out,'MARKET_CALENDAR_R48_OFFLINE_QUALITY_RESULT.txt'),'utf8');
  assert.doesNotMatch(text,/AAPL|1000000|currentClose|200(?:\D|$)/);assert.match(text,/gradeableTickerCount=0/);
  assert.equal(runPc({pcHome:base,asOf,outputDir:out}).status,'R48_RESULT_ALREADY_EXISTS_STOP');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
