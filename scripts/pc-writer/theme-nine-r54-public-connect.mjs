// R54: publish the already-approved nine-theme R47/R48/R51 score product.
// No price API GET, new formula, raw bar upload, existing key replacement,
// scheduled task mutation, or inferred provisional score is allowed here.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {stageCurrentNineR48} from './theme-nine-r48-stage-current.mjs';
import {stageNineR51Current} from './theme-nine-r51-stage-current.mjs';
import {buildNineR48PrivatePublicationCandidate} from './theme-nine-r48-r47-bridge.mjs';
import {buildNineR51PrivateProvisionalOverlay,
 buildNineR51ExistingPublicProvisionalOverlay,R51_PUBLIC_LEGACY_SOURCE}
 from './theme-nine-r51-provisional-overlay.mjs';
import {buildNineR54PublicRecord,buildNineR54ConfirmedPublicRecord}
 from './theme-nine-r54-public-record.mjs';
import {verifyNineR54Production} from './theme-nine-r54-deployment-gate.mjs';
import {createNineR54D1Query} from './theme-nine-r54-d1-client.mjs';
import {publishNineR48D1} from './theme-nine-r48-d1-publication.mjs';
import {addVerifiedNineR37,THEME_NINE_R37_ROSTER} from '../../worker/theme-nine-r37-public.mjs';
import {addVerifiedNineR88,R88_KEY} from '../../worker/theme-nine-r88-provisional.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex');
const APPROVED_SEVEN_AUTH_SHA='9b1f952f720abe0d6e631ad8fac908cfd51b00575690e9abea8cd09f1a6a4bd3';
const need=(ok,code)=>{
 if(!ok)throw Object.assign(new Error('THEME_NINE_R54_'+code),
  {code:'THEME_NINE_R54_'+code});
};
const names=/^THEME_NINE_R47_PRIVATE_(\d{4}-\d{2}-\d{2})_([a-f0-9]{16})_NINE\.json$/;
const safeFile=(dir,filename)=>{
 need(!filename.includes('/')&&!filename.includes('\\')&&!filename.includes('..'),
  'FILE_NAME_UNSAFE');
 const p=fs.realpathSync(path.join(dir,filename));
 need(path.dirname(p)===fs.realpathSync(dir)&&fs.statSync(p).isFile(),
  'LOCAL_SOURCE_PATH_ESCAPE');
 return fs.readFileSync(p);
};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// The deployed R88 overlay intentionally replaces legacy provisional scores.
// Read that same stored sidecar when checking publication, rather than calling
// the correct new provisional value an API failure. This path cannot write.
export async function expectedNineR54WithProvisional({query,base,now=Date.now()}={}){
 return addVerifiedNineR88({prepare(){return {bind(key){
  need(key===R88_KEY,'READBACK_PROVISIONAL_KEY_DENIED');
  return {async first(){return (await query(
   "SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'",
   [R88_KEY],{write:false})).results?.[0]??null;}};
 }};}},base,{now});
}

// R80's first subsequent live R54 run stopped at the optional R7 Wrangler
// lookup BEFORE any D1 read/write. Reuse precisely the previously installed,
// SHA-verified R8 -> original seven-theme credential resolver. Do not log,
// persist or issue a token, and never invoke the seven-theme publisher.
export async function approvedNineR54SevenToken({dataRoot='E:/ZGmini/data',
 expectedAuthSha256=APPROVED_SEVEN_AUTH_SHA,importer=url=>import(url)}={}){
 const home=fs.realpathSync(path.join(dataRoot,'themes','biotech','source-r8'));
 const file=path.resolve(home,'scripts','pc-writer','theme-biotech-seven-auth-r8.mjs');
 need(file.startsWith(home+path.sep)&&fs.statSync(file).isFile()&&
  !fs.lstatSync(file).isSymbolicLink()&&fs.realpathSync(file)===file&&
  sha(fs.readFileSync(file))===expectedAuthSha256,'SEVEN_AUTH_SOURCE_NOT_APPROVED');
 const loaded=await importer(pathToFileURL(file).href);
 need(typeof loaded?.biotechApprovedSevenTokenR8==='function',
  'SEVEN_AUTH_ADAPTER_MISSING');
 const token=await loaded.biotechApprovedSevenTokenR8({dataRoot});
 need(typeof token==='string'&&token.length>8,'SEVEN_AUTH_TOKEN_UNAVAILABLE');
 return token;
}

