import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";

export const E1_R5_FORWARD_SHADOW_SNAPSHOT_R1_VERSION="E1-R5-FORWARD-SHADOW-SNAPSHOT-R1";
export const E1_R5_FORWARD_SHADOW_SNAPSHOT_R1_CONTRACT=Object.freeze({
  researchOnly:true,
  productionActivation:false,
  networkCalls:0,
  dbWrites:0,
  formulaChanged:false,
  weightChanged:false,
  normalizationChanged:false,
  sourceVersion:"E1-R5-FORWARD-READINESS-R3",
  sourceStatus:"RAW_READY_VALIDATION_PENDING",
  appendOnly:true,
  dedupe:"UTC_DATE_PLUS_RAW_SOURCE_STATE",
});

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const clean=value=>String(value??"").trim();
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){
    const match=item.match(/^--([^=]+)=(.*)$/);
    if(match)out[match[1]]=match[2];
  }
  return out;
}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});}
function readJson(file){return JSON.parse(fs.readFileSync(file,"utf8"));}
function writeJsonAtomic(file,value){
  ensureDir(path.dirname(file));
  const part=`${file}.${process.pid}.part`;
  fs.writeFileSync(part,JSON.stringify(value,null,2)+"\n","utf8");
  fs.renameSync(part,file);
}
function safeCode(error){
  const raw=String(error?.code??error?.message??"FORWARD_SHADOW_SNAPSHOT_R1_FAILED");
  return /^[A-Z0-9_:-]+$/.test(raw)?raw:"FORWARD_SHADOW_SNAPSHOT_R1_FAILED";
}
function stableJson(value){
  if(Array.isArray(value))return `[${value.map(stableJson).join(",")}]`;
  if(value&&typeof value==="object"){
    return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function requireReady(report){
  if(report?.version!==E1_R5_FORWARD_SHADOW_SNAPSHOT_R1_CONTRACT.sourceVersion){
    throw Object.assign(new Error("READINESS_VERSION_MISMATCH"),{code:"READINESS_VERSION_MISMATCH"});
  }
  if(report?.status!==E1_R5_FORWARD_SHADOW_SNAPSHOT_R1_CONTRACT.sourceStatus||report?.rawComponentsReady!==true){
    throw Object.assign(new Error("READINESS_RAW_NOT_READY"),{code:"READINESS_RAW_NOT_READY"});
  }
  if(report?.productionReady!==false||report?.productionActivation!==false){
    throw Object.assign(new Error("READINESS_PRODUCTION_STATE_UNSAFE"),{code:"READINESS_PRODUCTION_STATE_UNSAFE"});
  }
  if(!finite(report?.raw?.s12a)||!finite(report?.raw?.s12b)||!finite(report?.raw?.s13)){
    throw Object.assign(new Error("READINESS_RAW_COMPONENT_MISSING"),{code:"READINESS_RAW_COMPONENT_MISSING"});
  }
  const asOfMs=Date.parse(clean(report?.asOf));
  if(!Number.isFinite(asOfMs)){
    throw Object.assign(new Error("READINESS_AS_OF_INVALID"),{code:"READINESS_AS_OF_INVALID"});
  }
  return new Date(asOfMs).toISOString();
}
function buildState(report){
  return {
    raw:{
      s12a:report.raw.s12a,
      s12b:report.raw.s12b,
      s13:report.raw.s13,
    },
    sec:{
      currentIssuers:Number(report?.sec?.currentIssuers??0),
      readyGuidanceIssuers:Number(report?.sec?.readyGuidanceIssuers??0),
      comparableIssuerCount:Number(report?.sec?.comparableIssuerCount??0),
      comparableOverallCoverage:finite(report?.sec?.comparableOverallCoverage)?report.sec.comparableOverallCoverage:null,
      comparableWithinGuidanceCoverage:finite(report?.sec?.comparableWithinGuidanceCoverage)?report.sec.comparableWithinGuidanceCoverage:null,
      directions:report?.sec?.directions??null,
    },
    cfo:{
      surveyYear:report?.cfo?.surveyYear??null,
      surveyQuarter:report?.cfo?.surveyQuarter??null,
      currentLevel:finite(report?.cfo?.currentLevel)?report.cfo.currentLevel:null,
      previousLevel:finite(report?.cfo?.previousLevel)?report.cfo.previousLevel:null,
      readyPeriodCount:Number(report?.cfo?.history?.readyPeriodCount??0),
      readyRevisionCount:Number(report?.cfo?.history?.readyRevisionCount??0),
    },
    normalization:{
      status:clean(report?.normalization?.status)||null,
      reason:clean(report?.normalization?.reason)||null,
    },
  };
}
export function buildForwardShadowSnapshot({report,sourceReportHash,sourceStoredAt,recordedAt=new Date().toISOString()}={}){
  const sourceAsOf=requireReady(report);
  const recordedMs=Date.parse(clean(recordedAt));
  if(!Number.isFinite(recordedMs))throw Object.assign(new Error("RECORDED_AT_INVALID"),{code:"RECORDED_AT_INVALID"});
  const sourceStoredMs=Date.parse(clean(sourceStoredAt));
  if(!Number.isFinite(sourceStoredMs))throw Object.assign(new Error("SOURCE_STORED_AT_INVALID"),{code:"SOURCE_STORED_AT_INVALID"});
  if(!/^[a-f0-9]{64}$/i.test(clean(sourceReportHash)))throw Object.assign(new Error("SOURCE_REPORT_HASH_INVALID"),{code:"SOURCE_REPORT_HASH_INVALID"});
  const recordedIso=new Date(recordedMs).toISOString();
  const snapshotDate=recordedIso.slice(0,10);
  const state=buildState(report);
  const dedupeState={snapshotDate,sourceVersion:report.version,state};
  const dedupeKey=sha256(Buffer.from(stableJson(dedupeState),"utf8"));
  return {
    snapshotId:`${recordedIso.replace(/[:.]/g,"-")}-${dedupeKey.slice(0,12)}`,
    snapshotDate,
    recordedAt:recordedIso,
    sourceVersion:report.version,
    sourceAsOf,
    sourceStoredAt:new Date(sourceStoredMs).toISOString(),
    sourceReportHash:clean(sourceReportHash).toLowerCase(),
    checkpoint:dedupeKey,
    productionBaseline:clean(report?.productionBaseline)||"E1-R4",
    productionActivation:false,
    state,
  };
}
export function appendForwardShadowSnapshot({ledger,snapshot}={}){
  const base=ledger??{
    version:E1_R5_FORWARD_SHADOW_SNAPSHOT_R1_VERSION,
    createdAt:snapshot.recordedAt,
    updatedAt:snapshot.recordedAt,
    snapshots:[],
  };
  if(base.version!==E1_R5_FORWARD_SHADOW_SNAPSHOT_R1_VERSION){
    throw Object.assign(new Error("SNAPSHOT_LEDGER_VERSION_MISMATCH"),{code:"SNAPSHOT_LEDGER_VERSION_MISMATCH"});
  }
  const snapshots=Array.isArray(base.snapshots)?base.snapshots:[];
  const duplicate=snapshots.find(row=>row?.checkpoint===snapshot.checkpoint);
  if(duplicate)return {status:"NOOP",ledger:{...base,snapshots},snapshot:duplicate};
  const next={...base,updatedAt:snapshot.recordedAt,snapshots:[...snapshots,snapshot]};
  return {status:"STORED",ledger:next,snapshot};
}
export function runForwardShadowSnapshotR1({base=DEFAULT_BASE,readinessFile,ledgerFile,recordedAt=new Date().toISOString()}={}){
  const reportFile=readinessFile??path.join(base,"manual-input","e1-r5","reports","e1-r5-forward-readiness-r3-last.json");
  const outFile=ledgerFile??path.join(base,"manual-input","e1-r5","forward-shadow-r1","snapshots.json");
  if(!fs.existsSync(reportFile))throw Object.assign(new Error("READINESS_REPORT_MISSING"),{code:"READINESS_REPORT_MISSING"});
  const bytes=fs.readFileSync(reportFile);
  const report=JSON.parse(bytes.toString("utf8"));
  const sourceStoredAt=fs.statSync(reportFile).mtime.toISOString();
  const snapshot=buildForwardShadowSnapshot({
    report,
    sourceReportHash:sha256(bytes),
    sourceStoredAt,
    recordedAt,
  });
  const ledger=fs.existsSync(outFile)?readJson(outFile):null;
  const result=appendForwardShadowSnapshot({ledger,snapshot});
  if(result.status==="STORED")writeJsonAtomic(outFile,result.ledger);
  return {
    status:result.status,
    snapshot:result.snapshot,
    ledgerFile:outFile,
    snapshotCount:result.ledger.snapshots.length,
    networkCalls:0,
    dbWrites:0,
    productionActivation:false,
  };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();
  try{
    const result=runForwardShadowSnapshotR1({
      base:cli.base?path.resolve(cli.base):undefined,
      readinessFile:cli["readiness-file"]?path.resolve(cli["readiness-file"]):undefined,
      ledgerFile:cli["ledger-file"]?path.resolve(cli["ledger-file"]):undefined,
      recordedAt:cli["recorded-at"]??undefined,
    });
    console.log(JSON.stringify({
      status:result.status,
      snapshotId:result.snapshot.snapshotId,
      snapshotDate:result.snapshot.snapshotDate,
      snapshotCount:result.snapshotCount,
      sourceVersion:result.snapshot.sourceVersion,
      sourceAsOf:result.snapshot.sourceAsOf,
      sourceStoredAt:result.snapshot.sourceStoredAt,
      checkpoint:result.snapshot.checkpoint,
      ledgerFile:result.ledgerFile,
      networkCalls:0,
      dbWrites:0,
      productionActivation:false,
    }));
  }catch(error){
    console.log(JSON.stringify({status:"FAILED",code:safeCode(error),networkCalls:0,dbWrites:0,productionActivation:false}));
    process.exitCode=1;
  }
}
