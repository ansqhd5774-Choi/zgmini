import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {getD1RuntimeDirty} from '../scripts/pc-writer/market-calendar-nov30-er1-probe-publish.mjs';
import {resolveApprovedProjectSource} from '../scripts/pc-writer/market-calendar-dec31-publish.mjs';

const D1_FILES=['scripts/pc-writer/d1.mjs',
 'scripts/pc-writer/d1-transient.mjs','scripts/pc-writer/d1-diagnostics.mjs'];

function approvedFixture(t){
 const projects=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-er1-d1-'));
 const root=path.join(projects,'zgmini-earnings-history-pc-release');
 fs.mkdirSync(path.join(root,'scripts','pc-writer'),{recursive:true});
 fs.writeFileSync(path.join(root,'README.md'),'baseline\n');
 fs.writeFileSync(path.join(root,'scripts','pc-writer','local-cycle.mjs'),'// marker\n');
 for(const file of D1_FILES)fs.writeFileSync(path.join(root,file),'// approved D1 module\n');
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',
  windowsHide:true,stdio:['ignore','pipe','ignore']}).trim();
 git(['init','--quiet']);
 git(['add','--','README.md','scripts/pc-writer/local-cycle.mjs',...D1_FILES]);
 git(['-c','user.name=ER1 Test','-c','user.email=er1-test@example.invalid',
  'commit','--quiet','-m','fixture']);
 const source=git(['rev-parse','HEAD']);
 t.after(()=>fs.rmSync(projects,{recursive:true,force:true}));
 const resolve=expectedSha=>resolveApprovedProjectSource({projects,
  expectedSha:expectedSha??source,getDirty:getD1RuntimeDirty});
 return {projects,root,source,git,resolve};
}

test('ER1 D1 resolver accepts unrelated tracked edits and preserves pinned source',t=>{
 const f=approvedFixture(t);
 fs.appendFileSync(path.join(f.root,'README.md'),'unrelated local work\n');
 assert.match(f.git(['status','--porcelain']),/README.md/);
 assert.equal(getD1RuntimeDirty(f.root),'');
 assert.equal(f.resolve(),f.root);
 assert.throws(()=>f.resolve('f'.repeat(40)),/DEC31_PUBLISH_PROJECT_SOURCE_OR_DIRTY_STOP/);
});

test('ER1 D1 resolver rejects edits to each runtime module, including staged edits',t=>{
 const f=approvedFixture(t);
 for(const file of D1_FILES){
  const pathname=path.join(f.root,file),before=fs.readFileSync(pathname,'utf8');
  fs.appendFileSync(pathname,'// modified locally\n');
  assert.match(getD1RuntimeDirty(f.root),/d1/);
  assert.throws(()=>f.resolve(),/DEC31_PUBLISH_PROJECT_SOURCE_OR_DIRTY_STOP/);
  fs.writeFileSync(pathname,before);
 }
 assert.equal(getD1RuntimeDirty(f.root),'');
 fs.appendFileSync(path.join(f.root,D1_FILES[1]),'// staged modification\n');
 f.git(['add','--',D1_FILES[1]]);
 assert.throws(()=>f.resolve(),/DEC31_PUBLISH_PROJECT_SOURCE_OR_DIRTY_STOP/);
});

test('ER1 D1 resolver cannot load an untracked runtime dependency',t=>{
 const f=approvedFixture(t);
 f.git(['rm','--cached','--',D1_FILES[2]]);
 assert.throws(()=>getD1RuntimeDirty(f.root),/NOV30_ER1_D1_RUNTIME_SOURCE_UNTRACKED_STOP/);
 assert.throws(()=>f.resolve(),/NOV30_ER1_D1_RUNTIME_SOURCE_UNTRACKED_STOP/);
});
