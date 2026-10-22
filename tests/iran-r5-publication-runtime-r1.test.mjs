import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore,hash} from '../scripts/iran-progress/store.mjs';
import {calculateOperationalR5} from '../scripts/iran-progress/operate-r5.mjs';
import {R3_FEEDS} from '../scripts/iran-progress/continuous-news-r3.mjs';
import {CLASSIFIER_VERSION,classifyR3Article} from '../lib/iran-progress/reference-flow-r3.mjs';
import {IRAN_R5_PUBLIC_KEY,validateIranR5Public} from '../lib/iran-progress/daily-public-r5.mjs';
import {publishIranR5Provisional} from '../scripts/iran-progress/publication.mjs';
import {publishArrowState,ARROW_KEYS} from '../scripts/pc-writer/score-arrow-publication.mjs';
import {storedIranProgressResponse} from '../worker/iran-progress-public.mjs';
import {iranView} from '../lib/iran-progress/view.mjs';
import {independentlyCorroboratedR5Positives} from '../lib/iran-progress/verified-positive-r5.mjs';

const now=Date.parse('2026-10-21T01:00:00Z');
const feedState=()=>R3_FEEDS.map(({id})=>({id,status:'COLLECTED',checkedAt:now-1000}));
const source={sourceUrl:'https://www.bbc.com/news/articles/r5-fixture-shabwa',
 date:'2026-10-20',title:'Houthi attack kills 58 at Yemen government training camp',summary:''};
const checkpoint={classifierVersion:CLASSIFIER_VERSION,
 status:'UPDATED',feeds:feedState(),lastDiscoverySuccessAt:now-1000};

