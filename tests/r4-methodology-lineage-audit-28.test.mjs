import test from 'node:test';
import assert from 'node:assert/strict';
import {sameVerifiedLineage} from '../scripts/pc-writer/market-snapshot-comparisons.mjs';
import {compositeSampleFromVerified,mergeCompositeObservedDay} from '../lib/composite-observed-history-r1.mjs';
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

test('R4 #28 current calculated archive record has no explicit method field: owner contract decision pending',()=>{
 const a=compositeSampleFromVerified(score('CM-R1'),now);
 assert.deepEqual(Object.keys(a).sort(),['asOfDate','calculatedAt','score','signature'].sort());
 assert.equal(a.calculatedAt,'2026-11-16T12:00:00.000Z');
 assert.equal(a.score,52);
});

test('R4 #28 CURRENT GAP: aggregate and submodel-only vintage transition cannot be recovered from stored signature',()=>{
 const prior=compositeSampleFromVerified(score('CM-R1','RATE_R3'),now);
 const later=compositeSampleFromVerified(score('CM-R2','RATE_R4'),now+15*60000);
 // Diagnostic baseline, NOT a new desired contract: the current archive
 // signature covers score/domain methodVersion but not aggregate modelVersion
 // or a domain modelVersion distinct from methodologyVersion.
 assert.equal(prior.signature,later.signature);
 const day=mergeCompositeObservedDay(null,'2026-11-16',prior);
 assert.equal(mergeCompositeObservedDay(day.body,'2026-11-16',later).changed,false);
});

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
