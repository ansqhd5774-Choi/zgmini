// Same bounded PC-only collect -> SHA manifest -> R188 score path as the
// other optional ETF themes. Never updates another theme, D1, or schedules.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectOptional} from './theme-optional-collect.mjs';
import {inspectManifest} from './theme-data-inventory.mjs';
import {calculateDataCenterPower,saveDataCenterPower} from './theme-data-center-power-r1.mjs';

const THEME='data-center-power';
const SYMBOLS=['DTCR','GRID','SPY'];
const fail=code=>{throw Object.assign(new Error(code),{code});};
const need=(condition,code)=>{if(!condition)fail(code);};
const validDate=date=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&
 Number.isFinite(Date.parse(date+'T00:00:00Z'));

export function dcPowerCollectionWindow(manifest,now=Date.now()){
 need(manifest?.version===1&&manifest.themeId===THEME&&Array.isArray(manifest.files),
  'DC_POWER_R2_MANIFEST_INVALID');
 const latest=SYMBOLS.map(symbol=>manifest.files.filter(entry=>
  entry.path?.startsWith('raw/'+symbol+'_')&&validDate(entry.observationThrough))
  .map(entry=>entry.observationThrough).sort().at(-1));
 need(latest.every(validDate),'DC_POWER_R2_INITIAL_BACKFILL_REQUIRED');
 const earliest=[...latest].sort()[0];
 const start=new Date(Date.parse(earliest+'T00:00:00Z')-6*86400000).toISOString().slice(0,10);
 const end=new Date(now).toISOString().slice(0,10);
 need(validDate(end)&&start<=end&&end<='2028-12-31','DC_POWER_R2_CALENDAR_REVALIDATION_REQUIRED');
 return {start,end};
}

export async function runDcPowerCycleR2({dataRoot,allowCollect=false,allowPublish=false,
 collector=collectOptional,inspect=inspectManifest,calculate=calculateDataCenterPower,
 save=saveDataCenterPower,now=Date.now}={}){
 const report={report:'DATA_CENTER_POWER_R2_PC_CYCLE',status:'STARTED',themeId:THEME,
  providerCalls:0,publicWrites:0,d1Writes:0,schedulerWrites:0,reason:null};
 try{
  // Publication requires separately approved source rights, D1 CAS and public
  // readback. This private entrypoint cannot authorize or perform any of them.
  need(allowPublish!==true,'DC_POWER_R2_PUBLICATION_GATE_NOT_VERIFIED');
  need(typeof dataRoot==='string'&&fs.existsSync(dataRoot),'DC_POWER_R2_DATA_ROOT_UNAVAILABLE');
  const manifestPath=path.join(dataRoot,'themes',THEME,'raw-manifest.json');
  need(fs.existsSync(manifestPath),'DC_POWER_R2_INITIAL_BACKFILL_REQUIRED');
  need(inspect(dataRoot,'themes/'+THEME+'/raw-manifest.json',THEME).status==='SHA_VERIFIED',
   'DC_POWER_R2_MANIFEST_SHA_INVALID');
  const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if(allowCollect){
   const window=dcPowerCollectionWindow(manifest,now());
   const collected=await collector({dataRoot,themeId:THEME,...window,maxRequests:4});
   report.providerCalls=collected.providerCalls??0;
   if(collected.status!=='PRIVATE_RAW_COLLECTION_COMPLETE'){
    report.status=collected.status==='CHECKPOINT_READY_TO_RESUME'?'COLLECTION_RESUME_NEEDED':'COLLECTION_STOPPED';
    report.reason=collected.status;return report;
   }
   need(inspect(dataRoot,'themes/'+THEME+'/raw-manifest.json',THEME).status==='SHA_VERIFIED',
    'DC_POWER_R2_AFTER_COLLECT_SHA_INVALID');
  }
  const candidate=calculate({dataRoot});
  need(candidate?.status==='PRIVATE_CANDIDATE_NOT_PUBLISHED'&&candidate.themeId===THEME&&
   candidate.history?.length===252&&candidate.publicationAuthorized===false&&
   candidate.d1Writes===0&&candidate.publicWrites===0,'DC_POWER_R2_CANDIDATE_INVALID');
  report.artifact=save(dataRoot,candidate);
  report.observationDate=candidate.observationDate;
  report.score=candidate.score;
  report.commonSessions=candidate.commonSessions;
  report.status='PRIVATE_CANDIDATE_VERIFIED_NOT_PUBLISHED';
 }catch(error){report.status='BLOCKED';report.reason=error?.code??'DC_POWER_R2_UNKNOWN_ERROR';}
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 const valid=args[0]==='--once'&&args.slice(1).every(arg=>arg==='--collect')&&
  args.length<=2;
 if(!valid){console.log('Usage: theme-data-center-power-cycle-r2.mjs --once [--collect] (private PC score only)');process.exitCode=2;}
 else{
  const report=await runDcPowerCycleR2({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',
   allowCollect:args.includes('--collect')});
  console.log(JSON.stringify(report));
  if(!['PRIVATE_CANDIDATE_VERIFIED_NOT_PUBLISHED'].includes(report.status))process.exitCode=1;
 }
}
