import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {inspectR31} from '../scripts/iran-progress/news-display-cycle-verify-r31.mjs';

const now=Date.parse('2026-10-28T03:10:00Z');
function fixture(fn){
 const dir=mkdtempSync(path.join(tmpdir(),'r31-test-'));
 try{
  const at=Date.parse('2026-10-28T03:05:00Z');
  const cache={version:'IRAN_NEWS_COLLECTION_R26',updatedAt:at,items:[{id:'a'.repeat(64),
   rightsVerified:false,displayEligible:false}]};
  const status={version:'IRAN_NEWS_PRIVATE_AUTO_R29',status:'PRIVATE_COLLECTION_PARTIAL',
   completedAtKst:'2026-10-28 12:05:00',sourceCount:7,sourcesFailed:0,
   articleFailures:4,candidatesSaved:1,newCandidates:0,expiredCandidates:0,
   rightsVerified:0,displayEligible:0,scoreLedgerModified:false,
   publicCacheModified:false,d1Written:false,schedulerModified:false,
   translationModified:false};
  const set=(name,value)=>writeFileSync(path.join(dir,name),JSON.stringify(value));
  set('news-display-candidates-r26.json',cache);
  set('news-display-candidates-auto-r29-status.json',status);
  return fn({dir,cache,status,set});
 }finally{rmSync(dir,{recursive:true,force:true});}
}

test('R31 reads one partial news cycle and never promotes it to two-cycle proof',()=>fixture(({dir})=>{
 const r=inspectR31({dataDirectory:dir,now,taskObserved:true});
 assert.equal(r.phase,'R31_SINGLE_CYCLE_OBSERVED');
 assert.equal(r.observationCycleKst,'2026-10-28 12');
 assert.equal(r.candidatesSaved,1);
 assert.equal(r.articleFailures,4);
 assert.equal(r.rightsUnverified,true);
 assert.equal(r.automaticScheduleTwoCyclesVerified,false);
 assert.equal(r.operationalFilesWritten,false);
 assert.equal(r.collectionExecuted,false);
 assert.ok(readFileSync(path.join(dir,'news-display-candidates-r26.json')).length>0);
}));

test('R31 fails closed for stale, missing task, public-writing or failed collection',()=>fixture(({dir,status,set})=>{
 assert.equal(inspectR31({dataDirectory:dir,now,taskObserved:false}).phase,'R31_CYCLE_NOT_VERIFIED');
 assert.equal(inspectR31({dataDirectory:dir,now:now+10*3600000}).phase,'R31_CYCLE_NOT_VERIFIED');
 set('news-display-candidates-auto-r29-status.json',{...status,d1Written:true});
 assert.equal(inspectR31({dataDirectory:dir,now}).phase,'R31_CYCLE_NOT_VERIFIED');
 set('news-display-candidates-auto-r29-status.json',{...status,status:'PRIVATE_COLLECTION_FAILED_CANDIDATES_PRESERVED'});
 assert.equal(inspectR31({dataDirectory:dir,now}).phase,'R31_CYCLE_NOT_VERIFIED');
}));

test('R31 rejects candidate rights drift despite safe status summary',()=>fixture(({dir,cache,set})=>{
 set('news-display-candidates-r26.json',{...cache,items:[{...cache.items[0],displayEligible:true}]});
 const observed=inspectR31({dataDirectory:dir,now});
 assert.equal(observed.phase,'R31_CYCLE_NOT_VERIFIED');
 assert.equal(observed.rightsUnverified,false);
}));

test('R31 CMD is offline ASCII CRLF and never invokes scheduler jobs',()=>{
 const filename=path.resolve(import.meta.dirname,'..','IRAN_NEWS_R31_CYCLE_READONLY.cmd');
 const bytes=readFileSync(filename);
 assert.ok(bytes.every(byte=>byte<128));
 const text=bytes.toString('ascii');
 assert.equal(text.replace(/\r\n/g,'').includes('\n'),false);
 assert.match(text,/news-display-cycle-verify-r31\.mjs/);
 assert.doesNotMatch(text,/schtasks|\bcurl\b|PowerShell|Invoke-WebRequest|--scheduled|--collect|\/Run|\/Create|\/Change/i);
});
