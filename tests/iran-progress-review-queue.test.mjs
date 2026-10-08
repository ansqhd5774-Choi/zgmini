import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {buildReviewQueue,persistReviewQueue} from '../scripts/iran-progress/review-queue-r14.mjs';
import {openStore} from '../scripts/iran-progress/store.mjs';
const now=Date.parse('2026-10-09T00:00:00Z');
const c=(id,url='https://example.test/news')=>({id,source:'GDELT_2_EVENTS',sourceUrl:url,actor1:'IRAN',actor2:'UNITED STATES',actionCountry:'US',eventDateHint:'2026-10-08'});
test('same article rows group without claiming same event or independent evidence',()=>{
 const q=buildReviewQueue([c('a'),c('b'),c('c','https://copy.test/news')],now);
 assert.equal(q.articleGroups,2);assert.equal(q.repeatedArticleRows,1);assert.equal(q.attackCount,null);
 assert.equal(q.articles[0].duplicateChecked,false);assert.equal(q.articles[0].independentRoot,null);assert.equal(q.eventVerified,false);
 assert.deepEqual(q.articles[0].axisHints,['IRN_USA']);assert.equal(q.articles[0].eventAt,null);
});
test('geography and proxy URL hints stay pending; outside screen is not rejected',()=>{
 const q=buildReviewQueue([{...c('a'),actor1:'UNKNOWN',actor2:'UNKNOWN',actionCountry:'IR'},
 {...c('b','https://x.test/houthi'),actor1:'UNKNOWN',actor2:'UNKNOWN'},
 {...c('c'),actor1:'POLICE',actor2:'USA'}],now);
 assert.equal(q.includedCandidates,2);assert.equal(q.outsideScreenUnreviewed,1);
 assert.ok(q.articles.every(a=>a.status==='PENDING_REVIEW'&&a.axisHints.length===0));
});
test('query and protocol differences stay distinct while fragments group',()=>{
 const q=buildReviewQueue([c('a','https://x.test/n?a=1#x'),c('b','https://x.test/n?a=1#y'),c('c','https://x.test/n?a=2'),c('d','http://x.test/n?a=1')],now);
 assert.equal(q.articleGroups,3);assert.equal(q.repeatedArticleRows,1);
});
test('invalid or credential-bearing URLs never enter review queue',()=>{
 const q=buildReviewQueue([c('a','file:///tmp/a'),c('b','https://user:secret@x.test/n')],now);
 assert.equal(q.invalidUrls,2);assert.equal(q.articleGroups,0);
});
test('stored review receipt is repeatable and does not change verified input or candidates',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'iran-review-')),s=openStore(path.join(dir,'test.sqlite'));
 try{s.putCandidate(c('a'),now);s.checkpoint('verified-input',{status:'PENDING'});
 const first=persistReviewQueue(s,buildReviewQueue([c('a')],now));
 const second=persistReviewQueue(s,buildReviewQueue([c('a')],now+1));
 assert.equal(first.inputHash,second.inputHash);assert.equal(second.storageVerified,true);
 assert.equal(s.events().length,0);assert.deepEqual(s.getCheckpoint('verified-input'),{status:'PENDING'});
 assert.equal(s.candidates()[0].id,'a');assert.equal(s.db.prepare('SELECT count(*) AS n FROM decisions').get().n,1);
 }finally{s.close();fs.rmSync(dir,{recursive:true,force:true});}
});
