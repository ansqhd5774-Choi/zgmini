import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {buildForwardReadiness} from "./earnings-r5-forward-readiness-r3.mjs";

export const E1_R5_FORWARD_READINESS_R4_VERSION="E1-R5-FORWARD-READINESS-R4";
export const E1_R5_SEC_MATCHING_MANUAL_REVIEW_R1_VERSION="E1-R5-SEC-MATCHING-MANUAL-REVIEW-R1";
export const E1_R5_FORWARD_READINESS_R4_CONTRACT=Object.freeze({
  sourceReadinessVersion:"E1-R5-FORWARD-READINESS-R3",
  sourceReviewVersion:"E1-R5-SEC-MATCHING-SOURCE-REVIEW-R1",
  sourceSampleVersion:"E1-R5-SEC-MATCHING-SAMPLE-R1",
  researchOnly:true,
  productionActivation:false,
  networkCalls:0,
  dbWrites:0,
  formulaChanged:false,
  weightChanged:false,
  normalizationChanged:false,
  productionBaseline:"E1-R4",
  purpose:"BIND_G2_MANUAL_SEC_MATCHING_REVIEW_TO_EXACT_CURRENT_SAMPLE_FINGERPRINT_WITHOUT_CHANGING_PRODUCTION",
});
export const E1_R5_SEC_MATCHING_MANUAL_REVIEW_REQUIRED_CHECKS=Object.freeze([
  "ISSUER",
  "TARGET_PERIOD",
  "EPS_METRIC",
  "GAAP_OR_ADJUSTED_BASIS",
  "USD_PER_SHARE_UNIT",
  "CURRENT_RANGE_OR_MIDPOINT",
  "PRIOR_RANGE_OR_MIDPOINT",
]);

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const clean=value=>String(value??"").trim();
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const sha256=value=>createHash("sha256").update(value).digest("hex");
function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function safeCode(error){const raw=String(error?.code??error?.message??"FORWARD_READINESS_R4_FAILED");return /^[A-Z0-9_:-]+$/.test(raw)?raw:"FORWARD_READINESS_R4_FAILED";}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});}
function readJson(file){return JSON.parse(fs.readFileSync(file,"utf8"));}
function writeJsonAtomic(file,value){ensureDir(path.dirname(file));const part=`${file}.${process.pid}.part`;fs.writeFileSync(part,JSON.stringify(value,null,2)+"\n","utf8");fs.renameSync(part,file);}

function canonicalPair(row,index=null){
  return {
    sampleIndex:index===null?Number(row?.sampleIndex):index,
    cik:clean(row?.cik),
    currentAccessionNumber:clean(row?.currentAccessionNumber),
    priorAccessionNumber:clean(row?.priorAccessionNumber),
    periodKey:clean(row?.periodKey),
    metric:"EPS",
    basis:clean(row?.basis),
    unit:"USD_PER_SHARE",
    currentMidpoint:finite(row?.currentMidpoint)?row.currentMidpoint:null,
    previousMidpoint:finite(row?.previousMidpoint)?row.previousMidpoint:null,
  };
}
function pairIdentity(row){
  return JSON.stringify([row.cik,row.currentAccessionNumber,row.priorAccessionNumber,row.periodKey,row.metric,row.basis,row.unit,row.currentMidpoint,row.previousMidpoint]);
}
function canonicalReviewRows(sourceReview){
  const rows=Array.isArray(sourceReview?.rows)?sourceReview.rows:[];
  return rows.map(row=>canonicalPair(row)).sort((a,b)=>a.sampleIndex-b.sampleIndex||a.cik.localeCompare(b.cik)||a.currentAccessionNumber.localeCompare(b.currentAccessionNumber)||a.priorAccessionNumber.localeCompare(b.priorAccessionNumber));
}