// Reconstruct a persisted R48 candidate from its immutable R47 ETF/NINE
// pair and the approved roster/AUM evidence. This independently verifies
// source bytes, roster dates, scores and all 252 result points on both sides.
export function verifyNineR54PrivatePair({dataRoot,configDirectory,candidate}={}){
 const home=path.join(dataRoot,'themes','legacy-nine-r47-private');
 const rosterBytes=fs.readFileSync(path.join(configDirectory,
  'theme-nine-r20-approved-candidates.json'));
 const aumEvidenceBytes=fs.readFileSync(path.join(configDirectory,
  'theme-nine-r26-official-aum-evidence.json'));
 const found=[];
 for(const file of fs.readdirSync(home)){
  const match=file.match(names);
  if(!match||match[1]!==candidate.observationDate)continue;
  const first=safeFile(home,file.replace(/_NINE\.json$/,'_ETF.json'));
  const second=safeFile(home,file);
  if(sha(Buffer.concat([first,second])).slice(0,16)!==match[2])
   need(false,'R47_PRIVATE_PAIR_DIGEST');
  if(sha(first)===candidate.r25InputSha256&&
    sha(second)===candidate.shadowSha256)found.push({first,second,file});
 }
 need(found.length===1,'R47_PRIVATE_PAIR_NOT_UNIQUE');
 const {first,second,file}=found[0];
 const rebuilt=buildNineR48PrivatePublicationCandidate({
  individual:JSON.parse(first),individualBytes:first,
  themes:JSON.parse(second),themesBytes:second,
  roster:JSON.parse(rosterBytes),rosterBytes,aumEvidenceBytes});
 need(same(rebuilt,candidate),'R48_PRIVATE_CANDIDATE_REPLAY_DRIFT');
 return {source:JSON.parse(second).source,file,
  sourceFile:path.join(home,file)};
}

export function verifyNineR54RawManifest({dataRoot,source}={}){
 const chunks=[['legacy-nine-r23',source?.baselineManifestSha256],
  ...(source?.deltaManifestSha256?[['legacy-nine-r35-delta',source.deltaManifestSha256]]:[])];
 need(chunks.every(([,hash])=>/^[a-f0-9]{64}$/.test(hash??'')),
  'SOURCE_MANIFEST_SHA_MISSING');
 let verifiedPages=0;
 for(const [folder,hash] of chunks){
  const home=fs.realpathSync(path.join(dataRoot,'themes',folder));
  const current=safeFile(home,'raw-manifest.json');
  const archiveDir=path.join(home,'manifest-history');
  const archiveName=`raw-manifest-${hash}.json`;
  let bytes=sha(current)===hash?current:null;
  if(!bytes&&fs.existsSync(archiveDir)){
   need(fs.realpathSync(archiveDir)===path.resolve(archiveDir),
    'SOURCE_MANIFEST_ARCHIVE_REDIRECT');
   if(fs.existsSync(path.join(archiveDir,archiveName)))
    bytes=safeFile(archiveDir,archiveName);
  }
  if(!bytes){
   // R23/R35 append immutable raw-page references and serialize the same
   // metadata and ordered files array. A historical prefix is admissible
   // ONLY if its exact original JSON bytes reproduce the candidate's SHA.
   // This is a cryptographic recovery, not a current-hash substitution.
   const currentManifest=JSON.parse(current.toString('utf8'));
   need(Array.isArray(currentManifest.files),'SOURCE_MANIFEST_NO_PAGES');
   let matches=0;
   for(let count=1;count<=currentManifest.files.length;count++){
    const candidate=Buffer.from(JSON.stringify({...currentManifest,
     files:currentManifest.files.slice(0,count)},null,2)+'\n');
    if(sha(candidate)===hash){bytes=candidate;matches++;}
   }
   need(matches===1,'SOURCE_MANIFEST_SHA_DRIFT');
  }
  need(sha(bytes)===hash,'SOURCE_MANIFEST_SHA_DRIFT');
  const manifest=JSON.parse(bytes.toString('utf8'));
  need(Array.isArray(manifest.files)&&manifest.files.length>0,
   'SOURCE_MANIFEST_NO_PAGES');
  for(const page of manifest.files){
   need(page?.priceMode==='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'&&
    typeof page.symbol==='string'&&
    /^raw\/[A-Z][A-Z0-9.]{0,11}_[a-f0-9]{64}\.jsonl$/.test(page.path??'')&&
    page.path===`raw/${page.symbol}_${page.sha256}.jsonl`,
    'SOURCE_MANIFEST_RAW_REFERENCE');
   const file=fs.realpathSync(path.join(home,page.path));
   need(file.startsWith(home+path.sep)&&fs.statSync(file).isFile()&&
    sha(fs.readFileSync(file))===page.sha256,
    'SOURCE_RAW_PAGE_SHA_DRIFT');
   verifiedPages++;
  }
  // Archive only SHA-verified historical bytes and SHA-verified raw pages.
  // No live manifest is replaced; repeated runs read the immutable archive.
  if(!fs.existsSync(archiveDir))fs.mkdirSync(archiveDir);
  need(fs.realpathSync(archiveDir)===path.resolve(archiveDir),
   'SOURCE_MANIFEST_ARCHIVE_REDIRECT');
  const archived=path.join(archiveDir,archiveName);
  if(!fs.existsSync(archived))fs.writeFileSync(archived,bytes,{flag:'wx'});
  need(sha(safeFile(archiveDir,archiveName))===hash,
   'SOURCE_MANIFEST_ARCHIVE_SHA_DRIFT');
 }
 need(verifiedPages>=64,'SOURCE_RAW_COVERAGE');
 return {sourceManifestVerified:true,rawFilesShaVerified:verifiedPages};
}

