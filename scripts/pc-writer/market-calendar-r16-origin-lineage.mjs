// R16: follow only the literal 'origin' in the exact scheduled R38 VBS.
// Read only; never execute the wrapper, its origin or dispatcher.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseScheduledLauncher} from './market-calendar-r13-runtime-lineage.mjs';
import {extractStaticEntrypoints} from './market-calendar-r14-targeted-runtime.mjs';
import {redactVbsStructure} from './market-calendar-r15-vbs-structure.mjs';

const BASELINE='f084e2a360b544257bb44a60b97875627c7ca371';
const R14_APPROVED_WORKTREE_ID='d0a4b3cb8b95';
const sha=value=>typeof value==='string'&&/^[0-9a-f]{40}$/i.test(value)?value.toLowerCase():null;
const winAbs=value=>/^[a-z]:[\\/]/i.test(value);
const absolute=value=>winAbs(value)?path.win32.resolve(value):path.resolve(value);
const normalized=value=>path.normalize(value).replaceAll('\\','/').toLowerCase();
export const pathIdentity=value=>createHash('sha256').update(normalized(value)).digest('hex').slice(0,12);
const json=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};
const git=(cwd,args)=>{try{return execFileSync('git',args,{cwd,encoding:'utf8',windowsHide:true,timeout:5000,stdio:['ignore','pipe','ignore']}).trim();}catch{return null;}};
const taskXml=()=>{try{
 const b=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],{windowsHide:true,timeout:10000,stdio:['ignore','pipe','ignore']});
 return (b[0]===255&&b[1]===254||b.includes(0)?b.toString('utf16le'):b.toString('utf8')).replace(/^\ufeff/,'');
}catch{return null;}};

