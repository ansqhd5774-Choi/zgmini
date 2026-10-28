import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {R25_CFTC_URL,runR25CftcSourceExport} from '../scripts/pc-writer/market-calendar-r25-cftc-source-export.mjs';

const mockPage='<!DOCTYPE html><html><head><title>Release Schedule | CFTC</title></head><body><h1>Release Schedule</h1><p>The Commitments of Traders reports are released at 3:30 p.m. Eastern time.</p><h3>2026 Release Schedule</h3><table><tr><td>October</td><td>30</td></tr></table></body></html>';

test('R25 one official GET captures exact HTML, SHA256, with zero PC operations',async()=>{
 const calls=[];
 const result=await runR25CftcSourceExport({now:Date.parse('2026-10-28T06:00:00Z'),
  fetchImpl:async url=>{calls.push(url);return new Response(mockPage);}});
 assert.deepEqual(calls,[R25_CFTC_URL]);
 assert.equal(result.decision,'CFTC_HTML_CAPTURED_READONLY');
 const raw=Buffer.from(result.officialHtmlBase64,'base64');
 assert.equal(raw.toString('utf8'),mockPage);
 assert.equal(result.sha256,createHash('sha256').update(raw).digest('hex'));
 for(const k of ['coreSourceChanged','configChanged','schedulerChanged','dbChanged','publisherExecuted','collectionExecuted','gitPushed','forcedCollection'])assert.equal(result[k],false,k);
});

test('R25 refuses nonofficial target without any fetch',async()=>{
 let fetched=false;
 const result=await runR25CftcSourceExport({url:'https://example.org/',fetchImpl:async()=>{fetched=true;}});
 assert.equal(fetched,false);assert.equal(result.errorCode,'URL_NOT_ALLOWED');
});

test('R25 does not accept errors, redirected pages, or irrelevant HTML',async()=>{
 const denied=await runR25CftcSourceExport({fetchImpl:async()=>new Response('deny',{status:403})});
 assert.equal(denied.errorCode,'HTTP_NOT_OK');assert.equal(denied.officialHtmlBase64,undefined);
 const invalid=await runR25CftcSourceExport({fetchImpl:async()=>new Response('<html>CFTC sign in 2026</html>')});
 assert.equal(invalid.errorCode,'NOT_RECOGNIZED_CFTC_HTML');
 const redirect=await runR25CftcSourceExport({fetchImpl:async()=>({ok:true,status:200,url:'https://different.host/',headers:new Headers(),arrayBuffer:async()=>Buffer.from(mockPage)})});
 assert.equal(redirect.errorCode,'REDIRECT_NOT_ALLOWED');
});

test('R25 enforces declared and actual response size',async()=>{
 const declared=await runR25CftcSourceExport({fetchImpl:async()=>({ok:true,status:200,url:R25_CFTC_URL,headers:new Headers({'content-length':'4000000'}),arrayBuffer:async()=>{throw Error('must not read');}})});
 assert.equal(declared.errorCode,'SIZE_INVALID');
 const actual=await runR25CftcSourceExport({fetchImpl:async()=>new Response('x'.repeat(2*1024*1024+1))});
 assert.equal(actual.errorCode,'SIZE_INVALID');
});
