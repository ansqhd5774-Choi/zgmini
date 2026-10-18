import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openStore} from '../scripts/iran-progress/store.mjs';
import {analyzeCandidateBatch} from '../scripts/iran-progress/candidate-batch.mjs';
import {PROMPT_VERSION,CANDIDATE_SCHEMA,interpretSource} from '../scripts/iran-progress/ai.mjs';

const now=Date.parse('2026-10-18T03:00:00Z');
function fixture(n){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-iran-ai-batch-'));
 const store=openStore(path.join(directory,'test.sqlite'));
 for(let i=0;i<n;i++)store.putCandidate({id:'candidate-'+String(i).padStart(3,'0'),title:'Iran talks article number '+i,url:'https://example.org/story/'+i},now);
 return {store,directory,close(){store.close();fs.rmSync(directory,{recursive:true,force:true});}};
}
const interpreted=async (title,{modelDigest})=>({status:'CANDIDATE_ONLY',candidates:[{quote:title,eventAt:null,actors:[],type:'UNVERIFIED',status:'PENDING_REVIEW',verified:false}],modelDigest,promptVersion:PROMPT_VERSION,interpretedAt:now});

test('50 saved articles are processed 20+20+10 without silently discarding backlog',async()=>{
 const x=fixture(50);
 try{
  const a=await analyzeCandidateBatch(x.store,{modelDigest:'fixture-digest',now,processor:interpreted});
  const b=await analyzeCandidateBatch(x.store,{modelDigest:'fixture-digest',now,processor:interpreted});
  const c=await analyzeCandidateBatch(x.store,{modelDigest:'fixture-digest',now,processor:interpreted});
  assert.deepEqual([a.processed,b.processed,c.processed],[20,20,10]);
  assert.deepEqual([a.remaining,b.remaining,c.remaining],[30,10,0]);
  assert.equal(c.status,'CANDIDATE_ONLY');
  assert.equal(x.store.db.prepare("SELECT COUNT(*) AS n FROM discovery_candidates WHERE state='REVIEW_PENDING'").get().n,50);
  assert.equal(x.store.db.prepare('SELECT COUNT(*) AS n FROM decisions').get().n,50);
 }finally{x.close();}
});
test('failed model call preserves pending candidate and continues healthy articles',async()=>{
 const x=fixture(5);let calls=0;
 try{
  const r=await analyzeCandidateBatch(x.store,{modelDigest:'fixture-digest',now,processor:async (...args)=>{
   if(++calls===3)throw Error('TEST_MODEL_DOWN');
   return interpreted(...args);
  }});
  assert.equal(r.processed,4);
  assert.equal(r.failed,1);
  assert.equal(r.attempted,5);
  assert.equal(r.remaining,1);
  assert.equal(r.status,'ANALYSIS_PARTIAL_FAILED');
  assert.equal(r.failedByReason.OLLAMA_TRANSPORT_OR_PARSE_FAILED,1);
  const resumed=await analyzeCandidateBatch(x.store,{modelDigest:'fixture-digest',now,processor:interpreted});
  assert.equal(resumed.processed,1);
  assert.equal(resumed.remaining,0);
 }finally{x.close();}
});
test('persisted unfinished decision resumes without a second model call',async()=>{
 const x=fixture(1);
 try{
  const id='candidate-000',key='discovery:'+id+':fixture-digest:'+PROMPT_VERSION;
  x.store.putDecision(key,{status:'CANDIDATE_ONLY',candidates:[],modelDigest:'fixture-digest'},now);
  const r=await analyzeCandidateBatch(x.store,{modelDigest:'fixture-digest',now,processor:async()=>{throw Error('SHOULD_NOT_CALL');}});
  assert.equal(r.existingDecisions,1);
  assert.equal(r.processed,1);
  assert.equal(r.failed,0);
  assert.equal(x.store.db.prepare('SELECT COUNT(*) AS n FROM decisions').get().n,1);
 }finally{x.close();}
});
test('unavailable Ollama model does not consume the queue or fabricate verified events',async()=>{
 const x=fixture(4);
 try{
  const r=await analyzeCandidateBatch(x.store,{modelDigest:null,now,processor:interpreted});
  assert.equal(r.processed,0);
  assert.equal(r.remaining,4);
  assert.equal(r.factVerification,'NOT_PERFORMED');
  assert.equal(x.store.db.prepare('SELECT COUNT(*) AS n FROM decisions').get().n,0);
 }finally{x.close();}
});

test('Ollama interpretation uses the structured schema but never auto-verifies events',async()=>{
 const text='Officials held mediation talks in Muscat.';
 const result=await interpretSource(text,{modelDigest:'fixture-digest',now,fetcher:async (url,init)=>{
  assert.equal(url,'http://127.0.0.1:11434/api/generate');
  const body=JSON.parse(init.body);
  assert.deepEqual(body.format,CANDIDATE_SCHEMA);
  assert.equal(body.options.temperature,0);
  return {ok:true,json:async()=>({response:JSON.stringify({candidates:[{quote:text,eventAt:null,actors:['Iran'],type:'DIPLOMACY'}]})})};
 }});
 assert.equal(result.status,'CANDIDATE_ONLY');
 assert.equal(result.candidates[0].verified,false);
 assert.equal(result.candidates[0].status,'PENDING_REVIEW');
});

test('one permanently failing article does not starve 49 healthy articles over repeated runs',async()=>{
 const x=fixture(50),seen=new Set();
 try{
  const process=async title=>{
   if(title==='Iran talks article number 0')throw Error('FIXTURE_BAD_ARTICLE');
   seen.add(title);
   return interpreted(title,{modelDigest:'fixture-digest'});
  };
  const stats=[];
  for(let i=0;i<3;i++)stats.push(await analyzeCandidateBatch(x.store,{modelDigest:'fixture-digest',now,processor:process}));
  assert.ok(stats.some(x=>x.failed>0));
  assert.equal(stats.reduce((n,r)=>n+r.attempted,0),51);
  assert.equal(stats.reduce((n,r)=>n+r.processed,0),49);
  assert.equal(x.store.db.prepare("SELECT COUNT(*) AS n FROM discovery_candidates WHERE state='DISCOVERED'").get().n,1);
  assert.equal(seen.size,49);
  assert.equal(x.store.getCheckpoint('ollama-candidate-batch-cursor-v1').promptVersion,PROMPT_VERSION);
 }finally{x.close();}
});
test('durable cursor survives reopening SQLite and resumes remaining candidate IDs without duplication',async()=>{
 const x=fixture(24);
 try{
  const a=await analyzeCandidateBatch(x.store,{modelDigest:'fixture-digest',now,processor:interpreted});
  assert.equal(a.processed,20);
  const cursor=x.store.getCheckpoint('ollama-candidate-batch-cursor-v1');
  x.store.close();
  const reopened=openStore(path.join(x.directory,'test.sqlite'));
  try{
   assert.deepEqual(reopened.getCheckpoint('ollama-candidate-batch-cursor-v1'),cursor);
   const b=await analyzeCandidateBatch(reopened,{modelDigest:'fixture-digest',now,processor:interpreted});
   assert.equal(b.processed,4);
   assert.equal(b.remaining,0);
  }finally{reopened.close();}
 }finally{fs.rmSync(x.directory,{recursive:true,force:true});}
});
