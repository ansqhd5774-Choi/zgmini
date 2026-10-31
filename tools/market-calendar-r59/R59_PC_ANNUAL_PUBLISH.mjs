// R59 one-time user-triggered FHS-R3 annual grade publisher. No SEC/provider calls.
// The R58 private JSON is never sent to Cloudflare: only derived grades/score/date.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {publishableFhsAnnualFromPrivate,FHS_R3_PUBLIC_KEY,validateFhsAnnualSnapshot} from './market-calendar-fhs-r3-public.mjs';
import {resolveR58Source,PRIVATE_NAME} from './R59_FIND_SOURCE.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const PC=String.raw`E:\ZGmini\data\pc-writer`;
const SHADOW_NAME=PRIVATE_NAME;
const RESULT=path.join(HERE,'MARKET_CALENDAR_R59_PUBLISH_RESULT.txt');
const sha=x=>createHash('sha256').update(x).digest('hex');
const code=e=>/^[A-Z0-9_]{4,100}$/.test(e?.message??'')?e.message:'R59_UNCLASSIFIED_STOP';
const isFile=p=>{try{return fs.statSync(p).isFile()}catch{return false}};
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function taskRoot(){
 const task=execFileSync('schtasks.exe',['/Query','/TN','ZGMINI-PC-Local-Core','/XML'],{windowsHide:true,timeout:15000});
 const xml=(task[0]===255&&task[1]===254||task.includes(0)?task.toString('utf16le'):task.toString('utf8')).replace(/^\ufeff/,'');
 const args=[...xml.matchAll(/<Arguments(?:\s+[^>]*)?>([\s\S]*?)<\/Arguments>/gi)];
 if(args.length!==1)throw Error('R59_TASK_AMBIGUOUS_STOP');
 const text=args[0][1].replace(/&quot;|&#34;/gi,'"').replace(/&amp;/gi,'&');
 const pathMatch=[...text.matchAll(/"([^"\r\n]*[\\/]run-local-core\.vbs)"/gi)];
 if(pathMatch.length!==1)throw Error('R59_TASK_SOURCE_UNRESOLVED_STOP');
 const wrapper=fs.readFileSync(pathMatch[0][1],'utf8');
 if(!wrapper.includes('ZGMINI_R38_WRAPPER_V1'))throw Error('R59_WRAPPER_ID_UNVERIFIED_STOP');
 const origins=[...wrapper.matchAll(/^[ \t]*origin[ \t]*=[ \t]*"((?:[^"\r\n]|"")*)"[ \t]*(?:\x27[^\r\n]*)?$/gim)];
 if(origins.length!==1)throw Error('R59_ORIGIN_UNRESOLVED_STOP');
 const origin=fs.readFileSync(origins[0][1].replaceAll('""','"'),'utf8');
 const matches=[...origin.matchAll(/((?:[a-z]:[\\/]|\/)[^"'\r\n<>]*?[\\/]scripts[\\/]pc-writer[\\/](?:local-cycle|quota-runner|run-local|collect-local)\.mjs)/gi)].map(m=>m[1]);
 const uniq=[...new Set(matches.map(p=>path.win32.resolve(p).toLowerCase()))];
 if(uniq.length!==1)throw Error('R59_ORIGIN_SCRIPT_AMBIGUOUS_STOP');
 return path.win32.resolve(uniq[0],'..','..','..');
}
export async function verifyPublicReaderDeployed({url='https://zgmini.kr/api/earnings-calendar-display?start=2026-10-31&end=2026-10-31',fetchImpl=fetch}={}){
 let response;try{response=await fetchImpl(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(12000)});}catch{throw Error('R59_READER_PROBE_UNAVAILABLE_STOP')}
 if(!response.ok&&response.status!==204)throw Error('R59_READER_PROBE_HTTP_STOP');
 if(response.headers.get('x-zgmini-fhs-r3-reader')!=='ZGMINI-FHS-R3')throw Error('R59_PUBLIC_READER_NOT_DEPLOYED_STOP');
 return true;
}
export async function publication({privateFile,pcHome=PC,rootResolver=taskRoot,remoteFactory,readerGate=verifyPublicReaderDeployed}={}){
 if(!isFile(privateFile))throw Error('R59_PRIVATE_FILE_NOT_FOUND_STOP');
 const bytes=fs.statSync(privateFile).size;
 if(bytes<=100||bytes>1800000)throw Error('R59_PRIVATE_SIZE_INVALID_STOP');
 const source=readJson(privateFile),publicSnapshot=publishableFhsAnnualFromPrivate(source);
 const body=JSON.stringify(publicSnapshot),hash=sha(body);
 if(Buffer.byteLength(body,'utf8')>1750000)throw Error('R59_PUBLIC_PAYLOAD_TOO_LARGE_STOP');
 // Public reader must be deployed BEFORE we touch any annual data or D1.
 await readerGate();
 // Save the sanitized, complete annual output locally before any external publication.
 const targetDir=path.join(pcHome,'annual-fhs-r3');
 const localFile=path.join(targetDir,`fhs-r3-${publicSnapshot.asOf}.json`);
 if(isFile(localFile)){
  if(fs.readFileSync(localFile,'utf8')!==body)throw Error('R59_LOCAL_ANNUAL_CONFLICT_STOP');
 }else{
  fs.mkdirSync(targetDir,{recursive:true});
  fs.writeFileSync(localFile,body,{flag:'wx',encoding:'utf8'});
  if(fs.readFileSync(localFile,'utf8')!==body)throw Error('R59_LOCAL_ANNUAL_READBACK_STOP');
 }
 const root=rootResolver();
 if(!root||!isFile(path.join(root,'scripts','pc-writer','d1.mjs')))throw Error('R59_APPROVED_SOURCE_NOT_FOUND_STOP');
 const config=readJson(path.join(pcHome,'config.json'));
 const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,windowsHide:true,timeout:12000,encoding:'utf8'}).trim();
 if(!/^[a-f0-9]{40}$/.test(head)||config?.source!==head||config.collectionTarget!=='pc'||config.enabled!==true)
  throw Error('R59_PC_SOURCE_CONFIG_DRIFT_STOP');
 const lockFile=path.join(pcHome,'local-cycle.lock');
 let locked=false;
 try{
  const fd=fs.openSync(lockFile,'wx');locked=true;
  try{fs.writeFileSync(fd,JSON.stringify({pid:process.pid,purpose:'annual-fhs-r3-manual-publication'}))}finally{fs.closeSync(fd)}
 }catch(error){if(error?.code==='EEXIST')throw Error('R59_CORE_LOCK_BUSY_STOP');throw error}
 try{
  const remote=remoteFactory?await remoteFactory({root,config}):await (async()=>{
   const {client,credential}=await import(pathToFileURL(path.join(root,'scripts','pc-writer','d1.mjs')).href);
   return client(config,credential(root));
  })();
  const sql="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
  const existing=(await remote.query(config.core,sql,[FHS_R3_PUBLIC_KEY])).results?.[0]??null;
  if(existing){
   if(existing.body===body)return {status:'R59_ALREADY_PUBLISHED',count:publicSnapshot.recordCount,asOf:publicSnapshot.asOf,sha256:hash,dbWrites:0};
   let previous;try{previous=validateFhsAnnualSnapshot(JSON.parse(existing.body))}catch{throw Error('R59_REMOTE_FORMAT_UNKNOWN_STOP')}
   if(previous.asOf>=publicSnapshot.asOf)throw Error('R59_REMOTE_NEWER_OR_CONFLICT_STOP');
  }
  // Different calendar feed keys, scheduler, original vendor HTML are untouched.
  const at=Date.now();
  await remote.request(config.core,[{sql:
   "INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>public_feed_snapshots_v1.stored_at",
   params:[FHS_R3_PUBLIC_KEY,body,at]}]);
  const check=(await remote.query(config.core,sql,[FHS_R3_PUBLIC_KEY])).results?.[0]??null;
  if(check?.body!==body||check?.stored_at!==at)throw Error('R59_D1_READBACK_UNKNOWN_STOP');
  return {status:'R59_D1_ANNUAL_PUBLISHED_AND_READBACK',count:publicSnapshot.recordCount,asOf:publicSnapshot.asOf,sha256:hash,dbWrites:1};
 }finally{if(locked)fs.unlinkSync(lockFile)}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(isFile(RESULT)){process.stdout.write('R59_RESULT_ALREADY_EXISTS_STOP\n');process.exitCode=2}
 else{
  let result;try{
   const located=resolveR58Source({hint:process.argv[2]??'',workingDir:HERE,envFile:process.env.ZGMINI_R58_SOURCE??''});
   if(located.status!=='READY')throw Error(located.status);
   result=await publication({privateFile:path.join(located.folder,SHADOW_NAME)});
   result.sourceSelection=located.method;
  }catch(e){
   const status=code(e);
   const beforeWrite=/^R59_(?:SOURCE_|PRIVATE_|PUBLIC_READER_|READER_PROBE_|PUBLIC_PAYLOAD_|FHS_PUBLIC_)/.test(status);
   result={status,dbWrites:beforeWrite?0:null,doNotRerunBeforeReadback:!beforeWrite};
  }
  fs.writeFileSync(RESULT,['AUDIT=MARKET_CALENDAR_R59',...Object.entries(result).map(([k,v])=>`${k}=${JSON.stringify(v)}`)].join('\r\n')+'\r\n',{flag:'wx'});
  process.stdout.write(`STATUS=${result.status}\nRESULT=MARKET_CALENDAR_R59_PUBLISH_RESULT.txt\n`);
  if(!['R59_ALREADY_PUBLISHED','R59_D1_ANNUAL_PUBLISHED_AND_READBACK'].includes(result.status))process.exitCode=2;
 }
}
