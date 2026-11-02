/**
 * R40: read-only local two-day full-market R2 preview from the existing R31
 * Parquet + audit pairs. Local audit SHA is NOT independent provider provenance.
 * This module never opens D1, calls a provider, publishes, or changes Core.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {latestCompletedSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';
import {previousMarketSession} from '../../lib/market-score/breadth-b1-r6-marketparquet-provider.mjs';
import {US_FULL_MARKET_PRICE_MODE} from '../../lib/market-breadth/us-marketparquet-confirmed-public-r2.mjs';
import {prepareFullMarketStaging,decodeStoredParquet} from './us-breadth-confirmed-staging-r20.mjs';

const NAMESPACE='us-breadth-confirmed-r2';
const RAW_DIR='marketparquet-stock-daily';
const SOURCE='MARKETPARQUET_STOCK_DAILY_OFFICIAL_PRESIGNED';
const MAX_AUDIT_BYTES=4096;
const MAX_PARQUET_BYTES=30_000_000;
const SHA256=/^[a-f0-9]{64}$/;
const hash=text=>createHash('sha256').update(text).digest('hex');
const isWithin=(root,file)=>file.startsWith(root+path.sep);
const R31_AUDIT_NAME=/^stock_daily_(\d{4}-\d{2}-\d{2})\.audit\.json$/;

const baseResult=status=>({revision:'US_BREADTH_R40_LOCAL_PAIR_PREVIEW',
  mode:'READ_ONLY_LOCAL_TWO_DAY_PREVIEW',status,publicationAllowed:false,
  providerAuthenticityVerified:false,providerCalls:0,d1Reads:0,d1Writes:0,
  localWrites:0,coreTaskChanges:0,lockPidActions:0});

function assertDirectory(directory,root){
  const stat=fs.lstatSync(directory);
  if(!stat.isDirectory()||stat.isSymbolicLink()||
    !isWithin(root,fs.realpathSync(directory)))throw Error('DIRECTORY_NOT_APPROVED');
}

function localR31Entry(root,folder,date){
  const basename=`stock_daily_${date}`;
  const file=path.join(folder,basename+'.parquet');
  const auditPath=path.join(folder,basename+'.audit.json');
  for(const candidate of [file,auditPath]){
    const stat=fs.lstatSync(candidate);
    if(!stat.isFile()||stat.isSymbolicLink()||
      !isWithin(root,fs.realpathSync(candidate)))throw Error('SOURCE_NOT_APPROVED');
  }
  const auditStat=fs.statSync(auditPath),sourceStat=fs.statSync(file);
  if(auditStat.size<=0||auditStat.size>MAX_AUDIT_BYTES||
    sourceStat.size<12||sourceStat.size>MAX_PARQUET_BYTES)
    throw Error('SOURCE_SIZE_INVALID');
  const audit=JSON.parse(fs.readFileSync(auditPath,'utf8'));
  const relativePath=`${NAMESPACE}/${RAW_DIR}/${basename}.parquet`;
  if(audit?.revision!=='US_BREADTH_CONFIRMED_DOWNLOAD_R31'||
    audit.source!==SOURCE||audit.provider!=='MarketParquet'||
    audit.feed!=='stock_daily'||audit.priceMode!==US_FULL_MARKET_PRICE_MODE||
    audit.date!==date||audit.relativePath!==relativePath||
    audit.complete!==true||!SHA256.test(audit.sha256)||
    audit.bytes!==sourceStat.size||audit.providerShaProvided!==false||
    audit.providerAuthenticityVerified!==false)
    throw Error('R31_AUDIT_INVALID');
  return {date,provider:'MarketParquet',feed:'stock_daily',
    priceMode:US_FULL_MARKET_PRICE_MODE,complete:true,path:file,sha256:audit.sha256};
}

/**
 * No network or database argument exists by design. `readParquet` is injectable
 * only for deterministic synthetic tests. Never expose internal count records.
 */
