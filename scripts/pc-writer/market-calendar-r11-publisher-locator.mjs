// R11 source-only locator: identify one clean checkout at the actually VERIFIED PC source.
// Read-only. Does not use Core task XML as proof of publisher identity.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const EXPECTED_SOURCE='ee41bb295200d248efc683841e0f1ba0bc4779ee';
const EXPECTED_PARSER_BLOB='f084e2a360b544257bb44a60b97875627c7ca371';
const EXPECTED_CANDIDATE_SHA256='54c737218a40fec6482b469f7962fe5e8cd7c040705d58072396cffcdcb74c08';
const safeSha=s=>typeof s==='string'&&/^[a-f0-9]{40}$/i.test(s)?s:null;
const git=(dir,args)=>{try{return execFileSync('git',args,{cwd:dir,encoding:'utf8',windowsHide:true,timeout:8000,stdio:['ignore','pipe','ignore']}).trim();}catch{return null;}};
const readJson=file=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}};
const fingerprint=dir=>createHash('sha256').update(path.resolve(dir).toLowerCase()).digest('hex').slice(0,12);

export function locate({projectRoot=String.raw`E:\ZGmini\projects`,dataRoot=process.env.ZGMINI_PC_HOME||String.raw`E:\ZGmini\data\pc-writer`,candidatePath=fileURLToPath(new URL('../../staging/market-calendar/r11-bls/lib/release-calendar.mjs',import.meta.url)),gitCall=git}={}){
 const config=readJson(path.join(dataRoot,'config.json'));
 const writer=readJson(path.join(dataRoot,'local-writer-last-run.json'));
 const ledger=readJson(path.join(dataRoot,'local-publication-ledger.json'));
 let candidates=[],scanned=0,state='SCANNED';
 try{
  const entries=fs.readdirSync(projectRoot,{withFileTypes:true}).filter(x=>x.isDirectory()&&!x.isSymbolicLink()&&x.name!=='legacy').slice(0,256);
  for(const entry of entries){
   const dir=path.join(projectRoot,entry.name);
   if(!fs.existsSync(path.join(dir,'.git'))||!fs.existsSync(path.join(dir,'scripts','pc-writer','run-local.mjs')))continue;
   scanned++;
   const head=safeSha(gitCall(dir,['rev-parse','HEAD']));
   if(head!==EXPECTED_SOURCE)continue;
   const parser=safeSha(gitCall(dir,['hash-object','lib/release-calendar.mjs']));
   const protectedDiff=gitCall(dir,['diff','--name-only','HEAD','--','lib','worker','scripts/pc-writer','package.json','package-lock.json']);
   candidates.push({id:fingerprint(dir),head,parserBlob:parser,
     protectedClean:protectedDiff==='',gitReadable:protectedDiff!==null});
  }
 }catch{state='PROJECT_DIRECTORY_UNAVAILABLE';}
 let candidateHash=null;
 try{candidateHash=createHash('sha256').update(fs.readFileSync(candidatePath)).digest('hex');}catch{}
 let decision='READY_FOR_EXACT_WORKTREE_SELECTION_NO_CHANGES_MADE';
 if(!config||safeSha(config.source)!==EXPECTED_SOURCE)decision='APPROVED_SOURCE_DRIFT_STOP';
 else if(config.enabled!==true||config.collectionTarget!=='pc')decision='PC_CONTRACT_DRIFT_STOP';
 else if(writer?.status!=='VERIFIED'||writer?.mode!=='PUBLISH'||safeSha(writer.source)!==EXPECTED_SOURCE||ledger?.status!=='VERIFIED'||safeSha(ledger.source)!==EXPECTED_SOURCE)decision='RECENT_VERIFIED_WRITER_NOT_MATCHED_STOP';
 else if(candidateHash!==EXPECTED_CANDIDATE_SHA256)decision='R11_BLS_CANDIDATE_MISMATCH_STOP';
 else if(state!=='SCANNED')decision='PROJECT_DIRECTORY_UNAVAILABLE_STOP';
 else if(candidates.length!==1)decision='APPROVED_SOURCE_WORKTREE_AMBIGUOUS_STOP';
 else if(!candidates[0].gitReadable||!candidates[0].protectedClean||candidates[0].parserBlob!==EXPECTED_PARSER_BLOB)decision='SOURCE_WORKTREE_DIRTY_OR_DRIFT_STOP';
 return {audit:'MARKET_CALENDAR_R11_PUBLISHER_LOCATOR',at:new Date().toISOString(),
  policy:'READ_ONLY_NO_GIT_WRITE_NO_DB_NO_CONFIG_NO_TASK_NO_COLLECTION_NO_PUBLISH',
  expected:{approvedSource:EXPECTED_SOURCE,parserBlob:EXPECTED_PARSER_BLOB,candidateSha256:EXPECTED_CANDIDATE_SHA256},
  config:{source:safeSha(config?.source),enabled:config?.enabled===true,collectionTarget:config?.collectionTarget==='pc'?'pc':'OTHER_OR_MISSING'},
  writer:{status:writer?.status==='VERIFIED'?'VERIFIED':'OTHER_OR_MISSING',source:safeSha(writer?.source),mode:writer?.mode==='PUBLISH'?'PUBLISH':'OTHER_OR_MISSING',at:typeof writer?.at==='string'?writer.at:null},
  ledger:{status:ledger?.status==='VERIFIED'?'VERIFIED':'OTHER_OR_MISSING',source:safeSha(ledger?.source),at:typeof ledger?.at==='string'?ledger.at:null},
  projects:{state,inspected:scanned,sourceHeadMatches:candidates.length,candidates},candidate:{sha256:candidateHash},decision};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=process.argv[2];
 if(!output){console.error('MISSING_REPORT_OUTPUT');process.exitCode=2;}
 else{
  try{fs.writeFileSync(output,JSON.stringify(locate(),null,2)+'\n',{encoding:'utf8',flag:'w'});console.log('MARKET_CALENDAR_R11_REPORT_WRITTEN');}
  catch{console.error('MARKET_CALENDAR_R11_REPORT_ERROR');process.exitCode=2;}
 }
}
