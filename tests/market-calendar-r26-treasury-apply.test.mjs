import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {runR26} from '../scripts/pc-writer/market-calendar-r26-treasury-apply.mjs';
import {worktreeIdentity} from '../scripts/pc-writer/market-calendar-r19-bea-apply.mjs';

const base=new URL('../staging/market-calendar/r25-cftc/',import.meta.url);
const candidate=new URL('../staging/market-calendar/r26-treasury/',import.meta.url);
const r23Eia=new URL('../staging/market-calendar/r23-eia/lib/eia-calendar.mjs',import.meta.url);
const r24Usda=new URL('../staging/market-calendar/r24-usda/lib/usda-calendar.mjs',import.meta.url);
const crlf=bytes=>Buffer.from(bytes.toString('utf8').replace(/\r?\n/g,'\r\n'));

function fixture({dirty=false,staleConfig=false,wrongSource=false,badCandidate=false,existingTreasury=false,takenLock=false,tamperedCftc=false}={}){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r26-'));
 const root=path.join(temp,'core'),dataRoot=path.join(temp,'data');
 const paths={parser:path.join(root,'lib/release-calendar.mjs'),
  eia:path.join(root,'lib/eia-calendar.mjs'),usda:path.join(root,'lib/usda-calendar.mjs'),
  cftc:path.join(root,'lib/cftc-calendar.mjs'),treasury:path.join(root,'lib/treasury-calendar.mjs'),
  collector:path.join(root,'scripts/pc-writer/release-calendar.mjs'),
  runner:path.join(root,'scripts/pc-writer/local-cycle.mjs'),
  config:path.join(dataRoot,'config.json'),ledger:path.join(dataRoot,'history.json')};
 fs.mkdirSync(path.join(root,'lib'),{recursive:true});
 fs.mkdirSync(path.join(root,'scripts/pc-writer'),{recursive:true});
 fs.mkdirSync(dataRoot);
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git(['init','-q']);git(['config','user.name','R26 fixture']);git(['config','user.email','r26@example.invalid']);
 fs.copyFileSync(new URL('lib/release-calendar.mjs',base),paths.parser);
 fs.copyFileSync(r23Eia,paths.eia);
 fs.copyFileSync(r24Usda,paths.usda);
 fs.copyFileSync(new URL('lib/cftc-calendar.mjs',base),paths.cftc);
 fs.writeFileSync(paths.collector,crlf(fs.readFileSync(new URL('scripts/pc-writer/release-calendar.mjs',base))));
 fs.writeFileSync(paths.runner,'// protected core runner\n');
 git(['add','lib','scripts/pc-writer']);git(['commit','-qm','Installed R25 fixture']);
 const approved=git(['rev-parse','HEAD']);
 fs.writeFileSync(paths.config,JSON.stringify({enabled:true,collectionTarget:'pc',source:staleConfig?'0'.repeat(40):approved,untouched:true},null,2));
 fs.writeFileSync(paths.ledger,'{"keep":true}');
 if(dirty)fs.appendFileSync(paths.runner,'// user change\n');
 if(existingTreasury)fs.writeFileSync(paths.treasury,'// existing owner file\n');
 if(tamperedCftc)fs.appendFileSync(paths.cftc,'// unauthorized change\n');
 if(takenLock)fs.writeFileSync(path.join(dataRoot,'local-cycle.lock'),'existing lock');
 const opts={dataRoot,getCoreRoot:()=>root,getTaskXml:()=>'<Task/>',approvedSource:wrongSource?'0'.repeat(40):approved,
  expectedWorktreeId:worktreeIdentity(root),parserCandidatePath:badCandidate?new URL('lib/release-calendar.mjs',base):new URL('lib/release-calendar.mjs',candidate)};
 return {temp,root,dataRoot,paths,git,approved,run:apply=>runR26({...opts,apply})};
}

