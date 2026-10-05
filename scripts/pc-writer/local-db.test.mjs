import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {localDatabase} from './local-db.mjs';
import {loadLocalProviders} from './local-env.mjs';

test('local data survives reopen; D1 bind, first and atomic rollback',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-local-test-'));const file=path.join(dir,'core.sqlite');
 let db=localDatabase(file);
 try{
  await db.exec('CREATE TABLE sample(id INTEGER PRIMARY KEY, value TEXT)');
  await db.prepare('INSERT INTO sample VALUES(?,?)').bind(1,'stored').run();
  db.close();db=localDatabase(file);
  assert.equal(await db.prepare('SELECT value FROM sample WHERE id=?').bind(1).first('value'),'stored');
  await assert.rejects(db.batch([db.prepare('INSERT INTO sample VALUES(?,?)').bind(2,'rollback'),db.prepare('INSERT INTO sample VALUES(?,?)').bind(1,'duplicate')]));
  assert.equal(await db.prepare('SELECT COUNT(*) AS n FROM sample').first('n'),1);
 }finally{db.close();fs.rmSync(dir,{recursive:true});}
});
test('provider loading preserves encoded values and excludes empty values',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-env-test-'));
 try{fs.writeFileSync(path.join(dir,'providers.env'),'FSC_API_KEY="test%3D%3D"\nBLS_API_KEY=\n');assert.deepEqual(loadLocalProviders(dir),{FSC_API_KEY:'test%3D%3D'});}finally{fs.rmSync(dir,{recursive:true});}
});
