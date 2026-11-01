// R10 R4: publish an exact archived 2026-10-28 audited history snapshot.
// Never replace old provenance with current PC collection timestamp.
// Original 28th D1 raw key immutable; only separate history key may be written.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assetR10OneYearPcAudit} from './ASSET_R10_1Y_HISTORY_READONLY_R1.mjs';
import {ASSET_R10_HISTORY_KEY,toAssetR10HistoryPayload,assetR10HistoryWriter}
 from '../../worker/asset-bubble-r10-history-r1.mjs';
import {ASSET_R10_RAW_KEY,validateAssetR10Raw}
 from '../../worker/asset-bubble-r10-raw-r1.mjs';
import {parseAssetR10ArchivedAuditLog,validateArchivedAssetR10AgainstCurrent,
 assertArchivedR10MatchesD1Raw}
 from '../../lib/diagnostic-layer/asset-bubble-r10-history-archive-r4.mjs';

const safeError=error=>{
 const m=String(error?.message??'');
 return /^[A-Z][A-Z0-9_]{2,110}$/.test(m)?m:'ASSET_R10_ARCHIVED_D1_OPERATION_FAILED';
};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);

export async function assetR10OneYearArchiveApply({
 pcHome=process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer',
 archivedAuditFile=process.env.ZGMINI_ASSET_R10_ARCHIVED_AUDIT,
 operationalRoot=process.env.ZGMINI_ASSET_R10_OPERATIONAL_ROOT
  ||process.env.ZGMINI_EARNINGS_C_OPERATIONAL_ROOT,
 publisherRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),
 apply=false,makeDb,
}={}){
 if(!archivedAuditFile||!path.isAbsolute(archivedAuditFile)
  ||!fs.existsSync(archivedAuditFile))
  throw Error('ASSET_R10_ARCHIVED_AUDIT_FILE_REQUIRED');
 const text=fs.readFileSync(archivedAuditFile,'utf8');
 const archived=parseAssetR10ArchivedAuditLog(text);
 const current=assetR10OneYearPcAudit({pcHome});
 validateArchivedAssetR10AgainstCurrent(archived,current);
 const payload=toAssetR10HistoryPayload(archived);
 if(!apply)return {status:'PASS_ARCHIVED_DRY_RUN',key:ASSET_R10_HISTORY_KEY,
  archivedAsOfDate:payload.asOfDate,currentPcAsOfDate:current.asOfDate,
  archiveSourceVersion:payload.sourceVersion,historyStatus:payload.status,
  factors:payload.factors.map(f=>({id:f.id,status:f.status,
   pointCount:f.points.filter(p=>p.value!==null).length,
   missingQuarters:f.missingQuarters})),
  pcSqliteWrites:0,d1Writes:0,scoreWrites:0};
 if(!operationalRoot||!path.isAbsolute(operationalRoot)
  ||!fs.existsSync(operationalRoot))
  throw Error('ASSET_R10_ARCHIVED_OPERATIONAL_ROOT_REQUIRED');
 const config=JSON.parse(fs.readFileSync(path.join(pcHome,'config.json'),'utf8'));
 const {inspectD1Source,validateD1DualSource}
  =await import('./EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs');
 validateD1DualSource({config,
  publisher:inspectD1Source(publisherRoot,{publisher:true}),
  operational:inspectD1Source(operationalRoot)});
 let db;
 if(makeDb){db=await makeDb(config,operationalRoot);}
 else {
  const {client,credential}=await import('./d1.mjs');
  db=client(config,()=>credential(operationalRoot)).adapter(config.core,{allowWrites:true});
 }
 // Archived raw sidecar itself, not a synthetic republished version, controls this join.
 const row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
  .bind(ASSET_R10_RAW_KEY).first();
 if(!row?.body)throw Error('ASSET_R10_ARCHIVED_RAW_D1_MISSING');
 let raw;
 try{
  const envelope=JSON.parse(row.body),projection=envelope?.projection;
  raw=validateAssetR10Raw(envelope?.payload);
  if(!object(projection)||projection.status!=='READY'
   ||projection.sourceVersion!==raw.sourceVersion
   ||projection.sourceStoredAt!==raw.sourceStoredAt
   ||!Number.isSafeInteger(projection.builtAt)
   ||Number(row.stored_at)!==projection.builtAt
   ||projection.builtAt>Date.now())throw Error('INVALID_CHECKPOINT');
 }catch{throw Error('ASSET_R10_ARCHIVED_RAW_D1_INVALID');}
 assertArchivedR10MatchesD1Raw(raw,payload);
 const stored=await assetR10HistoryWriter(db).write(payload);
 if(!['ALREADY_STORED','READBACK_VERIFIED'].includes(stored.status))
  throw Error('ASSET_R10_ARCHIVED_HISTORY_D1_READBACK_FAILED');
 return {status:stored.status,key:ASSET_R10_HISTORY_KEY,
  historyStatus:payload.status,archivedAsOfDate:payload.asOfDate,
  sourceVersion:payload.sourceVersion,sourceStoredAt:payload.sourceStoredAt,
  approvedScore:payload.approvedScore,
  factorCounts:payload.factors.map(f=>({id:f.id,status:f.status,
   points:f.points.filter(p=>p.value!==null).length})),
  pcSqliteWrites:0,scoreWrites:0,d1Readback:stored.status};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 const apply=args.length===2&&args.includes('--apply')
  &&args.includes('--confirm-asset-r10-history-d1-write');
 const dry=args.length===1&&args[0]==='--dry-run';
 if(!apply&&!dry){
  console.error('ERROR=ASSET_R10_ARCHIVED_D1_INVALID_FLAGS');process.exitCode=2;
 }else try{
  console.log(JSON.stringify(await assetR10OneYearArchiveApply({apply})));
 }catch(error){console.error('ERROR='+safeError(error));process.exitCode=1;}
}
