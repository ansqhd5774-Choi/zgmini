// The same single biotech scheduler first runs the already approved R7
// confirmed lane, then optionally appends a verified secondary provisional
// score. No seven-theme collect/calculate/publish file is invoked or edited.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startBiotechR7} from './theme-biotech-auto-r7.mjs';
import {biotechCloudflareTokenR7} from './theme-biotech-auth-r7.mjs';
import {biotechProvisionalD1R8} from './theme-biotech-provisional-d1-r8.mjs';
import {BIOTECH_PROVISIONAL_KEY,buildBiotechProvisionalFromStorageR8} from './theme-biotech-provisional-r8.mjs';
import {validBiotechProvisionalR1} from '../../worker/theme-biotech-provisional-r1.mjs';

export async function runBiotechR8({dataRoot,allowCollect=false,allowPublish=false,
 r7=startBiotechR7,db=biotechProvisionalD1R8({dataRoot,tokenFn:biotechCloudflareTokenR7}),
 build=buildBiotechProvisionalFromStorageR8,now=Date.now}={}){
 const output={report:'BIOTECH_AUTO_R8',status:'STARTED',providerCalls:0,d1Writes:0,
  publicWrites:0,existingSevenTaskChanges:0,originalConfirmedHistoryWrites:0};
 try{
  const first=await r7({dataRoot,allowCollect,allowPublish});
  output.r7Status=first.status;output.providerCalls=first.providerCalls??0;
  if(!['PUBLIC_API_VERIFIED','NO_NEW_CONFIRMED_SESSION','UNCHANGED_NO_WRITE',
   'D1_READBACK_VERIFIED_PUBLIC_READER_PENDING','PRIVATE_CANDIDATE_SAVED_NOT_PUBLISHED'].includes(first.status)){
   output.status='R7_CONFIRMED_STAGE_STOPPED';output.reason=first.reason??first.status;return output;
  }
  const current=await db.read('theme-biotech-optional-r2');
  if(current?.body?.status!=='READY'){
   output.status='NO_CONFIRMED_R2_PUBLISHED';return output;
  }
  const confirmed=current.body;
  const result=await build({dataRoot,confirmed,now:now()});
  if(result.status!=='PRIVATE_PROVISIONAL_CANDIDATE'){
   output.status=result.status;return output;
  }
  if(!validBiotechProvisionalR1(result.record,{theme:'바이오·신약',
   score:confirmed.score,history:confirmed.history},{now:now(),storedAt:now()})){
   output.status='R8_PROVISIONAL_PUBLIC_CONTRACT_REJECTED';return output;
  }
  output.observationDate=result.record.observationDate;
  output.provisionalPoints=result.points.length;
  if(!allowPublish){output.status='PRIVATE_PROVISIONAL_VERIFIED_NOT_PUBLISHED';return output;}
  const prior=await db.read(BIOTECH_PROVISIONAL_KEY);
  const saved=await db.writeVersioned(BIOTECH_PROVISIONAL_KEY,result.record,prior?.storedAt??null);
  output.d1Writes=saved.changes;output.publicWrites=saved.changes;
  output.status=saved.status==='WRITTEN'?'R8_D1_READBACK_VERIFIED_API_PENDING':'UNCHANGED_NO_WRITE';
  return output;
 }catch(error){output.status='R8_PROVISIONAL_STAGE_STOPPED';output.reason=error?.code??'R8_UNCLASSIFIED';return output;}
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);
 if(args[0]!=='--once'||args.slice(1).some(s=>!['--collect','--publish'].includes(s))||
  new Set(args).size!==args.length){
  console.log('Usage: theme-biotech-auto-r8.mjs --once [--collect] [--publish]');process.exitCode=2;
 }else{
  const outcome=await runBiotechR8({dataRoot:process.env.ZGMINI_DATA_ROOT??'E:/ZGmini/data',
   allowCollect:args.includes('--collect'),allowPublish:args.includes('--publish')});
  console.log(JSON.stringify(outcome));
  if(['R7_CONFIRMED_STAGE_STOPPED','R8_PROVISIONAL_STAGE_STOPPED',
   'R8_PROVISIONAL_PUBLIC_CONTRACT_REJECTED'].includes(outcome.status))process.exitCode=1;
 }
}
