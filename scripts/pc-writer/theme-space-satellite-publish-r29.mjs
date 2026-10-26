// Dedicated space/satellite PC saved-score -> conditional D1 -> public readback.
// Only explicit --publish writes its NEW feed key. No old theme key/task changes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runApprovedSpacePcR28} from './theme-space-satellite-operational-r28.mjs';
import {buildSpaceSatellitePublicR29} from './theme-space-satellite-public-r29.mjs';
import {spaceSatelliteD1R29} from './theme-space-satellite-d1-r29.mjs';
import {biotechCloudflareTokenR7} from './theme-biotech-auth-r7.mjs';
import {SPACE_SATELLITE_PUBLIC_KEY} from '../../worker/theme-space-satellite-r1.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};

export function saveSpaceDerivedR29(dataRoot,candidate){
 need(typeof dataRoot==='string'&&fs.existsSync(dataRoot)&&
  candidate?.report==='SPACE_SATELLITE_R28_PC_SAVED_SOURCE_ONLY',
 'SPACE_R29_DERIVED_INPUT_INVALID');
 const home=fs.realpathSync(path.join(dataRoot,'themes','space-satellite'));
 const derived=path.join(home,'derived');
 fs.mkdirSync(derived,{recursive:true});
 const actual=fs.realpathSync(derived),rel=path.relative(home,actual);
 need(rel==='derived','SPACE_R29_DERIVED_PATH_ESCAPE');
 const bytes=Buffer.from(JSON.stringify(candidate)+'\n','utf8');
 const digest=hash(bytes),relative=`themes/space-satellite/derived/space-satellite-r29-${digest}.json`;
 const file=path.join(derived,`space-satellite-r29-${digest}.json`);
 if(!fs.existsSync(file))fs.writeFileSync(file,bytes,{flag:'wx'});
 need(hash(fs.readFileSync(file))===digest,'SPACE_R29_DERIVED_READBACK_MISMATCH');
 return {relativePath:relative,sha256:digest};
}

export async function readSpaceCoreR29({fetchImpl=fetch,now=Date.now()}={}){
 const response=await fetchImpl(`https://zgmini.kr/api/theme-fear-greed/?space_r29=${now}`,{
  headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000),redirect:'error'});
 need(response.ok,'SPACE_R29_CORE_API_HTTP_'+response.status);
 const base=await response.json();
 need(base?.status==='READY'&&Array.isArray(base.themes)&&base.themes.length>=7&&
  base.themes.slice(0,7).every(item=>item.history?.length===252),
 'SPACE_R29_CORE_API_NOT_READY');
 return base;
}

export async function runSpacePublishR29({dataRoot,allowPublish=false,
 pcAudit=runApprovedSpacePcR28,save=saveSpaceDerivedR29,
 publicRead=readSpaceCoreR29,d1=null,
 tokenFn=biotechCloudflareTokenR7,now=Date.now}={}){
 const report={report:'SPACE_SATELLITE_R29_PC_PUBLICATION',
  status:'STARTED',providerCalls:0,d1Writes:0,publicWrites:0,schedulerWrites:0};
 try{
  const candidate=pcAudit({dataRoot});
  report.observationDate=candidate.scoreAsOf;
  report.score=candidate.latest?.score??null;
  report.scoredDays=candidate.scoredDays;
  report.selectedEtfs=candidate.etfs;
  report.sourceManifestSha256=candidate.sourceManifestSha256;
  need(candidate.status==='PRIVATE_CURRENT_APPROVED_BASKET_READY'&&
   candidate.publicationCompleted===false&&candidate.history?.length===252&&
   candidate.scoredDays>0&&candidate.scoredDays<=252&&
   candidate.scoredDays===candidate.history.filter(row=>
    typeof row?.score==='number'&&Number.isFinite(row.score)).length,
   'SPACE_R29_PC_SCORE_NOT_COMPLETE');
  const artifact=save(dataRoot,candidate);
  report.derivedArtifact=artifact.relativePath;
  report.candidateFileSha256=artifact.sha256;
  if(!allowPublish){report.status='PRIVATE_CANDIDATE_SAVED_NOT_PUBLISHED';return report;}
  const base=await publicRead({now:now()});
  const record=buildSpaceSatellitePublicR29({candidate,base,
   candidateFileSha256:artifact.sha256,allowPublish:true,now:now()});
  const store=d1??spaceSatelliteD1R29({dataRoot,tokenFn,clock:now});
  const existing=await store.read(SPACE_SATELLITE_PUBLIC_KEY);
  const written=await store.writeVersioned(SPACE_SATELLITE_PUBLIC_KEY,record,
   existing?.storedAt??null);
  report.d1Writes=written.changes;
  report.d1WriteStatus=written.status;
  const verify=await store.read(SPACE_SATELLITE_PUBLIC_KEY);
  need(verify?.body?.candidateFileSha256===artifact.sha256&&
   verify.body.score===record.score&&
   verify.body.observationDate===record.observationDate,
  'SPACE_R29_AFTER_WRITE_READBACK_MISMATCH');
  const after=await publicRead({now:now()});
  const visible=after.themes.find(row=>row.theme==='우주·위성');
  const match=visible&&visible.score===record.score&&
   visible.etfs?.join(',')===record.etfs.join(',')&&
   visible.history?.length===252;
  report.status=match?'PUBLIC_API_VERIFIED':'D1_VERIFIED_PUBLIC_API_PENDING';
  report.publicApiVisible=Boolean(match);
  report.publicWrites=written.changes;
 }catch(error){
  report.status=report.d1Writes>0?'D1_WRITE_SUCCEEDED_FOLLOWUP_FAILED':'STOPPED';
  report.reason=error.code??error.message;
 }
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args[0]!=='--once'||args.length>2||args.slice(1).some(arg=>arg!=='--publish')){
  console.log('Usage: theme-space-satellite-publish-r29.mjs --once [--publish]');
  process.exitCode=2;
 }else{
  const report=await runSpacePublishR29({
   dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',
   allowPublish:args.includes('--publish')});
  console.log(JSON.stringify(report));
  if(!['PRIVATE_CANDIDATE_SAVED_NOT_PUBLISHED','PUBLIC_API_VERIFIED',
   'D1_VERIFIED_PUBLIC_API_PENDING'].includes(report.status))process.exitCode=1;
 }
}
