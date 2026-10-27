// R13: verify the exact Core task launcher and linked Git worktree registry.
// READ ONLY. Never install, collect, publish, fetch, checkout, or change config.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {identifyLauncher} from './market-calendar-r12-launcher-source.mjs';

const BASELINE='f084e2a360b544257bb44a60b97875627c7ca371';
const CANDIDATE='54c737218a40fec6482b469f7962fe5e8cd7c040705d58072396cffcdcb74c08';
const sha=v=>typeof v==='string'&&/^[a-f0-9]{40}$/i.test(v)?v:null;
const hash=x=>createHash('sha256').update(x).digest('hex');
const norm=x=>path.normalize(x).replaceAll('\\','/').toLowerCase();
const identity=x=>hash(norm(x)).slice(0,12);
const json=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const git=(cwd,args)=>{try{return execFileSync('git',args,{cwd,encoding:'utf8',windowsHide:true,timeout:3000,stdio:['ignore','pipe','ignore']}).trim();}catch{return null;}};
const queryTask=()=>{try{
 const b=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],{windowsHide:true,timeout:10000,stdio:['ignore','pipe','ignore']});
 return (b[0]===255&&b[1]===254||b.includes(0)?b.toString('utf16le'):b.toString('utf8')).replace(/^\ufeff/,'');
}catch{return null;}};
const asAbsolute=p=>/^[a-z]:[\\/]/i.test(p)?path.win32.resolve(p):path.resolve(p);

