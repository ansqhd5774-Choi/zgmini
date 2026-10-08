import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {openStore,hash} from '../scripts/iran-progress/store.mjs';
import {linkVerifiedInputs} from '../scripts/iran-progress/verified-input-r14.mjs';
const now=Date.parse('2026-10-09T00:00:00Z');
function run(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iran-input-'));const s=openStore(path.join(dir,'db.sqlite'));try{fn(s);}finally{s.close();fs.rmSync(dir,{recursive:true,force:true});}}
function assertion(s,{target='relations.IRN_USA',at=now,value={verified:true,materialPending:false,diplomacyScore:20,lastVerifiedAt:at},alter={}}={}){
 const evidence={status:'COLLECTED',reference:'FIXTURE_ONLY'};s.putSource('fixture-evidence',evidence,now);
 const a={version:'IRAN_VERIFIED_INPUT_ASSERTION_R14',target,status:'VERIFIED',verificationOrigin:'FIXED_RULE',parserVersion:'FIXTURE',verifiedAt:at,
 value,valueHash:hash(value),evidence:[{sourceId:'fixture-evidence',bodyHash:hash(evidence)}],...alter};
 const id='input-assertion:'+hash(a);s.putSource(id,a,now);return id;
}
test('partial verified input links without inventing missing domains, replay is unchanged',()=>run(s=>{
 const id=assertion(s),a=linkVerifiedInputs(s,[id],now),b=linkVerifiedInputs(s,[id],now+1);
 assert.equal(a.status,'LINKED');assert.equal(b.status,'UNCHANGED');assert.equal(a.score,null);assert.equal(a.calculationStatus,'PENDING');
 assert.equal(s.getCheckpoint('verified-input').relations.IRN_USA.diplomacyScore,20);
 assert.equal(s.getCheckpoint('verified-input').relations.IRN_ISR,undefined);
 assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM publications').get().n,0);
 assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM decisions').get().n,1);
}));
test('inline assertions and absent ledger receipts cannot promote verification',()=>run(s=>{
 assert.throws(()=>linkVerifiedInputs(s,[{}],now),/IDS_INVALID/);
 assert.throws(()=>linkVerifiedInputs(s,['input-assertion:'+'0'.repeat(64)],now),/NOT_STORED/);
 assert.equal(s.getCheckpoint('verified-input'),null);
}));
test('AI origin and altered evidence fail transactionally',()=>run(s=>{
 const ai=assertion(s,{alter:{verificationOrigin:'OLLAMA'}});
 assert.throws(()=>linkVerifiedInputs(s,[ai],now),/ASSERTION_INVALID/);
 const bad=assertion(s,{alter:{evidence:[{sourceId:'fixture-evidence',bodyHash:'wrong'}]}});
 assert.throws(()=>linkVerifiedInputs(s,[bad],now),/EVIDENCE_MISMATCH/);
 assert.equal(s.getCheckpoint('verified-input'),null);
}));
test('older input cannot overwrite fresh state; same time conflicting state is rejected',()=>run(s=>{
 linkVerifiedInputs(s,[assertion(s)],now);
 assert.throws(()=>linkVerifiedInputs(s,[assertion(s,{at:now-1})],now),/STALE_OVERWRITE/);
 const changed={verified:true,materialPending:false,diplomacyScore:40,lastVerifiedAt:now};
 assert.throws(()=>linkVerifiedInputs(s,[assertion(s,{value:changed})],now),/SAME_TIME_CONFLICT/);
 assert.equal(s.getCheckpoint('verified-input').relations.IRN_USA.diplomacyScore,20);
}));
test('mixed batch rolls back and does not leak first valid relation',()=>run(s=>{
 const a=assertion(s),bad=assertion(s,{target:'nuclear',value:{verified:true,materialPending:false,score:51,lastVerifiedAt:now,evidenceThrough:now}});
 assert.throws(()=>linkVerifiedInputs(s,[a,bad],now),/NUCLEAR_INVALID/);
 assert.equal(s.getCheckpoint('verified-input'),null);assert.equal(s.db.prepare('SELECT COUNT(*) AS n FROM decisions').get().n,0);
}));
test('future dates and injected unrelated score fields cannot enter input',()=>run(s=>{
 assert.throws(()=>linkVerifiedInputs(s,[assertion(s,{at:now+1})],now),/ASSERTION_INVALID/);
 const value={verified:true,materialPending:false,diplomacyScore:20,lastVerifiedAt:now,score:100};
 assert.throws(()=>linkVerifiedInputs(s,[assertion(s,{value})],now),/FIELD_INVALID/);
}));
test('coverage with a known gap cannot be promoted and false zero is never generated',()=>run(s=>{
 const value={status:'VERIFIED',parserOk:true,classificationOk:true,materialPending:0,requiredSources:[{id:'ukmto',status:'VERIFIED',termsApproved:true}],
 knownGaps:['unobserved'],coverageFrom:now-28*86400000,coverageThrough:now,lastVerifiedAt:now};
 assert.throws(()=>linkVerifiedInputs(s,[assertion(s,{target:'hormuzCoverage',value})],now),/COVERAGE_INVALID/);
 assert.equal(s.getCheckpoint('verified-input'),null);
}));
