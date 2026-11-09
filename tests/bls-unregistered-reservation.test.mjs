import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
function fixture(used,{verified=true}={}){
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'r6-bls-slots-'));
  fs.writeFileSync(path.join(base,'bls-unregistered-reservations.json'),JSON.stringify({
    schema:BLS_UNREGISTERED_SCHEMA,coverageAttested:verified,
    requestTimes:Array(used).fill(now-1000),leases:{},
  }));
  fs.writeFileSync(path.join(base,'bls-unregistered-reservations.journal'),'');
  return base;
}
const clean=base=>fs.rmSync(base,{recursive:true,force:true});

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
