import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathIdentity} from '../scripts/pc-writer/market-calendar-r16-origin-lineage.mjs';
import {runR17} from '../scripts/pc-writer/market-calendar-r17-bls-apply.mjs';

const digest=value=>createHash('sha256').update(value).digest('hex');
function fixture({staleConfig=false,candidateBad=false}={}){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r17-'));
 const checkout=path.join(tmp,'checkout'),dataRoot=path.join(tmp,'data'),scheduled=path.join(tmp,'scheduler');
 fs.mkdirSync(path.join(checkout,'lib'),{recursive:true});
 fs.mkdirSync(path.join(checkout,'scripts','pc-writer'),{recursive:true});
 fs.mkdirSync(dataRoot);fs.mkdirSync(scheduled);
 const git=(args)=>execFileSync('git',args,{cwd:checkout,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git(['init','-q']);git(['config','user.name','R17 local test']);git(['config','user.email','r17@example.invalid']);
 const parser=path.join(checkout,'lib','release-calendar.mjs');
 fs.writeFileSync(parser,'export const source="original";\n');
 const local=path.join(checkout,'scripts','pc-writer','local-cycle.mjs');fs.writeFileSync(local,'// cycle fixture');
 git(['add','lib/release-calendar.mjs','scripts/pc-writer/local-cycle.mjs']);git(['commit','-qm','initial verified']);
 const approved=git(['rev-parse','HEAD']),blob=git(['hash-object','lib/release-calendar.mjs']);
 const candidatePath=path.join(tmp,'candidate.mjs');fs.writeFileSync(candidatePath,'export const source="bls-only";\n');
 const origin=path.join(tmp,'backup','run-local-core.vbs');fs.mkdirSync(path.dirname(origin),{recursive:true});
 fs.writeFileSync(origin,`WScript.Quit shell.Run("""node.exe"" ""${local}"" --publish", 0, True)`);
 const wrapper=path.join(scheduled,'run-local-core.vbs');
 fs.writeFileSync(wrapper,`' ZGMINI_R38_WRAPPER_V1\norigin = "${origin}"\ndispatcher = "${path.join(tmp,'dispatcher.mjs')}"\n`);
 const write=(name,value)=>fs.writeFileSync(path.join(dataRoot,name),JSON.stringify(value));
 write('config.json',{source:staleConfig?'abcdef123456':approved,enabled:true,collectionTarget:'pc',keep:'untouched'});
 write('local-writer-last-run.json',{source:approved,mode:'PUBLISH',status:'VERIFIED'});
 write('local-publication-ledger.json',{source:approved,status:'VERIFIED'});
 const expectedWorktreeId=pathIdentity(checkout);
 const getLineage=()=>({decision:'ORIGIN_RUNTIME_ALIGNED_BLS_NEXT_STAGE_READY_NO_CHANGES_MADE',origin:{rootId:expectedWorktreeId,head:approved,parserBlob:blob}});
 const getTaskXml=()=>`<Task><Arguments>&quot;${wrapper}&quot;</Arguments></Task>`;
 const input={dataRoot,candidatePath,getTaskXml,getLineage,approvedSource:approved,expectedWorktreeId,
  expectedBaselineBlob:blob,expectedCandidateSha256:candidateBad?'0'.repeat(64):digest(fs.readFileSync(candidatePath))};
 return {tmp,checkout,dataRoot,parser,approved,git,run:apply=>runR17({...input,apply})};
}

test('R17 single-file preflight is read-only',()=>{
 const f=fixture();
 try{
  const r=f.run(false);
  assert.equal(r.decision,'BLS_SINGLE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE');
  assert.equal(f.git(['rev-parse','HEAD']),f.approved);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.dataRoot,'config.json'))).source,f.approved);
  assert.equal(fs.existsSync(path.join(f.dataRoot,'local-cycle.lock')),false);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R17 installs a single-file commit, aligns config, leaves writer/ledger untouched and preserves backups',()=>{
 const f=fixture();
 try{
  const writerBefore=fs.readFileSync(path.join(f.dataRoot,'local-writer-last-run.json'));
  const ledgerBefore=fs.readFileSync(path.join(f.dataRoot,'local-publication-ledger.json'));
  const r=f.run(true);
  assert.equal(r.decision,'BLS_INSTALLED_WAIT_NEXT_REGULAR_VERIFIED_CYCLE',JSON.stringify(r));
  assert.equal(f.git(['rev-parse','HEAD']),r.newSource);
  assert.equal(f.git(['rev-parse','HEAD^']),f.approved);
  assert.equal(f.git(['diff','--name-only',f.approved,r.newSource]),'lib/release-calendar.mjs');
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.dataRoot,'config.json'))).source,r.newSource);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.dataRoot,'config.json'))).keep,'untouched');
  assert.equal(fs.existsSync(path.join(f.dataRoot,'local-cycle.lock')),false);
  assert.deepEqual(fs.readFileSync(path.join(f.dataRoot,'local-writer-last-run.json')),writerBefore);
  assert.deepEqual(fs.readFileSync(path.join(f.dataRoot,'local-publication-ledger.json')),ledgerBefore);
  assert.equal(r.backupCreated,true);
  assert.equal(fs.existsSync(path.join(f.dataRoot,'market-calendar-r17-backups',r.backupId,'release-calendar.mjs')),true);
  assert.ok(!JSON.stringify(r).includes(f.tmp));
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R17 fails closed without modifying source on stale config or wrong candidate',()=>{
 for(const opts of [{staleConfig:true},{candidateBad:true}]){
  const f=fixture(opts);
  try{
   const result=f.run(true);
   assert.match(result.decision,/_STOP$/,JSON.stringify(opts));
   assert.equal(f.git(['rev-parse','HEAD']),f.approved);
   assert.equal(fs.existsSync(path.join(f.dataRoot,'local-cycle.lock')),false);
  }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
 }
});

test('R17 never replaces an existing Core lock',()=>{
 const f=fixture();
 try{
  const lock=path.join(f.dataRoot,'local-cycle.lock'),contents='{"pid":4321,"owner":"existing"}';
  fs.writeFileSync(lock,contents);
  const result=f.run(true);
  assert.equal(result.decision,'BLS_INSTALL_ABORTED_OR_RESTORED_STOP');
  assert.equal(fs.readFileSync(lock,'utf8'),contents);
  assert.equal(f.git(['rev-parse','HEAD']),f.approved);
  assert.equal(result.backupCreated,false);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});