test('R26 safe preflight is read-only and limits intended changes to 3 files',()=>{
 const f=fixture();
 try{
  const before=fs.readFileSync(f.paths.parser);
  const result=f.run(false);
  assert.equal(result.decision,'R26_THREE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE',JSON.stringify(result));
  assert.deepEqual(result.changedFiles,['lib/release-calendar.mjs','lib/treasury-calendar.mjs','scripts/pc-writer/release-calendar.mjs']);
  assert.deepEqual(fs.readFileSync(f.paths.parser),before);
  assert.equal(f.git(['rev-parse','HEAD']),f.approved);
  assert.equal(fs.existsSync(f.paths.treasury),false);
 }finally{fs.rmSync(f.temp,{recursive:true,force:true});}
});

test('R26 install changes only 3 calendar files, backs up and retains CFTC/EIA/USDA',()=>{
 const f=fixture();
 try{
  const protectedBefore=Object.fromEntries(['eia','usda','cftc','runner','ledger'].map(k=>[k,fs.readFileSync(f.paths[k])]));
  const result=f.run(true);
  assert.equal(result.decision,'R26_TREASURY_CALENDAR_INSTALLED_NO_FORCED_COLLECTION',JSON.stringify(result));
  assert.equal(result.phase,'INSTALLED');
  assert.equal(f.git(['rev-parse','HEAD^']),f.approved);
  assert.equal(f.git(['diff','--name-only',f.approved,result.newSource]),
   'lib/release-calendar.mjs\nlib/treasury-calendar.mjs\nscripts/pc-writer/release-calendar.mjs');
  assert.deepEqual(fs.readFileSync(f.paths.parser),fs.readFileSync(new URL('lib/release-calendar.mjs',candidate)));
  assert.deepEqual(fs.readFileSync(f.paths.treasury),fs.readFileSync(new URL('lib/treasury-calendar.mjs',candidate)));
  assert.deepEqual(fs.readFileSync(f.paths.collector),crlf(fs.readFileSync(new URL('scripts/pc-writer/release-calendar.mjs',candidate))));
  for(const [key,bytes] of Object.entries(protectedBefore))assert.deepEqual(fs.readFileSync(f.paths[key]),bytes,key);
  assert.equal(JSON.parse(fs.readFileSync(f.paths.config)).source,result.newSource);
  assert.equal(JSON.parse(fs.readFileSync(f.paths.config)).untouched,true);
  assert.ok(fs.existsSync(path.join(f.dataRoot,'market-calendar-r26-backups',result.backupId,'config.json')));
  for(const key of ['gitPushed','publisherExecuted','forcedCollection'])assert.equal(result[key],false);
  assert.equal(fs.existsSync(path.join(f.dataRoot,'local-cycle.lock')),false);
 }finally{fs.rmSync(f.temp,{recursive:true,force:true});}
});

test('R26 refuses occupied Core lock without touching existing source',()=>{
 const f=fixture({takenLock:true});
 try{
  const before=fs.readFileSync(f.paths.parser);
  const result=f.run(true);
  assert.equal(result.decision,'R26_INSTALL_ABORTED_OR_RESTORED_STOP');
  assert.equal(result.errorCode,'CORE_LOCK_ALREADY_EXISTS');
  assert.deepEqual(fs.readFileSync(f.paths.parser),before);
  assert.equal(fs.readFileSync(path.join(f.dataRoot,'local-cycle.lock'),'utf8'),'existing lock');
 }finally{fs.rmSync(f.temp,{recursive:true,force:true});}
});

test('R26 fails closed on PC drift, dirty source, unexpected module or modified CFTC',()=>{
 for(const flags of [{dirty:true},{staleConfig:true},{wrongSource:true},{badCandidate:true},{existingTreasury:true},{tamperedCftc:true}]){
  const f=fixture(flags);
  try{
   const before=fs.readFileSync(f.paths.parser),head=f.git(['rev-parse','HEAD']);
   const result=f.run(true);
   assert.match(result.decision,/_STOP$/,JSON.stringify({flags,result}));
   assert.deepEqual(fs.readFileSync(f.paths.parser),before);
   assert.equal(f.git(['rev-parse','HEAD']),head);
  }finally{fs.rmSync(f.temp,{recursive:true,force:true});}
 }
});
