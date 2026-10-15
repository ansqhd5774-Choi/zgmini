import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {
  buildForwardReadiness,
} from "./earnings-r5-forward-readiness-r3.mjs";

export const E1_R5_FORWARD_READINESS_R4_VERSION="E1-R5-FORWARD-READINESS-R4";
export const E1_R5_G2_MANUAL_REVIEW_R1_VERSION="E1-R5-SEC-MATCHING-MANUAL-REVIEW-R1";
export const E1_R5_FORWARD_READINESS_R4_CONTRACT=Object.freeze({
  researchOnly:true,
  productionActivation:false,
  networkCalls:0,
  dbWrites:0,
  formulaChanged:false,
  weightChanged:false,
  normalizationChanged:false,
  productionBaseline:"E1-R4",
  manualReviewSourceVersion:"E1-R5-SEC-MATCHING-SOURCE-REVIEW-R1",
});

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const REQUIRED_CHECKS=Object.freeze([
  "ISSUER",
  "TARGET_PERIOD",
  "EPS_METRIC",
  "GAAP_OR_ADJUSTED_BASIS",
  "USD_PER_SHARE_UNIT",
  "CURRENT_RANGE_OR_MIDPOINT",
  "PRIOR_RANGE_OR_MIDPOINT",
]);
const clean=value=>String(value??"").trim();
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const round8=value=>finite(value)?Number(value.toFixed(8)):null;

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){
    const match=item.match(/^--([^=]+)=(.*)$/);
    if(match)out[match[1]]=match[2];
  }
  return out;
}
function safeCode(error){
  const raw=String(error?.code??error?.message??"FORWARD_READINESS_R4_FAILED");
  return /^[A-Z0-9_:-]+$/.test(raw)?raw:"FORWARD_READINESS_R4_FAILED";
}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});}
function readJson(file){return JSON.parse(fs.readFileSync(file,"utf8"));}
function writeJsonAtomic(file,value){
  ensureDir(path.dirname(file));
  const part=`${file}.${process.pid}.part`;
  fs.writeFileSync(part,JSON.stringify(value,null,2)+"\n","utf8");
  fs.renameSync(part,file);
}
function sourceRows(sourceReview){
  return (Array.isArray(sourceReview?.rows)?sourceReview.rows:[])
    .map(row=>({
      sampleIndex:Number(row?.sampleIndex),
      cik:clean(row?.cik),
      currentAccessionNumber:clean(row?.currentAccessionNumber),
      priorAccessionNumber:clean(row?.priorAccessionNumber),
      periodKey:clean(row?.periodKey),
      basis:clean(row?.basis).toUpperCase(),
      currentMidpoint:round8(row?.currentMidpoint),
      previousMidpoint:round8(row?.previousMidpoint),
    }))
    .sort((a,b)=>a.sampleIndex-b.sampleIndex);
}
export function fingerprintSecMatchingSourceReview(sourceReview){
  const canonical=sourceRows(sourceReview);
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
export function auditG2ManualReview({sourceReview,manualReview}={}){
  if(!sourceReview){
    return {status:"PARTIAL_AUTOMATED_EVIDENCE",reason:"SOURCE_REVIEW_MISSING",evidence:{}};
  }
  if(sourceReview?.version!==E1_R5_FORWARD_READINESS_R4_CONTRACT.manualReviewSourceVersion){
    return {status:"BLOCKED",reason:"SOURCE_REVIEW_VERSION_MISMATCH",evidence:{sourceVersion:sourceReview?.version??null}};
  }
  if(sourceReview?.status!=="REVIEW_READY"){
    return {status:"PARTIAL_AUTOMATED_EVIDENCE",reason:"SOURCE_REVIEW_NOT_READY",evidence:{sourceStatus:sourceReview?.status??null}};
  }
  const fingerprint=fingerprintSecMatchingSourceReview(sourceReview);
  const sampleCount=Number(sourceReview?.sampleCount??sourceRows(sourceReview).length);
  if(!manualReview){
    return {
      status:"PARTIAL_AUTOMATED_EVIDENCE",
      reason:"MANUAL_SAMPLE_ACCURACY_NOT_YET_RECORDED",
      evidence:{sourceFingerprint:fingerprint,sampleCount},
    };
  }
  if(manualReview?.version!==E1_R5_G2_MANUAL_REVIEW_R1_VERSION){
    return {status:"BLOCKED",reason:"MANUAL_REVIEW_VERSION_MISMATCH",evidence:{sourceFingerprint:fingerprint,sampleCount}};
  }
  if(manualReview?.status!=="PASS"){
    return {status:"BLOCKED",reason:"MANUAL_REVIEW_NOT_PASS",evidence:{sourceFingerprint:fingerprint,sampleCount,manualStatus:manualReview?.status??null}};
  }
  if(clean(manualReview?.reviewMethod)!=="HUMAN_SOURCE_TEXT_REVIEW"){
    return {status:"BLOCKED",reason:"MANUAL_REVIEW_METHOD_INVALID",evidence:{sourceFingerprint:fingerprint,sampleCount}};
  }
  if(clean(manualReview?.sourceVersion)!==E1_R5_FORWARD_READINESS_R4_CONTRACT.manualReviewSourceVersion){
    return {status:"BLOCKED",reason:"MANUAL_REVIEW_SOURCE_VERSION_MISMATCH",evidence:{sourceFingerprint:fingerprint,sampleCount}};
  }
  if(clean(manualReview?.sourceFingerprint)!==fingerprint){
    return {status:"BLOCKED",reason:"MANUAL_REVIEW_SOURCE_FINGERPRINT_MISMATCH",evidence:{sourceFingerprint:fingerprint,manualFingerprint:clean(manualReview?.sourceFingerprint)||null,sampleCount}};
  }
  const reviewedCount=Number(manualReview?.reviewedCount??0);
  const passCount=Number(manualReview?.passCount??0);
  if(reviewedCount!==sampleCount||passCount!==sampleCount){
    return {status:"BLOCKED",reason:"MANUAL_REVIEW_COUNT_MISMATCH",evidence:{sourceFingerprint:fingerprint,sampleCount,reviewedCount,passCount}};
  }
  const checks=new Set((Array.isArray(manualReview?.requiredChecks)?manualReview.requiredChecks:[]).map(clean));
  if(REQUIRED_CHECKS.some(check=>!checks.has(check))){
    return {status:"BLOCKED",reason:"MANUAL_REVIEW_REQUIRED_CHECKS_MISSING",evidence:{sourceFingerprint:fingerprint,sampleCount,requiredChecks:[...checks]}};
  }
  const decisions=Array.isArray(manualReview?.decisions)?manualReview.decisions:[];
  const decisionMap=new Map(decisions.map(row=>[Number(row?.sampleIndex),clean(row?.decision).toUpperCase()]));
  const expectedIndexes=sourceRows(sourceReview).map(row=>row.sampleIndex);
  if(decisions.length!==sampleCount||expectedIndexes.some(index=>decisionMap.get(index)!=="PASS")){
    return {status:"BLOCKED",reason:"MANUAL_REVIEW_DECISIONS_INCOMPLETE",evidence:{sourceFingerprint:fingerprint,sampleCount,decisionCount:decisions.length}};
  }
  return {
    status:"PASS",
    reason:`MANUAL_SOURCE_TEXT_REVIEW_${sampleCount}_OF_${sampleCount}_PASS`,
    evidence:{
      sourceFingerprint:fingerprint,
      sampleCount,
      reviewedCount,
      passCount,
      reviewDate:clean(manualReview?.reviewDate)||null,
      reviewer:clean(manualReview?.reviewer)||null,
    },
  };
}
export function buildForwardReadinessR4({crossReport,cfoDocument,historyLedger,sourceReview,manualReview,asOf=new Date().toISOString()}={}){
  const base=buildForwardReadiness({crossReport,cfoDocument,historyLedger,asOf});
  const g2=auditG2ManualReview({sourceReview,manualReview});
  const validationGates=base.validationGates.map(row=>row.id==="G2_MATCHING_ACCURACY"?{id:row.id,status:g2.status,reason:g2.reason,evidence:{...row.evidence,...g2.evidence}}:row);
  const nextRequiredEvidence=g2.status==="PASS"
    ?base.nextRequiredEvidence.filter(item=>item!=="MANUAL_SAMPLE_REVIEW_OF_SEC_PERIOD_BASIS_UNIT_MATCHING")
    :[...base.nextRequiredEvidence];
  return {
    ...base,
    version:E1_R5_FORWARD_READINESS_R4_VERSION,
    at:new Date().toISOString(),
    productionReady:false,
    validationGates,
    nextRequiredEvidence,
    g2ManualReview:g2,
    networkCalls:0,
    dbWrites:0,
    productionActivation:false,
    formulaChanged:false,
    weightChanged:false,
    normalizationChanged:false,
  };
}
function formatPct(value){return finite(value)?`${(value*100).toFixed(2)}%`:"-";}
function formatNumber(value){return finite(value)?String(Number(value.toFixed(8))):"-";}
function formatText(report){
  return [
    `E1-R5 FORWARD READINESS R4: ${report.status}`,
    `VERSION: ${report.version}`,
    `AS_OF: ${report.asOf}`,
    `RAW_COMPONENTS_READY: ${report.rawComponentsReady?"YES":"NO"}`,
    `PRODUCTION_READY: NO`,
    `PRODUCTION_BASELINE: ${report.productionBaseline}`,
    `S12A_RAW: ${formatNumber(report.raw.s12a)}`,
    `S12B_RAW: ${formatNumber(report.raw.s12b)}`,
    `S13_RAW: ${formatNumber(report.raw.s13)}`,
    `SEC_COVERAGE: comparable=${report.sec.comparableIssuerCount}/${report.sec.currentIssuers} overall=${formatPct(report.sec.comparableOverallCoverage)} withinCurrentGuidance=${formatPct(report.sec.comparableWithinGuidanceCoverage)}`,
    `G2_MANUAL_REVIEW: ${report.g2ManualReview.status} reason=${report.g2ManualReview.reason}`,
    ...report.validationGates.map(row=>`GATE ${row.id}: ${row.status} reason=${row.reason}`),
    `NEXT_REQUIRED_EVIDENCE: ${JSON.stringify(report.nextRequiredEvidence)}`,
    `NETWORK_CALLS: 0`,
    `DB_WRITES: 0`,
    `PRODUCTION_ACTIVATION: NO`,
    `FORMULA_CHANGED: NO`,
    `WEIGHT_CHANGED: NO`,
    `NORMALIZATION_CHANGED: NO`,
  ].join("\r\n")+"\r\n";
}
export function runForwardReadinessR4({
  base=DEFAULT_BASE,
  asOf=new Date().toISOString(),
  crossReportFile,
  cfoFile,
  historyLedgerFile,
  sourceReviewFile,
  manualReviewFile,
  reportsDir,
}={}){
  const reports=reportsDir??path.join(base,"manual-input","e1-r5","reports");
  const crossPath=crossReportFile??path.join(reports,"e1-r5-sec-cross-filing-audit-last.json");
  const cfoPath=cfoFile??path.join(base,"manual-input","e1-r5","cfo-survey-r1","releases.json");
  const ledgerPath=historyLedgerFile??path.join(base,"manual-input","e1-r5","sec-guidance-r17","historical-backfill-r1.json");
  const sourceReviewPath=sourceReviewFile??path.join(reports,"e1-r5-sec-matching-source-review-r1-last.json");
  const manualReviewPath=manualReviewFile??path.join(reports,"e1-r5-sec-matching-manual-review-r1-last.json");
  if(!fs.existsSync(crossPath))throw Object.assign(new Error("CROSS_FILING_REPORT_MISSING"),{code:"CROSS_FILING_REPORT_MISSING"});
  if(!fs.existsSync(cfoPath))throw Object.assign(new Error("CFO_RELEASES_MISSING"),{code:"CFO_RELEASES_MISSING"});
  if(!fs.existsSync(ledgerPath))throw Object.assign(new Error("HISTORY_LEDGER_MISSING"),{code:"HISTORY_LEDGER_MISSING"});
  const report=buildForwardReadinessR4({
    crossReport:readJson(crossPath),
    cfoDocument:readJson(cfoPath),
    historyLedger:readJson(ledgerPath),
    sourceReview:fs.existsSync(sourceReviewPath)?readJson(sourceReviewPath):null,
    manualReview:fs.existsSync(manualReviewPath)?readJson(manualReviewPath):null,
    asOf,
  });
  ensureDir(reports);
  const jsonReport=path.join(reports,"e1-r5-forward-readiness-r4-last.json");
  const textReport=path.join(reports,"e1-r5-forward-readiness-r4-last.txt");
  writeJsonAtomic(jsonReport,report);
  fs.writeFileSync(textReport,formatText(report),"utf8");
  return {report,jsonReport,textReport,crossReportFile:crossPath,cfoFile:cfoPath,historyLedgerFile:ledgerPath,sourceReviewFile:sourceReviewPath,manualReviewFile:manualReviewPath};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();
  try{
    const result=runForwardReadinessR4({
      base:cli.base?path.resolve(cli.base):undefined,
      asOf:cli["as-of"]??undefined,
      crossReportFile:cli["cross-report"]?path.resolve(cli["cross-report"]):undefined,
      cfoFile:cli["cfo-file"]?path.resolve(cli["cfo-file"]):undefined,
      historyLedgerFile:cli.ledger?path.resolve(cli.ledger):undefined,
      sourceReviewFile:cli["source-review"]?path.resolve(cli["source-review"]):undefined,
      manualReviewFile:cli["manual-review"]?path.resolve(cli["manual-review"]):undefined,
      reportsDir:cli["reports-dir"]?path.resolve(cli["reports-dir"]):undefined,
    });
    console.log(JSON.stringify({
      status:result.report.status,
      rawComponentsReady:result.report.rawComponentsReady,
      productionReady:false,
      g2Status:result.report.g2ManualReview.status,
      g2Reason:result.report.g2ManualReview.reason,
      s12aRaw:result.report.raw.s12a,
      s12bRaw:result.report.raw.s12b,
      s13Raw:result.report.raw.s13,
      textReport:result.textReport,
      jsonReport:result.jsonReport,
      networkCalls:0,
      dbWrites:0,
      productionActivation:false,
    }));
    if(!result.report.rawComponentsReady)process.exitCode=2;
  }catch(error){
    console.log(JSON.stringify({status:"FAILED",code:safeCode(error),networkCalls:0,dbWrites:0,productionActivation:false}));
    process.exitCode=1;
  }
}
