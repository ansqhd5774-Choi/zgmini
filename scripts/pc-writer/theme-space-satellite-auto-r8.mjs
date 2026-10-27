// R8 Space/Satellite: approved stored-only computation -> new D1 provisional key.
// Existing R32 confirmed key, ten-theme public key and all scheduler tasks remain untouched.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SPACE_SATELLITE_R2_PUBLIC_KEY} from '../../worker/theme-space-satellite-r2.mjs';
import {SPACE_PROVISIONAL_KEY,validSpaceProvisionalR1} from
 '../../worker/theme-space-satellite-provisional-r1.mjs';
import {buildSpaceProvisionalFromStorageR8} from './theme-space-satellite-provisional-r8.mjs';
import {spaceProvisionalD1R8} from './theme-space-satellite-provisional-d1-r8.mjs';
import {spaceSatelliteApprovedSevenTokenR31} from './theme-space-satellite-auth-r31.mjs';

const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
export async function runSpaceR8({dataRoot,allowPublish=false,
 db=null,dbFactory=spaceProvisionalD1R8,tokenFn=spaceSatelliteApprovedSevenTokenR31,
 build=buildSpaceProvisionalFromStorageR8,now=Date.now,publicRead=null}={}){
 const result={report:'SPACE_PROVISIONAL_AUTO_R8',status:'STARTED',providerCalls:0,
  confirmedD1Writes:0,d1Writes:0,otherThemeWrites:0,schedulerWrites:0};
 try{
  const store=db??await dbFactory({dataRoot,tokenFn,clock:now});
  const confirmed=(await store.read(SPACE_SATELLITE_R2_PUBLIC_KEY))?.body;
  need(confirmed?.status==='READY'&&confirmed.phase==='CONFIRMED'&&
   confirmed.version==='THEME_SPACE_SATELLITE_R2_PUBLIC_V1',
   'SPACE_R8_CONFIRMED_R32_D1_MISSING');
  const saved=await build({dataRoot,confirmed,now:now()});
  if(saved.status!=='PRIVATE_PROVISIONAL_CANDIDATE'){
   result.status=saved.status;
   return result;
  }
  const record=saved.record;
  const space={theme:'우주·위성',score:confirmed.score,history:confirmed.history};
  need(validSpaceProvisionalR1(record,space,{now:now(),storedAt:now()}),
   'SPACE_R8_PUBLIC_READER_VALIDATION_FAILED');
  result.confirmedDate=confirmed.observationDate;
  result.confirmedScore=confirmed.score;
  result.provisionalDate=record.observationDate;
  result.provisionalScore=record.points.at(-1).score;
  result.etfs=record.points.at(-1).etfs;
  result.sourceVersion=record.sourceVersion;
  if(!allowPublish){result.status='PRIVATE_VERIFIED_NOT_PUBLISHED';return result;}
  const old=await store.read(SPACE_PROVISIONAL_KEY);
  const written=await store.writeVersioned(SPACE_PROVISIONAL_KEY,record,old?.storedAt??null);
  result.d1Writes=written.changes;
  result.d1WriteStatus=written.status;
  const after=await store.read(SPACE_PROVISIONAL_KEY);
  need(after?.body?.sourceVersion===record.sourceVersion&&
   JSON.stringify(after.body.points)===JSON.stringify(record.points),
   'SPACE_R8_D1_AFTER_WRITE_READBACK_MISMATCH');
  result.status='D1_READBACK_VERIFIED_API_PENDING';
  if(typeof publicRead==='function'){
   const data=await publicRead();
   const p=data?.provisional?.points?.find(x=>x.date===record.observationDate);
   result.apiVisible=p?.scores?.['우주·위성']===result.provisionalScore;
   if(result.apiVisible)result.status='PUBLIC_API_VERIFIED';
  }
 }catch(error){
  result.status=result.d1Writes>0?'D1_WRITE_COMPLETED_FOLLOWUP_FAILED':'BLOCKED';
  result.reason=error.code??error.message??'UNKNOWN';
 }
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if((args.join(' ')!=='--once')&&(args.join(' ')!=='--once --publish')){
  console.error('Usage: theme-space-satellite-auto-r8.mjs --once [--publish]');
  process.exitCode=2;
 }else{
  const output=await runSpaceR8({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',
   allowPublish:args.includes('--publish')});
  console.log(JSON.stringify(output));
  if(!['PRIVATE_VERIFIED_NOT_PUBLISHED','D1_READBACK_VERIFIED_API_PENDING',
   'PUBLIC_API_VERIFIED','NO_NEW_VERIFIED_PROVISIONAL','UNCHANGED'].includes(output.status))
   process.exitCode=1;
 }
}
