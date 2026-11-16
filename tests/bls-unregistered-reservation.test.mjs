import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
  BLS_UNREGISTERED_SCHEMA,
  reserveOneUnregisteredBlsRequest as reserveOneStrict,
  reserveR6UnregisteredBlsBatch as reserveBatchStrict,
  spendR6UnregisteredBlsSlot as spendStrict,
  inspectUnregisteredBlsSlots as inspectStrict,
} from '../scripts/pc-writer/bls-unregistered-reservation.mjs';

const reserveOneUnregisteredBlsRequest=opts=>reserveOneStrict({...opts,approvedBase:opts.base});
const reserveR6UnregisteredBlsBatch=opts=>reserveBatchStrict({...opts,approvedBase:opts.base});
const spendR6UnregisteredBlsSlot=opts=>spendStrict({...opts,approvedBase:opts.base});
const inspectUnregisteredBlsSlots=opts=>inspectStrict({...opts,approvedBase:opts.base});

const now=Date.parse('2026-11-09T04:00:00Z');
const job='fce55270-a893-44c6-b9c4-0aadd73059ce';
const competingJob='0a70cc67-a3da-4cd8-8d53-adcbb44a2186';
function fixture(used,{verified=true}={}){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'r6-bls-slots-'));
  const seed=JSON.stringify({
    schema:BLS_UNREGISTERED_SCHEMA,coverageAttested:verified,
    requestTimes:Array(used).fill(now-1000),leases:{},
  });
  const hash=s=>createHash('sha256').update(s).digest('hex');
  fs.writeFileSync(path.join(base,'bls-unregistered-reservations.json'),seed);
  fs.writeFileSync(path.join(base,'bls-unregistered-reservations.journal'),'');
  fs.writeFileSync(path.join(base,'bls-unregistered-reservations.anchor'),JSON.stringify({
    schema:'ZGMINI_BLS_UNREGISTERED_ANCHOR_V1',seedSha256:hash(seed),
    journalSha256:hash(''),sequence:0,
  }));
  return base;
}
const clean=base=>fs.rmSync(base,{recursive:true,force:true});

// Actual independent Node workers share the same physical journal/lock.
// This is distinct from making two sequential calls in one test process.
function childBatch(base,requestId){
  const source=new URL('../scripts/pc-writer/bls-unregistered-reservation.mjs',import.meta.url).href;
  const script=`import {reserveR6UnregisteredBlsBatch} from ${JSON.stringify(source)};
    const opts=JSON.parse(process.argv[1]);
    process.stdout.write('READY\\n');
    process.stdin.once('data',()=>{
      try {reserveR6UnregisteredBlsBatch(opts);process.stdout.write('RESERVED');}
      catch(e){process.stdout.write(e.code??'UNEXPECTED_ERROR');process.exitCode=2;}
    });`;
  const child=spawn(process.execPath,['--input-type=module','--eval',script,
    JSON.stringify({base,approvedBase:base,requestId,count:18,now})],
    {stdio:['pipe','pipe','pipe'],shell:false});
  let stdout='',stderr='',readyResolve,readyReject,readySeen=false;
  const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
  const done=new Promise((resolve,reject)=>{
    child.stdout.setEncoding('utf8').on('data',s=>{
      stdout+=s;
      if(!readySeen&&stdout.includes('READY\n')){readySeen=true;readyResolve();}
    });
    child.stderr.setEncoding('utf8').on('data',s=>stderr+=s);
    child.on('error',error=>{readyReject(error);reject(error);});
    child.on('close',code=>{
      if(!readySeen)readyReject(Error('CHILD_EXITED_BEFORE_READY'));
      resolve({code,stdout:stdout.replace('READY\n',''),stderr});
    });
  });
  return {ready,go:()=>child.stdin.end('GO\n'),done};
}

test('independent Node processes competing for the last 18 physical slots cannot both reserve',async()=>{
  const base=fixture(7);
  try{
    const children=[childBatch(base,job),childBatch(base,competingJob)];
    await Promise.all(children.map(child=>child.ready));
    // Both children are running and waiting at the same explicit barrier.
    children.forEach(child=>child.go());
    const results=await Promise.all(children.map(child=>child.done));
    assert.equal(results.filter(x=>x.code===0&&x.stdout==='RESERVED').length,1,
      JSON.stringify(results));
    const refused=results.find(x=>x.code!==0);
    assert.equal(refused?.code,2,JSON.stringify(results));
    assert.match(refused.stdout,/BLS_UNREG_(RESERVATION_LOCKED|25_PER_24H_STOP)/);
    assert.deepEqual(inspectUnregisteredBlsSlots({base,now}),{used24h:25,remaining24h:0});
  }finally{clean(base);}
});

