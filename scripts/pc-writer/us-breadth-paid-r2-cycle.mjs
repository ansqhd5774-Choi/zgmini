/**
 * Existing PC Writer invocation point for US full-market paid R2.
 * No new Task, launcher, provider request or D1 table.
 * The Core must explicitly call this module in its already-approved cycle.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {calculateStoredPaidUsBreadthR2}
  from './us-breadth-paid-r2-stored.mjs';
import {savePrivatePaidUsBreadthR2}
  from './us-breadth-paid-r2-private-save.mjs';
import {buildPaidUsR2Final,publishPaidUsR2Final}
  from './us-breadth-paid-r2-publisher.mjs';
import {US_PAID_R2_FEED_KEY}
  from '../../worker/us-breadth-paid-r2-contract.mjs';
import {latestCompletedSession}
  from '../../lib/market-score/breadth-b1-r3-calendar.mjs';

const sql="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
const stop=(status)=>({status,publicationComplete:false,d1Writes:0,providerCalls:0});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

/**
 * For publish=true, source and paid account are checked against the actual
 * installed checkout and local account connection, never a passed boolean.
 */
export function checkApprovedPcRuntime(base){
  let config,connection;
  try{
    config=JSON.parse(fs.readFileSync(path.join(base,'config.json'),'utf8'));
    connection=JSON.parse(fs.readFileSync(
      path.join(base,'marketparquet-paid','connection.json'),'utf8'));
  }catch{return {ok:false,status:'US_PAID_R2_PC_CONFIG_UNAVAILABLE'};}
  if(connection?.plan!=='full'||config?.enabled!==true
      ||config?.collectionTarget!=='pc')
    return {ok:false,status:'US_PAID_R2_PC_ENTITLEMENT_OR_MODE_STOP'};
  try{
    const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
    const source=execFileSync('git',['rev-parse','HEAD'],{
      cwd:root,encoding:'utf8',windowsHide:true,timeout:8000,
    }).trim();
    if(!/^[a-f0-9]{40}$/.test(source)||config.source!==source)
      return {ok:false,status:'US_PAID_R2_PC_SOURCE_PIN_STOP'};
    execFileSync('git',['diff','--quiet','HEAD','--',
      'scripts/pc-writer','worker','lib'],{
      cwd:root,windowsHide:true,timeout:8000,stdio:'pipe',
    });
    return {ok:true,config,root};
  }catch{return {ok:false,status:'US_PAID_R2_PC_CHECKOUT_UNVERIFIED'};}
}

/**
 * The approved public R2 one-year output is exactly 250 consecutive
 * comparison points backed by 251 saved private stock_daily receipts.
 * Short stored previews stay read-only; they must not reach private
 * write or D1 publication through the scheduled Core --publish lane.
 */
export function readyPaidUsR2FullYearPublication(result,maxPoints=250){
  return maxPoints===250
    &&result?.fullYearHistory===true
    &&result.comparedSessions===250
    &&Array.isArray(result.publicHistoryPreview)
    &&result.publicHistoryPreview.length===250
    &&Array.isArray(result.privateSourceReceipts)
    &&result.privateSourceReceipts.length===251;
}

export async function runPaidUsR2StoredCycle(base,{
  publish=false,maxPoints=250,now=Date.now(),store=null,
}={}){
  if(typeof publish!=='boolean'||!Number.isSafeInteger(now)||now<=0)
    return stop('US_PAID_R2_CYCLE_ARGUMENTS_INVALID');
  // Fast fail: an unapproved or unpinned Writer must not even scan private
  // history on each scheduled Core cycle, let alone stage or publish it.
  const installed=publish?checkApprovedPcRuntime(base):null;
  if(publish&&!installed.ok)return stop(installed.status);
  // Existing shared stored output is the only permitted calculation input.
  const result=await calculateStoredPaidUsBreadthR2(base,{maxPoints,store});
  if(result.prepared!==true)return {...result,publicationComplete:false};
  if(!publish)return {
    status:'US_PAID_R2_PRIVATE_PREVIEW',publicationComplete:false,
    observationDate:result.lastDate,comparedSessions:result.comparedSessions,
    fullYearHistory:result.fullYearHistory,providerCalls:0,d1Writes:0,
    operationalWrites:0,
  };

  if(!readyPaidUsR2FullYearPublication(result,maxPoints))
    return {...stop('US_PAID_R2_FULL_YEAR_HISTORY_REQUIRED'),
      comparedSessions:result.comparedSessions,
      fullYearHistory:result.fullYearHistory,operationalWrites:0};

  if(result.lastDate!==latestCompletedSession(new Date(now)))
    return stop('US_PAID_R2_LATEST_SESSION_NOT_STORED');
  const save=savePrivatePaidUsBreadthR2(base,result,{saveEnabled:true});
  if(save.readbackVerified!==true)
    return {...stop(save.status),operationalWrites:save.operationalWrites??null};

  // Recheck the exact immutable file before promotion; no raw prices to D1.
  const target=path.resolve(base,save.relativePath);
  const approvedRoot=path.resolve(base,'marketparquet-paid','derived',
    'us-breadth-r2');
  let bytes;
  try{
    if(path.dirname(target)!==approvedRoot
        ||!fs.lstatSync(target).isFile()
        ||fs.lstatSync(target).isSymbolicLink())
      return stop('US_PAID_R2_PRIVATE_PATH_STOP');
    bytes=fs.readFileSync(target);
    if(sha(bytes)!==save.sha256)
      return stop('US_PAID_R2_PRIVATE_FILE_READBACK_STOP');
  }catch{return stop('US_PAID_R2_PRIVATE_FILE_READBACK_STOP');}

  const record=buildPaidUsR2Final({
    calculated:result,fileSha256:save.sha256,now,
  });
  // Existing licensed D1 connector from the approved checkout.
  const {client,credential}=await import('./d1.mjs');
  const remote=client(installed.config,()=>credential(installed.root));
  let preimage;
  try{
    preimage=(await remote.query(installed.config.core,sql,
      [US_PAID_R2_FEED_KEY])).results?.[0]??null;
  }catch{return {...stop('US_PAID_R2_D1_PREIMAGE_UNKNOWN_NO_RETRY'),
    operationalWrites:save.operationalWrites};}

  const published=await publishPaidUsR2Final({
    remote,dbId:installed.config.core,record,preimage,now,
  });
  return {
    ...published,publicationComplete:published.status===
      'US_PAID_R2_D1_CAS_READBACK_VERIFIED'||published.status===
      'US_PAID_R2_UNCHANGED_VERIFIED',
    observationDate:record.observationDate,
    comparedSessions:result.comparedSessions,
    providerCalls:0,operationalWrites:save.operationalWrites,
  };
}
