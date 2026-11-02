import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {isMarketSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';
import {assembleR10BStoredQualityCandidate,
 R10_RESEARCH_IDENTITY_QUARANTINE} from './asset-r10-b-quality-candidate-r1.mjs';

// Manual, bounded PC snapshot reader for the R42 pure candidate. This is NOT
// a Core hook or a publication writer. Use only in an approved PC checkout.
export const R10_B_STORED_RUNNER_METHOD='R10_B_PC_STORED_READONLY_RUNNER_R1';
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const QUARTER=/^\d{4}-Q[1-4]$/;
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const validDate=x=>typeof x==='string'&&DATE.test(x)&&
 !Number.isNaN(Date.parse(x+'T00:00:00Z'))&&
 new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<1e-8;
const stop=(status,more={})=>({method:R10_B_STORED_RUNNER_METHOD,status,
 readOnly:true,canPromote:false,productionEligible:false,providerCalls:0,
 approvedInputWrites:0,sqliteWrites:0,d1Reads:0,d1Writes:0,
 releaseWrites:0,coreTaskChanges:0,lockPidActions:0,...more});
const session=date=>date!=='2025-01-09'&&isMarketSession(date);

function lastMarketSession(month){
 const [year,n]=month.split('-').map(Number);
 let t=Date.UTC(year,n,0);
 for(let k=0;k<10;k++,t-=86400000){
  const d=new Date(t).toISOString().slice(0,10);
  if(session(d))return d;
 }
 return null;
}
function shiftQuarter(q,offset){
 const index=Number(q.slice(0,4))*4+Number(q.at(-1))-1+offset;
 return Math.floor(index/4)+'-Q'+(index%4+1);
}

// Source ledger (not a new authoritative score) is the lock to replay against.
// Latest quarter must additionally agree with the published Release B score.
export function storedR10BLockedFiveQuarters({quality,breadth,release}={}){
 const q=release?.scoreObservationQuarter;
 if(!QUARTER.test(q??'')||release?.status!=='READY'||
    release?.methodologyVersion!=='ASSET_BUBBLE_R10_CANDIDATE'||
    !Array.isArray(quality?.rows)||!Array.isArray(breadth?.rows)||
    breadth?.formulaApproved!==true||!Array.isArray(release.indicators)||
    release.indicators.length!==6)return null;
 const approved=release.indicators.find(f=>f.id==='breadthDivergence');
 if(approved?.status!=='READY'||!Number.isFinite(approved.score))return null;
 const qualityMap=new Map(),scores=new Map();let lastQuality='',lastScore='';
 for(const row of quality.rows){
  const date=row?.observationDate;
  if(!validDate(date)||date<=lastQuality||!session(date)||
     !Number.isFinite(row?.coverage)||row.coverage<0||row.coverage>1)return null;
  qualityMap.set(date,row);lastQuality=date;
 }
 for(const row of breadth.rows){
  const date=row?.observationDate;
  if(!validDate(date)||date<=lastScore||!session(date))return null;
  if(row.researchSafetyScore!==null&&
     (!Number.isFinite(row.researchSafetyScore)||row.researchSafetyScore<0||
      row.researchSafetyScore>100||!Number.isInteger(row.rankObservations)))return null;
  scores.set(date,row);lastScore=date;
 }
 const quarters=[];
 for(let offset=-4;offset<=0;offset++){
  const quarter=shiftQuarter(q,offset),n=Number(quarter.at(-1)),values=[];
  for(let m=(n-1)*3+1;m<=n*3;m++){
   const month=quarter.slice(0,4)+'-'+String(m).padStart(2,'0');
   const date=lastMarketSession(month);
   const qr=qualityMap.get(date),br=scores.get(date);
   if(qr?.coverage>=.98&&Number.isFinite(qr.participation)&&
      Number.isFinite(br?.researchSafetyScore)&&br.rankObservations>=252)
    values.push(br.researchSafetyScore);
  }
  quarters.push({quarter,breadthDivergence:values.length===3?
   values.reduce((a,b)=>a+b,0)/3:null});
 }
 // R7 proved these are structurally missing under the 252-pair/3-month
 // contract. Never accept a rewritten stored ledger as a new early baseline.
 if(quarters.some(row=>['2025-Q2','2025-Q3'].includes(row.quarter)&&
    row.breadthDivergence!==null))return null;
 if(!near(quarters.at(-1).breadthDivergence,approved.score))return null;
 return quarters;
}

function safeFile(file,budget,witness){
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<1||
    stat.size>128_000_000||stat.size>budget.remaining)
  throw Error('R10_B_READ_BUDGET');
 budget.remaining-=stat.size;witness.push({file,size:stat.size,mtimeMs:stat.mtimeMs});
 return JSON.parse(fs.readFileSync(file,'utf8'));
}
function listGroups(dir,re,limit,{optional=false}={}){
 if(optional&&!fs.existsSync(dir))return [];
 const stat=fs.lstatSync(dir);
 if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('R10_B_GROUP_DIR_UNSAFE');
 const entries=fs.readdirSync(dir).filter(n=>re.test(n)).sort();
 if(entries.length>limit)return null;
 return entries.map(n=>path.join(dir,n));
}
function readSp500(root,witness){
 const file=path.join(root,'storage','core.sqlite');
 const dir=path.dirname(file);
 if(fs.lstatSync(file).isSymbolicLink()||fs.lstatSync(dir).isSymbolicLink())
  throw Error('R10_B_SQLITE_UNSAFE');
 let db;
 try{
  const stat=fs.statSync(file);
  witness.push({file,size:stat.size,mtimeMs:stat.mtimeMs});
  db=new DatabaseSync(file,{readOnly:true});db.exec('PRAGMA query_only=ON');
  const row=db.prepare("SELECT batch_key,body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE 'shadowSp500Benchmark:%' ORDER BY stored_at DESC LIMIT 1").get();
  if(!row||typeof row.body!=='string'||row.body.length>5_000_000||
     !Number.isSafeInteger(Number(row.stored_at)))return null;
  const universe=db.prepare('SELECT trade_date FROM market_score_breadth_b1_r3_universe_v1 ORDER BY trade_date DESC LIMIT 1').get();
  const body=row.body.startsWith('gzip:')?
   JSON.parse(gunzipSync(Buffer.from(row.body.slice(5),'base64'),
    {maxOutputLength:5_000_000}).toString('utf8')):JSON.parse(row.body);
  return {rows:body?.series?.SP500,sourceVersion:row.batch_key,
   sourceStoredAt:Number(row.stored_at),latestUniverseDate:universe?.trade_date??null};
 }finally{db?.close()}
}
function filesUnchanged(witness){
 return witness.every(row=>{
  try{const s=fs.lstatSync(row.file);
   return s.isFile()&&!s.isSymbolicLink()&&
    s.size===row.size&&s.mtimeMs===row.mtimeMs;
  }catch{return false;}
 });
}