test('same-PC R3_4 receipts -> independent R5 K21 provisional model, 14 KST points, no raw content in D1 body',()=>{
 const store=openStore(':memory:');
 try{
  store.putSource('news-metadata:'+hash(source),source,Date.parse('2026-10-20T18:00:00Z'));
  store.checkpoint('continuous-news-last-run-r3',checkpoint);
  const {body,shadow}=calculateOperationalR5(store,{now});
  assert.equal(body.version,'IRAN_DAILY_PROVISIONAL_R5_1');
  assert.equal(body.score,13);
  assert.equal(body.history.length,14);
  assert.equal(body.asOfDate,'2026-10-21');
  assert.equal(body.classifierVersion,CLASSIFIER_VERSION);
  assert.equal(body.sensitivityScale,21);
  assert.equal(body.acceptedEventCount,1);
  assert.equal(body.history[0].date,'2026-10-08');
  assert.equal(body.history.at(-1).date,'2026-10-21');
  assert.equal(shadow.productionReady,false);
  assert.equal(body.calibrated,false);
  assert.equal(validateIranR5Public(body,now),true);
  assert.equal('sourceUrl' in body,false);
  assert.equal('events' in body,false);
  const view=iranView(body,now);
  assert.equal(view.dailyAnchorEstimate,true);
  assert.equal(view.methodVersion,'R5');
  assert.equal(view.score,13);
  assert.equal(view.chartHistory.length,14);
  assert.equal(view.chartHistory.at(-1).carried,true);
  assert.equal(validateIranR5Public({...body,score:19},now),false);
  assert.equal(validateIranR5Public({...body,history:body.history.slice(1)},now),false);
  assert.equal(validateIranR5Public({...body,classifierVersion:'IRAN_EVENT_RULES_R3_3'},now),false);
 }finally{store.close();}
});
test('R5 source gate rejects stale R3_3, missing feed, and collector failure before D1 write',()=>{
 const store=openStore(':memory:');
 try{
  store.putSource('news-metadata:'+hash(source),source,Date.parse('2026-10-20T18:00:00Z'));
  store.checkpoint('continuous-news-last-run-r3',{...checkpoint,classifierVersion:'IRAN_EVENT_RULES_R3_3'});
  assert.throws(()=>calculateOperationalR5(store,{now}),/R5_SOURCE_COLLECTION_UNREADY/);
  store.checkpoint('continuous-news-last-run-r3',{...checkpoint,feeds:feedState().slice(1)});
  assert.throws(()=>calculateOperationalR5(store,{now}),/R5_SOURCE_COLLECTION_UNREADY/);
  store.checkpoint('continuous-news-last-run-r3',{...checkpoint,lastDiscoverySuccessAt:now-86400001});
  assert.throws(()=>calculateOperationalR5(store,{now}),/R5_SOURCE_COLLECTION_UNREADY/);
 }finally{store.close();}
});
test('R5 D1 readback and public worker prefer stored R5, fall back safely when corrupt',async()=>{
 const store=openStore(':memory:'),rows=new Map();
 const remote={
  async query(db,sql,[key]){return {results:rows.has(key)?[rows.get(key)]:[]};},
  async request(db,statements){for(const statement of statements){
   const [key,body,storedAt]=statement.params;
   rows.set(key,{body,stored_at:storedAt});
  }},
 };
 try{
  store.putSource('news-metadata:'+hash(source),source,Date.parse('2026-10-20T18:00:00Z'));
  store.checkpoint('continuous-news-last-run-r3',checkpoint);
  const {body}=calculateOperationalR5(store,{now});
  const result=await publishIranR5Provisional(remote,'core',body,{now});
  assert.equal(result.status,'VERIFIED');
  assert.equal(result.scoreArrowStatus,'VERIFIED');
  const arrow=()=>JSON.parse(rows.get(ARROW_KEYS.iran).body).entries['iran:r5'];
  assert.equal(arrow().value,13);assert.equal(arrow().changedAt,null);
  const db={prepare(sql){return {bind(key){return {async first(){return rows.get(key)??null;}};}};}};
  const response=await storedIranProgressResponse(new Request('https://zgmini.kr/api/iran-progress'),{db,now});
  assert.equal(response.status,200);
  assert.equal(response.headers.get('x-iran-flow-version'),'R5');
  assert.equal((await response.json()).score,13);
  const moved={...body,publishedAt:now+2000,score:12.1,history:body.history.map((p,i)=>i===13?{...p,value:12.1}:p)};
  await publishIranR5Provisional(remote,'core',moved,{now:now+2000});
  assert.equal(arrow().value,12.1);assert.equal(arrow().previousValue,13);assert.equal(arrow().changedAt,now+2000);
  await publishArrowState(remote,'core','iran',{iran:{score:35.5,sourceAt:now+3000,method:'IRAN_REFERENCE_FLOW_R3'}},now+3000);
  assert.equal(arrow().value,12.1);assert.equal(arrow().changedAt,now+2000);
  await publishIranR5Provisional(remote,'core',moved,{now:now+4000});
  assert.equal(arrow().changedAt,now+2000);
  const failedArrow={...remote,async request(db,statements){if(statements[0].params[0]===ARROW_KEYS.iran)throw Error('ARROW_FIXTURE_FAILURE');return remote.request(db,statements);}};
  const deferred=await publishIranR5Provisional(failedArrow,'core',{...moved,publishedAt:now+5000},{now:now+5000});
  assert.equal(deferred.status,'VERIFIED');assert.equal(deferred.scoreArrowStatus,'DEFERRED');
  rows.set(IRAN_R5_PUBLIC_KEY,{body:JSON.stringify({...body,score:19}),stored_at:now});
  const fallback=await storedIranProgressResponse(new Request('https://zgmini.kr/api/iran-progress'),{db,now});
  assert.notEqual(fallback.headers.get('x-iran-flow-version'),'R5');
 }finally{store.close();}
});
test('positive recovery requires approved official+independent corroboration, simple peace talk never enough',()=>{
 const official=classifyR3Article({sourceUrl:'https://news.un.org/en/story/2026/10/official-ceasefire-fixture',
  title:'Iran and Israel ceasefire entered into force',summary:'',date:'2026-10-22'});
 const independent=classifyR3Article({sourceUrl:'https://www.bbc.com/news/articles/independent-ceasefire-fixture',
  title:'Iran and Israel ceasefire entered into force',summary:'',date:'2026-10-22'});
 assert.equal(official.rule,'CEASEFIRE_IMPLEMENTED');
 assert.equal(independent.rule,'CEASEFIRE_IMPLEMENTED');
 const one=independentlyCorroboratedR5Positives([independent],[independent]);
 assert.equal(one[0].eventVerified,false);
 const paired=independentlyCorroboratedR5Positives([independent],[independent,official]);
 assert.equal(paired[0].eventVerified,true);
 assert.equal(paired[0].verificationSourceCount,2);
});
