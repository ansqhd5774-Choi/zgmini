import {test} from 'node:test';import assert from 'node:assert/strict';
import {buildReferenceFlowR2,classifyR2Article,IRAN_FLOW_R2_KEY} from '../lib/iran-progress/reference-flow-r2.mjs';
import {validateReferenceFlowR2} from '../lib/iran-progress/reference-public-r2.mjs';
import {resolveR2Events,calculateOperationalR2} from '../scripts/iran-progress/operate-r2.mjs';
import {publishReferenceFlowR2} from '../scripts/iran-progress/publication.mjs';
import {storedIranProgressResponse} from '../worker/iran-progress-public.mjs';import {iranView} from '../lib/iran-progress/view.mjs';
const now=Date.UTC(2026,9,15,12),event=title=>classifyR2Article({title,date:'2026-10-14',sourceUrl:'https://www.tasnimnews.ir/en/news/2026/10/14/123/iran-news'});
const body=()=>{const {ledger,...b}=buildReferenceFlowR2([event('Iran launched missiles at US base')],{asOfDate:'2026-10-15'});return {...b,publishedAt:now,collectionCheckedAt:now,events:ledger,newsCollection:{status:'UPDATED'}};};
test('R2 public route and view use raw 1x and never consume R1 amplification',async()=>{
 const b=body();assert.equal(validateReferenceFlowR2(b,now),true);
 const db={prepare:()=>({bind:key=>({first:async()=>key===IRAN_FLOW_R2_KEY?{body:JSON.stringify(b),stored_at:now}:null})})};
 const response=await storedIranProgressResponse(new Request('https://example.test'),{db,now});assert.equal(response.status,200);assert.equal(response.headers.get('x-iran-flow-version'),'R2');
 const v=iranView(await response.json(),now);assert.equal(v.score,47.6);assert.equal(v.rawScore,47.6);assert.equal(v.methodVersion,'R2');
 for(const patch of [{displaySensitivity:3.5},{score:20},{collectionCheckedAt:now+1},{history:[{date:'2026-02-30',value:47.6,delta:-2.4}]}])assert.equal(validateReferenceFlowR2({...b,...patch},now),false);
});
test('invalid R2 fails closed; stale R2 is delayed rather than silently switching to R1',async()=>{
 for(const b of [{...body(),score:20},{...body(),collectionCheckedAt:now-2*86400000}]){
  const db={prepare:()=>({bind:key=>({first:async()=>key===IRAN_FLOW_R2_KEY?{body:JSON.stringify(b)}:null})})};
  const response=await storedIranProgressResponse(new Request('https://example.test'),{db,now});const data=await response.json();
  if(b.score===20){assert.equal(response.status,503);assert.equal(data.score,null);}else{assert.equal(data.status,'UPDATE_DELAYED');assert.equal(data.score,47.6);}
 }
});
test('R2 publisher writes only separate key and requires exact readback after timeout',async()=>{
 let row,writes=0;const remote={query:async()=>({results:row?[row]:[]}),request:async(_,batch)=>{assert.equal(batch[0].params[0],IRAN_FLOW_R2_KEY);writes++;row={body:batch[0].params[1],stored_at:now};throw Error('timeout');}};
 assert.equal((await publishReferenceFlowR2(remote,'test',body(),{now})).status,'VERIFIED');assert.equal(writes,1);
 assert.equal((await publishReferenceFlowR2(remote,'test',body(),{now})).status,'UNCHANGED');assert.equal(writes,1);
});
test('possible duplicate headlines are held while explicitly different venues remain separate',()=>{
 const a=event('Iran held indirect talks with US in Doha'),b={...event('Iran held indirect talks with US in Muscat'),sourceUrl:'https://www.gov.uk/news/iran-talks'};
 assert.equal(resolveR2Events([a,b]).accepted.length,2);
 const c={...a,sourceUrl:'https://www.gov.uk/news/iran-talks',evidence:a.evidence+' today',eventKey:'different'};
 const r=resolveR2Events([a,c]);assert.equal(r.accepted.length,1);assert.equal(r.held.length,1);
});
test('discovery failure preserves previous value and timestamp; missing input never invents 50',()=>{
 const old=body(),store={getCheckpoint:k=>k==='reference-flow-last-valid-r2'?old:null};
 const held=calculateOperationalR2(store,now+1000);assert.equal(held.score,old.score);assert.equal(held.collectionCheckedAt,old.collectionCheckedAt);assert.equal(held.status,'UPDATE_DELAYED');
 assert.throws(()=>calculateOperationalR2({getCheckpoint:()=>null},now),/NO_FRESH_DISCOVERY_OR_PREVIOUS/);
});
