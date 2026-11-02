/**
 * R43: operator-approved R2 staging-key publication only.
 * The R42/R41 provider check, exact operator-reviewed source SHA pair, and
 * fresh R20 local Parquet calculation must agree before the CORE D1 client
 * is opened. Current/daily, R1 and 249-day R2 history are never written.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {latestCompletedSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';
import {US_FULL_MARKET_PRICE_MODE,US_FULL_MARKET_STAGING_KEY,
  validFullMarketStagingRecord} from '../../lib/market-breadth/us-marketparquet-confirmed-public-r2.mjs';
import {US_FULL_MARKET_PUBLIC_KEY,US_FULL_MARKET_PUBLIC_DAILY_PREFIX}
  from '../../lib/market-breadth/us-marketparquet-confirmed-reader-r2.mjs';
import {inspectFullMarketR2PublicationR42}
  from './us-breadth-confirmed-publication-preflight-r42.mjs';
import {prepareFullMarketStaging,publishFullMarketStaging}
  from './us-breadth-confirmed-staging-r20.mjs';

const SHA=/^[0-9a-f]{64}$/;
const DAY=/^\d{4}-\d{2}-\d{2}$/;
const GET='SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?';
const digest=s=>createHash('sha256').update(s,'utf8').digest('hex');
const result=(status,extra={})=>({revision:'US_BREADTH_R43_APPROVED_R2_STAGING',
  mode:'EXPLICIT_APPROVED_STAGING_ONLY',status,publicationAllowed:false,
  finalWriteEnabled:false,coreTaskChanges:0,eSourceWrites:0,
  d1Writes:0,providerCalls:0,...extra});

/** Use the verified R36/R37 CORE role; never target config.history. */
export async function openR43CoreD1({pcHome}){
  const config=JSON.parse(fs.readFileSync(path.join(pcHome,'config.json'),'utf8'));
  if(typeof config?.core!=='string'||typeof config.history!=='string')
    throw Error('R43_CORE_D1_CONFIG_MISSING');
  const {client,credential}=await import('./d1.mjs');
  const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  return {remote:client(config,()=>credential(projectRoot)),database:config.core};
}

