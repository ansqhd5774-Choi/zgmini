import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {Readable} from "node:stream";
import {finished} from "node:stream/promises";
import {createWriteStream} from "node:fs";
import {fileURLToPath} from "node:url";
import {createQuotaFetch} from "./quota-fetch.mjs";
import {save} from "./d1.mjs";
import {readZipIndex,readZipEntryText,parseTsv} from "./sec-dera-zip-r1.mjs";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const STATE_NAME="local-sec-fund-flow-raw-backfill-r1.json";
const REPORT_NAME="local-sec-fund-flow-raw-backfill-last-run.json";
const TEMP_DIR_NAME="sec-dera-backfill-r1";
const NPORT_QUARTERS=Object.freeze([
  "2019q4","2020q1","2020q2","2020q3","2020q4",
  "2021q1","2021q2","2021q3","2021q4",
  "2022q1","2022q2","2022q3","2022q4",
  "2023q1","2023q2",
]);
const NCEN_BOOTSTRAP=Object.freeze(["2018q3","2018q4","2019q1","2019q2","2019q3","2019q4"]);
const MAX_DOWNLOAD_BYTES=800_000_000;
const SEC_HEADERS=Object.freeze({"user-agent":"ZGMINI/1.0 (+https://zgmini.kr)","accept-encoding":"gzip, deflate"});
const validDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const number=value=>{const x=Number(value);return Number.isFinite(x)?x:null};
const yes=value=>String(value??"").trim().toUpperCase()==="Y";
const quarterUrl=(kind,quarter)=>`https://www.sec.gov/files/dera/data/form-${kind==="nport"?"n-port":"n-cen"}-data-sets/${quarter}_${kind}.zip`;

