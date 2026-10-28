// User-approved one-shot R10 raw publication. PC source is read-only; only
// detail:asset-bubble-raw:r1 may be inserted into the existing core D1 table.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assetR10PcPreflight} from './ASSET_R10_RAW_PREFLIGHT_R1.mjs';
import {ASSET_R10_RAW_KEY,toAssetR10RawPayload,assetR10RawWriter}
 from '../../worker/asset-bubble-r10-raw-r1.mjs';

const self=fileURLToPath(import.meta.url);
const safeError=error=>{
 const message=String(error?.message??'ASSET_R10_RAW_FAILED');
 return /^[A-Z][A-Z0-9_]{2,100}$/.test(message)?message:'ASSET_R10_RAW_OPERATION_FAILED';
};

export async function assetR10RawOneShot({pcHome,apply=false,operationalRoot}={}){
 // Always run the same approved zero-write PC validation first.
 const evidence=assetR10PcPreflight({pcHome});
 const payload=toAssetR10RawPayload(evidence);
 if(!apply)return {status:'PASS_DRY_RUN',key:ASSET_R10_RAW_KEY,
  scoreObservationQuarter:payload.scoreObservationQuarter,
  score:payload.diagnosticScore,factors:payload.factors,
  pcSqliteWrites:0,d1Writes:0,scoreWrites:0};
 if(!operationalRoot||!path.isAbsolute(operationalRoot)
  ||!fs.existsSync(operationalRoot))
  throw Error('ASSET_R10_RAW_APPROVED_OPERATIONAL_ROOT_REQUIRED');
 const base=pcHome;
 const config=JSON.parse(fs.readFileSync(path.join(base,'config.json'),'utf8'));
 const {inspectD1Source,validateD1DualSource}
  =await import('./EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs');
 const publisherRoot=path.resolve(path.dirname(self),'../..');
 validateD1DualSource({config,
  publisher:inspectD1Source(publisherRoot,{publisher:true}),
  operational:inspectD1Source(operationalRoot)});
 const {client,credential}=await import('./d1.mjs');
 const remote=client(config,()=>credential(operationalRoot));
 const result=await assetR10RawWriter(remote.adapter(config.core,{allowWrites:true}))
  .write(payload);
 if(!['READBACK_VERIFIED','ALREADY_STORED'].includes(result.status))
  throw Error('ASSET_R10_RAW_D1_READBACK_FAILED');
 return {status:result.status,key:result.key,
  scoreObservationQuarter:payload.scoreObservationQuarter,
  score:payload.diagnosticScore,factors:payload.factors,
  pcSqliteWrites:0,scoreWrites:0,d1Readback:result.status};
}

if(process.argv[1]&&path.resolve(process.argv[1])===self){
 const args=process.argv.slice(2);
 const apply=args.length===2&&args.includes('--apply')
  &&args.includes('--confirm-asset-r10-raw-d1-write');
 const dry=args.length===1&&args[0]==='--dry-run';
 if(!apply&&!dry){
  console.error('ERROR=ASSET_R10_RAW_INVALID_ARGUMENTS');process.exitCode=2;
 }else try{
  const result=await assetR10RawOneShot({
   pcHome:process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer',apply,
   operationalRoot:process.env.ZGMINI_ASSET_R10_OPERATIONAL_ROOT
    ||process.env.ZGMINI_EARNINGS_C_OPERATIONAL_ROOT,
  });
  console.log(JSON.stringify(result));
 }catch(error){console.error('ERROR='+safeError(error));process.exitCode=1;}
}