export function evaluateSourceReviewCurrentBinding(sourceReview,crossReport){
  if(!sourceReview)return {status:"MISSING",reason:"SOURCE_REVIEW_REPORT_MISSING",matchedCount:0};
  if(sourceReview?.version!==E1_R5_FORWARD_READINESS_R4_CONTRACT.sourceReviewVersion)return {status:"MISMATCH",reason:"SOURCE_REVIEW_VERSION_MISMATCH",matchedCount:0};
  const currentAsOf=crossReport?.asOf??crossReport?.audit?.asOf??null;
  if((sourceReview?.sourceAsOf??null)!==(currentAsOf??null))return {status:"STALE",reason:"SOURCE_REVIEW_CROSS_REPORT_AS_OF_MISMATCH",matchedCount:0};
  const auditPairs=Array.isArray(crossReport?.audit?.issuerPairs)?crossReport.audit.issuerPairs:[];
  if(!auditPairs.length)return {status:"MISSING",reason:"CROSS_REPORT_PAIR_SET_MISSING",matchedCount:0};
  const currentSet=new Set(auditPairs.map(row=>pairIdentity(canonicalPair(row,0))));
  const rows=canonicalReviewRows(sourceReview);
  let matchedCount=0;
  for(const row of rows){
    if(!currentSet.has(pairIdentity(row)))return {status:"STALE",reason:"SOURCE_REVIEW_CROSS_REPORT_PAIR_MISMATCH",matchedCount};
    matchedCount++;
  }
  return {status:"MATCH",reason:"SOURCE_REVIEW_BOUND_TO_CURRENT_CROSS_REPORT",matchedCount};
}

export function buildSecMatchingManualReviewTemplate(sourceReview){
  const rows=canonicalReviewRows(sourceReview);
  const sampleCount=Number(sourceReview?.sampleCount??rows.length);
  const payload={
    sourceReviewVersion:clean(sourceReview?.version),
    sourceVersion:clean(sourceReview?.sourceVersion),
    sourceAsOf:sourceReview?.sourceAsOf??null,
    sampleCount,
    checks:[...E1_R5_SEC_MATCHING_MANUAL_REVIEW_REQUIRED_CHECKS],
    rows,
  };
  const sampleFingerprint=sha256(JSON.stringify(payload));
  return {
    version:E1_R5_SEC_MATCHING_MANUAL_REVIEW_R1_VERSION,
    decision:"PENDING",
    sourceReviewVersion:payload.sourceReviewVersion,
    sourceVersion:payload.sourceVersion,
    sourceAsOf:payload.sourceAsOf,
    sampleCount,
    sampleFingerprint,
    checks:[...E1_R5_SEC_MATCHING_MANUAL_REVIEW_REQUIRED_CHECKS],
    reviewedAt:null,
    note:"After human source-text review, copy this template to the manual-review input path and set decision to PASS. Any source/sample drift changes the fingerprint and invalidates the evidence.",
  };
}

export function evaluateSecMatchingManualReview(sourceReview,manualEvidence){
  if(!sourceReview)return {status:"PARTIAL_AUTOMATED_EVIDENCE",reason:"SOURCE_REVIEW_REPORT_MISSING",evidencePresent:false,template:null};
  if(sourceReview?.version!==E1_R5_FORWARD_READINESS_R4_CONTRACT.sourceReviewVersion)return {status:"PARTIAL_AUTOMATED_EVIDENCE",reason:"SOURCE_REVIEW_VERSION_MISMATCH",evidencePresent:false,template:null};
  const template=buildSecMatchingManualReviewTemplate(sourceReview);
  const rows=canonicalReviewRows(sourceReview);
  const sampleCount=Number(sourceReview?.sampleCount??0);
  const sourceReadyCount=Number(sourceReview?.sourceReadyCount??0);
  const flaggedYearRangeCount=Number(sourceReview?.flaggedYearRangeCount??0);
  const sourceReviewReady=sourceReview?.status==="REVIEW_READY"&&sampleCount>0&&rows.length===sampleCount&&sourceReadyCount===sampleCount&&flaggedYearRangeCount===0;
  if(!sourceReviewReady)return {status:"PARTIAL_AUTOMATED_EVIDENCE",reason:"SOURCE_REVIEW_NOT_FULLY_READY",evidencePresent:false,template};
  if(!manualEvidence)return {status:"PARTIAL_AUTOMATED_EVIDENCE",reason:"MANUAL_REVIEW_EVIDENCE_MISSING",evidencePresent:false,template};
  if(manualEvidence?.version!==E1_R5_SEC_MATCHING_MANUAL_REVIEW_R1_VERSION)return {status:"PARTIAL_AUTOMATED_EVIDENCE",reason:"MANUAL_REVIEW_VERSION_MISMATCH",evidencePresent:false,template};
  if(clean(manualEvidence?.decision)!=="PASS")return {status:"PARTIAL_AUTOMATED_EVIDENCE",reason:"MANUAL_REVIEW_DECISION_NOT_PASS",evidencePresent:false,template};
  if(clean(manualEvidence?.sourceReviewVersion)!==template.sourceReviewVersion)return {status:"PARTIAL_AUTOMATED_EVIDENCE",reason:"MANUAL_REVIEW_SOURCE_REVIEW_VERSION_MISMATCH",evidencePresent:false,template};
  if(clean(manualEvidence?.sourceVersion)!==template.sourceVersion)return {status:"PARTIAL_AUTOMATED_EVIDENCE",reason:"MANUAL_REVIEW_SOURCE_VERSION_MISMATCH",evidencePresent:false,template};
  if((manualEvidence?.sourceAsOf??null)!==template.sourceAsOf)return {status:"PARTIAL_AUTOMATED_EVIDENCE",reason:"MANUAL_REVIEW_SOURCE_AS_OF_MISMATCH",evidencePresent:false,template};
  if(Number(manualEvidence?.sampleCount)!==template.sampleCount)return {status:"PARTIAL_AUTOMATED_EVIDENCE",reason:"MANUAL_REVIEW_SAMPLE_COUNT_MISMATCH",evidencePresent:false,template};
  if(clean(manualEvidence?.sampleFingerprint)!==template.sampleFingerprint)return {status:"PARTIAL_AUTOMATED_EVIDENCE",reason:"MANUAL_REVIEW_SAMPLE_FINGERPRINT_MISMATCH",evidencePresent:false,template};
  const checks=Array.isArray(manualEvidence?.checks)?manualEvidence.checks.map(clean):[];
  if(JSON.stringify(checks)!==JSON.stringify(E1_R5_SEC_MATCHING_MANUAL_REVIEW_REQUIRED_CHECKS))return {status:"PARTIAL_AUTOMATED_EVIDENCE",reason:"MANUAL_REVIEW_REQUIRED_CHECKS_MISMATCH",evidencePresent:false,template};
  return {status:"EVIDENCE_PRESENT",reason:"MANUAL_SAMPLE_REVIEW_EXACT_MATCH_PASS",evidencePresent:true,template};
}

