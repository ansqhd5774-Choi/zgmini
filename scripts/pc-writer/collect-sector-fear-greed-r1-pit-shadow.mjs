import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {renameWithRetrySync} from "./d1.mjs";
import {parsePitSectorHistoryCsv} from "../../lib/market-score/sector-fear-greed-r1-inputs.mjs";

export const SECTOR_FEAR_GREED_R1_PIT_COLLECTION_VERSION="SECTOR-FEAR-GREED-R1-PIT-GICS-COLLECTOR-V1";
export const SECTOR_FEAR_GREED_R1_PIT_SOURCE="https://raw.githubusercontent.com/lawcal/sp500-components-history/main/data/components_history.csv";
const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const OUTPUT_FILE="local-sector-fear-greed-r1-pit-gics.csv";
const RUN_JSON="local-sector-fear-greed-r1-pit-gics-last-run.json";
const RUN_TXT="local-sector-fear-greed-r1-pit-gics-last-run.txt";
const MAX_BYTES=2_000_000;

function atomicText(file,text){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=file+`.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,text);renameWithRetrySync(tmp,file);}
function safeCode(error,fallback="SECTOR_PIT_COLLECTION_FAILED"){const message=String(error?.message??"");return /^[A-Z0-9_:-]+$/.test(message)?message:String(error?.code??fallback).replace(/[^A-Z0-9_:-]/gi,"_").slice(0,80)||fallback;}
function render(run){return ["ZGMINI SECTOR FEAR & GREED R1 PIT GICS SHADOW COLLECTION",`generatedAt=${run.generatedAt}`,`status=${run.status}`,`entries=${run.entries} tickers=${run.tickers}`,`source=${run.source}`,`license=${run.license}`,`sourceCaveat=${run.sourceCaveat}`,`providerRequests=${run.providerRequests}`,`publicMutation=${run.publicMutation} dbSchemaChanged=${run.dbSchemaChanged}`,`next=${run.next}`].join("\n")+"\n";}

export async function collectSectorFearGreedR1PitShadow(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date(),fetchImpl=globalThis.fetch}={}){
  if(typeof fetchImpl!=="function")throw new TypeError("FETCH_REQUIRED");
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),outputFile=path.join(base,OUTPUT_FILE);fs.mkdirSync(base,{recursive:true});
  const response=await fetchImpl(SECTOR_FEAR_GREED_R1_PIT_SOURCE,{redirect:"follow",headers:{Accept:"text/csv,text/plain"}});
  if(!response||response.status!==200)throw new Error("SECTOR_PIT_HTTP_"+String(response?.status??0));
  const hinted=Number(response.headers?.get?.("content-length")??0);if(Number.isFinite(hinted)&&hinted>MAX_BYTES)throw new Error("SECTOR_PIT_BODY_LIMIT");
  const text=await response.text();if(Buffer.byteLength(text,"utf8")>MAX_BYTES)throw new Error("SECTOR_PIT_BODY_LIMIT");
  const parsed=parsePitSectorHistoryCsv(text);atomicText(outputFile,text);
  const run={version:1,methodologyVersion:SECTOR_FEAR_GREED_R1_PIT_COLLECTION_VERSION,generatedAt,status:"READY_PIT_RESEARCH",mode:"SHADOW_ONLY",entries:parsed.entries.length,tickers:Object.keys(parsed.byTicker).length,source:"lawcal/sp500-components-history",sourceUrl:SECTOR_FEAR_GREED_R1_PIT_SOURCE,license:"MIT",sourceCaveat:parsed.sourceCaveat,providerRequests:1,publicMutation:false,dbSchemaChanged:false,productionFormulaChanged:false,next:"RUN_SHADOW_READINESS"};
  const jsonFile=path.join(base,RUN_JSON),txtFile=path.join(base,RUN_TXT);atomicText(jsonFile,JSON.stringify(run,null,2)+"\n");atomicText(txtFile,render(run));return {...run,file:outputFile,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  collectSectorFearGreedR1PitShadow().then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.log(JSON.stringify({status:"FAILED",code:safeCode(error),providerRequests:null,publicMutation:false,dbSchemaChanged:false}));process.exitCode=1;});
}