const apiUrl='https://zgmini.kr/api/theme-fear-greed/';
async function fetchPublic({fetchImpl=fetch,now=Date.now(),publicationBase=true}={}){
 const url=`${apiUrl}?${publicationBase?'publication-base=1&':''}theme_nine_r54=${now}`;
 const response=await fetchImpl(url,{method:'GET',redirect:'error',
  headers:{'cache-control':'no-cache',accept:'application/json'},
  signal:AbortSignal.timeout(20000)});
 if(response.status===503){
  let body;try{body=await response.json();}catch{}
  if(body?.status==='UNAVAILABLE'&&body.reason==='STORED_DATA_STALE')
   need(false,'PUBLIC_BASE_STORED_DATA_STALE');
 }
 need(response.ok,'PUBLIC_API_HTTP_'+response.status);
 const parsed=await response.json();
 need(parsed?.status==='READY'&&Array.isArray(parsed.themes)&&
  parsed.themes.length>=7,'PUBLIC_API_BASE_INVALID');
 return parsed;
}

// Recovery only: an expired legacy public feed must not prevent a newer
// SHA-replayed GMH confirmed score from being stored. This path never
// fetches MarketParquet, invokes R51, or publishes provisional scores.
export async function runNineR54ConfirmedRecovery({dataRoot='E:/ZGmini/data',
 configDirectory=path.resolve(here,'../../config'),now=Date.now(),
 publisherConsent=false,fetchImpl=fetch,tokenFn=approvedNineR54SevenToken,
 stageR48=stageCurrentNineR48,gate=verifyNineR54Production,
 queryFactory=createNineR54D1Query,
 verifyPair=verifyNineR54PrivatePair,
 verifyManifest=verifyNineR54RawManifest}={}){
 need(publisherConsent===true,'EXPLICIT_PUBLISHER_CONSENT_REQUIRED');
 need(process.platform==='win32'||process.env.ZGMINI_R54_TEST_MODE==='1',
  'WINDOWS_PC_REQUIRED');
 const staged=stageR48({dataRoot,configDirectory});
 need(staged?.status==='R48_PRIVATE_CANDIDATE_STAGED_NOT_PUBLISHED',
  'R48_PRIVATE_STAGE_FAILED');
 const root=fs.realpathSync(dataRoot);
 const file=path.basename(staged.candidatePath);
 need(/^THEME_NINE_R48_PRIVATE_CANDIDATE_\d{4}-\d{2}-\d{2}_[a-f0-9]{16}\.json$/.test(file),
  'R48_SOURCE_FILENAME_INVALID');
 const bytes=safeFile(path.join(root,'themes','legacy-nine-r48-private-candidate'),file);
 need(sha(bytes)===staged.candidateSha256&&
  sha(bytes).slice(0,16)===file.match(/_([a-f0-9]{16})\.json$/)?.[1],
  'R48_CANDIDATE_SHA_DRIFT');
 const candidate=JSON.parse(bytes);
 need(candidate?.phase==='CONFIRMED'&&candidate.observationDate===staged.sourceDate,
  'R48_CONFIRMED_ONLY');
 const source=verifyPair({dataRoot:root,configDirectory,candidate});
 const sourceProof=verifyManifest({dataRoot:root,source:source.source});
 need(source.source.latestSpySessionDate===candidate.observationDate,
  'SOURCE_LAST_SPY_DATE_DRIFT');
 const stat=fs.statSync(source.sourceFile);
 need(stat.mtimeMs<=now&&now-stat.mtimeMs<8*86400000,
  'LATEST_R47_SOURCE_STALE');
 const record=buildNineR54ConfirmedPublicRecord({candidate,
  candidateSha256:staged.candidateSha256,sourceStoredAt:stat.mtime.toISOString(),
  sourceManifestVerified:sourceProof.sourceManifestVerified,
  privateReplayVerified:true,publisherConsent,now});
 const deployment=await gate({readerBytes:fs.readFileSync(path.resolve(here,
  '../../worker/theme-nine-r37-public.mjs')),fetchImpl});
 const token=await tokenFn({dataRoot:root});
 const query=queryFactory({dataRoot:root,tokenFn:()=>token,fetchImpl});
 const readSql="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
 const before=(await query(readSql,['theme-legacy-nine-r37'],{write:false})).results?.[0];
 const saved=await publishNineR48D1({query,record,publicBase:null,
  independentConfirmed:true,now,
  expectedStoredAt:before?Number(before.stored_at):null});
 let live=null;
 let publicReadError=null;
 try{live=await fetchPublic({fetchImpl,now:now+1,publicationBase:false});}
 catch(error){
  // D1 CAS and independent readback have already succeeded. An inaccessible,
  // malformed or stale public API is a pending public verification, not a
  // reason to lose the known D1 state or retry the owner automatically.
  publicReadError=error?.code??'THEME_NINE_R54_PUBLIC_READBACK_FAILED';
 }
 const visible=record.themes.filter(t=>t.theme!=='AI·반도체');
 const actual=new Map(live?.themes?.map(t=>[t.theme,t])??[]);
 const matched=live?.modelRevision===record.version&&
  live?.methodologyVersion===record.methodologyVersion&&
  live?.confirmedObservationDate===record.observationDate&&
  visible.every(t=>actual.get(t.theme)?.score===t.score&&
   same(actual.get(t.theme)?.history,t.history))&&
  !actual.has('AI·반도체');
 return {status:matched?'PUBLIC_API_VERIFIED':'D1_VERIFIED_AWAIT_PUBLIC_API_REFRESH',
  d1Writes:saved.written,dbStatus:saved.status,
  productionMainSha:deployment.mainSha,sourceDate:candidate.observationDate,
  confirmedDate:record.observationDate,provisionalMode:'NONE_CONFIRMED_ONLY',
  provisionalDates:[],themesValidated:9,historyRows:2268,
  rawFilesShaVerified:sourceProof.rawFilesShaVerified,publicR32ModelMatched:!!matched,
  publicReadError,providerCalls:0,otherFeedsChanged:false};
}