function monthKey(date){return String(date??"").slice(0,7)}
function previousMonth(a,b){
  if(!validDate(a)||!validDate(b))return false;
  const [ay,am]=a.slice(0,7).split("-").map(Number),[by,bm]=b.slice(0,7).split("-").map(Number);
  return ay*12+am+1===by*12+bm;
}
function latestClassification(events,date){
  let found=null;
  for(const event of events??[]){if(event.filingDate<=date)found=event;else break}
  return found;
}
async function download(url,file,{fetchImpl,report}){
  if(fs.existsSync(file)&&fs.statSync(file).size>100)return {file,reused:true};
  const response=await fetchImpl(url,{headers:SEC_HEADERS,redirect:"follow",signal:AbortSignal.timeout(30*60*1000)});
  report.providerCalls++;
  if(!response.ok)throw new Error("SEC_DERA_HTTP_"+String(response.status??0));
  const hinted=Number(response.headers.get("content-length")??0);
  if(Number.isFinite(hinted)&&hinted>MAX_DOWNLOAD_BYTES)throw new Error("SEC_DERA_DOWNLOAD_TOO_LARGE");
  fs.mkdirSync(path.dirname(file),{recursive:true});
  let written=0;
  const out=createWriteStream(file+".tmp");
  const source=Readable.fromWeb(response.body);
  source.on("data",chunk=>{
    written+=chunk.length;
    if(written>MAX_DOWNLOAD_BYTES)source.destroy(Object.assign(new Error("SEC_DERA_DOWNLOAD_TOO_LARGE"),{code:"SEC_DERA_DOWNLOAD_TOO_LARGE"}));
  });
  source.pipe(out);
  await finished(out);
  fs.renameSync(file+".tmp",file);
  return {file,reused:false,bytes:written};
}
function submissionMap(rows,kind){
  const map=new Map();
  for(const row of rows){
    const accession=String(row.ACCESSION_NUMBER??"").trim();
    const filingDate=String(row.FILING_DATE??"").slice(0,10);
    if(!accession||!validDate(filingDate))continue;
    if(kind==="nport"){
      const subType=String(row.SUB_TYPE??"").trim();
      const reportDate=String(row.REPORT_DATE??"").slice(0,10);
      if(subType!=="NPORT-P"||!validDate(reportDate))continue;
      map.set(accession,{filingDate,reportDate});
    }else{
      const subType=String(row.SUBMISSION_TYPE??"").trim();
      if(subType!=="N-CEN")continue;
      map.set(accession,{filingDate});
    }
  }
  return map;
}
function processNcen(state,index){
  const submissions=submissionMap(parseTsv(readZipEntryText(index,"SUBMISSION.tsv",{maxBytes:30_000_000})),"ncen");
  const funds=parseTsv(readZipEntryText(index,"FUND_REPORTED_INFO.tsv",{maxBytes:80_000_000}));
  let masters=[];
  try{masters=parseTsv(readZipEntryText(index,"MASTER_FUNDS.tsv",{maxBytes:30_000_000}))}catch{}
  const feederIds=new Set(masters.map(row=>String(row.FUND_ID??"").trim()).filter(Boolean));
  let events=0;
  for(const row of funds){
    const accession=String(row.ACCESSION_NUMBER??"").trim(),seriesId=String(row.SERIES_ID??"").trim(),fundId=String(row.FUND_ID??"").trim();
    const sub=submissions.get(accession);
    if(!sub||!seriesId)continue;
    const event={
      filingDate:sub.filingDate,
      isIndex:yes(row.IS_INDEX)||yes(row.IS_MULTI_INVERSE_INDEX),
      isFundOfFund:yes(row.IS_FUND_OF_FUND)||feederIds.has(fundId),
    };
    const list=state.classifications[seriesId]??=[];
    if(!list.some(x=>x.filingDate===event.filingDate&&x.isIndex===event.isIndex&&x.isFundOfFund===event.isFundOfFund)){
      list.push(event);list.sort((a,b)=>a.filingDate.localeCompare(b.filingDate));state.classifications[seriesId]=list;events++;
    }
  }
  return {events,series:Object.keys(state.classifications).length};
}
function processNport(state,index){
  const submissions=submissionMap(parseTsv(readZipEntryText(index,"SUBMISSION.tsv",{maxBytes:30_000_000})),"nport");
  const funds=parseTsv(readZipEntryText(index,"FUND_REPORTED_INFO.tsv",{maxBytes:140_000_000}));
  const groups=new Map();
  for(const row of funds){
    const accession=String(row.ACCESSION_NUMBER??"").trim(),seriesId=String(row.SERIES_ID??"").trim();
    const sub=submissions.get(accession);
    if(!sub||!seriesId)continue;
    const netAssets=number(row.NET_ASSETS),sales=number(row.SALES_FLOW_MON3),reinvest=number(row.REINVESTMENT_FLOW_MON3),redeem=number(row.REDEMPTION_FLOW_MON3);
    if(!finite(netAssets)||netAssets<=0||![sales,reinvest,redeem].every(finite))continue;
    const item={seriesId,reportDate:sub.reportDate,filingDate:sub.filingDate,netAssets,netFlow:sales+reinvest-redeem,outflow:redeem};
    const key=seriesId+"|"+sub.reportDate;
    const prior=groups.get(key);
    if(!prior||item.filingDate<prior.filingDate)groups.set(key,item);
  }
  const byMonth=new Map();
  for(const item of groups.values()){
    if(!byMonth.has(item.reportDate))byMonth.set(item.reportDate,[]);
    byMonth.get(item.reportDate).push(item);
  }
  let produced=0;
  for(const [reportDate,items] of [...byMonth.entries()].sort(([a],[b])=>a.localeCompare(b))){
    const signalDate=items.reduce((max,item)=>item.filingDate>max?item.filingDate:max,"0000-00-00");
    const totals={all:{net:0,outflow:0,assets:0,count:0},index:{net:0,outflow:0,assets:0,count:0},nonIndex:{net:0,outflow:0,assets:0,count:0}};
    let classifiableAssets=0,possibleAssets=0,skippedFundOfFund=0;
    for(const item of items){
      const prior=state.lastFund[item.seriesId];
      if(!prior||!previousMonth(prior.reportDate,item.reportDate)||!finite(prior.netAssets)||prior.netAssets<=0){
        state.lastFund[item.seriesId]={reportDate:item.reportDate,netAssets:item.netAssets};
        continue;
      }
      possibleAssets+=prior.netAssets;
      const classification=latestClassification(state.classifications[item.seriesId],signalDate);
      if(classification){
        classifiableAssets+=prior.netAssets;
        if(classification.isFundOfFund){skippedFundOfFund++;state.lastFund[item.seriesId]={reportDate:item.reportDate,netAssets:item.netAssets};continue}
        const bucket=classification.isIndex?"index":"nonIndex";
        totals[bucket].net+=item.netFlow;totals[bucket].outflow+=item.outflow;totals[bucket].assets+=prior.netAssets;totals[bucket].count++;
        totals.all.net+=item.netFlow;totals.all.outflow+=item.outflow;totals.all.assets+=prior.netAssets;totals.all.count++;
      }
      state.lastFund[item.seriesId]={reportDate:item.reportDate,netAssets:item.netAssets};
    }
    if(totals.all.assets>0){
      state.monthly[reportDate]={
        observationDate:reportDate,
        availableAt:signalDate,
        allNetRatio:100*totals.all.net/totals.all.assets,
        indexNetRatio:totals.index.assets>0?100*totals.index.net/totals.index.assets:null,
        nonIndexNetRatio:totals.nonIndex.assets>0?100*totals.nonIndex.net/totals.nonIndex.assets:null,
        allOutflowRatio:-100*totals.all.outflow/totals.all.assets,
        classificationCoverageRatio:possibleAssets>0?classifiableAssets/possibleAssets:null,
        fundCount:totals.all.count,
        indexFundCount:totals.index.count,
        nonIndexFundCount:totals.nonIndex.count,
        skippedFundOfFund,
      };
      produced++;
    }
  }
  return {produced,filings:groups.size};
}
function loadState(file){
  if(!fs.existsSync(file))return {version:1,nportProcessed:[],ncenProcessed:[],classifications:{},lastFund:{},monthly:{}};
  const state=JSON.parse(fs.readFileSync(file,"utf8"));
  if(state?.version!==1)throw new Error("SEC_RAW_BACKFILL_STATE_VERSION");
  return state;
}
function ncenNeeded(state,targetQuarter){
  const sequence=["2018q3","2018q4","2019q1","2019q2","2019q3","2019q4","2020q1","2020q2","2020q3","2020q4","2021q1","2021q2","2021q3","2021q4","2022q1","2022q2","2022q3","2022q4","2023q1","2023q2"];
  const target=sequence.indexOf(targetQuarter);
  return sequence.slice(0,target+1).filter(q=>!state.ncenProcessed.includes(q));
}

