import {COMPOSITE_OBSERVED_PREFIX,COMPOSITE_OBSERVED_VERSION,
 compositeSampleFromVerified} from '../composite-observed-history-r1.mjs';

// Development-only, read-only correlation of one already stored score event
// with the seven inputs observed in the *same* calculation. Never write this
// private metadata to the public score archive or D1.
const SOURCE_KEYS=Object.freeze(['macro','credit','supply','fundFlows','bisDsr','bisTc','rates']);
const SHA256=/^[0-9a-f]{64}$/;
const BATCH_KEY=/^[A-Za-z0-9._:-]{1,128}$/;
const safeFailure=(code)=>Object.freeze({status:'UNPROVEN',code});

function selectVerifiedSeven(capture){
 const e=capture?.evidence;
 if(e?.status!=='SHADOW_7_BATCHES_ONLY'||e?.verifiedCount!==SOURCE_KEYS.length||
  e?.totalBatches!==SOURCE_KEYS.length||!Array.isArray(e.sources)||e.sources.length!==SOURCE_KEYS.length)
  return null;
 const result=[];
 for(let index=0;index<SOURCE_KEYS.length;index++){
  const item=e.sources[index],key=SOURCE_KEYS[index];
  if(item?.sourceKey!==key||item.status!=='VERIFIED'||
    typeof item.batchKey!=='string'||!BATCH_KEY.test(item.batchKey)||!item.batchKey.startsWith(key+':')||
    !Number.isSafeInteger(item.storedAt)||item.storedAt<0||!SHA256.test(item.storedBodySha256??''))
   return null;
  result.push(Object.freeze({sourceKey:key,batchKey:item.batchKey,storedAt:item.storedAt,
   storedBodySha256:item.storedBodySha256}));
 }
 return Object.freeze(result);
}

/**
 * Archive status and stored point must both prove the *same* calculated event.
 * A result of LINKED_SELECTED_7_BATCHES_ONLY does not prove which selected
 * rows survived TTL merging. Separate SEC/E1-R5/Breadth are also unverified.
 */
export async function linkMarketInputEvidenceToStoredArchive({db,now,marketBody,capture,archiveResult}={}){
 if(archiveResult?.status==='UNCHANGED')return safeFailure('ARCHIVE_UNCHANGED_NO_NEW_EVENT');
 if(archiveResult?.status!=='LOCAL_STORED')return safeFailure('ARCHIVE_NOT_STORED');
 let sample;
 try{sample=compositeSampleFromVerified(marketBody,now);}catch{return safeFailure('SCORE_EVENT_UNVERIFIED');}
 const date=sample.calculatedAt.slice(0,10),key=COMPOSITE_OBSERVED_PREFIX+date;
 if(archiveResult.date!==date||!Number.isSafeInteger(archiveResult.points)||archiveResult.points<1)
  return safeFailure('ARCHIVE_EVENT_MISMATCH');
 if(capture?.calculatedAt!==sample.calculatedAt||capture?.asOfDate!==sample.asOfDate||
   capture?.score!==sample.score)return safeFailure('CALCULATION_CAPTURE_MISMATCH');
 const sources=selectVerifiedSeven(capture);
 if(!sources)return safeFailure('SELECTED_INPUTS_UNPROVEN');
 if(typeof db?.prepare!=='function')return safeFailure('ARCHIVE_READER_UNAVAILABLE');
 let row;
 try{
  row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(key).first();
 }catch{return safeFailure('ARCHIVE_READ_FAILED');}
 if(row?.stored_at!==now||typeof row.body!=='string'||Buffer.byteLength(row.body)>1_800_000)
  return safeFailure('ARCHIVE_ROW_UNVERIFIED');
 let archive;
 try{archive=JSON.parse(row.body);}catch{return safeFailure('ARCHIVE_ROW_UNVERIFIED');}
 if(archive?.version!==COMPOSITE_OBSERVED_VERSION||archive.date!==date||
  !Array.isArray(archive.points)||archive.points.length!==archiveResult.points)
  return safeFailure('ARCHIVE_ROW_UNVERIFIED');
 const exact=archive.points.filter(x=>x?.calculatedAt===sample.calculatedAt);
 if(exact.length!==1||exact[0].score!==sample.score||exact[0].asOfDate!==sample.asOfDate||
  exact[0].signature!==sample.signature)return safeFailure('ARCHIVE_SAMPLE_MISMATCH');
 return Object.freeze({status:'LINKED_SELECTED_7_BATCHES_ONLY',scope:'LOCAL_PC_ONLY',
  effectiveUseVerified:false,completeD05InputLineage:false,publicD1Verified:false,
  calculatedAt:sample.calculatedAt,archiveKey:key,archiveStoredAt:now,
  outputSignature:sample.signature,sources});
}
