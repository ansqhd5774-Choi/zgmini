// R14: exact task VBS, robust static Node entrypoint extraction and deduplicated
// Git worktree inventory. Read-only; do not execute the launcher or change Git.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseScheduledLauncher} from './market-calendar-r13-runtime-lineage.mjs';

const BASELINE='f084e2a360b544257bb44a60b97875627c7ca371';
const CANDIDATE='54c737218a40fec6482b469f7962fe5e8cd7c040705d58072396cffcdcb74c08';
const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/i.test(x)?x:null;
const digest=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>path.normalize(x).replaceAll('\\','/').toLowerCase();
const id=x=>digest(norm(x)).slice(0,12);
const json=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const git=(cwd,args)=>{try{return execFileSync('git',args,{cwd,encoding:'utf8',timeout:5000,windowsHide:true,stdio:['ignore','pipe','ignore']}).trim();}catch{return null;}};
const taskXml=()=>{try{
 const bytes=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],{windowsHide:true,timeout:10000,stdio:['ignore','pipe','ignore']});
 return (bytes[0]===255&&bytes[1]===254||bytes.includes(0)?bytes.toString('utf16le'):bytes.toString('utf8')).replace(/^\ufeff/,'');
}catch{return null;}};
const winAbs=p=>/^[a-z]:[\\/]/i.test(p);
const absolute=p=>winAbs(p)?path.win32.resolve(p):path.resolve(p);
const parentRoot=p=>{
 const impl=winAbs(p)?path.win32:path;
 return impl.resolve(p,'..','..','..');
};

