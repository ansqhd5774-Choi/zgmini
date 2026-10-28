// Optional BEA manufacturing-profits archival capture from free FRED CSV.
// Isolated content-addressed raw files only: no legacy DB, scheduler, D1, UI, or score writes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {
  BEA_MFG_PROFIT_SERIES,BEA_MFG_PROFIT_CSV,
  parseBeaManufacturingProfitCsv,buildBeaManufacturingProfitPreview,
} from '../../lib/market-score/earnings-bea-manufacturing-profit-source-r1.mjs';

const SUBDIR=['raw','earnings-recession','bea-manufacturing-profits-r5'];
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const validRoot=root=>typeof root==='string'&&path.isAbsolute(root)
  &&fs.existsSync(root)&&fs.statSync(root).isDirectory()
  &&fs.existsSync(path.join(root,'storage','core.sqlite'));

function exclusiveWrite(file,bytes){
  const fd=fs.openSync(file,'wx',0o600);
  try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
}

function verifyExisting(file,expected){
  if(!fs.existsSync(file))return false;
  if(!fs.statSync(file).isFile()||sha256(fs.readFileSync(file))!==expected)
    throw Error('BEA_MFG_CONTENT_ADDRESS_CONFLICT');
  return true;
}

export async function captureBeaMfgR5({root,execute=false,fetchImpl=globalThis.fetch,
  now=()=>Date.now()}={}){
  if(!validRoot(root))throw Error('BEA_MFG_PC_ROOT_NOT_RECOGNIZED');
  if(!execute)return {status:'DRY_RUN_NO_NETWORK',seriesId:BEA_MFG_PROFIT_SERIES,
    sourceUrl:BEA_MFG_PROFIT_CSV,sourceWrites:0,sqliteWrites:0,d1Writes:0};
  const response=await fetchImpl(BEA_MFG_PROFIT_CSV,{signal:AbortSignal.timeout(20_000),
    headers:{accept:'text/csv'}});
  if(!response?.ok)throw Error('BEA_MFG_SOURCE_HTTP_FAILED');
  const csv=await response.text();
  const raw=Buffer.from(csv,'utf8');
  if(raw.length>100_000)throw Error('BEA_MFG_SOURCE_TOO_LARGE');
  const rows=parseBeaManufacturingProfitCsv(csv);
  const capturedAt=now();
  if(!Number.isSafeInteger(capturedAt)||capturedAt<=0)throw Error('BEA_MFG_INVALID_CAPTURE_TIME');
  const sourceVersion=sha256(raw);
  const preview=buildBeaManufacturingProfitPreview(csv,{sourceVersion,sourceStoredAt:capturedAt});
  const dir=path.join(root,...SUBDIR);
  // Stop on pre-existing link/reparse redirections within the new raw namespace.
  let current=root;
  for(const segment of SUBDIR){
    current=path.join(current,segment);
    if(fs.existsSync(current)&&(!fs.statSync(current).isDirectory()
      ||fs.lstatSync(current).isSymbolicLink()))
      throw Error('BEA_MFG_TARGET_NOT_DIRECTORY');
  }
  fs.mkdirSync(dir,{recursive:true});
  const csvFile=path.join(dir,sourceVersion+'.csv');
  const metaFile=path.join(dir,sourceVersion+'.json');
  let sourceWrites=0;
  if(!verifyExisting(csvFile,sourceVersion)){
    exclusiveWrite(csvFile,raw);sourceWrites++;
  }
  const metadata={schemaVersion:'earnings-bea-manufacturing-raw-r5-v1',
    seriesId:BEA_MFG_PROFIT_SERIES,sourceUrl:BEA_MFG_PROFIT_CSV,sourceVersion,
    sourceStoredAt:capturedAt,sourceRetrievedAt:new Date(capturedAt).toISOString(),
    historicalMode:'CURRENT_VINTAGE_NOT_PIT',
    latestPeriod:rows.at(-1).period,rowCount:rows.length,
    unit:'BILLIONS_USD_SAAR',file:sourceVersion+'.csv'};
  if(fs.existsSync(metaFile)){
    const previous=JSON.parse(fs.readFileSync(metaFile,'utf8'));
    if(previous.sourceVersion!==sourceVersion||previous.seriesId!==BEA_MFG_PROFIT_SERIES)
      throw Error('BEA_MFG_METADATA_CONFLICT');
    // Existing original capture time is authoritative; never rewrite metadata.
  }else{
    exclusiveWrite(metaFile,Buffer.from(JSON.stringify(metadata,null,2)+'\n'));
    sourceWrites++;
  }
  return {status:sourceWrites?'APPEND_ONLY_SOURCE_STORED':'IDENTICAL_SOURCE_REUSED',
    seriesId:BEA_MFG_PROFIT_SERIES,sourceVersion,latestPeriod:rows.at(-1).period,
    yoyPercent:preview.indicator.value,sourceWrites,sqliteWrites:0,d1Writes:0,
    relativeFiles:SUBDIR.join('/')+'/'+sourceVersion+'(.csv|.json)'};
}

const self=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===self){
  const args=process.argv.slice(2);
  if(args.length!==3||args[0]!=='--root'||!args[1]||!['--dry-run','--execute'].includes(args[2])){
    console.error('ERROR=BEA_MFG_INVALID_ARGUMENT');process.exitCode=2;
  }else{
    try{console.log(JSON.stringify(await captureBeaMfgR5({root:args[1],execute:args[2]==='--execute'}),null,2));}
    catch(e){console.error('ERROR='+String(e?.message??'BEA_MFG_CAPTURE_FAILED'));process.exitCode=1;}
  }
}
