// Opt-in PC cycle for the two optional ETF themes. Nothing runs on import.
// A failed optional theme never changes the original seven-theme pipeline.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {collectOptional} from './theme-optional-collect.mjs';
import {auditOptionalPrices} from './theme-optional-audit.mjs';
import {buildAiProvisionalFromExistingSeven} from './theme-ai-marketparquet-provisional-r2.mjs';
import {containedFile,inspectManifest} from './theme-data-inventory.mjs';
import {eligibleAiTheme,AI_THEME_PUBLIC_KEY,AI_THEME_PUBLIC_VERSION} from '../../worker/theme-ai-semiconductor-optional.mjs';
import {themeHistoryReference} from '../../worker/theme-history-reference.mjs';
import {THEME_ETF_ONLY_PUBLIC_KEY,validateThemeEtfOnlyPublic} from '../../worker/theme-etf-only-public.mjs';
import {THEME_ETF_ROLLING_KEY,THEME_ETF_ROLLING_VERSION} from '../../worker/theme-etf-rolling-public.mjs';

const DATA_ROOT='E:/ZGmini/data';
const FEED='https://zgmini.kr/api/theme-fear-greed/';
const GMH='https://getmarkethistory.com';
const METHOD='ETF_ONLY_T40_R20_V40_PAIR50';
const PRICE_MODE='UNADJUSTED_15_NY_HOURLY_PROXY_WITH_OFFICIAL_EARLY_CLOSE_12';
const TARGETS=['ai-semiconductor','biotech'];
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=reason=>{throw Object.assign(new Error(reason),{code:reason});};
const ensure=(v,reason)=>{if(!v)fail(reason);};
const ymd=(d)=>new Date(d).toISOString().slice(0,10);
const minusDays=(d,n)=>ymd(new Date(Date.parse(d+'T00:00:00Z')-n*86400000));
const equal=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>v===b[i]);

// Read-only diagnostic for the existing public reader predicate. This never
// relaxes eligibility, estimates a missing score, or changes the public worker.
export function aiReaderRejectionReason(record,reference,{now=Date.now()}={}){
 const base={...reference,themes:reference?.themes?.slice(0,7)};
 if(eligibleAiTheme(record,base,{now,storedAt:now}))return 'PASS';
 if(base.status!=='READY'||base.themes?.length!==7||!date(base.observationDate)||base.themes[0]?.history?.length!==252)
  return 'PUBLIC_READER_BASE_NOT_READY';
 if(record.observationDate!==base.observationDate)return 'PUBLIC_READER_OBSERVATION_DATE_MISMATCH';
 if(record.history?.length!==252)return 'PUBLIC_READER_HISTORY_LENGTH_MISMATCH';
 if(record.history.some((p,i)=>p?.date!==base.themes[0].history[i]?.date))return 'PUBLIC_READER_HISTORY_CALENDAR_MISMATCH';
 const pending=base.phase==='PROVISIONAL'?base.provisional?.points??[]:[];
 const actual=record.provisional?.points??[];
 if(!equal(pending.map(p=>p?.date),actual.map(p=>p?.date)))return 'PUBLIC_READER_PROVISIONAL_DATES_MISSING';
 if(record.phase!==(pending.length?'PROVISIONAL':'CONFIRMED'))return 'PUBLIC_READER_PHASE_MISMATCH';
 return 'PUBLIC_READER_OTHER_GATE_REJECTED';
}

