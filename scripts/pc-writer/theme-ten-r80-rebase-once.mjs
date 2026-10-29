// R80: one-file, pinned fix for the existing R54 writer's same-day D1 CAS.
// Does NOT change schedules, rosters, scores, formulas, raw input or consent.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DATA='E:/ZGmini/data';
const NODE='E:/ZGmini/runtime/node.exe';
const HOME=path.join(DATA,'pc-writer','theme-nine-r54');
const API='https://zgmini.kr/api/theme-fear-greed/';
const VERSION='THEME_LEGACY_NINE_R37_PUBLIC_V1';
const PATCH='scripts/pc-writer/theme-nine-r48-d1-publication.mjs';
const WAS='d6391dd2653889e5e72dcac42c0503ef9064d85c714f53be6e8021eada80d1f9';
const NOW='7a10fe41710dbc1a21c9f3e343c538cd96b6c5695b683f04dce48af85ede6e7e';
const SHA={
 'scripts/pc-writer/theme-nine-r51-provisional-overlay.mjs':
  'a769484b0606ca1f060e2938fb7c1b1a5a4747334b151bc99c448ba8c7f1200d',
 'worker/theme-nine-r37-public.mjs':
  'd10ce08c801d5f20918ffe4ce71b9b2c95b32cdbc068670a0d31d5fb8922e5c7',
};
const KST=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',
  hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const sha=b=>createHash('sha256').update(b).digest('hex');
const safe=x=>/^[A-Z0-9_]{3,110}$/.test(String(x??''))?String(x):'UNSPECIFIED';

export function r80Plan({base,candidates=[],now=new Date()}={}){
 const [h,m]=KST.format(now).split(':').map(Number),mins=h*60+m;
 if(mins>=655&&mins<=875)return {allowed:false,reason:'SCHEDULE_PROTECTION_WINDOW'};
 if(base?.status!=='READY'||base.themes?.length!==10||
  !/^20\d\d-\d\d-\d\d$/.test(base.confirmedObservationDate??''))
  return {allowed:false,reason:'PUBLIC_BASE_NOT_READY'};
 if(base.modelRevision===VERSION)return {allowed:false,reason:'ALREADY_R37_PUBLIC'};
 const date=base.confirmedObservationDate;
 if(!candidates.includes(date))return {allowed:false,reason:'DATED_R48_CANDIDATE_MISSING'};
 return {allowed:true,date};
}

const candidateDates=folder=>fs.existsSync(folder)?fs.readdirSync(folder)
 .map(x=>x.match(/^THEME_NINE_R48_PRIVATE_CANDIDATE_(20\d\d-\d\d-\d\d)_[a-f0-9]{16}\.json$/)?.[1])
 .filter(Boolean):[];
