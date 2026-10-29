import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {applyPinnedFiles,runR78}
 from '../scripts/pc-writer/theme-ten-r78-repair-and-retry.mjs';

const hash=s=>createHash('sha256').update(s).digest('hex');
const targets=['scripts/pc-writer/theme-nine-r51-provisional-overlay.mjs',
 'worker/theme-nine-r37-public.mjs'];
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r78-fix-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const install=path.join(dir,'installed'),payload=path.join(dir,'bundle');
 const specs=targets.map((name,i)=>{
  const old=Buffer.from('old test source '+i+'\n');
  const next=Buffer.from('new test source '+i+'\n');
  for(const root of [install,payload])fs.mkdirSync(path.dirname(path.join(root,name)),{
   recursive:true});
  fs.writeFileSync(path.join(install,name),old);
  fs.writeFileSync(path.join(payload,name),next);
  return {name,was:hash(old),now:hash(next)};
 });
 return {dir,install,payload,specs};
}

test('R78 safely upgrades only the two pinned files, verifies backups and is idempotent',t=>{
 const f=fixture(t);
 const installed=applyPinnedFiles({installRoot:f.install,
  payloadRoot:f.payload,sources:f.specs});
 assert.equal(installed.changed,2);
 assert.deepEqual(installed.files,targets);
 for(const s of f.specs){
  assert.equal(hash(fs.readFileSync(path.join(f.install,s.name))),s.now);
  assert.equal(hash(fs.readFileSync(path.join(f.install,s.name+'.R78_BACKUP'))),s.was);
 }
 assert.equal(applyPinnedFiles({installRoot:f.install,
  payloadRoot:f.payload,sources:f.specs}).changed,0);
});

test('R78 rejects any unknown installed SHA without writing either target',t=>{
 const f=fixture(t);
 fs.writeFileSync(path.join(f.install,targets[1]),'unexpected source\n');
 assert.throws(()=>applyPinnedFiles({installRoot:f.install,
  payloadRoot:f.payload,sources:f.specs}),/R78_UNKNOWN_INSTALLED_SHA/);
 assert.equal(hash(fs.readFileSync(path.join(f.install,targets[0]))),f.specs[0].was);
 assert.equal(fs.existsSync(path.join(f.install,targets[0]+'.R78_BACKUP')),false);
});

test('R78 refuses missing public date before installing or publishing',async t=>{
 const f=fixture(t);
 const root=path.join(f.dir,'pc');
 fs.mkdirSync(path.join(root,'themes','legacy-nine-r48-private-candidate'),{
  recursive:true});
 const report=await runR78({dataRoot:root,platform:'win32',
  now:new Date('2026-10-29T15:00:00Z'),
  fetchImpl:async()=>({ok:true,json:async()=>({status:'READY',
   confirmedObservationDate:'2026-10-28'})}),
  retry:()=>{throw Error('MUST_NOT_EXECUTE');}});
 assert.equal(report.status,'STOP_R78_PREFLIGHT');
 assert.equal(report.reason,'EXACT_DATED_PRIVATE_CANDIDATE_MISSING');
 assert.equal(report.changed,0);
});

test('R78 CMD remains ASCII CRLF, with explicit RUN confirmation',()=>{
 const s=fs.readFileSync(new URL('../scripts/pc-writer/THEME_TEN_R78_REPAIR_AND_PUBLISH_ONCE.cmd',
  import.meta.url));
 assert.equal(s.includes(Buffer.from('Type RUN')),true);
 assert.equal(s.toString('ascii').includes('theme-ten-r78-repair-and-retry.mjs'),true);
 assert.doesNotMatch(s.toString('utf8'),/[^\x00-\x7f]|(?<!\r)\n/);
});
