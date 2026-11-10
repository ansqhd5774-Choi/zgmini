import {createHash} from 'node:crypto';

// Development-only. No DB, file, provider, publication or Runner side effects.
// The PC-local append adapter must be separately approved and serialized.
export const D05_LINEAGE_EVENT_SCHEMA='D05_COMPOSITE_INPUT_LINEAGE_LOCAL_V1';
const SOURCE_KEYS=Object.freeze(['macro','credit','supply','fundFlows','bisDsr','bisTc','rates']);
const SHA256=/^[0-9a-f]{64}$/;
const SOURCE_SHA=/^[0-9a-f]{40}$/;
const FNV32=/^[0-9a-f]{8}$/;
const BATCH_KEY=/^[A-Za-z0-9._:-]{1,128}$/;
const fail=code=>Object.freeze({status:'UNPROVEN',code});

function exactIso(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))return false;
 const ms=Date.parse(value);
 return Number.isSafeInteger(ms)&&new Date(ms).toISOString()===value;
}

function validDate(value){
 if(value===null)return true;
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const ms=Date.parse(value+'T00:00:00.000Z');
 return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===value;
}

function stableSources(items){
 if(!Array.isArray(items)||items.length!==SOURCE_KEYS.length)return null;
 const verified=[];
 for(let i=0;i<SOURCE_KEYS.length;i++){
  const value=items[i],sourceKey=SOURCE_KEYS[i];
  if(value?.sourceKey!==sourceKey||typeof value.batchKey!=='string'||
    !BATCH_KEY.test(value.batchKey)||!value.batchKey.startsWith(sourceKey+':')||
    !Number.isSafeInteger(value.storedAt)||value.storedAt<0||
    !SHA256.test(value.storedBodySha256??''))return null;
  const selectionWitness=value.selectionWitness??'POST_SELECTION_MATCH_ONLY';
  if(!['READER_DIRECT_ID','POST_SELECTION_MATCH_ONLY'].includes(selectionWitness))return null;
  verified.push(Object.freeze({sourceKey,batchKey:value.batchKey,
   storedAt:value.storedAt,storedBodySha256:value.storedBodySha256,selectionWitness}));
 }
 return Object.freeze(verified);
}

// Include only approved, non-reversible metadata. Deliberately exclude
// recordedAt from the digest so a repeated receipt of the same event is a NOOP.
export function buildD05LineageEvent({link,runtimeSourceSha,approvedSourceSha,recordedAt}={}){
 if(link?.status!=='LINKED_SELECTED_7_BATCHES_ONLY'||link.scope!=='LOCAL_PC_ONLY'||
    link.effectiveUseVerified!==false||link.completeD05InputLineage!==false||
    link.publicD1Verified!==false)return fail('PARTIAL_LINK_NOT_VERIFIED');
 if(!exactIso(link.calculatedAt)||!validDate(link.asOfDate??null)||
    typeof link.score!=='number'||!Number.isFinite(link.score)||link.score<0||link.score>100||
    !FNV32.test(link.outputSignature??''))return fail('CALCULATED_EVENT_INVALID');
 const date=link.calculatedAt.slice(0,10);
 if(link.archiveKey!=='composite-observed:'+date||
    !Number.isSafeInteger(link.archiveStoredAt)||
    link.archiveStoredAt!==Date.parse(link.calculatedAt))return fail('ARCHIVE_CHECKPOINT_MISMATCH');
 if(!SOURCE_SHA.test(runtimeSourceSha??'')||!SOURCE_SHA.test(approvedSourceSha??'')||
    !exactIso(recordedAt))return fail('SOURCE_OR_RECORD_TIME_UNVERIFIED');
 const sources=stableSources(link.sources);
 if(!sources)return fail('SELECTED_SEVEN_INCOMPLETE');

 const evidence={schema:D05_LINEAGE_EVENT_SCHEMA,
  eventId:'D05/CM-R1/'+link.calculatedAt,calculatedAt:link.calculatedAt,
  asOfDate:link.asOfDate??null,score:link.score,
  outputSignature:link.outputSignature,archiveKey:link.archiveKey,
  archiveStoredAt:link.archiveStoredAt,runtimeSourceSha,approvedSourceSha,
  inputScope:'SELECTED_7_BATCHES_ONLY',inputStatus:'LOCAL_SELECTED_7_MATCHED',
  selectionEvidence:sources.every(x=>x.selectionWitness==='READER_DIRECT_ID')
   ?'DIRECT_ID_AND_EXACT_ROW_MATCH':'POST_SELECTION_UNIQUE_MATCH',
  effectiveUseVerified:false,completeD05InputLineage:false,publicD1Verified:false,
  sources};
 const stableEvidenceDigestSha256=createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
 return Object.freeze({status:'PREPARED_LOCAL_ONLY',...evidence,recordedAt,
  stableEvidenceDigestSha256});
}

function preparedEntryValid(entry){
 if(entry?.status!=='PREPARED_LOCAL_ONLY'||entry?.schema!==D05_LINEAGE_EVENT_SCHEMA)return false;
 const regenerated=buildD05LineageEvent({
  link:{status:'LINKED_SELECTED_7_BATCHES_ONLY',scope:'LOCAL_PC_ONLY',
   effectiveUseVerified:false,completeD05InputLineage:false,publicD1Verified:false,
   calculatedAt:entry.calculatedAt,asOfDate:entry.asOfDate,score:entry.score,
   outputSignature:entry.outputSignature,archiveKey:entry.archiveKey,
   archiveStoredAt:entry.archiveStoredAt,sources:entry.sources},
  runtimeSourceSha:entry.runtimeSourceSha,
  approvedSourceSha:entry.approvedSourceSha,recordedAt:entry.recordedAt});
 return regenerated.status==='PREPARED_LOCAL_ONLY'&&
  JSON.stringify(regenerated)===JSON.stringify(entry);
}

// A prospective storage adapter calls this only AFTER it has acquired an
// approved single-writer lease and read the entire existing local JSONL file.
// This function intentionally performs no append and never repairs corruption.
export function decideD05LineageAppend(existingText,entry){
 if(!preparedEntryValid(entry))return fail('LINEAGE_EVENT_INVALID');
 if(typeof existingText!=='string')return fail('LINEAGE_LEDGER_UNAVAILABLE');
 if(existingText&&!existingText.endsWith('\n'))return fail('LINEAGE_LEDGER_PARTIAL_LINE');
 const events=existingText?existingText.slice(0,-1).split('\n'):[];
 const seen=new Map();
 for(const line of events){
  if(!line)return fail('LINEAGE_LEDGER_INVALID');
  let prior;
  try{prior=JSON.parse(line);}catch{return fail('LINEAGE_LEDGER_INVALID');}
  if(!preparedEntryValid(prior))return fail('LINEAGE_LEDGER_INVALID');
  const existing=seen.get(prior.eventId);
  if(existing)return fail('LINEAGE_LEDGER_DUPLICATE');
  seen.set(prior.eventId,prior.stableEvidenceDigestSha256);
 }
 const priorDigest=seen.get(entry.eventId);
 if(priorDigest===entry.stableEvidenceDigestSha256)
  return Object.freeze({status:'NOOP_SAME_EVENT',eventId:entry.eventId});
 if(priorDigest)return fail('EVENT_ID_CONFLICT');
 const line=JSON.stringify(entry)+'\n';
 if(Buffer.byteLength(line)>8192)return fail('LINEAGE_EVENT_TOO_LARGE');
 return Object.freeze({status:'APPEND_READY',eventId:entry.eventId,line,
  existingEventCount:events.length});
}
