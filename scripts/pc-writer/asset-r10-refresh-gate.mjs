// Do not confuse a previously valid stored release with a successful current
// calculation. Failed R10 input refreshes preserve the last known good result
// without advancing its public projection checkpoint or publishing sidecars.
export const R10_RECALCULATED_STATUS='RECALCULATED_FROM_SAVED_INPUTS';

export function preservePreviousR10({inputInstalled=false,calculationStatus=null,projectionStatus=null}={}){
  return inputInstalled&&(calculationStatus!==R10_RECALCULATED_STATUS||projectionStatus!=='READY');
}
