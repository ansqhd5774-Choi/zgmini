/** R22: read-only inventory for 251 stored MarketParquet daily files (not a publisher). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {latestCompletedSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';
import {previousMarketSession} from '../../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs';
import {US_FULL_MARKET_YEAR_SESSIONS} from './us-breadth-confirmed-history-r21.mjs';

const PRICE_MODE='SPLIT_ADJUSTED_DIVIDEND_UNADJUSTED';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const safeFileStat=file=>{
  try{return fs.statSync(file);}
  catch(error){if(error?.code==='ENOENT')return null;throw error;}
};
const knownRoots=(dataRoot,pcHome)=>[...new Set([
  path.join(dataRoot,'theme-market-history-r131','marketparquet-r165'),
  path.join(dataRoot,'theme-market-history-r131','marketparquet-r167'),
  path.join(dataRoot,'theme-market-history-r131','raw'),
  path.join(dataRoot,'marketparquet'),
  path.join(dataRoot,'pc-writer'),
  pcHome,
  path.join(pcHome,'marketparquet'),
  path.join(pcHome,'raw','marketparquet'),
])];

export function fullMarketYearSessions({now=new Date(),sessionCount=US_FULL_MARKET_YEAR_SESSIONS}={}){
  if(!Number.isSafeInteger(sessionCount)||sessionCount<1||sessionCount>US_FULL_MARKET_YEAR_SESSIONS)
    throw Error('HISTORY_LENGTH_INVALID');
  const latest=latestCompletedSession(now);
  let day=latest;
  const dates=[day];
  for(let i=0;i<sessionCount;i++){
    day=previousMarketSession(day);
    if(!day)throw Error('TRADING_CALENDAR_OUT_OF_RANGE');
    dates.push(day);
  }
  return dates.reverse();
}

function exactCandidates(root,date){
  const year=date.slice(0,4);
  return [
    path.join(root,`stock_daily_${date}.parquet`),
    path.join(root,'stock_daily',`${date}.parquet`),
    path.join(root,'stock_daily',`stock_daily_${date}.parquet`),
    path.join(root,'stock_daily',year,`${date}.parquet`),
    path.join(root,'by_date','stock_daily',year,`${date}.parquet`),
  ];
}

function auditCandidates(file){
  const candidates=[file.replace(/\.parquet$/i,'.audit.json')];
  const src=`${path.sep}marketparquet-r165${path.sep}`;
  if(file.includes(src))candidates.push(file.replace(src,`${path.sep}marketparquet-r167${path.sep}`)
    .replace(/\.parquet$/i,'.audit.json'));
  return [...new Set(candidates)];
}

function withinApprovedRoot(root,file){
  const rootReal=fs.realpathSync(root),fileReal=fs.realpathSync(file);
  if(!fileReal.startsWith(rootReal+path.sep))throw Error('SOURCE_OUTSIDE_APPROVED_ROOT');
  return fileReal;
}

function inspectOneFile(file,date,approvedRoots){
  const stat=fs.statSync(file);
  if(!stat.isFile()||stat.size<12||stat.size>30_000_000)
    return {status:'SOURCE_SIZE_INVALID',file,bytes:stat.size};
  const bytes=fs.readFileSync(file);
  if(bytes.toString('ascii',0,4)!=='PAR1'||bytes.toString('ascii',bytes.length-4)!=='PAR1')
    return {status:'SOURCE_MAGIC_INVALID',file,bytes:bytes.length};
  const sha256=digest(bytes);
  const auditFile=auditCandidates(file).find(candidate=>safeFileStat(candidate)?.isFile());
  if(!auditFile)return {status:'LOCAL_AUDIT_MISSING',file,bytes:bytes.length,sha256};
  const auditReal=fs.realpathSync(auditFile);
  if(!approvedRoots.some(root=>auditReal.startsWith(fs.realpathSync(root)+path.sep)))
    throw Error('AUDIT_OUTSIDE_APPROVED_ROOT');
  let audit;
  try{audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));}
  catch{return {status:'LOCAL_AUDIT_UNREADABLE',file,auditFile,bytes:bytes.length,sha256};}
  const sameSource=typeof audit?.source==='string'&&/MARKETPARQUET.*STOCK|STOCK.*MARKETPARQUET/i.test(audit.source);
  if(audit?.date!==date||audit?.sha256!==sha256||audit?.complete!==true||!sameSource)
    return {status:'LOCAL_AUDIT_MISMATCH',file,auditFile,bytes:bytes.length,sha256};
  return {status:'LOCAL_AUDIT_SHA_MATCH',file,auditFile,bytes:bytes.length,sha256};
}

/**
 * Only scans documented approved operational roots and exact expected filenames.
 * Existing local .audit.json is NOT a signed/independently authenticated
 * MarketParquet source manifest, even when its SHA equals the file's digest.
 * No manifest with complete:true is generated from these local files.
 */
