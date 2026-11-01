// Collection transport failure is not a calculation verdict. The publisher still
// enforces source approval, input validity, freshness, leases and read-back.
export function collectionPublicationPolicy({requested=false,collectionExit,collectionStatus,quotaGuarded=false}){
 const degraded=collectionExit!==0||['ERROR','FAILED','SOURCE_FAILED'].includes(collectionStatus)||quotaGuarded;
 return {publishAllowed:requested===true,collectionDegraded:degraded,
  inputPolicy:degraded?'VALID_STORED_INPUTS_ONLY':'NORMAL_STORED_INPUTS',
  collectionReason:quotaGuarded?'QUOTA_GUARD':degraded?'COLLECTION_FAILED':null};
}
export function validDegradedMarket(body){
 return body?.status==='SUCCESS'&&body.overall?.status==='READY'
  &&Number.isFinite(body.overall.score)&&body.overall.score>=0&&body.overall.score<=100
  &&Array.isArray(body.domains)&&body.domains.length===12
  &&new Set(body.domains.map(d=>d.id)).size===12
  &&body.domains.every(d=>d.status==='READY'&&Number.isFinite(d.score)&&d.score>=0&&d.score<=100);
}
