import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateIranDailyAnchorShadow} from '../lib/iran-progress/daily-anchored-shadow-r5.mjs';

let serial=0;
const event=(date,rule,delta,type,{eventVerified=false,eventKey,sourceUrl}={})=>({
 accepted:true,date,rule,delta,type,eventVerified,
 eventKey:eventKey??'R5-FIXTURE-'+(++serial),
 sourceUrl:sourceUrl??'https://www.bbc.com/news/articles/r5-test-'+serial,
 claimVerification:eventVerified?'INDEPENDENTLY_VERIFIED':'SINGLE_SOURCE_REPORT'
});
const warning=d=>event(d,'MILITARY_WARNING',-2,'MILITARY');
const attack=d=>event(d,'MILITARY_ATTACK',-12,'MILITARY');
const interception=d=>event(d,'MILITARY_INTERCEPTION',-4,'MILITARY');
const options={collectionCheckedAt:Date.parse('2026-10-21T00:01:00Z'),collectionStatus:'COLLECTED'};
const at=(r,d)=>r.history.find(p=>p.date===d);
test('21 Oct provisional 13 anchors history backwards by the FOLLOWING date delta, no frozen 19',()=>{
 const events=[
  warning('2026-10-17'),warning('2026-10-18'),
  warning('2026-10-19'),warning('2026-10-19'),
  attack('2026-10-20'),interception('2026-10-20'),
 ];
 const r=calculateIranDailyAnchorShadow(events,{asOfDate:'2026-10-21',...options});
 assert.equal(r.productionReady,false);
 assert.equal(r.calibrated,false);
 assert.equal(r.score,13);
 assert.equal(r.history.length,14);
 assert.equal(r.history[0].date,'2026-10-08');
 assert.equal(r.history.at(-1).date,'2026-10-21');
 assert.equal(at(r,'2026-10-20').value,13);
 assert.equal(at(r,'2026-10-19').value,16.55);
 assert.equal(at(r,'2026-10-18').value,17.55);
 assert.equal(at(r,'2026-10-17').value,18.07);
 assert.equal(at(r,'2026-10-16').value,18.59);
 assert.equal(at(r,'2026-10-21').carried,true);
 assert.equal(at(r,'2026-10-20').reportedEvents,2);
 assert.equal(at(r,'2026-10-20').verifiedEvents,0);
 assert.equal(r.anchorEvidenceStatus.includes('PROVISIONAL'),true);
});
test('22 Oct observed new military attack lowers score though R3 military domain was at floor zero',()=>{
 const r=calculateIranDailyAnchorShadow([attack('2026-10-22')],{asOfDate:'2026-10-22',...options});
 assert.equal(r.score,10.78);
 assert.equal(at(r,'2026-10-21').value,13);
 assert.equal(at(r,'2026-10-22').carried,false);
 assert.equal(r.finalDay.negative,-2.4);
});
test('day with no saved change carries the last model state but never asserts no combat',()=>{
 const r=calculateIranDailyAnchorShadow([],{asOfDate:'2026-10-23',collectionStatus:'DISCOVERY_DELAYED'});
 assert.equal(r.score,13);
 assert.equal(at(r,'2026-10-22').carried,true);
 assert.equal(r.newsCollection.status,'DISCOVERY_DELAYED');
 assert.equal(r.independentCurrentRealityVerified,false);
 assert.equal(r.limitations.includes('MISSING_REPORTS_ARE_NOT_PEACE'),true);
});
test('a same-day verified ceasefire headline cannot overwhelm a reported fresh attack',()=>{
 const e=[attack('2026-10-22'),event('2026-10-22','CEASEFIRE_IMPLEMENTED',15,'CEASEFIRE',{eventVerified:true})];
 const r=calculateIranDailyAnchorShadow(e,{asOfDate:'2026-10-22'});
 assert.equal(r.score,13);
 assert.equal(r.finalDay.adverseVeto,true);
 assert.equal(r.finalDay.net,0);
});
test('unverified positive diplomatic or ceasefire reporting cannot elevate the score',()=>{
 const e=[
  event('2026-10-22','TALKS_HELD',8,'DIPLOMACY'),
  event('2026-10-22','CEASEFIRE_IMPLEMENTED',15,'CEASEFIRE'),
 ];
 const r=calculateIranDailyAnchorShadow(e,{asOfDate:'2026-10-22'});
 assert.equal(r.score,13);
 assert.ok(r.finalDay.unconfirmedPositive>0);
});
test('independently confirmed actual improvement may increase score if no adverse event',()=>{
 const r=calculateIranDailyAnchorShadow([
  event('2026-10-22','CEASEFIRE_IMPLEMENTED',15,'CEASEFIRE',{eventVerified:true}),
 ],{asOfDate:'2026-10-22'});
 assert.ok(r.score>13);
 assert.equal(r.finalDay.adverseVeto,false);
});
test('same event key from two headlines counts once; receipt mutations reject',()=>{
 const e=attack('2026-10-22');
 const duplicate={...e,sourceUrl:'https://www.aljazeera.com/news/2026/10/22/same-incident'};
 const r=calculateIranDailyAnchorShadow([e,duplicate],{asOfDate:'2026-10-22'});
 assert.equal(r.eventCount,1);
 assert.equal(r.score,10.78);
 assert.throws(()=>calculateIranDailyAnchorShadow([{...e,delta:12}],{asOfDate:'2026-10-22'}),/EVENT_CONTRACT/);
 assert.throws(()=>calculateIranDailyAnchorShadow([{...e,date:'2026-10-23'}],{asOfDate:'2026-10-22'}),/EVENT_CONTRACT/);
});
test('future dates and unapproved zero-bound anchor rejected',()=>{
 assert.throws(()=>calculateIranDailyAnchorShadow([],{asOfDate:'2026-10-20'}),/REFERENCE_OR_ASOF_INVALID/);
 assert.throws(()=>calculateIranDailyAnchorShadow([],{asOfDate:'2026-10-21',anchorScore:0}),/REFERENCE_OR_ASOF_INVALID/);
});
