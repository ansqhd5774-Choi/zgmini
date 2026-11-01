// Explicit one-time market-importance R43 publisher. NEVER part of PC Core.
// Reads only an approved local input; writes one derived issuer selection to
// its own D1 key after verifying the deployed reader and PC source identity.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {rankR43Issuers,selectR43ReviewedExceptions,r43ImportanceIndex,r43IssuerKey} from '../../lib/market-calendar-r43-issuer-rank.mjs';
import {makeR43MarketImportanceDisplay,r43MarketImportanceDisplayIndex,
 R43_MARKET_IMPORTANCE_PUBLIC_KEY} from '../../lib/market-calendar-r43-display-overlay.mjs';

const DEFAULT_INPUT='local-market-calendar-r43-input.json';
const APPROVED_ROSTER='local-market-calendar-r43-reviewed-issuers.json';
const READER_HEADER='ZGMINI-R43-MARKET-IMPORTANCE';
const DAY=/^20\d\d-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const TICKER=/^[A-Z0-9][A-Z0-9.\-]{0,11}$/;
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=code=>{throw Error(code)};
function file(p){try{return fs.statSync(p).isFile()}catch{return false}}
function checkedJson(p,maxBytes){
 if(!file(p))fail('R43_MANUAL_INPUT_MISSING_STOP');
 const size=fs.statSync(p).size;
 if(size<50||size>maxBytes)fail('R43_MANUAL_FILE_SIZE_STOP');
 try{return JSON.parse(fs.readFileSync(p,'utf8'))}
 catch{fail('R43_MANUAL_JSON_INVALID_STOP')}
}

function dynamicExpectedFromReviewedRoster(input,approvedUniverse){
 const supplied=Object.hasOwn(input,'expectedEligibleIssuers')||
   Object.hasOwn(input,'approvedUniverseSha256');
 if(!supplied)return null; // Preserve the explicitly pre-existing 2634 legacy path.
 if(!Number.isInteger(input.expectedEligibleIssuers)||
  input.expectedEligibleIssuers<2500||input.expectedEligibleIssuers>3500||
  typeof input.approvedUniverseSha256!=='string'||
  !/^[a-f0-9]{64}$/.test(input.approvedUniverseSha256)||
  !approvedUniverse||typeof approvedUniverse!=='object'||
  input.approvedUniverseSha256!==sha(JSON.stringify(approvedUniverse)))
  fail('R43_MANUAL_APPROVED_UNIVERSE_ATTESTATION_STOP');
 const u=approvedUniverse;
 if(u.version!==1||u.method!=='R57_REVIEWED_ISSUER_MEMBERSHIP_R1'||
  u.universeReviewed!==true||u.marketCapApiUsed!==false||
  u.permissionForDerivedScores!==true||
  u.rightsReviewReference!==input.rightsReviewReference||
  !DAY.test(u.reviewedAsOf)||u.reviewedAsOf>input.asOf||
  Date.parse(input.asOf+'T00:00:00Z')-Date.parse(u.reviewedAsOf+'T00:00:00Z')>90*86400000||
  u.expectedEligibleIssuers!==input.expectedEligibleIssuers||
  u.marketSessionsReviewed!==true||
  !Array.isArray(u.reviewedTradingSessions)||u.reviewedTradingSessions.length!==21||
  u.reviewedTradingSessions[0]!==input.asOf||
  !Array.isArray(u.members)||u.members.length<2500||u.members.length>25000||
  !Array.isArray(input.rows)||input.rows.length!==u.members.length)
  fail('R43_MANUAL_APPROVED_UNIVERSE_CONTRACT_STOP');
 const source=new Map(),issuers=new Set();
 for(const member of u.members){
  if(!member||typeof member.ticker!=='string'||!TICKER.test(member.ticker)||
   source.has(member.ticker)||typeof member.eligible!=='boolean')
   fail('R43_MANUAL_APPROVED_UNIVERSE_MEMBERS_STOP');
  let issuer;
  try{issuer=r43IssuerKey(member.ticker,member.issuerId??null)}
  catch{fail('R43_MANUAL_APPROVED_UNIVERSE_MEMBERS_STOP')}
  if(member.eligible){
   if(typeof member.issuerId!=='string'||!member.issuerId.trim())
    fail('R43_MANUAL_APPROVED_UNIVERSE_MEMBERS_STOP');
   issuers.add(issuer);
  }
  source.set(member.ticker,member);
 }
 if(issuers.size<Math.ceil(u.expectedEligibleIssuers*.98)||
  issuers.size>u.expectedEligibleIssuers*1.05)
  fail('R43_MANUAL_APPROVED_UNIVERSE_SCOPE_STOP');
 const seen=new Set();
 for(const row of input.rows){
  const member=source.get(row?.ticker);
  if(!member||seen.has(row.ticker)||row.eligible!==member.eligible||
   (row.issuerId??null)!==(member.issuerId??null))
   fail('R43_MANUAL_APPROVED_UNIVERSE_ROWS_STOP');
  for(const key of ['dividendYield','eps','epsGrowthPct']){
   const expected=u.fundamentalsVerified===true?member[key]??null:null;
   if((row[key]??null)!==expected)
    fail('R43_MANUAL_APPROVED_UNIVERSE_ROWS_STOP');
  }
  seen.add(row.ticker);
 }
 return u.expectedEligibleIssuers; // Independent reviewed roster, never input alone.
}

