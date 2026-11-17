import {runTenR88Auto} from '../scripts/pc-writer/theme-ten-r88-auto.mjs';
import {MARKETPARQUET_REMOVED_CODE} from '../lib/marketparquet-retirement.mjs';
import {mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';import assert from 'node:assert/strict';
import {runTenR88Lanes,verifyTenR88Public} from '../scripts/pc-writer/theme-ten-r88-auto.mjs';
import {fixture} from './theme-nine-r88-provisional.test.mjs';
test('one optional lane failure does not prevent other themes from publishing',async()=>{
 const seen=[];
 const results=await runTenR88Lanes({steps:[['DC',async()=>{seen.push('DC');throw Object.assign(new Error('SOURCE_WAIT'),{code:'SOURCE_WAIT'});}],
  ['CORE',async()=>{seen.push('CORE');return {status:'WRITTEN',d1Writes:1};}],
  ['SPACE',async()=>{seen.push('SPACE');return {status:'UNCHANGED',d1Writes:0};}]]});
 assert.deepEqual(seen,['DC','CORE','SPACE']);assert.equal(results[0].status,'BLOCKED');assert.equal(results[1].d1Writes,1);assert.equal(results[2].status,'UNCHANGED');
});
test('historical ten-theme payload validator requires all confirmed/provisional points',()=>{
 const {base}=fixture();base.r32ProvisionalStatus='READY';
 const dates={confirmedDate:'2026-10-28',provisionalDate:'2026-10-29'};
 assert.equal(verifyTenR88Public(base,dates),true);
 const lagged=structuredClone(base);lagged.themes[9].history.at(-1).date='2026-10-23';assert.equal(verifyTenR88Public(lagged,dates),false);
 const absent=structuredClone(base);delete absent.provisional.points[0].scores['데이터센터·전력'];assert.equal(verifyTenR88Public(absent,dates),false);
 const legacy=structuredClone(base);legacy.r32ProvisionalStatus='PENDING';assert.equal(verifyTenR88Public(legacy,dates),false);
});

test('missing provisional input does not skip independent confirmed lanes',async()=>{
 const {r88ProvisionalLanes,runTenR88Lanes}=await import('../scripts/pc-writer/theme-ten-r88-auto.mjs');
 for(const status of ['WAIT_PROVISIONAL_SOURCE','WAIT_CONFIRMED_REFRESH']){
  const out=await runTenR88Lanes({steps:[
   ['DATA_CENTER_CONFIRMED',async()=>({status:'PUBLIC_API_VERIFIED'})],
   ...r88ProvisionalLanes({provisionalDate:null,provisionalWait:status,steps:[
    ['R32_PROVISIONAL',async()=>{throw Error('must not execute');}],
   ]}),
  ]});
  assert.deepEqual(out,[{lane:'DATA_CENTER_CONFIRMED',status:'PUBLIC_API_VERIFIED'},{lane:'R32_PROVISIONAL',status}]);
 }
});

test('retired R88 post-cycle rejects old consent before any file, provider or D1 effect',async()=>{
 const root=mkdtempSync(path.join(tmpdir(),'w03-r88-removed-'));
 try{
  await assert.rejects(runTenR88Auto({dataRoot:root,allowCollect:true,allowPublish:true}),
   error=>error.code===MARKETPARQUET_REMOVED_CODE&&error.retryable===false);
  assert.deepEqual(readdirSync(root),[],'retired cycle must not create consent/lock/log or DB');
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('retired R88 CLI does not create a lock or write a report',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'w03-r88-cli-'));
 try{
  const script=fileURLToPath(new URL('../scripts/pc-writer/theme-ten-r88-auto.mjs',import.meta.url));
  const run=spawnSync(process.execPath,[script,'--once','--publish','--collect-approved-optionals'],{
   env:{...process.env,ZGMINI_DATA_ROOT:root},encoding:'utf8',timeout:5000});
  assert.equal(run.status,1,run.stderr);
  const message=JSON.parse(run.stderr.trim());
  assert.equal(message.status,'UNAVAILABLE');
  assert.equal(message.reason,MARKETPARQUET_REMOVED_CODE);
  assert.equal(message.retryable,false);
  for(const field of ['providerCalls','sqliteWrites','d1Writes','schedulerWrites'])
   assert.equal(message[field],0,field);
  assert.deepEqual(readdirSync(root),[]);
 }finally{rmSync(root,{recursive:true,force:true});}
});
