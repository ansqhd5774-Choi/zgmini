import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createQuotaFetch} from '../scripts/pc-writer/quota-fetch.mjs';
import {collectSectorFearGreedR3EtfIncremental} from '../scripts/pc-writer/sector-fear-greed-r3-etf-incremental.mjs';
import {SECTOR_FEAR_GREED_R3_BENCHMARKS as tickers} from '../lib/market-score/sector-fear-greed-r3-rolling.mjs';

const now=Date.parse('2026-10-17T04:00:00Z');
const url='https://data.alpaca.markets/v2/stocks/bars?symbols=SPY';
const rawName='local-sector-fear-greed-r3-etf-incremental.json';
const bars=Object.fromEntries(tickers.map(ticker=>[ticker,[
 {t:'2026-10-09T04:00:00Z',c:100,v:10},
 {t:'2026-10-16T04:00:00Z',c:102,v:20},
]]));

function withFixture(fn){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-sector-etf-quota-'));
 fs.writeFileSync(path.join(base,'providers.env'),'APCA_API_KEY_ID=MOCK_ONLY\nAPCA_API_SECRET_KEY=MOCK_ONLY\n');
 fs.writeFileSync(path.join(base,'local-sector-fear-greed-r1-iex-price-history.json'),JSON.stringify({
  series:Object.fromEntries(tickers.map(t=>[t,[{date:'2026-10-09',close:100,volume:10}]])),
 }));
 const previous='{"verified":"previous-raw"}';
 fs.writeFileSync(path.join(base,rawName),previous);
 return Promise.resolve().then(()=>fn(base,previous)).finally(()=>fs.rmSync(base,{recursive:true,force:true}));
}

test('independent ETF CLI shares the 140/min reservation and preserves raw when blocked',()=>withFixture(async(base,previous)=>{
 let calls=0;
 const fakeFetch=async()=>{calls++;return new Response('{}',{status:200});};
 const shared=createQuotaFetch({base,originalFetch:fakeFetch,mode:'enforce'}).fetch;
 for(let i=0;i<140;i++)await shared(url);
 const result=await collectSectorFearGreedR3EtfIncremental(base,{fetchImpl:fakeFetch,now});
 assert.equal(result.status,'DEFERRED_QUOTA');
 assert.equal(result.reason,'ALPACA_SHARED_QUOTA_GUARD');
 assert.equal(result.providerRequests,0);
 assert.equal(calls,140);
 assert.equal(fs.readFileSync(path.join(base,rawName),'utf8'),previous);
}));

test('independent ETF HTTP 429 defers without overwriting previous raw',()=>withFixture(async(base,previous)=>{
 let calls=0;
 const result=await collectSectorFearGreedR3EtfIncremental(base,{fetchImpl:async()=>{
  calls++;return new Response(null,{status:429});
 },now});
 assert.equal(calls,1);
 assert.equal(result.status,'DEFERRED_QUOTA');
 assert.equal(result.reason,'ALPACA_HTTP_429');
 assert.equal(result.providerRequests,1);
 assert.equal(fs.readFileSync(path.join(base,rawName),'utf8'),previous);
}));

test('post-response ledger failure accounts for the sent request and preserves raw',()=>withFixture(async(base,previous)=>{
 let calls=0;
 const result=await collectSectorFearGreedR3EtfIncremental(base,{fetchImpl:async()=>{
  calls++;
  fs.mkdirSync(path.join(base,'alpaca-quota-reservation.lock'));
  return Response.json({bars});
 },now});
 assert.equal(calls,1);
 assert.equal(result.status,'DEFERRED_QUOTA');
 assert.equal(result.reason,'ALPACA_LEDGER_UPDATE_UNVERIFIED');
 assert.equal(result.providerRequests,1);
 assert.equal(fs.readFileSync(path.join(base,rawName),'utf8'),previous);
}));

test('collect-local already-wrapped fetch uses one quota reservation rather than two',()=>withFixture(async(base)=>{
 fs.unlinkSync(path.join(base,rawName));
 let calls=0;
 const shared=createQuotaFetch({base,originalFetch:async()=>{
  calls++;return Response.json({bars});
 },mode:'enforce'}).fetch;
 const result=await collectSectorFearGreedR3EtfIncremental(base,{fetchImpl:shared,fetchAlreadyQuotaProtected:true,now});
 const ledger=JSON.parse(fs.readFileSync(path.join(base,'alpaca-quota-ledger.json'),'utf8'));
 assert.equal(result.status,'COLLECTED');
 assert.equal(result.providerRequests,1);
 assert.equal(calls,1);
 assert.equal(ledger.requestTimes.length,1);
}));