export function prepareR43ManualSnapshot(input,{now=Date.now(),approvedUniverse=null}={}){
 if(input?.version!==1||input.provenance!=='APPROVED_PC_STORED_DATA'||
  input.marketCapApiUsed!==false||input.permissionForDerivedScores!==true||
  typeof input.rightsReviewReference!=='string'||
  input.rightsReviewReference.trim().length<12||input.rightsReviewReference.length>512||
  !DAY.test(input.asOf)||!Array.isArray(input.rows)||
  input.rows.length<100||input.rows.length>12000)
  fail('R43_MANUAL_SOURCE_RIGHTS_UNVERIFIED_STOP');
 const expectedEligibleIssuers=dynamicExpectedFromReviewedRoster(input,approvedUniverse);
 let base,ranked;
 try{base=rankR43Issuers(input.rows,{asOf:input.asOf,
  ...(expectedEligibleIssuers===null?{}:{expectedEligibleIssuers})})}
 catch{fail('R43_MANUAL_RANKING_FAILED_STOP')}
 if(base.status!=='READY_SHADOW')fail('R43_MANUAL_UNIVERSE_OR_DATE_STOP');
 try{ranked=selectR43ReviewedExceptions(base)}
 catch{fail('R43_MANUAL_REVIEWED_EXCEPTIONS_INVALID_STOP')}
 if(!r43ImportanceIndex(ranked,{now}))fail('R43_MANUAL_UNIVERSE_OR_DATE_STOP');
 const display=makeR43MarketImportanceDisplay(ranked,{now});
 if(!r43MarketImportanceDisplayIndex(display,{now}))fail('R43_MANUAL_COMPACT_READBACK_INVALID_STOP');
 return display;
}

export async function verifyR43ReaderDeployed({url,fetchImpl=fetch}={}){
 const probe=url??'https://zgmini.kr/api/earnings-calendar-display?start=2026-11-01&end=2026-11-01';
 let response;
 try{response=await fetchImpl(probe,{method:'GET',redirect:'error',signal:AbortSignal.timeout(12000)})}
 catch{fail('R43_READER_PROBE_UNAVAILABLE_STOP')}
 if(!response.ok&&response.status!==204)fail('R43_READER_PROBE_HTTP_STOP');
 if(response.headers.get('x-zgmini-r43-reader')!==READER_HEADER)
  fail('R43_PUBLIC_READER_NOT_DEPLOYED_STOP');
 return true;
}

