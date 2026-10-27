// R12: follow the Core scheduler's VBS launcher to the actual executable checkout.
// Read-only: no Git fetch/checkout, source/config/database/scheduler changes, or publication.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const BASELINE='f084e2a360b544257bb44a60b97875627c7ca371';
const CANDIDATE='54c737218a40fec6482b469f7962fe5e8cd7c040705d58072396cffcdcb74c08';
const validSha=v=>typeof v==='string'&&/^[0-9a-f]{40}$/i.test(v)?v:null;
const sha256=s=>createHash('sha256').update(s).digest('hex');
const readJson=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;}};
const git=(cwd,args)=>{try{return execFileSync('git',args,{cwd,encoding:'utf8',windowsHide:true,timeout:8000,stdio:['ignore','pipe','ignore']}).trim();}catch{return null;}};
const taskXml=()=>{try{
 const b=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],{windowsHide:true,timeout:10000,stdio:['ignore','pipe','ignore']});
 return b[0]===255&&b[1]===254||b.includes(0)?b.toString('utf16le'):b.toString('utf8');
}catch{return null;}};

export function identifyLauncher(text){
 if(typeof text!=='string'||!text)return null;
 const decoded=text.charCodeAt(0)===0xfeff?text.slice(1):text;
 // install-local.mjs escapes quoted Node arguments as doubled quotes in VBS.
 const matches=[...decoded.matchAll(/""([^"\r\n]+?[\\/]scripts[\\/]pc-writer[\\/](?:local-cycle|quota-runner)\.mjs)""/gi)];
 if(matches.length!==1)return null;
 return path.resolve(matches[0][1],'..','..','..');
}

export function runR12({dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,candidatePath=fileURLToPath(new URL('../../staging/market-calendar/r11-bls/lib/release-calendar.mjs',import.meta.url)),getTaskXml=taskXml,gitCall=git}={}){
 const config=readJson(path.join(dataRoot,'config.json'));
 const writer=readJson(path.join(dataRoot,'local-writer-last-run.json'));
 const ledger=readJson(path.join(dataRoot,'local-publication-ledger.json'));
 const approved=validSha(config?.source);
 const xml=getTaskXml();
 const taskMentionsLauncher=typeof xml==='string'&&xml.toLowerCase().includes('run-local-core.vbs');
 let launcher=null;
 try{launcher=fs.readFileSync(path.join(dataRoot,'run-local-core.vbs'),'utf8');}catch{}
 const checkout=identifyLauncher(launcher);
 let candidateHash=null;
 try{candidateHash=sha256(fs.readFileSync(candidatePath));}catch{}
 const state={resolved:Boolean(checkout),id:checkout?sha256(path.resolve(checkout).toLowerCase()).slice(0,12):null,head:null,parserBlob:null,protectedClean:null,gitReadable:false};
 if(checkout){
  state.head=validSha(gitCall(checkout,['rev-parse','HEAD']));
  state.parserBlob=validSha(gitCall(checkout,['hash-object','lib/release-calendar.mjs']));
  const changed=gitCall(checkout,['diff','--name-only','HEAD','--','lib','worker','scripts/pc-writer','package.json','package-lock.json']);
  state.gitReadable=changed!==null;
  state.protectedClean=changed==='';
 }
 let decision='READY_FOR_SINGLE_FILE_SOURCE_COMMIT_NO_CHANGES_MADE';
 if(!approved)decision='APPROVED_SOURCE_UNREADABLE_STOP';
 else if(config.enabled!==true||config.collectionTarget!=='pc')decision='PC_CONTRACT_CHANGED_STOP';
 else if(writer?.mode!=='PUBLISH'||writer?.status!=='VERIFIED'||validSha(writer.source)!==approved||ledger?.status!=='VERIFIED'||validSha(ledger.source)!==approved)decision='VERIFIED_PUBLISHER_SOURCE_MISMATCH_STOP';
 else if(!xml||!taskMentionsLauncher)decision='CORE_TASK_LAUNCHER_UNVERIFIED_STOP';
 else if(!checkout)decision='VBS_LAUNCHER_TARGET_UNRESOLVED_STOP';
 else if(state.head!==approved)decision='LAUNCHER_CHECKOUT_SOURCE_MISMATCH_STOP';
 else if(!state.gitReadable||!state.protectedClean||state.parserBlob!==BASELINE)decision='LAUNCHER_CHECKOUT_PARSER_OR_DIRTY_STOP';
 else if(candidateHash!==CANDIDATE)decision='R11_BLS_CANDIDATE_MISMATCH_STOP';
 return {audit:'MARKET_CALENDAR_R12_LAUNCHER_SOURCE',at:new Date().toISOString(),policy:'READ_ONLY_NO_REPO_WRITE_NO_CONFIG_NO_DB_NO_TASK_NO_COLLECT_NO_PUBLISH',
  approvedSource:approved,writer:{status:writer?.status==='VERIFIED'?'VERIFIED':'OTHER',source:validSha(writer?.source),at:typeof writer?.at==='string'?writer.at:null},
  ledger:{status:ledger?.status==='VERIFIED'?'VERIFIED':'OTHER',source:validSha(ledger?.source)},
  task:{xmlRead:Boolean(xml),coreLauncherReferenced:taskMentionsLauncher},launcher:{fileRead:launcher!==null,...state},
  parser:{expectedBlob:BASELINE,candidateHash,expectedCandidateHash:CANDIDATE},decision};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];
 if(!output){console.error('MISSING_REPORT_PATH');process.exitCode=2;}
 else{
  try{fs.writeFileSync(output,JSON.stringify(runR12(),null,2)+'\n','utf8');console.log('MARKET_CALENDAR_R12_RESULT_WRITTEN');}
  catch{console.error('MARKET_CALENDAR_R12_EXECUTION_ERROR');process.exitCode=2;}
 }
}
