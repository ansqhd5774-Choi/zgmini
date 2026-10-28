// PC-only: validate archived SHA source, then optionally publish one stored-only D1 sidecar.
// Never changes existing PC SQLite, legacy raw, market scores, scheduler or DNS.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildBeaManufacturingProfitPreview,parseBeaManufacturingProfitCsv,
  BEA_MFG_PROFIT_SERIES,BEA_MFG_PROFIT_CSV}
 from '../../lib/market-score/earnings-bea-manufacturing-profit-source-r1.mjs';
import {validateBeaMfgProfit,beaMfgFreshness,beaMfgWriter,BEA_MFG_SNAPSHOT_KEY}
 from '../../worker/earnings-bea-manufacturing-profit-r1.mjs';

const sha256=x=>createHash('sha256').update(x).digest('hex');
const RAW=['raw','earnings-recession','bea-manufacturing-profits-r5'];
const validSha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);

export function readArchivedBeaMfgR6({root,sourceSha,now=Date.now()}={}){
  if(typeof root!=='string'||!path.isAbsolute(root)||!validSha(sourceSha))
    throw Error('BEA_MFG_ARCHIVE_ARGUMENT_INVALID');
  const folder=path.join(root,...RAW);
  const csvFile=path.join(folder,sourceSha+'.csv');
  const metaFile=path.join(folder,sourceSha+'.json');
  if(!fs.existsSync(csvFile)||!fs.existsSync(metaFile))throw Error('BEA_MFG_ARCHIVE_MISSING');
  if(fs.statSync(csvFile).size>100_000||fs.statSync(metaFile).size>10_000)
    throw Error('BEA_MFG_ARCHIVE_TOO_LARGE');
  const original=fs.readFileSync(csvFile);
  if(sha256(original)!==sourceSha)throw Error('BEA_MFG_ARCHIVE_SHA_MISMATCH');
  let meta;
  try{meta=JSON.parse(fs.readFileSync(metaFile,'utf8'));}
  catch{throw Error('BEA_MFG_ARCHIVE_METADATA_INVALID');}
  if(meta.schemaVersion!=='earnings-bea-manufacturing-raw-r5-v1'
    ||meta.sourceVersion!==sourceSha||meta.seriesId!==BEA_MFG_PROFIT_SERIES
    ||meta.sourceUrl!==BEA_MFG_PROFIT_CSV
    ||meta.file!==sourceSha+'.csv'||meta.historicalMode!=='CURRENT_VINTAGE_NOT_PIT'
    ||meta.unit!=='BILLIONS_USD_SAAR'
    ||!Number.isSafeInteger(meta.sourceStoredAt)||meta.sourceStoredAt<=0
    ||meta.sourceRetrievedAt!==new Date(meta.sourceStoredAt).toISOString())
    throw Error('BEA_MFG_ARCHIVE_METADATA_MISMATCH');
  const sourceText=original.toString('utf8');
  const rows=parseBeaManufacturingProfitCsv(sourceText);
  if(!Number.isSafeInteger(meta.rowCount)||meta.rowCount!==rows.length)
    throw Error('BEA_MFG_ARCHIVE_ROW_COUNT_MISMATCH');
  const payload=buildBeaManufacturingProfitPreview(sourceText,{
    sourceVersion:sourceSha,sourceStoredAt:meta.sourceStoredAt});
  validateBeaMfgProfit(payload,{now});
  if(payload.indicator.observationPeriod!==meta.latestPeriod
    ||payload.indicator.history.length>meta.rowCount)
    throw Error('BEA_MFG_ARCHIVE_PERIOD_MISMATCH');
  if(beaMfgFreshness(payload,{now}).status!=='FRESH')throw Error('BEA_MFG_ARCHIVE_STALE');
  return payload;
}

const self=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===self){
  const args=process.argv.slice(2);
  const root=process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer';
  const sourceArg=args.indexOf('--source-sha');
  const sourceSha=sourceArg>=0?args[sourceArg+1]:null;
  const apply=args.includes('--apply');
  const valid=args.length===(apply?4:3)&&sourceArg>=0
    &&(args.includes('--dry-run')!==apply)
    &&(!apply||args.includes('--confirm-bea-manufacturing-d1-write'));
  if(!valid){console.error('ERROR=BEA_MFG_INVALID_ARGUMENT');process.exitCode=2;}
  else{
    try{
      let config,operationalRoot;
      if(apply){
        operationalRoot=process.env.ZGMINI_EARNINGS_C_OPERATIONAL_ROOT;
        if(!operationalRoot||!fs.existsSync(operationalRoot))
          throw Error('BEA_MFG_APPROVED_OPERATIONAL_ROOT_REQUIRED');
        config=JSON.parse(fs.readFileSync(path.join(root,'config.json'),'utf8'));
        const {inspectD1Source,validateD1DualSource}=await import('./EARNINGS_R4_C_D1_DUAL_SOURCE_GATES.mjs');
        const publisherRoot=path.resolve(path.dirname(self),'../..');
        validateD1DualSource({config,
          publisher:inspectD1Source(publisherRoot,{publisher:true}),
          operational:inspectD1Source(operationalRoot)});
      }
      const payload=readArchivedBeaMfgR6({root,sourceSha});
      if(!apply)console.log(JSON.stringify({status:'PASS_READONLY_ARCHIVE_PREFLIGHT',
        sourceVersion:payload.sourceVersion,period:payload.indicator.observationPeriod,
        yoyPercent:payload.indicator.value,rawWrites:0,sqliteWrites:0,d1Writes:0}));
      else{
        const {client,credential}=await import('./d1.mjs');
        const remote=client(config,()=>credential(operationalRoot));
        const result=await beaMfgWriter(remote.adapter(config.core,{allowWrites:true})).write(payload);
        if(!['READBACK_VERIFIED','ALREADY_STORED'].includes(result.status))
          throw Error('BEA_MFG_D1_READBACK_NOT_VERIFIED');
        console.log(JSON.stringify({status:result.status,key:BEA_MFG_SNAPSHOT_KEY,
          sourceVersion:payload.sourceVersion,period:payload.indicator.observationPeriod,
          yoyPercent:payload.indicator.value,sqliteWrites:0,scoreWrites:0,d1Readback:result.status}));
      }
    }catch(error){console.error('ERROR='+String(error?.message??'BEA_MFG_R6_FAILED'));process.exitCode=1;}
  }
}