/** `inspect`, `prepare`, `publish`, `openD1` are injectable only for tests. */
export async function publishApprovedR2StageR43({
  observationDate,approvedSourceSha256,allowD1StageWrite=false,operatorConfirmation,
  dataRoot=process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',
  pcHome=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),
  now=Date.now(),inspect=inspectFullMarketR2PublicationR42,
  prepare=prepareFullMarketStaging,publish=publishFullMarketStaging,
  openD1=openR43CoreD1,freshNow=Date.now,
}={}){
  // No provider calls, D1 access or file changes before *all* write approval
  // inputs have been validated. R42's digest is NOT an approved D1-row SHA.
  if(!allowD1StageWrite||operatorConfirmation!=='Y')
    return result('R43_OPERATOR_Y_AND_STAGE_WRITE_FLAG_REQUIRED');
  if(!DAY.test(observationDate??'')||!approvedSourceSha256||
    !SHA.test(approvedSourceSha256.previous??'')||
    !SHA.test(approvedSourceSha256.current??'')||
    !Number.isSafeInteger(now)||now<=0||
    typeof dataRoot!=='string'||!dataRoot.trim()||
    typeof pcHome!=='string'||!pcHome.trim())
    return result('R43_EXACT_SOURCE_SHA_AND_ROOTS_REQUIRED');
  if(observationDate!==latestCompletedSession(new Date(now)))
    return result('R43_APPROVED_DATE_NOT_LATEST_COMPLETED');
  let checked;
  try{checked=await inspect({dataRoot,pcHome,now:new Date(now)});}
  catch{return result('R43_R42_VERIFICATION_UNAVAILABLE');}
  const scope={providerCalls:checked?.providerCalls??0,
    observationDate,previousDate:checked?.previousDate??null};
  if(checked?.status!=='R42_LOCAL_PREFLIGHT_READY_OPERATOR_APPROVAL_REQUIRED'||
    checked.providerAuthenticityVerified!==true||
    checked.observationDate!==observationDate||
    checked.independentlyVerifiedSourceSha256?.previous!==approvedSourceSha256.previous||
    checked.independentlyVerifiedSourceSha256?.current!==approvedSourceSha256.current)
    return result('R43_R42_SOURCE_APPROVAL_MISMATCH',scope);

  let root,prepared;
  try{
    root=fs.realpathSync(dataRoot);
    const entry=(date,sha256)=>({date,provider:'MarketParquet',feed:'stock_daily',
      priceMode:US_FULL_MARKET_PRICE_MODE,complete:true,
      path:path.join(root,'us-breadth-confirmed-r2','marketparquet-stock-daily',
        `stock_daily_${date}.parquet`),sha256});
    const manifest={previous:entry(checked.previousDate,approvedSourceSha256.previous),
      current:entry(observationDate,approvedSourceSha256.current)};
    prepared=await prepare({approvedSourceRoot:root,manifest,now:new Date(now)});
  }catch{return result('R43_R20_STAGING_PREPARATION_UNAVAILABLE',scope);}
  if(prepared?.status!=='PREPARED_STAGING_ONLY'||prepared.prepared!==true||
    !validFullMarketStagingRecord(prepared.body)||
    prepared.body.observationDate!==observationDate||
    prepared.body.sourceEvidence.previous.sha256!==approvedSourceSha256.previous||
    prepared.body.sourceEvidence.current.sha256!==approvedSourceSha256.current||
    digest(JSON.stringify(prepared.body))!==checked.localStagingCandidateSha256)
    return result('R43_R20_R42_CANDIDATE_MISMATCH',scope);
  if(latestCompletedSession(new Date(freshNow()))!==observationDate)
    return result('R43_SESSION_ADVANCED_BEFORE_D1_WRITE',scope);

  let remote,database;
  try{({remote,database}=await openD1({pcHome}));}
  catch{return result('R43_CORE_D1_UNAVAILABLE',scope);}
  if(!remote||typeof remote.query!=='function'||typeof remote.request!=='function'||
    typeof database!=='string'||!database.trim())
    return result('R43_CORE_D1_INVALID',scope);
  let published;
  try{published=await publish(remote,database,prepared,
    {now,stageWriteEnabled:true});}
  catch{return result('R43_D1_OUTCOME_UNKNOWN_READBACK_REQUIRED',
    {...scope,d1Writes:'UNKNOWN'});}
  if(!['VERIFIED_STAGING_ONLY','ALREADY_VERIFIED'].includes(published?.status))
    return result(published?.status??'R43_STAGE_NOT_PUBLISHED',scope);
  let row;
  try{row=(await remote.query(database,GET,[US_FULL_MARKET_STAGING_KEY])).results?.[0]??null;}
  catch{return result('R43_STAGE_READBACK_UNAVAILABLE',
    {...scope,d1Writes:published.status==='VERIFIED_STAGING_ONLY'?1:0});}
  const bodyText=JSON.stringify(prepared.body);
  if(row?.body!==bodyText||!Number.isSafeInteger(Number(row.stored_at))||
    Number(row.stored_at)<=0)
    return result('R43_STAGE_READBACK_MISMATCH',
      {...scope,d1Writes:published.status==='VERIFIED_STAGING_ONLY'?1:0});
  return result('R43_VERIFIED_STAGING_ONLY',{
    ...scope,stageReadbackVerified:true,
    d1Writes:published.status==='VERIFIED_STAGING_ONLY'?1:0,
    risingPct:checked.risingPct,fallingPct:checked.fallingPct,
    unchangedPct:checked.unchangedPct,
    sourcePairCoveragePct:checked.sourcePairCoveragePct,
    independentSourceSha256:approvedSourceSha256,
    d1StagingBodySha256:digest(row.body),
    stagingKey:US_FULL_MARKET_STAGING_KEY,
    expectedCurrentKey:US_FULL_MARKET_PUBLIC_KEY,
    expectedDailyKey:US_FULL_MARKET_PUBLIC_DAILY_PREFIX+observationDate,
    finalPublicationRequiresSeparateStagingShaApproval:true,
  });
}

export function r43CliOptions(argv){
  if(!Array.isArray(argv)||argv.length!==8||argv[0]!=='--stage-approved'||
    argv[1]!=='--allow-d1-stage-write'||argv[2]!=='--observation-date'||
    !DAY.test(argv[3]??'')||argv[4]!=='--previous-sha256'||
    !SHA.test(argv[5]??'')||argv[6]!=='--current-sha256'||
    !SHA.test(argv[7]??''))return null;
  return {observationDate:argv[3],approvedSourceSha256:{previous:argv[5],current:argv[7]},
    allowD1StageWrite:true};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=r43CliOptions(process.argv.slice(2));
  const output=args?await publishApprovedR2StageR43({...args,
    operatorConfirmation:process.env.US_BREADTH_R43_OPERATOR_CONFIRMATION}):
    result('R43_EXPLICIT_APPROVED_STAGE_ARGUMENTS_REQUIRED');
  process.stdout.write(JSON.stringify(output)+'\n');
  if(output.status!=='R43_VERIFIED_STAGING_ONLY')process.exitCode=2;
}