test('7 historical + R6 18 atomically fills all 25; duplicates and ordinary calls blocked',()=>{
  const base=fixture(7);
  try{
    assert.equal(reserveR6UnregisteredBlsBatch({base,requestId:job,count:18,now}).used24h,25);
    assert.throws(()=>reserveR6UnregisteredBlsBatch({base,requestId:job,count:18,now}),
      /BLS_UNREG_DUPLICATE_BATCH_STOP/);
    assert.throws(()=>reserveOneUnregisteredBlsRequest({base,now}),/BLS_UNREG_25_PER_24H_STOP/);
    for(let i=0;i<18;i++)assert.equal(spendR6UnregisteredBlsSlot({base,requestId:job,now}).spent,i+1);
    assert.throws(()=>spendR6UnregisteredBlsSlot({base,requestId:job,now}),
      /BLS_UNREG_BATCH_EXHAUSTED/);
  }finally{clean(base);}
});

test('8 historical + 18 never reserves or consumes a network slot',()=>{
  const base=fixture(8);
  try{
    assert.throws(()=>reserveR6UnregisteredBlsBatch({base,requestId:job,count:18,now}),
      /BLS_UNREG_25_PER_24H_STOP/);
    assert.deepEqual(inspectUnregisteredBlsSlots({base,now}),{used24h:8,remaining24h:17});
  }finally{clean(base);}
});

test('two competing 18-slot batches cannot both fit inside the same remaining 18',()=>{
  const base=fixture(7);
  try{
    reserveR6UnregisteredBlsBatch({base,requestId:job,count:18,now});
    assert.throws(()=>reserveR6UnregisteredBlsBatch({
      base,requestId:competingJob,count:18,now,
    }),/BLS_UNREG_25_PER_24H_STOP/);
    assert.equal(inspectUnregisteredBlsSlots({base,now}).used24h,25);
  }finally{clean(base);}
});

test('R4 nine physical fallbacks plus R6 eighteen are refused (9+18=27)',()=>{
  const base=fixture(0);
  try{
    for(let i=0;i<9;i++)reserveOneUnregisteredBlsRequest({base,now:now+i});
    assert.throws(()=>reserveR6UnregisteredBlsBatch({
      base,requestId:job,count:18,now:now+10,
    }),/BLS_UNREG_25_PER_24H_STOP/);
    assert.equal(inspectUnregisteredBlsSlots({base,now:now+10}).used24h,9);
  }finally{clean(base);}
});

test('crash after prebooking stays conservatively charged with zero automatic refund',()=>{
  const base=fixture(7);
  try{
    reserveR6UnregisteredBlsBatch({base,requestId:job,count:18,now});
    // No spending: process died immediately after booking all 18 slots.
    assert.deepEqual(inspectUnregisteredBlsSlots({base,now:now+60000}),
      {used24h:25,remaining24h:0});
    assert.throws(()=>reserveOneUnregisteredBlsRequest({base,now:now+60000}),
      /BLS_UNREG_25_PER_24H_STOP/);
  }finally{clean(base);}
});

test('lock contention and missing, unverified or corrupt ledger fail closed',()=>{
  const base=fixture(0);
  try{
    const lock=path.join(base,'bls-unregistered-reservations.lock');
    fs.writeFileSync(lock,'running');
    assert.throws(()=>reserveOneUnregisteredBlsRequest({base,now}),/BLS_UNREG_RESERVATION_LOCKED/);
    fs.unlinkSync(lock);
    fs.writeFileSync(path.join(base,'bls-unregistered-reservations.json'),'broken');
    assert.throws(()=>reserveOneUnregisteredBlsRequest({base,now}),/BLS_UNREG_LEDGER_UNAVAILABLE/);
  }finally{clean(base);}
  const unverified=fixture(0,{verified:false});
  try{assert.throws(()=>reserveOneUnregisteredBlsRequest({base:unverified,now}),
    /BLS_UNREG_LEDGER_INVALID/);}finally{clean(unverified);}
});

test('renamed lock replaced by a different owner is preserved and no permit escapes',()=>{
  const base=fixture(0),read=fs.readFileSync;
  const file=path.join(base,'bls-unregistered-reservations.lock');
  const former=file+'.moved';
  const seed=path.join(base,'bls-unregistered-reservations.json');
  let replaced=false;
  try{
    fs.readFileSync=function(target,...args){
      if(!replaced&&String(target)===seed){
        replaced=true;
        fs.renameSync(file,former);
        fs.writeFileSync(file,'FOREIGN_LOCK_OWNER');
      }
      return read.call(fs,target,...args);
    };
    assert.throws(()=>reserveOneUnregisteredBlsRequest({base,now}),
      /BLS_UNREG_RESERVATION_LOCK_OWNER_CHANGED/);
    assert.equal(replaced,true);
    assert.equal(read.call(fs,file,'utf8'),'FOREIGN_LOCK_OWNER');
    assert.equal(fs.existsSync(former),true);
  }finally{fs.readFileSync=read;clean(base);}
});

test('same-inode lock payload changed by a different owner is never unlinked',()=>{
  const base=fixture(0),read=fs.readFileSync;
  const file=path.join(base,'bls-unregistered-reservations.lock');
  const seed=path.join(base,'bls-unregistered-reservations.json');
  let replaced=false;
  try{
    fs.readFileSync=function(target,...args){
      if(!replaced&&String(target)===seed){
        replaced=true;
        fs.writeFileSync(file,'FOREIGN_LOCK_OWNER');
      }
      return read.call(fs,target,...args);
    };
    assert.throws(()=>reserveOneUnregisteredBlsRequest({base,now}),
      /BLS_UNREG_RESERVATION_LOCK_OWNER_CHANGED/);
    assert.equal(replaced,true);
    assert.equal(read.call(fs,file,'utf8'),'FOREIGN_LOCK_OWNER');
  }finally{fs.readFileSync=read;clean(base);}
});

