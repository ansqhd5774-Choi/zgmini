import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {runR19,coreRootFromTask,worktreeIdentity} from '../scripts/pc-writer/market-calendar-r19-bea-apply.mjs';

const digest=v=>createHash('sha256').update(v).digest('hex');
const blsFile=new URL('../staging/market-calendar/r11-bls/lib/release-calendar.mjs',import.meta.url);
const beaFile=new URL('../staging/market-calendar/r19-bea/lib/release-calendar.mjs',import.meta.url);
const candidate=fs.readFileSync(beaFile);
function fixture({staleConfig=false,badCandidate=false,dirty=false}={}){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r19-'));
 const checkout=path.join(tmp,'repo'),dataRoot=path.join(tmp,'data'),scheduler=path.join(tmp,'scheduler');
 const parser=path.join(checkout,'lib','release-calendar.mjs'),script=path.join(checkout,'scripts','pc-writer','local-cycle.mjs');
 fs.mkdirSync(path.dirname(parser),{recursive:true});
 fs.mkdirSync(path.dirname(script),{recursive:true});
 fs.mkdirSync(dataRoot);fs.mkdirSync(scheduler);
 const git=args=>execFileSync('git',args,{cwd:checkout,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git(['init','-q']);git(['config','user.name','R19 fixture']);git(['config','user.email','r19@example.invalid']);
 fs.copyFileSync(blsFile,parser);fs.writeFileSync(script,'// Existing publisher preserved\n');
 git(['add','lib/release-calendar.mjs','scripts/pc-writer/local-cycle.mjs']);
 git(['commit','-qm','BLS installed baseline']);
 const approved=git(['rev-parse','HEAD']);
 const config={enabled:true,collectionTarget:'pc',source:staleConfig?'0'.repeat(40):approved,other:'preserved'};
 const configFile=path.join(dataRoot,'config.json');
 fs.writeFileSync(configFile,JSON.stringify(config,null,2));
 const ledger=path.join(dataRoot,'local-publication-ledger.json');
 fs.writeFileSync(ledger,'{"status":"VERIFIED","retain":"untouched"}');
 if(dirty)fs.appendFileSync(script,'// Concurrent edit\n');
 const origin=path.join(tmp,'origin','run-local-core.vbs');
 fs.mkdirSync(path.dirname(origin),{recursive:true});
 fs.writeFileSync(origin,'WScript.Quit shell.Run("""node.exe"" ""'+script+'"" --publish",0,True)');
 const wrapper=path.join(scheduler,'run-local-core.vbs');
 fs.writeFileSync(wrapper,'\' ZGMINI_R38_WRAPPER_V1\norigin = "'+origin+'"\n');
 const xml='<Task><Arguments>&quot;'+wrapper+'&quot;</Arguments></Task>';
 const input={dataRoot,getTaskXml:()=>xml,approvedSource:approved,expectedWorktreeId:worktreeIdentity(checkout),
  expectedBaselineSha256:digest(fs.readFileSync(blsFile)),
  expectedCandidateSha256:badCandidate?'0'.repeat(64):digest(candidate)};
 return {tmp,checkout,dataRoot,parser,script,configFile,ledger,git,approved,input,xml,run:apply=>runR19({...input,apply})};
}

test('R19 resolves the exact registered R38 origin without running it',()=>{
 const f=fixture();
 try{
  assert.equal(coreRootFromTask(f.xml),f.checkout);
  assert.equal(coreRootFromTask('<Task><Arguments>unknown</Arguments></Task>'),null);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R19 preflight is strictly read only and does not collect or publish',()=>{
 const f=fixture();
 try{
  const before=fs.readFileSync(f.parser),config=fs.readFileSync(f.configFile),ledger=fs.readFileSync(f.ledger);
  const result=f.run(false);
  assert.equal(result.decision,'BEA_SINGLE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE',JSON.stringify(result));
  assert.deepEqual(fs.readFileSync(f.parser),before);
  assert.deepEqual(fs.readFileSync(f.configFile),config);
  assert.deepEqual(fs.readFileSync(f.ledger),ledger);
  assert.equal(f.git(['rev-parse','HEAD']),f.approved);
  assert.equal(fs.existsSync(path.join(f.dataRoot,'local-cycle.lock')),false);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R19 installs BEA as exactly one local commit, preserves BLS parent, ledger and backup',()=>{
 const f=fixture();
 try{
  const ledger=fs.readFileSync(f.ledger),publisher=fs.readFileSync(f.script);
  const result=f.run(true);
  assert.equal(result.decision,'BEA_INSTALLED_IN_EXISTING_PC_SOURCE_NO_FORCED_COLLECTION',JSON.stringify(result));
  assert.equal(f.git(['rev-parse','HEAD']),result.newSource);
  assert.equal(f.git(['rev-parse','HEAD^']),f.approved);
  assert.equal(f.git(['diff','--name-only',f.approved,result.newSource]),'lib/release-calendar.mjs');
  assert.deepEqual(fs.readFileSync(f.parser),candidate);
  assert.deepEqual(fs.readFileSync(f.ledger),ledger);
  assert.deepEqual(fs.readFileSync(f.script),publisher);
  assert.equal(JSON.parse(fs.readFileSync(f.configFile)).source,result.newSource);
  assert.equal(JSON.parse(fs.readFileSync(f.configFile)).other,'preserved');
  assert.ok(fs.existsSync(path.join(f.dataRoot,'market-calendar-r19-backups',result.backupId,'release-calendar.mjs')));
  assert.equal(fs.existsSync(path.join(f.dataRoot,'local-cycle.lock')),false);
  assert.equal(result.gitPushed,false);assert.equal(result.publisherExecuted,false);assert.equal(result.liveMonitored,false);
  assert.ok(!JSON.stringify(result).includes(f.tmp));
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R19 fails closed if config, candidate or protected source differs',()=>{
 for(const options of [{staleConfig:true},{badCandidate:true},{dirty:true}]){
  const f=fixture(options);
  try{
   const before=fs.readFileSync(f.parser);
   const result=f.run(true);
   assert.match(result.decision,/_STOP$/);
   assert.deepEqual(fs.readFileSync(f.parser),before);
   assert.equal(f.git(['rev-parse','HEAD']),f.approved);
  }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
 }
});

test('R19 never replaces an existing Core lock',()=>{
 const f=fixture();
 try{
  const lock=path.join(f.dataRoot,'local-cycle.lock'),previous='{"owner":"other-run"}';
  fs.writeFileSync(lock,previous);
  const result=f.run(true);
  assert.equal(result.decision,'BEA_INSTALL_ABORTED_OR_RESTORED_STOP');
  assert.equal(fs.readFileSync(lock,'utf8'),previous);
  assert.equal(f.git(['rev-parse','HEAD']),f.approved);
  assert.equal(result.backupCreated,false);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});
