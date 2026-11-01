import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {rankR43Issuers,R43_METHOD} from '../lib/market-calendar-r43-issuer-rank.mjs';
import {R57_METHOD} from '../scripts/pc-writer/market-calendar-r57-r45-offline-r43.mjs';
import {auditR58R43Shadow,runR58ShadowAudit,R58_METHOD,
 R58_REFERENCE_METHOD,R58_REFERENCE_FILE} from '../scripts/pc-writer/market-calendar-r58-r43-shadow-audit.mjs';

const day='2026-10-21',now=Date.parse('2026-10-22T12:00:00Z');
const rows=Array.from({length:2634},(_,i)=>({ticker:`T${i}`,
 eligible:true,tradeDate:day,price:100+i/100,volume:50000+i*11,
 relativeVolume:1+i/10000,dailyChangePct:(i%20-10)/10,
 dividendYield:null,eps:null,epsGrowthPct:null}));
const score=rankR43Issuers(rows,{asOf:day});
const shadow={...score,method:R57_METHOD,scorer:R43_METHOD};
const ids=score.rankings.map(x=>x.issuerId);
const reference=(top132=ids.slice(0,132),top100=ids.slice(0,100),other={})=>({
 version:1,method:R58_REFERENCE_METHOD,userProvided:true,
 eligibilityReviewed:true,permissionForLocalComparison:true,
 referenceDate:day,top132,top100,...other,
});

test('R58 perfect historical comparison reports 132/132 with exact top100 and zero PC writes',()=>{
 const r=auditR58R43Shadow({shadow,reference:reference(),now});
 assert.equal(r.status,'READY_AUDIT');
 assert.equal(r.method,R58_METHOD);
 assert.equal(r.matches,132);
 assert.equal(r.agreementPct,100);
 assert.equal(r.top100InModelTop132,100);
 assert.equal(r.top100InModelTop100,100);
 assert.equal(r.outsideTop132,0);
 assert.equal(r.sourceGaps,0);
 assert.equal(r.modelOnly.length,0);
 assert.equal(r.watchlist.length,14);
 assert.equal(r.filesystemWrites,0);
 assert.equal(r.dbWrites,0);
 assert.equal(r.providerCalls,0);
 assert.equal(r.published,false);
});

test('R58 distinguishes score omissions from membership gaps without granting exceptions',()=>{
 const top132=[...ids.slice(0,100),...ids.slice(200,231),'MISS123'];
 const r=auditR58R43Shadow({shadow,reference:reference(top132),now});
 assert.equal(r.status,'READY_AUDIT');
 assert.equal(r.matches,100);
 assert.equal(r.agreementPct,75.8);
 assert.equal(r.top100InModelTop132,100);
 assert.equal(r.top100InModelTop100,100);
 assert.equal(r.outsideTop132,32);
 assert.equal(r.belowCutoff,31);
 assert.equal(r.sourceGaps,1);
 assert.equal(r.missingReference.find(x=>x.issuerId==='MISS123')?.category,
  'NOT_IN_REVIEWED_UNIVERSE');
 assert.equal(r.modelOnly.length,32);
 assert.equal(r.modelTopCount,132);
 assert.equal(r.published,false);
});

test('R58 resolves an issuer ID named differently from the reference by the verified ticker',()=>{
 const overridden={...shadow,rankings:shadow.rankings.map((row,i)=>
  i===0?{...row,issuerId:'ISSUER-0'}:row)};
 const r=auditR58R43Shadow({shadow:overridden,reference:reference(),now});
 assert.equal(r.status,'READY_AUDIT');
 assert.equal(r.matches,132);
 assert.equal(r.sourceGaps,0);
 assert.equal(r.modelOnly.length,0);
});

test('R58 refuses unreviewed, incomplete, duplicated and inconsistent 132/100 references',()=>{
 const bad=[
  [reference(ids.slice(0,131)), 'R58_REFERENCE_COUNT_INVALID'],
  [reference(ids.slice(0,131).concat(ids[0])), 'R58_REFERENCE_DUPLICATE_ISSUER'],
  [reference(ids.slice(0,132),ids.slice(100,200)), 'R58_TOP100_NOT_SUBSET_OF_TOP132'],
  [reference(undefined,undefined,{permissionForLocalComparison:false}), 'R58_REFERENCE_NOT_REVIEWED'],
  [reference(undefined,undefined,{referenceDate:'2026-10-30'}), 'R58_REFERENCE_DATE_AFTER_SHADOW'],
 ];
 for(const [input,expected] of bad){
  const r=auditR58R43Shadow({shadow,reference:input,now});
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.reason,expected);
  assert.equal(r.agreementPct,null);
 }
});

test('R58 rejects a stale R57 shadow before any 132/100 comparison',()=>{
 const r=auditR58R43Shadow({shadow,reference:reference(),now:Date.parse('2026-11-05T00:00:00Z')});
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.reason,'R58_R57_SHADOW_NOT_READY');
 assert.equal(r.filesystemWrites,0);
});

test('R58 PC wrapper never creates a file or invokes a collector when data is absent',()=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r58-'));
 try{
  const before=fs.readdirSync(base);
  const r=runR58ShadowAudit({base,now});
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.shadowReason,'R57_R45_SNAPSHOTS_NOT_PRESENT');
  assert.equal(r.filesystemWrites,0);
  assert.equal(fs.existsSync(path.join(base,R58_REFERENCE_FILE)),false);
  assert.deepEqual(fs.readdirSync(base),before);
 }finally{fs.rmSync(base,{recursive:true,force:true});}
});
