// W03 approved one-shot PC-local GMH private calculation adapter.
// This module never contacts a provider or public D1, and writes only via
// the established immutable private derived writer after 1,764-point parity.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {calculateFromSavedGmhSeven} from './theme-gmh-seven-saved-input-r1.mjs';
import {computeSevenGmh,saveSevenPrivateCandidate,DATA_SCHEMA,HOME}
 from './theme-seven-gmh-history-r1.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const stop=code=>{throw Object.assign(Error('W03_PC_PARITY_'+code),
 {code:'W03_PC_PARITY_'+code});};
const need=(ok,code)=>{if(!ok)stop(code);};
function readInside(base,rel,max){
 need(typeof rel==='string'&&rel.length<220&&
  !path.isAbsolute(rel)&&!rel.split('/').some(x=>!x||x==='.'||x==='..'),
  'PATH_SCOPE');
 const root=fs.realpathSync.native(base);
 const file=path.join(root,...rel.split('/'));
 const stat=fs.lstatSync(file),actual=fs.realpathSync.native(file);
 const relative=path.relative(root,actual);
 need(stat.isFile()&&!stat.isSymbolicLink()&&
  relative!==''&&relative!=='..'&&!relative.startsWith('..'+path.sep)&&
  !path.isAbsolute(relative)&&stat.size>0&&stat.size<=max,
  'PATH_OR_SIZE_STOP');
 const bytes=fs.readFileSync(file);
 const post=fs.lstatSync(file);
 need(bytes.length===stat.size&&post.size===stat.size&&
  post.mtimeMs===stat.mtimeMs&&!post.isSymbolicLink(),
  'FILE_READ_DRIFT');
 return bytes;
}
const EXPECTED=/^raw\/(SPY|BOTZ|ROBO|SKYY|CLOU|DRIV|NLR|URA|ITA|SHLD|FINX|ARKF|CIBR|BUG)_[a-f0-9]{64}\.jsonl$/;
export function readPcSavedGmhSeven({dataRoot}={}){
 need(typeof dataRoot==='string'&&path.isAbsolute(dataRoot),
  'DATA_ROOT_REQUIRED');
 const root=fs.realpathSync.native(dataRoot);
 const home=path.join(root,...HOME.split('/'));
 const canonical=fs.realpathSync.native(home);
 need(path.relative(root,canonical)!==''&&
  !path.relative(root,canonical).startsWith('..')&&
  !path.isAbsolute(path.relative(root,canonical)),
  'DATA_HOME_ESCAPE');
 const manifestBytes=readInside(canonical,'raw-manifest.json',4_000_000);
 let manifest;
 try{manifest=JSON.parse(manifestBytes.toString('utf8'));}
 catch{stop('MANIFEST_JSON');}
 need(manifest?.schema===DATA_SCHEMA&&
  /^\d{4}-\d\d-\d\d$/.test(manifest.start??'')&&
  /^\d{4}-\d\d-\d\d$/.test(manifest.end??'')&&
  Array.isArray(manifest.files)&&manifest.files.length>=14&&
  manifest.files.length<=256,'MANIFEST_SHAPE');
 const windowId=hash(DATA_SCHEMA+':'+manifest.start+':'+manifest.end)
  .slice(0,16);
 const checkpointBytes=readInside(canonical,
  'state/manual-'+windowId+'.json',2_000_000);
 const rawPages=manifest.files.map(entry=>{
  need(EXPECTED.test(entry?.path??''),'MANIFEST_RAW_PATH');
  return {path:entry.path,bytes:readInside(canonical,entry.path,6_000_000)};
 });
 return {manifestBytes,manifestSha256:hash(manifestBytes),
  checkpointBytes,checkpointSha256:hash(checkpointBytes),
  rawPages};
}
export function compareSavedGmhSeven({dataRoot,asOf,save=false}={}){
 need(typeof asOf==='string'&&Number.isFinite(Date.parse(asOf)),
  'COMPUTED_AT_REQUIRED');
 const input=readPcSavedGmhSeven({dataRoot});
 const newer=calculateFromSavedGmhSeven({...input,asOf});
 const legacy=computeSevenGmh({dataRoot});
 need(newer.rawManifestSha256===legacy.rawManifestSha256&&
  newer.commonSessions===legacy.commonSessionCount&&
  newer.observationDate===legacy.observationDate&&
  newer.themes.length===7&&legacy.themes.length===7,
  'MANIFEST_OR_SERIES_MISMATCH');
 let matched=0;
 for(const item of legacy.themes){
  const peer=newer.themes.find(x=>x.theme===item.theme);
  need(peer&&peer.etfs.join('|')===item.etfs.join('|')&&
   item.history.length===252&&peer.days.length===252,
   'THEME_PAIR_MISMATCH');
  for(let i=0;i<252;i++){
   need(item.history[i].date===peer.days[i].date&&
    item.history[i].score===peer.days[i].score,
    'DERIVED_SCORE_MISMATCH');
   matched++;
  }
 }
 need(matched===1764&&legacy.publicationAuthorized===false&&
  legacy.derivedLicenseVerified===false&&
  legacy.upstreamCommercialRightsVerified===false&&
  newer.publicationAuthorized===false&&
  newer.derivedLicenseVerified===false&&
  newer.upstreamCommercialRightsVerified===false,
  'PRIVATE_RIGHTS_OR_COUNT_STOP');
 const saved=save?saveSevenPrivateCandidate(dataRoot,legacy):null;
 need(!save||saved&&['EXISTING_IDENTICAL','PRIVATE_CANDIDATE_SAVED']
  .includes(saved.status)&&/^[a-f0-9]{64}$/.test(saved.sha256),
  'PRIVATE_SAVED_READBACK');
 return Object.freeze({
  schema:'ZGMINI_W03_GMH_SEVEN_PC_PARITY_V1',
  status:'PRIVATE_GMH_7X252_PARITY_VERIFIED_NOT_PUBLISHED',
  sourceProvider:'GETMARKETHISTORY_1H_PRIVATE',
  observationDate:legacy.observationDate,
  commonSessionCount:legacy.commonSessionCount,
  historyPoints:matched,rawPagesVerified:input.rawPages.length,
  rawManifestSha256:input.manifestSha256,
  checkpointSha256:input.checkpointSha256,
  privateArtifactSha256:saved?.sha256??null,
  localSaved:Boolean(saved),
  providerCalls:0,d1Writes:0,publicWrites:0,schedulerWrites:0,
  publicationAuthorized:false,upstreamCommercialRightsVerified:false,
  derivedLicenseVerified:false,
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const flag=process.argv[2];
  need(flag==='--pc-private-score-once','CLI_SCOPE_STOP');
  const dataRoot=process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data';
  const result=compareSavedGmhSeven({dataRoot,asOf:new Date().toISOString(),
   save:true});
  process.stdout.write(JSON.stringify(result)+'\n');
 }catch(e){
  process.stderr.write(/^W03_(?:PC_PARITY|SAVED|GMH)_[A-Z0-9_]+$/.test(e?.code??'')?
   e.code+'\n':'W03_PC_PARITY_UNCLASSIFIED_STOP\n');
  process.exitCode=1;
 }
}
