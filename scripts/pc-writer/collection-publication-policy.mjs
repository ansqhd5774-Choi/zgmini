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

// Existing runner's explicit CNN-only lane. A successful collection receipt
// (including a known cached/cooldown tick) is required before saved publication.
// The shared feed lease prevents duplicate collection; D1 CAS/readback protects
// publication. Unknown child outcomes are not automatically replayed.
export async function runCnnMinuteCycle({collect,publish}){
 const report={lane:'cnn-minute',collection:null,publication:null};
 try{report.collection=await collect();}catch{return {...report,status:'COLLECTION_OUTCOME_UNKNOWN'};}
 const c=report.collection;
 if(c?.lane!=='cnn-minute')return {...report,status:'COLLECTION_OUTCOME_UNKNOWN'};
 if(c.status==='ALREADY_RUNNING')return {...report,status:'SKIPPED_ACTIVE_COLLECTION'};
 if(!['COMPLETE','PARTIAL'].includes(c.status)||!Array.isArray(c.feeds)||c.feeds.length!==1||
    c.feeds[0]?.key!=='fear-greed'||!['COMPLETE','CACHED','COOLDOWN','FAILED'].includes(c.feeds[0]?.status))
  return {...report,status:'COLLECTION_NOT_VERIFIED'};
 // A failed provider request may still leave previously saved data available.
 // Publish only the existing validated stored output, and report degradation.
 const degraded=c.status==='PARTIAL'||c.feeds[0].status==='FAILED';
 try{report.publication=await publish();}catch{return {...report,status:'PUBLICATION_OUTCOME_UNKNOWN'};}
 if(report.publication?.lane!=='cnn-minute'||report.publication?.status!=='VERIFIED')
  return {...report,status:'PUBLICATION_NOT_VERIFIED'};
 return {...report,status:degraded?'COMPLETE_WITH_COLLECTION_GAPS':'COMPLETE'};
}
