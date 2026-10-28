import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {captureBeaMfgR5} from '../scripts/pc-writer/EARNINGS_BEA_MFG_PROFIT_R5_APPEND_ONLY_CAPTURE.mjs';

const CSV='observation_date,N400RC1Q027SBEA\n2025-01-01,100\n2025-04-01,110\n2025-07-01,120\n2025-10-01,130\n2026-01-01,140\n2026-04-01,160\n';
const fixed=()=>Date.parse('2026-10-28T00:00:00Z');
const fetchImpl=async()=>({ok:true,text:async()=>CSV});
async function fixture(fn){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bea-mfg-r5-'));
  fs.mkdirSync(path.join(root,'storage'));
  fs.writeFileSync(path.join(root,'storage','core.sqlite'),'user-owned-unchanged');
  try{return await fn(root);}finally{fs.rmSync(root,{recursive:true,force:true});}
}

test('dry run does not fetch or write',async()=>fixture(async root=>{
  const result=await captureBeaMfgR5({root,fetchImpl:()=>{throw Error('network forbidden');}});
  assert.equal(result.status,'DRY_RUN_NO_NETWORK');
  assert.equal(result.sourceWrites,0);
  assert.equal(fs.existsSync(path.join(root,'raw')),false);
}));

test('first capture writes only immutable SHA-named source and metadata',async()=>fixture(async root=>{
  const result=await captureBeaMfgR5({root,execute:true,fetchImpl,now:fixed});
  assert.equal(result.status,'APPEND_ONLY_SOURCE_STORED');
  assert.equal(result.sourceWrites,2);
  assert.equal(result.sqliteWrites,0);
  assert.equal(result.d1Writes,0);
  const folder=path.join(root,'raw','earnings-recession','bea-manufacturing-profits-r5');
  assert.equal(fs.readFileSync(path.join(folder,result.sourceVersion+'.csv'),'utf8'),CSV);
  const metadata=JSON.parse(fs.readFileSync(path.join(folder,result.sourceVersion+'.json'),'utf8'));
  assert.equal(metadata.sourceStoredAt,fixed());
  assert.equal(fs.readFileSync(path.join(root,'storage','core.sqlite'),'utf8'),'user-owned-unchanged');
}));

test('identical rerun reuses source without modifying first checkpoint',async()=>fixture(async root=>{
  const first=await captureBeaMfgR5({root,execute:true,fetchImpl,now:fixed});
  const second=await captureBeaMfgR5({root,execute:true,fetchImpl,now:()=>fixed()+60_000});
  assert.equal(second.status,'IDENTICAL_SOURCE_REUSED');
  assert.equal(second.sourceWrites,0);
  assert.equal(second.sourceVersion,first.sourceVersion);
  const meta=JSON.parse(fs.readFileSync(path.join(root,'raw','earnings-recession','bea-manufacturing-profits-r5',first.sourceVersion+'.json')));
  assert.equal(meta.sourceStoredAt,fixed());
}));

test('wrong content at claimed checksum blocks overwrite',async()=>fixture(async root=>{
  const first=await captureBeaMfgR5({root,execute:true,fetchImpl,now:fixed});
  const file=path.join(root,'raw','earnings-recession','bea-manufacturing-profits-r5',first.sourceVersion+'.csv');
  fs.writeFileSync(file,'do-not-overwrite');
  await assert.rejects(captureBeaMfgR5({root,execute:true,fetchImpl,now:fixed}),/BEA_MFG_CONTENT_ADDRESS_CONFLICT/);
  assert.equal(fs.readFileSync(file,'utf8'),'do-not-overwrite');
}));
