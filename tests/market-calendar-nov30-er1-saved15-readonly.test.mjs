import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectSavedNovemberBatch20} from '../scripts/pc-writer/market-calendar-nov30-er1-saved15-readonly.mjs';
import {scoreER1Issuers} from '../lib/market-calendar-er1-earnings-score.mjs';
import {makeER1PublicDisplay} from '../lib/market-calendar-er1-public-display.mjs';

const CANDIDATES=Array.from({length:20},(_,i)=>'B'+String(i+1).padStart(2,'0'));
const EVENTS=CANDIDATES.map((ticker,i)=>({date:'2026-11-'+
 String(i+6).padStart(2,'0'),ticker}));
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-er1-saved15-'));
 fs.mkdirSync(path.join(root,'er1-input','nov30-er1-probe'),{recursive:true});
 fs.mkdirSync(path.join(root,'er1-input','nov30-er1-batch20'),{recursive:true});
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 return root;
}
function writeCache(root,symbol,folder){
 const index=Number(symbol.slice(1));
 const rows=['2026-10-20','2026-07-20','2026-04-20','2026-01-20']
  .map((date,k)=>({symbol,date,eps:1.2+index/10,
   revenue:10000000+index*1000000-k*100000}));
 fs.writeFileSync(path.join(root,'er1-input',folder,symbol+'.json'),
  JSON.stringify({storedAt:'2026-11-04T20:50:00Z',body:rows}),{flag:'wx'});
}
test('15 cached after #369: real read-only ER1 score, five missing, no API/write',async t=>{
 const root=fixture(t);let calls=0;
 for(const symbol of CANDIDATES.slice(0,15))
  writeCache(root,symbol,Number(symbol.slice(1))<=3?'nov30-er1-probe':'nov30-er1-batch20');
 const report=await inspectSavedNovemberBatch20({
  pcHome:root,requireWindows:false,asOf:'2026-11-04',
  calendarLoader:async()=>{calls++;return EVENTS},
  scorer:scoreER1Issuers,serializer:makeER1PublicDisplay
 });
 assert.equal(report.status,'PASS',report.code);
 assert.equal(report.selectedSymbols,20);
 assert.equal(report.cachedObservedSymbols,15);
 assert.equal(report.missingActualSymbols,5);
 assert.equal(report.firstMissingSymbol,'B16');
 assert.equal(report.firstMissingScheduledDate,'2026-11-21');
 assert.equal(report.scoreableIssuers,15);
 assert.equal(report.highestScore,98);
 assert.equal(report.star3Count,1);
 assert.equal(report.providerCalls,0);
 assert.equal(report.localWrites,0);
 assert.equal(report.d1Writes,0);
 assert.equal(calls,1);
 assert.match(report.privatePreviewSha256,/^[0-9a-f]{64}$/);
 assert.ok(!fs.existsSync(path.join(root,'er1-input','nov30-er1-batch20-derived')));
});
test('fixed PIT asOf 2026-11-04 does not permit silent time shift',async t=>{
 const root=fixture(t);
 const report=await inspectSavedNovemberBatch20({pcHome:root,
  asOf:'2026-11-05',requireWindows:false,
  calendarLoader:async()=>EVENTS});
 assert.equal(report.code,'NOV30_SAVED15_AS_OF_DRIFT_STOP');
 assert.equal(report.providerCalls,0);
 assert.equal(report.d1Writes,0);
});
