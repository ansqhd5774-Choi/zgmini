// Separate opt-in D1 publication for audited R10 source history only.
// Does not overwrite the approved R10 score or two-point raw sidecar.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assetR10OneYearPcAudit} from './ASSET_R10_1Y_HISTORY_READONLY_R1.mjs';
import {ASSET_R10_HISTORY_KEY,toAssetR10HistoryPayload,assetR10HistoryWriter}
 from '../../worker/asset-bubble-r10-history-r1.mjs';
import {ASSET_R10_RAW_KEY,validateAssetR10Raw}
 from '../../worker/asset-bubble-r10-raw-r1.mjs';

const safeError=error=>{
 const message=String(error?.message??'');
 return /^[A-Z][A-Z0-9_]{2,110}$/.test(message)
  ?message:'ASSET_R10_HISTORY_D1_OPERATION_FAILED';
};
const near=(a,b)=>typeof a==='number'&&Number.isFinite(a)
 &&typeof b==='number'&&Number.isFinite(b)&&Math.abs(a-b)<1e-7;

export async function assetR10OneYearD1OneShot({pcHome,operationalRoot,apply=false}={}){
 const audited=assetR10OneYearPcAudit({pcHome});
 const payload=toAssetR10HistoryPayload(audited);
 if(!apply)return {status:'PASS_DRY_RUN',key:ASSET_R10_HISTORY_KEY,
  historyStatus:payload.status,quarters:[payload.firstQuarter,payload.lastQuarter],
  factors:payload.factors.map(f=>({id:f.id,status:f.status,
   missingQuarters:f.missingQuarters,pointCount:f.points.filter(p=>p.value!==null).length})),
  pcSqliteWrites:0,d1Writes:0,scoreWrites:0};
 if(!operationalRoot||!path.isAbsolute(operationalRoot)
  ||!fs.existsSync(operationalRoot))
  throw Error('ASSET_R10_HISTORY_APPROVED_OPERATIONAL_ROOT_REQUIRED');
 const config=JSON.parse(fs.readFileSync(path.join(pcHome,'config.json'),'utf8'));
 const {inspectD1Source,validateD1DualSource}
  =await import('./EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs');
 const publisherRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
 validateD1DualSource({config,
  publisher:inspectD1Source(publisherRoot,{publisher:true}),
  operational:inspectD1Source(operationalRoot)});
 const {client,credential}=await import('./d1.mjs');
 const remote=client(config,()=>credential(operationalRoot));
 const db=remote.adapter(config.core,{allowWrites:true});
 // Old two-point D1 source must already match the PC release exactly.
 const current=await db.prepare('SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?')
  .bind(ASSET_R10_RAW_KEY).first();
 if(!current?.body)throw Error('ASSET_R10_HISTORY_APPROVED_RAW_D1_MISSING');
 let raw;
 try{raw=validateAssetR10Raw(JSON.parse(current.body).payload);}
 catch{throw Error('ASSET_R10_HISTORY_APPROVED_RAW_D1_INVALID');}
 if(raw.sourceVersion!==payload.sourceVersion
  ||raw.sourceStoredAt!==payload.sourceStoredAt
  ||raw.asOfDate!==payload.asOfDate
  ||raw.scoreObservationQuarter!==payload.scoreObservationQuarter
  ||!near(raw.diagnosticScore,payload.approvedScore)
  ||!raw.factors.every((factor,i)=>{
   const history=payload.factors[i];
   return factor.id===history.id&&factor.unit===history.unit
    &&factor.source===history.source
    &&near(factor.value,history.points[4].value)
    &&near(factor.previousValue,history.points[3].value)
    &&factor.observationDate===history.points[4].observationDate
    &&factor.previousObservationDate===history.points[3].observationDate;
  }))throw Error('ASSET_R10_HISTORY_APPROVED_RAW_D1_LINEAGE_MISMATCH');
 const result=await assetR10HistoryWriter(db).write(payload);
 if(!['READBACK_VERIFIED','ALREADY_STORED'].includes(result.status))
  throw Error('ASSET_R10_HISTORY_D1_READBACK_FAILED');
 return {status:result.status,key:ASSET_R10_HISTORY_KEY,
  historyStatus:payload.status,sourceVersion:payload.sourceVersion,
  sourceStoredAt:payload.sourceStoredAt,score:payload.approvedScore,
  factors:payload.factors.map(f=>({id:f.id,status:f.status,
   missingQuarters:f.missingQuarters,points:f.points})),
  pcSqliteWrites:0,scoreWrites:0,d1Readback:result.status};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 const apply=args.length===2&&args.includes('--apply')
  &&args.includes('--confirm-asset-r10-history-d1-write');
 const dry=args.length===1&&args[0]==='--dry-run';
 if(!apply&&!dry){
  console.error('ERROR=ASSET_R10_HISTORY_INVALID_ARGUMENTS');process.exitCode=2;
 }else try{
  const result=await assetR10OneYearD1OneShot({
   pcHome:process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer',apply,
   operationalRoot:process.env.ZGMINI_ASSET_R10_OPERATIONAL_ROOT
    ||process.env.ZGMINI_EARNINGS_C_OPERATIONAL_ROOT,
  });
  console.log(JSON.stringify(result));
 }catch(error){console.error('ERROR='+safeError(error));process.exitCode=1;}
}