export async function runNineR54PublicConnect({dataRoot='E:/ZGmini/data',
 configDirectory=path.resolve(here,'../../config'),now=Date.now(),
 publisherConsent=false,fetchImpl=fetch,tokenFn=approvedNineR54SevenToken,
 stageR48=stageCurrentNineR48,stageR51=stageNineR51Current,
 gate=verifyNineR54Production,queryFactory=createNineR54D1Query,
 verifyPair=verifyNineR54PrivatePair,
 verifyManifest=verifyNineR54RawManifest}={}){
 need(publisherConsent===true,'EXPLICIT_PUBLISHER_CONSENT_REQUIRED');
 need(process.platform==='win32'||process.env.ZGMINI_R54_TEST_MODE==='1',
  'WINDOWS_PC_REQUIRED');
 let publicBase;
 try{publicBase=await fetchPublic({fetchImpl,now});}
 catch(error){
  if(error?.code==='THEME_NINE_R54_PUBLIC_BASE_STORED_DATA_STALE')
   return runNineR54ConfirmedRecovery({dataRoot,configDirectory,now,
    publisherConsent,fetchImpl,tokenFn,stageR48,gate,queryFactory,
    verifyPair,verifyManifest});
  throw error;
 }
 const staged=stageR48({dataRoot,configDirectory});
 need(staged?.status==='R48_PRIVATE_CANDIDATE_STAGED_NOT_PUBLISHED',
  'R48_PRIVATE_STAGE_FAILED');
 const provisional=await stageR51({dataRoot,publicBase,fetchImpl,
  advanceConfirmed:true});
 if(provisional?.status?.startsWith('WAIT_'))return {
  status:provisional.status,reason:'R51_SCORE_DATES_NOT_YET_AVAILABLE',
  confirmedDate:provisional.confirmedDate??null,
  provisionalDate:provisional.latestDate??null,
  d1Writes:0,publicWrites:0};
 need(provisional?.status==='R51_PRIVATE_PROVISIONAL_STAGED_NOT_PUBLISHED',
  'R51_PRIVATE_STAGE_FAILED');
 const filename=path.basename(provisional.candidatePath);
 const root=fs.realpathSync(dataRoot);
 const overlayBytes=safeFile(path.join(root,'themes','legacy-nine-r51-private-provisional'),filename);
 need(sha(overlayBytes)===provisional.candidateSha256&&
  provisional.candidateSha256.slice(0,16)===filename.match(/_([a-f0-9]{16})\.json$/)?.[1],
  'R51_CANDIDATE_SHA_DRIFT');
 const overlay=JSON.parse(overlayBytes);
 const r48home=path.join(root,'themes','legacy-nine-r48-private-candidate');
 const readR48=expectedSha=>{
  const options=[];
  for(const filename of fs.readdirSync(r48home)){
   if(!/^THEME_NINE_R48_PRIVATE_CANDIDATE_\d{4}-\d{2}-\d{2}_[a-f0-9]{16}\.json$/.test(filename))continue;
   const bytes=safeFile(r48home,filename);
   need(sha(bytes).slice(0,16)===filename.match(/_([a-f0-9]{16})\.json$/)[1],
    'R48_SOURCE_FILENAME_SHA_DRIFT');
   const parsed=JSON.parse(bytes);
   // R51's lineage hashes canonical JSON objects (not pretty on-disk bytes).
   if(sha(Buffer.from(JSON.stringify(parsed)))===expectedSha)options.push(parsed);
  }
  need(options.length===1,'R48_SOURCE_SNAPSHOT_NOT_UNIQUE');
  return options[0];
 };
 const original=readR48(overlay.provisionalLineage?.confirmedCandidateSha256);
 const publicLegacy=overlay.provisionalLineage?.source===R51_PUBLIC_LEGACY_SOURCE;
 const latest=publicLegacy?original:
  readR48(overlay.provisionalLineage?.latestCandidateSha256);
 const replay=publicLegacy?
  buildNineR51ExistingPublicProvisionalOverlay({confirmed:original,publicBase,
   independentAnchor:original.observationDate>
    (publicBase.confirmedObservationDate??publicBase.observationDate)}):
  buildNineR51PrivateProvisionalOverlay({confirmed:original,latest,publicBase});
 need(same(replay,overlay),'R51_PRIVATE_PROVISIONAL_REPLAY_DRIFT');
 const first=verifyNineR54PrivatePair({dataRoot:root,configDirectory,candidate:original});
 const last=publicLegacy?first:
  verifyNineR54PrivatePair({dataRoot:root,configDirectory,candidate:latest});
 const sourceProof=verifyNineR54RawManifest({dataRoot:root,source:last.source});
 need(first.source.latestSpySessionDate===original.observationDate&&
  last.source.latestSpySessionDate===latest.observationDate,
  'SOURCE_LAST_SPY_DATE_DRIFT');
 const stat=fs.statSync(last.sourceFile);
 const stamp=stat.mtime.toISOString();
 need(stat.mtimeMs<=now&&now-stat.mtimeMs<8*86400000,
  'LATEST_R47_SOURCE_STALE');
 const record=buildNineR54PublicRecord({candidate:overlay,
  candidateSha256:provisional.candidateSha256,publicBase,
  sourceStoredAt:stamp,sourceManifestVerified:sourceProof.sourceManifestVerified,
  privateReplayVerified:true,publisherConsent,now});
 // The public reader must be deployed via the already-approved main branch,
 // and its exact source must match what this PC publisher validated.
 const deployment=await gate({readerBytes:fs.readFileSync(path.resolve(here,
  '../../worker/theme-nine-r37-public.mjs')),fetchImpl});
 const approvedToken=await tokenFn({dataRoot:root});
 const query=queryFactory({dataRoot:root,tokenFn:()=>approvedToken,fetchImpl});
 const readSql="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
 const before=(await query(readSql,['theme-legacy-nine-r37'],{write:false})).results?.[0];
 const result=await publishNineR48D1({query,record,publicBase,now,
  expectedStoredAt:before?Number(before.stored_at):null});
 const confirmedChecked=await addVerifiedNineR37({prepare(){return {bind(){return {
  async first(){return {body:JSON.stringify(record),stored_at:now};}};}};}},
  publicBase,{now});
 const checked=await expectedNineR54WithProvisional({query,base:confirmedChecked,now});
 const live=await fetchPublic({fetchImpl,now:now+1,publicationBase:false});
 const expected=new Map(checked.themes.map(t=>[t.theme,t]));
 const liveByName=new Map(live.themes.map(t=>[t.theme,t]));
 const matched=publicBase.themes.every(t=>{
  const target=expected.get(t.theme),actual=liveByName.get(t.theme);
  return actual&&same(actual.history,target.history)&&actual.score===target.score;
 });
 const dateMatched=live.phase===checked.phase&&
  same(live.provisional?.points?.map(p=>p.date),
   checked.provisional?.points?.map(p=>p.date));
 const provisionalScoresMatched=dateMatched&&
  same(live.provisional?.points?.map(p=>p.scores),
   checked.provisional?.points?.map(p=>p.scores));
 const r32Visible=live.modelRevision===record.version&&live.methodologyVersion===record.methodologyVersion;
 return {status:r32Visible&&matched&&provisionalScoresMatched?'PUBLIC_API_VERIFIED':'D1_VERIFIED_AWAIT_PUBLIC_API_REFRESH',
  d1Writes:result.written,dbStatus:result.status,
  productionMainSha:deployment.mainSha,
  sourceDate:latest.observationDate,confirmedDate:record.observationDate,
  provisionalMode:publicLegacy?'PUBLIC_LEGACY_AS_IS':'R32_DATED',
  provisionalDates:record.provisional.points.map(p=>p.date),
  themesValidated:9,historyRows:2268,rawFilesShaVerified:sourceProof.rawFilesShaVerified,
  publicDateMatched:dateMatched,publicScoresMatched:matched,publicR32ModelMatched:r32Visible,
  publicProvisionalScoresMatched:provisionalScoresMatched,
  otherFeedsChanged:false,providerCalls:0};
}

