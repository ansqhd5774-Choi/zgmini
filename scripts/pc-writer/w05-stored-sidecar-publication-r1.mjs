// W05: stored-only three-key publication adapter for the existing PC Writer.
// Source-only: deliberately NOT registered in run-local or any scheduler.
// Enabling repeated D1 effects requires an approved B publication scope and
// an exact operational source CAS; the previous ONCE grants do not suffice.
import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {buildServiceSourcePreview}
 from './EARNINGS_R4_C_READ_MODEL_PREVIEW_READONLY.mjs';
import {buildStoredQfrPreview}
 from './EARNINGS_CENSUS_QFR_R3_STORED_PREVIEW_READONLY.mjs';
import {prepareQfrD1Payload}
 from './EARNINGS_CENSUS_QFR_R4_D1_ONCE.mjs';
import {readBeaUnitNipaArchive}
 from './EARNINGS_BEA_UNIT_NIPA_ARCHIVE_R1.mjs';
import {buildBeaUnitNipaPublicProjection}
 from './EARNINGS_BEA_UNIT_NIPA_PUBLIC_PROJECTION_R1.mjs';
import {
 EARNINGS_C_SERVICE_SNAPSHOT_KEY,validateEarningsCompanionPayload,
 earningsCompanionFreshness,earningsCompanionWriter,
} from '../../worker/earnings-companion-c-r4.mjs';
import {
 QFR_SNAPSHOT_KEY,qfrCompanionWriter,
} from '../../worker/earnings-companion-c-qfr-r1.mjs';
import {
 BEA_UNIT_SNAPSHOT_KEY,validateBeaUnitProfit,beaUnitFreshness,beaUnitWriter,
} from '../../worker/earnings-bea-unit-profit-r1.mjs';

export const W05_SAVED_KEYS=Object.freeze({
 wpsfd42:EARNINGS_C_SERVICE_SNAPSHOT_KEY,
 qfr:QFR_SNAPSHOT_KEY,
 bea:BEA_UNIT_SNAPSHOT_KEY,
});
export const W05_SAVED_IDS=Object.freeze(Object.keys(W05_SAVED_KEYS));
const SHA=/^[a-f0-9]{64}$/;
const fail=code=>{throw Error(code)};
const skipped=status=>({status,providerCalls:0,sqliteWrites:0,d1Writes:0,schedulerWrites:0});
const validNow=now=>Number.isSafeInteger(now)&&now>0;
function homePath(pcHome){
 if(typeof pcHome!=='string'||!path.isAbsolute(pcHome))
  fail('W05_SAVED_PC_HOME_INVALID');
 if(!fs.existsSync(pcHome)||!fs.statSync(pcHome).isDirectory())
  return null;
 return pcHome;
}

// Only previously saved BEA statistical JSON is eligible, never a live BEA GET.
// Every candidate receives full raw+metadata readback. Ambiguous newer vintages
// fail closed; no provider request, new source archive or directory creation.
export function latestStoredBeaNipaSha(pcHome,{now=Date.now()}={}){
 if(!validNow(now))fail('W05_SAVED_CLOCK_INVALID');
 const home=homePath(pcHome);
 if(!home)return null;
 const archive=path.join(home,'raw','earnings-bea-unit-nipa-r1');
 if(!fs.existsSync(archive))return null;
 if(!fs.lstatSync(archive).isDirectory()||fs.lstatSync(archive).isSymbolicLink())
  fail('W05_SAVED_BEA_DIRECTORY_UNSAFE');
 const entries=fs.readdirSync(archive,{withFileTypes:true});
 const candidates=entries.filter(entry=>entry.name.endsWith('.meta.json'));
 if(candidates.length>200)fail('W05_SAVED_BEA_SCAN_LIMIT');
 const verified=[];
 for(const entry of candidates){
  if(!entry.isFile()||entry.isSymbolicLink()
   ||!SHA.test(entry.name.slice(0,-'.meta.json'.length)))
   fail('W05_SAVED_BEA_META_UNSAFE');
  const sha=entry.name.slice(0,-'.meta.json'.length);
  const archiveRead=readBeaUnitNipaArchive({pcBase:home,sourceSha:sha});
  if(archiveRead.sourceStoredAt>now)fail('W05_SAVED_BEA_FUTURE_SOURCE');
  verified.push({sha,storedAt:archiveRead.sourceStoredAt,
   observedThrough:archiveRead.observedThrough});
 }
 if(!verified.length)return null;
 verified.sort((a,b)=>b.observedThrough.localeCompare(a.observedThrough)
  ||b.storedAt-a.storedAt||a.sha.localeCompare(b.sha));
 if(verified.length>1
  &&verified[0].observedThrough===verified[1].observedThrough
  &&verified[0].storedAt===verified[1].storedAt
  &&verified[0].sha!==verified[1].sha)
  fail('W05_SAVED_BEA_AMBIGUOUS_CURRENT_SOURCE');
 return verified[0].sha;
}

