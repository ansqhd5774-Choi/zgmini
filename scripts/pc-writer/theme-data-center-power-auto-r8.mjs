// R8: real archived prices -> R188 -> DC-only provisional key. No scheduler changes.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DC_POWER_PUBLIC_KEY,DC_POWER_PUBLIC_VERSION} from
 '../../worker/theme-data-center-power-r1.mjs';
import {DC_POWER_PROVISIONAL_KEY,validDcPowerProvisionalR1} from
 '../../worker/theme-data-center-power-provisional-r1.mjs';
import {buildDcProvisionalFromStorageR8} from './theme-data-center-power-provisional-r8.mjs';
import {dcPowerProvisionalD1R8} from './theme-data-center-power-provisional-d1-r8.mjs';
import {spaceSatelliteApprovedSevenTokenR31} from './theme-space-satellite-auth-r31.mjs';

const need=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
export async function runDcPowerR8({dataRoot,allowPublish=false,db=null,
 dbFactory=dcPowerProvisionalD1R8,tokenFn=spaceSatelliteApprovedSevenTokenR31,
 build=buildDcProvisionalFromStorageR8,now=Date.now,publicRead=null}={}){
 const result={report:'DC_POWER_PROVISIONAL_AUTO_R8',status:'STARTED',providerCalls:0,
  confirmedD1Writes:0,d1Writes:0,otherThemeWrites:0,schedulerWrites:0};
 try{
  const store=db??await dbFactory({dataRoot,tokenFn,clock:now});
  const confirmed=(await store.read(DC_POWER_PUBLIC_KEY))?.body;
  need(confirmed?.status==='READY'&&confirmed.phase==='CONFIRMED'&&
   confirmed.version===DC_POWER_PUBLIC_VERSION,'DC_R8_CONFIRMED_R3_D1_MISSING');
  const saved=await build({dataRoot,confirmed,now:now()});
  if(saved.status!=='PRIVATE_PROVISIONAL_CANDIDATE'){
   result.status=saved.status;return result;
  }
  const record=saved.record;
  const dc={theme:'데이터센터·전력',etfs:confirmed.etfs,
   score:confirmed.score,history:confirmed.history};
  need(validDcPowerProvisionalR1(record,dc,{now:now(),storedAt:now()}),
   'DC_R8_PUBLIC_READER_VALIDATION_FAILED');
  result.confirmedDate=confirmed.observationDate;
  result.confirmedScore=confirmed.score;
  result.provisionalDate=record.observationDate;
  result.provisionalScore=record.points.at(-1).score;
  result.etfs=['DTCR','GRID'];
  result.sourceVersion=record.sourceVersion;
  if(!allowPublish){result.status='PRIVATE_VERIFIED_NOT_PUBLISHED';return result;}
  const before=await store.read(DC_POWER_PROVISIONAL_KEY);
  const written=await store.writeVersioned(DC_POWER_PROVISIONAL_KEY,record,before?.storedAt??null);
  result.d1Writes=written.changes;
  result.d1WriteStatus=written.status;
  const after=await store.read(DC_POWER_PROVISIONAL_KEY);
  need(after?.body?.sourceVersion===record.sourceVersion&&
   JSON.stringify(after.body.points)===JSON.stringify(record.points),
   'DC_R8_D1_AFTER_WRITE_READBACK_MISMATCH');
  result.status='D1_READBACK_VERIFIED_API_PENDING';
  if(typeof publicRead==='function'){
   const data=await publicRead();
   const point=data?.provisional?.points?.find(x=>x.date===record.observationDate);
   result.apiVisible=point?.scores?.['데이터센터·전력']===result.provisionalScore;
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
 if(args.join(' ')!=='--once'&&args.join(' ')!=='--once --publish'){
  console.error('Usage: theme-data-center-power-auto-r8.mjs --once [--publish]');
  process.exitCode=2;
 }else{
  const result=await runDcPowerR8({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',
   allowPublish:args.includes('--publish')});
  console.log(JSON.stringify(result));
  if(!['PRIVATE_VERIFIED_NOT_PUBLISHED','D1_READBACK_VERIFIED_API_PENDING',
   'PUBLIC_API_VERIFIED','NO_NEW_VERIFIED_PROVISIONAL'].includes(result.status))process.exitCode=1;
 }
}
