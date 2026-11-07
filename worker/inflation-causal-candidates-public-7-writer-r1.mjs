// The seven research-only inputs use a separate D1 snapshot key and no score.
// This adapter is not attached to a route, Core cycle, or scheduler by itself.
import {INFLATION_CANDIDATES_7_PUBLIC_KEY,validateInflationCandidates7Public}
  from './inflation-causal-candidates-public-7-r1.mjs';

const isObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const fail=code=>{throw Error(code);};

function validStored(previous,storedAt){
  if(typeof previous?.body!=='string'||previous.body.length>45_000||
    !Number.isSafeInteger(Number(previous.stored_at))||Number(previous.stored_at)<1)
    fail('INFL7_PUBLIC_EXISTING_INVALID');
  let record;
  try{record=JSON.parse(previous.body);}catch{fail('INFL7_PUBLIC_EXISTING_INVALID');}
  if(!isObject(record)||!isObject(record.projection)||
    record.projection.status!=='READY'||
    record.projection.builtAt!==Number(previous.stored_at)||
    record.projection.sourceVersion!==record.payload?.sourceVersion||
    record.projection.sourceStoredAt!==record.payload?.sourceStoredAt)
    fail('INFL7_PUBLIC_EXISTING_INVALID');
  try{return validateInflationCandidates7Public(record.payload,{now:storedAt});}
  catch{fail('INFL7_PUBLIC_EXISTING_INVALID');}
}

function preserveLastGood(previous,next){
  for(let i=0;i<previous.indicators.length;i++){
    const before=previous.indicators[i],after=next.indicators[i];
    if(before.status!=='READY')continue;
    if(after.status!=='READY'||after.observationDate<before.observationDate||
      Date.parse(after.sourceStoredAt)<Date.parse(before.sourceStoredAt))
      fail('INFL7_PUBLIC_LAST_GOOD_REGRESSION');
  }
}

function assertRowCheckpointAdvance(previous,next){
  let changed=0;
  for(let i=0;i<previous.indicators.length;i++){
    const before=previous.indicators[i],after=next.indicators[i];
    if(JSON.stringify(before)===JSON.stringify(after))continue;
    changed++;
    // A new source can be older than the most recently stored *other*
    // source. Require that this row's own provenance advances instead of
    // requiring the envelope's max(sourceStoredAt) to advance.
    if(after.status!=='READY'||
      (before.status==='READY'&&
       Date.parse(after.sourceStoredAt)<=Date.parse(before.sourceStoredAt)))
      fail('INFL7_PUBLIC_CHECKPOINT_CONFLICT');
  }
  if(changed===0||previous.sourceVersion===next.sourceVersion)
    fail('INFL7_PUBLIC_CHECKPOINT_CONFLICT');
}

// Call only after a trusted PC process has read and reduced local saved sources.
// The caller owns rights review, authorized publication and D1 access; a visitor
// request must never be routed here. No credentials or raw source enter payload.
export function inflationCandidates7PublicWriter(db){
  if(!db?.prepare)fail('INFL7_PUBLIC_STORAGE_UNAVAILABLE');
  return Object.freeze({async write(payload,{storedAt=Date.now()}={}){
    if(!Number.isSafeInteger(storedAt)||storedAt<1)
      fail('INFL7_PUBLIC_WRITE_TIME_INVALID');
    const frozen=JSON.parse(JSON.stringify(payload));
    validateInflationCandidates7Public(frozen,{now:storedAt});
    if(storedAt<frozen.sourceStoredAt)fail('INFL7_PUBLIC_WRITE_TIME_INVALID');

    const key=INFLATION_CANDIDATES_7_PUBLIC_KEY;
    const query='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
    const old=await db.prepare(query).bind(key).first();
    if(old){
      const previous=validStored(old,storedAt);
      if(previous.sourceStoredAt>frozen.sourceStoredAt)
        fail('INFL7_PUBLIC_SUPERSEDED');
      preserveLastGood(previous,frozen);
      if(JSON.stringify(previous)===JSON.stringify(frozen))
        return {status:'ALREADY_STORED',key,storedAt:Number(old.stored_at)};
      assertRowCheckpointAdvance(previous,frozen);
    }

    const body=JSON.stringify({payload:frozen,projection:{status:'READY',
      sourceVersion:frozen.sourceVersion,sourceStoredAt:frozen.sourceStoredAt,
      builtAt:storedAt}});
    if(new TextEncoder().encode(body).byteLength>45_000)
      fail('INFL7_PUBLIC_BODY_TOO_LARGE');
    let write;
    if(old){
      // Compare-and-swap protects another writer's newer checkpoint from a
      // concurrent stale UPDATE, without schema changes or temporary keys.
      write=await db.prepare(`UPDATE market_public_snapshots_v1 SET body=?,stored_at=?
        WHERE snapshot_key=? AND body=? AND stored_at=?`)
        .bind(body,storedAt,key,old.body,old.stored_at).run();
    }else{
      write=await db.prepare(`INSERT OR IGNORE INTO market_public_snapshots_v1
        (snapshot_key,body,stored_at) VALUES(?,?,?)`)
        .bind(key,body,storedAt).run();
    }
    if(write?.meta?.changes!==1)fail('INFL7_PUBLIC_CONCURRENT_WRITE');
    const readback=await db.prepare(query).bind(key).first();
    if(readback?.body!==body||Number(readback.stored_at)!==storedAt)
      fail('INFL7_PUBLIC_READBACK_MISMATCH');
    return {status:'READBACK_VERIFIED',key,storedAt,
      sourceVersion:frozen.sourceVersion,sourceStoredAt:frozen.sourceStoredAt};
  }});
}
