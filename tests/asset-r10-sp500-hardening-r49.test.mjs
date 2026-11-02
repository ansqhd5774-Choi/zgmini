// Portable production-dependency regression tests for GitHub work branch.
// Imports ONLY the real S&P500 entrypoints and Node built-ins. No test doubles.
// Mock fetch functions never issue provider/network requests.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {collectSp500Shadow,SP500_FETCH_TIMEOUT_MS} from '../scripts/pc-writer/collect-sp500-shadow.mjs';
import {
  refreshSp500ShadowIfDue,
  SP500_SUCCESS_CACHE_MS,
  SP500_FAILURE_BACKOFF_MS,
} from '../scripts/pc-writer/asset-r10-sp500-refresh.mjs';

const root=()=>fs.mkdtempSync(path.join(os.tmpdir(),'zg-r49-portable-'));
const prepared=()=>{
  const base=root();
  fs.mkdirSync(path.join(base,'storage'));
  new DatabaseSync(path.join(base,'storage','core.sqlite')).close();
  fs.writeFileSync(path.join(base,'providers.env'),'FRED_API_KEY=local-fixture-only\n');
  return base;
};
const now=Date.parse('2026-11-01T12:00:00Z');
const receipt=()=>({status:'UNCHANGED',providerCalls:1,last:'2026-10-30',sourceStoredAt:456});

test('R49 default OFF: no private source approval means zero calls and no receipt',async()=>{
  const base=prepared(),prior=process.env.ZGMINI_R10_SP500_REFRESH_APPROVED;
  delete process.env.ZGMINI_R10_SP500_REFRESH_APPROVED;
  let called=0;
  try{
    const result=await refreshSp500ShadowIfDue(base,{now,collector:async()=>{called++;return receipt();}});
    assert.equal(result.status,'SKIPPED_SOURCE_NOT_APPROVED');
    assert.equal(result.providerRequests,0);
    assert.equal(called,0);
    assert.equal(fs.existsSync(path.join(base,'local-asset-r10-sp500-refresh-last-run.json')),false);
  }finally{
    if(prior===undefined)delete process.env.ZGMINI_R10_SP500_REFRESH_APPROVED;
    else process.env.ZGMINI_R10_SP500_REFRESH_APPROVED=prior;
  }
});

test('R49 private providers.env can explicitly approve scheduled automatic refresh',async()=>{
  const base=prepared(),prior=process.env.ZGMINI_R10_SP500_REFRESH_APPROVED;
  fs.appendFileSync(path.join(base,'providers.env'),'ZGMINI_R10_SP500_REFRESH_APPROVED=1\n');
  delete process.env.ZGMINI_R10_SP500_REFRESH_APPROVED;
  let called=0;
  try{
    const first=await refreshSp500ShadowIfDue(base,{now,collector:async()=>{called++;return receipt();}});
    assert.equal(first.status,'UNCHANGED');
    const cached=await refreshSp500ShadowIfDue(base,{
      now:now+SP500_SUCCESS_CACHE_MS-1,
      collector:async()=>{called++;return receipt();},
    });
    assert.equal(cached.status,'CACHED');
    assert.equal(cached.providerRequests,0);
    assert.equal(called,1);
  }finally{
    if(prior===undefined)delete process.env.ZGMINI_R10_SP500_REFRESH_APPROVED;
    else process.env.ZGMINI_R10_SP500_REFRESH_APPROVED=prior;
  }
});

test('R49 missing source root or missing core.sqlite stops without creating either',async()=>{
  const absent=path.join(root(),'missing-root');
  let called=0;
  const collector=async()=>{called++;return receipt();};
  const first=await refreshSp500ShadowIfDue(absent,{authorized:true,now,collector});
  assert.equal(first.status,'STOP_PC_ROOT_NOT_READY');
  assert.equal(fs.existsSync(absent),false);
  const base=root();
  const second=await refreshSp500ShadowIfDue(base,{authorized:true,now,collector});
  assert.equal(second.status,'STOP_CORE_DB_NOT_READY');
  assert.equal(fs.existsSync(path.join(base,'storage','core.sqlite')),false);
  assert.equal(called,0);
});

test('R49 collector direct entrypoint also refuses missing core.sqlite before network',async()=>{
  const base=root(),prior=globalThis.fetch;
  let called=0;
  globalThis.fetch=async()=>{called++;throw Error('SHOULD_NOT_BE_CALLED');};
  try{
    await assert.rejects(collectSp500Shadow(base,{asOf:'2026-11-01'}),/SP500_LOCAL_STORAGE_MISSING/);
    assert.equal(called,0);
    assert.equal(fs.existsSync(path.join(base,'storage','core.sqlite')),false);
  }finally{globalThis.fetch=prior;}
});

test('R49 hung FRED mock is aborted quickly and global fetch remains untouched',async()=>{
  const base=prepared(),prior=globalThis.fetch;
  let observedSignal;
  globalThis.fetch=async(_url,{signal})=>{
    observedSignal=signal;
    return new Promise((_resolve,reject)=>{
      signal.addEventListener('abort',()=>reject(signal.reason),{once:true});
    });
  };
  const mock=globalThis.fetch;
  const started=Date.now();
  try{
    await assert.rejects(
      collectSp500Shadow(base,{asOf:'2026-11-01',fetchTimeoutMs:35}),
      error=>error?.name==='TimeoutError'||error?.name==='AbortError',
    );
    assert.equal(observedSignal?.aborted,true);
    assert.ok(Date.now()-started<1500);
    assert.equal(globalThis.fetch,mock);
    assert.equal(SP500_FETCH_TIMEOUT_MS,20_000);
  }finally{globalThis.fetch=prior;}
});

test('R49 source fetch failure still uses original 2-hour retry backoff',async()=>{
  const base=prepared();let called=0;
  const collector=async()=>{called++;throw Error('SP500_FRED_HTTP');};
  const first=await refreshSp500ShadowIfDue(base,{authorized:true,now,collector});
  assert.equal(first.status,'FAILED_PREVIOUS_INPUTS_PRESERVED');
  assert.equal(first.errorCode,'SP500_FRED_HTTP');
  const second=await refreshSp500ShadowIfDue(base,{
    authorized:true,
    now:now+SP500_FAILURE_BACKOFF_MS-1,
    collector,
  });
  assert.equal(second.status,'CACHED');
  assert.equal(second.providerRequests,0);
  assert.equal(called,1);
});
