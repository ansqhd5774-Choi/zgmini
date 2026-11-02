// ER1 one-shot PC publisher. Never part of Core / recurring schedules.
// Publishes only previously computed, independently gated derived scores.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {validateER1PublicDisplay,ER1_EARNINGS_DISPLAY_PUBLIC_KEY} from
 '../../lib/market-calendar-er1-public-display.mjs';

const READER_HEADER='ZGMINI-ER1-97';
const sha=text=>createHash('sha256').update(text).digest('hex');
const stop=code=>{throw Error(code)};
const isFile=file=>{try{return fs.statSync(file).isFile()}catch{return false}};

function jsonFile(file,maxBytes){
 if(!isFile(file))stop('ER1_PUBLISH_REQUIRED_FILE_MISSING_STOP');
 const bytes=fs.statSync(file).size;
 if(bytes<20||bytes>maxBytes)stop('ER1_PUBLISH_FILE_SIZE_STOP');
 try{return JSON.parse(fs.readFileSync(file,'utf8'))}
 catch{stop('ER1_PUBLISH_JSON_INVALID_STOP')}
}

export async function verifyER1ReaderDeployed({url,fetchImpl=fetch}={}){
 const probe=url??'https://zgmini.kr/api/earnings-calendar-display?start=2026-11-02&end=2026-11-02';
 let response;
 try{response=await fetchImpl(probe,{method:'GET',redirect:'error',signal:AbortSignal.timeout(12000)})}
 catch{stop('ER1_READER_PROBE_UNAVAILABLE_STOP')}
 if(!response.ok&&response.status!==204)stop('ER1_READER_PROBE_HTTP_STOP');
 if(response.headers.get('x-zgmini-earnings-grade-reader')!==READER_HEADER)
  stop('ER1_READER_NOT_DEPLOYED_STOP');
 return true;
}

export async function publishER1Once({pcHome,repoRoot,
 publicFile=path.join(pcHome??'', 'er1-input','er1-public-display.json'),
 now=Date.now(),readerGate=verifyER1ReaderDeployed,remoteFactory,
 headResolver=root=>execFileSync('git',['rev-parse','HEAD'],
  {cwd:root,encoding:'utf8',windowsHide:true,timeout:12000}).trim()}={}){
 if(typeof pcHome!=='string'||!path.isAbsolute(pcHome)||
  typeof repoRoot!=='string'||!path.isAbsolute(repoRoot)||
  !path.isAbsolute(publicFile)||!Number.isFinite(now)||now<=0)
  stop('ER1_PUBLISH_PATH_OR_TIME_STOP');
 const snapshot=jsonFile(publicFile,1_750_000);
 if(!validateER1PublicDisplay(snapshot,{now}))
  stop('ER1_PUBLISH_INVALID_DERIVED_SCORES_STOP');
 const body=JSON.stringify(snapshot),digest=sha(body);
 if(Buffer.byteLength(body,'utf8')>1_750_000)
  stop('ER1_PUBLISH_PAYLOAD_SIZE_STOP');
 const config=jsonFile(path.join(pcHome,'config.json'),64000);
 if(config?.collectionTarget!=='pc'||config.enabled!==true||
  typeof config.core!=='string'||!config.core.trim()||
  typeof config.source!=='string'||!/^[a-f0-9]{40}$/i.test(config.source))
  stop('ER1_PUBLISH_CONFIG_INVALID_STOP');
 if(!isFile(path.join(repoRoot,'scripts','pc-writer','d1.mjs')))
  stop('ER1_PUBLISH_PC_SOURCE_MISSING_STOP');
 let current;
 try{current=headResolver(repoRoot)}catch{stop('ER1_PUBLISH_SOURCE_READ_FAILED_STOP')}
 if(current!==config.source)stop('ER1_PUBLISH_SOURCE_DRIFT_STOP');
 // Reader deployment must be proven BEFORE opening the remote D1 writer.
 if(await readerGate()!==true)stop('ER1_READER_NOT_DEPLOYED_STOP');
 const lockPath=path.join(pcHome,'er1-input','er1-manual-publish.lock');
 let lock;
 try{lock=fs.openSync(lockPath,'wx')}
 catch(error){if(error?.code==='EEXIST')stop('ER1_PUBLISH_LOCK_BUSY_STOP');throw error}
 try{
  const remote=remoteFactory?await remoteFactory({repoRoot,config}):await (async()=>{
   const {client,credential}=await import(pathToFileURL(path.join(repoRoot,'scripts','pc-writer','d1.mjs')).href);
   return client(config,credential(repoRoot));
  })();
  const lookup="SELECT body,stored_at FROM public_feed_snapshots_v1 WHERE kind='output' AND feed_key=? AND snapshot_key='current'";
  const prior=(await remote.query(config.core,lookup,[ER1_EARNINGS_DISPLAY_PUBLIC_KEY])).results?.[0]??null;
  if(prior){
   if(prior.body===body)return {status:'ER1_ALREADY_PUBLISHED',dbWrites:0,
    providerRequests:0,scoreableIssuers:snapshot.recordCount,star3Count:snapshot.star3Count,sha256:digest};
   let existing;
   try{existing=JSON.parse(prior.body)}catch{stop('ER1_PUBLISH_REMOTE_FORMAT_UNKNOWN_STOP')}
   if(!validateER1PublicDisplay(existing,{now}))stop('ER1_PUBLISH_REMOTE_FORMAT_UNKNOWN_STOP');
   if(existing.asOf>=snapshot.asOf)stop('ER1_PUBLISH_REMOTE_NEWER_OR_CONFLICT_STOP');
  }
  const at=Date.now();
  await remote.request(config.core,[{sql:
   "INSERT INTO public_feed_snapshots_v1(kind,feed_key,snapshot_key,body,stored_at) VALUES('output',?,'current',?,?) ON CONFLICT(kind,feed_key,snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at WHERE excluded.stored_at>public_feed_snapshots_v1.stored_at",
   params:[ER1_EARNINGS_DISPLAY_PUBLIC_KEY,body,at]}]);
  const readback=(await remote.query(config.core,lookup,[ER1_EARNINGS_DISPLAY_PUBLIC_KEY])).results?.[0]??null;
  if(readback?.body!==body||readback?.stored_at!==at)
   stop('ER1_PUBLISH_D1_READBACK_FAILED_STOP');
  return {status:'ER1_D1_PUBLISHED_AND_READBACK',dbWrites:1,providerRequests:0,
   scoreableIssuers:snapshot.recordCount,star3Count:snapshot.star3Count,sha256:digest};
 }finally{fs.closeSync(lock);fs.unlinkSync(lockPath)}
}

// Explicit manual invocation only, after the public ER1 reader is deployed.
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const pcHome=process.argv[2]??String.raw`E:\ZGmini\data\pc-writer`;
 const repoRoot=process.argv[3]??path.resolve(fileURLToPath(import.meta.url),'../../..');
 try{
  const result=await publishER1Once({pcHome,repoRoot});
  // Aggregate metadata only: no issuer list, raw actuals, key or URL.
  process.stdout.write(Object.entries(result).map(([key,val])=>
   `${key.toUpperCase()}=${JSON.stringify(val)}`).join('\r\n')+'\r\n');
 }catch(error){
  const reason=String(error?.message??'');
  process.stdout.write('STATUS="BLOCKED"\r\nERROR='+
   JSON.stringify(/^ER1_[A-Z0-9_]+$/.test(reason)?reason:'ER1_PUBLISH_UNKNOWN_STOP')+'\r\n');
  process.exitCode=1;
 }
}
