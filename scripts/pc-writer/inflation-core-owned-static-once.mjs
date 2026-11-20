// Dormant Core-owned handoff for the already-reviewed BLS/Census static transaction.
// Not a CLI, timer, authorization issuer, or replacement for an approved B receiver.
// The trusted controller adapter must authenticate its exact B manifest and request,
// attest the *current* Core-owned lock, and supply the existing nonblocking Writer lease.
// Nothing here may enable a new provider request or change the running Core Task.
export const INFLATION_CORE_STATIC_SCOPE='INFLATION_OFFICIAL_STATIC_TWO_RAW_JSON_ONLY';
const CODE=/^INFL_CORE_STATIC_[A-Z0-9_]+$/;
const stop=code=>{throw Object.assign(new Error(code),{code});};
const need=(yes,code)=>{if(!yes)stop(code);};
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH=/^[0-9a-f]{64}$/i;
const allowedMethods=['authenticateExistingB','assertCurrentCoreOwner','tryAcquireSharedWriterLease',
 'readCurrentSourcePreimage','fetchTwoOfficialStaticSources','preflightExistingStore',
 'applyUnderExistingBLease','readbackSavedFiles','recordOnceJournal'];

function exactApproval(approval,requestId){
 need(isObject(approval)&&approval.status==='APPROVED_B'&&
  approval.scope===INFLATION_CORE_STATIC_SCOPE&&approval.requestId===requestId&&
  approval.runCount===1&&approval.coreExecution==='CURRENT_CORE_OWNED_LOCK'&&
  approval.exactOfficialSources===true&&approval.exactTwoTargets===true&&
  approval.dbWrites===false&&approval.d1Writes===false&&
  approval.taskChanges===false&&approval.sourceChanges===false&&
  HASH.test(approval.manifestSha256??''),
  'INFL_CORE_STATIC_APPROVAL_SCOPE_STOP');
}

// This coordinator does not create an authorization. authenticateExistingB()
// must be backed by the installed, pinned controller's cryptographic
// manifest/event verification. A synthetic boolean, JSON flag or local file is
// never adequate to implement that method. Until such an adapter is approved
// and installed, this code is deliberately unreachable from local-cycle.mjs.
export async function runCoreOwnedInflationStaticOnce({requestId,adapter}={}){
 need(UUID.test(requestId??'')&&isObject(adapter)&&
  allowedMethods.every(m=>typeof adapter[m]==='function'),
  'INFL_CORE_STATIC_ADAPTER_CONTRACT_STOP');
 let claimed=false,writeIntent=false,completed=false,writer=null;
 try{
  const approval=await adapter.authenticateExistingB(requestId);
  exactApproval(approval,requestId);
  await adapter.assertCurrentCoreOwner();
  // Nonblocking: avoid holding Core's own lock while waiting on a Writer B
  // that might require Core to become idle. No lock takeover or task pause.
  writer=await adapter.tryAcquireSharedWriterLease(requestId);
  if(!writer)return {status:'DEFERRED',code:'INFL_CORE_STATIC_WRITER_BUSY',
   requestId,providerCalls:0,operationalWrites:0};
  need(typeof writer.release==='function'&&
   typeof writer.verify==='function'&&
   typeof writer.claimOnce==='function',
   'INFL_CORE_STATIC_WRITER_LEASE_STOP');
  await writer.verify();
  await adapter.assertCurrentCoreOwner();
  await adapter.readCurrentSourcePreimage(approval);
  // Persist an authenticated single-use claim BEFORE any supplier I/O.
  // A crash/unknown result is reconciled rather than replayed.
  await writer.claimOnce(requestId);claimed=true;
  await adapter.recordOnceJournal(requestId,'CLAIMED');
  const sources=await adapter.fetchTwoOfficialStaticSources(approval);
  need(isObject(sources)&&sources.providerCalls===2&&
   Buffer.isBuffer(sources.blsBytes)&&sources.blsBytes.length>0&&
   sources.blsBytes.length<=8_000_000&&
   Buffer.isBuffer(sources.censusBytes)&&sources.censusBytes.length>0&&
   sources.censusBytes.length<=6_000_000,
   'INFL_CORE_STATIC_SOURCE_SCOPE_STOP');
  await adapter.preflightExistingStore(sources);
  await writer.verify();
  await adapter.assertCurrentCoreOwner();
  await adapter.readCurrentSourcePreimage(approval);
  writeIntent=true;
  const result=await adapter.applyUnderExistingBLease({requestId,sources,writer});
  need(isObject(result)&&['SAVED_READBACK','UNCHANGED','ARCHIVED_READBACK'].includes(result.status)&&
   result.requestId===requestId&&result.apiCalls===0&&result.dbWrites===0&&
   result.d1Writes===0&&result.coreCheckpointWrites===0,
   'INFL_CORE_STATIC_STORE_SCOPE_STOP');
  await adapter.readbackSavedFiles(result);
  await adapter.recordOnceJournal(requestId,'COMPLETED');completed=true;
  return {status:'PASS',code:'INFL_CORE_STATIC_READBACK_VERIFIED',
   requestId,providerCalls:2,storedStatus:result.status};
 }catch(e){
  const code=typeof e?.code==='string'&&CODE.test(e.code)?
   e.code:'INFL_CORE_STATIC_UNVERIFIED_STOP';
  if(claimed){
   try{await adapter.recordOnceJournal(requestId,
    writeIntent?'RECOVERY_REQUIRED':'CLAIMED_UNTOUCHED_STOP');}catch{}
  }
  return {status:writeIntent?'RECOVERY_REQUIRED':'STOP',code,requestId,
   retry:'NO_AUTOMATIC_REPLAY',providerCalls:null};
 }finally{
  if(writer){
   // The trusted writer adapter alone verifies and releases its own exact
   // lease; it must preserve owner/lease state on uncertain finalization.
   await writer.release({retain:writeIntent&&!completed});
  }
 }
}
