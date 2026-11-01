import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {collectSp500Shadow,mergeSp500ShadowHistory,parseSp500FredPayload} from '../scripts/pc-writer/collect-sp500-shadow.mjs';
import {refreshSp500ShadowIfDue,sp500ShadowRefreshDecision,SP500_SUCCESS_CACHE_MS,SP500_FAILURE_BACKOFF_MS} from '../scripts/pc-writer/asset-r10-sp500-refresh.mjs';
import {auxiliaryInputCheckpoint} from '../scripts/pc-writer/progressive-publication.mjs';

const fixture=()=>fs.mkdtempSync(path.join(os.tmpdir(),'zg-asset-r10-sp500-'));
const mockDates=(count=260)=>Array.from({length:count},(_,i)=>({
  date:new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),value:String(100+i),
}));

test('S&P 500 Core wrapper uses a daily success cache without provider requests',async()=>{
  const base=fixture(),now=Date.parse('2026-11-01T12:00:00Z');
  let calls=0;
  const collector=async(_base,{asOf})=>{calls++;assert.equal(asOf,'2026-11-01');return {status:'STORED',providerCalls:1,last:'2026-10-30',dataChanged:true,sourceStoredAt:123};};
  const first=await refreshSp500ShadowIfDue(base,{now,collector});
  assert.equal(first.status,'STORED');assert.equal(first.providerRequests,1);
  const cached=await refreshSp500ShadowIfDue(base,{now:now+SP500_SUCCESS_CACHE_MS-1,collector});
  assert.equal(cached.status,'CACHED');assert.equal(cached.providerRequests,0);assert.equal(cached.observationDate,'2026-10-30');assert.equal(calls,1);
  const next=sp500ShadowRefreshDecision({at:new Date(now).toISOString(),status:'STORED'},{now:now+SP500_SUCCESS_CACHE_MS});
  assert.equal(next.due,true);
});

test('S&P 500 refresh failure preserves input and backs off instead of retrying each Core cycle',async()=>{
  const base=fixture(),now=Date.parse('2026-11-01T12:00:00Z');let calls=0;
  const collector=async()=>{calls++;throw Error('FRED_API_KEY_MISSING');};
  const first=await refreshSp500ShadowIfDue(base,{now,collector});
  assert.equal(first.status,'FAILED_PREVIOUS_INPUTS_PRESERVED');assert.equal(first.errorCode,'FRED_API_KEY_MISSING');
  const second=await refreshSp500ShadowIfDue(base,{now:now+SP500_FAILURE_BACKOFF_MS-1,collector});
  assert.equal(second.status,'CACHED');assert.equal(second.reason,'RECENT_SOURCE_FAILURE');assert.equal(calls,1);
  await refreshSp500ShadowIfDue(base,{now:now+SP500_FAILURE_BACKOFF_MS,collector});
  assert.equal(calls,2);
});

test('S&P 500 historical rows retain older verified dates while using returned current-vintage corrections',()=>{
  const old=[{observationDate:'2025-01-01',value:100},{observationDate:'2025-01-02',value:101},{observationDate:'2025-01-03',value:102}];
  const newest=[{observationDate:'2025-01-02',value:111},{observationDate:'2025-01-03',value:102}];
  assert.deepEqual(mergeSp500ShadowHistory(old,newest),[old[0],...newest]);
  assert.throws(()=>mergeSp500ShadowHistory(old,[newest[0]]),/SP500_FRED_OBSERVATION_REGRESSION/);
  assert.throws(()=>parseSp500FredPayload({observations:[...mockDates(),mockDates()[0]]},{asOf:'2026-11-01'}),/SP500_FRED_DUPLICATE_DATE/);
});

test('S&P 500 persisted source timestamp remains unchanged for identical rows, but advances for revisions',async()=>{
  const base=fixture();fs.writeFileSync(path.join(base,'providers.env'),'FRED_API_KEY=fixture\n');
  const originalFetch=globalThis.fetch;
  let observations=mockDates();let calls=0;
  globalThis.fetch=async()=>{calls++;return Response.json({observations});};
  try{
    const first=await collectSp500Shadow(base,{asOf:'2026-11-01'});
    assert.equal(first.status,'STORED');assert.equal(first.dataChanged,true);
    await new Promise(resolve=>setTimeout(resolve,550));
    const same=await collectSp500Shadow(base,{asOf:'2026-11-01'});
    assert.equal(same.status,'UNCHANGED');assert.equal(same.dataChanged,false);
    assert.equal(same.sourceStoredAt,first.sourceStoredAt);
    await new Promise(resolve=>setTimeout(resolve,550));
    observations=[...mockDates().slice(1),{date:'2025-09-18',value:'999'}];
    const revised=await collectSp500Shadow(base,{asOf:'2026-11-01'});
    assert.equal(revised.status,'STORED');assert.equal(revised.dataChanged,true);
    assert.equal(revised.rows,261);assert.equal(revised.first,'2025-01-01');
    assert.equal(calls,3);
  }finally{globalThis.fetch=originalFetch;}
});

test('auxiliary publication checkpoint changes when a new S&P 500 shadow input is stored',()=>{
  const base=fixture();fs.mkdirSync(path.join(base,'storage'));
  const db=new DatabaseSync(path.join(base,'storage','core.sqlite'));
  db.exec('CREATE TABLE public_feed_snapshots_v1(kind TEXT,feed_key TEXT,snapshot_key TEXT,body TEXT,stored_at INTEGER)');
  db.exec('CREATE TABLE market_input_batches_v1(batch_key TEXT PRIMARY KEY,body TEXT,stored_at INTEGER)');
  const before=auxiliaryInputCheckpoint(base);
  db.prepare('INSERT INTO market_input_batches_v1 VALUES(?,?,?)').run('shadowSp500Benchmark:2026-11-01','{"series":{"SP500":[]}}',1000);
  const after=auxiliaryInputCheckpoint(base);
  assert.notEqual(after,before);
  db.prepare('UPDATE market_input_batches_v1 SET body=?,stored_at=?').run('{"series":{"SP500":[1]}}',2000);
  assert.notEqual(auxiliaryInputCheckpoint(base),after);
  db.close();
});
