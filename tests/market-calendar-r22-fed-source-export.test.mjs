import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fedR22Urls,runR22FedSourceExport} from '../scripts/pc-writer/market-calendar-r22-fed-source-export.mjs';

const html=(name='Federal Reserve Board - Calendar')=>
 `<!DOCTYPE html><html><head><title>${name}</title></head><body><h1>FOMC Meeting</h1>`+
 '<p>Beige Book</p><p>G.19 - Consumer Credit</p><p>G.17</p></body></html>';

test('R22 selects only official Fed monthly and global calendar sources at year rollover',()=>{
 const urls=fedR22Urls(Date.parse('2026-12-29T12:00:00Z'));
 assert.deepEqual(urls.slice(0,3).map(p=>p.label),['2026-12','2027-01','2027-02']);
 assert.equal(urls.length,5);
 assert.ok(urls.every(x=>new URL(x.url).hostname==='www.federalreserve.gov'));
});

test('R22 read-only embeds exact official page content without touching Core or storing data',async()=>{
 const calls=[];
 const probes=fedR22Urls(Date.parse('2026-10-28T12:00:00Z'));
 const result=await runR22FedSourceExport({now:Date.parse('2026-10-28T12:00:00Z'),probes,
  fetchImpl:async url=>{calls.push(url);return new Response(html());}});
 assert.equal(result.decision,'FED_HTML_CAPTURE_COMPLETE_READONLY');
 assert.equal(result.capturedCount,5);
 assert.deepEqual(calls,probes.map(p=>p.url));
 assert.equal(result.dbChanged,false);assert.equal(result.coreSourceChanged,false);
 assert.equal(result.publisherExecuted,false);assert.equal(result.collectionExecuted,false);
 for(const item of result.probes){
  assert.equal(item.status,'RAW_HTML_CAPTURED_NOT_PARSED');
  const bytes=Buffer.from(item.officialHtmlBase64,'base64');
  assert.equal(item.sha256,createHash('sha256').update(bytes).digest('hex'));
  assert.equal(bytes.toString('utf8'),html());
  assert.ok(item.anchorCounts.beigeBook>0);
 }
});

test('R22 preserves partial official source evidence on unavailable future month',async()=>{
 const result=await runR22FedSourceExport({now:Date.parse('2026-10-28T12:00:00Z'),
  fetchImpl:async url=>url.includes('november')?new Response('Missing',{status:404}):new Response(html())});
 assert.equal(result.decision,'FED_HTML_CAPTURE_PARTIAL_READONLY');
 assert.equal(result.capturedCount,4);
 assert.equal(result.probes[1].errorCode,'HTTP_NOT_OK');
 assert.equal(result.probes[1].officialHtmlBase64,undefined);
});

test('R22 rejects unexpected host and non-official HTML without exporting them',async()=>{
 let fetched=0;
 const result=await runR22FedSourceExport({now:Date.parse('2026-10-28T12:00:00Z'),probes:[
  {kind:'other',label:'hostile',url:'https://example.com/no'},
  {kind:'month',label:'unrecognized',url:'https://www.federalreserve.gov/newsevents/2026-october.htm'},
 ],fetchImpl:async()=>{fetched++;return new Response('<html><title>Other</title></html>');}});
 assert.equal(result.decision,'NO_OFFICIAL_HTML_EXPORTED');
 assert.equal(fetched,1);
 assert.deepEqual(result.probes.map(p=>p.errorCode),['URL_NOT_ALLOWED','NOT_RECOGNIZED_OFFICIAL_HTML']);
});
