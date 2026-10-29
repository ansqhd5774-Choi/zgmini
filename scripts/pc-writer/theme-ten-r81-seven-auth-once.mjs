// R81: repair only the installed R54 authentication call after the R80
// same-day D1 CAS patch. Reuse the already-approved R8 -> seven-core resolver.
// Never print/save tokens, create credentials or change scheduled tasks.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {r80Plan,runR80} from './theme-ten-r80-rebase-once.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DATA='E:/ZGmini/data';
const HOME=path.join(DATA,'pc-writer','theme-nine-r54');
const NODE='E:/ZGmini/runtime/node.exe';
const API='https://zgmini.kr/api/theme-fear-greed/';
const PATCH='scripts/pc-writer/theme-nine-r54-public-connect.mjs';
const OLD='195332100e32473c59c4820d8961de2dd7cac978b7f87b782cfa968c737f6b77';
const NEW='e65bb10399acc5dc017f5241624a2fa29c82c34b42f4424dbfb3cf04a9c0e55b';
const R80_D1='7a10fe41710dbc1a21c9f3e343c538cd96b6c5695b683f04dce48af85ede6e7e';
const R8_AUTH='9b1f952f720abe0d6e631ad8fac908cfd51b00575690e9abea8cd09f1a6a4bd3';
const SEVEN_CORE='f9ea0a1bfaf52909b7a434b65ba93887f56660bc979a3cb7e0992597bc9f3b68';
const REQUIRED={
 'scripts/pc-writer/theme-nine-r51-provisional-overlay.mjs':
  'a769484b0606ca1f060e2938fb7c1b1a5a4747334b151bc99c448ba8c7f1200d',
 'worker/theme-nine-r37-public.mjs':
  'd10ce08c801d5f20918ffe4ce71b9b2c95b32cdbc068670a0d31d5fb8922e5c7',
 'scripts/pc-writer/theme-nine-r48-d1-publication.mjs':R80_D1,
 'scripts/pc-writer/THEME_NINE_R54_PUBLIC_CYCLE.cmd':
  '8e48d4efdd575536ac23f8560d354294df9a80d970bb2e21fbe53ff8df7a1290',
};
const sha=x=>createHash('sha256').update(x).digest('hex');
const fail=code=>{throw Object.assign(new Error(code),{code});};
const pass=(ok,code)=>{if(!ok)fail(code);};
const safe=x=>/^[A-Z0-9_]{3,120}$/.test(String(x??''))?String(x):'UNSPECIFIED';
const checkFile=(file,expected)=>{
 pass(fs.existsSync(file)&&fs.statSync(file).isFile()&&
  !fs.lstatSync(file).isSymbolicLink()&&fs.realpathSync(file)===file,
  'R81_APPROVED_FILE_MISSING_OR_LINK');
 pass(sha(fs.readFileSync(file))===expected,'R81_APPROVED_SOURCE_SHA_DRIFT');
};
const candidates=folder=>fs.existsSync(folder)?fs.readdirSync(folder)
 .map(x=>x.match(/^THEME_NINE_R48_PRIVATE_CANDIDATE_(20\d\d-\d\d-\d\d)_[a-f0-9]{16}\.json$/)?.[1])
 .filter(Boolean):[];
const readPublic=async(fetchImpl=fetch)=>{
 const r=await fetchImpl(API+'?r81='+Date.now()+Math.random(),{
  headers:{'cache-control':'no-cache',accept:'application/json'},
  signal:AbortSignal.timeout(20000)});
 pass(r.ok,'R81_PUBLIC_API_UNAVAILABLE');return r.json();
};

// A fixture-friendly, read-only provenance gate. The caller invokes the R8
// authenticator, but the secret is never returned as part of any report.
export async function checkR81SevenAuth({dataRoot=DATA,
 importer=url=>import(url),expectedAuthSha=R8_AUTH,
 expectedCoreSha=SEVEN_CORE}={}){
 const auth=path.join(dataRoot,'themes','biotech','source-r8','scripts',
  'pc-writer','theme-biotech-seven-auth-r8.mjs');
 const core=path.join(dataRoot,'theme-market-history-r131',
  'marketparquet-r167','r179-publish-core.mjs');
 checkFile(auth,expectedAuthSha);checkFile(core,expectedCoreSha);
 const source=await importer(pathToFileURL(auth).href);
 pass(typeof source?.biotechApprovedSevenTokenR8==='function',
  'R81_APPROVED_R8_ADAPTER_MISSING');
 let token;
 try{token=await source.biotechApprovedSevenTokenR8({dataRoot});}
 catch{fail('R81_APPROVED_SEVEN_AUTH_UNAVAILABLE');}
 pass(typeof token==='string'&&token.length>8,
  'R81_APPROVED_SEVEN_AUTH_UNAVAILABLE');
 return {status:'R81_SEVEN_AUTH_MEMORY_ONLY_VERIFIED',secretWritten:0,
  secretLogged:0};
}