// A confirmed-only operational invocation must never silently switch into
// the R51 provisional publisher just because the public API becomes READY
// between a read-only preflight and execution. Keep the existing explicit
// full-mode command unchanged for historically approved callers.
export function selectNineR54CliMode(args){
 if(args.length!==3||args[0]!=='--once'||args[1]!=='--publish')return null;
 if(args[2]==='--confirmed-only')return 'CONFIRMED_ONLY';
 if(args[2]==='--accept-anonymous-license-risk')return 'LEGACY_AUTO';
 return null;
}

export async function runNineR54CliMode(mode,input,{runConfirmed=runNineR54ConfirmedRecovery,
 runLegacy=runNineR54PublicConnect}={}){
 need(mode==='CONFIRMED_ONLY'||mode==='LEGACY_AUTO','CLI_MODE_INVALID');
 return mode==='CONFIRMED_ONLY'?runConfirmed(input):runLegacy(input);
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=selectNineR54CliMode(process.argv.slice(2));
 if(!mode){
  console.error('Usage: theme-nine-r54-public-connect.mjs --once --publish (--confirmed-only | --accept-anonymous-license-risk)');
  process.exitCode=2;
 }else{
  try{
   const report=await runNineR54CliMode(mode,{publisherConsent:true,
    dataRoot:process.env.ZGMINI_DATA_ROOT||'E:/ZGmini/data'});
   console.log(JSON.stringify(report,null,2));
   if(report.status==='D1_VERIFIED_AWAIT_PUBLIC_API_REFRESH')process.exitCode=3;
  }catch(error){
   console.error(JSON.stringify({status:'STOP_R54_PUBLIC_CONNECTION',
    error:error?.code??'R54_UNEXPECTED',
    stage:'NO_NEW_D1_WRITE_UNLESS_OUTCOME_UNKNOWN'}));
   process.exitCode=1;
  }
 }
}
