import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {runR33} from '../scripts/pc-writer/market-calendar-r33-cache-apply.mjs';
import {waitAndInstallR33} from '../scripts/pc-writer/market-calendar-r33-safe-wait.mjs';
import {worktreeIdentity} from '../scripts/pc-writer/market-calendar-r19-bea-apply.mjs';

const source='a'.repeat(40),next='b'.repeat(40),rel='scripts/pc-writer/earnings-api-local.mjs';
const sha=buf=>createHash('sha256').update(buf).digest('hex');
function fixture(t){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'r33-cache-test-'));
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const root=path.join(base,'core'),dataRoot=path.join(base,'data');
 const target=path.join(root,rel),configFile=path.join(dataRoot,'config.json');
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.mkdirSync(dataRoot,{recursive:true});
 const original=Buffer.from('r31 collector baseline');
 fs.writeFileSync(target,original);
 fs.writeFileSync(configFile,JSON.stringify({source,enabled:true,collectionTarget:'pc',keep:'yes'}));
 let head=source,dirty=false,commitCount=0;
 const gitCall=(_root,args)=>{
  if(args[0]==='rev-parse'){
   if(args[1]==='HEAD')return head;
   if(args[1]==='HEAD^')return source;
   if(args[1]==='HEAD:'+rel)return 'trackedblob';
  }
  if(args[0]==='hash-object')return 'trackedblob';
  if(args[0]==='var')return 'R33 Test <test@example.com> 0 +0000';
  if(args[0]==='ls-files')return '';
  if(args[0]==='diff')return args.includes(next)?rel:dirty?rel:'';
  if(args[0]==='commit'){commitCount++;head=next;return 'committed';}
  throw Error('UNEXPECTED_GIT_COMMAND');
 };
 const options={dataRoot,getRoot:()=>root,getTask:()=>'<Task/>',gitCall,
  expectedIdentity:worktreeIdentity(root),approvedSource:source,
  expectedBaselineSha:sha(original)};
 return {base,root,dataRoot,target,configFile,original,options,
  setDirty:v=>{dirty=v;},get commitCount(){return commitCount;}};
}

test('R33 dry-run is read-only and declares exactly one source file',async t=>{
 const ctx=fixture(t);
 const result=await runR33(ctx.options);
 assert.equal(result.decision,'R33_ONE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE');
 assert.deepEqual(result.plannedFiles,[rel]);
 assert.deepEqual(result.changedFiles,[]);
 assert.equal(ctx.commitCount,0);assert.deepEqual(fs.readFileSync(ctx.target),ctx.original);
});

test('R33 one-file PC installation replays cache locally without provider or remote writes',async t=>{
 const ctx=fixture(t);let replays=0;
 const result=await runR33({...ctx.options,apply:true,replayPC:async()=>{
  replays++;return {status:'READY_CACHED_DISPLAY',providerRequests:0,recordCount:2609};
 }});
 assert.equal(result.decision,'R33_PC_CODE_INSTALLED_LOCAL_CACHE_REPLAY_ATTEMPTED');
 assert.deepEqual(result.changedFiles,[rel]);
 assert.equal(result.cacheReplay,'READY_CACHED_DISPLAY');
 assert.equal(result.recordCount,2609);assert.equal(result.providerRequests,0);
 assert.equal(ctx.commitCount,1);assert.equal(replays,1);
 assert.equal(JSON.parse(fs.readFileSync(ctx.configFile,'utf8')).source,next);
 assert.equal(result.backupCreated,true);assert.equal(result.forcedCollection,false);
 assert.equal(result.publisherExecuted,false);assert.equal(result.gitPushed,false);
 assert.equal(fs.existsSync(path.join(ctx.dataRoot,'local-cycle.lock')),false);
});

test('R33 does not install while the Core lock exists',async t=>{
 const ctx=fixture(t);fs.writeFileSync(path.join(ctx.dataRoot,'local-cycle.lock'),'other task');
 const result=await runR33({...ctx.options,apply:true});
 assert.equal(result.decision,'R33_CORE_LOCK_PRESENT_STOP');
 assert.equal(ctx.commitCount,0);
 assert.deepEqual(fs.readFileSync(ctx.target),ctx.original);
 assert.equal(fs.readFileSync(path.join(ctx.dataRoot,'local-cycle.lock'),'utf8'),'other task');
});

test('R33 stops on unexpected source changes before lock and never modifies data',async t=>{
 const ctx=fixture(t);ctx.setDirty(true);
 const result=await runR33({...ctx.options,apply:true});
 assert.equal(result.decision,'R33_PROTECTED_SOURCE_DIRTY_STOP');
 assert.deepEqual(fs.readFileSync(ctx.target),ctx.original);assert.equal(ctx.commitCount,0);
});

test('R33 cache replay failure never disguises a successful code install as data ready',async t=>{
 const ctx=fixture(t);
 const result=await runR33({...ctx.options,apply:true,replayPC:async()=>{throw Error('DB_UNAVAILABLE');}});
 assert.equal(result.decision,'R33_PC_CODE_INSTALLED_LOCAL_CACHE_REPLAY_ATTEMPTED');
 assert.equal(result.cacheReplay,'REPLAY_FAILED_DATA_STATE_UNKNOWN');
 assert.equal(result.recordCount,undefined);
});

test('R33 waiter installs once when task is ready and lock is clear',async()=>{
 let now=0,attempts=0;
 const result=await waitAndInstallR33({clock:()=>now,pause:async ms=>{now+=ms;},
  locked:()=>false,getTaskState:()=> 'Ready',attemptInstall:()=>{
   attempts++;return {status:'INSTALLED',details:{cacheReplay:'READY_CACHED_DISPLAY',recordCount:2609}};
  }});
 assert.equal(result.decision,'R33_WAIT_INSTALLED_SUCCESS');assert.equal(attempts,1);
 assert.equal(result.installerResult.recordCount,2609);
});

test('R33 waiter retries only clean lock races and respects twenty-minute cap',async()=>{
 let now=0,attempts=0;
 const result=await waitAndInstallR33({limitMs:30000,intervalMs:10000,
  clock:()=>now,pause:async ms=>{now+=ms;},locked:()=>false,
  getTaskState:()=> 'Ready',attemptInstall:()=>{attempts++;return {status:'CLEAN_LOCK_RACE'};}});
 assert.equal(result.decision,'R33_WAIT_TIMEOUT_NO_INSTALL');
 assert.equal(attempts,3);
});
