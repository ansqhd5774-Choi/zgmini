// INACTIVE proposal: fail-closed, cross-process slots for *unregistered* BLS.
// This module is not wired to quota-fetch and cannot authorize a PC job.
// The shared ledger requires an independently approved, coverage-attested seed.
import fs from 'node:fs';
import path from 'node:path';

export const BLS_UNREGISTERED_SCHEMA='ZGMINI_BLS_UNREGISTERED_RESERVATIONS_V1';
export const BLS_UNREGISTERED_24H_LIMIT=25;
const DAY=24*60*60*1000;
const SHALESS_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const fail=code=>{const e=Error(code);e.code=code;throw e;};
const validInt=n=>Number.isSafeInteger(n)&&n>=0;
const ledgerPath=base=>path.join(base,'bls-unregistered-reservations.json');
const lockPath=base=>path.join(base,'bls-unregistered-reservations.lock');
const journalPath=base=>path.join(base,'bls-unregistered-reservations.journal');

function approvedPhysicalBase(base,approvedBase){
  if(typeof base!=='string'||typeof approvedBase!=='string'||
    !path.isAbsolute(base)||!path.isAbsolute(approvedBase))
    fail('BLS_UNREG_BASE_INVALID');
  let actual,approved;
  try{
    actual=fs.realpathSync.native(base);
    approved=fs.realpathSync.native(approvedBase);
  }catch{fail('BLS_UNREG_BASE_UNVERIFIED');}
  const normalize=s=>process.platform==='win32'?s.toLowerCase():s;
  if(normalize(actual)!==normalize(approved))fail('BLS_UNREG_BASE_MISMATCH');
  return actual;
}

function withExclusiveLock(base,callback){
  if(typeof base!=='string'||!path.isAbsolute(base))fail('BLS_UNREG_BASE_INVALID');
  try{if(!fs.statSync(base).isDirectory())fail('BLS_UNREG_BASE_INVALID');}
  catch{fail('BLS_UNREG_BASE_INVALID');}
  let fd;
  try{fd=fs.openSync(lockPath(base),'wx',0o600);}
  catch{fail('BLS_UNREG_RESERVATION_LOCKED');}
  try{return callback();}
  finally{
    fs.closeSync(fd);
    // Only remove the lock created by this call. Crashed-process locks remain
    // for verified/manual recovery; no automatic stale lock breaking.
    fs.unlinkSync(lockPath(base));
  }
}

function readState(base,now){
  let value;
  try{value=JSON.parse(fs.readFileSync(ledgerPath(base),'utf8'));}
  catch{fail('BLS_UNREG_LEDGER_UNAVAILABLE');}
  if(value?.schema!==BLS_UNREGISTERED_SCHEMA || value?.coverageAttested!==true ||
    !Array.isArray(value.requestTimes) || value.requestTimes.length>100000 ||
    !value.requestTimes.every(t=>validInt(t)&&t<=now) ||
    !value.leases || typeof value.leases!=='object' || Array.isArray(value.leases) ||
    Object.keys(value.leases).length>1000 ||
    Object.entries(value.leases).some(([id,lease])=>!SHALESS_UUID.test(id) ||
      !validInt(lease?.at) || lease.at>now ||
      !validInt(lease?.capacity) || lease.capacity>18 ||
      !validInt(lease?.spent) || lease.spent>lease.capacity))
    fail('BLS_UNREG_LEDGER_INVALID');
  // The approved seed is immutable. All new reservations are replayed from an
  // append-only, fsynced journal; incomplete final records stop all requests.
  let journal;
  try{journal=fs.readFileSync(journalPath(base),'utf8');}
  catch{fail('BLS_UNREG_JOURNAL_UNAVAILABLE');}
  if(journal.length>8_000_000 || (journal.length>0 && !journal.endsWith('\n')))
    fail('BLS_UNREG_JOURNAL_INVALID');
  for(const line of journal?journal.slice(0,-1).split('\n'):[]){
    let event;
    try{event=JSON.parse(line);}catch{fail('BLS_UNREG_JOURNAL_INVALID');}
    if(!event || !validInt(event.at) || event.at>now)
      fail('BLS_UNREG_JOURNAL_INVALID');
    const keys=Object.keys(event).sort().join('|');
    if(event.type==='ONE' && keys==='at|type'){
      value.requestTimes.push(event.at);
    }else if(event.type==='BATCH' && keys==='at|count|requestId|type' &&
      SHALESS_UUID.test(event.requestId) && validInt(event.count) &&
      event.count>=1 && event.count<=18 && !Object.hasOwn(value.leases,event.requestId)){
      value.leases[event.requestId]={at:event.at,capacity:event.count,spent:0};
    }else if(event.type==='SPEND' && keys==='at|requestId|type' &&
      SHALESS_UUID.test(event.requestId)){
      const lease=value.leases[event.requestId];
      if(!lease || event.at<lease.at || event.at-lease.at>=DAY ||
        lease.spent>=lease.capacity)fail('BLS_UNREG_JOURNAL_INVALID');
      lease.spent++;
      lease.at=event.at;
    }else fail('BLS_UNREG_JOURNAL_INVALID');
  }
  // Ordinary calls and prebooked batch slots are disjoint. A batch lease stays
  // fully charged until 24h after its latest *physical attempt*, not booking.
  value.requestTimes=value.requestTimes.filter(t=>t>now-DAY);
  return value;
}

