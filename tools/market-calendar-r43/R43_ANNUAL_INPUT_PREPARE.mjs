// Explicit annual PC-private input preparation. No network, D1 or Core work.
// Converts ALREADY STORED, reviewed daily files into the fixed R43 input file.
import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {readStoredR45ToR43Annual} from './R43_ANNUAL_OFFLINE_INPUT.mjs';
import {readManualParquetToR43Annual} from './R43_ANNUAL_PARQUET_OPTIONAL.mjs';
import {prepareR43ManualSnapshot} from './R43_PC_MANUAL_PUBLISH.mjs';

const INPUT='local-market-calendar-r43-input.json';
const ROSTER='local-market-calendar-r43-reviewed-issuers.json';
const MANIFEST='local-market-calendar-r43-manual-parquet-manifest.json';
const PARQUET_DIR='market-calendar-r43-manual-parquet';
const fail=code=>{throw Error(code)};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

export function parseR43AnnualPrepareArgs(args){
 if(args.length===1&&args[0]==='--help')return {help:true};
 let mode='preflight',seenMode=false,confirmed=false;
 const values={};
 for(let i=0;i<args.length;i++){
  const key=args[i];
  if(key==='--preflight'||key==='--write-input'){
   if(seenMode)fail('R43_ANNUAL_PREPARE_MODE_CONFLICT_STOP');
   mode=key.slice(2);seenMode=true;
  }else if(key==='--confirm-r43-annual-write'){
   if(confirmed)fail('R43_ANNUAL_PREPARE_DUPLICATE_CONFIRM_STOP');
   confirmed=true;
  }else if(key==='--pc-home'||key==='--source'){
   if(Object.hasOwn(values,key)||!args[i+1]||args[i+1].startsWith('--'))
    fail('R43_ANNUAL_PREPARE_ARGS_STOP');
   values[key]=args[++i];
  }else fail('R43_ANNUAL_PREPARE_ARGS_STOP');
 }
 const pcHome=values['--pc-home'],source=values['--source'];
 if(typeof pcHome!=='string'||!path.isAbsolute(pcHome)||
  !['stored-r45','manual-parquet'].includes(source))
  fail('R43_ANNUAL_PREPARE_PATH_OR_SOURCE_STOP');
 if((mode==='write-input')!==confirmed)
  fail('R43_ANNUAL_PREPARE_CONFIRMATION_STOP');
 return {pcHome:path.resolve(pcHome),source,write:mode==='write-input'};
}

function readRoster(file){
 let stat;
 try{stat=fs.lstatSync(file)}catch{fail('R43_ANNUAL_PREPARE_ROSTER_MISSING_STOP')}
 if(!stat.isFile()||stat.size<50||stat.size>8_000_000)
  fail('R43_ANNUAL_PREPARE_ROSTER_INVALID_STOP');
 try{return JSON.parse(fs.readFileSync(file,'utf8'))}
 catch{fail('R43_ANNUAL_PREPARE_ROSTER_INVALID_STOP')}
}

function ensurePcDirectory(base){
 let stat;
 try{stat=fs.statSync(base)}catch{fail('R43_ANNUAL_PREPARE_PC_HOME_MISSING_STOP')}
 if(!stat.isDirectory())fail('R43_ANNUAL_PREPARE_PC_HOME_INVALID_STOP');
}

// Same-directory hard-link publication is atomic, fails if target exists, and
// never replaces a prior reviewed input. A partial tmp is not the live input.
function writeOnceAtomic(target,body){
 const tmp=path.join(path.dirname(target),'.r43-annual-'+randomUUID()+'.tmp');
 let fd=null,createdTarget=false,readbackVerified=false;
 try{
  fd=fs.openSync(tmp,'wx',0o600);
  fs.writeFileSync(fd,body,{encoding:'utf8'});
  fs.fsyncSync(fd);
  fs.closeSync(fd);fd=null;
  fs.linkSync(tmp,target); // EEXIST is a hard stop, not an overwrite.
  createdTarget=true;
  const back=fs.readFileSync(target);
  if(digest(back)!==digest(Buffer.from(body,'utf8')))
   fail('R43_ANNUAL_PREPARE_LOCAL_READBACK_STOP');
  readbackVerified=true;
 }finally{
  if(fd!==null)fs.closeSync(fd);
  // Only our just-created output may be removed when readback failed;
  // an already existing target never reaches createdTarget=true.
  if(createdTarget&&!readbackVerified){
   try{fs.unlinkSync(target)}catch{}
  }
  try{fs.unlinkSync(tmp)}catch{} // Only the private temp created here.
 }
}

/**
 * Preflight is read-only. --write-input is a once-per-year, explicit local
 * private file creation only. Existing precomputed-RV inputs are handled by
 * R43_MANUAL_RUN.mjs and are never overwritten by this converter.
 */
export async function runR43AnnualPrepareCommand(argv,{
 now=Date.now(),parquetDecoder,
}={}){
 const opts=parseR43AnnualPrepareArgs(argv);
 if(opts.help)return {usage:'node R43_ANNUAL_INPUT_PREPARE.mjs --preflight|--write-input --confirm-r43-annual-write --source stored-r45|manual-parquet --pc-home <absolute-PC-home>',
  note:'preflight: zero writes; write-input: one private file, never D1, no provider calls'};
 ensurePcDirectory(opts.pcHome);
 const target=path.join(opts.pcHome,INPUT);
 if(opts.write&&fs.existsSync(target))
  fail('R43_ANNUAL_PREPARE_EXISTING_INPUT_PRESERVED_STOP');
 const rosterFile=path.join(opts.pcHome,ROSTER);
 const roster=readRoster(rosterFile);
 const input=opts.source==='stored-r45'?
  readStoredR45ToR43Annual({pcHome:opts.pcHome,universeFile:rosterFile,now}):
  await readManualParquetToR43Annual({
   manifestFile:path.join(opts.pcHome,MANIFEST),universeFile:rosterFile,
   parquetDir:path.join(opts.pcHome,PARQUET_DIR),now,
   ...(parquetDecoder?{decoder:parquetDecoder}:{}),
  });
 // Recheck the exact publisher contract including reviewed exceptions, rights,
 // full issuer coverage, selected top 5%, and same-day input integrity.
 const compact=prepareR43ManualSnapshot(input,{approvedUniverse:roster,now});
 const body=JSON.stringify(input);
 if(Buffer.byteLength(body,'utf8')>8_000_000)
  fail('R43_ANNUAL_PREPARE_INPUT_TOO_LARGE_STOP');
 if(opts.write)writeOnceAtomic(target,body);
 return {status:opts.write?'R43_ANNUAL_PRIVATE_INPUT_WRITTEN_AND_READBACK':
   'R43_ANNUAL_INPUT_PREFLIGHT_READY_NOT_WRITTEN',
  source:opts.source,asOf:input.asOf,eligibleIssuers:compact.eligibleIssuers,
  topCount:compact.topCount,outputName:INPUT,outputWritten:opts.write,
  providerCalls:0,d1Reads:0,d1Writes:0,coreChanges:0};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try{console.log(JSON.stringify(await runR43AnnualPrepareCommand(process.argv.slice(2))))}
 catch(error){
  const code=String(error?.message??'UNKNOWN');
  // Never expose raw OHLCV, reviewed membership, filesystem paths or keys.
  console.error('R43_ANNUAL_PREPARE_STOP:',/^R43_/.test(code)?code:'R43_ANNUAL_PREPARE_LOCAL_SOURCE_READ_FAILED_STOP');
  process.exitCode=1;
 }
}
