// R77: PC one-time approved publisher retry, without new task/config/formula.
// Expected date, private candidate and public base must agree exactly.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT='E:/ZGmini/data';
const API='https://zgmini.kr/api/theme-fear-greed/';
const VERSION='THEME_LEGACY_NINE_R37_PUBLIC_V1';
const KST=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',hour:'2-digit',
 minute:'2-digit',hourCycle:'h23'});
export function publicationPlan({publicBase,candidateDates,now=new Date()}={}){
 const tm=KST.format(now),mins=Number(tm.slice(0,2))*60+Number(tm.slice(3,5));
 if(mins>=675&&mins<=855)return {allowed:false,reason:'SCHEDULE_PROTECTION_WINDOW'};
 if(publicBase?.status!=='READY'||!/^20\d\d-\d\d-\d\d$/.test(publicBase?.confirmedObservationDate??''))
  return {allowed:false,reason:'PUBLIC_BASE_NOT_READY'};
 const d=publicBase.confirmedObservationDate;
 if(!candidateDates.includes(d))return {allowed:false,reason:'EXACT_DATED_PRIVATE_CANDIDATE_MISSING'};
 return {allowed:true,date:d,alreadyR37:publicBase.modelRevision===VERSION};
}
async function getPublic(fetchImpl=fetch){
 const r=await fetchImpl(`${API}?r77=${Date.now()}`,{headers:{'cache-control':'no-cache'},
  signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('PUBLIC_API_HTTP_'+r.status);
 return await r.json();
}
const summaries=b=>({status:b?.status??null,confirmedDate:b?.confirmedObservationDate??null,
 revision:b?.modelRevision??null,
 optional:(b?.themes??[]).filter(t=>['우주·위성','바이오·신약','데이터센터·전력'].includes(t.theme))
  .map(t=>({theme:t.theme,last:t.history?.at(-1)?.date??null}))});
const latestCandidates=dir=>fs.existsSync(dir)?fs.readdirSync(dir)
 .map(n=>n.match(/^THEME_NINE_R48_PRIVATE_CANDIDATE_(20\d\d-\d\d-\d\d)_[a-f0-9]{16}\.json$/)?.[1])
 .filter(Boolean):[];
const safeCode=value=>/^[A-Z0-9_]{4,100}$/.test(value??'')?value:'UNSPECIFIED';

function runApprovedCmd(command,timeout=20*60000){
 const r=spawnSync('cmd.exe',['/d','/c',command],{encoding:'utf8',windowsHide:true,
  timeout,maxBuffer:2*1024*1024,env:process.env});
 return {exit:r.status??null,signal:r.signal??null,
  error:r.error?.code??null};
}

async function retryPublicReadback(fetchImpl){
 let result=await getPublic(fetchImpl);
 for(let i=0;i<4&&result.modelRevision!==VERSION;i++){
  await new Promise(resolve=>setTimeout(resolve,2500));
  result=await getPublic(fetchImpl);
 }
 return result;
}

function fileContainsLine(file,line){return fs.existsSync(file)&&fs.readFileSync(file,'utf8')
 .split(/\r?\n/).includes(line);}
function latestR54Status(dir){
 if(!fs.existsSync(dir))return null;
 const files=fs.readdirSync(dir).filter(n=>/^THEME_NINE_R54_CYCLE_\d+_\d+\.txt$/.test(n))
  .sort((a,b)=>fs.statSync(path.join(dir,b)).mtimeMs-fs.statSync(path.join(dir,a)).mtimeMs);
 if(!files.length)return null;
 const data=fs.readFileSync(path.join(dir,files[0]),'utf8');
 return {file:files[0],code:safeCode(data.match(/"status"\s*:\s*"([A-Z0-9_]+)"/)?.[1]),
  error:safeCode(data.match(/"error"\s*:\s*"([A-Z0-9_]+)"/)?.[1])};
}

export async function runR77({dataRoot=ROOT,fetchImpl=fetch,now=new Date(),
 execute=runApprovedCmd,platform=process.platform}={}){
 if(platform!=='win32')throw Error('WINDOWS_PC_REQUIRED');
 const report={report:'R77_EXISTING_APPROVED_PUBLICATION_RETRY',
  inspectedAt:now.toISOString(),taskChanges:0,formulaChanges:0,newThemes:0,
  rawFallbacks:0,steps:[]};
 const base=await getPublic(fetchImpl);
 report.before=summaries(base);
 const privateR48=path.join(dataRoot,'themes','legacy-nine-r48-private-candidate');
 const plan=publicationPlan({publicBase:base,candidateDates:latestCandidates(privateR48),now});
 report.gate=plan;
 if(!plan.allowed){report.status='STOP_PREFLIGHT';return report;}
 const r54home=path.join(dataRoot,'pc-writer','theme-nine-r54');
 const r54cmd=path.join(r54home,'scripts','pc-writer','THEME_NINE_R54_PUBLIC_CYCLE.cmd');
 if(!fs.existsSync(r54cmd)||!fileContainsLine(path.join(r54home,'PUBLISHER_CONSENT_R54.txt'),
  'ACCEPT_R54_ANONYMOUS_DERIVED_RISK_20261028')){
  report.status='STOP_EXISTING_R54_RUNNER_OR_CONSENT_MISSING';return report;
 }
 const lock=path.join(dataRoot,'themes','legacy-nine-r35-delta','state','delta.lock');
 if(fs.existsSync(lock)){report.status='STOP_PRIVATE_LOCK';return report;}
 if(!plan.alreadyR37){
  const outcome=execute(r54cmd);
  report.steps.push({lane:'R54_EXISTING_PUBLISHER',...outcome,
   latestLog:latestR54Status(path.join(r54home,'logs'))});
  if(outcome.exit!==0){report.status='STOP_R54_CHECK_EXISTING_LOG';return report;}
 }
 const afterR54=await retryPublicReadback(fetchImpl);
 report.afterR54=summaries(afterR54);
 if(afterR54.modelRevision!==VERSION||afterR54.confirmedObservationDate!==plan.date){
  report.status='STOP_R54_DATE_OR_READER_READBACK_MISMATCH';return report;
 }
 const biotech=path.join(dataRoot,'themes','biotech','source-r8','scripts','pc-writer',
  'theme-biotech-auto-r8.mjs');
 if(!fs.existsSync(biotech)){
  report.status='R54_VERIFIED_BIOTECH_APPROVED_PC_ENTRY_MISSING';return report;
 }
 const node='E:/ZGmini/runtime/node.exe';
 if(!fs.existsSync(node)){report.status='STOP_APPROVED_NODE_MISSING';return report;}
 const call=spawnSync(node,[biotech,'--once','--collect','--publish'],{
  encoding:'utf8',windowsHide:true,timeout:20*60000,maxBuffer:2*1024*1024,
  env:{...process.env,ZGMINI_DATA_ROOT:dataRoot}});
 const raw=call.stdout??'';
 report.steps.push({lane:'BIOTECH_EXISTING_R8',exit:call.status??null,
  resultCode:safeCode(raw.match(/"status"\s*:\s*"([A-Z0-9_]+)"/)?.[1]),
  reasonCode:safeCode(raw.match(/"reason"\s*:\s*"([A-Z0-9_]+)"/)?.[1]),
  r7Status:safeCode(raw.match(/"r7Status"\s*:\s*"([A-Z0-9_]+)"/)?.[1])});
 report.afterBiotech=summaries(await getPublic(fetchImpl));
 const biotechDate=report.afterBiotech.optional.find(x=>x.theme==='바이오·신약')?.last;
 report.status=call.status!==0?'R54_VERIFIED_BIOTECH_RUN_FAILED':
  biotechDate===plan.date?'R54_BIOTECH_API_DATED_NEXT_SCHEDULE_PENDING':
  'R54_VERIFIED_BIOTECH_API_DATE_PENDING';
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==3||process.argv[2]!=='--once')throw Error('USAGE');
  const result=await runR77();
  console.log(JSON.stringify(result,null,2));
  if(result.status?.startsWith('STOP')||result.status?.endsWith('RUN_FAILED'))process.exitCode=1;
 }catch(e){console.log(JSON.stringify({report:'R77_EXISTING_APPROVED_PUBLICATION_RETRY',
  status:'STOP_ERROR',reason:safeCode(e.code??e.message),taskChanges:0,formulaChanges:0}));
  process.exitCode=1;}
}
