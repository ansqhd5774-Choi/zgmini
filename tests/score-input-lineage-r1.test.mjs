import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreInputLineage,scoreInputRebuildDecision} from '../lib/score-history/input-lineage-r1.mjs';

const A='a'.repeat(64),B='b'.repeat(64);
const macro={key:'macro',state:'READY',observationId:'2026-10',revisionId:'original',bodySha256:A};
const credit={key:'credit',state:'READY',observationId:'2026-10',revisionId:'original',bodySha256:B};
const make=(overrides={})=>scoreInputLineage({scoreId:'D27',methodologyVersion:'R6',eligibilityState:'READY',sources:[macro,credit],...overrides});

test('same effective inputs are stable despite reorder and fresh output save times',()=>{
 const first=make();
 const second=make({sources:[{...credit,storedAt:9999,publishedAt:2222},{...macro,storedAt:1234,rawPayload:{secret:'DO_NOT_EMIT'}}]});
 assert.equal(first.inputSignature,second.inputSignature);
 assert.match(first.inputSignature,/^[a-f0-9]{64}$/);
 assert.equal(JSON.stringify(first).includes('DO_NOT_EMIT'),false);
});

test('an actual new observation changes the input signature',()=>{
 assert.notEqual(make().inputSignature,make({sources:[{...macro,observationId:'2026-11'},credit]}).inputSignature);
});

test('a provider revision changes the input signature without changing observation month',()=>{
 assert.notEqual(make().inputSignature,make({sources:[{...macro,revisionId:'revised'},credit]}).inputSignature);
});

test('changed verified body digest changes the input signature',()=>{
 assert.notEqual(make().inputSignature,make({sources:[{...macro,bodySha256:B},credit]}).inputSignature);
});

test('TTL expiry and missing/null input states are distinguishable',()=>{
 const stale=make({sources:[{...macro,state:'STALE'},credit]});
 const missing=make({sources:[{key:'macro',state:'MISSING'},credit]});
 const explicitNull=make({sources:[{key:'macro',state:'NULL'},credit]});
 assert.notEqual(make().inputSignature,stale.inputSignature);
 assert.notEqual(missing.inputSignature,explicitNull.inputSignature);
 assert.notEqual(make({eligibilityState:'READY'}).inputSignature,make({eligibilityState:'PARTIAL'}).inputSignature);
});

test('an effective trading-session boundary changes the signature only when supplied',()=>{
 assert.equal(make({sources:[macro,credit],calculatedAt:'2026-11-10'}).inputSignature,make({sources:[macro,credit],calculatedAt:'2026-11-11'}).inputSignature);
 assert.notEqual(make().inputSignature,make({evaluationKey:'US:2026-11-10:CLOSED'}).inputSignature);
});

test('approved methodology version is part of the input identity',()=>{
 assert.notEqual(make().inputSignature,make({methodologyVersion:'R7'}).inputSignature);
});

test('unchanged input can skip only after verified publication; failure remains retryable',()=>{
 const candidate=make(),verified={...candidate,publicationVerified:true};
 assert.deepEqual(scoreInputRebuildDecision(candidate,verified),{required:false,reason:'UNCHANGED_EFFECTIVE_INPUT'});
 assert.deepEqual(scoreInputRebuildDecision(candidate,{...candidate,publicationVerified:false}),{required:true,reason:'NO_VERIFIED_PUBLICATION'});
 assert.deepEqual(scoreInputRebuildDecision(candidate),{required:true,reason:'NO_VERIFIED_PUBLICATION'});
 assert.deepEqual(scoreInputRebuildDecision(make({sources:[{...macro,revisionId:'rev2'},credit]}),verified),{required:true,reason:'EFFECTIVE_INPUT_CHANGED'});
});

test('incomplete or ambiguous evidence fails closed and cannot silently skip',()=>{
 assert.throws(()=>make({sources:[]}),/INPUT_EVIDENCE_REQUIRED/);
 assert.throws(()=>make({sources:[macro,macro]}),/DUPLICATE_SOURCE_KEY/);
 assert.throws(()=>make({sources:[{...macro,bodySha256:null},credit]}),/READY_SOURCE_DIGEST_REQUIRED/);
 assert.throws(()=>make({sources:[{...macro,bodySha256:'not-a-hash'},credit]}),/INVALID_SOURCE_DIGEST/);
 assert.throws(()=>scoreInputRebuildDecision(make(),{scoreId:'T30',publicationVerified:true,inputSignature:A}),/LINEAGE_SCORE_ID_MISMATCH/);
});
