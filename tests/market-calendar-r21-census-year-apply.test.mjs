import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {runR21} from '../scripts/pc-writer/market-calendar-r21-year-apply.mjs';
import {worktreeIdentity} from '../scripts/pc-writer/market-calendar-r19-bea-apply.mjs';

const digest=b=>createHash('sha256').update(b).digest('hex');
const r20Parser=new URL('../staging/market-calendar/r20-census/lib/release-calendar.mjs',import.meta.url);
const currentCollector=new URL('../scripts/pc-writer/release-calendar.mjs',import.meta.url);
const candidate=new URL('../staging/market-calendar/r21-census-year/scripts/pc-writer/release-calendar.mjs',import.meta.url);

function fixture({staleConfig=false,dirty=false,badCandidate=false,badCore=false}={}){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r21-'));
 const checkout=path.join(tmp,'repo'),dataRoot=path.join(tmp,'data'),scheduler=path.join(tmp,'scheduler');
 const parser=path.join(checkout,'lib','release-calendar.mjs');
 const collector=path.join(checkout,'scripts','pc-writer','release-calendar.mjs');
 const runner=path.join(checkout,'scripts','pc-writer','local-cycle.mjs');
 fs.mkdirSync(path.dirname(parser),{recursive:true});fs.mkdirSync(path.dirname(collector),{recursive:true});
 fs.mkdirSync(dataRoot);fs.mkdirSync(scheduler);
 const git=args=>execFileSync('git',args,{cwd:checkout,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git(['init','-q']);git(['config','user.name','R21 fixture']);git(['config','user.email','r21@example.invalid']);
 fs.copyFileSync(r20Parser,parser);fs.copyFileSync(currentCollector,collector);
 fs.writeFileSync(runner,'// Preserve the registered PC Core runner\n');
 git(['add','lib/release-calendar.mjs','scripts/pc-writer/release-calendar.mjs','scripts/pc-writer/local-cycle.mjs']);
 git(['commit','-qm','R20 installed baseline']);
 const approved=git(['rev-parse','HEAD']);
 const configFile=path.join(dataRoot,'config.json');
 fs.writeFileSync(configFile,JSON.stringify({enabled:true,collectionTarget:'pc',source:staleConfig?'0'.repeat(40):approved,untouched:true},null,2));
 const ledger=path.join(dataRoot,'local-publication-ledger.json');fs.writeFileSync(ledger,'{"preserve":true}');
 if(dirty)fs.appendFileSync(runner,'// User change\n');
 const input={dataRoot,getCoreRoot:()=>checkout,getTaskXml:()=>'<Task><Arguments>no-op</Arguments></Task>',
  approvedSource:approved,expectedWorktreeId:badCore?'another-core':worktreeIdentity(checkout),
  expectedParserSha256:digest(fs.readFileSync(r20Parser)),
  expectedBaselineSha256:digest(fs.readFileSync(currentCollector)),
  expectedCandidateSha256:badCandidate?'0'.repeat(64):digest(fs.readFileSync(candidate))};
 return {tmp,checkout,collector,parser,runner,configFile,ledger,dataRoot,git,approved,run:apply=>runR21({...input,apply})};
}

test('R21 preflight does not alter the approved PC source or the input ledger',()=>{
 const f=fixture();
 try{
  const before=fs.readFileSync(f.collector),config=fs.readFileSync(f.configFile),ledger=fs.readFileSync(f.ledger);
  const result=f.run(false);
  assert.equal(result.decision,'R21_SINGLE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE',JSON.stringify(result));
  assert.deepEqual(fs.readFileSync(f.collector),before);
  assert.deepEqual(fs.readFileSync(f.configFile),config);assert.deepEqual(fs.readFileSync(f.ledger),ledger);
  assert.equal(f.git(['rev-parse','HEAD']),f.approved);
  assert.equal(fs.existsSync(path.join(f.dataRoot,'local-cycle.lock')),false);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R21 installs precisely one collector file after R20 with an owned lock and a backup',()=>{
 const f=fixture();
 try{
  const parser=fs.readFileSync(f.parser),runner=fs.readFileSync(f.runner),ledger=fs.readFileSync(f.ledger);
  const result=f.run(true);
  assert.equal(result.decision,'R21_CENSUS_YEAR_INSTALLED_NO_FORCED_COLLECTION',JSON.stringify(result));
  assert.equal(result.phase,'INSTALLED');assert.equal(f.git(['rev-parse','HEAD']),result.newSource);
  assert.equal(f.git(['rev-parse','HEAD^']),f.approved);
  assert.equal(f.git(['diff','--name-only',f.approved,result.newSource]),'scripts/pc-writer/release-calendar.mjs');
  assert.deepEqual(fs.readFileSync(f.collector),fs.readFileSync(candidate));
  assert.deepEqual(fs.readFileSync(f.parser),parser);assert.deepEqual(fs.readFileSync(f.runner),runner);
  assert.deepEqual(fs.readFileSync(f.ledger),ledger);
  assert.equal(JSON.parse(fs.readFileSync(f.configFile)).source,result.newSource);
  assert.equal(JSON.parse(fs.readFileSync(f.configFile)).untouched,true);
  assert.ok(fs.existsSync(path.join(f.dataRoot,'market-calendar-r21-backups',result.backupId,'release-calendar.mjs')));
  assert.equal(result.gitPushed,false);assert.equal(result.publisherExecuted,false);
  assert.equal(result.forcedCollection,false);
  assert.ok(!JSON.stringify(result).includes(f.tmp));
  assert.equal(fs.existsSync(path.join(f.dataRoot,'local-cycle.lock')),false);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R21 never replaces an already-owned Core lock or edits the collector',()=>{
 const f=fixture();
 try{
  const lock=path.join(f.dataRoot,'local-cycle.lock'),owner='{"pid":30580,"purpose":"existing-core-cycle"}';
  fs.writeFileSync(lock,owner);const before=fs.readFileSync(f.collector);
  const result=f.run(true);
  assert.equal(result.decision,'R21_INSTALL_ABORTED_OR_RESTORED_STOP');
  assert.equal(result.errorCode,'CORE_LOCK_ALREADY_EXISTS');
  assert.equal(result.phase,'CORE_LOCK_ACQUIRE');
  assert.equal(fs.readFileSync(lock,'utf8'),owner);
  assert.equal(result.backupCreated,false);
  assert.deepEqual(fs.readFileSync(f.collector),before);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R21 blocks stale config, dirty Core, changed candidate and unknown worktree',()=>{
 for(const opts of [{staleConfig:true},{dirty:true},{badCandidate:true},{badCore:true}]){
  const f=fixture(opts);
  try{
   const before=fs.readFileSync(f.collector);
   assert.match(f.run(true).decision,/_STOP$/);
   assert.deepEqual(fs.readFileSync(f.collector),before);
   assert.equal(f.git(['rev-parse','HEAD']),f.approved);
  }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
 }
});