export function collectWindow(manifest,reference,themeId,now=Date.now()){
 ensure(TARGETS.includes(themeId)&&manifest?.themeId===themeId&&Array.isArray(manifest.files),'MANIFEST_INVALID');
 ensure(reference?.status==='READY'&&date(reference.observationDate),'REFERENCE_UNAVAILABLE');
 const symbols=themeId==='ai-semiconductor'?['SMH','SOXX','SPY']:['IBB','XBI','SPY'];
 const latest=symbols.map(s=>manifest.files.filter(f=>f.path.startsWith('raw/'+s+'_')&&date(f.observationThrough)).map(f=>f.observationThrough).sort().at(-1));
 ensure(latest.every(date),'MANIFEST_SYMBOL_MISSING');
 const from=minusDays(latest.sort()[0],6),provisional=reference.provisional?.points??[];
 ensure(Array.isArray(provisional)&&provisional.every(p=>date(p.date)),'REFERENCE_PROVISIONAL_INVALID');
 // AI's public reader may keep the same provisional end date for several days.
 // A completed collection checkpoint is keyed by start/end; a static end date
 // would silently skip all new provider requests on every subsequent daily run.
 // Extend only the requested range to the UTC run date. This never creates or
 // forecasts a price bar; only actual provider rows enter the SHA manifest.
 const runDate=new Date(now);
 ensure(Number.isFinite(runDate.getTime()),'COLLECTION_CLOCK_INVALID');
 const through=[reference.observationDate,...provisional.map(p=>p.date),
  ...(themeId==='ai-semiconductor'?[runDate.toISOString().slice(0,10)]:[])].sort().at(-1);
 ensure(through>=from,'COLLECTION_WINDOW_INVALID');
 ensure(through<='2028-12-31','NYSE_EARLY_CLOSE_CALENDAR_REVALIDATION_REQUIRED');
 return {start:from,end:through};
}

export function validateStoredReference(themeId,prior,reference){
 ensure(TARGETS.includes(themeId),'THEME_NOT_ALLOWED');
 ensure(prior?.status==='READY'&&prior.methodologyVersion===METHOD&&Array.isArray(prior.history)&&prior.history.length===252&&date(prior.observationDate),'PRIOR_D1_CONTRACT');
 ensure(prior.history.at(-1)?.date===prior.observationDate&&prior.history.every((p,i)=>date(p.date)&&Number.isFinite(p.score)&&p.score>=0&&p.score<=100&&(i===0||p.date>prior.history[i-1].date)),'PRIOR_HISTORY_INTEGRITY');
 ensure(reference?.status==='READY'&&reference.methodologyVersion===METHOD&&date(reference.observationDate)&&Array.isArray(reference.themes),'PUBLIC_REFERENCE_CONTRACT');
 ensure(prior.observationDate<=reference.observationDate,'PRIOR_AHEAD_OF_PUBLIC');
 if(themeId==='ai-semiconductor')ensure(prior.theme==='AI 반도체'&&equal(prior.etfs,['SMH','SOXX'])&&reference.themes.length>=7,'AI_IDENTITY');
 if(themeId==='biotech')ensure(prior.etfs?.join(',')==='IBB,XBI'&&reference.themes.length>=8,'BIOTECH_IDENTITY');
}

// The optional AI feed may be one or more actual sessions behind the core
// feed. Validate its full 252-date calendar against the exact historical core
// seed + rolling history, just as the public reader does. Never shift prices
// or weaken the reader's 252-point eligibility checks to fill a missing date.
export function aiCandidateReference(base,seed,observationDate){
 ensure(date(observationDate)&&date(base?.observationDate)&&observationDate<=base.observationDate,'AI_OBSERVATION_DATE_INVALID');
 if(observationDate===base.observationDate)return base;
 ensure(seed&&validateThemeEtfOnlyPublic(seed),'AI_HISTORICAL_SEED_NOT_VERIFIED');
 const historical=themeHistoryReference(base,seed,observationDate);
 ensure(historical?.themes?.length===7,'AI_HISTORICAL_252_REFERENCE_MISSING');
 return historical;
}

