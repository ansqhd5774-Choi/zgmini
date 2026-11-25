import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCENARIOS,syntheticEnvelope,measureDataContracts}
 from '../scripts/ci-data-contract-r2.mjs';

test('nine published projection ids x seven states are measured without provider or write',async()=>{
 const r=await measureDataContracts();
 assert.equal(r.projections,9);
 assert.equal(r.scenarios,7);
 assert.equal(r.contractChecks,63);
 assert.equal(r.results.length,63);
 assert.equal(r.providerCalls,0);
 assert.equal(r.writeStatements,0);
 assert.equal(r.operationalDataVerified,false);
 assert.equal(r.results.filter(x=>x.status===200).length,18);
 assert.equal(r.results.filter(x=>x.status===503).length,36);
 assert.equal(r.results.filter(x=>x.status===405).length,9);
});
test('zero and null are distinct and date/version metadata are not fabricated',()=>{
 const zero=syntheticEnvelope('ready-zero');
 const empty=syntheticEnvelope('ready-null');
 assert.equal(zero.body.payload.score,0);
 assert.equal(empty.body.payload.score,null);
 assert.equal(zero.body.payload.observations[0].value,0);
 assert.equal(zero.body.payload.observations[1].value,null);
 assert.equal(zero.body.projection.sourceVersion,zero.body.projection.expectedSourceVersion);
 assert.notEqual(syntheticEnvelope('stale-version').body.projection.sourceVersion,
  syntheticEnvelope('stale-version').body.projection.expectedSourceVersion);
});
test('all unavailable conditions preserve their exact classification',()=>{
 assert.deepEqual(SCENARIOS.map(x=>x.name),[
  'ready-zero','ready-null','missing','stale-version',
  'source-future','source-expired','post-denied']);
 assert.deepEqual(SCENARIOS.filter(x=>x.status===503).map(x=>x.reason),[
  'STORED_PROJECTION_PENDING','STORED_PROJECTION_STALE',
  'STORED_PROJECTION_STALE','STORED_PROJECTION_STALE']);
});
test('incorrect reader status is rejected instead of claimed PASS',async()=>{
 await assert.rejects(measureDataContracts({reader:async()=>({
  status:200,json:async()=>({score:0}),
  headers:{get:()=>null}
 })}),/CI_DATA_ZERO_NULL_OR_BODY_CHANGED/);
});
test('unexpected extra D1 reads are rejected',async()=>{
 const reader=async(_req,db,id)=>{
  await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
   .bind('invalid-key').all();
  return {status:200,json:async()=>({status:'READY'}),headers:{get:()=>null}};
 };
 await assert.rejects(measureDataContracts({reader}),/CI_DATA_WRONG_STORAGE_KEY/);
});
test('invalid report context and read policy mutations fail closed',async()=>{
 await assert.rejects(measureDataContracts({reader:null}),/CI_DATA_READER_INVALID/);
 await assert.rejects(measureDataContracts({now:NaN}),/CI_DATA_READER_INVALID/);
});
test('existing CI executes focused Data contract without removing prior tests',()=>{
 const y=readFileSync(new URL('../.github/workflows/node.js.yml',import.meta.url),'utf8');
 assert.match(y,/node scripts\/ci-data-contract-r2\.mjs/);
 assert.match(y,/artifacts\/ci-data-contract\/report\.json/);
 assert.match(y,/node scripts\/ci-architecture-boundary\.mjs/);
 assert.match(y,/npm audit --omit=dev --audit-level=high/);
 assert.match(y,/node --test tests\/\*\.test\.mjs/);
 assert.doesNotMatch(y,/continue-on-error:\s*true/);
});
