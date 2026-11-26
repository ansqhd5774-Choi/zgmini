// Do not confuse a previously valid stored release with a successful current
// calculation. Failed R10 input refreshes preserve the last known good result
// without advancing its public projection checkpoint or publishing sidecars.
export const R10_RECALCULATED_STATUS='RECALCULATED_FROM_SAVED_INPUTS';

export function preservePreviousR10({inputInstalled=false,calculationStatus=null,projectionStatus=null}={}){
  // A valid saved release can survive after the research input file is moved
  // or temporarily missing. Its READY status does not prove a new calculation.
  // Preserve legacy R9 fallback only when there is no saved READY R10 release.
  if(!inputInstalled)return projectionStatus==='READY';
  return calculationStatus!==R10_RECALCULATED_STATUS||projectionStatus!=='READY';
}
