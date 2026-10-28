import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {runR24} from '../scripts/pc-writer/market-calendar-r24-usda-apply.mjs';
import {worktreeIdentity} from '../scripts/pc-writer/market-calendar-r19-bea-apply.mjs';

const r23Parser=new URL('../staging/market-calendar/r23-eia/lib/release-calendar.mjs',import.meta.url);
const r23Eia=new URL('../staging/market-calendar/r23-eia/lib/eia-calendar.mjs',import.meta.url);
const r23Collector=new URL('../staging/market-calendar/r23-eia/scripts/pc-writer/release-calendar.mjs',import.meta.url);
const r24Parser=new URL('../staging/market-calendar/r24-usda/lib/release-calendar.mjs',import.meta.url);
const r24Usda=new URL('../staging/market-calendar/r24-usda/lib/usda-calendar.mjs',import.meta.url);
const r24Collector=new URL('../staging/market-calendar/r24-usda/scripts/pc-writer/release-calendar.mjs',import.meta.url);
const crlf=bytes=>Buffer.from(bytes.toString('utf8').replace(/\r?\n/g,'\r\n'));

function fixture({dirty=false,staleConfig=false,wrongSource=false,unknownCore=false,badCandidate=false,preexistingUsda=false,takenLock=false}={}){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r24-'));
 const root=path.join(tmp,'core'),dataRoot=path.join(tmp,'data');
 const parser=path.join(root,'lib','release-calendar.mjs');
 const eia=path.join(root,'lib','eia-calendar.mjs');
 const usda=path.join(root,'lib','usda-calendar.mjs');
 const collector=path.join(root,'scripts','pc-writer','release-calendar.mjs');
 const runner=path.join(root,'scripts','pc-writer','local-cycle.mjs');
 fs.mkdirSync(path.dirname(parser),{recursive:true});
 fs.mkdirSync(path.dirname(collector),{recursive:true});
 fs.mkdirSync(dataRoot);
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git(['init','-q']);git(['config','user.name','R24 fixture']);git(['config','user.email','r24@example.invalid']);
 fs.copyFileSync(r23Parser,parser);
 fs.copyFileSync(r23Eia,eia);
 fs.writeFileSync(collector,crlf(fs.readFileSync(r23Collector)));
 fs.writeFileSync(runner,'// user protected local runner\n');
 git(['add','lib/release-calendar.mjs','lib/eia-calendar.mjs','scripts/pc-writer/release-calendar.mjs','scripts/pc-writer/local-cycle.mjs']);
 git(['commit','-qm','Installed R23 baseline']);
 const approved=git(['rev-parse','HEAD']);
 const configFile=path.join(dataRoot,'config.json');
 fs.writeFileSync(configFile,JSON.stringify({enabled:true,collectionTarget:'pc',source:staleConfig?'0'.repeat(40):approved,untouched:true},null,2));
 const ledger=path.join(dataRoot,'history.json');fs.writeFileSync(ledger,'{"keep":true}');
 if(dirty)fs.appendFileSync(runner,'// user dirty\n');
 if(preexistingUsda)fs.writeFileSync(usda,'// user module\n');
 if(takenLock)fs.writeFileSync(path.join(dataRoot,'local-cycle.lock'),'existing lock');
 const opts={dataRoot,getCoreRoot:()=>root,getTaskXml:()=>'<Task/>',
  approvedSource:wrongSource?'0'.repeat(40):approved,
  expectedWorktreeId:unknownCore?'wrong':worktreeIdentity(root),
  parserCandidatePath:badCandidate?r23Parser:r24Parser};
 return {tmp,root,dataRoot,parser,eia,usda,collector,runner,configFile,ledger,git,approved,run:apply=>runR24({...opts,apply})};
}

