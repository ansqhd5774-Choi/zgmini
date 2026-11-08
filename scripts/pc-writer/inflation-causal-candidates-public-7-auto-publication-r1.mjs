// Optional seven-row *research-only* sidecar for the existing PC Writer publish
// lane. This module does not attach itself to run-local.mjs or any scheduler.
// Only a trusted PC caller with an explicitly approved publication scope may
// invoke it; visitor GETs never collect, calculate, or write D1 data.
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {INFLATION_CANDIDATES_7_PUBLIC_KEY} from '../../worker/inflation-causal-candidates-public-7-r1.mjs';

const fail=code=>{throw Error(code);};
const noWrites=(status,ready)=>({status,ready,providerCalls:0,dbWrites:0,
  coreWrites:0,d1Writes:0,schedulerWrites:0});
const clean=value=>JSON.parse(JSON.stringify(value));

export function comparableCandidates7(payload){
  if(!payload||!Array.isArray(payload.indicators)||payload.indicators.length!==7)
    fail('INFL7_AUTO_PAYLOAD_INVALID');
  const {sourceVersion,sourceStoredAt,...rest}=payload;
  return {...rest,indicators:payload.indicators.map(({sourceStoredAt,...row})=>row)};
}

// A missing or regressed input may only reuse a previously validated public
// observation with its original value, date, history and source timestamp.
// Other READY rows must still advance independently in the same D1 snapshot.
export function preserveCandidates7RowEvidence(previous,preview){
  if(!previous)return preview;
  const payload=clean(preview);
  payload.indicators=payload.indicators.map((row,i)=>{
    const before=previous.indicators[i];
    if(!['READY','STALE'].includes(before.status))return row;
    if(row.status==='PENDING'||
      (row.status==='READY'&&
       (row.observationDate<before.observationDate||
        Date.parse(row.sourceStoredAt)<Date.parse(before.sourceStoredAt))))
      return {...before,status:'STALE'};
    return row;
  });
  if(isDeepStrictEqual(payload.indicators,preview.indicators))return preview;
  payload.status=payload.indicators.every(row=>row.status==='READY')?'READY':'PARTIAL';
  payload.sourceStoredAt=Math.max(...payload.indicators.filter(row=>
    row.status==='READY'||row.status==='STALE').map(row=>Date.parse(row.sourceStoredAt)));
  payload.sourceVersion='INFL7_PRESENTATION_'+createHash('sha256')
    .update(JSON.stringify(payload.indicators)).digest('hex');
  return payload;
}

function staleCandidate7OnCompleteOutage(previous){
  const payload=clean(previous);
  payload.indicators=payload.indicators.map(row=>row.status==='READY'?
    {...row,status:'STALE'}:row);
  payload.status='PARTIAL';
  payload.sourceVersion='INFL7_PRESENTATION_'+createHash('sha256')
    .update(JSON.stringify(payload.indicators)).digest('hex');
  return payload;
}

function validRemote(row,validate,now){
  if(!row)return null;
  let record,payload;
  try{
    record=JSON.parse(row.body);
    payload=validate(record?.payload,{now});
    if(record?.projection?.status!=='READY'||
      record.projection.sourceVersion!==payload.sourceVersion||
      record.projection.sourceStoredAt!==payload.sourceStoredAt||
      !Number.isSafeInteger(record.projection.builtAt)||
      record.projection.builtAt>now||
      record.projection.builtAt!==Number(row.stored_at))
      throw Error('CHECKPOINT_INVALID');
  }catch{fail('INFL7_AUTO_REMOTE_CONTRACT_DENIED');}
  return payload;
}

async function readRemote(remote,coreDb,validate,now){
  const reply=await remote.query(coreDb,
    'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',
    [INFLATION_CANDIDATES_7_PUBLIC_KEY]);
  if(!Array.isArray(reply?.results)||reply.results.length>1)
    fail('INFL7_AUTO_REMOTE_QUERY_DENIED');
  return validRemote(reply.results[0],validate,now);
}

