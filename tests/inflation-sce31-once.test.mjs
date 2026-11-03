import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {runInflationSce31Once} from '../scripts/pc-writer/inflation-sce31-once.mjs';

async function fixture(testBody) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'zgmini-sce31-once-'));
  const writerHome=path.join(root,'pc-writer');
  await fs.mkdir(writerHome);
  try {await testBody({root,writerHome});}
  finally {await fs.rm(root,{recursive:true,force:true});}
}

test('uses a fixed private output directory and existing NYFED quota transport',async()=>fixture(async({writerHome})=>{
  const nativeFetch=async()=>{throw Error('fixture must not access provider');};
  const guardedFetch=async()=>({ok:true});
  let quotaCalls=0,collectCalls=0;
  const now=()=>new Date('2026-11-04T00:00:00.000Z');
  const result=await runInflationSce31Once({
    writerHome,fetcher:nativeFetch,now,
    makeQuotaFetch:async options=>{
      quotaCalls++;
      assert.deepEqual(options,{base:writerHome,originalFetch:nativeFetch,mode:'enforce'});
      return {fetch:guardedFetch};
    },
    collect:async options=>{
      collectCalls++;
      assert.deepEqual(options,{
        directory:path.join(writerHome,'inflation-causal','sce31'),
        fetcher:guardedFetch,now,
      });
      return {status:'STORED',count:160,latestMonth:'2026-09-01',
        fetchedAt:'2026-11-04T00:00:00.000Z',downloadSha256:'ab'.repeat(32)};
    },
  });
  assert.equal(quotaCalls,1);
  assert.equal(collectCalls,1);
  assert.equal(result.status,'PASS');
  assert.equal(result.provider,'NYFED');
  assert.equal(result.d1Writes,0);
  assert.equal(result.coreWrites,0);
  assert.equal(result.publications,0);
  assert.equal(JSON.stringify(result).includes(writerHome),false);
}));

test('rejects unapproved root before quota creation or provider calls',async()=>fixture(async({writerHome})=>{
  let called=false;
  const deps={makeQuotaFetch:()=>{called=true;},collect:()=>{called=true;}};
  await assert.rejects(()=>runInflationSce31Once({writerHome:'relative',...deps}),/WRITER_HOME_NOT_APPROVED/);
  await assert.rejects(()=>runInflationSce31Once({writerHome:path.dirname(writerHome),...deps}),/WRITER_HOME_NOT_APPROVED/);
  assert.equal(called,false);
}));

test('rejects symlinked output scope',async t=>fixture(async({root,writerHome})=>{
  try {await fs.symlink(root,path.join(writerHome,'inflation-causal'),'dir');}
  catch(error) {
    if(['EPERM','EACCES','ENOTSUP'].includes(error?.code)){
      t.skip('host does not permit creating a test symlink');return;
    }
    throw error;
  }
  let called=false;
  await assert.rejects(()=>runInflationSce31Once({writerHome,
    makeQuotaFetch:()=>{called=true;}}),/SCE_OUTPUT_PATH_UNSAFE/);
  assert.equal(called,false);
}));

test('does not misreport an unverified writer result as a PASS',async()=>fixture(async({writerHome})=>{
  await assert.rejects(()=>runInflationSce31Once({writerHome,
    makeQuotaFetch:()=>({fetch:async()=>{}}),
    collect:async()=>({status:'STORED',count:0}),
  }),/SCE_STORAGE_READBACK_NOT_VERIFIED/);
}));
