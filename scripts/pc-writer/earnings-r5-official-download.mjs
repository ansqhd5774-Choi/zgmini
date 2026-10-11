import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {Readable} from "node:stream";
import {pipeline} from "node:stream/promises";
import {execFileSync} from "node:child_process";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const MAX_BYTES=Object.freeze({
  secCompanyFacts:2_500_000_000,
  blsUnitLaborCost:250_000_000,
  blsProducerInput:100_000_000,
  beaCorporateProfits:100_000_000,
});
const REQUEST_TIMEOUT_MS=30*60*1000;

async function sha256File(file){
  const hash=createHash("sha256");
  await new Promise((resolve,reject)=>{
    const stream=fs.createReadStream(file);
    stream.on("data",chunk=>hash.update(chunk));
    stream.on("end",resolve);
    stream.on("error",reject);
  });
  return hash.digest("hex");
}

async function boundedDownload({sourceKey,source,target,fetchImpl=globalThis.fetch}){
  if(typeof fetchImpl!=="function")throw Object.assign(new Error("FETCH_UNAVAILABLE"),{code:"FETCH_UNAVAILABLE"});
  if(fs.existsSync(target)&&fs.statSync(target).isFile()&&fs.statSync(target).size>0){
    return {status:"SKIPPED_EXISTING",sourceKey,url:source.url,file:target,bytes:fs.statSync(target).size,sha256:await sha256File(target),requestCount:0};
  }
  fs.mkdirSync(path.dirname(target),{recursive:true});
  const part=`${target}.part`;
  try{fs.rmSync(part,{force:true});}catch{}
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  let response;
  try{
    const headers={Accept:"*/*"};
    if(source.userAgent)headers["User-Agent"]=source.userAgent;
    response=await fetchImpl(source.url,{method:"GET",redirect:"error",headers,signal:controller.signal});
  }catch(error){
    clearTimeout(timer);
    throw Object.assign(new Error("DOWNLOAD_REQUEST_FAILED"),{code:"DOWNLOAD_REQUEST_FAILED",sourceKey,causeCode:error?.code??null});
  }
  if(!response?.ok||!response.body){
    clearTimeout(timer);
    throw Object.assign(new Error("DOWNLOAD_HTTP_FAILED"),{code:"DOWNLOAD_HTTP_FAILED",sourceKey,status:response?.status??null});
  }
  const declared=Number(response.headers?.get?.("content-length")??NaN);
  const maxBytes=MAX_BYTES[sourceKey]??100_000_000;
  if(Number.isFinite(declared)&&declared>maxBytes){
    clearTimeout(timer);
    throw Object.assign(new Error("DOWNLOAD_TOO_LARGE"),{code:"DOWNLOAD_TOO_LARGE",sourceKey,declared,maxBytes});
  }
  let bytes=0;
  const meter=new TransformStream({
    transform(chunk,controller){
      const length=chunk?.byteLength??chunk?.length??0;
      bytes+=length;
      if(bytes>maxBytes)throw Object.assign(new Error("DOWNLOAD_TOO_LARGE"),{code:"DOWNLOAD_TOO_LARGE",sourceKey,maxBytes});
      controller.enqueue(chunk);
    },
  });
  try{
    await pipeline(Readable.fromWeb(response.body.pipeThrough(meter)),fs.createWriteStream(part,{flags:"wx"}));
    fs.renameSync(part,target);
  }catch(error){
    try{fs.rmSync(part,{force:true});}catch{}
    clearTimeout(timer);
    throw Object.assign(new Error(error?.code==="DOWNLOAD_TOO_LARGE"?"DOWNLOAD_TOO_LARGE":"DOWNLOAD_STREAM_FAILED"),{code:error?.code==="DOWNLOAD_TOO_LARGE"?"DOWNLOAD_TOO_LARGE":"DOWNLOAD_STREAM_FAILED",sourceKey});
  }
  clearTimeout(timer);
  return {status:"DOWNLOADED",sourceKey,url:source.url,file:target,bytes,sha256:await sha256File(target),requestCount:1};
}

export async function downloadEarningsR5OfficialFiles({incoming,fetchImpl=globalThis.fetch}={}){
  const directory=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming");
  fs.mkdirSync(directory,{recursive:true});
  const manifest=E1_R5_OFFICIAL_SOURCE_MANIFEST;
  const keys=["secCompanyFacts","blsUnitLaborCost","blsProducerInput","beaCorporateProfits"];
  const results=[];
  for(const key of keys){
    const source=manifest[key];
    const target=path.join(directory,source.localName);
    results.push(await boundedDownload({sourceKey:key,source,target,fetchImpl}));
  }
  return {
    status:"COMPLETE",
    incoming:directory,
    requestCount:results.reduce((total,item)=>total+item.requestCount,0),
    dbWrites:0,
    results,
  };
}

