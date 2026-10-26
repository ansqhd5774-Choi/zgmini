import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditDatedAumEvidence,compareDatedAumBasket} from
 '../scripts/pc-writer/theme-space-satellite-r23-aum-shadow.mjs';

const dir=path.dirname(fileURLToPath(import.meta.url));
const actual=JSON.parse(fs.readFileSync(path.resolve(dir,
 '../scripts/pc-writer/theme-space-satellite-r23-dated-aum-evidence.json'),'utf8'));
const one=(symbol,score=50,aumUsd=100)=>({symbol,score,aumUsd,
 aumAsOf:'2026-10-22',issuerUrl:'https://issuer.example/etf'});

test('R23 official dated four-ETF sensitivity is explicitly private',()=>{
 const r=auditDatedAumEvidence(actual);
 assert.equal(r.candidateCount,4);
 assert.equal(r.eligibleCount,4);
 assert.equal(r.totalAumUsd,1602954146.3);
 assert.equal(r.privateAumScenarioScore,44.65075);
 assert.equal(r.scoreDelta,-0.16067);
 assert.deepEqual(r.weightsPercent,{
  UFO:29.1083,NASA:59.3,WARP:2.3332,ROKT:9.2585});
 assert.equal(r.evidenceMixedDates,true);
 assert.equal(r.maximumEvidenceLagDays,1);
 assert.equal(r.threePlusEtfWeightingApproved,false);
 assert.equal(r.publicationAuthorized,false);
 assert.equal(r.collectionRetries,0);
 assert.equal(r.providerCalls,0);
 assert.equal(r.rawFilesWritten,0);
 assert.equal(r.publicWrites,0);
 assert.equal(r.d1Writes,0);
 assert.equal(r.schedulerWrites,0);
});

test('R23 is count-unlimited with deterministic linear normalization',()=>{
 const rows=Array.from({length:100},(_,i)=>one(`E${i}`,i%100,i+1));
 const r=compareDatedAumBasket({scoreAsOf:'2026-10-23',rows});
 assert.equal(r.candidateCount,100);
 assert.equal(r.eligibleCount,100);
 assert.equal(r.totalAumUsd,5050);
 assert.equal(Object.keys(r.weightsPercent).length,100);
 assert.equal(r.collectionRetries,0);
 assert.ok(r.privateAumScenarioScore>0);
});

test('R23 missing AUM or real individual score is excluded, never zero-filled or retried',()=>{
 const r=compareDatedAumBasket({scoreAsOf:'2026-10-23',rows:[
  one('UFO',20,100),{...one('NASA',50,50),aumUsd:null},
  {...one('ARKX',80,50),score:null},one('ROKT',80,300)]});
 assert.equal(r.eligibleCount,2);
 assert.equal(r.privateAumScenarioScore,65);
 assert.deepEqual(r.excluded,[
  {symbol:'NASA',reason:'OFFICIAL_AUM_UNAVAILABLE_NO_RETRY'},
  {symbol:'ARKX',reason:'NO_REAL_CURRENT_INDIVIDUAL_SCORE'}]);
 assert.equal(r.collectionRetries,0);
});

test('R23 cannot fabricate a one-ETF basket or look ahead to future issuer AUM',()=>{
 const r=compareDatedAumBasket({scoreAsOf:'2026-10-23',rows:[
  one('UFO',50,100),{...one('NASA',60,200),aumUsd:null}]});
 assert.equal(r.privateAumScenarioScore,null);
 assert.equal(r.weightsPercent,null);
 assert.throws(()=>compareDatedAumBasket({scoreAsOf:'2026-10-23',rows:[
  one('UFO'),{...one('NASA'),aumAsOf:'2026-10-24'}]}),
  /R23_FUTURE_AUM_LOOKAHEAD/);
});

test('R23 detects duplicate, invalid and future-dated/bad evidence',()=>{
 const options={scoreAsOf:'2026-10-23',rows:[one('UFO'),one('NASA')]};
 assert.throws(()=>compareDatedAumBasket({...options,
  rows:[one('UFO'),one('UFO')]}),/R23_TICKER_INVALID_OR_DUPLICATE/);
 assert.throws(()=>compareDatedAumBasket({...options,
  rows:[one('UFO'),{...one('NASA'),aumUsd:0}]}),/R23_AUM_INVALID/);
 assert.throws(()=>compareDatedAumBasket({...options,
  rows:[one('UFO'),{...one('NASA'),score:NaN}]}),
  /R23_INDIVIDUAL_SCORE_INVALID/);
 assert.throws(()=>auditDatedAumEvidence({...actual,
  sourceManifestSha256:'unknown'}),/R23_PREVIOUS_PC_PROVENANCE_MISSING/);
 assert.throws(()=>auditDatedAumEvidence({...actual,
  sourceManifestSha256:'a'.repeat(64)}),/R23_R21_PC_PROVENANCE_CHANGED/);
});
