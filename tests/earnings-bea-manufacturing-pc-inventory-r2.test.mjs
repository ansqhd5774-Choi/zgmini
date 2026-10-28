import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inventoryExistingBeaMfg} from '../scripts/pc-writer/EARNINGS_BEA_MFG_PROFIT_R2_PC_INVENTORY_READONLY.mjs';

const fixture=fn=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'bea-mfg-inventory-'));
  try{return fn(root);}finally{fs.rmSync(root,{recursive:true,force:true});}
};

test('detects an existing exact BEA manufacturing CSV without modifying it',()=>fixture(root=>{
  const dir=path.join(root,'raw');fs.mkdirSync(dir);
  const file=path.join(dir,'bea.csv'),contents='observation_date,N400RC1Q027SBEA\n2026-04-01,1053.304\n';
  fs.writeFileSync(file,contents);
  const a=inventoryExistingBeaMfg({root});
  assert.equal(a.status,'CANDIDATE_EXISTING_RAW_FOUND');
  assert.deepEqual(a.matches,['raw/bea.csv']);
  assert.equal(a.safeToAutoCapture,false);
  assert.equal(a.d1Writes,0);
  assert.equal(fs.readFileSync(file,'utf8'),contents);
}));

test('unmatched raw CSV never proves the PC SQLite is empty',()=>fixture(root=>{
  fs.mkdirSync(path.join(root,'raw'));
  fs.mkdirSync(path.join(root,'storage'));
  fs.writeFileSync(path.join(root,'storage','core.sqlite'),'fixture');
  const out=inventoryExistingBeaMfg({root});
  assert.equal(out.status,'NO_MATCH_IN_BOUNDED_TEXT_SCAN');
  assert.deepEqual(out.sqliteFilesPresent,['storage/core.sqlite']);
  assert.equal(out.sqliteContentsInspected,false);
  assert.equal(out.safeToAutoCapture,false);
}));

test('matches exact metadata and rejects unrelated BEA series',()=>fixture(root=>{
  fs.mkdirSync(path.join(root,'manual-input'));
  fs.writeFileSync(path.join(root,'manual-input','old.json'),JSON.stringify({seriesId:'A463RD3Q052SBEA'}));
  fs.writeFileSync(path.join(root,'manual-input','found.json'),JSON.stringify({source:{seriesId:'N400RC1Q027SBEA'}}));
  const out=inventoryExistingBeaMfg({root});
  assert.deepEqual(out.matches,['manual-input/found.json']);
}));

test('does not treat arbitrary directory as an approved PC source',()=>fixture(root=>{
  assert.throws(()=>inventoryExistingBeaMfg({root}),/ROOT_NOT_RECOGNIZED/);
}));
