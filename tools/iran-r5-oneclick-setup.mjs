// R5 shadow-only Windows installer. It never changes databases, scheduler or public scores.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import readline from 'node:readline/promises';
import {fileURLToPath} from 'node:url';

const packageRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const resultFile=path.join(packageRoot,'IRAN_ENGLISH_SCORE_R5_INSTALL_RESULT.txt');
const relDir='scripts/iran-progress';
const files=[
 {rel:`${relDir}/english-score-preview-r1.mjs`,previous:'fcd831082cc482f9fbb30b71a5352c0ba1d7eddb1a32cf8513a5dc9217ce2414',current:'284c1667fbef797dc1e177641541be43d3f60386b2681a4eb1132e65a04288fc'},
 {rel:`${relDir}/news-r41-english-score-evidence-r1.mjs`,previous:'a3c30a931e564ab48064bcfbfc89a8bf562f1a2899acb9c2371d55e118a62701',current:'2924996005f3c6dc6e333ec052d100b178adb3e16d30815d3628368055b63d29'},
 {rel:`${relDir}/english-score-preview-r5.mjs`,current:'dfb5af1dc11f50f50959ce6eef6d4943b28f653c7e427705844f34a76ccc2603'},
 {rel:`${relDir}/IRAN_ENGLISH_SCORE_R5_PREVIEW.cmd`,current:'e5d85d0023d13272c016001214c78a7dfd75cdbff94b59a6ddabad5c25c15535'},
];

const normalize=buffer=>Buffer.from(buffer.toString('utf8').replace(/\r\n/g,'\n'),'utf8');
const hash=file=>crypto.createHash('sha256').update(normalize(fs.readFileSync(file))).digest('hex');
const exists=file=>{try{return fs.statSync(file).isFile();}catch{return false;}};
const log=(line)=>{const text=String(line).replace(/[\r\n]+/g,' ');console.log(text);fs.appendFileSync(resultFile,`${text}\n`,'utf8');};
const fail=(code,reason)=>{log(`ERROR=${code}`);if(reason)log(`DETAIL=${reason}`);log('FINAL_STATUS=BLOCKED_NO_SCORE_OR_TASK_CHANGE');process.exitCode=1;};

function validRoot(folder){
 try{
  return fs.statSync(folder).isDirectory()&&[
   'AGENTS.md','package.json','scripts/resolve-local-node.cmd',
   `${relDir}/IRAN_ENGLISH_SCORE_R4_PREVIEW.cmd`,
   `${relDir}/english-score-preview-r4.mjs`,
   `${relDir}/english-score-preview-r2.mjs`,
   `${relDir}/english-score-bound-quote-r3.mjs`,
   'lib/iran-progress/reference-flow-r3.mjs',
  ].every(rel=>exists(path.join(folder,rel)));
 }catch{return false;}
}

function candidateRoots(){
 const base='E:\\ZGmini\\projects';
 const result=new Set();
 const consider=dir=>{if(validRoot(dir))result.add(path.resolve(dir));};
 const children=dir=>{try{return fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>path.join(dir,e.name));}catch{return [];}};
 consider(base);
 for(const child of children(base)){
  consider(child);
  if(path.basename(child).toLowerCase()==='legacy')for(const nested of children(child))consider(nested);
  if(path.basename(child).toLowerCase().startsWith('zgmini')){
   for(const release of children(path.join(child,'releases')))consider(release);
  }
 }
 return [...result].sort();
}

async function ask(question){
 const rl=readline.createInterface({input:process.stdin,output:process.stdout});
 try{return (await rl.question(question)).trim().replace(/^"(.*)"$/,'$1');}
 finally{rl.close();}
}

