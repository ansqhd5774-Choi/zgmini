import test from 'node:test';
import assert from 'node:assert/strict';
import {sameVerifiedLineage} from '../scripts/pc-writer/market-snapshot-comparisons.mjs';
import {mergeStoredCompositeTrend} from '../worker/composite-history.mjs';
import {COMPOSITE_MODEL_VERSION} from '../lib/market-score/composite-model-r1.mjs';

// R4 #28 diagnostic: preserve the currently approved history contract while
// demonstrating which provenance is available and where an *approved* contract
// extension would be needed. These tests do not authorize a model, DB or API
// change and do not claim that CM-R2 is deployed.
const now=Date.parse('2026-11-16T12:00:00Z');
const score=(version,subModel='RATE_R3')=>({
 status:'SUCCESS',modelVersion:version,asOfDate:'2026-11-16',
 overall:{status:'READY',score:52},
 domains:Array.from({length:12},(_,i)=>({
  id:'domain-'+i,status:'READY',score:i===0?63:50,
  asOfDate:'2026-11-16',
  ...(i===0?{modelVersion:subModel}:{}),
 })),
});

test('R4 #28 active aggregate method is CM-R1, not an invented CM-R2 migration',()=>{
 assert.equal(COMPOSITE_MODEL_VERSION,'CM-R1');
});

test('R4 #28 existing domain comparison policy requires matching explicit methodology',()=>{
 const old={source:'FRED',methodologyVersion:'RATE_R3',score:52};
 const same={source:'FRED',methodologyVersion:'RATE_R3',score:53};
 const newMethod={source:'FRED',methodologyVersion:'RATE_R4',score:54};
 assert.equal(sameVerifiedLineage(old,same),true);
 assert.equal(sameVerifiedLineage(old,newMethod),false);
 assert.equal(sameVerifiedLineage(old,{score:54}),false);
 assert.equal(sameVerifiedLineage(old,{source:'OTHER',methodologyVersion:'RATE_R3'}),false);
});

// The current archive sample helper is not yet present on this pre-main UI
// branch. Verify that helper against current main independently; do not copy a
// new operational module into the old UI branch just to make a test pass.
test('R4 #28 CURRENT GAP: retained previous-model daily points have no segment boundary in merged display history',()=>{
 const out=mergeStoredCompositeTrend({
  storedSnapshots:[
   {date:'2026-11-15',storedAt:1,body:{
    modelVersion:'CM-R1',overall:{status:'READY',score:50,trend:[{label:'2026-11-15',value:50}]}},
   },
   {date:'2026-11-16',storedAt:2,body:{
    modelVersion:'CM-R2',overall:{status:'READY',score:52,trend:[{label:'2026-11-16',value:52}]}},
   },
  ],
  currentDate:'2026-11-16',currentScore:52,
 });
 assert.deepEqual(out,[{label:'2026-11-15',value:50},{label:'2026-11-16',value:52}]);
 assert.equal(out.some(point=>Object.hasOwn(point,'modelVersion')),false);
});

test('R4 #28 legacy history preservation and valid zero are retained until an approved lineage contract exists',()=>{
 const out=mergeStoredCompositeTrend({
  legacyTrend:[{label:'2026-11-13',value:0}],
  storedSnapshots:[{date:'2026-11-15',storedAt:1,body:{overall:{status:'READY',score:50}}}],
  currentDate:'2026-11-16',currentScore:52,
 });
 assert.deepEqual(out,[
  {label:'2026-11-13',value:0},
  {label:'2026-11-15',value:50},
  {label:'2026-11-16',value:52},
 ]);
});
