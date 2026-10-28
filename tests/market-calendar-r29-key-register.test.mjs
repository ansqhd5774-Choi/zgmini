import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {replaceEarningsKey,registerEarningsApiKey}
 from '../scripts/pc-writer/market-calendar-r29-key-register.mjs';

const testKey='test_R29-key-123456';

test('Adds the key without changing any existing provider or comments',()=>{
 const original='FRED_API_KEY="old-provider"\r\n# Keep this\r\nBEA_API_KEY="secret+other"\r\n';
 const {updated}=replaceEarningsKey(original,testKey);
 assert.equal(parseEnv(updated).EARNINGS_API_KEY,testKey);
 assert.equal(parseEnv(updated).FRED_API_KEY,'old-provider');
 assert.equal(parseEnv(updated).BEA_API_KEY,'secret+other');
 assert.match(updated,/# Keep this\r\n/);
 assert.ok(updated.includes('\r\n'));
 assert.equal((updated.match(/EARNINGS_API_KEY=/g)??[]).length,1);
});

test('Replaces duplicated old keys without touching other provider entries',()=>{
 const previous='EARNINGS_API_KEY="oldkey1234"\nBEA_API_KEY=beacode\nEARNINGS_API_KEY="oldkey4567"\n';
 const {updated}=replaceEarningsKey(previous,testKey);
 assert.equal((updated.match(/^EARNINGS_API_KEY=/gm)??[]).length,1);
 assert.equal(parseEnv(updated).BEA_API_KEY,'beacode');
 assert.throws(()=>replaceEarningsKey(previous,'bad\nFRED_API_KEY=leaked'),/FORMAT_INVALID/);
 assert.throws(()=>replaceEarningsKey(previous,'abc'),/FORMAT_INVALID/);
});

test('Registration preserves existing credentials, creates recoverable backup and reads back new key',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r29-key-'));
 try{
  const file=path.join(dir,'providers.env');
  const previous='FRED_API_KEY="fred-secret"\nBEA_API_KEY="bea-secret"\n';
  fs.writeFileSync(file,previous);
  const result=registerEarningsApiKey(testKey,{pcHome:dir,
   now:Date.parse('2026-10-28T09:00:00Z'),randomSuffix:'1234abcd'});
  assert.equal(result.status,'REGISTERED');
  const saved=parseEnv(fs.readFileSync(file,'utf8'));
  assert.equal(saved.EARNINGS_API_KEY,testKey);
  assert.equal(saved.FRED_API_KEY,'fred-secret');
  assert.equal(saved.BEA_API_KEY,'bea-secret');
  const backups=fs.readdirSync(dir).filter(f=>f.endsWith('.bak'));
  assert.equal(backups.length,1);
  assert.equal(fs.readFileSync(path.join(dir,backups[0]),'utf8'),previous);
  assert.equal(registerEarningsApiKey(testKey,{pcHome:dir}).status,'ALREADY_REGISTERED');
  assert.equal(fs.readdirSync(dir).filter(f=>f.endsWith('.bak')).length,1);
  assert.ok(!JSON.stringify(result).includes(testKey));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('No providers.env means no secret file is created or mutated',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r29-key-'));
 try{
  assert.throws(()=>registerEarningsApiKey(testKey,{pcHome:dir}),/EXISTING_PROVIDER_ENV_MISSING/);
  assert.deepEqual(fs.readdirSync(dir),[]);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
