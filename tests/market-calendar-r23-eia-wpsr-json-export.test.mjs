import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {exportEiaWpsrJson,EIA_WPSR_CALENDAR_URL} from '../scripts/pc-writer/market-calendar-r23-eia-wpsr-json-export.mjs';

const body=JSON.stringify([{data_for_date:'2026-10-23',release_date:'2026-10-28',
 next_release_date:'2026-11-04',release_time:'10:30 a.m.',blackout_minutes:15}]);

test('R23 WPSR JSON capture makes exactly one request, stores exact bytes and hash',async()=>{
 let called=0;
 const report=await exportEiaWpsrJson({now:Date.parse('2026-10-28T00:00:00Z'),fetchImpl:async url=>{
  called++;
  assert.equal(url,EIA_WPSR_CALENDAR_URL);
  return new Response(body,{headers:{'content-type':'application/json'}});
 }});
 assert.equal(called,1);
 assert.equal(report.decision,'EIA_WPSR_JSON_CAPTURED_READONLY');
 assert.equal(report.recordCount,1);
 assert.equal(report.validReleaseDateCount,1);
 assert.equal(Buffer.from(report.officialJsonBase64,'base64').toString('utf8'),body);
 assert.equal(report.sha256,createHash('sha256').update(body).digest('hex'));
 assert.equal(report.coreChanged,false);
 assert.equal(report.configChanged,false);
 assert.equal(report.dbChanged,false);
 assert.equal(report.tasksChanged,false);
 assert.equal(report.publisherExecuted,false);
 assert.equal(report.collectionExecuted,false);
});

test('R23 WPSR JSON rejects URL substitution without sending request',async()=>{
 let called=0;
 const report=await exportEiaWpsrJson({url:'https://www.eia.gov/admin',fetchImpl:async()=>{called++;return new Response(body);}});
 assert.equal(called,0);
 assert.equal(report.errorCode,'URL_NOT_ALLOWED');
 assert.equal(report.requestCount,0);
});

test('R23 WPSR JSON handles 403, malformed JSON and wrong schema without fake dates',async()=>{
 const denied=await exportEiaWpsrJson({fetchImpl:async()=>new Response('403',{status:403})});
 assert.equal(denied.errorCode,'HTTP_NOT_OK');
 const invalid=await exportEiaWpsrJson({fetchImpl:async()=>new Response('not-json')});
 assert.equal(invalid.errorCode,'JSON_PARSE_FAILED');
 const wrong=await exportEiaWpsrJson({fetchImpl:async()=>new Response(JSON.stringify([{release_date:'tomorrow'}]))});
 assert.equal(wrong.errorCode,'CALENDAR_SHAPE_INVALID');
 assert.ok(!('officialJsonBase64' in wrong));
});

test('R23 WPSR JSON rejects oversized responses and unexpected redirects',async()=>{
 const oversized=await exportEiaWpsrJson({fetchImpl:async()=>new Response(body,{headers:{'content-length':'999999'}})});
 assert.equal(oversized.errorCode,'SIZE_INVALID');
 const redirected=await exportEiaWpsrJson({fetchImpl:async()=>{
  const r=new Response(body);return {status:200,ok:true,url:'https://example.com/x',headers:r.headers,arrayBuffer:()=>r.arrayBuffer()};
 }});
 assert.equal(redirected.errorCode,'REDIRECT_NOT_ALLOWED');
});
