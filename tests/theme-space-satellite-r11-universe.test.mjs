import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyEtfDataAvailability} from '../scripts/pc-writer/theme-space-satellite-r11-universe.mjs';

const entry=(symbol,rest={})=>({symbol,spaceThemeEligible:true,catalogStatus:'UNKNOWN',auditStatus:'NOT_TESTED',...rest});
const scored=(symbol,n)=>entry(symbol,{catalogStatus:'LISTED',auditStatus:'SCORE_PASS',realCommonSessions:n,
 scoreStatus:n>=377?'R188_COMPATIBLE':'ADAPTIVE_PROVISIONAL'});

test('R11 universe never caps data-verified ETFs at two, three, five, or nine',()=>{
 for(const count of [0,1,2,3,4,5,9,10,25,100]){
  const candidates=Array.from({length:count},(_,i)=>scored(`ETF${String(i+1).padStart(3,'0')}`,40+i));
  const result=classifyEtfDataAvailability({candidates});
  assert.equal(result.candidateCount,count);
  assert.equal(result.privateScoringReady.length,count);
  assert.deepEqual(result.privateScoringReady,candidates.map(x=>x.symbol));
  assert.equal(result.finalBasketSelected,false);
  assert.equal(result.publicationAuthorized,false);
 }
});

test('R11 preserves all nine issuer ETFs; only UFO/NASA have R9 actual scoring evidence',()=>{
 const symbols=['UFO','NASA','WARP','ORBX','MARS','ARKX','ROKT','DIPR','WSPC'];
 const candidates=symbols.map(s=>s==='UFO'?scored('UFO',656):s==='NASA'?scored('NASA',144):entry(s));
 const result=classifyEtfDataAvailability({candidates});
 assert.deepEqual(result.privateScoringReady,['UFO','NASA']);
 assert.deepEqual(result.catalogCheckNeeded,symbols.slice(2));
 assert.deepEqual(result.records.map(x=>x.symbol),symbols);
});

test('R11 catalogue is a preflight, not proven full-date collection or public rights',()=>{
 const out=classifyEtfDataAvailability({candidates:[
  entry('WARP',{catalogStatus:'LISTED'}),
  entry('ORBX',{catalogStatus:'NOT_LISTED'}),
  entry('MARS',{catalogStatus:'LISTED',auditStatus:'RAW_PASS',realCommonSessions:39}),
  entry('ARKX',{catalogStatus:'LISTED',auditStatus:'RAW_PASS',realCommonSessions:500}),
  scored('UFO',656),
 ]});
 assert.deepEqual(out.privateScoringReady,['UFO']);
 assert.deepEqual(out.catalogListedNeedsRawAudit,['WARP']);
 assert.deepEqual(out.catalogNotListed,['ORBX']);
 assert.deepEqual(out.rawUnder40,['MARS']);
 assert.deepEqual(out.rawNeedsScoreAudit,['ARKX']);
});

test('R11 rejects false raw/score evidence and duplicates rather than inventing scores',()=>{
 assert.throws(()=>classifyEtfDataAvailability({candidates:[entry('UFO'),entry('UFO')]}),/DUPLICATE/);
 assert.throws(()=>classifyEtfDataAvailability({candidates:[entry('NASA',{auditStatus:'SCORE_PASS',realCommonSessions:29,scoreStatus:'ADAPTIVE_PROVISIONAL'})]}),/VERIFIED_R2/);
 assert.throws(()=>classifyEtfDataAvailability({candidates:[entry('NASA',{auditStatus:'RAW_PASS'})]}),/CONFLICT/);
 assert.throws(()=>classifyEtfDataAvailability({candidates:[entry('NASA',{auditStatus:'SCORE_PASS',realCommonSessions:144})]}),/VERIFIED_R2/);
 const historical=classifyEtfDataAvailability({candidates:[entry('NASA',{catalogStatus:'NOT_LISTED',auditStatus:'RAW_PASS',realCommonSessions:144})]});
 assert.deepEqual(historical.rawNeedsScoreAudit,['NASA']);
});