async function publicApi(fetchImpl){
 const r=await fetchImpl(API+'?r80='+Date.now()+Math.random(),{
  headers:{'cache-control':'no-cache',accept:'application/json'},
  signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('PUBLIC_API_HTTP_'+r.status);
 return r.json();
}
function summary(b){return {status:b?.status??null,date:b?.confirmedObservationDate??null,
  revision:b?.modelRevision??null,visible:b?.themes?.length??0,
  optional:(b?.themes??[]).filter(t=>
   ['바이오·신약','우주·위성','데이터센터·전력'].includes(t.theme))
   .map(t=>({theme:t.theme,last:t.history?.at(-1)?.date??null}))};}
function latestR54(folder){
 if(!fs.existsSync(folder))return null;
 const name=fs.readdirSync(folder).filter(n=>/^THEME_NINE_R54_CYCLE_\d+_\d+\.txt$/.test(n))
  .sort((a,b)=>fs.statSync(path.join(folder,b)).mtimeMs-fs.statSync(path.join(folder,a)).mtimeMs)[0];
 if(!name)return null;
 const t=fs.readFileSync(path.join(folder,name),'utf8');
 const field=k=>safe(t.match(new RegExp('"'+k+'"\\s*:\\s*"([A-Z0-9_]+)"'))?.[1]);
 const count=t.match(/"d1Writes"\s*:\s*(\d+)/)?.[1];
 return {file:name,modifiedAt:fs.statSync(path.join(folder,name)).mtimeMs,
  status:field('status'),dbStatus:field('dbStatus'),
  d1Writes:count===undefined?null:Number(count),
  publicScoresMatched:t.match(/"publicScoresMatched"\s*:\s*(true|false)/)?.[1]??null};
}
export function pinnedInstall({home=HOME,payload=HERE}={}){
 const root=fs.realpathSync(home);
 const dest=path.resolve(root,PATCH),src=path.resolve(payload,PATCH);
 if(!dest.startsWith(root+path.sep)||fs.lstatSync(dest).isSymbolicLink()||
  fs.realpathSync(dest)!==dest||!fs.statSync(dest).isFile())throw Error('R80_UNSAFE_INSTALL_PATH');
 const bytes=fs.readFileSync(src);
 if(sha(bytes)!==NOW)throw Error('R80_PACKAGE_SHA_MISMATCH');
 const installed=sha(fs.readFileSync(dest));
 if(installed!==WAS&&installed!==NOW)throw Error('R80_UNAPPROVED_INSTALLED_SHA');
 if(installed===NOW)return {status:'R80_PATCH_ALREADY_VERIFIED',changed:0};
 const backup=dest+'.R80_BACKUP',stage=dest+'.R80_STAGED';
 if(fs.existsSync(stage))throw Error('R80_STAGED_COLLISION');
 if(fs.existsSync(backup))throw Error('R80_BACKUP_EXISTS_REVIEW');
 fs.writeFileSync(stage,bytes,{flag:'wx'});
 if(sha(fs.readFileSync(stage))!==NOW)throw Error('R80_STAGED_SHA_MISMATCH');
 fs.renameSync(dest,backup);
 try{
  fs.renameSync(stage,dest);
  if(sha(fs.readFileSync(dest))!==NOW)throw Error('R80_INSTALLED_SHA_MISMATCH');
 }catch(err){if(!fs.existsSync(dest))fs.renameSync(backup,dest);throw err;}
 return {status:'R80_ONE_FILE_INSTALLED_SHA_VERIFIED',changed:1};
}
export async function runR80({fetchImpl=fetch,now=new Date(),platform=process.platform,
 execute=runner=>spawnSync('cmd.exe',['/d','/c',runner],{
  encoding:'utf8',windowsHide:true,timeout:20*60*1000,maxBuffer:2*1024*1024})}={}){
 const result={report:'R80_R54_SAME_DATE_LEGACY_PROVISIONAL_CAS_REPAIR',
  inspectedAt:now.toISOString(),taskChanges:0,formulaChanges:0,
  newThemes:0,rawFallbacks:0};
 if(platform!=='win32'){result.status='STOP_WINDOWS_PC_REQUIRED';return result;}
 const before=await publicApi(fetchImpl);result.before=summary(before);
 const gate=r80Plan({base:before,now,candidates:candidateDates(path.join(DATA,
  'themes','legacy-nine-r48-private-candidate'))});result.gate=gate;
 if(!gate.allowed){result.status='STOP_PREFLIGHT';return result;}
 const consent=path.join(HOME,'PUBLISHER_CONSENT_R54.txt');
 const runner=path.join(HOME,'scripts','pc-writer','THEME_NINE_R54_PUBLIC_CYCLE.cmd');
 const lock=path.join(DATA,'themes','legacy-nine-r35-delta','state','delta.lock');
 if(!fs.existsSync(NODE)||!fs.existsSync(runner)||fs.existsSync(lock)||
  !fs.existsSync(consent)||!fs.readFileSync(consent,'utf8').split(/\r?\n/)
    .includes('ACCEPT_R54_ANONYMOUS_DERIVED_RISK_20261028')){
   result.status='STOP_APPROVED_NODE_RUNNER_CONSENT_OR_PRIVATE_LOCK';return result;
 }
 for(const [name,expected] of Object.entries(SHA)){
  const f=path.join(HOME,name);
  if(!fs.existsSync(f)||sha(fs.readFileSync(f))!==expected){
   result.status='STOP_R78_SHA_DRIFT';result.source=name;return result;
  }
 }
 result.patch=pinnedInstall();
 const start=Date.now();
 const exec=execute(runner);result.existingR54={exit:exec.status??null,
  error:safe(exec.error?.code),latestLog:latestR54(path.join(HOME,'logs'))};
 let after=await publicApi(fetchImpl);
 for(let i=0;i<4&&after.modelRevision!==VERSION;i++){
  await new Promise(resolve=>setTimeout(resolve,2500));after=await publicApi(fetchImpl);
 }
 result.after=summary(after);
 const log=result.existingR54.latestLog;
 const r54Outcome=exec.status===0||
  (exec.status===1&&log?.status==='D1_VERIFIED_AWAIT_PUBLIC_API_REFRESH'&&
   log.d1Writes===1);
 result.existingR54.newLogVerified=log?.modifiedAt>=start-2000;
 result.status=r54Outcome&&result.existingR54.newLogVerified&&
  after.modelRevision===VERSION&&
  after.confirmedObservationDate===gate.date&&after.themes?.length===10?
  'R80_PUBLIC_R37_VERIFIED_NEXT_REGULAR_PENDING':
  'STOP_OR_PENDING_REVIEW_EXISTING_R54_AND_PUBLIC_READBACK';
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==5||process.argv.slice(2).join(' ')!=='--once --repair --publish')
   throw Error('USAGE');
  const result=await runR80();console.log(JSON.stringify(result,null,2));
  if(!result.status.startsWith('R80_PUBLIC_R37_VERIFIED'))process.exitCode=1;
 }catch(error){console.log(JSON.stringify({report:'R80_R54_SAME_DATE_LEGACY_PROVISIONAL_CAS_REPAIR',
  status:'STOP_R80',reason:safe(error.code??error.message),taskChanges:0,
  formulaChanges:0,newThemes:0}));process.exitCode=1;}
}