const usedSlots=(state,now)=>state.requestTimes.length+
  Object.values(state.leases).filter(lease=>lease.at>now-DAY)
    .reduce((total,lease)=>total+lease.capacity,0);

function appendDurableEvent(base,event){
  let fd;
  try{
    // Journal must already exist as part of the approved seed. Never create
    // a fresh empty journal during an actual provider request.
    fs.statSync(journalPath(base));
    fd=fs.openSync(journalPath(base),'a');
    const bytes=Buffer.from(JSON.stringify(event)+'\n');
    if(fs.writeSync(fd,bytes,0,bytes.length)!==bytes.length)
      fail('BLS_UNREG_JOURNAL_SHORT_WRITE');
    fs.fsyncSync(fd); // complete persistence before a physical provider call
  }catch{fail('BLS_UNREG_JOURNAL_DURABILITY_UNKNOWN');}
  finally{if(fd!==undefined)fs.closeSync(fd);}
}

function visit(base,approvedBase,now,fn){
  if(!validInt(now))fail('BLS_UNREG_TIME_INVALID');
  const canonical=approvedPhysicalBase(base,approvedBase);
  return withExclusiveLock(canonical,()=>{
    const state=readState(canonical,now);
    return fn(state,canonical);
  });
}

// One slot for each ordinary BLS request, reserved before making the request.
export function reserveOneUnregisteredBlsRequest({base,approvedBase,now=Date.now()}={}){
  return visit(base,approvedBase,now,(state,root)=>{
    if(usedSlots(state,now)>=BLS_UNREGISTERED_24H_LIMIT)
      fail('BLS_UNREG_25_PER_24H_STOP');
    appendDurableEvent(root,{type:'ONE',at:now});
    state.requestTimes.push(now);
    const used=usedSlots(state,now);
    return {reserved:1,used24h:used,remaining24h:25-used};
  });
}

// A B-grade R6 job can pre-book at most 18 physical slots atomically.
// Each subsequent network attempt must spend one booked slot using this ID.
export function reserveR6UnregisteredBlsBatch({base,approvedBase,requestId,count,now=Date.now()}={}){
  if(!SHALESS_UUID.test(requestId??'')||!Number.isSafeInteger(count)||count<1||count>18)
    fail('BLS_UNREG_BATCH_SCOPE_STOP');
  return visit(base,approvedBase,now,(state,root)=>{
    if(Object.hasOwn(state.leases,requestId))fail('BLS_UNREG_DUPLICATE_BATCH_STOP');
    if(usedSlots(state,now)+count>BLS_UNREGISTERED_24H_LIMIT)
      fail('BLS_UNREG_25_PER_24H_STOP');
    appendDurableEvent(root,{type:'BATCH',at:now,requestId,count});
    state.leases[requestId]={at:now,capacity:count,spent:0};
    const used=usedSlots(state,now);
    return {requestId,reserved:count,used24h:used,remaining24h:25-used};
  });
}

// Increments a pre-booked slot exactly once before the corresponding fetch.
// Do not release unused slots on error or crash; that would undercount calls.
export function spendR6UnregisteredBlsSlot({base,approvedBase,requestId,now=Date.now()}={}){
  if(!SHALESS_UUID.test(requestId??''))fail('BLS_UNREG_BATCH_SCOPE_STOP');
  return visit(base,approvedBase,now,(state,root)=>{
    const lease=state.leases[requestId];
    if(!lease || lease.at<=now-DAY || lease.spent>=lease.capacity)
      fail('BLS_UNREG_BATCH_EXHAUSTED');
    appendDurableEvent(root,{type:'SPEND',at:now,requestId});
    lease.spent++;
    // Extend *all* booked slots until 24h after the newest actual attempt.
    // Holding unused slots longer is conservative and prevents t0-window expiry
    // from undercounting a provider call made later than the booking time.
    lease.at=now;
    return {requestId,spent:lease.spent,reserved:lease.capacity};
  });
}

export function inspectUnregisteredBlsSlots({base,approvedBase,now=Date.now()}={}){
  return visit(base,approvedBase,now,state=>({used24h:usedSlots(state,now),
    remaining24h:25-usedSlots(state,now)}));
}
