import test from 'node:test';import assert from 'node:assert/strict';
import {IRAN_FACTS_KEY,IRAN_FACTS_VERSION,QATAR_TALKS_URL,visibleIranFacts} from '../lib/iran-progress/facts.mjs';
import {storedIranProgressResponse} from '../worker/iran-progress-public.mjs';
import {iranView} from '../lib/iran-progress/view.mjs';
import {buildOfficialFacts} from '../scripts/iran-progress/facts-r15.mjs';
import {hash} from '../scripts/iran-progress/store.mjs';
import {qatarHistoricalAssertion} from '../scripts/iran-progress/qatar-observation-input-r14.mjs';
const now=Date.parse('2026-10-09T08:00:00Z');
function storeFixture(){
 const excerpt='talks are ongoing, messages are being exchanged between Washington and Tehran, and Qatar is acting as a mediator between the parties';
 const r={version:'IRAN_OFFICIAL_DIPLOMACY_OBSERVATION_R14',sourceUrl:QATAR_TALKS_URL,sourceClass:'OFFICIAL_MEDIATOR',publicationDate:'2026-10-06',eventDate:'2026-10-06',axis:'IRN_USA',excerpt,excerptHash:hash(excerpt),bodyHash:'a'.repeat(64),mediatorReportedTalksOngoing:true,mutualEndAgreementVerified:false,implementationVerified:false};
 const id='official-diplomacy-observation:'+hash(r),a=qatarHistoricalAssertion(r,id,now),aid='input-assertion:'+hash(a);
 const rows=new Map([[id,r],[aid,a]]),p={'relations.IRN_USA':{assertionId:aid,valueHash:a.valueHash}};
 return {rows,getCheckpoint:()=>p,db:{prepare:()=>({get:id=>rows.has(id)?{body:JSON.stringify(rows.get(id))}:null})}};
}
const db=body=>({prepare:()=>({bind:key=>({first:async()=>key===IRAN_FACTS_KEY?{body:JSON.stringify(body),stored_at:now}:null})})});
test('linked official historical evidence displays without promoting AI or current-state score',async()=>{
 const facts=buildOfficialFacts(storeFixture(),now);
 const response=await storedIranProgressResponse(new Request('https://example.test'),{db:db(facts),now});
 assert.equal(response.status,200);const data=await response.json(),view=iranView(data,now);
 assert.equal(data.status,'PENDING');assert.equal(view.score,null);assert.equal(view.facts.length,1);
 assert.equal(view.relations,null);assert.equal(view.currentStateVerified,false);assert.equal(view.facts[0].observationDate,'2026-10-06');
 assert.equal(view.facts[0].excerpt,undefined);
});
test('tampered evidence cannot be published as verified fact',()=>{const s=storeFixture();const receipt=[...s.rows.values()][0];receipt.mutualEndAgreementVerified=true;assert.throws(()=>buildOfficialFacts(s,now),/MISMATCH/);});
test('14-day window uses observation date, not repeated publication date',()=>{const body=buildOfficialFacts(storeFixture(),now);assert.equal(visibleIranFacts({...body,publishedAt:now+30*86400000},now+30*86400000).length,0);});
test('failed stored fact reads remain 503, not a successful empty timeline',async()=>{const d={prepare:()=>({bind:key=>({first:async()=>{if(key===IRAN_FACTS_KEY)throw Error('db');return null;}})})};const r=await storedIranProgressResponse(new Request('https://example.test'),{db:d,now});assert.equal(r.status,503);assert.equal((await r.json()).reason,'STORED_FACTS_READ_FAILED');});
test('AI-like or forged summaries cannot pass the public facts contract',()=>{const body=buildOfficialFacts(storeFixture(),now);body.facts[0].summary='종전 확인';assert.equal(visibleIranFacts(body,now).length,0);});
test('future verification and duplicate observations rejected',()=>{const b=buildOfficialFacts(storeFixture(),now);b.facts.push(b.facts[0]);assert.equal(visibleIranFacts(b,now).length,0);b.facts.pop();b.facts[0].verifiedAt=now+1;assert.equal(visibleIranFacts(b,now).length,0);});
