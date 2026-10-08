import test from 'node:test';import assert from 'node:assert/strict';
import {iranView} from '../lib/iran-progress/view.mjs';import {IRAN_PROGRESS_VERSION} from '../lib/iran-progress/r13.mjs';
const now=Date.parse('2026-10-09T01:00:00Z');
const ready=()=>({version:IRAN_PROGRESS_VERSION,status:'READY',score:0,domains:{D:0,C:0,M:0,H:0,N:0},historyMode:'AS_PUBLISHED',history:[{at:now,value:0}],observationAt:now,lastVerifiedAt:now,calculatedAt:now,publishedAt:now,relations:{IRN_ISR:'ACTIVE',IRN_USA:'ACTIVE'},overallEnded:false});
test('real zero is displayed, not treated as missing',()=>{assert.equal(iranView(ready(),now).score,0);});
test('pending or transport failure never leaks fabricated score or history',()=>{assert.equal(iranView({status:'PENDING',score:90,history:[{value:90}]},now).score,null);assert.equal(iranView(null,now).message,'자료 확인 불가');});
test('old observations marked stale and expired observations hidden',()=>{const r=ready();r.observationAt=now-2*86400000;assert.equal(iranView(r,now).status,'STALE');r.observationAt=now-4*86400000;assert.equal(iranView(r,now).score,null);});
test('invalid version, forged score and future publication cannot display READY',()=>{for(const patch of [{version:'old'},{score:99},{publishedAt:now+1}])assert.equal(iranView({...ready(),...patch},now).score,null);});
