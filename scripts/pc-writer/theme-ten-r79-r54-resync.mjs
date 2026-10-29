// R79: Re-run ONLY the already-approved R54 publisher after the separately
// approved biotech R8 has updated the public provisional sidecar.
// No changes to source bars, rosters, formulas, jobs, or publication consent.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT='E:/ZGmini/data';
const API='https://zgmini.kr/api/theme-fear-greed/';
const REVISION='THEME_LEGACY_NINE_R37_PUBLIC_V1';
const SHA={
  'scripts/pc-writer/theme-nine-r51-provisional-overlay.mjs':
    'a769484b0606ca1f060e2938fb7c1b1a5a4747334b151bc99c448ba8c7f1200d',
  'worker/theme-nine-r37-public.mjs':
    'd10ce08c801d5f20918ffe4ce71b9b2c95b32cdbc068670a0d31d5fb8922e5c7',
};
const KST=new Intl.DateTimeFormat('en-GB',{
  timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23',
});

export function r79Plan({base,candidateDates=[],now=new Date()}={}){
  const clock=KST.format(now),[h,m]=clock.split(':').map(Number),minutes=h*60+m;
  if(minutes>=675&&minutes<=855)return {allowed:false,reason:'SCHEDULE_PROTECTION_WINDOW'};
  if(base?.status!=='READY'||!Array.isArray(base.themes)||base.themes.length!==10||
    !/^20\d\d-\d\d-\d\d$/.test(base.confirmedObservationDate??''))
    return {allowed:false,reason:'PUBLIC_BASE_NOT_READY'};
  const date=base.confirmedObservationDate;
  if(!candidateDates.includes(date))
    return {allowed:false,reason:'EXACT_DATED_PRIVATE_CANDIDATE_MISSING'};
  return {allowed:true,date,alreadyR37:base.modelRevision===REVISION};
}

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const candidateDates=dir=>fs.existsSync(dir)?fs.readdirSync(dir)
  .map(n=>n.match(/^THEME_NINE_R48_PRIVATE_CANDIDATE_(20\d\d-\d\d-\d\d)_[a-f0-9]{16}\.json$/)?.[1])
  .filter(Boolean):[];
const safe=x=>/^[A-Z0-9_]{3,100}$/.test(String(x??''))?String(x):'UNSPECIFIED';
const summary=b=>({status:b?.status??null,confirmedDate:b?.confirmedObservationDate??null,
  revision:b?.modelRevision??null,visibleThemes:b?.themes?.length??0,
  optional:(b?.themes??[]).filter(x=>
    ['바이오·신약','우주·위성','데이터센터·전력'].includes(x.theme))
    .map(x=>({theme:x.theme,last:x.history?.at(-1)?.date??null}))});
async function readPublic(fetchImpl=fetch){
  const url=API+'?r79='+Date.now()+Math.random();
  const res=await fetchImpl(url,{headers:{'cache-control':'no-cache'},
    signal:AbortSignal.timeout(20000)});
  if(!res.ok)throw Error('PUBLIC_API_HTTP_'+res.status);
  return res.json();
}
function latestStatus(folder){
  if(!fs.existsSync(folder))return null;
  const f=fs.readdirSync(folder).filter(n=>/^THEME_NINE_R54_CYCLE_\d+_\d+\.txt$/.test(n))
    .sort((a,b)=>fs.statSync(path.join(folder,b)).mtimeMs-fs.statSync(path.join(folder,a)).mtimeMs)[0];
  if(!f)return null;
  const content=fs.readFileSync(path.join(folder,f),'utf8');
  return {file:f,status:safe(content.match(/"status"\s*:\s*"([A-Z0-9_]+)"/)?.[1]),
    result:safe(content.match(/^RESULT=([A-Z0-9_]+)/m)?.[1])};
}

export async function runR79({root=ROOT,now=new Date(),fetchImpl=fetch,
  exec=(cmd)=>spawnSync('cmd.exe',['/d','/c',cmd],{encoding:'utf8',
    windowsHide:true,timeout:20*60*1000,maxBuffer:2*1024*1024}),
  platform=process.platform}={}){
  const result={report:'R79_EXISTING_APPROVED_R54_ONLY_AFTER_BIOTECH',
    inspectedAt:now.toISOString(),taskChanges:0,formulaChanges:0,
    newThemes:0,rawFallbacks:0,d1WritesByThisHelper:0};
  if(platform!=='win32'){result.status='STOP_WINDOWS_PC_REQUIRED';return result;}
  const before=await readPublic(fetchImpl);
  result.before=summary(before);
  const candidates=candidateDates(path.join(root,'themes','legacy-nine-r48-private-candidate'));
  const plan=r79Plan({base:before,candidateDates:candidates,now});
  result.gate=plan;
  if(!plan.allowed){result.status='STOP_PREFLIGHT';return result;}
  if(plan.alreadyR37){result.status='ALREADY_R37_PUBLIC_NO_WRITE';return result;}
  const home=path.join(root,'pc-writer','theme-nine-r54');
  const runner=path.join(home,'scripts','pc-writer','THEME_NINE_R54_PUBLIC_CYCLE.cmd');
  const consent=path.join(home,'PUBLISHER_CONSENT_R54.txt');
  const lock=path.join(root,'themes','legacy-nine-r35-delta','state','delta.lock');
  if(!fs.existsSync(runner)||!fs.existsSync(consent)||
    !fs.readFileSync(consent,'utf8').split(/\r?\n/)
      .includes('ACCEPT_R54_ANONYMOUS_DERIVED_RISK_20261028')||fs.existsSync(lock)){
    result.status='STOP_APPROVED_RUNNER_CONSENT_OR_PRIVATE_LOCK';return result;
  }
  for(const [relative,expected] of Object.entries(SHA)){
    const file=path.join(home,relative);
    if(!fs.existsSync(file)||sha(fs.readFileSync(file))!==expected){
      result.status='STOP_R78_INSTALLED_SHA_MISMATCH';result.file=relative;return result;
    }
  }
  const run=exec(runner);
  result.existingR54={exit:run.status??null,signal:run.signal??null,
    error:safe(run.error?.code),latestLog:latestStatus(path.join(home,'logs'))};
  if(run.status!==0){result.status='STOP_R54_EXIT_NOT_ZERO';return result;}
  let after=await readPublic(fetchImpl);
  for(let i=0;i<4&&after.modelRevision!==REVISION;i++){
    await new Promise(r=>setTimeout(r,2500));after=await readPublic(fetchImpl);
  }
  result.after=summary(after);
  result.status=after.modelRevision===REVISION&&after.confirmedObservationDate===plan.date?
    'R54_ONLY_PUBLIC_API_RESTORED_NEXT_REGULAR_PENDING':
    'STOP_PUBLIC_READBACK_MISMATCH';
  return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length!==3||process.argv[2]!=='--once')throw Error('USAGE');
    const result=await runR79();console.log(JSON.stringify(result,null,2));
    if(result.status.startsWith('STOP'))process.exitCode=1;
  }catch(error){
    console.log(JSON.stringify({report:'R79_EXISTING_APPROVED_R54_ONLY_AFTER_BIOTECH',
      status:'STOP_ERROR',reason:safe(error?.code??error?.message),
      taskChanges:0,formulaChanges:0,newThemes:0}));process.exitCode=1;
  }
}
