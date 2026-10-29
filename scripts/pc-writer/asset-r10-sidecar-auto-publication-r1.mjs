// R10 sidecar publication on the existing approved PC Writer --publish lane.
// The scored projection is the gate; no provider input, formula or scheduler work.
import {assetR10PcPreflight} from './ASSET_R10_RAW_PREFLIGHT_R1.mjs';
import {assetR10OneYearPcAudit} from './ASSET_R10_1Y_HISTORY_READONLY_R1.mjs';
import {ASSET_R10_RAW_KEY,toAssetR10RawPayload,validateAssetR10Raw,assetR10RawWriter}
 from '../../worker/asset-bubble-r10-raw-r1.mjs';
import {ASSET_R10_HISTORY_KEY,toAssetR10HistoryPayload,validateAssetR10History,assetR10HistoryWriter}
 from '../../worker/asset-bubble-r10-history-r1.mjs';
import {PUBLIC_PROJECTION_KEYS} from '../../worker/market-public-projection-store.mjs';

const exact=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const near=(a,b)=>typeof a==='number'&&Number.isFinite(a)
 &&typeof b==='number'&&Number.isFinite(b)&&Math.abs(a-b)<1e-7;
const contentDigest=v=>{
 const m=/^macro:(\d{4}-\d{2}-\d{2}):([a-f0-9]{64})$/i.exec(v?.sourceVersion??'');
 return m?.[1]===v?.asOfDate?m[2].toLowerCase():null;
};

// Skip a metadata-only refresh only when it could not change the visible data.
// A changed source digest, quarter, score or any historical point forces
// publication, even if the latest raw value happens to be unchanged.
export function equivalentR10Sidecar(old,next,type){
 if(!old||!next)return false;
 if(exact(old,next))return true;
 const a=contentDigest(old),b=contentDigest(next);
 if(!a||a!==b||old.asOfDate>=next.asOfDate
  ||!Number.isSafeInteger(old.sourceStoredAt)
  ||!Number.isSafeInteger(next.sourceStoredAt)
  ||old.sourceStoredAt>next.sourceStoredAt)return false;
 const metadata=['sourceVersion','sourceStoredAt','asOfDate'];
 const strip=o=>Object.fromEntries(Object.entries(o).filter(([k])=>!metadata.includes(k)));
 return type==='raw'||type==='history'?exact(strip(old),strip(next)):false;
}

function assertLocalSidecars(scored,raw,history){
 if(scored?.status!=='READY'
  ||scored.methodologyVersion!=='ASSET_BUBBLE_R10_CANDIDATE'
  ||scored.historyMode!=='CURRENT_VINTAGE_ONLY'
  ||scored.rightsStatus!=='USER_ACCEPTED_UNVERIFIED'
  ||scored.sourceVersion!==raw.sourceVersion
  ||scored.sourceStoredAt!==raw.sourceStoredAt
  ||scored.asOfDate!==raw.asOfDate
  ||scored.scoreObservationQuarter!==raw.scoreObservationQuarter
  ||scored.rightsStatus!==raw.rightsStatus
  ||!near(scored.score,raw.diagnosticScore)
  ||!Array.isArray(scored.indicators)||scored.indicators.length!==6
  ||!scored.indicators.every((r,i)=>r?.id===raw.factors[i]?.id
   &&r.status==='READY'&&near(r.score,raw.factors[i].score))
  ||raw.sourceVersion!==history.sourceVersion
  ||raw.sourceStoredAt!==history.sourceStoredAt
  ||raw.asOfDate!==history.asOfDate
  ||raw.scoreObservationQuarter!==history.scoreObservationQuarter
  ||raw.rightsStatus!==history.rightsStatus
  ||!near(raw.diagnosticScore,history.approvedScore)
  ||history.factors.length!==6
  ||!raw.factors.every((r,i)=>{
   const h=history.factors[i],cur=h?.points[4],prior=h?.points[3];
   return h?.id===r.id&&h.unit===r.unit&&h.source===r.source
    &&near(r.value,cur?.value)&&near(r.previousValue,prior?.value)
    &&r.observationDate===cur?.observationDate
    &&r.previousObservationDate===prior?.observationDate;
  }))throw Error('ASSET_R10_SIDECAR_LOCAL_LINEAGE_MISMATCH');
}

