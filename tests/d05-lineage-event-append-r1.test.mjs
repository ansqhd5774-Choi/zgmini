import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,rm,access,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,join} from 'node:path';
import {buildD05LineageEvent} from '../lib/score-history/d05-lineage-event-contract-r1.mjs';
import {appendD05LineageEvent,d05AppendFitsCapacity,
 createD05LocalCycleExclusiveWriter} from '../lib/score-history/d05-lineage-event-append-r1.mjs';

const calculatedAt='2026-11-10T12:00:13.385Z';
const at=Date.parse(calculatedAt);
const sourceKeys=['macro','credit','supply','fundFlows','bisDsr','bisTc','rates'];
const sources=sourceKeys.map((sourceKey,i)=>({sourceKey,
 batchKey:sourceKey+':2026-11-10',storedAt:at-i*1000,
 storedBodySha256:i.toString(16).padStart(64,'0')}));
const link={status:'LINKED_SELECTED_7_BATCHES_ONLY',scope:'LOCAL_PC_ONLY',
 effectiveUseVerified:false,completeD05InputLineage:false,publicD1Verified:false,
 calculatedAt,asOfDate:'2026-11-10',score:47.97618582151962,
 outputSignature:'21ac0fbc',archiveKey:'composite-observed:2026-11-10',
 archiveStoredAt:at,sources};
const event=(overrides={})=>buildD05LineageEvent({link,
 runtimeSourceSha:'a'.repeat(40),approvedSourceSha:'b'.repeat(40),
 recordedAt:'2026-11-10T12:00:14.000Z',...overrides});
const lease=()=>({ownerId:'fixture-only',assertExclusive:()=>true});

async function fixture(t){
 const dir=await mkdtemp(join(tmpdir(),'zgmini-d05-append-fixture-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 return join(dir,'lineage.jsonl');
}
async function missing(path){
 try{await access(path);return false;}catch(error){return error?.code==='ENOENT';}
}

test('append is local-only, durable/readable, and same event is a NOOP',async t=>{
 const ledgerPath=await fixture(t),first=event();
 const result=await appendD05LineageEvent({ledgerPath,entry:first,exclusiveWriter:lease()});
 assert.deepEqual(result,{status:'APPENDED_VERIFIED_LOCAL_ONLY',
  eventId:first.eventId,eventCount:1});
 const original=await readFile(ledgerPath,'utf8');
 assert.equal(JSON.parse(original.trim()).stableEvidenceDigestSha256,
  first.stableEvidenceDigestSha256);
 const retry=await appendD05LineageEvent({ledgerPath,
  entry:event({recordedAt:'2026-11-10T12:00:20.000Z'}),exclusiveWriter:lease()});
 assert.equal(retry.status,'NOOP_SAME_EVENT');
 assert.equal(await readFile(ledgerPath,'utf8'),original);
 assert.equal(await missing(ledgerPath+'.lock'),true);
});

test('missing exclusive Writer authority refuses before touching disk',async t=>{
 const ledgerPath=await fixture(t);
 for(const exclusiveWriter of [undefined,{},
  {ownerId:'fixture',assertExclusive:()=>false},
  {ownerId:'fixture',assertExclusive:()=>{throw Error('not held');}}]){
  const response=await appendD05LineageEvent({ledgerPath,entry:event(),exclusiveWriter});
  assert.equal(response.code,'LINEAGE_WRITER_LEASE_REQUIRED');
 }
 assert.equal(await missing(ledgerPath),true);
 assert.equal(await missing(ledgerPath+'.lock'),true);
});

test('approved opt-in creates only its private score-lineage leaf after lease proof',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'zgmini-d05-leaf-fixture-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const directory=join(dir,'score-lineage');
 const ledgerPath=join(directory,'d05-composite-events-v1.jsonl');
 assert.equal((await appendD05LineageEvent({ledgerPath,entry:event(),
  initializeApprovedDirectory:true,exclusiveWriter:undefined})).code,
 'LINEAGE_WRITER_LEASE_REQUIRED');
 assert.equal(await missing(directory),true);
 const first=await appendD05LineageEvent({ledgerPath,entry:event(),
  initializeApprovedDirectory:true,exclusiveWriter:lease()});
 assert.equal(first.status,'APPENDED_VERIFIED_LOCAL_ONLY');
 assert.equal(JSON.parse((await readFile(ledgerPath,'utf8')).trim()).eventId,
  event().eventId);
 const second=await appendD05LineageEvent({ledgerPath,entry:event(),
  initializeApprovedDirectory:true,exclusiveWriter:lease()});
 assert.equal(second.status,'NOOP_SAME_EVENT');
 assert.equal(await missing(ledgerPath+'.lock'),true);
});

test('opt-in refuses other directories or filenames without creating a parent',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'zgmini-d05-scope-fixture-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 for(const ledgerPath of [join(dir,'other','d05-composite-events-v1.jsonl'),
  join(dir,'score-lineage','another-name.jsonl')]){
  const result=await appendD05LineageEvent({ledgerPath,entry:event(),
   initializeApprovedDirectory:true,exclusiveWriter:lease()});
  assert.equal(result.code,'LINEAGE_DIRECTORY_SCOPE_UNAPPROVED');
  assert.equal(await missing(dirname(ledgerPath)),true);
 }
});