/** One-shot, read-only real-PC snapshot. Only aggregated statuses leave PC. */
export function runR10BStoredPcReadonly({base,asOfDate}={}){
 if(typeof base!=='string'||!path.isAbsolute(base)||!validDate(asOfDate))
  return stop('STOP_EXPLICIT_PC_DATA_ROOT_OR_DATE_MISSING');
 const root=path.resolve(base),witness=[],budget={remaining:350_000_000};
 try{
  const s=fs.lstatSync(root);
  if(!s.isDirectory()||s.isSymbolicLink())return stop('STOP_PC_DATA_ROOT_UNSAFE');
  const local=n=>safeFile(path.join(root,`local-asset-bubble-r10-${n}.json`),budget,witness);
  const approvedPit=local('pit-compatible-universe'),officialPit=
   safeFile(path.join(root,'local-breadth-r7-pit-universe.json'),budget,witness);
  const quality=local('alpaca-pit-validation'),breadth=local('breadth-research'),
   release=local('release-payload');
  const previous=storedR10BLockedFiveQuarters({quality,breadth,release});
  if(!previous)return stop('STOP_APPROVED_STORED_B_FIVE_QUARTER_BASELINE_INVALID');
  const alpaca=path.join(root,'asset-r10-alpaca');
  const basePaths=listGroups(alpaca,/^group-\d+\.json$/,64);
  const incrementalPaths=listGroups(path.join(alpaca,'incremental'),
   /^\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}-group-\d+\.json$/,5000,{optional:true});
  if(!basePaths?.length||!incrementalPaths)
   return stop('STOP_PRICE_GROUPS_MISSING_OR_TOO_MANY');
  const loadFiles=paths=>paths.map(file=>safeFile(file,budget,witness));
  const baseGroups=loadFiles(basePaths),incrementalGroups=loadFiles(incrementalPaths);
  const price=readSp500(root,witness);
  if(!Array.isArray(price?.rows))return stop('STOP_STORED_SP500_MISSING');
  if(!validDate(price.latestUniverseDate)||
     price.latestUniverseDate!==officialPit.currentDate)
   return stop('STOP_SQLITE_R7_PIT_DATE_MISMATCH');
  const prospective=safeFile(path.join(root,
   'local-breadth-r7-prospective-last-run.json'),budget,witness);
  const seenAt=Date.parse(prospective?.at??'');
  const asOfEnd=Date.parse(asOfDate+'T23:59:59Z');
  if(prospective?.status!=='PASS'||
     typeof prospective?.pitRefreshed!=='boolean'||
     !Number.isFinite(seenAt)||seenAt>asOfEnd||
     asOfEnd-seenAt>48*3600000)
   return stop('STOP_R7_PROSPECTIVE_RECENT_CYCLE_UNVERIFIED');
  const calculated=assembleR10BStoredQualityCandidate({
   approvedPit,officialPit,baseGroups,incrementalGroups,
   approvedDailyQuality:quality.rows,sp500Rows:price.rows,
   approvedBHistory:previous,asOfDate,
   identityQuarantineMode:R10_RESEARCH_IDENTITY_QUARANTINE,
  });
  if(!filesUnchanged(witness))return stop('STOP_PC_INPUT_CHANGED_DURING_READ');
  if(calculated.status!=='RESEARCH_B_STORED_QUALITY_REPLAYED_NOT_AUTOPROMOTABLE')
   return stop('STOP_PC_B_QUALITY_OR_BASELINE_GATE',{
    firstFail:calculated.status,detail:calculated.firstFail??null,
    firstMismatchQuarter:calculated.firstMismatchQuarter??null});
  return stop('RESEARCH_PC_STORED_B_REPLAY_NOT_AUTOPROMOTABLE',{
   lastApprovedQuarter:previous.at(-1).quarter,
   approvedBHistorySha256:sha(previous),
   newDailyQualitySha256:calculated.qualityNewSha256,
   newDailyRows:calculated.newDailyRows.length,
   firstScoredObservationDate:calculated.firstScoredObservationDate,
   newQuarterStatuses:calculated.quarters.filter(q=>q.quarter>previous.at(-1).quarter)
    .map(q=>({quarter:q.quarter,status:q.status,validMonths:q.validMonths})),
   preflightStatus:calculated.preflightStatus,
   unresolvedIdentityCount:calculated.unresolvedIdentitySymbols.length,
   nextGate:'INDEPENDENT_PRICE_RIGHTS_PIT_IDENTITY_AND_OPERATOR_APPROVAL',
  });
 }catch{return stop('STOP_PC_STORED_INPUTS_UNAVAILABLE_OR_BUDGET');}
}

export function reportR10BStoredPcArgs(argv){
 if(!Array.isArray(argv)||argv.length!==4||
    !['--base','--as-of'].includes(argv[0])||
    !['--base','--as-of'].includes(argv[2])||argv[0]===argv[2])
  return stop('STOP_UNRECOGNIZED_ARGS');
 const args={[argv[0]]:argv[1],[argv[2]]:argv[3]};
 return runR10BStoredPcReadonly({base:args['--base'],asOfDate:args['--as-of']});
}
// CMD invocation only, no output file or mutation:
// node asset-r10-b-stored-runner-r1.mjs --base "E:\\ZGmini\\data\\pc-writer" --as-of YYYY-MM-DD
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=reportR10BStoredPcArgs(process.argv.slice(2));
 process.stdout.write(JSON.stringify(report)+'\n');
 if(!report.status.startsWith('RESEARCH_'))process.exitCode=2;
}
