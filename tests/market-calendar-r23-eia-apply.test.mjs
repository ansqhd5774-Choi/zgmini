import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {runR23} from '../scripts/pc-writer/market-calendar-r23-eia-apply.mjs';
import {worktreeIdentity} from '../scripts/pc-writer/market-calendar-r19-bea-apply.mjs';

const r22Parser=new URL('../staging/market-calendar/r22-fed-calendar/lib/release-calendar.mjs',import.meta.url);
const r22Collector=new URL('../staging/market-calendar/r22-fed-calendar/scripts/pc-writer/release-calendar.mjs',import.meta.url);
const r23Parser=new URL('../staging/market-calendar/r23-eia/lib/release-calendar.mjs',import.meta.url);
const r23Eia=new URL('../staging/market-calendar/r23-eia/lib/eia-calendar.mjs',import.meta.url);
const r23Collector=new URL('../staging/market-calendar/r23-eia/scripts/pc-writer/release-calendar.mjs',import.meta.url);
const crlf=bytes=>Buffer.from(bytes.toString('utf8').replace(/\r?\n/g,'\r\n'));

function fixture({dirty=false,staleConfig=false,wrongSource=false,unknownCore=false,badCandidate=false,preexistingEia=false}={}){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r23-'));
 const root=path.join(tmp,'core'),dataRoot=path.join(tmp,'data');
 const parser=path.join(root,'lib','release-calendar.mjs');
 const eia=path.join(root,'lib','eia-calendar.mjs');
 const collector=path.join(root,'scripts','pc-writer','release-calendar.mjs');
 const runner=path.join(root,'scripts','pc-writer','local-cycle.mjs');
 fs.mkdirSync(path.dirname(parser),{recursive:true});fs.mkdirSync(path.dirname(collector),{recursive:true});fs.mkdirSync(dataRoot);
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git(['init','-q']);git(['config','user.name','R23 fixture']);git(['config','user.email','r23@example.invalid']);
 fs.copyFileSync(r22Parser,parser);
 fs.writeFileSync(collector,crlf(fs.readFileSync(r22Collector)));
 fs.writeFileSync(runner,'// Original approved Core runner\n');
 git(['add','lib/release-calendar.mjs','scripts/pc-writer/release-calendar.mjs','scripts/pc-writer/local-cycle.mjs']);
 git(['commit','-qm','Installed R22 baseline']);
 const approved=git(['rev-parse','HEAD']);
 const configFile=path.join(dataRoot,'config.json');
 fs.writeFileSync(configFile,JSON.stringify({enabled:true,collectionTarget:'pc',source:staleConfig?'0'.repeat(40):approved,unchanged:true},null,2));
 const ledger=path.join(dataRoot,'local-publication-ledger.json');fs.writeFileSync(ledger,'{"preserve":true}');
 if(dirty)fs.appendFileSync(runner,'// Uncommitted user change\n');
 if(preexistingEia)fs.writeFileSync(eia,'// owned by someone else\n');
 const options={dataRoot,getCoreRoot:()=>root,getTaskXml:()=>'<Task/>',
  approvedSource:wrongSource?'0'.repeat(40):approved,
  expectedWorktreeId:unknownCore?'unknown-worktree':worktreeIdentity(root),
  parserCandidatePath:badCandidate?r22Parser:r23Parser};
 return {tmp,root,dataRoot,parser,eia,collector,runner,configFile,ledger,git,approved,
  run:apply=>runR23({...options,apply})};
}