export function auditFullMarketYearInventory({dataRoot,pcHome,now=new Date(),
  sessionCount=US_FULL_MARKET_YEAR_SESSIONS}={}){
  if(typeof dataRoot!=='string'||!dataRoot||typeof pcHome!=='string'||!pcHome)
    throw Error('APPROVED_OPERATING_PATHS_REQUIRED');
  const dates=fullMarketYearSessions({now,sessionCount});
  const roots=knownRoots(dataRoot,pcHome).filter(root=>safeFileStat(root)?.isDirectory());
  const report={revision:'US_BREADTH_CONFIRMED_YEAR_INVENTORY_R22',mode:'READ_ONLY',
    searchScope:'EXACT_FILES_UNDER_APPROVED_EXISTING_OPERATING_ROOTS_ONLY',
    providerCalls:0,providerAuthenticityVerified:false,remoteWrites:0,localWrites:0,
    schedulerChanges:0,requestedDates:dates.length,firstDate:dates[0],lastDate:dates.at(-1),
    searchedRoots:roots,days:{},found:0,localAuditShaMatched:0,missingDates:[],
    localAuditMissingDates:[],sourceIssues:[]};
  for(const date of dates){
    const paths=[];
    try{
      for(const root of roots)for(const candidate of exactCandidates(root,date)){
        const stat=safeFileStat(candidate);
        if(!stat)continue;
        if(!stat.isFile())throw Error('SOURCE_NOT_REGULAR_FILE');
        paths.push(withinApprovedRoot(root,candidate));
      }
      const files=[...new Set(paths)];
      if(files.length===0){report.missingDates.push(date);report.days[date]={status:'STORED_STOCK_DAILY_NOT_FOUND'};continue;}
      // Multiple distinct stored copies cannot be silently chosen by search order.
      if(files.length!==1){report.sourceIssues.push(date);
        report.days[date]={status:'AMBIGUOUS_STORED_SOURCE',copies:files.length};continue;}
      const result=inspectOneFile(files[0],date,roots);
      report.days[date]=result;report.found++;
      if(result.status==='LOCAL_AUDIT_SHA_MATCH')report.localAuditShaMatched++;
      else if(result.status==='LOCAL_AUDIT_MISSING')report.localAuditMissingDates.push(date);
      else report.sourceIssues.push(date);
    }catch(error){report.sourceIssues.push(date);
      report.days[date]={status:'SOURCE_SCAN_FAILED',reason:String(error?.message??error).slice(0,90)};}
  }
  report.localComplete=report.found===dates.length&&report.localAuditShaMatched===dates.length
    &&report.sourceIssues.length===0;
  report.status=report.localComplete?'LOCAL_YEAR_INVENTORY_COMPLETE_PROVIDER_UNVERIFIED'
    :'LOCAL_YEAR_INVENTORY_INCOMPLETE';
  report.approvedR21ManifestEntries=null;
  report.reason='INDEPENDENT_MARKETPARQUET_SOURCE_PROVENANCE_REQUIRED_FOR_R21';
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==3||process.argv[2]!=='--inspect'){
    console.error('Usage: node scripts/pc-writer/us-breadth-confirmed-year-inventory-r22.mjs --inspect');
    process.exitCode=2;
  }else{
    const dataRoot=process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data';
    const pcHome=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer');
    console.log(JSON.stringify(auditFullMarketYearInventory({dataRoot,pcHome}),null,2));
  }
}