const validateRemoteSnapshot=(row,validate,now)=>{
 if(!row)return null;
 let body,raw;
 try{
  body=JSON.parse(row.body);
  raw=validate(body.payload,{now});
  if(body.projection?.status!=='READY'
   ||body.projection.sourceVersion!==raw.sourceVersion
   ||body.projection.sourceStoredAt!==raw.sourceStoredAt
   ||Number(row.stored_at)!==body.projection.builtAt
   ||!Number.isSafeInteger(body.projection.builtAt)
   ||body.projection.builtAt>now)throw Error('INVALID_ENVELOPE');
 }catch{throw Error('ASSET_R10_SIDECAR_REMOTE_INVALID');}
 return raw;
};

// Single approved core D1 database, two already-approved keys. Prior remote
// state is read before each write; unknown write outcome stops immediately.
// Next normal cycle must first read D1 to establish what was actually stored.
export async function publishAssetR10Sidecars({
 pcHome,remote,coreDb,scored,now=Date.now(),
 rawAudit=assetR10PcPreflight,historyAudit=assetR10OneYearPcAudit,
}={}){
 if(!pcHome||!remote?.query||!remote?.adapter||!coreDb)
  throw Error('ASSET_R10_SIDECAR_WRITER_ARGUMENTS_INVALID');
 // Compute from approved local SQLite and R10 evidence only, no provider call.
 const raw=toAssetR10RawPayload(rawAudit({pcHome}));
 const history=toAssetR10HistoryPayload(historyAudit({pcHome}));
 assertLocalSidecars(scored,raw,history);
 // Never publish new raw/history if the scored projection is stale or missing.
 const scoreRows=(await remote.query(coreDb,
  'SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?',
  [PUBLIC_PROJECTION_KEYS.assetBubble])).results;
 let remoteScore;
 try{remoteScore=JSON.parse(scoreRows?.[0]?.body??'').payload;}
 catch{throw Error('ASSET_R10_SIDECAR_SCORED_D1_MISSING');}
 assertLocalSidecars(remoteScore,raw,history);
 const db=remote.adapter(coreDb,{allowWrites:true});
 const result={status:'READY',keys:{},sourceVersion:raw.sourceVersion,
  scoreObservationQuarter:raw.scoreObservationQuarter,
  rawPoints:2,historyPoints:history.factors.map(f=>f.points.filter(p=>p.value!==null).length),
  pcSqliteWrites:0,scoreWrites:0,providerRequests:0};
 for(const {key,payload,validate,writer,kind} of [
  {key:ASSET_R10_RAW_KEY,payload:raw,validate:validateAssetR10Raw,
   writer:assetR10RawWriter,kind:'raw'},
  {key:ASSET_R10_HISTORY_KEY,payload:history,validate:validateAssetR10History,
   writer:assetR10HistoryWriter,kind:'history'},
 ]){
  const row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
   .bind(key).first();
  const old=validateRemoteSnapshot(row,validate,now);
  if(old?.sourceStoredAt>payload.sourceStoredAt)
   throw Error('ASSET_R10_SIDECAR_REMOTE_NEWER_PRESERVED');
  if(equivalentR10Sidecar(old,payload,kind)){
   result.keys[kind]='UNCHANGED_VERIFIED';
   continue;
  }
  // Existing writer enforces a monotone checkpoint and exact readback.
  const written=await writer(db).write(payload,{storedAt:now});
  if(!['READBACK_VERIFIED','ALREADY_STORED'].includes(written.status))
   throw Error('ASSET_R10_SIDECAR_WRITE_UNVERIFIED');
  const after=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
   .bind(key).first();
  const confirmed=validateRemoteSnapshot(after,validate,Date.now());
  if(!exact(confirmed,payload))
   throw Error('ASSET_R10_SIDECAR_READBACK_MISMATCH');
  result.keys[kind]=written.status;
 }
 return result;
}
