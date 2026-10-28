import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {R23_EIA_PAGES,runR23EiaSourceExport} from '../scripts/pc-writer/market-calendar-r23-eia-source-export.mjs';

const html=(title='U.S. Energy Information Administration - Release Schedules')=>
 `<!DOCTYPE html><html><head><title>${title}</title></head>`+
 '<body><h1>EIA</h1><p>Next Release Date: November 10, 2026</p><p>Release Schedule</p></body></html>';

test('R23 approved sources are distinct fixed EIA public HTTPS URLs',()=>{
 assert.equal(R23_EIA_PAGES.length,6);
 assert.equal(new Set(R23_EIA_PAGES.map(p=>p.url)).size,6);
 assert.ok(R23_EIA_PAGES.every(p=>['www.eia.gov','ir.eia.gov'].includes(new URL(p.url).hostname)));
 assert.ok(R23_EIA_PAGES.every(p=>new URL(p.url).protocol==='https:'));
});

test('R23 captures exact official HTML with one sequential GET and pause per URL',async()=>{
 const observed=[],paused=[];
 const result=await runR23EiaSourceExport({now:Date.parse('2026-10-28T05:00:00Z'),
  pauseImpl:async ms=>{paused.push(ms);observed.push('pause');},
  fetchImpl:async url=>{observed.push(url);return new Response(html());}});
 assert.equal(result.decision,'EIA_HTML_CAPTURE_COMPLETE_READONLY');
 assert.equal(result.capturedCount,6);
 assert.equal(observed.length,11);
 assert.deepEqual(observed.filter(x=>x!=='pause'),R23_EIA_PAGES.map(p=>p.url));
 assert.deepEqual(paused,[1200,1200,1200,1200,1200]);
 for(let i=0;i<6;i++){
  const item=result.probes[i];
  assert.equal(item.status,'RAW_HTML_CAPTURED_NOT_PARSED');
  const raw=Buffer.from(item.officialHtmlBase64,'base64');
  assert.equal(raw.toString('utf8'),html());
  assert.equal(item.sha256,createHash('sha256').update(raw).digest('hex'));
 }
 assert.equal(result.coreSourceChanged,false);assert.equal(result.configChanged,false);
 assert.equal(result.dbChanged,false);assert.equal(result.schedulerChanged,false);
 assert.equal(result.publisherExecuted,false);assert.equal(result.collectionExecuted,false);
 assert.equal(result.gitPushed,false);
});

test('R23 returns partial result with reason and never invents failed HTML',async()=>{
 const url=R23_EIA_PAGES[3].url;
 const result=await runR23EiaSourceExport({pauseImpl:async()=>{},
  fetchImpl:async input=>input===url?new Response('blocked',{status:403}):new Response(html())});
 assert.equal(result.decision,'EIA_HTML_CAPTURE_PARTIAL_READONLY');
 assert.equal(result.capturedCount,5);
 assert.equal(result.probes[3].errorCode,'HTTP_NOT_OK');
 assert.equal(result.probes[3].officialHtmlBase64,undefined);
});

test('R23 refuses unapproved URLs and non-EIA HTML pages',async()=>{
 let calls=0;
 const result=await runR23EiaSourceExport({pauseImpl:async()=>{},probes:[
  {kind:'test',label:'external',url:'https://example.com/secret'},
  {kind:'test',label:'unknown-page',url:'https://www.eia.gov/admin/private.php'},
  R23_EIA_PAGES[0],
 ],fetchImpl:async()=>{calls++;return new Response('<html><title>Not the government</title></html>');}});
 assert.equal(result.decision,'NO_OFFICIAL_HTML_EXPORTED');
 assert.equal(calls,1);
 assert.deepEqual(result.probes.map(x=>x.errorCode),[
  'URL_NOT_ALLOWED','URL_NOT_ALLOWED','NOT_RECOGNIZED_OFFICIAL_HTML']);
});

test('R23 rejects unexpected redirect and oversized HTML safely',async()=>{
 const redirect=await runR23EiaSourceExport({probes:[R23_EIA_PAGES[0]],pauseImpl:async()=>{},
  fetchImpl:async()=>{const response=new Response(html());return {
   status:200,ok:true,url:'https://example.com/path',headers:response.headers,
   arrayBuffer:()=>response.arrayBuffer()};}});
 assert.equal(redirect.probes[0].errorCode,'REDIRECT_NOT_ALLOWED');
 const large=await runR23EiaSourceExport({probes:[R23_EIA_PAGES[0]],pauseImpl:async()=>{},
  fetchImpl:async()=>new Response(html(),{headers:{'content-length':'2000000'}})});
 assert.equal(large.probes[0].errorCode,'SIZE_INVALID');
});