test('R23 preflight is read-only for source, config, ledger and locks',()=>{
 const f=fixture();
 try{
  const parser=fs.readFileSync(f.parser),collector=fs.readFileSync(f.collector),config=fs.readFileSync(f.configFile);
  const result=f.run(false);
  assert.equal(result.decision,'R23_THREE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE',JSON.stringify(result));
  assert.deepEqual(result.changedFiles,['lib/eia-calendar.mjs','lib/release-calendar.mjs','scripts/pc-writer/release-calendar.mjs']);
  assert.deepEqual(fs.readFileSync(f.parser),parser);assert.deepEqual(fs.readFileSync(f.collector),collector);
  assert.deepEqual(fs.readFileSync(f.configFile),config);
  assert.equal(f.git(['rev-parse','HEAD']),f.approved);
  assert.equal(fs.existsSync(f.eia),false);
  assert.equal(fs.existsSync(path.join(f.dataRoot,'local-cycle.lock')),false);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R23 installs exactly three official EIA files, backs up R22, advances config source',()=>{
 const f=fixture();
 try{
  const ledger=fs.readFileSync(f.ledger),runner=fs.readFileSync(f.runner);
  const result=f.run(true);
  assert.equal(result.decision,'R23_EIA_CALENDAR_INSTALLED_NO_FORCED_COLLECTION',JSON.stringify(result));
  assert.equal(result.phase,'INSTALLED');
  assert.equal(f.git(['rev-parse','HEAD^']),f.approved);
  assert.equal(f.git(['diff','--name-only',f.approved,result.newSource]),'lib/eia-calendar.mjs\nlib/release-calendar.mjs\nscripts/pc-writer/release-calendar.mjs');
  assert.deepEqual(fs.readFileSync(f.parser),fs.readFileSync(r23Parser));
  assert.deepEqual(fs.readFileSync(f.eia),fs.readFileSync(r23Eia));
  assert.deepEqual(fs.readFileSync(f.collector),crlf(fs.readFileSync(r23Collector)));
  assert.deepEqual(fs.readFileSync(f.ledger),ledger);assert.deepEqual(fs.readFileSync(f.runner),runner);
  assert.equal(JSON.parse(fs.readFileSync(f.configFile)).source,result.newSource);
  assert.equal(JSON.parse(fs.readFileSync(f.configFile)).unchanged,true);
  assert.ok(fs.existsSync(path.join(f.dataRoot,'market-calendar-r23-backups',result.backupId,'release-calendar-parser.mjs')));
  assert.ok(fs.existsSync(path.join(f.dataRoot,'market-calendar-r23-backups',result.backupId,'release-calendar-collector.mjs')));
  assert.equal(result.gitPushed,false);assert.equal(result.publisherExecuted,false);
  assert.equal(result.forcedCollection,false);
  assert.equal(fs.existsSync(path.join(f.dataRoot,'local-cycle.lock')),false);
  assert.ok(!JSON.stringify(result).includes(f.tmp));
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R23 respects occupied Core lock without deleting or taking over its ownership',()=>{
 const f=fixture();
 try{
  const lock=path.join(f.dataRoot,'local-cycle.lock');
  const old='{"pid":9999,"purpose":"ordinary-collection"}';fs.writeFileSync(lock,old);
  const parser=fs.readFileSync(f.parser),collector=fs.readFileSync(f.collector);
  const result=f.run(true);
  assert.equal(result.decision,'R23_INSTALL_ABORTED_OR_RESTORED_STOP');
  assert.equal(result.errorCode,'CORE_LOCK_ALREADY_EXISTS');
  assert.equal(fs.readFileSync(lock,'utf8'),old);
  assert.deepEqual(fs.readFileSync(f.parser),parser);assert.deepEqual(fs.readFileSync(f.collector),collector);
  assert.equal(fs.existsSync(f.eia),false);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R23 refuses stale config, dirty Core, unknown source/worktree and tampered candidate',()=>{
 for(const flags of [{staleConfig:true},{dirty:true},{wrongSource:true},{unknownCore:true},{badCandidate:true},{preexistingEia:true}]){
  const f=fixture(flags);
  try{
   const before=[fs.readFileSync(f.parser),fs.readFileSync(f.collector),fs.readFileSync(f.configFile)];
   assert.match(f.run(true).decision,/_STOP$/);
   assert.deepEqual([fs.readFileSync(f.parser),fs.readFileSync(f.collector),fs.readFileSync(f.configFile)],before);
   assert.equal(f.git(['rev-parse','HEAD']),f.approved);
  }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
 }
});
