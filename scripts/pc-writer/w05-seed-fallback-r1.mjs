// Scoped W05 fallback within the existing approved Writer. No new Task or DB.
import {attemptOutput} from './independent-publication.mjs';
import {W05_SAVED_IDS,publishW05StoredSidecar} from './w05-stored-sidecar-publication-r1.mjs';

// Preserve the original full-cycle predicate. Incomplete unrelated seed entries
// may not be reclassified as complete for market or Korea calculations.
export function hasCompleteLocalSeed(seed){
 return seed!==null&&typeof seed==='object'&&!Array.isArray(seed)
  &&Object.keys(seed).length>0
  &&Object.values(seed).every(entry=>Boolean(entry?.complete));
}

// Called only by run-local.mjs after its existing source/approval check and
// publication recovery. Each output keeps its own saved-source validation,
// exact D1 key, readback and immutable history parity contract.
export async function publishW05WithIncompleteSeed({
 report,pcHome,remote,coreDb,now,publishOne=publishW05StoredSidecar,
}={}){
 if(!report||!Number.isSafeInteger(now)||now<=0||typeof coreDb!=='string'
  ||!coreDb||typeof pcHome!=='string'||!remote)
  throw Error('W05_SEED_FALLBACK_ARGUMENTS_INVALID');
 report.w05SavedSidecars={};
 for(const id of W05_SAVED_IDS){
  await attemptOutput(report,'w05-saved-sidecar:'+id,async()=>{
   report.w05SavedSidecars[id]=await publishOne({
    id,pcHome,remote,coreDb,now,
   });
  });
 }
 return report.w05SavedSidecars;
}