async function resolveProject(argv){
 const explicit=argv[0]||process.env.ZGMINI_PROJECT_ROOT;
 if(explicit){
  if(!validRoot(explicit))throw Error('GIVEN_PROJECT_ROOT_MISSING_REQUIRED_R4_FILES');
  return path.resolve(explicit);
 }
 const found=candidateRoots();
 if(found.length===1)return found[0];
 if(found.length>1){
  log(`PROJECT_CANDIDATES=${found.length}`);
  for(const [i,root] of found.entries())log(`PROJECT_OPTION_${i+1}=${root}`);
  log('ACTION=Select only an approved existing ZGMINI source (number or full path).');
  const selected=await ask('ZGMINI project number or full path (Enter cancels): ');
  if(!selected)throw Error('USER_CANCELED_ROOT_SELECTION');
  const root=/^\d+$/.test(selected)?found[Number(selected)-1]:selected;
  if(!root||!validRoot(root))throw Error('PROJECT_ROOT_SELECTION_INVALID');
  return path.resolve(root);
 }
 log('PROJECT_SEARCH=NO_SAFE_MATCH_IN_E_DRIVE_PROJECTS');
 log('ACTION=Enter the previously approved project root folder, not this extracted ZIP folder.');
 const entered=await ask('Existing ZGMINI project root (Enter cancels): ');
 if(!entered)throw Error('USER_CANCELED_ROOT_SELECTION');
 if(!validRoot(entered))throw Error('PROJECT_ROOT_MISSING_REQUIRED_R4_FILES');
 return path.resolve(entered);
}

function planCopy(root){
 const ops=[];
 for(const file of files){
  const source=path.join(packageRoot,file.rel);
  const dest=path.join(root,file.rel);
  if(!exists(source)||hash(source)!==file.current)throw Error(`PACKAGE_INVALID_OR_CORRUPT:${file.rel}`);
  if(exists(dest)){
   const h=hash(dest);
   if(h===file.current)continue;
   if(!file.previous||h!==file.previous)throw Error(`PC_SOURCE_DRIFT_BLOCKED:${file.rel}:${h}`);
  }else if(file.previous)throw Error(`PC_BASE_FILE_MISSING:${file.rel}`);
  ops.push({source,dest,rel:file.rel,hadOriginal:exists(dest)});
 }
 return ops;
}

function applyCopy(ops){
 if(ops.length===0){log('INSTALL=ALREADY_MATCHING_R5');return;}
 const tag=new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)+'_'+process.pid;
 const backupRoot=path.join(packageRoot,`R5_SAFE_BACKUP_${tag}`);
 fs.mkdirSync(backupRoot,{recursive:true});
 // Capture ALL original files before modifying any source.
 for(const op of ops.filter(o=>o.hadOriginal)){
  const backup=path.join(backupRoot,op.rel);
  fs.mkdirSync(path.dirname(backup),{recursive:true});
  fs.copyFileSync(op.dest,backup);
  if(!fs.readFileSync(op.dest).equals(fs.readFileSync(backup)))throw Error(`BACKUP_VERIFY_FAILED:${op.rel}`);
  op.backup=backup;
 }
 log(`BACKUP_DIR=${backupRoot}`);
 const completed=[];
 try{
  for(const op of ops){
   fs.mkdirSync(path.dirname(op.dest),{recursive:true});
   fs.copyFileSync(op.source,op.dest);
   if(hash(op.dest)!==hash(op.source))throw Error(`INSTALL_VERIFY_FAILED:${op.rel}`);
   completed.push(op);
   log(`INSTALLED=${op.rel}`);
  }
 }catch(e){
  for(const op of [...completed,...ops.filter(o=>!completed.includes(o))].reverse()){
   try{
    if(op.backup)fs.copyFileSync(op.backup,op.dest);
    else if(exists(op.dest))fs.unlinkSync(op.dest);
   }catch(rollbackError){log(`ROLLBACK_ERROR=${op.rel}:${rollbackError.code||'FAILED'}`);}
  }
  log('INSTALL=ROLLED_BACK_AFTER_ERROR');
  throw e;
 }
 log('INSTALL=R5_SHADOW_FILES_APPLIED');
}

