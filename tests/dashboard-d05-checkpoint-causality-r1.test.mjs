import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readProjectionCheckpoint} from '../worker/projection-checkpoint-r52.mjs';

// Diagnostic test: documents current source behavior. PASS is NOT proof
// that a newly collected provider observation reached public D1/UI.
const digest=body=>createHash('sha256').update(JSON.stringify(body)).digest('hex');
const sample={series:{FEDFUNDS:[{observationDate:'2026-11-12',value:4.0}]}};
function envFor(state,queries){
 return {DB_CORE:{prepare(sql){queries.push(sql);
  if(sql!=='SELECT stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')throw Error(`UNEXPECTED_QUERY ${sql}`);
  return {bind(key){assert.equal(key,'current');return this;},async first(){return {stored_at:state.publicStoredAt};}};
 }}};
}
const projectionNeedsRefresh=(prior,current)=>prior.sourceVersion!==current.sourceVersion||prior.sourceStoredAt!==current.sourceStoredAt;

test('D05 current snapshot rewrite changes derived projection checkpoint without input change',async()=>{
 const state={input:structuredClone(sample),publicStoredAt:1794733200000};
 const queries=[];const env=envFor(state,queries);
 const first=await readProjectionCheckpoint(env,'recession');
 const unchangedSourceSignature=digest(state.input);
 state.publicStoredAt+=60_000; // ONLY public current snapshot rewritten
 const second=await readProjectionCheckpoint(env,'recession');
 assert.equal(digest(state.input),unchangedSourceSignature,'no new raw input');
 assert.notEqual(first.sourceVersion,second.sourceVersion,'checkpoint advances from public stored_at only');
 assert.equal(projectionNeedsRefresh(first,second),true,'run-local refresh predicate is triggered');
 assert.equal(queries.length,2);
 assert.ok(queries.every(q=>q.includes('market_public_snapshots_v1')),'no input batch/source signature query');
});

test('new input with unchanged current snapshot does not advance derived projection checkpoint',async()=>{
 const state={input:structuredClone(sample),publicStoredAt:1794733200000};
 const queries=[];const env=envFor(state,queries);
 const first=await readProjectionCheckpoint(env,'creditRisk');
 const oldSig=digest(state.input);
 state.input.series.FEDFUNDS[0].value=4.25;
 const second=await readProjectionCheckpoint(env,'creditRisk');
 assert.notEqual(digest(state.input),oldSig,'saved input content changed');
 assert.deepEqual(second,first,'reader did not observe that input event');
 assert.equal(projectionNeedsRefresh(first,second),false);
 assert.equal(queries.length,2);
});

test('existing inflation build suffix and KFG history checkpoint remain distinct',async()=>{
 const state={input:structuredClone(sample),publicStoredAt:1794733200000};
 const c=await readProjectionCheckpoint(envFor(state,[]),'inflation');
 assert.match(c.sourceVersion,/^core:1794733200000:inflation-indicator-table/);
 const k=await readProjectionCheckpoint({DB_HISTORY:{prepare(sql){assert.match(sql,/kfg_rev7_snapshots/);return {async first(){return {date:'20261113',calculated_at:'2026-11-13T00:00:00Z'};}}}}},'koreaFearGreed');
 assert.match(k.sourceVersion,/^kfg:20261113:/);
});
