import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {QuotaLedger} from '../scripts/pc-writer/quota-ledger.mjs';
import {collectAlpacaIncremental} from '../scripts/pc-writer/alpaca-incremental.mjs';
import {runSectorProvisional} from '../scripts/pc-writer/sector-provisional-cycle.mjs';

function fixture(fn){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r10-sector-bridge-'));
 fs.writeFileSync(path.join(base,'providers.env'),'APCA_API_KEY_ID=MOCK_ONLY\nAPCA_API_SECRET_KEY=MOCK_ONLY\n');
 return Promise.resolve().then(()=>fn(base)).finally(()=>fs.rmSync(base,{recursive:true,force:true}));
}

function saturate(base){
 const ledger=new QuotaLedger(base,{mode:'observe'}),now=Date.now();
 for(let n=0;n<140;n++)ledger.beforeRequest('ALPACA',now);
}

function prepareR10(base){
 const dir=path.join(base,'asset-r10-alpaca');fs.mkdirSync(dir);
 fs.writeFileSync(path.join(dir,'group-01.json'),JSON.stringify([{ticker:'MOCK'}]));
 fs.writeFileSync(path.join(dir,'checkpoint.json'),JSON.stringify({end:'2026-10-25'}));
 return dir;
}

test('R10 preflight at shared 140 cap does not transmit or overwrite previous group raw',()=>fixture(async base=>{
 const dir=prepareR10(base),raw=path.join(dir,'incremental','2026-10-25-2026-11-01-group-01.json');
 fs.mkdirSync(path.dirname(raw));fs.writeFileSync(raw,'{"existing":"raw"}');
 saturate(base);let calls=0;
 const report=await collectAlpacaIncremental(base,{now:Date.parse('2026-11-02T18:00:00Z'),wait:async()=>{},fetchImpl:async()=>{calls++;throw Error('UNEXPECTED_NETWORK');}});
 assert.equal(report.status,'DEFERRED_QUOTA');
 assert.equal(report.errorCode,'ALPACA_SHARED_QUOTA_DEFERRED');
 assert.equal(report.runRequests,0);
 assert.equal(calls,0);
 assert.equal(fs.readFileSync(raw,'utf8'),'{"existing":"raw"}');
 assert.equal(fs.existsSync(path.join(dir,'incremental-checkpoint.json')),false);
}));

test('R10 HTTP 429 records one sent request and does not turn quota deferral into one-hour cache',()=>fixture(async base=>{
 prepareR10(base);let calls=0;const now=Date.parse('2026-11-02T18:00:00Z');
 const fetchImpl=async()=>{calls++;return new Response(null,{status:429});};
 const one=await collectAlpacaIncremental(base,{now,fetchImpl,wait:async()=>{}});
 assert.equal(one.status,'DEFERRED_QUOTA');assert.equal(one.runRequests,1);assert.equal(calls,1);
 const two=await collectAlpacaIncremental(base,{now:now+60_000,fetchImpl,wait:async()=>{}});
 assert.equal(two.status,'DEFERRED_QUOTA');assert.equal(two.runRequests,0);assert.equal(calls,1);
 assert.equal(JSON.parse(fs.readFileSync(path.join(base,'alpaca-quota-ledger.json'),'utf8')).requestTimes.length,1);
}));

const sectorNow=Date.parse('2026-10-19T18:00:00Z');
const sectorInputs={
 diagnostics:{stockLastDate:'2026-10-16'},
 pitCsv:['symbol,sector,date_added,date_removed',...Array.from({length:500},(_,i)=>`MOCK${i},Energy,2020-01-01,`)].join('\n'),
 stockRows:[],series:{},
};

test('independent sector Node at shared cap sends zero Alpaca calls and preserves raw',()=>fixture(async base=>{
 const raw=path.join(base,'local-sector-provisional-input.json');fs.writeFileSync(raw,'{"old":"raw"}');
 saturate(base);let calls=0;
 const report=await runSectorProvisional(base,{now:sectorNow,write:true,loadInputs:()=>sectorInputs,fetchImpl:async()=>{calls++;throw Error('UNEXPECTED_NETWORK');}});
 assert.equal(report.status,'DEFERRED_QUOTA');
 assert.equal(report.reason,'ALPACA_SHARED_QUOTA_GUARD');
 assert.equal(report.providerCalls,0);assert.equal(calls,0);
 assert.equal(fs.readFileSync(raw,'utf8'),'{"old":"raw"}');
 assert.equal(fs.existsSync(path.join(base,'storage','core.sqlite')),false);
}));

test('sector HTTP 429 defers one sent call without changing prior inputs or opening SQLite',()=>fixture(async base=>{
 let calls=0;const raw=path.join(base,'local-sector-provisional-input.json');fs.writeFileSync(raw,'{"old":"raw"}');
 const report=await runSectorProvisional(base,{now:sectorNow,write:true,loadInputs:()=>sectorInputs,fetchImpl:async()=>{calls++;return new Response(null,{status:429});}});
 assert.equal(report.status,'DEFERRED_QUOTA');
 assert.equal(report.reason,'ALPACA_HTTP_429');
 assert.equal(report.providerCalls,1);assert.equal(calls,1);
 assert.equal(fs.readFileSync(raw,'utf8'),'{"old":"raw"}');
 assert.equal(fs.existsSync(path.join(base,'storage','core.sqlite')),false);
}));

test('R10 ordinary provider HTTP 503 stays a failure, not a quota deferral',()=>fixture(async base=>{
 prepareR10(base);let calls=0;
 const report=await collectAlpacaIncremental(base,{now:Date.parse('2026-11-02T18:00:00Z'),wait:async()=>{},fetchImpl:async()=>{calls++;return new Response(null,{status:503});}});
 assert.equal(report.status,'BLOCKED');
 assert.equal(report.errorCode,'ALPACA_HTTP_503');
 assert.equal(report.runRequests,1);assert.equal(calls,1);
}));

test('sector non-quota HTTP 503 preserves original failure classification',()=>fixture(async base=>{
 let calls=0;
 const report=await runSectorProvisional(base,{now:sectorNow,loadInputs:()=>sectorInputs,fetchImpl:async()=>{calls++;return new Response(null,{status:503});}});
 assert.equal(report.status,'FAILED_PREVIOUS_CONFIRMED_PRESERVED');
 assert.equal(report.error,'SECTOR_PROVISIONAL_HTTP_503');
 assert.equal(report.providerCalls,1);assert.equal(calls,1);
}));
