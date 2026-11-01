import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {symmetricChange} from "../../lib/market-score/earnings-e1-r5-forward-r2.mjs";

export const E1_R5_SEC_MATCHING_SAMPLE_R1_VERSION="E1-R5-SEC-MATCHING-SAMPLE-R1";
export const E1_R5_SEC_MATCHING_SAMPLE_R1_CONTRACT=Object.freeze({
  sourceVersion:"E1-R5-SEC-CROSS-FILING-AUDIT-R1",
  researchOnly:true,
  productionActivation:false,
  networkCalls:0,
  dbWrites:0,
  formulaChanged:false,
  weightChanged:false,
  normalizationChanged:false,
  purpose:"PREPARE_DETERMINISTIC_SEC_PAIR_SAMPLE_FOR_MANUAL_SOURCE_TEXT_REVIEW",
  defaultLimit:20,
});

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const clean=value=>String(value??"").trim();
const finite=value=>typeof value==="number"&&Number.isFinite(value);

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}
  return out;
}
function safeCode(error){const raw=String(error?.code??error?.message??"SEC_MATCHING_SAMPLE_R1_FAILED");return /^[A-Z0-9_:-]+$/.test(raw)?raw:"SEC_MATCHING_SAMPLE_R1_FAILED";}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});}
function readJson(file){return JSON.parse(fs.readFileSync(file,"utf8"));}
function writeJsonAtomic(file,value){ensureDir(path.dirname(file));const part=`${file}.${process.pid}.part`;fs.writeFileSync(part,JSON.stringify(value,null,2)+"\n","utf8");fs.renameSync(part,file);}
function direction(current,previous){if(!finite(current)||!finite(previous))return null;if(current>previous)return "UP";if(current<previous)return "DOWN";return "SAME";}
function normalizeLimit(value){const n=Number(value);if(!Number.isInteger(n)||n<1)return E1_R5_SEC_MATCHING_SAMPLE_R1_CONTRACT.defaultLimit;return Math.min(n,100);}

export function buildSecMatchingSample(crossReport,{limit=E1_R5_SEC_MATCHING_SAMPLE_R1_CONTRACT.defaultLimit}={}){
  if(crossReport?.version!==E1_R5_SEC_MATCHING_SAMPLE_R1_CONTRACT.sourceVersion){
    throw Object.assign(new Error("CROSS_FILING_VERSION_MISMATCH"),{code:"CROSS_FILING_VERSION_MISMATCH"});
  }
  if(crossReport?.status!=="PASS"||crossReport?.audit?.status!=="PASS"){
    throw Object.assign(new Error("CROSS_FILING_NOT_PASS"),{code:"CROSS_FILING_NOT_PASS"});
  }
  const rows=Array.isArray(crossReport?.audit?.issuerPairs)?crossReport.audit.issuerPairs:[];
  if(!rows.length)throw Object.assign(new Error("NO_COMPARABLE_ISSUER_PAIRS"),{code:"NO_COMPARABLE_ISSUER_PAIRS"});
  const normalized=rows.map(row=>({
    cik:clean(row?.cik),
    currentAccessionNumber:clean(row?.currentAccessionNumber),
    priorAccessionNumber:clean(row?.priorAccessionNumber),
    priorFiled:clean(row?.priorFiled)||null,
    periodKey:clean(row?.periodKey),
    basis:clean(row?.basis),
    currentMidpoint:finite(row?.currentMidpoint)?row.currentMidpoint:null,
    previousMidpoint:finite(row?.previousMidpoint)?row.previousMidpoint:null,
  })).filter(row=>row.cik&&row.currentAccessionNumber&&row.priorAccessionNumber&&row.periodKey&&row.basis&&finite(row.currentMidpoint)&&finite(row.previousMidpoint));
  if(!normalized.length)throw Object.assign(new Error("NO_VALID_COMPARABLE_ISSUER_PAIRS"),{code:"NO_VALID_COMPARABLE_ISSUER_PAIRS"});
  normalized.sort((a,b)=>a.cik.localeCompare(b.cik)||a.currentAccessionNumber.localeCompare(b.currentAccessionNumber)||a.priorAccessionNumber.localeCompare(b.priorAccessionNumber));
  const selected=normalized.slice(0,normalizeLimit(limit)).map((row,index)=>({
    sampleIndex:index+1,
    ...row,
    direction:direction(row.currentMidpoint,row.previousMidpoint),
    symmetricChange:symmetricChange(row.currentMidpoint,row.previousMidpoint),
    manualReviewStatus:"PENDING_SOURCE_TEXT_REVIEW",
  }));
  return {
    version:E1_R5_SEC_MATCHING_SAMPLE_R1_VERSION,
    status:"REVIEW_PENDING",
    sourceVersion:crossReport.version,
    sourceAsOf:crossReport.asOf??crossReport.audit?.asOf??null,
    generatedAt:new Date().toISOString(),
    comparableIssuerCount:Number(crossReport?.audit?.comparableIssuerCount??rows.length),
    validComparablePairCount:normalized.length,
    sampleLimit:normalizeLimit(limit),
    sampleCount:selected.length,
    sample:selected,
    reviewPolicy:{
      requiredChecks:["ISSUER","TARGET_PERIOD","EPS_METRIC","GAAP_OR_ADJUSTED_BASIS","USD_PER_SHARE_UNIT","CURRENT_RANGE_OR_MIDPOINT","PRIOR_RANGE_OR_MIDPOINT"],
      automatedPassIsNotManualAccuracyPass:true,
      noProductionActivationUntilSeparateApproval:true,
    },
    networkCalls:0,
    dbWrites:0,
    productionActivation:false,
  };
}

