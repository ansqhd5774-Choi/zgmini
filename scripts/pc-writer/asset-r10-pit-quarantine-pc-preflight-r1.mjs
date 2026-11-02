import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {inspectR10BreadthIncremental,R10_RESEARCH_IDENTITY_QUARANTINE} from './asset-r10-breadth-incremental.mjs';

// Run directly from an approved PC source checkout with an explicit data root.
// This is a bounded, read-only inventory and research audit: no source or data
// writes, provider requests, SQLite, D1, Task, lock or process interaction.
export const R10_PC_QUARANTINE_PREFLIGHT='ASSET_R10_PIT_QUARANTINE_PC_READONLY_R1';
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&
  !Number.isNaN(Date.parse(d+'T00:00:00Z'))&&
  new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
const digest=b=>createHash('sha256').update(b).digest('hex');
const stop=(status,more={})=>({revision:R10_PC_QUARANTINE_PREFLIGHT,status,
  readOnly:true,canPromote:false,productionEligible:false,
  providerCalls:0,pcInputWrites:0,sqliteWrites:0,d1Reads:0,d1Writes:0,
  coreTaskChanges:0,lockPidActions:0,...more});

function readBoundedJson(file,budget){
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<=0||
    stat.size>128_000_000||budget.remaining<stat.size)throw Error('READ_BUDGET');
 budget.remaining-=stat.size;
 const bytes=fs.readFileSync(file);
 return {parsed:JSON.parse(bytes.toString('utf8')),sha256:digest(bytes)};
}
function listJson(dir,pattern,limit,{optional=false}={}){
 if(optional&&!fs.existsSync(dir))return [];
 const stat=fs.lstatSync(dir);
 if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('SOURCE_DIRECTORY_INVALID');
 const names=fs.readdirSync(dir);
 const relevant=names.filter(name=>pattern.test(name)).sort();
 if(relevant.length>limit)throw Error('READ_FILE_CAP');
 if(relevant.some(name=>!/^[A-Za-z0-9.\-]+$/.test(name)))throw Error('UNSAFE_FILENAME');
 return relevant.map(name=>path.join(dir,name));
}
function latestSqliteMarketUniverseDate(root){
 const file=path.join(root,'storage','core.sqlite');
 const dir=path.dirname(file);
 if(!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink()||
    fs.lstatSync(dir).isSymbolicLink()||!fs.lstatSync(dir).isDirectory())
  return {status:'STOP_SQLITE_UNIVERSE_UNAVAILABLE',date:null};
 let db;
 try{
  db=new DatabaseSync(file,{readOnly:true});db.exec('PRAGMA query_only=ON');
  const row=db.prepare('SELECT trade_date FROM market_score_breadth_b1_r3_universe_v1 ORDER BY trade_date DESC LIMIT 1').get();
  return validDate(row?.trade_date)?{status:'DATE_VERIFIED_READONLY',date:row.trade_date}:
   {status:'STOP_SQLITE_UNIVERSE_UNAVAILABLE',date:null};
 }catch{return {status:'STOP_SQLITE_UNIVERSE_UNAVAILABLE',date:null}}
 finally{db?.close()}
}