export async function publishInflationCandidates7Auto({
  pcHome,remote,coreDb,now=Date.now(),previewFn,validate,writerFactory,
}={}){
  if(!remote?.query||!remote?.adapter||!coreDb||!Number.isSafeInteger(now)||now<1)
    fail('INFL7_AUTO_ARGUMENTS_DENIED');
  if(!previewFn){
    const source=await import('./inflation-causal-candidates-public-7-preview-r1.mjs');
    previewFn=source.previewInflationCandidates7;
  }
  if(!validate){
    const reader=await import('../../worker/inflation-causal-candidates-public-7-r1.mjs');
    validate=reader.validateInflationCandidates7Public;
  }
  if(!writerFactory){
    const writer=await import('../../worker/inflation-causal-candidates-public-7-writer-r1.mjs');
    writerFactory=writer.inflationCandidates7PublicWriter;
  }
  // The preview reads already-saved PC raw sources and returns only seven
  // bounded summary rows; a missing provider is PENDING, not synthetic zero.
  const preview=await previewFn(pcHome,{now});
  const allMissing=preview?.status==='PENDING'&&preview.ready===0&&
    preview.payload==null&&preview.providerCalls===0&&preview.coreWrites===0&&
    preview.dbWrites===0&&preview.d1Writes===0&&preview.schedulerWrites===0;
  if(!allMissing&&(preview?.status!=='PASS_READONLY'||
      preview.ready<1||preview.ready>7))
    return noWrites('SKIPPED_INPUTS_NOT_READY',preview?.ready??0);
  if(preview.providerCalls!==0||preview.coreWrites!==0||
    preview.dbWrites!==0||preview.d1Writes!==0||preview.schedulerWrites!==0)
    fail('INFL7_AUTO_PREVIEW_SIDE_EFFECT_DENIED');
  const previous=await readRemote(remote,coreDb,validate,now);
  if(allMissing&&!previous)
    return noWrites('SKIPPED_INPUTS_NOT_READY',0);
  let candidate;
  if(!allMissing){
    candidate=validate(preview.payload,{now});
    if(candidate.score!==null||candidate.indicators.length!==7||
      !/^INFL7_PRESENTATION_[a-f0-9]{64}$/.test(candidate.sourceVersion)||
      candidate.indicators.filter(row=>row.status==='READY').length!==preview.ready)
      fail('INFL7_AUTO_RESEARCH_CONTRACT_DENIED');
  }
  const payload=validate(allMissing?staleCandidate7OnCompleteOutage(previous):
    preserveCandidates7RowEvidence(previous,candidate),{now});
  if(previous?.sourceStoredAt>payload.sourceStoredAt)
    return noWrites('REMOTE_NEWER_PRESERVED',preview.ready);
  if(previous&&isDeepStrictEqual(comparableCandidates7(previous),
                                 comparableCandidates7(payload)))
    return noWrites(previous.sourceVersion===payload.sourceVersion?
      'UNCHANGED_VERIFIED':'SKIPPED_METADATA_ONLY',preview.ready);
  if(previous?.sourceVersion===payload.sourceVersion)
    fail('INFL7_AUTO_VERSION_COLLISION');
  const result=await writerFactory(remote.adapter(coreDb,{allowWrites:true}))
    .write(clean(payload),{storedAt:now});
  if(!['READBACK_VERIFIED','ALREADY_STORED'].includes(result?.status))
    fail('INFL7_AUTO_WRITER_READBACK_UNVERIFIED');
  const after=await readRemote(remote,coreDb,validate,now);
  if(!isDeepStrictEqual(after,payload))fail('INFL7_AUTO_D1_READBACK_MISMATCH');
  return {status:result.status,ready:preview.ready,
    key:INFLATION_CANDIDATES_7_PUBLIC_KEY,
    sourceVersion:payload.sourceVersion,sourceStoredAt:payload.sourceStoredAt,
    providerCalls:0,coreWrites:0,dbWrites:0,
    d1Writes:result.status==='READBACK_VERIFIED'?1:0,schedulerWrites:0};
}
