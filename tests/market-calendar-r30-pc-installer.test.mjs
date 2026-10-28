import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runR30} from '../scripts/pc-writer/market-calendar-r30-private-apply.mjs';
import {waitAndInstallR30} from '../scripts/pc-writer/market-calendar-r30-safe-wait.mjs';
import {worktreeIdentity} from '../scripts/pc-writer/market-calendar-r19-bea-apply.mjs';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const candidatePaths=[path.join(project,'lib/earnings-api-private-projection.mjs'),
 path.join(project,'scripts/pc-writer/earnings-api-local.mjs')];
const sha=b=>createHash('sha256').update(b).digest('hex');
const HEAD='fc1543c500b3a79aecdb7e7066cd95979ecc92bb';

function setup(){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'r30-installer-'));
 const root=path.join(temp,'repo'),dataRoot=path.join(temp,'data');
 fs.mkdirSync(path.join(root,'scripts/pc-writer'),{recursive:true});
 fs.mkdirSync(path.join(root,'lib'),{recursive:true});
 fs.mkdirSync(dataRoot,{recursive:true});
 fs.writeFileSync(path.join(root,'scripts/pc-writer/earnings-api-local.mjs'),'r29-original');
 fs.writeFileSync(path.join(dataRoot,'config.json'),JSON.stringify({source:HEAD,enabled:true,collectionTarget:'pc'}));
 const gitCall=(r,args)=>{
  const command=args.join(' ');
  if(command==='rev-parse HEAD')return HEAD;
  if(command==='rev-parse HEAD:scripts/pc-writer/earnings-api-local.mjs')return 'b'.repeat(40);
  if(command==='hash-object scripts/pc-writer/earnings-api-local.mjs')return 'b'.repeat(40);
  if(command.startsWith('var GIT_'))return 'person <email> 123 +0000';
  if(command.startsWith('diff --name-only')||command.startsWith('ls-files --others'))return '';
  throw Error('UNEXPECTED_GIT_CALL');
 };
 return {root,dataRoot,options:{getRoot:()=>root,getTask:()=>'',gitCall,
  expectedIdentity:worktreeIdentity(root),approvedSource:HEAD,candidatePaths,dataRoot},
  cleanup:()=>fs.rmSync(temp,{recursive:true,force:true})};
}

test('R30 candidate integrity blocks an altered installer payload',()=>{
 const env=setup();
 try{
  const result=runR30({...env.options,candidatePaths:[candidatePaths[0],path.join(env.root,'scripts/pc-writer/earnings-api-local.mjs')]});
  assert.equal(result.decision,'R30_CANDIDATE_HASH_MISMATCH_STOP');
  assert.deepEqual(result.changedFiles,[]);
 }finally{env.cleanup();}
});

test('R30 exact two-file PC install commits and updates source with no Core collection',t=>{
 const env=setup();
 const run=(args)=>execFileSync('git',args,{cwd:env.root,encoding:'utf8'}).trim();
 try{
  try{run(['init','-q']);}
  catch(error){if(error?.code==='EPERM'){t.skip('runtime blocks child git execution');return;}throw error;}
  run(['config','user.name','R30 test']);
  run(['config','user.email','r30-test@example.invalid']);
  run(['add','--','scripts/pc-writer/earnings-api-local.mjs']);
  run(['commit','-qm','baseline']);
  const base=run(['rev-parse','HEAD']);
  fs.writeFileSync(path.join(env.dataRoot,'config.json'),
   JSON.stringify({source:base,enabled:true,collectionTarget:'pc'}));
  const result=runR30({...env.options,gitCall:undefined,approvedSource:base,
   expectedBaselineSha:sha(Buffer.from('r29-original')),apply:true});
  assert.equal(result.decision,'R30_PC_PRIVATE_PROJECTION_INSTALLED_NO_FORCED_COLLECTION');
  assert.equal(result.backupCreated,true);
  assert.equal(result.forcedCollection,false);
  assert.equal(result.publisherExecuted,false);
  assert.deepEqual(result.changedFiles,[
   'lib/earnings-api-private-projection.mjs','scripts/pc-writer/earnings-api-local.mjs']);
  assert.equal(run(['rev-parse','HEAD^']),base);
  assert.equal(run(['rev-parse','HEAD']),result.newSource);
  assert.equal(JSON.parse(fs.readFileSync(path.join(env.dataRoot,'config.json'),'utf8')).source,result.newSource);
  assert.equal(fs.existsSync(path.join(env.dataRoot,'local-cycle.lock')),false);
  const second=runR30({...env.options,gitCall:undefined,approvedSource:base,
   expectedBaselineSha:sha(Buffer.from('r29-original')),apply:true});
  assert.equal(second.decision,'R30_R29_SOURCE_CHANGED_STOP');
 }finally{env.cleanup();}
});

