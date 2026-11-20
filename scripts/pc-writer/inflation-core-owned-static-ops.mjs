// Dormant implementation of the approved-source portion of W01 Core-owned
// handoff. A separately installed, trusted Controller receiver must supply
// authenticated request/manifest and journal/Writer lease operations.
// There is deliberately no CLI, Task hook, opt-in env flag or timer.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {
 fetchOfficialManualCandidateSources,
} from './inflation-causal-candidate-manual-official-r1.mjs';
import {
 prepareOfficialManualStore,applyOfficialManualStore,MANUAL_STORE_OPERATION,
} from './inflation-causal-candidate-manual-official-store-r1.mjs';
import {assertCurrentCoreOwnedLock} from './inflation-core-owned-lock-proof.mjs';

const TARGETS=Object.freeze([
 'bls-cpi-ppi3.json','census-m3-manufacturing-inventories.json'
]);
const DIR='inflation-causal-candidates-r1';
const methods=['authenticateExistingB','tryAcquireSharedWriterLease',
 'readCurrentSourcePreimage','recordOnceJournal'];
const stop=code=>{throw Object.assign(new Error(code),{code});};
const need=(ok,code)=>{if(!ok)stop(code);};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const safeFile=(file,base,max=24_000_000)=>{
 const realBase=fs.realpathSync.native(base);
 const real=fs.realpathSync.native(file);
 const st=fs.lstatSync(file);
 need(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&
  st.size>0&&st.size<=max&&path.dirname(real).toLowerCase()
    .startsWith(realBase.toLowerCase()+path.sep),
  'INFL_CORE_STATIC_READBACK_SCOPE_STOP');
 return fs.readFileSync(file);
};

// Instantiate only inside the already-running Core that owns local-cycle.lock.
// The current Core base is an actual runtime value, not Issue-body input;
// approvedRoot is a fixed, installed contractual value.
export function makeCoreOwnedInflationStaticOps({
 base,approvedRoot,controller,
 fetchImpl=globalThis.fetch,
 parse=prepareOfficialManualStore,apply=applyOfficialManualStore,
}={}){
 need(typeof base==='string'&&path.isAbsolute(base)&&
  typeof approvedRoot==='string'&&path.isAbsolute(approvedRoot)&&
  isObject(controller)&&methods.every(m=>typeof controller[m]==='function')&&
  typeof fetchImpl==='function'&&typeof parse==='function'&&
  typeof apply==='function',
  'INFL_CORE_STATIC_OPS_CONTRACT_STOP');
 // Re-prove current Core ownership on each transaction boundary.
 const prove=()=>assertCurrentCoreOwnedLock({base,approvedRoot});
 return Object.freeze({
  authenticateExistingB:requestId=>controller.authenticateExistingB(requestId),
  assertCurrentCoreOwner:prove,
  tryAcquireSharedWriterLease:requestId=>
   controller.tryAcquireSharedWriterLease(requestId),
  readCurrentSourcePreimage:approval=>
   controller.readCurrentSourcePreimage(approval),
  recordOnceJournal:(requestId,phase)=>
   controller.recordOnceJournal(requestId,phase),
  async fetchTwoOfficialStaticSources(){
   const result=await fetchOfficialManualCandidateSources({fetchImpl});
   return {blsBytes:result.blsBytes,censusBytes:result.censusBytes,
    providerCalls:2};
  },
  async preflightExistingStore(sources){
   const result=await parse({
    base,blsBytes:sources.blsBytes,censusBytes:sources.censusBytes
   });
   need(Array.isArray(result?.plan?.documents?.bls?.series?.WPSFD4)&&
    result.plan.documents.bls.series.WPSFD4.length>0,
    'INFL_CORE_STATIC_PPI_PREIMAGE_STOP');
  },
  async applyUnderExistingBLease({requestId,sources,writer}){
   need(typeof writer?.verify==='function'&&
    typeof requestId==='string'&&requestId.length>0,
    'INFL_CORE_STATIC_WRITER_LEASE_STOP');
   return apply({
    base,blsBytes:sources.blsBytes,censusBytes:sources.censusBytes,
    withApprovedWriterB:async (operation,perform)=>{
     need(operation?.operation===MANUAL_STORE_OPERATION&&
      Array.isArray(operation.targets)&&operation.targets.length===2&&
      TARGETS.every((name,i)=>operation.targets[i]===
       path.join(fs.realpathSync.native(base),DIR,name)),
      'INFL_CORE_STATIC_STORE_TARGET_STOP');
     await writer.verify();
     prove();
     return perform(Object.freeze({scope:'APPROVED_WRITER_B',requestId}));
    },
   });
  },
  async readbackSavedFiles(result){
   need(isObject(result)&&isObject(result.archives)&&
    /^[a-f0-9]{64}$/.test(result.archives.bls?.hash??'')&&
    /^[a-f0-9]{64}$/.test(result.archives.census?.hash??''),
    'INFL_CORE_STATIC_READBACK_METADATA_STOP');
   const home=fs.realpathSync.native(base);
   for(const key of ['bls','census']){
    const archive=result.archives[key];
    const bytes=safeFile(archive.file,home,
     key==='census'?6_000_000:8_000_000);
    need(sha(bytes)===archive.hash,
     'INFL_CORE_STATIC_READBACK_HASH_STOP');
    if(result.writes?.[key]){
     const file=path.join(home,DIR,TARGETS[key==='bls'?0:1]);
     const saved=safeFile(file,home);
     need(sha(saved)===result.writes[key].sha256,
      'INFL_CORE_STATIC_READBACK_HASH_STOP');
    }
   }
  }
 });
}
