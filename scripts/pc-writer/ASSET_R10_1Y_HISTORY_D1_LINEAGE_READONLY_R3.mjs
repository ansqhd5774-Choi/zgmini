// R10 history publication gate diagnostic: read-only PC and D1 source comparison.
// No D1 mutation, provider call, score calculation/write, or scheduler action.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assetR10OneYearPcAudit} from './ASSET_R10_1Y_HISTORY_READONLY_R1.mjs';
import {discoverOperationalRoot} from './BEA_MFG_R6_FIND_OPERATIONAL.mjs';
import {inspectD1Source} from './EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs';
import {ASSET_R10_RAW_KEY,validateAssetR10Raw}
 from '../../worker/asset-bubble-r10-raw-r1.mjs';
import {ASSET_R10_HISTORY_KEY,toAssetR10HistoryPayload,validateAssetR10History}
 from '../../worker/asset-bubble-r10-history-r1.mjs';
import {assetR10HistoryLineageDiff}
 from '../../lib/diagnostic-layer/asset-bubble-r10-d1-lineage-r3.mjs';

export async function assetR10HistoryD1ReadOnly({
 pcHome=process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer',
 operationalRoot=process.env.ZGMINI_ASSET_R10_OPERATIONAL_ROOT
  ||process.env.ZGMINI_EARNINGS_C_OPERATIONAL_ROOT||null,
 openDb,
}={}){
 const evidence=assetR10OneYearPcAudit({pcHome});
 const payload=toAssetR10HistoryPayload(evidence);
 const config=JSON.parse(fs.readFileSync(path.join(pcHome,'config.json'),'utf8'));
 if(config.collectionTarget!=='pc'||config.enabled!==true
  ||typeof config.source!=='string'||!(/^[a-f0-9]{40}$/i).test(config.source))
  throw Error('ASSET_R10_DIAG_PC_CONFIG_NOT_APPROVED');
 const root=operationalRoot||discoverOperationalRoot({pcHome});
 const info=inspectD1Source(root);
 if(info.sha!==config.source||!info.clean||!info.remoteMatch)
  throw Error('ASSET_R10_DIAG_OPERATIONAL_SOURCE_MISMATCH');
 let db;
 if(openDb){db=await openDb(config,root);}else{
  const {client,credential}=await import('./d1.mjs');
  db=client(config,()=>credential(root)).adapter(config.core); // allowWrites defaults false
 }
 const row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
  .bind(ASSET_R10_RAW_KEY).first();
 if(!row||typeof row.body!=='string')
  return {status:'RAW_D1_MISSING',rawD1:'MISSING',historyD1:'NOT_CHECKED',d1Writes:0};
 let raw;
 try{raw=validateAssetR10Raw(JSON.parse(row.body).payload);}
 catch{return {status:'RAW_D1_INVALID',rawD1:'INVALID',historyD1:'NOT_CHECKED',d1Writes:0};}
 const mismatches=assetR10HistoryLineageDiff(raw,payload);
 // Check history key even if mismatch: a prior partial attempt may have stored it.
 const historyRow=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?')
  .bind(ASSET_R10_HISTORY_KEY).first();
 let historyState='MISSING';
 if(historyRow){
  try{
   const parsed=JSON.parse(historyRow.body);
   const saved=validateAssetR10History(parsed.payload);
   historyState=JSON.stringify(saved)===JSON.stringify(payload)?'STORED_IDENTICAL':'STORED_DIFFERENT';
  }catch{historyState='STORED_INVALID';}
 }
 return {status:mismatches.length?'LINEAGE_MISMATCH_DIAGNOSED':'LINEAGE_MATCH',
  rawD1:'VALID',historyD1:historyState,historyExpectedStatus:payload.status,
  mismatchCount:mismatches.length,mismatches,
  sourceObservationQuarter:payload.scoreObservationQuarter,
  readyFactorCount:payload.factors.filter(f=>f.status==='READY_1Y').length,
  partialFactorCount:payload.factors.filter(f=>f.status==='PARTIAL_1Y').length,
  pcSqliteWrites:0,d1Writes:0,scoreWrites:0,providerRequests:0,deployments:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--read-only'){
  console.error('ERROR=ASSET_R10_D1_DIAG_READ_ONLY_FLAG_REQUIRED');process.exitCode=2;
 }else try{
  console.log(JSON.stringify(await assetR10HistoryD1ReadOnly()));
 }catch(error){
  const m=String(error?.message??'');
  console.error('ERROR='+(/^[A-Z][A-Z0-9_]{2,110}$/.test(m)
   ?m:'ASSET_R10_D1_READ_ONLY_DIAGNOSTIC_FAILED'));
  process.exitCode=1;
 }
}