export function parseScheduledLauncher(xml){
 if(typeof xml!=='string')return null;
 const fields=[...xml.matchAll(/<Arguments(?:\s+[^>]*)?>([\s\S]*?)<\/Arguments>/gi)];
 if(fields.length!==1)return null;
 const argumentsText=fields[0][1].replace(/&quot;|&#34;/gi,'"').replace(/&amp;/gi,'&');
 const targets=[...argumentsText.matchAll(/"([^"\r\n]*[\\/]run-local-core\.vbs)"/gi)];
 if(targets.length!==1)return null;
 const target=targets[0][1];
 if(!/^[a-z]:[\\/]/i.test(target)&&!path.isAbsolute(target))return null;
 return asAbsolute(target);
}

export function parseWorktrees(raw){
 if(typeof raw!=='string')return[];
 return raw.split(/\r?\n\s*\r?\n/g).flatMap(block=>{
  const row=block.match(/^worktree (.+)$/m);
  return row&&row[1]?[asAbsolute(row[1].trim())]:[];
 });
}

function inspectWorktree(p,approved,gitCall){
 const head=sha(gitCall(p,['rev-parse','HEAD']));
 if(head!==approved)return null;
 const blob=sha(gitCall(p,['hash-object','lib/release-calendar.mjs']));
 const changed=gitCall(p,['diff','--name-only','HEAD','--','lib','worker','scripts/pc-writer','package.json','package-lock.json']);
 return {id:identity(p),head,parserBlob:blob,protectedClean:changed==='',gitReadable:changed!==null};
}

export function runR13({
 dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,
 projectRoot=String.raw`E:\ZGmini\projects`,
 candidatePath=fileURLToPath(new URL('../../staging/market-calendar/r11-bls/lib/release-calendar.mjs',import.meta.url)),
 getTaskXml=queryTask,gitCall=git
}={}){
 const cfg=json(path.join(dataRoot,'config.json'));
 const writer=json(path.join(dataRoot,'local-writer-last-run.json'));
 const ledger=json(path.join(dataRoot,'local-publication-ledger.json'));
 const approved=sha(cfg?.source);
 const xml=getTaskXml(),scheduledFile=parseScheduledLauncher(xml);
 let launcher=null;
 try{if(scheduledFile)launcher=fs.readFileSync(scheduledFile,'utf8');}catch{}
 const scheduledRoot=identifyLauncher(launcher);
 const scheduledHead=scheduledRoot?sha(gitCall(scheduledRoot,['rev-parse','HEAD'])):null;
 const scheduledBlob=scheduledRoot?sha(gitCall(scheduledRoot,['hash-object','lib/release-calendar.mjs'])):null;
 let candidateHash=null;
 try{candidateHash=hash(fs.readFileSync(candidatePath));}catch{}
 const roots=new Map();
 function add(p){if(p){const resolved=asAbsolute(p);roots.set(norm(resolved),resolved);}}
 add(scheduledRoot);
 let directRepos=0,projectScanned=false,truncated=false;
 try{
  const children=fs.readdirSync(projectRoot,{withFileTypes:true}).filter(x=>x.isDirectory());
  projectScanned=true;
  if(children.length>500)truncated=true;
  for(const child of children.slice(0,500)){
   const p=path.join(projectRoot,child.name);
   if(fs.existsSync(path.join(p,'.git'))){directRepos++;add(p);}
  }
 }catch{}
 const candidates=new Map();let worktreeEntries=0,registriesRead=0;
 const registries=new Set();
 for(const root of [...roots.values()]){
  if(registries.has(norm(root)))continue;
  registries.add(norm(root));
  const output=gitCall(root,['worktree','list','--porcelain']);
  if(output===null)continue;
  registriesRead++;
  const paths=parseWorktrees(output);
  worktreeEntries+=paths.length;
  if(worktreeEntries>2000){truncated=true;break;}
  for(const p of paths){
   const result=inspectWorktree(p,approved,gitCall);
   if(result)candidates.set(norm(p),{...result,scheduled:scheduledRoot?norm(p)===norm(scheduledRoot):false});
  }
  if(truncated)break;
 }
 const matches=[...candidates.values()];
 const verified=approved&&cfg.enabled===true&&cfg.collectionTarget==='pc'&&
   writer?.mode==='PUBLISH'&&writer?.status==='VERIFIED'&&sha(writer.source)===approved&&
   ledger?.status==='VERIFIED'&&sha(ledger.source)===approved;
 const scheduledSameFile=scheduledFile?norm(scheduledFile)===norm(path.join(dataRoot,'run-local-core.vbs')):false;
 let decision='APPROVED_WORKTREE_UNIQUE_SCHEDULER_STALE_NO_CHANGES_MADE';
 if(!verified)decision='PUBLISHER_APPROVAL_MISMATCH_STOP';
 else if(!scheduledFile||!scheduledRoot)decision='EXACT_CORE_TASK_TARGET_UNVERIFIED_STOP';
 else if(candidateHash!==CANDIDATE)decision='R11_BLS_CANDIDATE_MISMATCH_STOP';
 else if(!projectScanned||truncated)decision='WORKTREE_REGISTRY_INCOMPLETE_STOP';
 else if(matches.length===0)decision='APPROVED_WORKTREE_NOT_FOUND_STOP';
 else if(matches.length>1)decision='APPROVED_WORKTREE_AMBIGUOUS_STOP';
 else if(!matches[0].gitReadable||!matches[0].protectedClean||matches[0].parserBlob!==BASELINE)decision='APPROVED_WORKTREE_UNCLEAN_STOP';
 else if(matches[0].scheduled)decision='SCHEDULER_AND_APPROVED_WORKTREE_ALIGNED_NO_CHANGES_MADE';
 return {
  audit:'MARKET_CALENDAR_R13_RUNTIME_LINEAGE',at:new Date().toISOString(),
  policy:'READ_ONLY_NO_GIT_WRITE_NO_CONFIG_NO_DB_NO_TASK_NO_COLLECTION_NO_PUBLICATION',
  source:{approved,writerStatus:writer?.status==='VERIFIED'?'VERIFIED':'OTHER',writerSource:sha(writer?.source),writerAt:typeof writer?.at==='string'?writer.at:null,ledgerStatus:ledger?.status==='VERIFIED'?'VERIFIED':'OTHER',ledgerSource:sha(ledger?.source)},
  scheduled:{xmlRead:Boolean(xml),exactLauncherPathParsed:Boolean(scheduledFile),sameAsConfiguredDataRoot:scheduledSameFile,launcherRead:launcher!==null,checkoutResolved:Boolean(scheduledRoot),checkoutId:scheduledRoot?identity(scheduledRoot):null,head:scheduledHead,parserBlob:scheduledBlob},
  registry:{projectScanned,directRepos,registriesRead,worktreeEntries,truncated,approvedMatches:matches},
  candidate:{sha256:candidateHash,expectedSha256:CANDIDATE,expectedBaselineBlob:BASELINE},
  decision
 };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];
 if(!output){console.error('MISSING_REPORT_PATH');process.exitCode=2;}
 else try{fs.writeFileSync(output,JSON.stringify(runR13(),null,2)+'\n','utf8');console.log('MARKET_CALENDAR_R13_RESULT_WRITTEN');}
 catch{console.error('MARKET_CALENDAR_R13_EXECUTION_ERROR');process.exitCode=2;}
}
