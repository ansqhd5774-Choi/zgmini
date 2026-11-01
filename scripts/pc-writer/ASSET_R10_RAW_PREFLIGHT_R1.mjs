// Windows PC approved-source read-only evidence. Never downloads, publishes,
// writes SQLite, changes R10 scoring, or touches operational scheduling.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {base,readR10Inputs,r10InputSlice} from './asset-r10-storage.mjs';
import {buildAssetR10RawReadOnlyEvidence}
 from '../../lib/diagnostic-layer/asset-bubble-r10-raw-evidence-r1.mjs';

const self=fileURLToPath(import.meta.url);
const safeError=e=>{
 const message=String(e?.message??'ASSET_R10_RAW_READ_FAILED');
 return /^[A-Z][A-Z0-9_]{2,100}$/.test(message)
  ?message:'ASSET_R10_RAW_PREFLIGHT_FAILED';
};

export function assetR10PcPreflight({pcHome=base}={}){
 if(typeof pcHome!=='string'||!path.isAbsolute(pcHome))
  throw Error('ASSET_R10_RAW_PC_HOME_REQUIRED');
 if(path.resolve(pcHome).toLowerCase()!==path.resolve(base).toLowerCase())
  throw Error('ASSET_R10_RAW_PC_HOME_MISMATCH');
 const dbPath=path.join(pcHome,'storage','core.sqlite');
 if(!fs.existsSync(dbPath))throw Error('ASSET_R10_RAW_PC_SQLITE_MISSING');
 const before=fs.statSync(dbPath);
 const read=name=>{
  const file=path.join(pcHome,`local-asset-bubble-r10-${name}.json`);
  if(!fs.existsSync(file))throw Error('ASSET_R10_RAW_REQUIRED_LOCAL_EVIDENCE_MISSING');
  return JSON.parse(fs.readFileSync(file,'utf8'));
 };
 const release=read('release-payload');
 const breadth=read('breadth-research');
 const quality=read('alpaca-pit-validation');
 const audit=read('alpaca-collected-audit');
 // Existing storage helper uses DatabaseSync(readOnly:true) and query_only=ON.
 // The snapshots are intentionally not regenerated or overwritten.
 const inputs=readR10Inputs();
 if(!inputs.macro?.body?.series||!inputs.price?.body?.series?.SP500)
  throw Error('ASSET_R10_RAW_REQUIRED_STORED_INPUT_MISSING');
 if(inputs.macro.storedAt>release.sourceStoredAt
   ||inputs.price.storedAt>release.sourceStoredAt)
  throw Error('ASSET_R10_RAW_RELEASE_SUPERSEDED_BY_STORED_INPUT');
 const macro=r10InputSlice(inputs.macro);
 const out=buildAssetR10RawReadOnlyEvidence({macroSeries:macro.series,
  sp500Rows:inputs.price.body.series.SP500,breadth,quality,audit,release});
 const after=fs.statSync(dbPath);
 if(before.size!==after.size||before.mtimeMs!==after.mtimeMs)
  throw Error('ASSET_R10_RAW_PC_SQLITE_CHANGED_DURING_READ');
 return {...out,storedInputs:{macroBatchKey:inputs.macro.key,
  macroStoredAt:inputs.macro.storedAt,
  priceBatchKey:inputs.price.key,priceStoredAt:inputs.price.storedAt},
  pcSqliteWrites:0,d1Writes:0,scoreWrites:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===self){
 if(process.argv.length!==3||process.argv[2]!=='--dry-run'){
  console.error('ERROR=ASSET_R10_RAW_READONLY_FLAG_REQUIRED');process.exitCode=2;
 }else try{console.log(JSON.stringify(assetR10PcPreflight({
  pcHome:process.env.ZGMINI_PC_HOME||'E:\\ZGmini\\data\\pc-writer'})));}
 catch(error){console.error('ERROR='+safeError(error));process.exitCode=1;}
}
