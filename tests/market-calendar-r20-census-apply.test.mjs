import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {runR20} from '../scripts/pc-writer/market-calendar-r20-census-apply.mjs';
import {coreRootFromTask,worktreeIdentity} from '../scripts/pc-writer/market-calendar-r19-bea-apply.mjs';
import {parseReleaseCalendar as censusParser} from '../staging/market-calendar/r20-census/lib/release-calendar.mjs';
import {parseReleaseCalendar as oldParser} from '../staging/market-calendar/r19-bea/lib/release-calendar.mjs';

const digest=v=>createHash('sha256').update(v).digest('hex');
const r19File=new URL('../staging/market-calendar/r19-bea/lib/release-calendar.mjs',import.meta.url);
const r20File=new URL('../staging/market-calendar/r20-census/lib/release-calendar.mjs',import.meta.url);
const candidate=fs.readFileSync(r20File);

function fixture({staleConfig=false,badCandidate=false,dirty=false,badCore=false}={}){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-r20-'));
 const checkout=path.join(tmp,'repo'),dataRoot=path.join(tmp,'data'),scheduler=path.join(tmp,'scheduler');
 const parser=path.join(checkout,'lib','release-calendar.mjs'),script=path.join(checkout,'scripts','pc-writer','local-cycle.mjs');
 fs.mkdirSync(path.dirname(parser),{recursive:true});
 fs.mkdirSync(path.dirname(script),{recursive:true});
 fs.mkdirSync(dataRoot);fs.mkdirSync(scheduler);
 const git=args=>execFileSync('git',args,{cwd:checkout,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 git(['init','-q']);git(['config','user.name','R20 fixture']);git(['config','user.email','r20@example.invalid']);
 fs.copyFileSync(r19File,parser);fs.writeFileSync(script,'// Registered PC Core runner remains untouched\n');
 git(['add','lib/release-calendar.mjs','scripts/pc-writer/local-cycle.mjs']);
 git(['commit','-qm','R19 installed baseline']);
 const approved=git(['rev-parse','HEAD']);
 const configFile=path.join(dataRoot,'config.json');
 fs.writeFileSync(configFile,JSON.stringify({enabled:true,collectionTarget:'pc',source:staleConfig?'0'.repeat(40):approved,retain:'untouched'},null,2));
 const ledger=path.join(dataRoot,'local-publication-ledger.json');
 fs.writeFileSync(ledger,'{"retained":true}');
 if(dirty)fs.appendFileSync(script,'// Concurrent unpublished edit\n');
 const origin=path.join(tmp,'origin','run-local-core.vbs');
 fs.mkdirSync(path.dirname(origin),{recursive:true});
 fs.writeFileSync(origin,'WScript.Quit shell.Run("""node.exe"" ""'+script+'"" --publish",0,True)');
 const wrapper=path.join(scheduler,'run-local-core.vbs');
 fs.writeFileSync(wrapper,'\' ZGMINI_R38_WRAPPER_V1\norigin = "'+origin+'"\n');
 const xml='<Task><Arguments>&quot;'+wrapper+'&quot;</Arguments></Task>';
 const input={dataRoot,getTaskXml:()=>xml,approvedSource:approved,
  expectedWorktreeId:badCore?'bad-worktree-id':worktreeIdentity(checkout),
  expectedBaselineSha256:digest(fs.readFileSync(r19File)),
  expectedCandidateSha256:badCandidate?'0'.repeat(64):digest(candidate)};
 return {tmp,checkout,dataRoot,parser,script,configFile,ledger,git,approved,input,xml,
  run:apply=>runR20({...input,apply})};
}

test('R20 accepts the registered R38 Core lineage without executing scheduled tasks',()=>{
 const f=fixture();
 try{assert.equal(coreRootFromTask(f.xml),f.checkout);}
 finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R20 preflight is read-only and preserves source, config, ledger and lock',()=>{
 const f=fixture();
 try{
  const before=fs.readFileSync(f.parser),config=fs.readFileSync(f.configFile),ledger=fs.readFileSync(f.ledger);
  const result=f.run(false);
  assert.equal(result.decision,'CENSUS_SINGLE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE',JSON.stringify(result));
  assert.deepEqual(fs.readFileSync(f.parser),before);
  assert.deepEqual(fs.readFileSync(f.configFile),config);
  assert.deepEqual(fs.readFileSync(f.ledger),ledger);
  assert.equal(f.git(['rev-parse','HEAD']),f.approved);
  assert.equal(fs.existsSync(path.join(f.dataRoot,'local-cycle.lock')),false);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R20 installs exactly one Census parser change after R19 and preserves publication ledger',()=>{
 const f=fixture();
 try{
  const publisher=fs.readFileSync(f.script),ledger=fs.readFileSync(f.ledger);
  const result=f.run(true);
  assert.equal(result.decision,'CENSUS_INSTALLED_IN_EXISTING_PC_SOURCE_NO_FORCED_COLLECTION',JSON.stringify(result));
  assert.equal(result.phase,'INSTALLED');
  assert.equal(f.git(['rev-parse','HEAD']),result.newSource);
  assert.equal(f.git(['rev-parse','HEAD^']),f.approved);
  assert.equal(f.git(['diff','--name-only',f.approved,result.newSource]),'lib/release-calendar.mjs');
  assert.deepEqual(fs.readFileSync(f.parser),candidate);
  assert.deepEqual(fs.readFileSync(f.script),publisher);
  assert.deepEqual(fs.readFileSync(f.ledger),ledger);
  assert.equal(JSON.parse(fs.readFileSync(f.configFile)).source,result.newSource);
  assert.equal(JSON.parse(fs.readFileSync(f.configFile)).retain,'untouched');
  assert.ok(fs.existsSync(path.join(f.dataRoot,'market-calendar-r20-backups',result.backupId,'release-calendar.mjs')));
  assert.equal(fs.existsSync(path.join(f.dataRoot,'local-cycle.lock')),false);
  assert.equal(result.gitPushed,false);assert.equal(result.publisherExecuted,false);assert.equal(result.liveMonitored,false);
  assert.ok(!JSON.stringify(result).includes(f.tmp));
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R20 refuses stale config, wrong candidate, edited protected file and unapproved Core',()=>{
 for(const options of [{staleConfig:true},{badCandidate:true},{dirty:true},{badCore:true}]){
  const f=fixture(options);
  try{
   const before=fs.readFileSync(f.parser);
   const result=f.run(true);
   assert.match(result.decision,/_STOP$/,JSON.stringify(result));
   assert.deepEqual(fs.readFileSync(f.parser),before);
   assert.equal(f.git(['rev-parse','HEAD']),f.approved);
   assert.equal(fs.existsSync(path.join(f.dataRoot,'local-cycle.lock')),false);
  }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
 }
});

test('R20 respects an occupied Core lock, never replacing or deleting it',()=>{
 const f=fixture();
 try{
  const lock=path.join(f.dataRoot,'local-cycle.lock'),owner='{"owner":"other-run"}';
  fs.writeFileSync(lock,owner);
  const result=f.run(true);
  assert.equal(result.decision,'CENSUS_INSTALL_ABORTED_OR_RESTORED_STOP');
  assert.equal(result.phase,'CORE_LOCK_ACQUIRE');
  assert.equal(result.errorCode,'CORE_LOCK_ALREADY_EXISTS');
  assert.equal(fs.readFileSync(lock,'utf8'),owner);
  assert.equal(f.git(['rev-parse','HEAD']),f.approved);
  assert.equal(result.backupCreated,false);
 }finally{fs.rmSync(f.tmp,{recursive:true,force:true});}
});

test('R20 recognizes actual Census 2026 HTML table features and fails closed on soft fallback pages',()=>{
 const row=(title,date,period,code)=>`<tr height="20"><td height="20"><a href="/retail">${title}</a></td><td sorttable_customkey="${code}">${date}</td><td>8:30 AM</td><td>${period}</td><td class="hiden">A${code}</td><td class="hiden">A202609</td></tr>`;
 const raw='<table>'+row('Advance Monthly Sales for Retail and Food Services','October 15, 2026','September 2026','202610150830')+
  row('New Residential Construction (Building Permits, Housing Starts, and Housing Completions)','October 20, 2026','September 2026','202610200830')+'</table>';
 const now=censusParser(raw,'census'),previous=oldParser(raw,'census');
 assert.equal(now.length,2);
 assert.deepEqual(now.filter(e=>e.id==='retail'),previous);
 assert.ok(now.some(e=>e.id.startsWith('census-new-residential-construction')));
 assert.throws(()=>censusParser('<title>U.S. Census Bureau Economic Indicators</title><p>Advance Monthly Sales</p>','census'),/CALENDAR_EVENTS_EMPTY/);
});
