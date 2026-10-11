import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {Readable} from "node:stream";
import {pipeline} from "node:stream/promises";
import {fileURLToPath} from "node:url";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const REQUEST_TIMEOUT_MS=30*60*1000;
const SOURCE_KEYS=Object.freeze([
  "blsUnitLaborCostSeries",
  "blsUnitLaborCostMeasure",
  "blsUnitLaborCostDuration",
  "blsProducerOutputSeries",
  "blsProducerOutputData",
  "censusSic1987ToNaics2002",
  "censusNaics2002To2007",
  "censusNaics2007To2012",
  "censusNaics2012To2017",
  "censusNaics2017To2022Changes",
  "censusNaics2022To2017Changes",
]);
const MAX_BYTES=Object.freeze({
  blsUnitLaborCostSeries:25_000_000,
  blsUnitLaborCostMeasure:5_000_000,
  blsUnitLaborCostDuration:5_000_000,
  blsProducerOutputSeries:100_000_000,
  blsProducerOutputData:250_000_000,
  censusSic1987ToNaics2002:10_000_000,
  censusNaics2002To2007:10_000_000,
  censusNaics2007To2012:10_000_000,
  censusNaics2012To2017:10_000_000,
  censusNaics2017To2022Changes:10_000_000,
  censusNaics2022To2017Changes:10_000_000,
});

async function sha256File(file){
  const hash=createHash("sha256");
  await new Promise((resolve,reject)=>{
    const stream=fs.createReadStream(file);
    stream.on("data",chunk=>hash.update(chunk));stream.on("end",resolve);stream.on("error",reject);
  });
  return hash.digest("hex");
}

async function boundedDownload({sourceKey,source,target,fetchImpl=globalThis.fetch}){
  if(typeof fetchImpl!=="function")throw Object.assign(new Error("FETCH_UNAVAILABLE"),{code:"FETCH_UNAVAILABLE"});
  if(fs.existsSync(target)&&fs.statSync(target).isFile()&&fs.statSync(target).size>0){
    return {status:"SKIPPED_EXISTING",sourceKey,url:source.url,file:target,bytes:fs.statSync(target).size,sha256:await sha256File(target),requestCount:0};
  }
  fs.mkdirSync(path.dirname(target),{recursive:true});
  const part=`${target}.part`;try{fs.rmSync(part,{force:true});}catch{}
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  let response;
  try{response=await fetchImpl(source.url,{method:"GET",redirect:"error",headers:{Accept:"*/*"},signal:controller.signal});}
  catch(error){clearTimeout(timer);throw Object.assign(new Error("DOWNLOAD_REQUEST_FAILED"),{code:"DOWNLOAD_REQUEST_FAILED",sourceKey,causeCode:error?.code??null});}
  if(!response?.ok||!response.body){clearTimeout(timer);throw Object.assign(new Error("DOWNLOAD_HTTP_FAILED"),{code:"DOWNLOAD_HTTP_FAILED",sourceKey,status:response?.status??null});}
  const maxBytes=MAX_BYTES[sourceKey];const declared=Number(response.headers?.get?.("content-length")??NaN);
  if(Number.isFinite(declared)&&declared>maxBytes){clearTimeout(timer);throw Object.assign(new Error("DOWNLOAD_TOO_LARGE"),{code:"DOWNLOAD_TOO_LARGE",sourceKey,declared,maxBytes});}
  let bytes=0;
  const meter=new TransformStream({transform(chunk,controller){bytes+=chunk?.byteLength??chunk?.length??0;if(bytes>maxBytes)throw Object.assign(new Error("DOWNLOAD_TOO_LARGE"),{code:"DOWNLOAD_TOO_LARGE",sourceKey,maxBytes});controller.enqueue(chunk);}});
  try{await pipeline(Readable.fromWeb(response.body.pipeThrough(meter)),fs.createWriteStream(part,{flags:"wx"}));fs.renameSync(part,target);}
  catch(error){try{fs.rmSync(part,{force:true});}catch{}clearTimeout(timer);throw Object.assign(new Error(error?.code==="DOWNLOAD_TOO_LARGE"?"DOWNLOAD_TOO_LARGE":"DOWNLOAD_STREAM_FAILED"),{code:error?.code==="DOWNLOAD_TOO_LARGE"?"DOWNLOAD_TOO_LARGE":"DOWNLOAD_STREAM_FAILED",sourceKey});}
  clearTimeout(timer);
  return {status:"DOWNLOADED",sourceKey,url:source.url,file:target,bytes,sha256:await sha256File(target),requestCount:1};
}

export async function downloadEarningsR5R14CostPressureFiles({incoming,fetchImpl=globalThis.fetch}={}){
  const directory=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming");fs.mkdirSync(directory,{recursive:true});
  const results=[];
  for(const sourceKey of SOURCE_KEYS){
    const source=E1_R5_OFFICIAL_SOURCE_MANIFEST[sourceKey];
    if(!source)throw Object.assign(new Error("R14_SOURCE_MANIFEST_MISSING"),{code:"R14_SOURCE_MANIFEST_MISSING",sourceKey});
    results.push(await boundedDownload({sourceKey,source,target:path.join(directory,source.localName),fetchImpl}));
  }
  return {status:"COMPLETE",incoming:directory,requestCount:results.reduce((sum,row)=>sum+row.requestCount,0),dbWrites:0,sourceKeys:[...SOURCE_KEYS],results};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const report=await downloadEarningsR5R14CostPressureFiles();
    console.log(JSON.stringify({status:report.status,incoming:report.incoming,requestCount:report.requestCount,dbWrites:0,results:report.results.map(row=>({sourceKey:row.sourceKey,status:row.status,bytes:row.bytes,sha256:row.sha256}))}));
  }catch(error){console.log(JSON.stringify({status:"FAILED",code:error?.code??"E1_R5_R14_DOWNLOAD_FAILED"}));process.exitCode=1;}
}
