/** R10 publication primitive: dated snapshots ONLY; never writes the current key. */

const DAILY_PREFIX='public:market-breadth-r1:usa:';
const SELECT='SELECT snapshot_key,body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key IN';
const INSERT='INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?) ON CONFLICT(snapshot_key) DO NOTHING';

function validStoredAt(value,now){
  const n=Number(value);
  return Number.isSafeInteger(n)&&n>0&&n<=now+60_000;
}

export function sameBreadthObservation(a,b){
  return !!a&&!!b&&a.version===b.version&&a.market===b.market
    &&a.universe===b.universe&&a.source===b.source
    &&a.methodologyVersion===b.methodologyVersion
    &&a.observationDate===b.observationDate&&a.status===b.status
    &&a.expectedCount===b.expectedCount&&a.eligibleCount===b.eligibleCount
    &&a.coverage===b.coverage
    &&a.counts?.rising===b.counts?.rising
    &&a.counts?.unchanged===b.counts?.unchanged
    &&a.counts?.falling===b.counts?.falling;
}

function groups(items,n){
  const chunks=[];
  for(let i=0;i<items.length;i+=n)chunks.push(items.slice(i,i+n));
  return chunks;
}

async function readBatch(remote,database,batch){
  if(!batch.length)return new Map();
  const keys=batch.map(r=>DAILY_PREFIX+r.observationDate);
  const sql=`${SELECT} (${keys.map(()=>'?').join(',')})`;
  const result=await remote.query(database,sql,keys);
  if(!Array.isArray(result?.results))throw Error('REMOTE_BATCH_READ_INVALID');
  const allowed=new Set(keys),out=new Map();
  for(const row of result.results){
    if(!allowed.has(row.snapshot_key)||out.has(row.snapshot_key))throw Error('REMOTE_BATCH_READ_CONFLICT');
    out.set(row.snapshot_key,row);
  }
  return out;
}

function existingMatches(row,record,{validRecord,now}){
  if(!validStoredAt(row.stored_at,now))return false;
  let body;
  try{body=JSON.parse(row.body);}catch{return false;}
  return validRecord(body)&&sameBreadthObservation(body,record);
}

/**
 * All 248 observations must be re-audited and ready before this function runs.
 * An existing date is immutable: same semantic record => skip, other => STOP.
 * Unknown D1 write outcomes get read-back before exit; rerun is idempotent.
 */
export async function publishDatedBreadthOnly(remote,database,records,{
  validRecord,now=Date.now(),batchSize=20,onProgress=()=>{},
}={}){
  if(typeof validRecord!=='function'||!Array.isArray(records)||records.length<1
    ||!Number.isInteger(batchSize)||batchSize<1||batchSize>40)throw Error('INVALID_BACKFILL_INPUT');
  const seen=new Set();
  for(const body of records){
    if(!validRecord(body)||seen.has(body.observationDate))throw Error('INVALID_OR_DUPLICATE_HISTORY_RECORD');
    seen.add(body.observationDate);
  }
  const batches=groups(records,batchSize),toWrite=[];
  let already=0,published=0;
  // Inspect ALL existing daily keys before writing ANY new one.
  for(const batch of batches){
    const known=await readBatch(remote,database,batch);
    for(const record of batch){
      const key=DAILY_PREFIX+record.observationDate,stored=known.get(key);
      if(!stored){toWrite.push(record);continue;}
      if(!existingMatches(stored,record,{validRecord,now}))
        throw Error(`REMOTE_DAILY_CONFLICT_${record.observationDate}`);
      already++;
    }
  }
  onProgress({stage:'PREFLIGHT_VERIFIED',expected:records.length,already,pending:toWrite.length,published});
  for(const batch of groups(toWrite,batchSize)){
    const statements=batch.map(body=>({sql:INSERT,params:[DAILY_PREFIX+body.observationDate,JSON.stringify(body),now]}));
    let writeFailed=false;
    try{await remote.request(database,statements);}catch{writeFailed=true;}
    // Even if Cloudflare returned a transport error, do not speculate: read back.
    let stored;
    try{stored=await readBatch(remote,database,batch);}
    catch{throw Error('D1_READBACK_UNAVAILABLE');}
    const verified=batch.every(body=>{
      const row=stored.get(DAILY_PREFIX+body.observationDate);
      return row&&existingMatches(row,body,{validRecord,now});
    });
    if(!verified)throw Error(writeFailed?'D1_WRITE_OUTCOME_UNKNOWN':'D1_WRITE_READBACK_MISMATCH');
    published+=batch.length;
    onProgress({stage:'BATCH_READBACK_VERIFIED',expected:records.length,already,pending:toWrite.length-published,published});
  }
  return {status:'VERIFIED',expected:records.length,already,published,verified:already+published};
}