export async function previewLocalFullMarketPairR40({dataRoot,now=new Date(),
  readParquet=decodeStoredParquet}={}){
  const dateNow=now instanceof Date?now:new Date(now);
  if(!Number.isFinite(dateNow.valueOf())||typeof dataRoot!=='string'||
    !dataRoot.trim())return baseResult('R40_SOURCE_ROOT_OR_DATE_REQUIRED');
  let root,folder,observationDate,previousDate,latestSession,manifest;
  try{
    root=fs.realpathSync(dataRoot);
    if(root===path.parse(root).root)throw Error('ROOT_TOO_BROAD');
    folder=path.join(root,NAMESPACE,RAW_DIR);
    assertDirectory(path.join(root,NAMESPACE),root);
    assertDirectory(folder,root);
    // Preview the newest LOCAL R31 date, not necessarily today's completed
    // session. Old staged data remains useful for review after new market days.
    // This never makes an old pair eligible for publication.
    const files=fs.readdirSync(folder,{withFileTypes:true});
    if(files.length>1000)throw Error('SOURCE_DIRECTORY_UNBOUNDED');
    const dates=files.filter(entry=>entry.isFile()&&!entry.isSymbolicLink())
      .map(entry=>entry.name.match(R31_AUDIT_NAME)?.[1]).filter(Boolean).sort();
    if(!dates.length)throw Error('SOURCE_AUDIT_MISSING');
    observationDate=dates[dates.length-1];
    latestSession=latestCompletedSession(dateNow);
    if(observationDate>latestSession)throw Error('SOURCE_DATE_IN_FUTURE');
    previousDate=previousMarketSession(observationDate);
    if(!previousDate||previousDate>=observationDate)throw Error('SESSION_INVALID');
    manifest={previous:localR31Entry(root,folder,previousDate),
      current:localR31Entry(root,folder,observationDate)};
  }catch{return baseResult('R40_LOCAL_PAIR_NOT_VERIFIED');}
  let prepared;
  try{prepared=await prepareFullMarketStaging({approvedSourceRoot:root,
    manifest,now:dateNow,readParquet});}
  catch{return baseResult('R40_LOCAL_PAIR_CALCULATION_UNAVAILABLE');}
  if(prepared?.prepared!==true||prepared.status!=='PREPARED_STAGING_ONLY')
    return baseResult('R40_LOCAL_PAIR_CALCULATION_UNAVAILABLE');
  const body=prepared.body,total=body.expectedCount;
  if(!Number.isSafeInteger(total)||total<=0)return baseResult('R40_PREVIEW_INVALID');
  const risingPct=body.counts.rising/total*100;
  const fallingPct=body.counts.falling/total*100;
  const unchangedPct=body.counts.unchanged/total*100;
  const sourcePairCoveragePct=body.sourcePairCoverage*100;
  if(![risingPct,fallingPct,unchangedPct,sourcePairCoveragePct].every(Number.isFinite)||
    Math.abs(risingPct+fallingPct+unchangedPct-100)>1e-8)
    return baseResult('R40_PREVIEW_INVALID');
  // These are LOCAL-only digests, not proof of MarketParquet authenticity,
  // approved R2 staging, a D1 write, or an operator authorization to publish.
  return {...baseResult('LOCAL_ONLY_NOT_PROVIDER_AUTHENTICATED'),
    observationDate,previousDate,latestCompletedSession:latestSession,
    sourcePairIsLatestCompleted:observationDate===latestSession,
    risingPct,fallingPct,unchangedPct,
    sourcePairCoveragePct,
    sourcePairAuditSha256:hash(`${previousDate}:${manifest.previous.sha256}|${observationDate}:${manifest.current.sha256}`),
    candidateBodySha256:hash(JSON.stringify(body))};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const output=process.argv.length===3&&process.argv[2]==='--preview-local'
    ?await previewLocalFullMarketPairR40({dataRoot:process.env.ZGMINI_DATA_ROOT})
    :baseResult('R40_PREVIEW_LOCAL_ARGUMENT_REQUIRED');
  process.stdout.write(JSON.stringify(output)+'\n');
  if(output.status!=='LOCAL_ONLY_NOT_PROVIDER_AUTHENTICATED')process.exitCode=2;
}
