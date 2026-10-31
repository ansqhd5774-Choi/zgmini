import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {portableR6FileList,buildPortableR6}
 from '../tools/iran-r6-portable-build.mjs';

const repository=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

test('R6 portable bundle resolves all static local imports, without PC install',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-iran-r6-bundle-'));
 try{
  const target=path.join(temp,'package');
  const manifest=buildPortableR6(target);
  const list=portableR6FileList();
  assert.equal(manifest.sourceBranch,'codex/outbreak-iran-news-retention-r1-20261026');
  assert.deepEqual(manifest.files.map(entry=>entry.path),list);
  assert.equal(manifest.readOnly,true);
  assert.equal(manifest.operatingProjectInstall,false);
  assert.equal(manifest.sqliteWrite,false);
  assert.equal(manifest.d1Write,false);
  assert.equal(manifest.scheduleChange,false);
  assert.ok(list.includes('scripts/iran-progress/english-r5-published-preview-r6.mjs'));
  assert.ok(list.includes('scripts/resolve-local-node.cmd'));
  for(const entry of manifest.files){
   const bytes=fs.readFileSync(path.join(target,entry.path));
   assert.equal(sha256(bytes),entry.sha256);
   assert.equal(bytes.length,entry.bytes);
   if(entry.path.endsWith('.cmd')){
    assert.match(bytes.toString('ascii'),/\r\n/);
    assert.doesNotMatch(bytes.toString('ascii'),/(?<!\r)\n/);
    assert.ok([...bytes].every(value=>value<128));
   }
  }
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(target,
   'R6_PORTABLE_MANIFEST.json'),'utf8')),manifest);
  const entry=path.join(target,'scripts/iran-progress/english-r5-published-preview-r6.mjs');
  const testImport=spawnSync(process.execPath,['--input-type=module','-e',
   `import(${JSON.stringify(new URL(`file://${entry}`).href)}).then(m=>{if(typeof m.runEnglishR5PublishedPreview!=='function')process.exit(2)})`],
  {cwd:temp,encoding:'utf8',timeout:30000});
  assert.equal(testImport.status,0,testImport.stderr);
  assert.throws(()=>buildPortableR6(target),/IRAN_R6_PORTABLE_OUTPUT_ALREADY_EXISTS/);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('R6 builder has no hidden root project dependencies',()=>{
 const list=portableR6FileList();
 assert.ok(list.length>=10);
 assert.ok(list.every(file=>/^(?:lib|scripts|worker|docs|RUN_)/.test(file)));
 assert.ok(list.every(file=>!/(?:\.env|node_modules|\.sqlite|secret|token)/i.test(file)));
 assert.ok(fs.existsSync(path.join(repository,'AGENTS.md')));
});