test('torn journal or missing durable journal stops before any new request',()=>{
  const base=fixture(0);
  try{
    fs.writeFileSync(path.join(base,'bls-unregistered-reservations.journal'),
      '{"type":"ONE","at":');
    assert.throws(()=>reserveOneUnregisteredBlsRequest({base,now}),
      /BLS_UNREG_JOURNAL_INVALID/);
    fs.unlinkSync(path.join(base,'bls-unregistered-reservations.journal'));
    assert.throws(()=>reserveOneUnregisteredBlsRequest({base,now}),
      /BLS_UNREG_JOURNAL_UNAVAILABLE/);
  }finally{clean(base);}
});

test('whole-line prefix truncation and seed shrink are rejected by sealed head',()=>{
  const base=fixture(1);
  try{
    reserveOneUnregisteredBlsRequest({base,now});
    reserveOneUnregisteredBlsRequest({base,now:now+1});
    const journalPath=path.join(base,'bls-unregistered-reservations.journal');
    const original=fs.readFileSync(journalPath,'utf8');
    fs.writeFileSync(journalPath,original.split('\n')[0]+'\n');
    assert.throws(()=>reserveOneUnregisteredBlsRequest({base,now:now+2}),
      /BLS_UNREG_ANCHOR_MISMATCH/);
    fs.writeFileSync(journalPath,original);
    const seedPath=path.join(base,'bls-unregistered-reservations.json');
    const seed=JSON.parse(fs.readFileSync(seedPath,'utf8'));
    seed.requestTimes=[];
    fs.writeFileSync(seedPath,JSON.stringify(seed));
    assert.throws(()=>reserveOneUnregisteredBlsRequest({base,now:now+2}),
      /BLS_UNREG_ANCHOR_MISMATCH/);
  }finally{clean(base);}
});

test('fsync failure never returns a permit and incomplete anchor stops next request',()=>{
  const base=fixture(0),oldFsync=fs.fsyncSync;
  try{
    fs.fsyncSync=()=>{throw Error('simulated-storage-error');};
    assert.throws(()=>reserveOneUnregisteredBlsRequest({base,now}),
      /BLS_UNREG_JOURNAL_DURABILITY_UNKNOWN/);
  }finally{fs.fsyncSync=oldFsync;}
  try{
    assert.throws(()=>reserveOneUnregisteredBlsRequest({base,now:now+1}),
      /BLS_UNREG_ANCHOR_MISMATCH/);
  }finally{clean(base);}
});

test('no stale lease reuse after 24 hours and ordinary reservations age out',()=>{
  const base=fixture(0);
  try{
    reserveR6UnregisteredBlsBatch({base,requestId:job,count:2,now});
    assert.equal(spendR6UnregisteredBlsSlot({base,requestId:job,now}).spent,1);
    const next=now+24*60*60*1000+1;
    assert.throws(()=>spendR6UnregisteredBlsSlot({base,requestId:job,now:next}),
      /BLS_UNREG_BATCH_EXHAUSTED/);
    assert.equal(reserveOneUnregisteredBlsRequest({base,now:next}).remaining24h,24);
  }finally{clean(base);}
});

test('late spending extends the batch window: never expire slots at booking time',()=>{
  const base=fixture(0);
  try{
    reserveR6UnregisteredBlsBatch({base,requestId:job,count:18,now});
    const late=now+60*60*1000;
    spendR6UnregisteredBlsSlot({base,requestId:job,now:late});
    const afterBookingExpired=now+24*60*60*1000+1;
    assert.deepEqual(inspectUnregisteredBlsSlots({base,now:afterBookingExpired}),
      {used24h:18,remaining24h:7});
    for(let i=0;i<7;i++)reserveOneUnregisteredBlsRequest({base,now:afterBookingExpired});
    assert.throws(()=>reserveOneUnregisteredBlsRequest({base,now:afterBookingExpired}),
      /BLS_UNREG_25_PER_24H_STOP/);
  }finally{clean(base);}
});

test('all operations require approved canonical base and refuse a second physical ledger',()=>{
  const base=fixture(1),other=fixture(1);
  try{
    assert.throws(()=>reserveOneStrict({base,now}),/BLS_UNREG_BASE_INVALID/);
    assert.throws(()=>reserveOneStrict({base,approvedBase:other,now}),
      /BLS_UNREG_BASE_MISMATCH/);
    assert.deepEqual(inspectStrict({base,approvedBase:base,now}),
      {used24h:1,remaining24h:24});
    assert.deepEqual(inspectStrict({base:path.join(base,'.'),approvedBase:base,now}),
      {used24h:1,remaining24h:24});
  }finally{clean(base);clean(other);}
});
