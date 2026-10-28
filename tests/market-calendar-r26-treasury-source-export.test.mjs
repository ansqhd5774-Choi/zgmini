import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {R26_TREASURY_URL,runR26TreasurySourceExport} from '../scripts/pc-writer/market-calendar-r26-treasury-source-export.mjs';

const sample='<?xml version="1.0" encoding="UTF-8"?><TreasuryCUSIPRelease><Auction><CUSIP>912797XX1</CUSIP><AuctionDate>2026-10-30</AuctionDate></Auction></TreasuryCUSIPRelease>';

test('R26 exactly one official GET, bytes/checksum, zero PC mutations',async()=>{
 const calls=[];
 const result=await runR26TreasurySourceExport({now:Date.parse('2026-10-28T06:00:00Z'),
  fetchImpl:async url=>{calls.push(url);return new Response(sample,{headers:{'content-type':'text/xml'}});}});
 assert.deepEqual(calls,[R26_TREASURY_URL]);
 assert.equal(result.decision,'TREASURY_XML_CAPTURED_READONLY');
 const bytes=Buffer.from(result.officialXmlBase64,'base64');
 assert.equal(bytes.toString('utf8'),sample);
 assert.equal(result.sha256,createHash('sha256').update(bytes).digest('hex'));
 assert.equal(result.contentType,'text/xml');
 for(const key of ['coreSourceChanged','configChanged','schedulerChanged','dbChanged','publisherExecuted','collectionExecuted','gitPushed','forcedCollection'])
  assert.equal(result[key],false,key);
});

test('R26 blocks alternate URLs before any GET',async()=>{
 let called=false;
 const result=await runR26TreasurySourceExport({url:'https://example.com/auctions.xml',
  fetchImpl:async()=>{called=true;return new Response(sample);}});
 assert.equal(called,false);
 assert.equal(result.errorCode,'URL_NOT_ALLOWED');
});

test('R26 reports HTTP error, redirect or irrelevant HTML without raw payload',async()=>{
 const denied=await runR26TreasurySourceExport({fetchImpl:async()=>new Response('forbidden',{status:403})});
 assert.equal(denied.errorCode,'HTTP_NOT_OK');
 const redirected=await runR26TreasurySourceExport({fetchImpl:async()=>({ok:true,status:200,url:'https://other.gov/',headers:new Headers(),arrayBuffer:async()=>Buffer.from(sample)})});
 assert.equal(redirected.errorCode,'REDIRECT_NOT_ALLOWED');
 const html=await runR26TreasurySourceExport({fetchImpl:async()=>new Response('<html><body>Treasury CUSIP release not available</body></html>')});
 assert.equal(html.errorCode,'NOT_RECOGNIZED_TREASURY_XML');
 assert.equal(html.officialXmlBase64,undefined);
});

test('R26 limits declared and actual byte sizes',async()=>{
 const declared=await runR26TreasurySourceExport({fetchImpl:async()=>({ok:true,status:200,url:R26_TREASURY_URL,headers:new Headers({'content-length':'4000000'}),arrayBuffer:async()=>{throw Error('unreachable');}})});
 assert.equal(declared.errorCode,'SIZE_INVALID');
 const actual=await runR26TreasurySourceExport({fetchImpl:async()=>new Response('x'.repeat(3*1024*1024+1))});
 assert.equal(actual.errorCode,'SIZE_INVALID');
});