test('R24 preflight checks exact R23 baseline and never writes operational files',()=>{
 const f=fixture();
 try{
  const before=[fs.readFileSync(f.parser),fs.readFileSync(f.eia),fs.readFileSync(f.collector),fs.readFileSync(f.configFile)];
  const result=f.run(false);
  assert.equal(result.decision,'R24_THREE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE',JSON.stringify(result));
  assert.deepEqual(result.changedFiles,['lib/release-calendar.mjs','lib/usda-calendar.mjs','scripts/pc-writer/release-calendar.mjs']);
  assert.deepEqual([fs.readFileSync(f.parser),fs.readFileSync(f.eia),fs.readFileSync(f.collector),fs.readFileSync(f.configFile)],before);
  assert.equal(f.git(['rev-parse','HEAD']),f.approved);
  assert.equal(fs.existsSync(f.usda),false);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R24 installs exactly three USDA files with backup, source update, unchanged EIA',()=>{
 const f=fixture();
 try{
  const eiaBefore=fs.readFileSync(f.eia),ledgerBefore=fs.readFileSync(f.ledger),runnerBefore=fs.readFileSync(f.runner);
  const result=f.run(true);
  assert.equal(result.decision,'R24_USDA_CALENDAR_INSTALLED_NO_FORCED_COLLECTION',JSON.stringify(result));
  assert.equal(result.phase,'INSTALLED');
  assert.equal(f.git(['rev-parse','HEAD^']),f.approved);
  assert.equal(f.git(['diff','--name-only',f.approved,result.newSource]),
   'lib/release-calendar.mjs\nlib/usda-calendar.mjs\nscripts/pc-writer/release-calendar.mjs');
  assert.deepEqual(fs.readFileSync(f.parser),fs.readFileSync(r24Parser));
  assert.deepEqual(fs.readFileSync(f.usda),fs.readFileSync(r24Usda));
  assert.deepEqual(fs.readFileSync(f.collector),crlf(fs.readFileSync(r24Collector)));
  assert.deepEqual(fs.readFileSync(f.eia),eiaBefore);
  assert.deepEqual(fs.readFileSync(f.ledger),ledgerBefore);
  assert.deepEqual(fs.readFileSync(f.runner),runnerBefore);
  assert.equal(JSON.parse(fs.readFileSync(f.configFile)).source,result.newSource);
  assert.equal(JSON.parse(fs.readFileSync(f.configFile)).untouched,true);
  assert.ok(fs.existsSync(path.join(f.dataRoot,'market-calendar-r24-backups',result.backupId,'release-calendar-parser.mjs')));
  assert.ok(fs.existsSync(path.join(f.dataRoot,'market-calendar-r24-backups',result.backupId,'release-calendar-collector.mjs')));
  assert.equal(result.gitPushed,false);assert.equal(result.publisherExecuted,false);
  assert.equal(result.forcedCollection,false);
  assert.equal(fs.existsSync(path.join(f.dataRoot,'local-cycle.lock')),false);
  assert.ok(!JSON.stringify(result).includes(f.tmp));
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R24 occupied Core lock stops without erasing existing lock or touching files',()=>{
 const f=fixture({takenLock:true});
 try{
  const before=[fs.readFileSync(f.parser),fs.readFileSync(f.collector),fs.readFileSync(f.configFile)];
  const result=f.run(true);
  assert.equal(result.decision,'R24_INSTALL_ABORTED_OR_RESTORED_STOP');
  assert.equal(result.errorCode,'CORE_LOCK_ALREADY_EXISTS');
  assert.equal(fs.readFileSync(path.join(f.dataRoot,'local-cycle.lock'),'utf8'),'existing lock');
  assert.deepEqual([fs.readFileSync(f.parser),fs.readFileSync(f.collector),fs.readFileSync(f.configFile)],before);
  assert.equal(fs.existsSync(f.usda),false);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R24 rejects changed source, dirty Core, invalid worktree and tampered candidate',()=>{
 for(const flags of [{staleConfig:true},{dirty:true},{wrongSource:true},{unknownCore:true},{badCandidate:true},{preexistingUsda:true}]){
  const f=fixture(flags);
  try{
   const before=[fs.readFileSync(f.parser),fs.readFileSync(f.eia),fs.readFileSync(f.collector),fs.readFileSync(f.configFile)];
   assert.match(f.run(true).decision,/_STOP$/);
   assert.deepEqual([fs.readFileSync(f.parser),fs.readFileSync(f.eia),fs.readFileSync(f.collector),fs.readFileSync(f.configFile)],before);
   assert.equal(f.git(['rev-parse','HEAD']),f.approved);
  }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
 }
});
