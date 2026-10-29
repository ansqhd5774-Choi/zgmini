import test from 'node:test';
import assert from 'node:assert/strict';
import {publishedNewsWatchTick} from '../scripts/iran-progress/published-news-watch-r1.mjs';
import {classifyPublishedScoreArticle} from '../lib/iran-progress/published-event-r1.mjs';
const h='a'.repeat(64),next='b'.repeat(64);
const input=n=>({snapshotHash:h,selected:{items:Array.from({length:n},(_,i)=>({id:i}))}});
test('2 or 4 newly published articles trigger one verified calculation per changed snapshot',async()=>{
 for(const n of [2,4]){
  let calls=0;const options={read:async()=>input(n),runScore:async()=>{calls++;return {status:'PASS',publication:'D1_AND_API_VERIFIED',scoreNewsInput:{status:'PUBLISHED_NEWS_SYNCED',snapshotHash:h},score:10,events:n};}};
  const first=await publishedNewsWatchTick(null,options);assert.equal(first.status,'HANDLED');assert.equal(calls,1);
  const again=await publishedNewsWatchTick(first.state,options);assert.equal(again.status,'UNCHANGED');assert.equal(calls,1);
 }
});
test('failed writes and empty responses never mark news handled; a later successful retry can run',async()=>{
 const state={lastHandledHash:next};
 await assert.rejects(publishedNewsWatchTick(state,{read:async()=>input(2),runScore:async()=>({status:'FAILED'})}),/NOT_VERIFIED/);
 await assert.rejects(publishedNewsWatchTick(state,{read:async()=>input(0),runScore:async()=>{throw Error('MUST_NOT_RUN');}}),/INPUT_INVALID/);
 assert.equal(state.lastHandledHash,next);
});
test('news arriving during calculation uses the actually verified snapshot marker',async()=>{
 const result=await publishedNewsWatchTick(null,{read:async()=>input(2),runScore:async()=>({status:'PASS',publication:'D1_AND_API_VERIFIED',scoreNewsInput:{status:'PUBLISHED_NEWS_SYNCED',snapshotHash:next}})});
 assert.equal(result.state.lastHandledHash,next);
});
test('ongoing peace-plan work gets only existing willingness points, not implementation points',()=>{
 const base={date:'2026-10-28',sourceUrl:'https://www.theguardian.com/world/2026/oct/28/test',summary:''};
 const e=classifyPublishedScoreArticle({...base,title:'Gulf states working on multipart peace deal to avert renewal of US-Iran war'});
 assert.equal(e.accepted,true);assert.equal(e.rule,'DIALOGUE_WILLINGNESS');assert.equal(e.delta,2);assert.equal(e.eventVerified,false);
 for(const title of ['Gulf states could be working on a peace deal with Iran','Are Gulf states working on a peace deal with Iran?','Iran’s Foreign Ministry Urges Qatar to Uphold Requirements of Mediation'])assert.equal(classifyPublishedScoreArticle({...base,title}).accepted,false);
});
