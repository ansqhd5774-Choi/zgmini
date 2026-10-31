// R58.3 unified one-shot offline PC pilot. No provider requests or DB modifications.
// Aggregate diagnostics only; do not upload private shadow.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const REPORT=path.join(ROOT,'MARKET_CALENDAR_R58_3_RESULT.txt');
const OLD_RESULT=path.join(ROOT,'MARKET_CALENDAR_R58_FHS_R3_RESULT.txt');
const PRIVATE=path.join(ROOT,'MARKET_CALENDAR_R58_FHS_R3_PRIVATE_SHADOW.json');
const TRACE=path.join(ROOT,'MARKET_CALENDAR_R58_3_TRACE_LOCAL.txt');
const PC=String.raw`E:\ZGmini\data\pc-writer`;
const scrubCode=x=>typeof x==='string'&&/^[A-Z0-9_]{1,110}$/.test(x)?x:'R58_3_UNCLASSIFIED_ERROR';
let stage='START';
function mark(next){stage=next;fs.appendFileSync(TRACE,`stage=${next}\n`,{encoding:'utf8'});}
function write(out){
 const rows=['AUDIT=MARKET_CALENDAR_R58_3_UNIFIED','mode=OFFLINE_PRIVATE_PILOT',
  'scoringVersion="ZGMINI-FHS-R3"',`nodeVersion=${JSON.stringify(process.version)}`,
  `stage=${JSON.stringify(stage)}`,...Object.entries(out).map(([k,v])=>`${k}=${JSON.stringify(v)}`),
  'providerRequests=0','dbWrites=0','d1Writes=0','publicImportanceStarsChanged=false'];
 fs.writeFileSync(REPORT,rows.join('\r\n')+'\r\n',{flag:'wx',encoding:'utf8'});
}
function isFile(loc){try{return fs.statSync(loc).isFile()}catch{return false}}
if(isFile(REPORT)||isFile(OLD_RESULT)||isFile(PRIVATE)||isFile(TRACE)){
 process.stdout.write('STATUS=R58_3_EXISTING_OUTPUT_STOP (do not overwrite or rerun)\n');
 process.exitCode=2;
}else{
 try{
  mark('MODULE_PREFLIGHT');
  const mods=['sec-r57-credit-coverage.mjs','fhs-r3-score.mjs','fhs-r3-sec-extract.mjs','fhs-r3-private-pilot.mjs'];
  for(const m of mods){if(!isFile(path.join(ROOT,'scripts',m)))throw Error('R58_3_PACKAGE_SCRIPT_MISSING_STOP')}
  for(const [name,p] of [
   ['PC_DB',path.join(PC,'storage','core.sqlite')],
   ['SEC_MAP',path.join(PC,'manual-input','e1-r5','incoming','company_tickers_exchange.json')],
   ['SEC_ZIP',path.join(PC,'manual-input','e1-r5','incoming','companyfacts.zip')]]){
   if(!isFile(p))throw Error(`R58_3_${name}_MISSING_STOP`);
  }
  mark('IMPORT_RUNNER');
  const {runOnce}=await import('./scripts/fhs-r3-private-pilot.mjs');
  if(typeof runOnce!=='function')throw Error('R58_3_RUNNER_EXPORT_MISSING_STOP');
  mark('SCORING');
  const result=runOnce({pcHome:PC,outputDir:ROOT});
  if(!isFile(OLD_RESULT)||!isFile(PRIVATE))throw Error('R58_3_OUTPUT_INCOMPLETE_STOP');
  mark('REPORTING');
  const lines=fs.readFileSync(OLD_RESULT,'utf8');
  const summary={};
  const fields=['status','asOf','version','calendarTickers','secMappedTickers','provisionalScoreTickers',
   'provisionalStarCounts','excludedOrMissingTickers','missingReasons','actualVerifiedCreditRatings'];
  for(const line of lines.split(/\r?\n/)){
   const j=line.indexOf('=');if(j<0)continue;
   const key=line.slice(0,j);
   if(!fields.includes(key))continue;
   try{summary[key]=JSON.parse(line.slice(j+1))}catch{throw Error('R58_3_ORIGINAL_REPORT_INVALID_STOP')}
  }
  if(summary.status!=='R58_LOCAL_PROVISIONAL_SCORING_COMPLETE')throw Error('R58_3_SCORING_NOT_COMPLETE_STOP');
  write({status:'R58_3_LOCAL_PROVISIONAL_SCORING_COMPLETE',executionComplete:true,
    ...Object.fromEntries(Object.entries(summary).filter(([k])=>k!=='status')),
    privateShadowPresent:true,publicationReady:false,note:'AGGREGATE_ONLY; PRIVATE_SHADOW_STAYS_ON_PC'});
  process.stdout.write('STATUS=R58_3_LOCAL_PROVISIONAL_SCORING_COMPLETE\nRESULT=MARKET_CALENDAR_R58_3_RESULT.txt\n');
 }catch(error){
  const code=scrubCode(error?.message);
  const errCode=scrubCode(error?.code);
  const hasOld=isFile(OLD_RESULT),hasPrivate=isFile(PRIVATE);
  try{write({status:code.startsWith('R58_3_')?code:'R58_3_RUNNER_FAILED_STOP',
    causeCode:code,systemErrorCode:errCode,executionComplete:false,
    originalResultPresent:hasOld,privateShadowPresent:hasPrivate,
    errorClass:typeof error?.name==='string'&&/^[A-Za-z]+$/.test(error.name)?error.name:'Unknown',
    note:'STOP; DO NOT OVERWRITE FILES OR RUN AGAIN; NO COMPLETE SCORE VERIFIED'});
  }catch{process.stdout.write('STATUS=R58_3_REPORT_WRITE_FAILED_STOP\n')}
  process.stdout.write(`STATUS=R58_3_FAILED_STAGE_${stage}\nREPORT=MARKET_CALENDAR_R58_3_RESULT.txt\n`);
  process.exitCode=2;
 }
}
