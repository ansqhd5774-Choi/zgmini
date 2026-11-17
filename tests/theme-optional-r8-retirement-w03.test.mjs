import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {MARKETPARQUET_REMOVED_CODE}
 from '../lib/marketparquet-retirement.mjs';
import {runDcPowerR8} from '../scripts/pc-writer/theme-data-center-power-auto-r8.mjs';
import {runSpaceR8} from '../scripts/pc-writer/theme-space-satellite-auto-r8.mjs';

const runners=[
 ['data-center-power','theme-data-center-power-auto-r8.mjs',runDcPowerR8],
 ['space-satellite','theme-space-satellite-auto-r8.mjs',runSpaceR8]
];
for(const [label,file,run] of runners){
 test(label+' retired R8 call rejects even old publishing consent without any IO',async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'w03-r8-retired-'));
  try{
   const deny=new Proxy({}, {get(){throw Error('UNEXPECTED_D1_ACCESS');}});
   await assert.rejects(run({dataRoot:dir,allowPublish:true,db:deny}),
    error=>error.code===MARKETPARQUET_REMOVED_CODE&&error.retryable===false);
   assert.deepEqual(readdirSync(dir),[],'retired runner must not create files');
  }finally{rmSync(dir,{recursive:true,force:true});}
 });
 test(label+' retired R8 CLI fails closed before local lock, token or D1 side effects',()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'w03-r8-cli-'));
  try{
   const script=fileURLToPath(new URL('../scripts/pc-writer/'+file,import.meta.url));
   const result=spawnSync(process.execPath,[script,'--once','--publish'],{
    env:{...process.env,ZGMINI_DATA_ROOT:dir},encoding:'utf8',timeout:5000});
   assert.equal(result.status,1,result.stderr);
   const message=JSON.parse(result.stderr.trim());
   assert.equal(message.status,'UNAVAILABLE');
   assert.equal(message.reason,MARKETPARQUET_REMOVED_CODE);
   assert.equal(message.retryable,false);
   for(const field of ['providerCalls','sqliteWrites','d1Writes','schedulerWrites'])
    assert.equal(message[field],0,field);
   assert.deepEqual(readdirSync(dir),[],'no lock/log/DB created');
  }finally{rmSync(dir,{recursive:true,force:true});}
 });
}