export function buildForwardReadinessR4({crossReport,cfoDocument,historyLedger,sourceReview,manualEvidence,asOf=new Date().toISOString()}={}){
  const base=buildForwardReadiness({crossReport,cfoDocument,historyLedger,asOf});
  const binding=evaluateSourceReviewCurrentBinding(sourceReview,crossReport);
  const evaluated=evaluateSecMatchingManualReview(sourceReview,manualEvidence);
  const manual=binding.status==="MATCH"?evaluated:{status:"PARTIAL_AUTOMATED_EVIDENCE",reason:binding.reason,evidencePresent:false,template:evaluated.template};
  const g2Evidence={
    comparison:"SAME_ISSUER_TARGET_PERIOD_EPS_METRIC_BASIS_USD_PER_SHARE_UNIT_ACROSS_FILINGS",
    comparableIssuerCount:base.sec.comparableIssuerCount,
    sourceReviewVersion:sourceReview?.version??null,
    sourceVersion:sourceReview?.sourceVersion??null,
    sourceAsOf:sourceReview?.sourceAsOf??null,
    sourceBindingStatus:binding.status,
    sourceBindingMatchedCount:binding.matchedCount,
    sampleCount:sourceReview?.sampleCount??null,
    expectedSampleFingerprint:manual.template?.sampleFingerprint??null,
    manualEvidenceVersion:manualEvidence?.version??null,
    manualDecision:manualEvidence?.decision??null,
    manualReviewedAt:manualEvidence?.reviewedAt??null,
  };
  const validationGates=base.validationGates.map(row=>row.id==="G2_MATCHING_ACCURACY"?{id:row.id,status:manual.status,reason:manual.reason,evidence:g2Evidence}:row);
  const nextRequiredEvidence=manual.evidencePresent?base.nextRequiredEvidence.filter(value=>value!=="MANUAL_SAMPLE_REVIEW_OF_SEC_PERIOD_BASIS_UNIT_MATCHING"):[...base.nextRequiredEvidence];
  return {
    ...base,
    version:E1_R5_FORWARD_READINESS_R4_VERSION,
    productionReady:false,
    productionBaseline:E1_R5_FORWARD_READINESS_R4_CONTRACT.productionBaseline,
    validationGates,
    nextRequiredEvidence,
    secMatchingManualReview:{status:manual.status,reason:manual.reason,evidencePresent:manual.evidencePresent,sourceBindingStatus:binding.status,expectedSampleFingerprint:manual.template?.sampleFingerprint??null},
    networkCalls:0,
    dbWrites:0,
    productionActivation:false,
    formulaChanged:false,
    weightChanged:false,
    normalizationChanged:false,
  };
}

