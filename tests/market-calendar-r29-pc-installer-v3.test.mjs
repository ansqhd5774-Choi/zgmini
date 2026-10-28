import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runR29} from '../scripts/pc-writer/market-calendar-r29-pc-apply-v3.mjs';
import {worktreeIdentity} from '../scripts/pc-writer/market-calendar-r19-bea-apply.mjs';

test('V3 refuses an unknown scheduled Core identity before any file mutation',()=>{
 const r=runR29({apply:true,getRoot:()=>null,getTask:()=>'',dataRoot:'/not-pc'});
 assert.equal(r.decision,'EXACT_CORE_ORIGIN_CHANGED_STOP');
 assert.deepEqual(r.changedFiles,[]);
 assert.equal(r.backupCreated,false);
 assert.equal(r.forcedCollection,false);
 assert.equal(r.publisherExecuted,false);
 assert.equal(r.gitPushed,false);
});

test('V3 stages only a private source hook on top of byte-verified R27 collector',()=>{
 const original=fs.readFileSync(new URL('../staging/market-calendar/r27-tic/scripts/pc-writer/release-calendar.mjs',import.meta.url),'utf8');
 const candidate=fs.readFileSync(new URL('../staging/market-calendar/r29-private/scripts/pc-writer/release-calendar.mjs',import.meta.url),'utf8');
 const expected=original
  .replace('// R27 PC-only candidate: preserve installed R26, add independent TIC events.\n// No new scheduler, collection trigger, publisher, or DB schema.\n',
   '// R29 PC private earnings extension; R27 official events remain unchanged.\n// No new task, DB table, forced collection or public vendor feed output.\n')
  .replace("import {marketOperationalStore} from '../../worker/market-operational-store.mjs';\n",
   "import {marketOperationalStore} from '../../worker/market-operational-store.mjs';\nimport {collectEarningsApiLocal} from './earnings-api-local.mjs';\n")
  .replace(' const store=publicFeedStore(db),locks=marketOperationalStore(db),key=RELEASE_CALENDAR_KEY;\n',
   " const store=publicFeedStore(db),locks=marketOperationalStore(db),key=RELEASE_CALENDAR_KEY;\n // PC private vendor raw inputs are independent from the R27 public calendar.\n try{\n  await collectEarningsApiLocal({db,apiKey:globalThis.__zgminiLocalProviderEnv?.EARNINGS_API_KEY,\n   now,fetchImpl});\n }catch{ /* Never let an optional vendor block official release collection. */ }\n");
 assert.equal(candidate,expected);
 assert.equal((candidate.match(/collectEarningsApiLocal\(/g)??[]).length,1);
 assert.ok(!candidate.includes('source=\'earnings\''));
});

test('V3 preflight accepts exactly the verified R27 files without mutating them',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'r29-v2-preflight-'));
 const data=path.join(root,'data');
 const head='a'.repeat(40),blob='b'.repeat(40);
 try{
  fs.mkdirSync(path.join(root,'lib'),{recursive:true});
  fs.mkdirSync(path.join(root,'scripts','pc-writer'),{recursive:true});
  fs.mkdirSync(data);
  const parser=fs.readFileSync(new URL('../staging/market-calendar/r27-tic/lib/release-calendar.mjs',import.meta.url));
  const collector=fs.readFileSync(new URL('../staging/market-calendar/r27-tic/scripts/pc-writer/release-calendar.mjs',import.meta.url),'utf8');
  fs.writeFileSync(path.join(root,'lib','release-calendar.mjs'),parser);
  const source=Buffer.from(collector.replace(/\r?\n/g,'\r\n'));
  fs.writeFileSync(path.join(root,'scripts','pc-writer','release-calendar.mjs'),source);
  fs.writeFileSync(path.join(data,'config.json'),JSON.stringify({enabled:true,collectionTarget:'pc',source:head}));
  const gitCall=(_root,args)=>{
   if(args[0]==='rev-parse')return args[1]==='HEAD'?head:blob;
   if(args[0]==='hash-object')return blob;
   if(args[0]==='diff'||args[0]==='ls-files')return '';
   if(args[0]==='var')return 'test identity';
   throw Error('UNEXPECTED_GIT_CALL');
  };
  const result=runR29({apply:false,dataRoot:data,getRoot:()=>root,getTask:()=>'',gitCall,
   expectedIdentity:worktreeIdentity(root)});
  assert.equal(result.decision,'R29_THREE_FILE_PREFLIGHT_READY_NO_CHANGES_MADE');
  assert.equal(result.previousSource,head);
  assert.deepEqual(result.plannedFiles,[
   'lib/earnings-api-calendar.mjs',
   'scripts/pc-writer/earnings-api-local.mjs',
   'scripts/pc-writer/release-calendar.mjs']);
  assert.deepEqual(result.changedFiles,[]);
  assert.equal(result.backupCreated,false);
  assert.equal(fs.readFileSync(path.join(root,'scripts','pc-writer','release-calendar.mjs')).equals(source),true);
  assert.equal(fs.existsSync(path.join(root,'lib','earnings-api-calendar.mjs')),false);
  fs.writeFileSync(path.join(data,'local-cycle.lock'),'BUSY');
  const locked=runR29({apply:true,dataRoot:data,getRoot:()=>root,getTask:()=>'',gitCall,
   expectedIdentity:worktreeIdentity(root)});
  assert.equal(locked.decision,'R29_V3_CORE_LOCK_PRESENT_STOP');
  assert.equal(locked.phase,'CORE_LOCK_ACQUIRE');
  assert.deepEqual(locked.changedFiles,[]);
  assert.equal(locked.backupCreated,false);
  assert.equal(locked.newSource,null);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