export function buildAiCandidate({audit,prior,reference,manifest,manifestBytes,now=Date.now()}){
 ensure(audit?.status==='PRIVATE_CANDIDATE_PARITY_VERIFIED'&&audit.audit?.maxDifference===0,'SCORE_DRIFT_REVIEW_REQUIRED');
 ensure(audit.themeId==='ai-semiconductor'&&reference.themes?.length>=7,'AI_AUDIT_IDENTITY');
 // Historical publication rights do not transfer to a different provider.
 ensure(prior.publicationAuthorized===true&&prior.upstreamCommercialRightsVerified===true&&prior.derivedLicenseVerified===true&&prior.localBarsVerified===true&&prior.sourcePriceReconciled===true,'RIGHTS_OR_PRICE_APPROVAL_REQUIRED');
 ensure(prior.sourcePriceMode===PRICE_MODE&&prior.methodologyVersion===METHOD,'METHOD_OR_PRICE_MODE_DRIFT');
 ensure(/^(R187_SHA256|GMH_MANIFEST_SHA256)_[a-f0-9]{64}$/.test(prior.sourceVersion??''),'PREVIOUS_APPROVED_PRICE_SOURCE_UNKNOWN');
 ensure(manifest.files.length>0&&manifest.files.every(f=>f.source===GMH),'SOURCE_PROVIDER_CHANGED');
 const attested=manifest.files.filter(f=>f.observationThrough>=audit.observationDate);
 const present=['SMH','SOXX','SPY'].map(s=>attested.filter(f=>f.path.startsWith('raw/'+s+'_')).map(f=>Date.parse(f.collectedAt)).filter(Number.isFinite));
 ensure(present.every(a=>a.length),'NEW_OBSERVATION_PROVENANCE_MISSING');
 // The oldest receipt time among the bars used for the newest day is the conservative timestamp.
 const sourceStoredAt=new Date(Math.min(...present.map(a=>Math.max(...a)))).toISOString();
 ensure(Date.parse(sourceStoredAt)<=now&&now-Date.parse(sourceStoredAt)<8*86400000,'SOURCE_STALE');
 const nowIso=new Date(now).toISOString();
 const record={status:'READY',version:AI_THEME_PUBLIC_VERSION,theme:'AI 반도체',etfs:['SMH','SOXX'],
  methodologyVersion:METHOD,scoreMethod:'ETF_ONLY_PROXY',individualStocksUsed:0,
  sourcePriceMode:PRICE_MODE,sourceStoredAtKind:'VERIFIED_LOCAL_MARKET_BARS',sourceTimestampBasis:'MANIFEST_GET_REQUEST_AT',
  sourceVersion:'GMH_MANIFEST_SHA256_'+sha(manifestBytes),sourceStoredAt,publishedAt:nowIso,asOf:nowIso,
  publicationAuthorized:prior.publicationAuthorized,upstreamCommercialRightsVerified:prior.upstreamCommercialRightsVerified,
  derivedLicenseVerified:prior.derivedLicenseVerified,localBarsVerified:true,sourcePriceReconciled:true,
  observationDate:audit.observationDate,score:audit.score,history:audit.history,
  phase:(reference.provisional?.points?.length??0)?'PROVISIONAL':'CONFIRMED',provisional:audit.provisional,
  ...(audit.provisional?.lineage?{provisionalLineage:audit.provisional.lineage}:{})};
 ensure(eligibleAiTheme(record,{...reference,themes:reference.themes.slice(0,7)},{now,storedAt:now}),
  aiReaderRejectionReason(record,reference,{now}));
 return record;
}

// Do not transfer GMH rights flags to the second provider. Require the exact
// existing seven-theme rolling publisher's source/rights attestation for the
// same confirmed and provisional dates, even though no raw is published.
export function verifySevenProvisionalAuthority(rolling,reference){
 const expected=(reference?.phase==='PROVISIONAL'?reference.provisional?.points??[]:[]).map(p=>p.date);
 ensure(rolling?.status==='READY'&&rolling.version===THEME_ETF_ROLLING_VERSION&&
  rolling.publicationAuthorized===true&&rolling.upstreamCommercialRightsVerified===true&&
  rolling.derivedLicenseVerified===true&&rolling.sourcePriceReconciled===true&&
  rolling.lineage?.primarySource==='GETMARKETHISTORY_1H_CLOSE'&&
  rolling.lineage?.secondarySource==='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED'&&
  rolling.lineage?.secondaryPendingCount===expected.length&&
  rolling.observationDate===reference.observationDate&&
  equal((rolling.provisional?.points??[]).map(p=>p.date),expected)&&
  rolling.lineage?.latestCompletedSession===expected.at(-1),'AI_SEVEN_SECONDARY_RIGHTS_OR_LINEAGE_UNVERIFIED');
 return true;
}