function formatNumber(value){return finite(value)?String(Number(value.toFixed(8))):"-";}
function formatText(report){
  const g2=report.validationGates.find(row=>row.id==="G2_MATCHING_ACCURACY");
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
    `G2_MATCHING_ACCURACY: ${g2?.status??"MISSING"}`,
    `G2_REASON: ${g2?.reason??"MISSING"}`,
    `G2_SOURCE_BINDING: ${report.secMatchingManualReview.sourceBindingStatus??"MISSING"}`,
    `G2_EXPECTED_SAMPLE_FINGERPRINT: ${report.secMatchingManualReview.expectedSampleFingerprint??"-"}`,
    `NORMALIZATION: ${report.normalization.status} reason=${report.normalization.reason}`,
    `NETWORK_CALLS: 0`,
    `DB_WRITES: 0`,
    `PRODUCTION_ACTIVATION: NO`,
    `FORMULA_CHANGED: NO`,
    `WEIGHT_CHANGED: NO`,
    `NORMALIZATION_CHANGED: NO`,
  ].join("\r\n")+"\r\n";
}

export function runForwardReadinessR4({base=DEFAULT_BASE,asOf=new Date().toISOString(),crossReportFile,cfoFile,historyLedgerFile,sourceReviewFile,manualEvidenceFile,reportsDir}={}){
  const reports=reportsDir??path.join(base,"manual-input","e1-r5","reports");
  const crossPath=crossReportFile??path.join(reports,"e1-r5-sec-cross-filing-audit-last.json");
  const cfoPath=cfoFile??path.join(base,"manual-input","e1-r5","cfo-survey-r1","releases.json");
  const ledgerPath=historyLedgerFile??path.join(base,"manual-input","e1-r5","sec-guidance-r17","historical-backfill-r1.json");
  const sourceReviewPath=sourceReviewFile??path.join(reports,"e1-r5-sec-matching-source-review-r1-last.json");
  const manualPath=manualEvidenceFile??path.join(base,"manual-input","e1-r5","manual-review","e1-r5-sec-matching-manual-review-r1.json");
  for(const [file,code] of [[crossPath,"CROSS_FILING_REPORT_MISSING"],[cfoPath,"CFO_RELEASES_MISSING"],[ledgerPath,"HISTORY_LEDGER_MISSING"]]){
    if(!fs.existsSync(file))throw Object.assign(new Error(code),{code});
  }
  const sourceReview=fs.existsSync(sourceReviewPath)?readJson(sourceReviewPath):null;
  const manualEvidence=fs.existsSync(manualPath)?readJson(manualPath):null;
  const report=buildForwardReadinessR4({crossReport:readJson(crossPath),cfoDocument:readJson(cfoPath),historyLedger:readJson(ledgerPath),sourceReview,manualEvidence,asOf});
  ensureDir(reports);
  const jsonReport=path.join(reports,"e1-r5-forward-readiness-r4-last.json");
  const textReport=path.join(reports,"e1-r5-forward-readiness-r4-last.txt");
  writeJsonAtomic(jsonReport,report);
  fs.writeFileSync(textReport,formatText(report),"utf8");
  let manualTemplateFile=null;
  if(sourceReview){
    const template=buildSecMatchingManualReviewTemplate(sourceReview);
    manualTemplateFile=path.join(reports,"e1-r5-sec-matching-manual-review-r1-template.json");
    writeJsonAtomic(manualTemplateFile,template);
  }
  return {report,jsonReport,textReport,manualTemplateFile,crossReportFile:crossPath,cfoFile:cfoPath,historyLedgerFile:ledgerPath,sourceReviewFile:sourceReviewPath,manualEvidenceFile:manualPath};
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
      manualEvidenceFile:cli["manual-evidence"]?path.resolve(cli["manual-evidence"]):undefined,
      reportsDir:cli["reports-dir"]?path.resolve(cli["reports-dir"]):undefined,
    });
    const g2=result.report.validationGates.find(row=>row.id==="G2_MATCHING_ACCURACY");
    console.log(JSON.stringify({status:result.report.status,rawComponentsReady:result.report.rawComponentsReady,productionReady:false,g2Status:g2?.status??null,g2Reason:g2?.reason??null,sourceBindingStatus:result.report.secMatchingManualReview.sourceBindingStatus,manualTemplateFile:result.manualTemplateFile,textReport:result.textReport,jsonReport:result.jsonReport,networkCalls:0,dbWrites:0,productionActivation:false}));
    if(!result.report.rawComponentsReady)process.exitCode=2;
  }catch(error){
    console.log(JSON.stringify({status:"FAILED",code:safeCode(error),networkCalls:0,dbWrites:0,productionActivation:false}));
    process.exitCode=1;
  }
}
