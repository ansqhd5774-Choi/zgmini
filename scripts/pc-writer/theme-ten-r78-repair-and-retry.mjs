// R78: restore the existing R51/R37 legacy-provisional date contract and
// then call the already-approved R77 R54/R8 one-time publisher gate.
// No task, formula, provider, roster, raw series or D1 key changes.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runR77,publicationPlan} from './theme-ten-r77-retry-gate.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DATA_ROOT='E:/ZGmini/data';
const API='https://zgmini.kr/api/theme-fear-greed/';
const hash=x=>createHash('sha256').update(x).digest('hex');
const safeError=x=>/^[A-Z0-9_]{3,110}$/.test(String(x??''))?String(x):'UNEXPECTED';
const specs=[
 {name:'scripts/pc-writer/theme-nine-r51-provisional-overlay.mjs',
  was:'2fe839a5112bcb8159202935a4d56b8c6b7c723fd121b9a9699c98bc35a81473',
  now:'a769484b0606ca1f060e2938fb7c1b1a5a4747334b151bc99c448ba8c7f1200d'},
 {name:'worker/theme-nine-r37-public.mjs',
  was:'4b63d70567e18c4ee70df74b2f982c3e8aeb34678e022677e06b34c3f14d7f2b',
  now:'d10ce08c801d5f20918ffe4ce71b9b2c95b32cdbc068670a0d31d5fb8922e5c7'},
];

export function applyPinnedFiles({installRoot,payloadRoot,sources=specs}={}){
 const root=fs.realpathSync(installRoot);
 const checked=sources.map(x=>{
  if(!/^(scripts\/pc-writer|worker)\/[a-z0-9-]+\.mjs$/.test(x.name))
   throw Error('R78_SOURCE_PATH_NOT_APPROVED');
  const dest=path.resolve(root,x.name),source=path.resolve(payloadRoot,x.name);
  if(!dest.startsWith(root+path.sep)||!fs.statSync(dest).isFile()||
   fs.lstatSync(dest).isSymbolicLink()||fs.realpathSync(dest)!==dest)
   throw Error('R78_INSTALLED_PATH_UNSAFE');
  const sourceBytes=fs.readFileSync(source);
  if(hash(sourceBytes)!==x.now)throw Error('R78_PAYLOAD_SHA_MISMATCH');
  const actual=hash(fs.readFileSync(dest));
  if(actual!==x.was&&actual!==x.now)throw Error('R78_UNKNOWN_INSTALLED_SHA');
  const backup=dest+'.R78_BACKUP',staged=dest+'.R78_STAGED';
  if(fs.existsSync(staged))throw Error('R78_STAGED_FILE_ALREADY_EXISTS');
  if(fs.existsSync(backup)&&hash(fs.readFileSync(backup))!==x.was)
   throw Error('R78_BACKUP_SHA_CONFLICT');
  if(actual===x.was&&fs.existsSync(backup))
   throw Error('R78_BACKUP_WITH_UNPATCHED_SOURCE');
  return {...x,dest,backup,staged,sourceBytes,actual};
 });
 let changed=0;
 for(const x of checked){
  if(x.actual===x.now)continue;
  fs.writeFileSync(x.staged,x.sourceBytes,{flag:'wx'});
  if(hash(fs.readFileSync(x.staged))!==x.now)
   throw Error('R78_STAGED_SHA_MISMATCH');
  fs.renameSync(x.dest,x.backup);
  try{
   fs.renameSync(x.staged,x.dest);
   if(hash(fs.readFileSync(x.dest))!==x.now)
    throw Error('R78_INSTALLED_READBACK_SHA_MISMATCH');
  }catch(error){
   if(!fs.existsSync(x.dest))fs.renameSync(x.backup,x.dest);
   throw error;
  }
  changed++;
 }
 for(const x of checked)if(hash(fs.readFileSync(x.dest))!==x.now)
  throw Error('R78_FINAL_READBACK_SHA_MISMATCH');
 return {status:'R78_TWO_FILE_SHA_VERIFIED',changed,
  files:checked.map(x=>x.name)};
}

export async function runR78({dataRoot=DATA_ROOT,payloadRoot=HERE,
 now=new Date(),fetchImpl=fetch,platform=process.platform,
 retry=runR77}={}){
 if(platform!=='win32')throw Error('WINDOWS_PC_REQUIRED');
 const r=await fetchImpl(`${API}?r78=${Date.now()}`,{
  headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('R78_PUBLIC_API_HTTP_'+r.status);
 const base=await r.json();
 const candidateRoot=path.join(dataRoot,'themes','legacy-nine-r48-private-candidate');
 const candidateDates=fs.existsSync(candidateRoot)?fs.readdirSync(candidateRoot)
  .map(f=>f.match(/^THEME_NINE_R48_PRIVATE_CANDIDATE_(20\d\d-\d\d-\d\d)_[a-f0-9]{16}\.json$/)?.[1])
  .filter(Boolean):[];
 const gate=publicationPlan({publicBase:base,candidateDates,now});
 if(!gate.allowed)return {status:'STOP_R78_PREFLIGHT',reason:gate.reason,
  changed:0,d1Writes:0};
 const consent=path.join(dataRoot,'pc-writer','theme-nine-r54','PUBLISHER_CONSENT_R54.txt');
 if(!fs.existsSync(consent)||!fs.readFileSync(consent,'utf8')
  .split(/\r?\n/).includes('ACCEPT_R54_ANONYMOUS_DERIVED_RISK_20261028'))
  return {status:'STOP_R78_APPROVED_PUBLISHER_CONSENT_MISSING',changed:0,d1Writes:0};
 const patched=applyPinnedFiles({
  installRoot:path.join(dataRoot,'pc-writer','theme-nine-r54'),payloadRoot});
 const result=await retry({dataRoot,now,fetchImpl,platform});
 return {status:'R78_PATCHED_R77_EXECUTED',patch:patched,retry:result,
  taskChanges:0,formulaChanges:0,newThemes:0,rawFallbacks:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==5||process.argv[2]!=='--once'||
   process.argv[3]!=='--repair'||process.argv[4]!=='--publish')
   throw Error('USAGE');
  const result=await runR78();
  console.log(JSON.stringify(result,null,2));
  const outcome=result.retry?.status??result.status;
  if(outcome.startsWith('STOP')||outcome.endsWith('RUN_FAILED'))process.exitCode=1;
 }catch(error){
  console.log(JSON.stringify({status:'STOP_R78',error:safeError(error.code??error.message),
   taskChanges:0,formulaChanges:0,newThemes:0}));
  process.exitCode=1;
 }
}
