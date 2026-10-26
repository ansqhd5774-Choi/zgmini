// Read-only Windows R13 runner and separate display-news cache inventory.
// Do not print scheduler arguments, local paths, article content, or credentials.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const TASK_NAME='ZGMINI-PC-Iran-Progress-R13';
const DAY_MS=86400000;
const newsCacheName='news-display-r1.json';

export function decodeTaskXml(bytes){
 if(!Buffer.isBuffer(bytes))throw Error('TASK_XML_BYTES_INVALID');
 if(bytes.length>=2&&bytes[0]===0xff&&bytes[1]===0xfe)return bytes.subarray(2).toString('utf16le');
 if(bytes.length>=2&&bytes[0]===0xfe&&bytes[1]===0xff){
  const swapped=Buffer.from(bytes.subarray(2));swapped.swap16();return swapped.toString('utf16le');
 }
 if(bytes.length>=4&&bytes[1]===0&&bytes[3]===0)return bytes.toString('utf16le');
 return bytes.toString('utf8');
}

function decodeEntities(value){
 return value.replace(/&(amp|lt|gt|quot|apos);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[key]);
}
export function summarizeTaskXml(xml){
 const commands=[...xml.matchAll(/<Command>([\s\S]*?)<\/Command>/gi)];
 const argumentsList=[...xml.matchAll(/<Arguments>([\s\S]*?)<\/Arguments>/gi)];
 if(!/<Task\b/i.test(xml)||commands.length!==1)throw Error('TASK_ACTION_NOT_SINGLE_EXEC');
 const command=decodeEntities(commands[0][1]);
 const args=argumentsList.length===1?decodeEntities(argumentsList[0][1]):'';
 const joined=command+' '+args;
 return {
  actionExecutable:path.win32.basename(command.trim().replace(/^"|"$/g,'')),
  hasArguments:args.length>0,
  referencesR3Wrapper:/run-reference-flow-r3\.mjs/i.test(joined),
  referencesR5Flag:/(?:^|\s)--r5(?:\s|$)/i.test(args),
  referencesBatch:/\.cmd(?:\s|"|$)/i.test(joined),
  actionChainReviewRequired:!/run-reference-flow-r3\.mjs/i.test(joined),
 };
}

function kstDay(time){return new Date(time+9*3600000).toISOString().slice(0,10);}
export function summarizeCache(cache,now=Date.now()){
 if(cache?.version!=='IRAN_NEWS_PC_DISPLAY_R1'||!Array.isArray(cache.items))throw Error('NEWS_CACHE_FORMAT_INVALID');
 const start=new Date(Date.parse(kstDay(now)+'T00:00:00Z')-29*DAY_MS).toISOString().slice(0,10);
 let expired=0,within30=0,invalidDate=0;
 for(const item of cache.items){
  const at=Date.parse(item?.publishedAt??'');
  if(!Number.isFinite(at)||at>now){invalidDate++;continue;}
  if(kstDay(at)<start)expired++;else within30++;
 }
 return {total:cache.items.length,within30,expired,invalidDate,windowStartKst:start,windowEndKst:kstDay(now)};
}

export function runReadOnlyAudit({taskName=TASK_NAME,newsHome=process.env.ZGMINI_IRAN_HOME??path.join(os.homedir(),'.zgmini','iran-progress-r13'),now=Date.now()}={}){
 const result={status:'NEEDS_REVIEW',readOnly:true,taskName,task:{found:false},cache:{found:false},ledger:{found:false}};
 const query=spawnSync('schtasks.exe',['/Query','/TN',taskName,'/XML'],{encoding:'buffer',windowsHide:true,maxBuffer:1024*1024,timeout:20000});
 if(query.error)result.task={found:false,errorCode:query.error.code??'EXEC_FAILURE'};
 else if(query.status!==0)result.task={found:false,exitCode:query.status};
 else{
  try{result.task={found:true,...summarizeTaskXml(decodeTaskXml(query.stdout))};}
  catch(error){result.task={found:true,structure:'UNVERIFIED',reason:error.message};}
 }
 const sqlite=path.join(newsHome,'iran.sqlite');
 const cachePath=path.join(newsHome,newsCacheName);
 result.ledger={found:fs.existsSync(sqlite)&&fs.statSync(sqlite).isFile(),modified:false};
 if(fs.existsSync(cachePath)){
  try{
   const st=fs.lstatSync(cachePath);
   if(!st.isFile()||st.isSymbolicLink()||st.size>2*1024*1024)throw Error('NEWS_CACHE_UNSAFE_TARGET');
   result.cache={found:true,...summarizeCache(JSON.parse(fs.readFileSync(cachePath,'utf8')),now)};
  }catch(error){result.cache={found:true,structure:'UNVERIFIED',reason:error.message};}
 }
 result.status=result.task.found&&result.task.structure!=='UNVERIFIED'&&result.ledger.found&&result.cache.found&&
  result.cache.structure!=='UNVERIFIED'?'PASS_RUNNER_READ_ONLY_INVENTORY':'STOP_READ_ONLY_INVENTORY_INCOMPLETE';
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--read-only')throw Error('RUNNER_AUDIT_READ_ONLY_REQUIRED');
 try{const report=runReadOnlyAudit();console.log(JSON.stringify(report));if(report.status!=='PASS_RUNNER_READ_ONLY_INVENTORY')process.exitCode=1;}
 catch(error){console.error(JSON.stringify({status:'STOP_RUNNER_READ_ONLY_AUDIT',reason:error.message,readOnly:true}));process.exitCode=1;}
}
