import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {openStore,hash} from '../scripts/iran-progress/store.mjs';import {recordEventReview} from '../scripts/iran-progress/event-review-r14.mjs';
import {military} from '../lib/iran-progress/r13.mjs';
const now=Date.parse('2026-10-09T00:00:00Z');
const facts={eventAt:now-86400000,axis:'IRN_USA',hormuz:true,actorVerified:true,connectionVerified:true,attackConfirmed:true,scaleVerified:true,severityFacts:{vesselLoss:true}};
const doc=id=>({id,sourceUrl:'https://example.test/'+id,text:'Two vessels were lost.',textHash:hash('Two vessels were lost.'),status:'COLLECTED',independentRoot:id,sourceClass:'REPORTER_PRIMARY',termsApproved:true,verificationOrigin:'FIXED_RULE',assertionStatus:'VERIFIED',verifiedAt:now,parserVersion:'FIXTURE',verifiedFacts:facts});
const review=()=>({proposal:{eventId:'IRAN:TEST',material:true,facts,evidence:[{sourceId:'a',quote:'Two vessels were lost.'},{sourceId:'b',quote:'Two vessels were lost.'}]},documents:[doc('a'),doc('b')],holds:[]});
function run(fn){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iran-event-'));const s=openStore(path.join(dir,'db.sqlite'));try{fn(s);}finally{s.close();fs.rmSync(dir,{recursive:true,force:true});}}
test('review cannot self-assert trusted facts, pending revisions persist and replay reuses receipt',()=>run(s=>{
 const a=recordEventReview(s,review(),now),b=recordEventReview(s,review(),now+100);
 assert.equal(a.status,'PENDING_REVIEW');assert.equal(b.status,'UNCHANGED');assert.equal(s.events().length,1);
 assert.equal(a.event.eventAt,null);assert.equal(a.event.severity,null);
 assert.equal(military({events:s.events(),asOf:now}).score,null);
}));
test('trusted immutable assertions retain existing verification gate',()=>run(s=>{
 for(const d of review().documents)s.putSource('fact-assertion:'+d.id,d,now);
 const a=recordEventReview(s,review(),now);assert.equal(a.status,'VERIFIED');assert.equal(a.event.severity,10);
}));
test('material conflicts prohibit verified write even with trusted assertions',()=>run(s=>{
 const r=review();for(const d of r.documents)s.putSource('fact-assertion:'+d.id,d,now);r.holds=['ATTRIBUTION_CONFLICT'];
 assert.throws(()=>recordEventReview(s,r,now),/UNRESOLVED_HOLDS/);assert.equal(s.events().length,0);
}));
test('pending material event blocks otherwise complete observation coverage',()=>run(s=>{
 const r=review();r.holds=['ATTRIBUTION_CONFLICT'];recordEventReview(s,r,now);
 const coverage=Object.fromEntries(['IRN_ISR','IRN_USA','LINKED'].map(axis=>[axis,{status:'VERIFIED',parserOk:true,classificationOk:true,materialPending:0,requiredSources:[{status:'VERIFIED',termsApproved:true}],knownGaps:[],coverageFrom:now-28*86400000,coverageThrough:now,lastVerifiedAt:now}]));
 const out=military({events:s.events(),coverage,asOf:now});assert.equal(out.axes.IRN_USA.status,'PENDING');assert.equal(out.score,null);
}));
