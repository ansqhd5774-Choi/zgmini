import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {R29_HOOK,addR29ToVerifiedR15Runner,installR29}
 from '../scripts/iran-progress/news-display-install-hook-r29.mjs';
import {runR29PrivateNews,R29_STATUS_FILE}
 from '../scripts/iran-progress/news-display-auto-candidates-r29.mjs';
import {verifyIranOfflineBundleR28}
 from '../scripts/iran-progress/news-display-offline-bundle-r28.mjs';
import {withHistoricalR28Package} from './helpers/iran-r28-bundle.fixture.mjs';
import {IRAN_DISPLAY_FEEDS_R26} from '../scripts/iran-progress/news-display-source-registry-r26.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const now=Date.parse('2026-10-27T14:00:00Z');
const sha=value=>createHash('sha256').update(value).digest('hex');

function fixture(fn){
 const dir=mkdtempSync(path.join(tmpdir(),'iran-r29-autoconnect-'));
 return Promise.resolve().then(()=>{
  writeFileSync(path.join(dir,'iran.sqlite'),'preserve score ledger');
  writeFileSync(path.join(dir,'news-display-r1.json'),'preserve public news cache');
  return fn(dir);
 }).finally(()=>rmSync(dir,{recursive:true,force:true}));
}

test('R29 appends only a separate after-R15 private hook to verified R15 runner',()=>{
 const original=readFileSync(path.join(root,'scripts/iran-progress/run-reference-flow-r3.mjs'),'utf8');
 const modified=addR29ToVerifiedR15Runner(original);
 assert.ok(modified.includes(R29_HOOK));
 assert.equal(modified.replace(R29_HOOK,''),original);
 assert.ok(modified.indexOf('news-display-auto-run-r15.mjs')<
  modified.indexOf('news-display-auto-candidates-r29.mjs'));
 assert.ok(modified.indexOf('news-display-auto-candidates-r29.mjs')<
  modified.indexOf('if(r3!==0||r5!==0||original!==0)process.exitCode=1;'));
 assert.match(R29_HOOK,/IRAN_PRIVATE_NEWS_COLLECTION_FAILED_SCORE_UNAFFECTED/);
 assert.match(R29_HOOK,/try\{/);
 assert.match(R29_HOOK,/finally\{/);
 assert.throws(()=>addR29ToVerifiedR15Runner(modified),/R29_ACTIVE_R15_RUNNER_CHANGED/);
 assert.throws(()=>addR29ToVerifiedR15Runner(original.replace('--scheduled','--collect')),
  /R29_ACTIVE_R15_RUNNER_CHANGED/);
});

test('R29 already verified offline collection input has all seven pinned dependencies',()=>{
 withHistoricalR28Package(root,directory=>
  assert.equal(verifyIranOfflineBundleR28({directory}).verifiedModules,7));
});

test('R29 successful scheduled metadata collection records only private counts',async()=>{
 await fixture(async dir=>{
  const result=await runR29PrivateNews({dataDirectory:dir,now,
   collector:async options=>{
    assert.equal(options.dryRun,false);
    assert.equal(options.dataDirectory,dir);
    return {status:'PARTIAL_COLLECTION_REVIEW_REQUIRED',sourceCount:7,
     sourcesFailed:0,articleFailures:4,candidatesSaved:27,newCandidates:1,
     expiredCandidates:0,dryRun:false,written:true,rightsVerified:0,
     displayEligible:0,scoreLedgerModified:false,publicCacheModified:false,
     d1Written:false,schedulerModified:false,
     articleCoverage:{scope:'PRIVATE_30_DAY_CANDIDATES',requiredSources:7,
      sourcesVerifiedThisRun:4,sourcesWithRetainedCandidates:4,
      sourcesWithoutRetainedCandidates:['guardian-iran','dw-world','aljazeera'],
      allSourcesVerifiedThisRun:false,allSourcesHaveRetainedCandidates:false,
      bySource:IRAN_DISPLAY_FEEDS_R26.map(({id})=>({sourceId:id,
       verifiedThisRun:['guardian-iran','dw-world','aljazeera'].includes(id)?0:1,
       retained30DayCandidates:['guardian-iran','dw-world','aljazeera'].includes(id)?0:1}))}};
   }});
  assert.equal(result.status,'PRIVATE_COLLECTION_PARTIAL');
  assert.equal(result.candidatesSaved,27);
  assert.equal(result.articleFailures,4);
  assert.equal(result.articleCoverage.sourcesVerifiedThisRun,4);
  assert.deepEqual(result.articleCoverage.sourcesWithoutRetainedCandidates,
   ['guardian-iran','dw-world','aljazeera']);
  const status=JSON.parse(readFileSync(path.join(dir,R29_STATUS_FILE),'utf8'));
  assert.deepEqual(status,result);
  assert.equal(readFileSync(path.join(dir,'iran.sqlite'),'utf8'),'preserve score ledger');
  assert.equal(readFileSync(path.join(dir,'news-display-r1.json'),'utf8'),
   'preserve public news cache');
  assert.equal(existsSync(path.join(dir,'news-display-candidates-r26.json')),false);
 });
});

test('R29 rejects an unverified seven-source coverage claim before recording success',async()=>{
 await fixture(async dir=>{
  const result=await runR29PrivateNews({dataDirectory:dir,now,
   collector:async()=>({status:'COLLECTION_REVIEW_READY',sourceCount:7,
    sourcesFailed:0,articleFailures:0,candidatesSaved:27,newCandidates:0,
    expiredCandidates:0,dryRun:false,written:true,rightsVerified:0,
    displayEligible:0,scoreLedgerModified:false,publicCacheModified:false,
    d1Written:false,schedulerModified:false,
    articleCoverage:{scope:'PRIVATE_30_DAY_CANDIDATES',requiredSources:7,
     sourcesVerifiedThisRun:4,sourcesWithRetainedCandidates:4,
     sourcesWithoutRetainedCandidates:[],allSourcesVerifiedThisRun:true,
     allSourcesHaveRetainedCandidates:true,bySource:IRAN_DISPLAY_FEEDS_R26.map(({id})=>
      ({sourceId:id,verifiedThisRun:1,retained30DayCandidates:1}))}})});
  assert.equal(result.status,'PRIVATE_COLLECTION_FAILED_CANDIDATES_PRESERVED');
  assert.equal(result.reason,'R29_COLLECTION_RESULT_INVALID');
 });
});

test('R29 publisher total outage records a failure without deleting the candidate cache',async()=>{
 await fixture(async dir=>{
  const stored=JSON.stringify({version:'IRAN_NEWS_COLLECTION_R26',items:[{id:'preserved'}]});
  writeFileSync(path.join(dir,'news-display-candidates-r26.json'),stored);
  const result=await runR29PrivateNews({dataDirectory:dir,now,
   collector:async()=>{throw Error('R26_ALL_FEEDS_FAILED_PRESERVE_CACHE');}});
  assert.equal(result.status,'PRIVATE_COLLECTION_FAILED_CANDIDATES_PRESERVED');
  assert.equal(result.reason,'R26_ALL_FEEDS_FAILED_PRESERVE_CACHE');
  assert.equal(readFileSync(path.join(dir,'news-display-candidates-r26.json'),'utf8'),stored);
 });
});

test('R29 refuses a claim of successful collection when rights or D1 flags drift',async()=>{
 await fixture(async dir=>{
  const result=await runR29PrivateNews({dataDirectory:dir,now,
   collector:async()=>({status:'COLLECTION_REVIEW_READY',sourceCount:7,
    sourcesFailed:0,articleFailures:0,candidatesSaved:1,newCandidates:1,
    expiredCandidates:0,dryRun:false,written:true,rightsVerified:1,
    displayEligible:1,scoreLedgerModified:false,publicCacheModified:false,
    d1Written:true,schedulerModified:false})});
  assert.equal(result.status,'PRIVATE_COLLECTION_FAILED_CANDIDATES_PRESERVED');
  assert.equal(result.reason,'R29_COLLECTION_RESULT_INVALID');
  assert.equal(readFileSync(path.join(dir,'iran.sqlite'),'utf8'),'preserve score ledger');
 });
});

test('R29 installation is rejected until explicitly approved, before any file reads',()=>{
 const prior=process.env.ZGMINI_IRAN_NEWS_R29_INSTALL_APPROVED;
 delete process.env.ZGMINI_IRAN_NEWS_R29_INSTALL_APPROVED;
 try{assert.throws(()=>installR29({bundleRoot:'/does-not-exist'}),
  /R29_EXPLICIT_INSTALL_APPROVAL_REQUIRED/);}
 finally{if(prior===undefined)delete process.env.ZGMINI_IRAN_NEWS_R29_INSTALL_APPROVED;
  else process.env.ZGMINI_IRAN_NEWS_R29_INSTALL_APPROVED=prior;}
});

test('R29 CMD is portable ASCII CRLF and cannot download code or alter scheduler',()=>{
 const bytes=readFileSync(path.join(root,'IRAN_NEWS_R29_AUTO_CONNECT.cmd'));
 assert.ok(bytes.every(byte=>byte<128));
 const source=bytes.toString('ascii');
 assert.equal(source.replace(/\r\n/g,'').includes('\n'),false);
 assert.match(source,/--preflight/);
 assert.match(source,/--install/);
 assert.match(source,/ZGMINI_IRAN_NEWS_R29_INSTALL_APPROVED=YES/);
 assert.match(source,/IRAN_NEWS_R29_AUTO_CONNECT_RESULT\.txt/);
 assert.doesNotMatch(source,/\bcurl\b|raw\.githubusercontent\.com|PowerShell|Invoke-WebRequest|\/Create|\/Change|wrangler/i);
 assert.notEqual(sha(bytes),sha(readFileSync(path.join(root,'IRAN_NEWS_R28_OFFLINE_APPLY.cmd'))));
});
