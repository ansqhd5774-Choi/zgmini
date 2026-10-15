import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildBeginnerInput,enrichBeginnerPayload,validPublicBeginnerCopy} from '../scripts/pc-writer/beginner-projection-copy.mjs';

const payload=()=>({
 status:'READY',
 score:62.1,
 asOfDate:'2026-10-15',
 features:{
  WAGE_YOY:{status:'READY',score:82},
  UNIT_LABOR_COST:{status:'READY',score:78},
  PPI_FINAL:{status:'READY',score:31},
  CORE_CPI_3M:{status:'READY',score:41},
 }
});
const checkpoint={sourceVersion:'core:123',sourceStoredAt:123};
const allowedKeys=['generatedAt','marketMeaning','sourceHash','sourceStoredAt','sourceVersion','status','summary','whyItMatters'];

test('writer input is derived only from stored projection fields',()=>{
 const input=buildBeginnerInput('inflation',payload());
 assert.equal(input.topic,'inflation');
 assert.equal(input.score,62.1);
 assert.equal(input.stage,'안정');
 assert.deepEqual(input.positiveFactors,['평균 시간당 임금','Unit Labor Cost']);
 assert.deepEqual(input.negativeFactors,['PPI Final Demand','Core CPI 3M']);
 assert.match(input.base.summary,/62\.1점/);
});

test('published beginnerCopy contains only approved public fields',async()=>{
 const input=buildBeginnerInput('inflation',payload());
 const copy={summary:input.base.summary,whyItMatters:input.base.whyItMatters,marketMeaning:input.base.marketMeaning};
 let calls=0;
 const fetcher=async()=>{calls++;return {ok:true,json:async()=>({response:JSON.stringify(copy)})}};
 const out=await enrichBeginnerPayload('inflation',payload(),{checkpoint,fetcher,modelDigest:'sha256:test',now:456});
 assert.equal(out.status,'GENERATED');
 assert.equal(calls,1);
 assert.deepEqual(Object.keys(out.payload.beginnerCopy).sort(),allowedKeys);
 assert.equal(out.payload.beginnerCopy.status,'COPY_ONLY');
 assert.equal(out.payload.beginnerCopy.sourceVersion,'core:123');
 assert.equal(out.payload.beginnerCopy.sourceStoredAt,123);
 assert.equal(out.payload.beginnerCopy.generatedAt,456);
 assert.ok(validPublicBeginnerCopy(out.payload.beginnerCopy));
 assert.equal('model' in out.payload.beginnerCopy,false);
 assert.equal('modelDigest' in out.payload.beginnerCopy,false);
 assert.equal('promptVersion' in out.payload.beginnerCopy,false);
});

test('same input hash reuses stored copy without any Ollama call',async()=>{
 const input=buildBeginnerInput('inflation',payload());
 const copy={summary:input.base.summary,whyItMatters:input.base.whyItMatters,marketMeaning:input.base.marketMeaning};
 const generated=await enrichBeginnerPayload('inflation',payload(),{checkpoint,fetcher:async()=>({ok:true,json:async()=>({response:JSON.stringify(copy)})}),modelDigest:'sha256:test',now:456});
 const reused=await enrichBeginnerPayload('inflation',payload(),{checkpoint:{sourceVersion:'core:124',sourceStoredAt:124},existingCopy:generated.payload.beginnerCopy,fetcher:async()=>{throw Error('SHOULD_NOT_CALL_OLLAMA')}});
 assert.equal(reused.status,'REUSED');
 assert.equal(reused.payload.beginnerCopy.generatedAt,456);
 assert.equal(reused.payload.beginnerCopy.sourceVersion,'core:124');
 assert.equal(reused.payload.beginnerCopy.sourceStoredAt,124);
});

test('writer wiring enriches after projection build and before remote publication',()=>{
 const src=fs.readFileSync('scripts/pc-writer/run-local.mjs','utf8');
 const enrich=src.indexOf('enrichLocalBeginnerProjections');
 const providerGuard=src.indexOf("CALCULATION_ATTEMPTED_NETWORK");
 const restore=src.indexOf('globalThis.fetch=originalFetch');
 const remote=src.indexOf('const remote=client');
 assert.ok(enrich>0);
 assert.ok(providerGuard>enrich);
 assert.ok(restore>enrich);
 assert.ok(remote>restore);
});

test('Ollama enrichment is localhost-only and preserves projection stored_at',()=>{
 const src=fs.readFileSync('scripts/pc-writer/beginner-projection-cycle.mjs','utf8');
 assert.match(src,/hostname!==['"]127\.0\.0\.1['"]/);
 assert.match(src,/port!==['"]11434['"]/);
 assert.match(src,/UPDATE market_public_snapshots_v1 SET body=\? WHERE snapshot_key=\?/);
 assert.doesNotMatch(src,/SET body=\?,stored_at=\?/);
});

test('browser only reads validated stored copy and never calls Ollama',()=>{
 const src=fs.readFileSync('app/beginner-risk-guide.tsx','utf8');
 assert.match(src,/payload\?\.beginnerCopy/);
 assert.match(src,/storedCopy\?\.summary/);
 assert.match(src,/storedCopy\?\.whyItMatters/);
 assert.match(src,/storedCopy\?\.marketMeaning/);
 assert.match(src,/data-copy-source=\{storedCopy\?"stored":"deterministic"\}/);
 assert.doesNotMatch(src,/11434|api\/generate|ollama/i);
});