export function extractStaticEntrypoints(vbs){
 if(typeof vbs!=='string')return[];
 const re=/((?:[a-z]:[\\/]|\/)[^"'\r\n<>]*?[\\/]scripts[\\/]pc-writer[\\/](?:local-cycle|quota-runner|run-local|collect-local)\.mjs)/gi;
 const found=[...vbs.matchAll(re)].map(m=>absolute(m[1].trim()));
 return [...new Map(found.map(p=>[norm(p),p])).values()];
}

export function parseWorktreeRecords(output){
 if(typeof output!=='string')return[];
 return output.split(/\r?\n\s*\r?\n/g).flatMap(block=>{
  const p=block.match(/^worktree (.+)$/m),h=block.match(/^HEAD ([a-f0-9]{40})$/im);
  return p&&h?[{path:absolute(p[1].trim()),head:h[1].toLowerCase()}]:[];
 });
}

export function runR14({
 dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 projectRoot=String.raw`E:\ZGmini\projects`,
 candidatePath=fileURLToPath(new URL('../../staging/market-calendar/r11-bls/lib/release-calendar.mjs',import.meta.url)),
 getTaskXml=taskXml,gitCall=git
}={}){
 const config=json(path.join(dataRoot,'config.json'));
 const writer=json(path.join(dataRoot,'local-writer-last-run.json'));
 const ledger=json(path.join(dataRoot,'local-publication-ledger.json'));
 const approved=sha(config?.source);
 const xml=getTaskXml(),vbsPath=parseScheduledLauncher(xml);
 let vbs=null;
 try{if(vbsPath)vbs=fs.readFileSync(vbsPath,'utf8');}catch{}
 const scripts=extractStaticEntrypoints(vbs);
 const scheduledRoots=[...new Map(scripts.map(p=>{const root=parentRoot(p);return [norm(root),root];})).values()];
 const scheduled=scheduledRoots.map(root=>{
  const head=sha(gitCall(root,['rev-parse','HEAD']));
  const blob=sha(gitCall(root,['hash-object','lib/release-calendar.mjs']));
  return {id:id(root),head,parserBlob:blob};
 });
 let candidateHash=null;
 try{candidateHash=digest(fs.readFileSync(candidatePath));}catch{}
 const roots=[];
 let projectsReadable=false,projectCount=0,truncated=false,registered=0;
 try{
  const dirs=fs.readdirSync(projectRoot,{withFileTypes:true}).filter(x=>x.isDirectory());
  projectsReadable=true;projectCount=dirs.length;
  if(dirs.length>500)truncated=true;
  for(const item of dirs.slice(0,500)){
   const loc=path.join(projectRoot,item.name);
   if(fs.existsSync(path.join(loc,'.git')))roots.push(loc);
  }
 }catch{}
 for(const r of scheduledRoots)roots.unshift(r);
 const commonDirs=new Set(),matched=new Map();
 let registries=0,entryCount=0;
 for(const root of roots){
  const common=gitCall(root,['rev-parse','--git-common-dir']);
  if(!common)continue;
  const resolved=absolute(winAbs(common)||path.isAbsolute(common)?common:path.join(root,common));
  if(commonDirs.has(norm(resolved)))continue;
  commonDirs.add(norm(resolved));
  const raw=gitCall(root,['worktree','list','--porcelain']);
  if(raw===null)continue;
  registries++;
  const entries=parseWorktreeRecords(raw);
  entryCount+=entries.length;
  if(entryCount>25000){truncated=true;break;}
  // Parse Git's existing registry HEAD before invoking Git on matching paths.
  for(const row of entries){
   if(row.head!==approved)continue;
   const head=sha(gitCall(row.path,['rev-parse','HEAD']));
   if(head!==approved)continue;
   const blob=sha(gitCall(row.path,['hash-object','lib/release-calendar.mjs']));
   const delta=gitCall(row.path,['diff','--name-only','HEAD','--','lib','worker','scripts/pc-writer','package.json','package-lock.json']);
   matched.set(norm(row.path),{id:id(row.path),head,parserBlob:blob,gitReadable:delta!==null,protectedClean:delta==='',scheduled:scheduledRoots.some(r=>norm(r)===norm(row.path))});
  }
 }
 const matches=[...matched.values()];
 const verified=approved&&config?.enabled===true&&config?.collectionTarget==='pc'&&writer?.mode==='PUBLISH'&&writer?.status==='VERIFIED'&&sha(writer?.source)===approved&&ledger?.status==='VERIFIED'&&sha(ledger?.source)===approved;
 const scriptNames=[...new Set(scripts.map(s=>(winAbs(s)?path.win32:path).basename(s)))];
 const syntax={shellRun:/\bshell\.run\b/i.test(vbs??''),shellExec:/\bshell\.exec\b/i.test(vbs??''),nodeToken:/\bnode(?:\.exe)?\b/i.test(vbs??''),cmdToken:/\.cmd\b/i.test(vbs??''),ps1Token:/\.ps1\b/i.test(vbs??''),mjsToken:/\.mjs\b/i.test(vbs??'')};
 let decision='APPROVED_RUNTIME_UNIQUE_AND_SCHEDULED_SOURCE_MATCH_NO_CHANGES_MADE';
 if(!verified)decision='APPROVED_PUBLISHER_SOURCE_MISMATCH_STOP';
 else if(!vbsPath||vbs===null)decision='EXACT_TASK_VBS_UNREADABLE_STOP';
 else if(scheduled.length!==1)decision='TASK_VBS_STATIC_ENTRYPOINT_AMBIGUOUS_OR_DYNAMIC_STOP';
 else if(candidateHash!==CANDIDATE)decision='BLS_CANDIDATE_HASH_MISMATCH_STOP';
 else if(!projectsReadable||truncated)decision='WORKTREE_REGISTRY_INCOMPLETE_STOP';
 else if(matches.length===0)decision='APPROVED_WORKTREE_NOT_FOUND_STOP';
 else if(matches.length>1)decision='APPROVED_WORKTREE_NOT_UNIQUE_STOP';
 else if(!matches[0].gitReadable||!matches[0].protectedClean||matches[0].parserBlob!==BASELINE)decision='APPROVED_WORKTREE_UNCLEAN_STOP';
 else if(scheduled[0].head!==approved||!matches[0].scheduled)decision='SCHEDULED_SOURCE_DIFFERS_FROM_APPROVED_RUNTIME_STOP';
 else if(scheduled[0].parserBlob!==BASELINE)decision='SCHEDULED_PARSER_BLOB_MISMATCH_STOP';
 return {
  audit:'MARKET_CALENDAR_R14_TARGETED_RUNTIME',at:new Date().toISOString(),
  policy:'READ_ONLY_NO_INSTALL_NO_GIT_WRITE_NO_CONFIG_NO_DB_NO_TASK_NO_COLLECT_NO_PUBLISH',
  source:{approved,writerStatus:writer?.status==='VERIFIED'?'VERIFIED':'OTHER',writerSource:sha(writer?.source),writerAt:writer?.at??null,ledgerStatus:ledger?.status==='VERIFIED'?'VERIFIED':'OTHER',ledgerSource:sha(ledger?.source)},
  task:{xmlRead:Boolean(xml),exactVbsPathRead:Boolean(vbsPath),sameAsDefaultDataRoot:vbsPath?norm(vbsPath)===norm(path.join(dataRoot,'run-local-core.vbs')):false,vbsRead:vbs!==null,vbsBytes:vbs?.length??null,syntax,staticEntrypointCount:scripts.length,scriptNames,scheduled},
  worktrees:{projectsReadable,projectCount,registries,entryCount,truncated,approvedMatches:matches},
  candidate:{sha256:candidateHash,expectedSha256:CANDIDATE,expectedBaselineBlob:BASELINE},
  decision
 };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];
 if(!output){console.error('MISSING_REPORT_PATH');process.exitCode=2;}
 else try{fs.writeFileSync(output,JSON.stringify(runR14(),null,2)+'\n','utf8');console.log('MARKET_CALENDAR_R14_RESULT_WRITTEN');}
 catch{console.error('MARKET_CALENDAR_R14_EXECUTION_ERROR');process.exitCode=2;}
}