async function runPreview(root){
 const previewCmd=path.join(root,relDir,'IRAN_ENGLISH_SCORE_R5_PREVIEW.cmd');
 const previewResult=path.join(root,relDir,'IRAN_ENGLISH_SCORE_R5_PREVIEW_RESULT.txt');
 log('PREVIEW=STARTED_READ_ONLY');
 // Launch exactly one R5 shadow preview; do not invoke any scheduled collector.
 await new Promise((resolve,reject)=>{
  const child=spawn(process.env.ComSpec||'cmd.exe',['/d','/c',`call "${previewCmd}"`],{
   cwd:root,env:process.env,windowsHide:false,stdio:['ignore','pipe','pipe']
  });
  let elapsed=0;let timedOut=false;
  const ticker=setInterval(()=>{elapsed+=15;log(`PREVIEW=RUNNING_${elapsed}_SECONDS`);},15000);
  const deadline=setTimeout(()=>{
   timedOut=true;log('PREVIEW=TIMEOUT_AFTER_360_SECONDS');
   // On Windows, stop only this child process tree, never existing ZGMINI jobs.
   const stopper=spawn('taskkill',['/pid',String(child.pid),'/t','/f'],{windowsHide:true});
   stopper.on('error',()=>child.kill());
  },360000);
  const clear=()=>{clearInterval(ticker);clearTimeout(deadline);};
  child.stdout.on('data',d=>process.stdout.write(d));
  child.stderr.on('data',d=>process.stderr.write(d));
  child.once('error',e=>{clear();reject(e);});
  child.once('close',code=>{clear();if(timedOut||code!==0)reject(Error(`PREVIEW_EXIT_${timedOut?'TIMEOUT':code}`));else resolve();});
 });
 if(!exists(previewResult))throw Error('PREVIEW_RESULT_FILE_MISSING');
 const output=fs.readFileSync(previewResult,'utf8');
 if(!output.includes('FINAL_STATUS=ENGLISH_SCORE_R5_SHADOW_NO_PUBLISH'))throw Error('PREVIEW_FINAL_STATUS_NOT_CONFIRMED');
 if(!/"publicWrite"\s*:\s*false/.test(output)||!/"r5ScoreChanges"\s*:\s*0/.test(output))throw Error('PREVIEW_READ_ONLY_CONTRACT_NOT_CONFIRMED');
 log(`PREVIEW_RESULT=${previewResult}`);
 log('PUBLIC_WRITE=false');
 log('R5_SCORE_CHANGES=0');
 log('FINAL_STATUS=R5_SHADOW_PREVIEW_COMPLETED_NO_PUBLISH');
}

export async function main(argv=process.argv.slice(2)){
 try{
  fs.writeFileSync(resultFile,'ZGMINI IRAN ENGLISH R5 SAFE ONE-CLICK INSTALL\n','utf8');
  log('MODE=ONLY_FOUR_SHADOW_SCRIPT_FILES_NO_SCHEDULER_NO_DATABASE_NO_PUBLIC_SCORE');
  const root=await resolveProject(argv.filter(a=>a!=='--install-only'));
  // This can also run from a real repository root where the files already match.
  // An unmerged extracted ZIP is never accepted as a project (validRoot gate).
  log(`VALIDATED_PROJECT=${root}`);
  const ops=planCopy(root);
  log(`FILES_TO_INSTALL=${ops.length}`);
  applyCopy(ops);
  if(argv.includes('--install-only')){
   log('FINAL_STATUS=R5_FILES_INSTALLED_TEST_MODE_NO_PC_PREVIEW');
  }else await runPreview(root);
 }catch(error){fail('R5_ONECLICK_SETUP_OR_PREVIEW_FAILED',error.message||'UNKNOWN');}
 return process.exitCode||0;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