function formatNumber(value){return finite(value)?String(Number(value.toFixed(8))):"-";}
function formatText(report){
  const lines=[
    `E1-R5 SEC MATCHING SAMPLE R1: ${report.status}`,
    `VERSION: ${report.version}`,
    `SOURCE_VERSION: ${report.sourceVersion}`,
    `SOURCE_AS_OF: ${report.sourceAsOf??"-"}`,
    `COMPARABLE_ISSUERS: ${report.comparableIssuerCount}`,
    `VALID_COMPARABLE_PAIRS: ${report.validComparablePairCount}`,
    `SAMPLE_COUNT: ${report.sampleCount}`,
    `MANUAL_ACCURACY_GATE: PENDING_SOURCE_TEXT_REVIEW`,
    `NETWORK_CALLS: 0`,
    `DB_WRITES: 0`,
    `PRODUCTION_ACTIVATION: NO`,
    "",
  ];
  for(const row of report.sample){
    lines.push(`SAMPLE ${row.sampleIndex}: CIK=${row.cik} CURRENT=${row.currentAccessionNumber} PRIOR=${row.priorAccessionNumber} PRIOR_FILED=${row.priorFiled??"-"} PERIOD=${row.periodKey} BASIS=${row.basis} CURRENT_MID=${formatNumber(row.currentMidpoint)} PRIOR_MID=${formatNumber(row.previousMidpoint)} DIRECTION=${row.direction} CHANGE=${formatNumber(row.symmetricChange)} REVIEW=${row.manualReviewStatus}`);
  }
  return lines.join("\r\n")+"\r\n";
}

export function runSecMatchingSampleR1({base=DEFAULT_BASE,crossReportFile,reportsDir,limit=E1_R5_SEC_MATCHING_SAMPLE_R1_CONTRACT.defaultLimit}={}){
  const reports=reportsDir??path.join(base,"manual-input","e1-r5","reports");
  const sourceFile=crossReportFile??path.join(reports,"e1-r5-sec-cross-filing-audit-last.json");
  if(!fs.existsSync(sourceFile))throw Object.assign(new Error("CROSS_FILING_REPORT_MISSING"),{code:"CROSS_FILING_REPORT_MISSING"});
  const report=buildSecMatchingSample(readJson(sourceFile),{limit});
  ensureDir(reports);
  const jsonReport=path.join(reports,"e1-r5-sec-matching-sample-r1-last.json");
  const textReport=path.join(reports,"e1-r5-sec-matching-sample-r1-last.txt");
  writeJsonAtomic(jsonReport,report);
  fs.writeFileSync(textReport,formatText(report),"utf8");
  return {report,jsonReport,textReport,sourceFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();
  try{
    const result=runSecMatchingSampleR1({
      base:cli.base?path.resolve(cli.base):undefined,
      crossReportFile:cli["cross-report"]?path.resolve(cli["cross-report"]):undefined,
      reportsDir:cli["reports-dir"]?path.resolve(cli["reports-dir"]):undefined,
      limit:cli.limit?Number(cli.limit):undefined,
    });
    console.log(JSON.stringify({status:result.report.status,sampleCount:result.report.sampleCount,comparableIssuerCount:result.report.comparableIssuerCount,jsonReport:result.jsonReport,textReport:result.textReport,networkCalls:0,dbWrites:0,productionActivation:false}));
  }catch(error){
    console.log(JSON.stringify({status:"FAILED",code:safeCode(error),networkCalls:0,dbWrites:0,productionActivation:false}));
    process.exitCode=1;
  }
}