/** Read real approved PC artifacts and return ONLY summary and SHA witnesses. */
export function preflightStoredR10PitQuarantine({base,asOfDate}={}){
 if(typeof base!=='string'||!path.isAbsolute(base)||!validDate(asOfDate))
  return stop('STOP_EXPLICIT_PC_DATA_ROOT_OR_DATE_MISSING');
 try{
  const root=path.resolve(base);
  const stat=fs.lstatSync(root);
  if(!stat.isDirectory()||stat.isSymbolicLink())
   return stop('STOP_PC_DATA_ROOT_UNSAFE');
  const budget={remaining:300_000_000};
  const approved=readBoundedJson(path.join(root,'local-asset-bubble-r10-pit-compatible-universe.json'),budget);
  const official=readBoundedJson(path.join(root,'local-breadth-r7-pit-universe.json'),budget);
  const sqliteUniverse=latestSqliteMarketUniverseDate(root);
  const reportPath=path.join(root,'local-breadth-r7-prospective-last-run.json');
  let prospective=null;
  if(fs.existsSync(reportPath)){
   try{prospective=readBoundedJson(reportPath,budget).parsed}catch{}
  }
  const prospectiveStatus=String(prospective?.status??'');
  const prospectiveAt=String(prospective?.at??'');
  const pitRefreshEvidence={sqliteUniverseDate:sqliteUniverse.date,
   sqliteStatus:sqliteUniverse.status,
   officialPitCurrentDate:validDate(official.parsed?.currentDate)?official.parsed.currentDate:null,
   latestProspectiveStatus:/^[A-Z0-9_:-]{1,80}$/.test(prospectiveStatus)?prospectiveStatus:null,
   latestProspectiveAt:/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(prospectiveAt)&&
     !Number.isNaN(Date.parse(prospectiveAt))?prospectiveAt:null,
   latestRunPitRefreshed:typeof prospective?.pitRefreshed==='boolean'?prospective.pitRefreshed:null};
  if(sqliteUniverse.status!=='DATE_VERIFIED_READONLY')
   return stop('STOP_SQLITE_UNIVERSE_DATE_UNVERIFIED',{pitRefreshEvidence});
  if(official.parsed?.currentDate!==sqliteUniverse.date)
   return stop('STOP_PIT_NOT_CURRENT_WITH_SQLITE',{pitRefreshEvidence});
  const alpaca=path.join(root,'asset-r10-alpaca');
  const baseFiles=listJson(alpaca,/^group-\d+\.json$/,64);
  if(!baseFiles.length)return stop('STOP_APPROVED_PRICE_GROUPS_MISSING');
  const incremental=listJson(path.join(alpaca,'incremental'),
    /^\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}-group-\d+\.json$/,5000,{optional:true});
  const readGroups=files=>files.map(file=>readBoundedJson(file,budget));
  const baseGroups=readGroups(baseFiles),incrementalGroups=readGroups(incremental);
  const result=inspectR10BreadthIncremental({
   approvedPit:approved.parsed,officialPit:official.parsed,
   baseGroups:baseGroups.map(x=>x.parsed),incrementalGroups:incrementalGroups.map(x=>x.parsed),
   asOfDate,identityQuarantineMode:R10_RESEARCH_IDENTITY_QUARANTINE,
  });
  const groupDigest=groups=>digest(JSON.stringify(groups.map(x=>x.sha256)));
  return stop(result.status,{
   evidence:{approvedPitSha256:approved.sha256,officialPitSha256:official.sha256,
    baseGroupCount:baseGroups.length,incrementalGroupCount:incrementalGroups.length,
    baseGroupsSha256:groupDigest(baseGroups),incrementalGroupsSha256:groupDigest(incrementalGroups)},
   pitRefreshEvidence,
   overlapChecked:result.overlapChecked??null,
   quarantinedOverlapDays:result.quarantinedOverlapDays??0,
   identityAuditStatus:result.identityAuditStatus??null,
   identityAuditCounts:result.identityAuditCounts??null,
   officialPitDigest:result.officialPitDigest??null,
   unresolvedSymbols:result.unresolvedSymbols??[],
   candidateRows:result.candidateRows??[],
   nextGate:result.status==='CANDIDATE_WITH_ONE_UNRESOLVED_SECURITY_RESEARCH_ONLY'?
     'INDEPENDENT_APPROVED_B_QUALITY_AND_SCORE_REPLAY':'REVIEW_STOP_STATUS_AND_SOURCE',
  });
 }catch{
  // File path, secret config or raw JSON are never returned to stdout.
  return stop('STOP_PC_STORED_INPUTS_UNAVAILABLE_OR_BUDGET');
 }
}

// Exported pure argument boundary allows regression without launching a child process.
export function reportR10PcPreflightArgs(argv){
 if(!Array.isArray(argv))return stop('STOP_UNRECOGNIZED_ARGS');
 const args={};let valid=true;
 for(let i=0;i<argv.length;i+=2){
  if(i+1>=argv.length||!['--base','--as-of'].includes(argv[i])||Object.hasOwn(args,argv[i])){
   valid=false;break;
  }
  args[argv[i]]=argv[i+1];
 }
 return valid?preflightStoredR10PitQuarantine({base:args['--base'],asOfDate:args['--as-of']}):
   stop('STOP_UNRECOGNIZED_ARGS');
}

// CMD invocation: E:\\ZGmini\\runtime\\node.exe <this-script> --base <data-root> --as-of YYYY-MM-DD
// Script emits one sanitized JSON line; no result file or PC input is written.
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=reportR10PcPreflightArgs(process.argv.slice(2));
 process.stdout.write(JSON.stringify(report)+'\n');
 if(!report.status.startsWith('CANDIDATE_'))process.exitCode=2;
}