export async function publishR43MarketImportanceOnce({
 pcHome,repoRoot,inputPath,now=Date.now(),
 readerGate=verifyR43ReaderDeployed,remoteFactory,
 headResolver=root=>execFileSync('git',['rev-parse','HEAD'],{cwd:root,windowsHide:true,
  timeout:12000,encoding:'utf8'}).trim(),
}={}){
 if(typeof pcHome!=='string'||!path.isAbsolute(pcHome)||
  typeof repoRoot!=='string'||!path.isAbsolute(repoRoot)||
  !Number.isFinite(now)||now<=0)fail('R43_MANUAL_PATH_OR_TIME_STOP');
 const sourceFile=inputPath??path.join(pcHome,DEFAULT_INPUT);
 if(!path.isAbsolute(sourceFile))fail('R43_MANUAL_INPUT_PATH_STOP');
 const input=checkedJson(sourceFile,8_000_000);
 const dynamic=Object.hasOwn(input,'expectedEligibleIssuers')||
  Object.hasOwn(input,'approvedUniverseSha256');
 const rosterFile=path.join(pcHome,APPROVED_ROSTER);
 if(dynamic){
  try{if(!fs.lstatSync(rosterFile).isFile())fail('R43_MANUAL_APPROVED_UNIVERSE_FILE_STOP')}
  catch{fail('R43_MANUAL_APPROVED_UNIVERSE_FILE_STOP')}
 }
 // The review roster comes from a fixed, separately approved PC file.
 // Never follow an input-supplied roster path or trust its count alone.
 const approvedUniverse=dynamic?checkedJson(rosterFile,8_000_000):null;
 const snapshot=prepareR43ManualSnapshot(input,{now,approvedUniverse});
 const body=JSON.stringify(snapshot),digest=sha(body);
 if(Buffer.byteLength(body,'utf8')>1_750_000)fail('R43_MANUAL_PUBLIC_PAYLOAD_SIZE_STOP');
 const config=checkedJson(path.join(pcHome,'config.json'),64_000);
 if(config?.collectionTarget!=='pc'||config?.enabled!==true||
  typeof config.core!=='string'||!config.core.trim()||
  typeof config.source!=='string'||!/^[a-f0-9]{40}$/i.test(config.source))
  fail('R43_MANUAL_PC_CONFIG_STOP');
 if(!file(path.join(repoRoot,'scripts','pc-writer','d1.mjs')))
  fail('R43_MANUAL_PC_APPROVED_SOURCE_MISSING_STOP');
 let head;
 try{head=headResolver(repoRoot)}catch{fail('R43_MANUAL_PC_SOURCE_READ_FAILED_STOP')}
 if(head!==config.source)fail('R43_MANUAL_PC_SOURCE_DRIFT_STOP');
 // No remote reads or writes until all local/source/permission checks succeed.
 if(await readerGate()!==true)fail('R43_PUBLIC_READER_NOT_DEPLOYED_STOP');
 const lockPath=path.join(pcHome,'market-calendar-r43.manual.lock');
 let lockHandle;
 try{lockHandle=fs.openSync(lockPath,'wx')}
 catch(error){if(error?.code==='EEXIST')fail('R43_MANUAL_LOCK_BUSY_STOP');throw error}
 try{
  fs.writeFileSync(lockHandle,JSON.stringify({pid:process.pid,purpose:'R43_MANUAL_ONLY'}));
  const remote=remoteFactory?await remoteFactory({repoRoot,config}):await (async()=>{
   const {client,credential}=await import(pathToFileURL(path.join(repoRoot,'scripts','pc-writer','d1.mjs')).href);
   return client(config,credential(repoRoot));
  })();
  const lookup="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
  const existing=(await remote.query(config.core,lookup,[R43_MARKET_IMPORTANCE_PUBLIC_KEY])).results?.[0]??null;
  if(existing){
   if(existing.body===body)return {status:'R43_ALREADY_PUBLISHED',asOf:snapshot.asOf,
    issuerCount:snapshot.eligibleIssuers,selected:snapshot.topCount,sha256:digest,
    providerCalls:0,dbWrites:0};
   let prior;
   try{prior=JSON.parse(existing.body)}catch{fail('R43_REMOTE_FORMAT_UNKNOWN_STOP')}
   if(!r43MarketImportanceDisplayIndex(prior,{now,maxAgeDays:3650}))
    fail('R43_REMOTE_FORMAT_UNKNOWN_STOP');
   if(prior.asOf>=snapshot.asOf)fail('R43_REMOTE_NEWER_OR_CONFLICT_STOP');
  }
  const at=Date.now();
  await remote.request(config.core,[{sql:
   "INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>public_feed_snapshots_v1.stored_at",
   params:[R43_MARKET_IMPORTANCE_PUBLIC_KEY,body,at]}]);
  const reread=(await remote.query(config.core,lookup,[R43_MARKET_IMPORTANCE_PUBLIC_KEY])).results?.[0]??null;
  if(reread?.body!==body||reread?.stored_at!==at)
   fail('R43_D1_READBACK_UNKNOWN_STOP');
  return {status:'R43_D1_PUBLISHED_AND_READBACK',asOf:snapshot.asOf,
   issuerCount:snapshot.eligibleIssuers,selected:snapshot.topCount,sha256:digest,
   providerCalls:0,dbWrites:1};
 }finally{
  fs.closeSync(lockHandle);
  fs.unlinkSync(lockPath); // Only the lock created by this specific invocation.
 }
}
