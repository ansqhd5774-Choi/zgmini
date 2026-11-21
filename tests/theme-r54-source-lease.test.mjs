import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {acquireR54SourceLease,withR54SourceLease,
 withR54SourceLeaseSync} from '../scripts/pc-writer/r54-source-lease.mjs';

function fixture(t){
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'r54-source-lease-'));
 t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));
 return path.join(parent,'R54_B_SOURCE_EXCLUSIVE.lock');
}

test('two Node entrypoints cannot hold R54 source lease concurrently',t=>{
 const lockDir=fixture(t);
 const first=acquireR54SourceLease({lockDir});
 assert.throws(()=>acquireR54SourceLease({lockDir}),
  /R54_SOURCE_LEASE_HELD/);
 first.release();
 const second=acquireR54SourceLease({lockDir});
 second.release();
});

test('separate Node processes cannot bypass active B lease via timing',t=>{
 const lockDir=fixture(t);
 const bMaintainer=acquireR54SourceLease({lockDir});
 const moduleUrl=new URL('../scripts/pc-writer/r54-source-lease.mjs',import.meta.url).href;
 const code=`import {acquireR54SourceLease} from ${JSON.stringify(moduleUrl)};\n`+
  `try{acquireR54SourceLease({lockDir:${JSON.stringify(lockDir)}});`+
  `process.exit(1)}catch(e){process.exit(e.code==='R54_SOURCE_LEASE_HELD'?0:2)}`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',code],{
  encoding:'utf8',timeout:10000});
 assert.equal(result.status,0,result.stderr);
 bMaintainer.release();
});

test('async publisher is guarded across its whole awaited operation',async t=>{
 const lockDir=fixture(t);
 let releasePublisher;
 let signalStarted;
 const started=new Promise(r=>{signalStarted=r;});
 const finish=new Promise(r=>{releasePublisher=r;});
 const publishing=withR54SourceLease(async()=>{
  signalStarted();
  await finish;
  return 'PUBLISHED';
 },{lockDir});
 await started;
 assert.throws(()=>acquireR54SourceLease({lockDir}),
  /R54_SOURCE_LEASE_HELD/);
 releasePublisher();
 assert.equal(await publishing,'PUBLISHED');
 assert.doesNotThrow(()=>withR54SourceLeaseSync(()=>42,{lockDir}));
});

test('R78/R80 source mutator cannot write once B maintainer has lease',t=>{
 const lockDir=fixture(t);
 const writerRoot=path.dirname(lockDir);
 const target=path.join(writerRoot,'target.mjs');
 fs.writeFileSync(target,'original');
 const maintenance=acquireR54SourceLease({lockDir});
 assert.throws(()=>withR54SourceLeaseSync(()=>{
  fs.writeFileSync(target,'modified');
 },{lockDir}),/R54_SOURCE_LEASE_HELD/);
 assert.equal(fs.readFileSync(target,'utf8'),'original');
 maintenance.release();
 withR54SourceLeaseSync(()=>fs.writeFileSync(target,'after'),{lockDir});
 assert.equal(fs.readFileSync(target,'utf8'),'after');
});

test('source crash leaves durable fail-closed lock; no auto-steal',t=>{
 const lockDir=fixture(t);
 fs.mkdirSync(lockDir);
 fs.writeFileSync(path.join(lockDir,'OWNER.json'),'orphan');
 assert.throws(()=>acquireR54SourceLease({lockDir}),
  /R54_SOURCE_LEASE_HELD/);
 assert.ok(fs.existsSync(lockDir));
});

test('owner alteration must not release another holder',t=>{
 const lockDir=fixture(t);
 const lease=acquireR54SourceLease({lockDir});
 fs.writeFileSync(lease.owner,'replaced');
 assert.throws(()=>lease.release(),/R54_SOURCE_LEASE_RELEASE_UNCERTAIN/);
 assert.ok(fs.existsSync(lockDir));
});

test('callback error releases own lease for safe later usage',t=>{
 const lockDir=fixture(t);
 assert.throws(()=>withR54SourceLeaseSync(()=>{throw Error('injected');},
  {lockDir}),/injected/);
 const next=acquireR54SourceLease({lockDir});
 next.release();
});


const sourceDir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),
 '../scripts/pc-writer');
const read=name=>fs.readFileSync(path.join(sourceDir,name),'utf8');

test('exported R54 connector always acquires the common exclusive lease',()=>{
 const s=read('theme-nine-r54-public-connect.mjs');
 assert.match(s,/import\s*\{withR54SourceLease\}\s*from\s*['"]\.\/r54-source-lease\.mjs['"]/);
 assert.match(s,/export async function runNineR54PublicConnect\(options=\{\}\)\{\s*return withR54SourceLease\(\(\)=>runNineR54PublicConnectUnprotected\(options\)\)/);
});

test('R78 exported source mutator guards the complete file-write operation',()=>{
 const s=read('theme-ten-r78-repair-and-retry.mjs');
 assert.match(s,/import\s*\{withR54SourceLeaseSync\}\s*from\s*['"]\.\/r54-source-lease\.mjs['"]/);
 assert.match(s,/export function applyPinnedFiles\(options=\{\}\)\{\s*return withR54SourceLeaseSync\(\(\)=>applyPinnedFilesUnprotected\(options\)\)/);
});

test('R80 exported source mutator guards the complete file-write operation',()=>{
 const s=read('theme-ten-r80-rebase-once.mjs');
 assert.match(s,/import\s*\{withR54SourceLeaseSync\}\s*from\s*['"]\.\/r54-source-lease\.mjs['"]/);
 assert.match(s,/export function pinnedInstall\(options=\{\}\)\{\s*return withR54SourceLeaseSync\(\(\)=>pinnedInstallUnprotected\(options\)\)/);
});