function config(dataRoot){
 const cfg=JSON.parse(fs.readFileSync(path.join(dataRoot,'pc-writer','config.json'),'utf8'));
 ensure(/^[a-f0-9]{32}$/.test(cfg.account)&&/^[a-f0-9-]{36}$/.test(cfg.core),'PC_D1_CONFIG_INVALID');
 return cfg;
}
const WRANGLER_EARLY_REFRESH_MS=300000;
// The original PC D1 writer refreshes expired OAuth via `wrangler whoami`.
// Do not treat an expired access token as terminal when the existing Wrangler
// refresh token can be used. Never print or copy the OAuth credential.
export function cloudflareToken({dataRoot=DATA_ROOT,
 oauthFile=path.join(os.homedir(),'AppData','Roaming','xdg.config','.wrangler','config','default.toml'),
 env=process.env,execute=spawnSync,now=Date.now(),platform=process.platform,
 executable=process.execPath,wranglerCandidates=null}={}){
 if(env.CLOUDFLARE_API_TOKEN)return env.CLOUDFLARE_API_TOKEN;
 ensure(fs.existsSync(oauthFile),'PC_CLOUDFLARE_AUTH_UNAVAILABLE');
 const valid=()=>{
  const body=fs.readFileSync(oauthFile,'utf8');
  const expiry=Date.parse(body.match(/expiration_time\s*=\s*"([^"]+)"/)?.[1]??'');
  const value=body.match(/oauth_token\s*=\s*"([^"]+)"/)?.[1];
  return value&&Number.isFinite(expiry)&&expiry>now+WRANGLER_EARLY_REFRESH_MS?value:null;
 };
 const existing=valid();if(existing)return existing;
 const approvedRoot=path.dirname(path.resolve(dataRoot));
 const scripts=wranglerCandidates??[
  path.join(approvedRoot,'projects','zgmini','node_modules','wrangler','bin','wrangler.js'),
  path.join(approvedRoot,'node_modules','wrangler','bin','wrangler.js'),
  path.join(approvedRoot,'runtime','node_modules','wrangler','bin','wrangler.js'),
 ];
 const options={encoding:'utf8',timeout:60000,windowsHide:true,maxBuffer:512*1024};
 for(const script of scripts){
  if(!fs.existsSync(script))continue;
  execute(executable,[script,'whoami'],options);
  const refreshed=valid();if(refreshed)return refreshed;
 }
 if(platform==='win32'){
  // Use an already-installed Wrangler on PATH. Do not run `npx`, which could
  // download or install a new package on the user's PC.
  execute('cmd.exe',['/d','/c','wrangler.cmd','whoami'],options);
  const refreshed=valid();if(refreshed)return refreshed;
 }
 fail('PC_WRANGLER_REAUTH_REQUIRED');
}
export function cloudflareD1({dataRoot,fetchImpl=fetch}={}){
 const cfg=config(dataRoot),secret=cloudflareToken({dataRoot});let writeAttempted=false;
 const query=async(sql,params)=>{
  let response;try{response=await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${cfg.account}/d1/database/${cfg.core}/query`,{
   method:'POST',headers:{Authorization:`Bearer ${secret}`,'content-type':'application/json'},
   body:JSON.stringify({batch:[{sql,params}]}),signal:AbortSignal.timeout(30000),redirect:'error'});
  }catch{fail(writeAttempted?'D1_WRITE_OUTCOME_UNKNOWN':'D1_READ_FAILED');}
  let body;try{body=await response.json()}catch{fail(writeAttempted?'D1_WRITE_OUTCOME_UNKNOWN':'D1_BAD_RESPONSE');}
  ensure(response.ok&&body.success!==false&&body.result?.length===1&&body.result[0].success!==false,writeAttempted?'D1_WRITE_OUTCOME_UNKNOWN':'D1_QUERY_FAILED');
  return body.result[0];
 };
 const sql="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
 return {
  async read(key){const row=(await query(sql,[key])).results?.[0];ensure(row?.body&&Number.isSafeInteger(Number(row.stored_at)),'D1_PRIOR_MISSING');return {body:JSON.parse(row.body),storedAt:Number(row.stored_at)};},
   async readSeed(){
    const row=(await query('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?',[THEME_ETF_ONLY_PUBLIC_KEY])).results?.[0];
    ensure(row?.body&&Number.isSafeInteger(Number(row.stored_at)),'AI_HISTORICAL_SEED_NOT_FOUND');
    let seed;try{seed=JSON.parse(row.body)}catch{fail('AI_HISTORICAL_SEED_INVALID_JSON');}
    ensure(validateThemeEtfOnlyPublic(seed),'AI_HISTORICAL_SEED_NOT_VERIFIED');
    return seed;
   },
  async replace(key,record,previousStoredAt){
   const body=JSON.stringify(record),storedAt=Date.now();ensure(storedAt>previousStoredAt,'D1_CLOCK_REGRESSION');
   writeAttempted=true;
   const result=await query("UPDATE public_feed_snapshots_v1 SET body=?,stored_at=? WHERE kind='output' AND feed_key=? AND snapshot_key='current' AND stored_at=?",[body,storedAt,key,previousStoredAt]);
   ensure(result.meta?.changes===1,'D1_COMPARE_AND_SWAP_FAILED');
   const row=(await query(sql,[key])).results?.[0];ensure(row?.body===body&&Number(row.stored_at)===storedAt,'D1_READBACK_MISMATCH');
   return {storedAt};
  }
 };
}

const api=async(fetchImpl=fetch)=>{
 const res=await fetchImpl(FEED+'?optional_cycle='+Date.now(),{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
 ensure(res.ok,'PUBLIC_API_NOT_READY');const value=await res.json();ensure(value.status==='READY','PUBLIC_API_NOT_READY');return value;
};
export async function runOptionalTheme({themeId,dataRoot,readPublic=api,storage=null,collect=collectOptional,
 audit=auditOptionalPrices,secondary=buildAiProvisionalFromExistingSeven,allowPublish=false,now=Date.now}={}){
 const result={themeId,status:'STARTED',providerCalls:0,d1Writes:0,publicVerified:false,reason:null};
 try{
  ensure(TARGETS.includes(themeId),'UNREGISTERED_THEME');
  ensure(fs.existsSync(dataRoot),'E_DATA_ROOT_UNAVAILABLE');
  const db=storage??cloudflareD1({dataRoot});const publicFeed=await readPublic();
  const base={...publicFeed,themes:publicFeed.themes.slice(0,themeId==='ai-semiconductor'?7:8)};
  const key=themeId==='ai-semiconductor'?AI_THEME_PUBLIC_KEY:'theme-biotech-optional-r1';
  const previous=await db.read(key);validateStoredReference(themeId,previous.body,base);
  const relative=`themes/${themeId}/raw-manifest.json`;
  ensure(inspectManifest(dataRoot,relative,themeId).status==='SHA_VERIFIED','RAW_MANIFEST_INVALID');
  const file=containedFile(dataRoot,relative),manifest=JSON.parse(fs.readFileSync(file,'utf8'));
  const window=collectWindow(manifest,base,themeId,now());
  const gathering=await collect({dataRoot,themeId,start:window.start,end:window.end});result.providerCalls=gathering.providerCalls;
  ensure(gathering.status==='PRIVATE_RAW_COLLECTION_COMPLETE','COLLECTION_'+gathering.status);
  ensure(inspectManifest(dataRoot,relative,themeId).status==='SHA_VERIFIED','RAW_MANIFEST_AFTER_COLLECTION_INVALID');
  const useSecondary=themeId==='ai-semiconductor'&&base.phase==='PROVISIONAL'&&
   (base.provisional?.points?.length??0)>0;
  const checked=audit({themeId,dataRoot,reference:base,priorRecord:previous.body,
   includePrivatePrices:useSecondary});
  result.scoreDifference=checked.audit.maxDifference;result.observationDate=checked.observationDate;
  ensure(checked.status==='PRIVATE_CANDIDATE_PARITY_VERIFIED','SCORE_DRIFT_REVIEW_REQUIRED');
  if(themeId==='biotech')fail('BIOTECH_ORIGINAL_R3_AND_RIGHTS_REVIEW_REQUIRED');
   if(useSecondary){
    let seven;try{seven=(await db.read(THEME_ETF_ROLLING_KEY)).body;}
    catch{fail('AI_SEVEN_ROLLING_D1_AUTHORITY_NOT_FOUND');}
    verifySevenProvisionalAuthority(seven,base);
    const derived=await secondary({dataRoot,checked,reference:base,now:now()});
    ensure(derived.status==='PRIVATE_PROVISIONAL_SCORES_VERIFIED'&&Array.isArray(derived.points)&&
     derived.points.length===(base.provisional?.points?.length??0)&&
     equal(derived.points.map(p=>p.date),base.provisional.points.map(p=>p.date))&&
     derived.lineage?.source==='MARKETPARQUET_ETF_DAILY_SPLIT_ADJUSTED',
     'AI_SECONDARY_CANDIDATE_INVALID');
    checked.provisional={points:derived.points,lineage:derived.lineage};
    result.provisionalDates=derived.points.map(p=>p.date);
    result.provisionalScores=derived.points.map(p=>p.score);
    result.sourcePriceMaxOverlapDifference=derived.lineage.maxOverlapDifference;
   }
   const historicalSeed=checked.observationDate<base.observationDate
    ?(typeof db.readSeed==='function'?await db.readSeed():null):null;
   const candidateReference=aiCandidateReference(base,historicalSeed,checked.observationDate);
   const verifiedManifest=fs.readFileSync(file);const record=buildAiCandidate({audit:checked,prior:previous.body,reference:candidateReference,manifest:JSON.parse(verifiedManifest),manifestBytes:verifiedManifest,now:now()});
  const previouslyPublished={phase:previous.body.phase,observationDate:previous.body.observationDate,score:previous.body.score,
   history:previous.body.history,provisional:previous.body.provisional??{points:[]}};
  const newPublic={phase:record.phase,observationDate:record.observationDate,score:record.score,
   history:record.history,provisional:record.provisional??{points:[]}};
  if(JSON.stringify(previouslyPublished)===JSON.stringify(newPublic)){
   result.status='UNCHANGED_NO_WRITE';return result;
  }
  if(!allowPublish){result.status='CANDIDATE_VERIFIED_NOT_PUBLISHED';return result;}
  await db.replace(key,record,previous.storedAt);result.d1Writes=1;
  const refreshed=await readPublic();
  const found=refreshed.themes?.find(t=>t.theme==='AI 반도체');
  ensure(found&&found.score===record.score&&equal(found.history?.map(p=>p.date),record.history.map(p=>p.date)),'D1_VERIFIED_PUBLIC_PENDING');
  if(useSecondary)ensure(equal((refreshed.provisional?.points??[]).map(p=>p.scores?.['AI 반도체']),
   record.provisional.points.map(p=>p.score)),'D1_VERIFIED_PROVISIONAL_PUBLIC_PENDING');
  result.publicVerified=true;result.status='PUBLIC_VERIFIED';return result;
 }catch(e){result.status='BLOCKED';result.reason=e?.code??'UNKNOWN_ERROR';return result;}
}

// One-shot diagnostics re-evaluate existing SHA-verified local bars. There are
// no provider requests, D1 writes, scheduler actions or E: state-file writes.
export async function diagnoseAiReader({dataRoot,readPublic=api,storage=null,audit=auditOptionalPrices,now=Date.now}={}){
 const result={report:'THEME_AI_READER_READONLY_DIAGNOSTIC_R1',themeId:'ai-semiconductor',status:'STARTED',
  providerCalls:0,d1Writes:0,schedulerWrites:0,reason:null};
 try{
  ensure(fs.existsSync(dataRoot),'E_DATA_ROOT_UNAVAILABLE');
  const db=storage??cloudflareD1({dataRoot}),publicFeed=await readPublic();
  const reference={...publicFeed,themes:publicFeed.themes?.slice(0,7)};
  const previous=await db.read(AI_THEME_PUBLIC_KEY);
  validateStoredReference('ai-semiconductor',previous.body,reference);
  const relative='themes/ai-semiconductor/raw-manifest.json';
  ensure(inspectManifest(dataRoot,relative,'ai-semiconductor').status==='SHA_VERIFIED','RAW_MANIFEST_INVALID');
  const file=containedFile(dataRoot,relative),manifestBytes=fs.readFileSync(file);
  const checked=audit({themeId:'ai-semiconductor',dataRoot,reference,priorRecord:previous.body});
  result.publicObservationDate=reference.observationDate;
  result.publicHistoryLastDate=reference.themes[0]?.history?.at(-1)?.date??null;
  result.localObservationDate=checked.observationDate;
   result.latestCommonSourceDate=checked.audit?.latestCommon??null;
  result.scoreDifference=checked.audit?.maxDifference??null;
  result.publicPhase=reference.phase;
  result.publicProvisionalDates=reference.phase==='PROVISIONAL'?(reference.provisional?.points??[]).map(p=>p.date):[];
  result.localProvisionalDates=(checked.provisional?.points??[]).map(p=>p.date);
  result.localAuditStatus=checked.status;
  ensure(checked.status==='PRIVATE_CANDIDATE_PARITY_VERIFIED','SCORE_DRIFT_REVIEW_REQUIRED');
   const historicalSeed=checked.observationDate<reference.observationDate
    ?(typeof db.readSeed==='function'?await db.readSeed():null):null;
   const candidateReference=aiCandidateReference(reference,historicalSeed,checked.observationDate);
   buildAiCandidate({audit:checked,prior:previous.body,reference:candidateReference,manifest:JSON.parse(manifestBytes),manifestBytes,now:now()});
  result.status='PUBLIC_READER_CANDIDATE_VERIFIED_NO_PUBLICATION';
 }catch(e){result.status='BLOCKED';result.reason=e?.code??'UNKNOWN_ERROR';}
 return result;
}

export async function diagnoseBiotechParity({dataRoot,readPublic=api,storage=null,audit=auditOptionalPrices}={}){
 const result={report:'THEME_BIOTECH_PARITY_READONLY_DIAGNOSTIC_R1',themeId:'biotech',status:'STARTED',
  providerCalls:0,d1Writes:0,schedulerWrites:0,reason:null};
 try{
  ensure(fs.existsSync(dataRoot),'E_DATA_ROOT_UNAVAILABLE');
  const db=storage??cloudflareD1({dataRoot}),publicFeed=await readPublic();
  const reference={...publicFeed,themes:publicFeed.themes?.slice(0,8)};
  const previous=await db.read('theme-biotech-optional-r1');
  validateStoredReference('biotech',previous.body,reference);
  ensure(inspectManifest(dataRoot,'themes/biotech/raw-manifest.json','biotech').status==='SHA_VERIFIED','RAW_MANIFEST_INVALID');
  const checked=audit({themeId:'biotech',dataRoot,reference,priorRecord:previous.body});
  result.publicObservationDate=reference.observationDate;
  result.previousObservationDate=previous.body.observationDate;
  result.localObservationDate=checked.observationDate;
  result.scoreDifference=checked.audit?.maxDifference??null;
  result.commonSessions=checked.audit?.commonSessions??null;
  result.sourceOverlapBars=checked.audit?.sourceOverlapBars??null;
  result.missingProvisionalDates=checked.audit?.missingProvisionalDates??[];
  const previousScores=new Map(previous.body.history.map(p=>[p.date,p.score]));
  const matched=checked.history.filter(p=>previousScores.has(p.date));
  const drifts=matched.map(p=>({date:p.date,difference:Number(Math.abs(p.score-previousScores.get(p.date)).toFixed(5))}))
   .filter(p=>p.difference>0).sort((a,b)=>b.difference-a.difference);
  result.overlappingHistoryDates=matched.length;
  result.overlappingChangedDates=drifts.length;
  result.largestOverlappingDifferences=drifts.slice(0,5);
  result.localAuditStatus=checked.status;
  ensure(checked.status==='PRIVATE_CANDIDATE_PARITY_VERIFIED','SCORE_DRIFT_REVIEW_REQUIRED');
  // Even matching bars do not authorize biotech publication: the separate R3
  // methodology and commercial-data rights review must be completed first.
  fail('BIOTECH_ORIGINAL_R3_AND_RIGHTS_REVIEW_REQUIRED');
 }catch(e){result.status='BLOCKED';result.reason=e?.code??'UNKNOWN_ERROR';}
 return result;
}

function saveCycleResult(dataRoot,themeId,result){
 const root=fs.realpathSync(dataRoot),dir=path.join(root,'themes',themeId,'state');
 ensure(fs.existsSync(dir)&&fs.realpathSync(dir).startsWith(root+path.sep),'STATE_DIRECTORY_MISSING');
 const dest=path.join(dir,'cycle-last.json'),tmp=dest+'.'+process.pid+'.tmp';
 const payload={...result,recordedAt:new Date().toISOString(),secretFieldsWritten:0};
 fs.writeFileSync(tmp,JSON.stringify(payload,null,2)+'\n',{flag:'wx'});
 try{fs.renameSync(tmp,dest)}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),diagnose=args.length===2&&args[0]==='--diagnose'&&['ai-semiconductor','biotech'].includes(args[1]);
 const valid=diagnose||(args[0]==='--once'&&['ai-semiconductor','biotech','all'].includes(args[1])&&args.slice(2).every(x=>x==='--publish'));
 if(!valid){console.log('Usage: node theme-optional-cycle.mjs --once <ai-semiconductor|biotech|all> [--publish] OR --diagnose <ai-semiconductor|biotech>');process.exitCode=2;}
 else if(diagnose){
  const dataRoot=process.env.ZGMINI_DATA_ROOT??DATA_ROOT;
  const result=args[1]==='ai-semiconductor'?await diagnoseAiReader({dataRoot}):await diagnoseBiotechParity({dataRoot});
  console.log(JSON.stringify(result));if(result.status==='BLOCKED')process.exitCode=1;
 }
 else{
  const dataRoot=process.env.ZGMINI_DATA_ROOT??DATA_ROOT;
  const ids=args[1]==='all'?TARGETS:[args[1]];
  for(const themeId of ids){const result=await runOptionalTheme({themeId,dataRoot,allowPublish:args.includes('--publish')});
   try{saveCycleResult(dataRoot,themeId,result);}catch{console.error('OPTIONAL_CYCLE_RESULT_NOT_SAVED');process.exitCode=1;}
   console.log(JSON.stringify(result));if(result.status==='BLOCKED')process.exitCode=1;
  }
 }
}
