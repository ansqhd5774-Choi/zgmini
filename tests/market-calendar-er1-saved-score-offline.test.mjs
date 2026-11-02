import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runER1SavedScore} from '../scripts/pc-writer/market-calendar-er1-saved-score.mjs';
import {validateER1PublicDisplay} from '../lib/market-calendar-er1-public-display.mjs';

const days=['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30'];
const asOf='2026-11-02';

function fixture(count=838,approved=true,expectedEligibleIssuers=count){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-er1-offline-'));
 const data=path.join(root,'er1-input'),daysDir=path.join(data,'days');
 fs.mkdirSync(daysDir,{recursive:true});
 const members=Array.from({length:count},(_,i)=>({
  issuerId:`T${i}`,tickers:[`T${i}`],earningsSymbol:`T${i}`,eligible:true,
 }));
 for(const day of days){
  const rows=day==='2026-10-30'?members.map((member,i)=>({
   symbol:member.earningsSymbol,eps:1,revenue:i+1,
  })):[];
  // One malformed row from the real R3 pattern must be quarantined in memory.
  if(day==='2026-10-27')rows.push({symbol:'BAD',eps:1,revenue:'bad-number'});
  const saved={storedAt:'2026-11-02T01:00:00.000Z',
   body:{date:day,pre:rows,after:[],notSupplied:[]}};
  fs.writeFileSync(path.join(daysDir,day+'.json'),JSON.stringify(saved));
 }
 const rosterPath=path.join(data,'er1-approved-issuers.json');
 if(approved)fs.writeFileSync(rosterPath,JSON.stringify({
  version:1,method:'ER1_INDEPENDENTLY_APPROVED_ELIGIBLE_ISSUERS_R1',
  asOf,universeReviewed:true,approvalReference:'UNIT_TEST_ONLY_NO_REAL_APPROVAL',
  expectedEligibleIssuers,members,
 }));
 const outputPath=path.join(data,'er1-public-display.json');
 return {root,rosterPath,outputPath,run:(extra={})=>runER1SavedScore({
  pcHome:root,asOf,expectedObservedSymbols:count,...extra}),
  cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}

test('without an independently approved issuer roster the 838 stored symbols are NOT graded',()=>{
 const f=fixture(838,false);
 try{
  const report=f.run();
  assert.equal(report.status,'BLOCKED');
  assert.equal(report.reason,'ER1_APPROVED_ROSTER_FILE_MISSING_STOP');
  assert.equal(report.providerRequests,0);
  assert.equal(report.d1Writes,0);
  assert.equal(report.outputCreated,false);
  assert.equal(fs.existsSync(f.outputPath),false);
 }finally{f.cleanup()}
});

test('838 simulated already-saved EPS+revenue symbols yield compact ER1 grades with no new API calls',()=>{
 const f=fixture();
 try{
  const report=f.run();
  assert.equal(report.status,'READY_ER1_PC_DERIVED');
  assert.equal(report.providerRequests,0);
  assert.equal(report.dbWrites,0);
  assert.equal(report.d1Writes,0);
  assert.equal(report.sourceDays,5);
  assert.equal(report.recoveredRows,1);
  assert.equal(report.symbolsWithBoth,838);
  assert.equal(report.scoreableIssuers,838);
  assert.equal(report.star3Count,42);
  const compact=JSON.parse(fs.readFileSync(f.outputPath,'utf8'));
  assert.ok(validateER1PublicDisplay(compact));
  assert.equal(compact.scores.length,838);
  assert.doesNotMatch(JSON.stringify(compact),/"eps"|"revenue"|"releases"|"storedAt"/);
  assert.equal(f.run().reason,'ER1_PUBLIC_DISPLAY_ALREADY_EXISTS_STOP');
 }finally{f.cleanup()}
});

test('838/2634 coverage cannot be represented as publicly ready or a 97-point ranking',()=>{
 const f=fixture(838,true,2634);
 try{
  const report=f.run();
  assert.equal(report.status,'BLOCKED');
  assert.equal(report.reason,'ER1_APPROVED_UNIVERSE_INCOMPLETE');
  assert.equal(report.symbolsWithBoth,838);
  assert.equal(report.outputCreated,false);
  assert.equal(fs.existsSync(f.outputPath),false);
 }finally{f.cleanup()}
});

test('mismatched source symbol count cannot silently publish a stale 838-grade file',()=>{
 const f=fixture(838);
 try{
  const report=f.run({expectedObservedSymbols:837});
  assert.equal(report.reason,'ER1_SAVED_SYMBOL_COUNT_MISMATCH_STOP');
  assert.equal(fs.existsSync(f.outputPath),false);
 }finally{f.cleanup()}
});