test('R30 fails closed when an unapproved PC source is present',()=>{
 const env=setup();
 try{
  fs.writeFileSync(path.join(env.dataRoot,'config.json'),JSON.stringify({source:'0'.repeat(40),enabled:true,collectionTarget:'pc'}));
  const result=runR30(env.options);
  assert.equal(result.decision,'R30_CONFIG_SOURCE_CHANGED_STOP');
  assert.deepEqual(result.changedFiles,[]);
 }finally{env.cleanup();}
});

test('R30 lock preflight never writes candidate files or deletes Core lock',()=>{
 const env=setup();
 try{
  const lock=path.join(env.dataRoot,'local-cycle.lock');
  fs.writeFileSync(lock,'owned by running Core');
  const result=runR30({...env.options,apply:true,
   expectedBaselineSha:sha(Buffer.from('r29-original'))});
  assert.equal(result.decision,'R30_CORE_LOCK_PRESENT_STOP');
  assert.equal(fs.existsSync(path.join(env.root,'lib/earnings-api-private-projection.mjs')),false);
  assert.equal(fs.readFileSync(lock,'utf8'),'owned by running Core');
  assert.equal(JSON.parse(fs.readFileSync(path.join(env.dataRoot,'config.json'),'utf8')).source,HEAD);
 }finally{env.cleanup();}
});

test('R30 bounded waiter succeeds once while no lock is held',async()=>{
 let attempts=0,now=0;
 const result=await waitAndInstallR30({limitMs:120000,clock:()=>now,pause:async ms=>{now+=ms;},
  locked:()=>false,getTaskState:()=> 'Ready',attemptInstall:()=>{
   attempts++;return {status:'INSTALLED',installerDecision:'OK',details:{newSource:'1'.repeat(40)}};
  }});
 assert.equal(result.decision,'R30_WAIT_INSTALLED_SUCCESS');
 assert.equal(attempts,1);
});

test('R30 bounded waiter stops on any non-lock failure',async()=>{
 let now=0;
 const result=await waitAndInstallR30({limitMs:120000,clock:()=>now,pause:async ms=>{now+=ms;},
  locked:()=>false,getTaskState:()=> 'Ready',attemptInstall:()=>({status:'FAILED',code:'R30_R29_SOURCE_CHANGED_STOP'})});
 assert.equal(result.decision,'R30_WAIT_NON_LOCK_FAILURE_STOP');
 assert.equal(result.attempts,1);
});

test('R30 bounded waiter retries clean lock races but respects expiry',async()=>{
 let now=0,attempts=0;
 const result=await waitAndInstallR30({limitMs:30000,intervalMs:10000,clock:()=>now,
  pause:async ms=>{now+=ms;},locked:()=>false,getTaskState:()=> 'Ready',
  attemptInstall:()=>{attempts++;return {status:'CLEAN_LOCK_RACE',installerDecision:'R30_CORE_LOCK_RACE_STOP'};}});
 assert.equal(result.decision,'R30_WAIT_TIMEOUT_NO_INSTALL');
 assert.equal(result.attempts,3);
 assert.equal(attempts,3);
 assert.equal(result.elapsedSeconds,30);
});

test('R30 waiter does not attempt during Running/Queued task',async()=>{
 let now=0,attempts=0;
 const states=['Running','Queued','Ready'];let index=0;
 const result=await waitAndInstallR30({limitMs:30000,intervalMs:10000,clock:()=>now,
  pause:async ms=>{now+=ms;},locked:()=>false,getTaskState:()=>states[index++],
  attemptInstall:()=>{attempts++;return {status:'INSTALLED'};}});
 assert.equal(result.decision,'R30_WAIT_INSTALLED_SUCCESS');
 assert.equal(attempts,1);
 assert.equal(result.elapsedSeconds,20);
});