export async function backfillSecRawFundFlows(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE){
  const stateFile=path.join(base,STATE_NAME),reportFile=path.join(base,REPORT_NAME),tempDir=path.join(base,TEMP_DIR_NAME);
  const state=loadState(stateFile);
  const target=NPORT_QUARTERS.find(q=>!state.nportProcessed.includes(q))??null;
  const originalFetch=globalThis.fetch;
  const quota=createQuotaFetch({base,originalFetch,mode:"enforce"});
  globalThis.fetch=quota.fetch;
  const report={version:1,status:"RUNNING",at:new Date().toISOString(),noPublish:true,dbSchemaChanged:false,providerCalls:0,targetQuarter:target,ncenProcessedThisRun:[],nportProcessedThisRun:null};
  try{
    if(!target){
      report.status="COMPLETE";report.months=Object.keys(state.monthly).length;report.first=Object.keys(state.monthly).sort()[0]??null;report.last=Object.keys(state.monthly).sort().at(-1)??null;return report;
    }
    for(const quarter of ncenNeeded(state,target)){
      const file=path.join(tempDir,quarter+"_ncen.zip");
      await download(quarterUrl("ncen",quarter),file,{fetchImpl:globalThis.fetch,report});
      const result=processNcen(state,readZipIndex(file));
      state.ncenProcessed.push(quarter);
      report.ncenProcessedThisRun.push({quarter,...result});
      save(stateFile,state);
      fs.rmSync(file,{force:true});
    }
    const file=path.join(tempDir,target+"_nport.zip");
    const downloadResult=await download(quarterUrl("nport",target),file,{fetchImpl:globalThis.fetch,report});
    const processed=processNport(state,readZipIndex(file));
    state.nportProcessed.push(target);
    state.updatedAt=new Date().toISOString();
    save(stateFile,state);
    fs.rmSync(file,{force:true});
    report.nportProcessedThisRun={quarter:target,...processed,downloadBytes:downloadResult.bytes??null,reusedDownload:Boolean(downloadResult.reused)};
    report.status=state.nportProcessed.length===NPORT_QUARTERS.length?"COMPLETE":"PARTIAL_HISTORY";
    report.processedQuarters=state.nportProcessed.length;
    report.requiredQuarters=NPORT_QUARTERS.length;
    report.remaining=NPORT_QUARTERS.length-state.nportProcessed.length;
    report.months=Object.keys(state.monthly).length;
    report.first=Object.keys(state.monthly).sort()[0]??null;
    report.last=Object.keys(state.monthly).sort().at(-1)??null;
    report.quota=quota.summary();
    return report;
  }catch(error){
    report.status="FAILED";report.error=/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"SEC_RAW_BACKFILL_FAILED");report.quota=quota.summary();throw error;
  }finally{
    globalThis.fetch=originalFetch;
    save(reportFile,report);
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  backfillSecRawFundFlows().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{
    console.log(JSON.stringify({status:"FAILED",code:/^[A-Z0-9_:-]+$/.test(String(error?.message??""))?String(error.message):String(error?.code??"SEC_RAW_BACKFILL_FAILED")}));
    process.exitCode=1;
  });
}