// All sources must already exist. Native SQLite is opened query-only, not
// immutable/nolock, so the engine may perform its normal WAL/SHM read handling.
export function prepareW05StoredSidecar({id,pcHome,now=Date.now()}={}){
 if(!Object.hasOwn(W05_SAVED_KEYS,id))fail('W05_SAVED_KEY_DENIED');
 if(!validNow(now))fail('W05_SAVED_CLOCK_INVALID');
 const home=homePath(pcHome);
 if(!home)return skipped('SKIPPED_SOURCE_NOT_STORED');
 if(id==='bea'){
  const sha=latestStoredBeaNipaSha(home,{now});
  if(!sha)return skipped('SKIPPED_SOURCE_NOT_STORED');
  const payload=buildBeaUnitNipaPublicProjection({pcBase:home,sourceSha:sha,now});
  validateBeaUnitProfit(payload,{now});
  if(beaUnitFreshness(payload,{now}).status!=='FRESH')
   return skipped('SKIPPED_SOURCE_STALE');
  return {status:'READY',payload};
 }
 const sourceFile=path.join(home,'storage','core.sqlite');
 if(!fs.existsSync(sourceFile))return skipped('SKIPPED_SOURCE_NOT_STORED');
 let db;
 try{
  db=new DatabaseSync(sourceFile,{readOnly:true,timeout:4000});
  db.exec('PRAGMA query_only=ON');
  if(id==='wpsfd42'){
   let preview;
   try{preview=buildServiceSourcePreview(db,{generatedAt:new Date(now).toISOString()});}
   catch(e){
    if(e?.message==='R4_SERVICE_SOURCE_NOT_STORED')
     return skipped('SKIPPED_SOURCE_NOT_STORED');
    throw e;
   }
   const payload=validateEarningsCompanionPayload(preview.payload,{now});
   if(payload.status!=='READY'||payload.rows.length!==2
     ||payload.rows.some(row=>row.seriesId!=='WPSFD42'
       ||row.status!=='READY'
       ||earningsCompanionFreshness(row,{now}).status!=='FRESH'))
    return skipped('SKIPPED_SOURCE_STALE');
   return {status:'READY',payload};
  }
  let preview;
  try{preview=buildStoredQfrPreview(db);}
  catch(e){
   if(e?.message==='QFR_STORED_SNAPSHOT_MISSING')
    return skipped('SKIPPED_SOURCE_NOT_STORED');
   throw e;
  }
  const {payload}=prepareQfrD1Payload(preview,{
   generatedAt:new Date(now).toISOString(),now});
  return {status:'READY',payload};
 }finally{db?.close();}
}

// The concrete Writer validates immutable source versions, compares against
// D1 and performs its own exact readback. There is no retry on uncertain writes.
function writerFor(id,db){
 if(id==='wpsfd42')return earningsCompanionWriter(db,{
  snapshotKey:EARNINGS_C_SERVICE_SNAPSHOT_KEY});
 if(id==='qfr')return qfrCompanionWriter(db);
 if(id==='bea')return beaUnitWriter(db);
 fail('W05_SAVED_KEY_DENIED');
}

function verifiedRemoteRow(row,requestedVersion,{status,storedAt},now){
 let envelope,observedAt;
 try{
  envelope=JSON.parse(row.body);
  observedAt=Number(row.stored_at);
 }catch{fail('W05_SAVED_REMOTE_READBACK_INVALID');}
 if(!envelope||typeof envelope!=='object'
  ||envelope.projection?.status!=='READY'
  ||!Number.isSafeInteger(observedAt)
  ||observedAt>now||observedAt!==envelope.projection.builtAt
  ||envelope.projection.sourceVersion!==envelope.payload?.sourceVersion
  ||envelope.projection.sourceStoredAt!==envelope.payload?.sourceStoredAt
  ||envelope.payload.sourceVersion!==requestedVersion
  ||(status==='ALREADY_STORED'&&observedAt!==storedAt))
  fail('W05_SAVED_REMOTE_READBACK_INVALID');
 return observedAt;
}

export async function publishW05StoredSidecar({
 id,pcHome,remote,coreDb,now=Date.now(),
 prepare=prepareW05StoredSidecar,makeWriter=writerFor,
}={}){
 if(!Object.hasOwn(W05_SAVED_KEYS,id))fail('W05_SAVED_KEY_DENIED');
 if(!validNow(now)||typeof coreDb!=='string'||!coreDb
  ||!remote?.query||!remote?.adapter)
  fail('W05_SAVED_PUBLICATION_ARGUMENTS_INVALID');
 const prepared=await prepare({id,pcHome,now});
 if(prepared?.status!=='READY')
  return prepared?.status?.startsWith('SKIPPED_')
   ?skipped(prepared.status):skipped('SKIPPED_SOURCE_NOT_READY');
 if(!prepared.payload||prepared.payload.sourceStoredAt>now
  ||!SHA.test(prepared.payload.sourceVersion??''))
  fail('W05_SAVED_PREVIEW_INVALID');
 const writer=makeWriter(id,remote.adapter(coreDb,{allowWrites:true}));
 const result=await writer.write(prepared.payload,{storedAt:now});
 if(!['READBACK_VERIFIED','ALREADY_STORED'].includes(result?.status)
  ||result.key!==W05_SAVED_KEYS[id])
  fail('W05_SAVED_WRITER_RESULT_UNVERIFIED');
 const rows=(await remote.query(coreDb,
  'SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',
  [W05_SAVED_KEYS[id]])).results;
 if(!Array.isArray(rows)||rows.length!==1||typeof rows[0]?.body!=='string')
  fail('W05_SAVED_REMOTE_READBACK_MISSING');
 const publishedAt=verifiedRemoteRow(rows[0],prepared.payload.sourceVersion,
  result,now);
 const storedEnvelope=JSON.parse(rows[0].body);
 if(result.status==='READBACK_VERIFIED'
  &&storedEnvelope.payload.sourceStoredAt!==prepared.payload.sourceStoredAt)
  fail('W05_SAVED_REMOTE_READBACK_SOURCE_MISMATCH');
 return {status:result.status,key:W05_SAVED_KEYS[id],
  sourceVersion:storedEnvelope.payload.sourceVersion,
  sourceStoredAt:storedEnvelope.payload.sourceStoredAt,publishedAt,
  providerCalls:0,sqliteWrites:0,
  d1Writes:result.status==='READBACK_VERIFIED'?1:0,schedulerWrites:0};
}
