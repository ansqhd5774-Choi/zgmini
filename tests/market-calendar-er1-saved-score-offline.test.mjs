import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runER1SavedScore} from '../scripts/pc-writer/market-calendar-er1-saved-score.mjs';
import {validateER1PublicDisplay} from '../lib/market-calendar-er1-public-display.mjs';

const days=['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30'];

function fixture({count=838,extraEPSOnly=0,shareClassCollision=false}={}) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-er1-observed-only-'));
 const dayDir=path.join(root,'er1-input','days');
 fs.mkdirSync(dayDir,{recursive:true});
 const tickers=Array.from({length:count},(_,i)=>`T${i}`);
 if(shareClassCollision){tickers[count-2]='GOOG';tickers[count-1]='GOOGL';}
 const observations=tickers.map((symbol,i)=>({symbol,eps:1,revenue:i+1}));
 for(let i=0;i<extraEPSOnly;i++)
  observations.push({symbol:`X${i}`,eps:1,revenue:null});
 for(const day of days){
  const pre=day==='2026-10-30'?observations:[];
  // Invalid vendor row from the historical R3 pattern is excluded IN MEMORY.
  const after=day==='2026-10-27'?[{symbol:'BAD',eps:1,revenue:'bad'}]:[];
  fs.writeFileSync(path.join(dayDir,`${day}.json`),JSON.stringify({
   storedAt:'2026-11-02T01:00:00.000Z',body:{date:day,pre,after,notSupplied:[]},
  }));
 }
 const outputPath=path.join(root,'er1-input','er1-public-display.json');
 return {root,dayDir,outputPath,run:(opts={})=>runER1SavedScore({pcHome:root,
  expectedObservedSymbols:count,...opts}),cleanup:()=>fs.rmSync(root,{recursive:true,force:true})};
}

test('838 actual-observed fixture symbols are scored with NO roster/provider/DB/D1',()=>{
 const f=fixture();
 try{
  assert.equal(fs.existsSync(path.join(f.root,'er1-input','er1-approved-issuers.json')),false);
  const report=f.run();
  assert.equal(report.status,'READY_ER1_PC_DERIVED',report.reason);
  assert.equal(report.providerRequests,0);
  assert.equal(report.dbWrites,0);
  assert.equal(report.d1Writes,0);
  assert.equal(report.inputSymbols,838);
  assert.equal(report.symbolsWithBoth,838);
  assert.equal(report.scoreableIssuers,838);
  assert.equal(report.sourceDays,5);
  assert.equal(report.recoveredRows,1);
  const output=JSON.parse(fs.readFileSync(f.outputPath,'utf8'));
  assert.ok(validateER1PublicDisplay(output));
  assert.equal(output.recordCount,838);
  assert.equal(output.scores.length,838);
  assert.doesNotMatch(JSON.stringify(output),/"eps"|"revenue"|"releases"|"storedAt"/);
  assert.equal(f.run().reason,'ER1_PUBLIC_DISPLAY_ALREADY_EXISTS_STOP');
 }finally{f.cleanup()}
});

test('missing revenue keeps an observation unscored instead of pretending full population',()=>{
 const f=fixture({extraEPSOnly:37});
 try{
  const report=f.run();
  assert.equal(report.status,'READY_ER1_PC_DERIVED',report.reason);
  assert.equal(report.inputSymbols,875);
  assert.equal(report.symbolsWithBoth,838);
  assert.equal(report.scoreableIssuers,838);
  const output=JSON.parse(fs.readFileSync(f.outputPath,'utf8'));
  assert.equal(output.recordCount,838);
  assert.ok(!output.scores.some(s=>s.tickers.some(t=>t.startsWith('X'))));
  assert.equal(output.coverage.inputSymbols,875);
  assert.equal(output.coverage.scoreableIssuers,838);
  assert.ok(!Object.hasOwn(output.coverage,'expectedEligibleIssuers'));
 }finally{f.cleanup()}
});

test('source count drift blocks without writing public scores',()=>{
 const f=fixture();
 try{
  const report=f.run({expectedObservedSymbols:837});
  assert.equal(report.status,'BLOCKED');
  assert.equal(report.reason,'ER1_SAVED_SYMBOL_COUNT_MISMATCH_STOP');
  assert.equal(fs.existsSync(f.outputPath),false);
 }finally{f.cleanup()}
});

test('known separate share classes cannot be counted as two independent issuers',()=>{
 const f=fixture({shareClassCollision:true});
 try{
  const report=f.run();
  assert.equal(report.status,'BLOCKED');
  assert.equal(report.reason,'ER1_SHARE_CLASS_SPLIT');
  assert.equal(fs.existsSync(f.outputPath),false);
 }finally{f.cleanup()}
});

test('contradictory saved actuals block without creating an output',()=>{
 const f=fixture();
 try{
  const filename=path.join(f.dayDir,'2026-10-30.json');
  const saved=JSON.parse(fs.readFileSync(filename,'utf8'));
  saved.body.after.push({symbol:'T0',eps:-1,revenue:1});
  fs.writeFileSync(filename,JSON.stringify(saved));
  const report=f.run();
  assert.equal(report.reason,'ER1_CALENDAR_CONFLICTING_REPORT');
  assert.equal(fs.existsSync(f.outputPath),false);
 }finally{f.cleanup()}
});

test('missing saved day stops before scoring and preserves all inputs',()=>{
 const f=fixture();
 try{
  fs.renameSync(path.join(f.dayDir,'2026-10-29.json'),
   path.join(f.dayDir,'2026-10-29.backup.json'));
  const report=f.run();
  assert.equal(report.reason,'ER1_SAVED_SOURCE_DAY_MISSING_STOP');
  assert.equal(fs.existsSync(f.outputPath),false);
 }finally{f.cleanup()}
});
