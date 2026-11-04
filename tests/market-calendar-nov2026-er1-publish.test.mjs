import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {ER1_METHOD,ER1_STAR3_THRESHOLD} from '../lib/market-calendar-er1-earnings-score.mjs';
import {NOV_ER1_FULL_MAX_PUBLIC_BYTES,verifyNovemberER1FullPublish,
 runNovemberER1FullPublish} from
 '../scripts/pc-writer/market-calendar-nov30-er1-score-publish.mjs';

const sha256=x=>createHash('sha256').update(x).digest('hex');
const now=Date.parse('2026-11-05T01:00:00Z');
const cohort=['ABC','DEF','GHI'];
function sample({symbols=cohort,scores=[{issuerId:'ABC',tickers:['ABC'],score:98},
 {issuerId:'DEF',tickers:['DEF'],score:65}],asOf='2026-11-04'}={}){
 const snapshot={status:'READY_ER1_PUBLIC',method:ER1_METHOD,asOf,
  threshold:ER1_STAR3_THRESHOLD,coverage:{inputSymbols:symbols.length,
   observedIssuers:symbols.length,scoreableIssuers:scores.length,
   unscoreableReasons: symbols.length===scores.length?{}:
    {ER1_RELEASE_HISTORY_INSUFFICIENT:symbols.length-scores.length}},
  recordCount:scores.length,star3Count:scores.filter(s=>s.score>=97).length,
  scores};
 const body=JSON.stringify(snapshot);
 const manifest={schema:'ZGMINI_NOV30_ER1_FULL_PRIVATE_V1',status:'PASS',
  pilotOnly:true,asOf,selectedSymbols:symbols.length,scoreableIssuers:scores.length,
  missingActualSymbols:0,isolatedSymbols:0,rejectedActualRows:0,
  localScoreSha256:sha256(body),candidateSetSha256:sha256(JSON.stringify(symbols)),
  sourceStoredAt:'2026-11-04T20:00:00Z',completedAt:'2026-11-04T20:05:00Z'};
 return {body,manifest,calendarSymbols:symbols,now};
}

test('full-only November manifest checks calendar candidate hash, local digest, valid ER1 score',()=>{
 const checked=verifyNovemberER1FullPublish(sample());
 assert.equal(checked.inputSymbols,3);
 assert.equal(checked.recordCount,2);
 assert.equal(checked.star3Count,1);
 assert.equal(checked.asOf,'2026-11-04');
 assert.equal(checked.sha256,sha256(sample().body));
 assert.equal(checked.body.includes('revenue'),false);
});

test('unscoreable actual histories are valid; incomplete or mismatched cohorts are not',()=>{
 assert.doesNotThrow(()=>verifyNovemberER1FullPublish(sample()));
 for(const mutation of [
  p=>{p.manifest.status='PARTIAL'},
  p=>{p.manifest.missingActualSymbols=1},
  p=>{p.manifest.isolatedSymbols=1},
  p=>{p.manifest.localScoreSha256='f'.repeat(64)},
  p=>{p.manifest.candidateSetSha256='f'.repeat(64)},
  p=>{p.manifest.selectedSymbols=20},
  p=>{p.manifest.scoreableIssuers=3},
  p=>{p.manifest.asOf='2026-11-03'},
 ]){
  const p=sample();mutation(p);
  assert.throws(()=>verifyNovemberER1FullPublish(p),/NOV30_ER1_FULL_PUBLISH_/);
 }
});

test('full November D1 snapshot accepts >100 KB but retains a 1 MB safety bound',()=>{
 const symbols=Array.from({length:1900},(_,i)=>'S'+String(i).padStart(5,'0'));
 const scores=symbols.map((ticker,i)=>({issuerId:ticker,tickers:[ticker],score:i%2?50:51}));
 const p=sample({symbols,scores});
 assert.ok(Buffer.byteLength(p.body,'utf8')>100000);
 assert.ok(Buffer.byteLength(p.body,'utf8')<NOV_ER1_FULL_MAX_PUBLIC_BYTES);
 const checked=verifyNovemberER1FullPublish(p);
 assert.equal(checked.recordCount,1900);
 const huge=sample();huge.body=' '.repeat(NOV_ER1_FULL_MAX_PUBLIC_BYTES+1);
 assert.throws(()=>verifyNovemberER1FullPublish(huge),/NOV30_ER1_FULL_PUBLISH_SIZE_STOP/);
});

test('publisher verifies full local manifest then performs one D1-only sync; partial never writes',async()=>{
 const pcHome=fs.mkdtempSync(path.join(os.tmpdir(),'nov-er1-publisher-fixture-'));
 try{
  const prepared=sample(),folder=path.join(pcHome,'er1-input','nov30-er1-full-derived');
  fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,'complete-manifest.json'),
   JSON.stringify(prepared.manifest,null,2)+'\n');
  fs.writeFileSync(path.join(folder,'current.json'),prepared.body);
  const source='a'.repeat(40),root=path.join(pcHome,'approved-source');
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(pcHome,'config.json'),JSON.stringify({
   source,collectionTarget:'pc',enabled:true,core:'private-test-d1-binding'}));
  const writes=[];
  const engine={
   async loadNovemberEvents(){return [{ticker:'ABC',date:'2026-11-05'}]},
   selectFutureNovemberSymbols(_events,asOf,limit){
    assert.equal(asOf,'2026-11-04');assert.equal(limit,null);return cohort;
   },
   async syncNovemberER1D1({remote,core,body,storedAt}){
    assert.equal(remote,'mock-remote');assert.equal(core,'private-test-d1-binding');
    assert.equal(body,prepared.body);assert.equal(storedAt,now);
    writes.push('D1-only');return {code:'NOV30_ER1_D1_VERIFIED',wrote:true};
   }
  };
  const options={pcHome,clock:()=>now,requireWindows:false,engine,
   resolveRoot:()=>root,head:()=>source,remoteFactory:async()=> 'mock-remote'};
  const passed=await runNovemberER1FullPublish(options);
  assert.equal(passed.status,'PASS');assert.equal(passed.d1Writes,1);
  assert.equal(passed.providerCalls,0);assert.equal(passed.coreWrites,0);
  assert.deepEqual(writes,['D1-only']);
  fs.writeFileSync(path.join(folder,'complete-manifest.json'),
   JSON.stringify({...prepared.manifest,status:'PARTIAL'}));
  const blocked=await runNovemberER1FullPublish(options);
  assert.equal(blocked.status,'BLOCKED');
  assert.match(blocked.code,/NOV30_ER1_FULL_PUBLISH_MANIFEST_STOP/);
  assert.deepEqual(writes,['D1-only']);
 }finally{fs.rmSync(pcHome,{recursive:true,force:true})}
});
