import test from 'node:test';import assert from 'node:assert/strict';
import {buildReferenceFlow} from '../lib/iran-progress/reference-flow-r1.mjs';
import {IRAN_FLOW_KEY,validateReferenceFlow} from '../lib/iran-progress/reference-public.mjs';
import {storedIranProgressResponse} from '../worker/iran-progress-public.mjs';
import {iranView} from '../lib/iran-progress/view.mjs';
import {calculateStoredFlow} from '../scripts/iran-progress/reference-flow.mjs';
const now=Date.parse('2026-10-09T12:00:00Z');
const body=()=>({...buildReferenceFlow([],{asOfDate:'2026-10-09'}),publishedAt:now,collectionCheckedAt:now,events:[]});
const db=b=>({prepare:()=>({bind:key=>({first:async()=>key===IRAN_FLOW_KEY?{body:JSON.stringify(b),stored_at:now}:null})})});
test('reference score is visible without claiming verified peace or probability',async()=>{
 const b=body();assert.equal(validateReferenceFlow(b,now),true);
 const response=await storedIranProgressResponse(new Request('https://example.test'),{db:db(b),now});
 assert.equal(response.status,200);const v=iranView(await response.json(),now);
 assert.equal(v.score,50);assert.equal(v.overallEnded,false);assert.equal(v.reference,true);
});
test('old collection remains delayed even if published again',async()=>{
 const b={...body(),collectionCheckedAt:now-2*86400000};
 const response=await storedIranProgressResponse(new Request('https://example.test'),{db:db(b),now});
 const result=await response.json();assert.equal(result.status,'UPDATE_DELAYED');assert.equal(result.score,50);
});
test('forged weighted score, future collection and negative timestamp are rejected',()=>{
 assert.equal(validateReferenceFlow({...body(),score:90},now),false);
 assert.equal(validateReferenceFlow({...body(),collectionCheckedAt:now+1},now),false);
 assert.equal(validateReferenceFlow({...body(),publishedAt:-1},now),false);
});
test('failed collection holds the previous score even when feeds were recently checked',()=>{
 const previous={...body(),score:45,domains:{...body().domains,MILITARY:25}};
 const store={getCheckpoint:key=>key==='article-ai-evaluation-r14'?{status:'PASS'}:key==='reference-flow-last-valid-r1'?previous:{sourceId:'existing',checkedAt:now}};
 const result=calculateStoredFlow(store,now,{collectionFailed:true});
 assert.equal(result.score,45);assert.equal(result.publishedAt,previous.publishedAt);assert.equal(result.status,'UPDATE_DELAYED');
});
