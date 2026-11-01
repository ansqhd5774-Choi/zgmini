import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {buildBiotechConfirmedContinuationR6,saveBiotechConfirmedContinuationR6} from '../scripts/pc-writer/theme-biotech-continuation-r6.mjs';
import {loadVerifiedShadowR5,runBiotechR6} from '../scripts/pc-writer/theme-biotech-continuation-r6-pc.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

function records(){
 const dates=Array.from({length:254},(_,i)=>new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10));
 const priorHistory=dates.slice(0,252).map((date,i)=>({date,score:Number((16+i*.01).toFixed(5))}));
 const prior={status:'READY',methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',etfs:['IBB','XBI'],
  sourceVersion:'BIOTECH_R1_SHA256_'+'a'.repeat(64),observationDate:dates[251],history:priorHistory};
 const shadowHistory=dates.slice(2,254).map((date,i)=>({date,score:Number((25+i*.07).toFixed(5))}));
 const shadow={status:'PRIVATE_SHADOW_COMPUTED_NOT_PUBLISHED',themeId:'biotech',
  revisionId:'BIOTECH_GMH_SHADOW_R5_valid',methodologyVersion:'ETF_ONLY_T40_R20_V40_PAIR50',
  sourceVersion:'GMH_MANIFEST_SHA256_'+'b'.repeat(64),scorerCodeSha256:'c'.repeat(64),
  sourceReceivedThrough:'2026-10-24T04:00:00Z',observationDate:dates[253],
  score:shadowHistory.at(-1).score,history:shadowHistory,
  priorComparison:{publicObservationDate:dates[251],comparedDates:252,changedDates:67,
   maximumDifference:2.35318,inputPriceRootCause:'ORIGINAL_R3_PRICES_UNAVAILABLE_NOT_INFERRED'},
  provisional:{points:[]},publicationAuthorized:false,publicWrites:0,d1Writes:0};
 return {dates,prior,shadow};
}

test('preserve all overlapping public scores and append only 2 verified GMH dates',()=>{
 const {dates,prior,shadow}=records(),before=JSON.stringify(prior);
 const r=buildBiotechConfirmedContinuationR6({prior,shadow});
 assert.equal(r.observationDate,dates[253]);assert.equal(r.history.length,252);
 assert.equal(r.reconciliation.existingOverlappingDatesPreserved,250);
 assert.equal(r.reconciliation.newConfirmedDates,2);
 assert.equal(r.reconciliation.previouslyObservedDriftDates,67);
 assert.deepEqual(r.history.slice(0,250),prior.history.slice(2));
 assert.deepEqual(r.history.slice(-2),shadow.history.slice(-2));
 assert.equal(JSON.stringify(prior),before);
 assert.equal(r.publicWrites,0);assert.equal(r.d1Writes,0);assert.equal(r.providerCalls,0);
});

test('R6 never invents missing dates or overwrites public history',()=>{
 const {prior,shadow}=records();
 shadow.history.splice(1,1);shadow.history.push({...shadow.history.at(-1),date:'2026-01-01'});
 shadow.observationDate='2026-01-01';shadow.score=shadow.history.at(-1).score;
 assert.throws(()=>buildBiotechConfirmedContinuationR6({prior,shadow}),/BIOTECH_R6_HISTORY_CALENDAR_MISMATCH/);
 const x=records();x.shadow.observationDate=x.prior.observationDate;
 assert.throws(()=>buildBiotechConfirmedContinuationR6({prior:x.prior,shadow:x.shadow}),/BIOTECH_R6_SHADOW_INVALID|BIOTECH_R6_NO_NEW_CONFIRMED_SESSION/);
});

test('R6 private result save is immutable and idempotent',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'biotech-r6-'));
 fs.mkdirSync(path.join(root,'themes','biotech'),{recursive:true});
 try{
  const r=buildBiotechConfirmedContinuationR6(records());
  const first=saveBiotechConfirmedContinuationR6(root,r);
  const second=saveBiotechConfirmedContinuationR6(root,r);
  assert.equal(first.status,'IMMUTABLE_SAVED');assert.equal(second.status,'EXISTING_IDENTICAL');
  assert.equal(first.sha256,second.sha256);
  assert.equal(fs.readdirSync(path.join(root,'themes','biotech','derived')).length,1);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('PC runner only reads verified R5 output and prior biotech record',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'biotech-r6-runner-'));
 const home=path.join(root,'themes','biotech'),derived=path.join(home,'derived');
 fs.mkdirSync(derived,{recursive:true});
 try{
  const manifest=Buffer.from('{"version":1,"themeId":"biotech","files":[]}');
  fs.writeFileSync(path.join(home,'raw-manifest.json'),manifest);
  const {prior,shadow}=records();
  shadow.sourceVersion='GMH_MANIFEST_SHA256_'+hash(manifest);
  shadow.scorerCodeSha256=hash(fs.readFileSync(new URL('../scripts/pc-writer/theme-optional-score-r188.mjs',import.meta.url)));
  const bytes=Buffer.from(JSON.stringify(shadow));const digest=hash(bytes);
  const filename='biotech-shadow-r5-'+digest.slice(0,16)+'.json';
  fs.writeFileSync(path.join(derived,filename),bytes);
  const loaded=loadVerifiedShadowR5(root);assert.deepEqual(loaded,shadow);
  let reads=0;const result=await runBiotechR6({dataRoot:root,readPrior:async()=>{reads++;return prior;},save:true});
  assert.equal(reads,1);assert.equal(result.reconciliation.newConfirmedDates,2);
  assert.equal(result.saved.status,'IMMUTABLE_SAVED');
  assert.equal(result.publicWrites,0);assert.equal(result.providerCalls,0);
  fs.appendFileSync(path.join(derived,filename),'CORRUPTION');
  assert.throws(()=>loadVerifiedShadowR5(root),/BIOTECH_R6_SHADOW_SHA_MISMATCH/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