export function installR81({home=HOME,bundle=HERE}={}){
 const root=fs.realpathSync(home);
 const target=path.resolve(root,PATCH),payload=path.resolve(bundle,PATCH);
 pass(target.startsWith(root+path.sep),'R81_UNSAFE_INSTALL_PATH');
 checkFile(payload,NEW);
 pass(fs.existsSync(target)&&fs.statSync(target).isFile()&&
  !fs.lstatSync(target).isSymbolicLink()&&fs.realpathSync(target)===target,
  'R81_INSTALLED_SOURCE_MISSING_OR_LINK');
 const installed=sha(fs.readFileSync(target));
 pass(installed===OLD,'R81_UNAPPROVED_OR_ALREADY_INSTALLED_SHA');
 const backup=target+'.R81_BACKUP',stage=target+'.R81_STAGED';
 pass(!fs.existsSync(backup)&&!fs.existsSync(stage),
  'R81_BACKUP_OR_STAGE_EXISTS_STOP');
 fs.writeFileSync(stage,fs.readFileSync(payload),{flag:'wx'});
 checkFile(stage,NEW);
 fs.renameSync(target,backup);
 try{
  fs.renameSync(stage,target);
  checkFile(target,NEW);
 }catch(e){if(!fs.existsSync(target))fs.renameSync(backup,target);throw e;}
 return {status:'R81_R54_ONE_FILE_INSTALLED_SHA_VERIFIED',changed:1,
  backupPreserved:true};
}

export async function runR81({platform=process.platform,fetchImpl=fetch,
 now=new Date(),authProbe=checkR81SevenAuth,runApprovedR80=runR80}={}){
 const report={report:'R81_APPROVED_SEVEN_AUTH_R54_ONLY',
  inspectedAt:now.toISOString(),newThemes:0,formulaChanges:0,
  scheduleChanges:0,rawRewrites:0};
 if(platform!=='win32')return {...report,status:'STOP_WINDOWS_PC_REQUIRED'};
 const base=await readPublic(fetchImpl);
 const gate=r80Plan({base,now,candidates:candidates(path.join(DATA,'themes',
  'legacy-nine-r48-private-candidate'))});
 report.gate=gate;
 if(!gate.allowed)return {...report,status:'STOP_PREFLIGHT'};
 const consent=path.join(HOME,'PUBLISHER_CONSENT_R54.txt');
 const runner=path.join(HOME,'scripts','pc-writer','THEME_NINE_R54_PUBLIC_CYCLE.cmd');
 const locks=[path.join(DATA,'themes','legacy-nine-r35-delta','state','delta.lock'),
  path.join(DATA,'themes','biotech','state','biotech-auto-r7.lock')];
 pass(fs.existsSync(NODE)&&fs.existsSync(runner)&&fs.existsSync(consent)&&
  !locks.some(f=>fs.existsSync(f))&&fs.readFileSync(consent,'utf8')
   .split(/\r?\n/).includes('ACCEPT_R54_ANONYMOUS_DERIVED_RISK_20261028'),
  'R81_NODE_R54_CONSENT_OR_LOCK');
 for(const [name,hash]of Object.entries(REQUIRED))
  checkFile(path.join(HOME,name),hash);
 // The previously approved R8 -> original seven publisher resolver must work
 // BEFORE changing one byte of the existing R54 publisher.
 report.auth=await authProbe({dataRoot:DATA});
 report.patch=installR81();
 report.publicCycle=await runApprovedR80({fetchImpl,platform});
 report.status=report.publicCycle.status===
  'R80_PUBLIC_R37_VERIFIED_NEXT_REGULAR_PENDING'?
  'R81_PUBLIC_R37_VERIFIED_NEXT_REGULAR_PENDING':
  'STOP_OR_PENDING_R54_PUBLIC_READBACK';
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv.length!==5||process.argv.slice(2).join(' ')!==
   '--once --repair --publish')fail('R81_USAGE');
  const report=await runR81();console.log(JSON.stringify(report,null,2));
  if(!report.status.startsWith('R81_PUBLIC_R37_VERIFIED'))process.exitCode=1;
 }catch(e){console.log(JSON.stringify({report:'R81_APPROVED_SEVEN_AUTH_R54_ONLY',
  status:'STOP_R81',reason:safe(e.code??e.message),newThemes:0,
  formulaChanges:0,scheduleChanges:0,rawRewrites:0}));process.exitCode=1;}
}
