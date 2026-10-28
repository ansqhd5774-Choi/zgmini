import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {R27_TIC_URL,runR27TicSourceExport} from '../scripts/pc-writer/market-calendar-r27-tic-source-export.mjs';

const page='<!DOCTYPE html><html><head><title>Release Dates of TIC Data | Treasury International Capital</title></head><body><h1>Release Dates of TIC Data</h1><table><tr><td>2026</td><td>Monthly</td></tr><tr><td>2027</td><td>Quarterly</td></tr></table></body></html>';

test('R27 one official GET captures original HTML, checksum and no PC mutations',async()=>{
 const urls=[];
 const result=await runR27TicSourceExport({now:Date.parse('2026-10-28T06:00:00Z'),
  fetchImpl:async url=>{urls.push(url);return new Response(page,{headers:{'content-type':'text/html; charset=UTF-8'}});}});
 assert.deepEqual(urls,[R27_TIC_URL]);
 assert.equal(result.decision,'TIC_HTML_CAPTURED_READONLY');
 const raw=Buffer.from(result.officialHtmlBase64,'base64');
 assert.equal(raw.toString('utf8'),page);
 assert.equal(result.sha256,createHash('sha256').update(raw).digest('hex'));
 for(const key of ['coreSourceChanged','configChanged','schedulerChanged','dbChanged','publisherExecuted','collectionExecuted','gitPushed','forcedCollection'])assert.equal(result[key],false,key);
});

test('R27 refuses nonofficial URLs without any request',async()=>{
 let touched=false;
 const result=await runR27TicSourceExport({url:'https://example.invalid/2027',fetchImpl:async()=>{touched=true;return new Response(page);}});
 assert.equal(touched,false);assert.equal(result.errorCode,'URL_NOT_ALLOWED');
});

test('R27 handles invalid HTML, HTTP failures and redirects without Base64',async()=>{
 const error=await runR27TicSourceExport({fetchImpl:async()=>new Response('blocked',{status:403})});
 assert.equal(error.errorCode,'HTTP_NOT_OK');
 const wrong=await runR27TicSourceExport({fetchImpl:async()=>new Response('<html>2026 monthly Treasury News</html>')});
 assert.equal(wrong.errorCode,'NOT_RECOGNIZED_TIC_HTML');
 const redirect=await runR27TicSourceExport({fetchImpl:async()=>({ok:true,status:200,url:'https://other.gov/',headers:new Headers(),arrayBuffer:async()=>Buffer.from(page)})});
 assert.equal(redirect.errorCode,'REDIRECT_NOT_ALLOWED');
 assert.equal(redirect.officialHtmlBase64,undefined);
});

test('R27 caps declared and actual source sizes',async()=>{
 const declared=await runR27TicSourceExport({fetchImpl:async()=>({ok:true,status:200,url:R27_TIC_URL,headers:new Headers({'content-length':'9000000'}),arrayBuffer:async()=>{throw Error('must not read');}})});
 assert.equal(declared.errorCode,'SIZE_INVALID');
 const actual=await runR27TicSourceExport({fetchImpl:async()=>new Response('x'.repeat(3*1024*1024+1))});
 assert.equal(actual.errorCode,'SIZE_INVALID');
});