test('opt-in refuses a symlinked private leaf and never follows it',
 {skip:process.platform==='win32'},async t=>{
 const dir=await mkdtemp(join(tmpdir(),'zgmini-d05-symlink-fixture-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const target=join(dir,'other-target');await mkdir(target);
 await symlink(target,join(dir,'score-lineage'),'dir');
 const ledgerPath=join(dir,'score-lineage','d05-composite-events-v1.jsonl');
 const result=await appendD05LineageEvent({ledgerPath,entry:event(),
  initializeApprovedDirectory:true,exclusiveWriter:lease()});
 assert.equal(result.code,'LINEAGE_DIRECTORY_UNSAFE');
 assert.equal(await missing(join(target,'d05-composite-events-v1.jsonl')),true);
});

test('invalid source contract and unapproved relative path do not create files',async t=>{
 const ledgerPath=await fixture(t);
 const bad=event({link:{...link,sources:sources.slice(0,6)}});
 assert.equal((await appendD05LineageEvent({ledgerPath,entry:bad,
  exclusiveWriter:lease()})).code,'LINEAGE_EVENT_INVALID');
 assert.equal((await appendD05LineageEvent({ledgerPath:'lineage.jsonl',
  entry:event(),exclusiveWriter:lease()})).code,'LINEAGE_LEDGER_PATH_REQUIRED');
 assert.equal(await missing(ledgerPath),true);
});

test('same event ID with different evidence fails closed without overwrite',async t=>{
 const ledgerPath=await fixture(t);
 await appendD05LineageEvent({ledgerPath,entry:event(),exclusiveWriter:lease()});
 const before=await readFile(ledgerPath,'utf8');
 const changed=event({link:{...link,sources:sources.map((s,i)=>i===0?
  {...s,storedBodySha256:'f'.repeat(64)}:s)}});
 assert.equal((await appendD05LineageEvent({ledgerPath,entry:changed,
  exclusiveWriter:lease()})).code,'EVENT_ID_CONFLICT');
 assert.equal(await readFile(ledgerPath,'utf8'),before);
});

test('damaged JSON and partial final line are never repaired or appended',async t=>{
 const ledgerPath=await fixture(t);
 for(const prior of ['{broken}\n','{"eventId":"incomplete"']){
  await writeFile(ledgerPath,prior);
  const result=await appendD05LineageEvent({ledgerPath,entry:event(),
   exclusiveWriter:lease()});
  assert.equal(result.code,prior.endsWith('\n')?
   'LINEAGE_LEDGER_INVALID':'LINEAGE_LEDGER_PARTIAL_LINE');
  assert.equal(await readFile(ledgerPath,'utf8'),prior);
 }
});

test('existing lock is a hard stop and never stolen',async t=>{
 const ledgerPath=await fixture(t);
 await writeFile(ledgerPath+'.lock','stale-owned-by-other-process');
 const result=await appendD05LineageEvent({ledgerPath,entry:event(),
  exclusiveWriter:lease()});
 assert.equal(result.code,'LINEAGE_LEDGER_LOCK_HELD');
 assert.equal(await readFile(ledgerPath+'.lock','utf8'),
  'stale-owned-by-other-process');
 assert.equal(await missing(ledgerPath),true);
});

test('external lease lost after file lock acquisition prevents write',async t=>{
 const ledgerPath=await fixture(t);
 let checks=0;
 const exclusiveWriter={ownerId:'fixture',assertExclusive:()=>++checks===1};
 const result=await appendD05LineageEvent({ledgerPath,entry:event(),exclusiveWriter});
 assert.equal(result.code,'LINEAGE_WRITER_LEASE_LOST');
 assert.equal(await missing(ledgerPath),true);
 assert.equal(await missing(ledgerPath+'.lock'),true);
});

test('concurrent cooperative callers cannot duplicate one event',async t=>{
 const ledgerPath=await fixture(t);
 const attempts=await Promise.all(Array.from({length:4},()=>
  appendD05LineageEvent({ledgerPath,entry:event(),exclusiveWriter:lease()})));
 assert.equal(attempts.filter(x=>x.status==='APPENDED_VERIFIED_LOCAL_ONLY').length,1);
 assert.ok(attempts.every(x=>['APPENDED_VERIFIED_LOCAL_ONLY','NOOP_SAME_EVENT',
  'UNPROVEN'].includes(x.status)));
 const text=await readFile(ledgerPath,'utf8');
 assert.equal(text.trim().split('\n').length,1);
 assert.equal(JSON.parse(text).eventId,event().eventId);
 assert.equal(await missing(ledgerPath+'.lock'),true);
});

test('ledger capacity counts the appended line, not only the prior file',()=>{
 assert.equal(d05AppendFitsCapacity(360,40,400),true);
 assert.equal(d05AppendFitsCapacity(361,40,400),false);
 assert.equal(d05AppendFitsCapacity(399,1,400),true);
 assert.equal(d05AppendFitsCapacity(400,1,400),false);
 assert.equal(d05AppendFitsCapacity(-1,1,400),false);
 assert.equal(d05AppendFitsCapacity(0,1,Number.MAX_SAFE_INTEGER),false);
});

test('only a live owning local-cycle parent can grant the D05 append lease',async t=>{
 const ledgerPath=await fixture(t),pcHome=dirname(ledgerPath);
 const lockPath=join(pcHome,'local-cycle.lock');
 const owner={pid:process.pid,at:Date.now()};
 await writeFile(lockPath,JSON.stringify(owner));
 const getParentPid=()=>process.pid,processAlive=pid=>pid===process.pid;
 const writer=createD05LocalCycleExclusiveWriter({pcHome,getParentPid,processAlive});
 assert.ok(writer);
 assert.equal(await writer.assertExclusive(),true);
 assert.equal((await appendD05LineageEvent({ledgerPath,entry:event(),
  exclusiveWriter:writer})).status,'APPENDED_VERIFIED_LOCAL_ONLY');
 await rm(lockPath);
 assert.equal(await writer.assertExclusive(),false);
 assert.equal((await appendD05LineageEvent({ledgerPath,entry:event(),
  exclusiveWriter:writer})).code,'LINEAGE_WRITER_LEASE_REQUIRED');
});

test('D05 parent lease refuses direct invocation, changed owner and symlinks',async t=>{
 const ledgerPath=await fixture(t),pcHome=dirname(ledgerPath);
 const lockPath=join(pcHome,'local-cycle.lock');
 const getParentPid=()=>process.pid,processAlive=pid=>pid===process.pid;
 const create=()=>createD05LocalCycleExclusiveWriter({pcHome,getParentPid,processAlive});
 assert.equal(create(),null);
 assert.equal(createD05LocalCycleExclusiveWriter({pcHome:'relative-path'}),null);
 await writeFile(lockPath,JSON.stringify({pid:process.pid+1,at:Date.now()}));
 assert.equal(create(),null);
 const at=Date.now();
 await writeFile(lockPath,JSON.stringify({pid:process.pid,at}));
 const owner=create();assert.ok(owner);
 await writeFile(lockPath,JSON.stringify({pid:process.pid,at:at+1}));
 assert.equal(await owner.assertExclusive(),false);
 assert.equal(createD05LocalCycleExclusiveWriter({pcHome,getParentPid,
  processAlive:()=>false}),null);
 await rm(lockPath);
 await symlink(ledgerPath,lockPath);
 assert.equal(create(),null);
});
