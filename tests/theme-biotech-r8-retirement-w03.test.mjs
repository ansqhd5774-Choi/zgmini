import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MARKETPARQUET_REMOVED_CODE}
 from '../lib/marketparquet-retirement.mjs';
import {runBiotechR8}
 from '../scripts/pc-writer/theme-biotech-auto-r8.mjs';

test('retired biotech R8 rejects even approved publish without invoking R7 or D1',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'w03-biotech-'));
 try{
  const forbidden=new Proxy({},{get(){throw Error('UNEXPECTED_R7_OR_D1_CALL');}});
  await assert.rejects(runBiotechR8({
   dataRoot:dir,allowCollect:true,allowPublish:true,r7:forbidden,db:forbidden}),
   error=>error.code===MARKETPARQUET_REMOVED_CODE&&error.retryable===false);
  assert.deepEqual(readdirSync(dir),[],'must not create lock/log/raw/DB');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('retired biotech R8 CLI stops with zero effects and creates no files',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'w03-biotech-cli-'));
 try{
  const script=fileURLToPath(new URL('../scripts/pc-writer/theme-biotech-auto-r8.mjs',import.meta.url));
  const run=spawnSync(process.execPath,[script,'--once','--collect','--publish'],{
   env:{...process.env,ZGMINI_DATA_ROOT:dir},encoding:'utf8',timeout:5000});
  assert.equal(run.status,1,run.stderr);
  const result=JSON.parse(run.stderr.trim());
  assert.equal(result.status,'UNAVAILABLE');
  assert.equal(result.reason,MARKETPARQUET_REMOVED_CODE);
  assert.equal(result.retryable,false);
  for(const key of ['providerCalls','sqliteWrites','d1Writes','schedulerWrites'])
   assert.equal(result[key],0,key);
  assert.deepEqual(readdirSync(dir),[],'must not create lock/log/raw/DB');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
