import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {fetchDiagnosticFredSeries} from '../lib/diagnostic-layer/official-macro-adapters.mjs';
import {safeMacroDiagnostic} from '../worker/macro-result-contract-r61.mjs';
import {appendCollectionEvent,appendProviderFailure} from '../scripts/pc-writer/collection-events.mjs';
import {expandedCollectionEntries,EXPANDED_HEALTH_JOBS} from '../scripts/pc-writer/expanded-collection-health.mjs';
import {collectionHealthSummary,readCollectionHealth} from '../worker/collection-health.mjs';
import {HEALTH_JOBS} from '../scripts/pc-writer/collection-health.mjs';
import {MARKET_COLLECTION_JOBS} from '../worker/market-collection-jobs.mjs';
const now=Date.UTC(2026,9,26,11);
test('core collection and health share one registry',()=>assert.equal(HEALTH_JOBS,MARKET_COLLECTION_JOBS));
test('FRED HTTP failure retains numeric status and attempted page count without URL or key',async()=>{
 const r=await fetchDiagnosticFredSeries('PAYEMS',{key:'private-key',asOf:'2026-10-26',fetchImpl:async()=>new Response('',{status:503})});
 assert.equal(r.status,'HTTP_ERROR');assert.equal(r.httpStatus,503);assert.equal(r.requestCount,1);assert.deepEqual(r.rows,[]);assert(!JSON.stringify(r).includes('private-key'));
});
test('collection and provider failure evidence survives a later successful run without secrets',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'macro-health-'));
 try{const sourceDiagnostic={provider:'FRED',requested:42,ready:41,missing:['PAYEMS','secret'],failed:[{seriesId:'PAYEMS',status:'TIMEOUT',httpStatus:200,requestCount:1,durationMs:8000,raw:'private'},{seriesId:'secret',status:'PRIVATE'}]};
  appendCollectionEvent(base,{at:new Date(now).toISOString(),job:'macro',status:'SOURCE_FAILED',reason:'MACRO_REQUIRED_SERIES_MISSING',sourceDiagnostic,raw:'private'});appendCollectionEvent(base,{at:new Date(now+1).toISOString(),job:'macro',status:'COMPLETE'});
  appendProviderFailure(base,'https://api.stlouisfed.org/fred/series/observations?series_id=PAYEMS&api_key=private',{phase:'FETCH',error:Object.assign(Error('private'),{name:'TimeoutError'}),now});
  const text=fs.readFileSync(path.join(base,'collection-events.jsonl'),'utf8'),events=text.trim().split('\n').map(JSON.parse),provider=fs.readFileSync(path.join(base,'provider-request-failures.jsonl'),'utf8');assert.deepEqual(events[0].sourceDiagnostic.missing,['PAYEMS']);assert.equal(events[0].sourceDiagnostic.failed[0].status,'TIMEOUT');assert.equal(events[1].status,'COMPLETE');assert.equal(JSON.parse(provider).networkCode,'TIMEOUT');assert(!/private|api_key|secret|observations/.test(text+provider));assert.equal(safeMacroDiagnostic({provider:'OTHER'}),null);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});
test('recent success remains historical evidence but cannot hide the latest failure',async()=>{
 const body=collectionHealthSummary([{id:'job:macro',lastSuccessAt:now-100,checkedAt:now-1,outcome:'failure'}],now);assert.equal(body.normal,1);assert.equal(body.latestFailed,1);assert.equal(body.status,'partial');
 const db={prepare(){return {bind(){return {first:async()=>({body:JSON.stringify(body)})}}}}};const b=await(await readCollectionHealth(db,now+1)).json();assert.equal(b.normal,1);assert.equal(b.status,'partial');assert.equal(b.latestFailed,1);
});
test('missing new lanes stay in the denominator; private score and manifest do not prove latest success',()=>{
 const entries=expandedCollectionEntries({secondary:{status:'PRIVATE_SCORED_PENDING_LICENSE',at:new Date(now).toISOString()},biotechManifest:{version:1,files:[{sha256:'a'.repeat(64),collectedAt:new Date(now-1).toISOString()}]}});assert.equal(entries.length,EXPANDED_HEALTH_JOBS.length);assert.equal(entries.length,5);const b=collectionHealthSummary(entries,now);assert.equal(b.normal,1);assert.equal(b.latestUnknown,5);assert.equal(b.status,'unknown');assert.equal(new Set(entries.map(x=>x.id)).size,5);
});
