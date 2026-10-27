// Read-only preflight for a future, separately approved PC parser rollout.
// No git fetch/checkout/commit, DB mutation, task registration or publication.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const APPROVED_SHA='36266beb3ab942979d9aca7dcdd8af16fb27825b';
const APPROVED_PARSER_BLOB='f084e2a360b544257bb44a60b97875627c7ca371';
const CANDIDATE_PARSER_SHA256='685b41930f1dd1abe275f4b4b118fef267ef4f2758f19427233547f8d91278fc';
const safeSha=value=>typeof value==='string'&&/^[a-f0-9]{40}$/i.test(value)?value:null;
const safeBranch=value=>typeof value==='string'&&/^[a-zA-Z0-9_./-]{1,120}$/.test(value)?value:null;
const safeCode=value=>typeof value==='string'&&/^[A-Z0-9_]{1,80}$/.test(value)?value:'UNKNOWN';
const decodeXml=s=>s.replace(/&(quot|apos|amp|lt|gt);/g,(_,e)=>({quot:'"',apos:"'",amp:'&',lt:'<',gt:'>'})[e]);
const normalize=s=>s.replaceAll('/','\\').replace(/\\+$/,'').toLowerCase();
const git=(root,args)=>{
 try{return execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore'],timeout:10000,maxBuffer:200000}).trim();}
 catch{return null;}
};

function scheduledTaskXml(){
 try{
  const b=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],{windowsHide:true,stdio:['ignore','pipe','ignore'],timeout:12000,maxBuffer:200000});
  return b[0]===255&&b[1]===254||b.includes(0)?b.toString('utf16le'):b.toString('utf8');
 }catch{return null;}
}

function inspectProject(root,taskXml){
 const parser=path.join(root,'lib','release-calendar.mjs');
 if(!fs.existsSync(parser)||!fs.existsSync(path.join(root,'scripts','pc-writer','run-local.mjs')))return null;
 if(!fs.existsSync(path.join(root,'.git')))return null;
 const head=safeSha(git(root,['rev-parse','HEAD']));
 const approvedCommit=git(root,['cat-file','-t',APPROVED_SHA])==='commit';
 const parserBlob=safeSha(git(root,['hash-object','lib/release-calendar.mjs']));
 const dirty=git(root,['status','--porcelain','--untracked-files=no']);
 const dirtyFiles=typeof dirty==='string'?dirty.split(/\r?\n/).filter(Boolean).map(line=>line.slice(3).replaceAll('\\','/')):[];
 const dirtyParser=dirtyFiles.some(file=>file==='lib/release-calendar.mjs');
 const dirtyProtected=dirtyFiles.filter(file=>/^(lib\/|worker\/|scripts\/pc-writer\/|package(?:-lock)?\.json)/.test(file)).length;
 const real=(()=>{try{return fs.realpathSync.native(root);}catch{return root;}})();
 const referenced=Boolean(taskXml)&&(normalize(decodeXml(taskXml)).includes(normalize(root))||normalize(decodeXml(taskXml)).includes(normalize(real)));
 return {
  id:createHash('sha256').update(normalize(real)).digest('hex').slice(0,12),
  taskReferenced:referenced,head,branch:safeBranch(git(root,['branch','--show-current'])),
  approvedCommitPresent:approvedCommit,parserBlob,dirtyParser,dirtyProtected,
  statusReadable:dirty!==null,
 };
}

function discoverProjects(root,taskXml){
 try{
  const found=[];
  const entries=fs.readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory()&&!e.isSymbolicLink()&&e.name!=='legacy').slice(0,256);
  for(const entry of entries){const p=inspectProject(path.join(root,entry.name),taskXml);if(p)found.push(p);}
  return {state:'SCANNED',count:found.length,candidates:found};
 }catch{return {state:'PROJECT_DIRECTORY_UNAVAILABLE',count:0,candidates:[]};}
}

export function decidePreflight({config,taskXml,projects,candidateHash}){
 if(!config||safeSha(config.source)!==APPROVED_SHA)return 'APPROVED_SOURCE_CHANGED_STOP';
 if(config.enabled!==true||config.collectionTarget!=='pc')return 'PC_COLLECTION_CONTRACT_CHANGED_STOP';
 if(candidateHash!==CANDIDATE_PARSER_SHA256)return 'CANDIDATE_PARSER_MISMATCH_STOP';
 if(!taskXml)return 'CORE_TASK_UNAVAILABLE_STOP';
 if(projects.state!=='SCANNED')return 'PROJECT_DIRECTORY_UNAVAILABLE_STOP';
 const matched=projects.candidates.filter(item=>item.taskReferenced);
 if(matched.length!==1)return 'TASK_PROJECT_AMBIGUOUS_OR_UNRESOLVED_STOP';
 const target=matched[0];
 if(!target.head||!target.approvedCommitPresent||!target.statusReadable)return 'GIT_SOURCE_NOT_VERIFIED_STOP';
 if(target.dirtyParser)return 'PARSER_LOCAL_EDIT_PRESERVE_STOP';
 if(target.parserBlob=== '34429fa586918b95224ca330c5af91c4bb9adac1')return 'PARSER_ALREADY_CANDIDATE_REVIEW';
 if(target.parserBlob!==APPROVED_PARSER_BLOB)return 'ACTIVE_PARSER_DRIFT_STOP';
 if(target.dirtyProtected>0)return 'OTHER_PROTECTED_LOCAL_EDITS_STOP';
 return 'READY_FOR_APPROVED_SOURCE_TRANSITION_NO_CHANGES_MADE';
}

export function runPreflight({projectRoot=String.raw`E:\ZGmini\projects`,dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,task=scheduledTaskXml}={}){
 let config=null;
 try{config=JSON.parse(fs.readFileSync(path.join(dataRoot,'config.json'),'utf8'));}catch{}
 const taskXml=task();
 const projects=discoverProjects(projectRoot,taskXml);
 const candidatePath=fileURLToPath(new URL('../../lib/release-calendar.mjs',import.meta.url));
 const candidateHash=createHash('sha256').update(fs.readFileSync(candidatePath)).digest('hex');
 const decision=decidePreflight({config,taskXml,projects,candidateHash});
 return {
  audit:'MARKET_CALENDAR_R9_SOURCE_PREFLIGHT',ranAt:new Date().toISOString(),
  policy:'READ_ONLY_NO_GIT_WRITE_NO_CONFIG_CHANGE_NO_COLLECTION_NO_PUBLISH',
  expected:{approvedSourceSha:APPROVED_SHA,approvedParserBlob:APPROVED_PARSER_BLOB,candidateSha256:CANDIDATE_PARSER_SHA256},
  current:{approvedSourceSha:safeSha(config?.source),enabled:config?.enabled===true,collectionTarget:config?.collectionTarget==='pc'?'pc':'OTHER_OR_MISSING'},
  task:{state:taskXml?'XML_READ':'QUERY_UNAVAILABLE',matchingProjects:projects.candidates.filter(p=>p.taskReferenced).length},
  projects,
  candidate:{sha256:candidateHash},decision:safeCode(decision),
 };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];
 if(!output){console.error('MISSING_OUTPUT_PATH');process.exitCode=2;}
 else{
  try{fs.writeFileSync(output,JSON.stringify(runPreflight(),null,2)+'\n',{encoding:'utf8',flag:'w'});console.log('SOURCE_PREFLIGHT_REPORT_WRITTEN');}
  catch{console.error('PREFLIGHT_REPORT_FAILED');process.exitCode=2;}
 }
}