export function extractLiteralAssignment(vbs,variable){
 if(typeof vbs!=='string'||!['origin','dispatcher'].includes(variable))return null;
 const re=new RegExp('^[ \\t]*'+variable+'[ \\t]*=[ \\t]*"((?:[^"\\r\\n]|"")*)"[ \\t]*(?:\\x27[^\\r\\n]*)?$','gim');
 const matches=[...vbs.matchAll(re)];
 if(matches.length!==1)return null;
 const value=matches[0][1].replaceAll('""','"');
 if(!winAbs(value)&&!path.isAbsolute(value))return null;
 return absolute(value);
}
function safeProfile(filename){
 if(!filename)return {literal:false,present:false,type:'UNKNOWN'};
 const ext=(winAbs(filename)?path.win32:path).extname(filename).toLowerCase();
 let size=null,present=false;
 try{const st=fs.statSync(filename);present=st.isFile();size=st.size;}catch{}
 const type=ext==='.vbs'?'VBS':ext==='.mjs'?'MJS':ext==='.cmd'?'CMD':ext==='.bat'?'BAT':'OTHER';
 return {literal:true,present,type,size};
}
function projectRootOf(entry){
 if(!/[\\/]scripts[\\/]pc-writer[\\/][^\\/]+\.mjs$/i.test(entry))return null;
 const impl=winAbs(entry)?path.win32:path;
 return impl.resolve(entry,'..','..','..');
}
export function runR16({
 dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 getTaskXml=taskXml,gitCall=git,expectedWorktreeId=R14_APPROVED_WORKTREE_ID
}={}){
 const config=json(path.join(dataRoot,'config.json'));
 const writer=json(path.join(dataRoot,'local-writer-last-run.json'));
 const ledger=json(path.join(dataRoot,'local-publication-ledger.json'));
 const approved=sha(config?.source);
 const verified=Boolean(approved&&config?.enabled===true&&config?.collectionTarget==='pc'&&writer?.mode==='PUBLISH'&&writer?.status==='VERIFIED'&&sha(writer?.source)===approved&&ledger?.status==='VERIFIED'&&sha(ledger?.source)===approved);
 const vbsPath=parseScheduledLauncher(getTaskXml());
 let wrapper=null;
 try{if(vbsPath)wrapper=fs.readFileSync(vbsPath,'utf8');}catch{}
 const knownWrapper=wrapper?.includes('ZGMINI_R38_WRAPPER_V1')??false;
 const origin=extractLiteralAssignment(wrapper,'origin');
 const dispatcher=extractLiteralAssignment(wrapper,'dispatcher');
 const originProfile=safeProfile(origin);
 const dispatcherProfile=safeProfile(dispatcher);
 const sameAsDataRoot=origin?normalized(origin)===normalized(path.join(dataRoot,'run-local-core.vbs')):null;
 let originSource=null;
 if(origin&&originProfile.present&&originProfile.size<=65536&&['VBS','CMD','BAT'].includes(originProfile.type)){
  try{originSource=fs.readFileSync(origin,'utf8');}catch{}
 }
 const scriptCandidates=[...new Map((originProfile.type==='MJS'&&originProfile.present?[origin]:extractStaticEntrypoints(originSource)).map(p=>[normalized(p),p])).values()];
 const candidate=scriptCandidates.length===1?scriptCandidates[0]:null;
 const root=candidate?projectRootOf(candidate):null;
 const head=root?sha(gitCall(root,['rev-parse','HEAD'])):null;
 const parserBlob=root?sha(gitCall(root,['hash-object','lib/release-calendar.mjs'])):null;
 const changed=root?gitCall(root,['diff','--name-only','HEAD','--','lib','worker','scripts/pc-writer','package.json','package-lock.json']):null;
 const rootId=root?pathIdentity(root):null;
 let decision='ORIGIN_RUNTIME_ALIGNED_BLS_NEXT_STAGE_READY_NO_CHANGES_MADE';
 if(!verified)decision='APPROVED_PUBLISHER_MISMATCH_STOP';
 else if(!vbsPath||wrapper===null)decision='EXACT_REGISTERED_WRAPPER_MISSING_STOP';
 else if(!knownWrapper)decision='EXPECTED_R38_WRAPPER_MISMATCH_STOP';
 else if(!origin)decision='ORIGIN_LITERAL_PATH_UNRESOLVED_STOP';
 else if(!originProfile.present)decision='ORIGIN_FILE_NOT_FOUND_STOP';
 else if(scriptCandidates.length!==1||!root)decision='ORIGIN_NODE_ENTRYPOINT_NOT_UNIQUE_STOP';
 else if(head!==approved)decision='ORIGIN_GIT_SOURCE_DIFFERS_FROM_APPROVED_STOP';
 else if(parserBlob!==BASELINE)decision='ORIGIN_PARSER_BLOB_MISMATCH_STOP';
 else if(changed!==''||rootId!==expectedWorktreeId)decision='ORIGIN_NOT_R14_CLEAN_APPROVED_WORKTREE_STOP';
 return {audit:'MARKET_CALENDAR_R16_ORIGIN_LINEAGE',at:new Date().toISOString(),
  policy:'READ_ONLY_NO_WRAPPER_EXECUTION_NO_GIT_WRITE_NO_CONFIG_NO_DB_NO_TASK_NO_COLLECT_NO_PUBLISH',
  publisher:{approvedSource:approved,verified,writerAt:writer?.at??null},
  task:{exactVbsRead:wrapper!==null,r38Wrapper:knownWrapper,registeredTargetIsOrigin:origin&&vbsPath?normalized(origin)===normalized(vbsPath):null},
  origin:{...originProfile,sameAsDataRootPreviouslyProbedVbs:sameAsDataRoot,scriptCandidateCount:scriptCandidates.length,
   candidateKinds:scriptCandidates.map(p=>(winAbs(p)?path.win32:path).basename(p)).filter(n=>/^(local-cycle|quota-runner|run-local|collect-local)\.mjs$/i.test(n)),
   rootId,head,parserBlob,protectedClean:changed==='',matchesR14UniqueApprovedWorktree:rootId?rootId===expectedWorktreeId:null,
   sourceStructure:originSource&&scriptCandidates.length!==1?redactVbsStructure(originSource).slice(0,35):[]},
  dispatcher:{...dispatcherProfile},decision};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const report=process.argv[2];
 if(!report){console.error('MISSING_REPORT_PATH');process.exitCode=2;}
 else try{fs.writeFileSync(report,JSON.stringify(runR16(),null,2)+'\n','utf8');console.log('MARKET_CALENDAR_R16_RESULT_WRITTEN');}
 catch{console.error('MARKET_CALENDAR_R16_EXECUTION_ERROR');process.exitCode=2;}
}
