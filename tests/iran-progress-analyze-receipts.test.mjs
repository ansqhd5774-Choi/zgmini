import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openStore,hash} from '../scripts/iran-progress/store.mjs';
import {analyzeReceipts} from '../scripts/iran-progress/analyze-receipts-r14.mjs';
test('stored excerpt analysis is pending only and reuses immutable model/prompt identity',async()=>{
 const store=openStore(':memory:'),text='Indirect talks are underway.';
 try{store.putSource('test',{excerpt:text,excerptHash:hash(text)},1);
 let calls=0;const fetcher=async(url,options)=>{calls++;assert.equal(JSON.parse(options.body).format.required[0],'candidates');return {ok:true,json:async()=>({response:JSON.stringify({candidates:[{quote:text,eventAt:null,actors:[],type:'TALKS'}]})})};};
 const args={store,sourceIds:['test'],model:'test',modelDigest:'digest',fetcher};
 const r=await analyzeReceipts(args);assert.equal(r.reports[0].storageVerified,true);
 assert.equal(r.scoreInputVerified,false);assert.equal(store.events().length,0);assert.equal(store.getCheckpoint('verified-input'),null);
 assert.equal((await analyzeReceipts(args)).reports[0].status,'UNCHANGED');assert.equal(calls,1);
 const d=JSON.parse(store.db.prepare('SELECT body FROM decisions').get().body);assert.equal(d.sourceLevel,'EXCERPT_ONLY');assert.equal(d.candidates[0].verified,false);
 }finally{store.close();}
});
test('tampered excerpt rejected before model; invented quote not stored',async()=>{
 const store=openStore(':memory:');try{
 store.putSource('bad',{excerpt:'Actual source words',excerptHash:'wrong'},1);
 await assert.rejects(analyzeReceipts({store,sourceIds:['bad'],model:'test',modelDigest:'digest',fetcher:()=>assert.fail('unexpected model call')}),/EXCERPT_INVALID/);
 const text='Actual source words';store.putSource('good',{excerpt:text,excerptHash:hash(text)},1);
 const r=await analyzeReceipts({store,sourceIds:['good'],model:'test',modelDigest:'digest',fetcher:async()=>({ok:true,json:async()=>({response:JSON.stringify({candidates:[{quote:'Invented peace agreement',eventAt:null,actors:[],type:'PEACE'}]})})})});
 assert.equal(r.reports[0].status,'PENDING');assert.equal(store.db.prepare('SELECT count(*) n FROM decisions').get().n,0);
 }finally{store.close();}
});