function safeCompanyFactsEntry(entry){
  const normalized=String(entry??"").replace(/\\/g,"/");
  if(!normalized||normalized.startsWith("/")||normalized.includes("../"))return null;
  const match=normalized.match(/^(?:companyfacts\/)?(CIK\d{10}\.json)$/);
  return match?{entry:normalized,file:match[1]}:null;
}

export function selectCompanyFactsEntries(archiveEntries,universeCiks){
  const wanted=new Set([...(universeCiks??[])].map(cik=>`CIK${String(cik).padStart(10,"0")}.json`));
  const selected=[];
  const seen=new Set();
  for(const raw of archiveEntries??[]){
    const safe=safeCompanyFactsEntry(raw);if(!safe||!wanted.has(safe.file)||seen.has(safe.file))continue;
    seen.add(safe.file);selected.push(safe.entry);
  }
  return selected.sort();
}

function listTarEntries(zipFile,{execFile=execFileSync}={}){
  const stdout=execFile("tar",["-tf",zipFile],{encoding:"utf8",maxBuffer:64*1024*1024,windowsHide:true});
  return String(stdout??"").split(/\r?\n/).map(value=>value.trim()).filter(Boolean);
}

function extractTarEntries(zipFile,targetDir,entries,{execFile=execFileSync,batchSize=80}={}){
  fs.mkdirSync(targetDir,{recursive:true});
  for(let index=0;index<entries.length;index+=batchSize){
    const batch=entries.slice(index,index+batchSize);
    execFile("tar",["-xf",zipFile,"-C",targetDir,...batch],{stdio:"pipe",maxBuffer:16*1024*1024,windowsHide:true});
  }
}

export function extractEarningsR5CompanyFacts({zipFile,targetDir,coreFile,execFile=execFileSync}={}){
  if(!zipFile||!fs.existsSync(zipFile))return {status:"MISSING",reason:"COMPANYFACTS_ZIP_REQUIRED",extracted:0,dbWrites:0};
  const universe=readLatestEarningsUniverse(coreFile??path.join(defaultBase,"storage","core.sqlite"));
  if(universe.status!=="PASS")return {status:"PARTIAL",reason:"EARNINGS_UNIVERSE_REQUIRED",extracted:0,dbReads:universe.status==="MISSING"?0:1,dbWrites:0};
  let listed;
  try{listed=listTarEntries(zipFile,{execFile});}
  catch(error){return {status:"FAIL",reason:"TAR_LIST_FAILED",code:error?.code??null,extracted:0,dbReads:1,dbWrites:0};}
  const selected=selectCompanyFactsEntries(listed,universe.ciks);
  if(!selected.length)return {status:"PARTIAL",reason:"NO_UNIVERSE_COMPANYFACTS_IN_ZIP",archiveEntries:listed.length,selected:0,extracted:0,dbReads:1,dbWrites:0};
  const out=targetDir??path.join(path.dirname(zipFile),E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory);
  try{extractTarEntries(zipFile,out,selected,{execFile});}
  catch(error){return {status:"FAIL",reason:"TAR_EXTRACT_FAILED",code:error?.code??null,archiveEntries:listed.length,selected:selected.length,extracted:0,dbReads:1,dbWrites:0};}
  const extracted=selected.filter(entry=>fs.existsSync(path.join(out,path.basename(entry)))).length;
  return {
    status:extracted===selected.length?"PASS":"PARTIAL",
    reason:extracted===selected.length?null:"COMPANYFACTS_EXTRACTION_INCOMPLETE",
    archiveEntries:listed.length,
    universeCount:universe.ciks.size,
    selected:selected.length,
    extracted,
    targetDir:out,
    dbReads:1,
    dbWrites:0,
  };
}

export async function collectEarningsR5OfficialPreflightInputs(options={}){
  const incoming=options.incoming??path.join(defaultBase,"manual-input","e1-r5","incoming");
  const download=await downloadEarningsR5OfficialFiles({incoming,fetchImpl:options.fetchImpl});
  const extraction=extractEarningsR5CompanyFacts({
    zipFile:path.join(incoming,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.localName),
    targetDir:path.join(incoming,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory),
    coreFile:options.coreFile??path.join(defaultBase,"storage","core.sqlite"),
    execFile:options.execFile??execFileSync,
  });
  return {
    status:extraction.status==="PASS"?"COMPLETE":"PARTIAL",
    networkCalls:download.requestCount,
    dbWrites:0,
    download,
    extraction,
  };
}
