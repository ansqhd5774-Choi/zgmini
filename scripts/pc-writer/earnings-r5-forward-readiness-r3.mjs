import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {auditLocalCfoSurveyFile} from "./earnings-r5-forward-r2-local-audit.mjs";
import {buildCfoSurveyPITRecord,compareCfoSurveyReleases} from "../../lib/market-score/earnings-e1-r5-cfo-survey-r1.mjs";
import {E1_R5_FORWARD_R2_CONTRACT} from "../../lib/market-score/earnings-e1-r5-forward-r2.mjs";

export const E1_R5_FORWARD_READINESS_R3_VERSION="E1-R5-FORWARD-READINESS-R3";
export const E1_R5_FORWARD_READINESS_R3_CONTRACT=Object.freeze({researchOnly:true,productionActivation:false,networkCalls:0,dbWrites:0,formulaChanged:false,weightChanged:false,normalizationChanged:false,productionBaseline:"E1-R4"});

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const clean=value=>String(value??"").trim();
const finite=value=>typeof value==="number"&&Number.isFinite(value);
function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});}
function readJson(file){return JSON.parse(fs.readFileSync(file,"utf8"));}
function writeJsonAtomic(file,value){ensureDir(path.dirname(file));const part=`${file}.${process.pid}.part`;fs.writeFileSync(part,JSON.stringify(value,null,2)+"\n","utf8");fs.renameSync(part,file);}
function safeCode(error){const raw=String(error?.code??error?.message??"FORWARD_READINESS_R3_FAILED");return /^[A-Z0-9_:-]+$/.test(raw)?raw:"FORWARD_READINESS_R3_FAILED";}
function normalizeCfoInput(document){if(Array.isArray(document))return document;if(Array.isArray(document?.releases))return document.releases;return [];}
function quarterOrdinal(row){return Number(row?.surveyYear)*4+(Number(row?.surveyQuarter)-1);}

export function auditCfoRevisionHistory(document,{asOf}={}){
  const asOfMs=Date.parse(clean(asOf));
  const built=normalizeCfoInput(document).map(buildCfoSurveyPITRecord).filter(row=>row.status==="READY");
  const byPeriod=new Map();
  for(const row of built){
    const releaseMs=Date.parse(clean(row.releaseAt)),storedMs=Date.parse(clean(row.storedAt));
    if(Number.isFinite(asOfMs)&&(!Number.isFinite(releaseMs)||!Number.isFinite(storedMs)||releaseMs>asOfMs||storedMs>asOfMs))continue;
    const key=`${row.surveyYear}Q${row.surveyQuarter}`;const prior=byPeriod.get(key);
    if(!prior||releaseMs>Date.parse(prior.releaseAt)||(row.releaseAt===prior.releaseAt&&storedMs>Date.parse(prior.storedAt)))byPeriod.set(key,row);
  }
  const periods=[...byPeriod.values()].sort((a,b)=>quarterOrdinal(a)-quarterOrdinal(b));
  const revisions=[];
  for(let i=1;i<periods.length;i++){
    const comparison=compareCfoSurveyReleases(periods[i],periods[i-1]);
    if(comparison.status==="READY")revisions.push({from:`${periods[i-1].surveyYear}Q${periods[i-1].surveyQuarter}`,to:`${periods[i].surveyYear}Q${periods[i].surveyQuarter}`,raw:comparison.raw});
  }
  return {readyPeriodCount:periods.length,readyRevisionCount:revisions.length,periods:periods.map(row=>`${row.surveyYear}Q${row.surveyQuarter}`),revisions};
}

export function auditHistoricalStorageWindow(historyLedger){
  const entries=Object.values(historyLedger?.completed??{});
  const storedTimes=entries.map(row=>Date.parse(clean(row?.storedAt))).filter(Number.isFinite).sort((a,b)=>a-b);
  const sourceTime=row=>{const accepted=Date.parse(clean(row?.acceptedAt));if(Number.isFinite(accepted))return accepted;const filed=clean(row?.filed);const fallback=/^\d{4}-\d{2}-\d{2}$/.test(filed)?Date.parse(`${filed}T23:59:59Z`):Date.parse(filed);return Number.isFinite(fallback)?fallback:null;};
  const sourceTimes=entries.map(sourceTime).filter(Number.isFinite).sort((a,b)=>a-b);
  const storedAfterSourceCount=entries.filter(row=>{const stored=Date.parse(clean(row?.storedAt)),source=sourceTime(row);return Number.isFinite(stored)&&Number.isFinite(source)&&stored>source;}).length;
  return {entryCount:entries.length,validStoredAtCount:storedTimes.length,earliestStoredAt:storedTimes.length?new Date(storedTimes[0]).toISOString():null,latestStoredAt:storedTimes.length?new Date(storedTimes.at(-1)).toISOString():null,earliestSourceAvailableAt:sourceTimes.length?new Date(sourceTimes[0]).toISOString():null,latestSourceAvailableAt:sourceTimes.length?new Date(sourceTimes.at(-1)).toISOString():null,storedAfterSourceCount};
}

const gate=(id,status,reason,evidence={})=>({id,status,reason,evidence});
export function buildForwardReadiness({crossReport,cfoDocument,historyLedger,asOf=new Date().toISOString()}={}){
  const audit=crossReport?.audit??null;
  const cfo=auditLocalCfoSurveyFile(cfoDocument,{asOf});
  const cfoHistory=auditCfoRevisionHistory(cfoDocument,{asOf});
  const storage=auditHistoricalStorageWindow(historyLedger);
  const currentIssuers=Number(audit?.currentIssuerCount??0),readyGuidanceIssuers=Number(audit?.currentParse?.readyIssuers??0),comparableIssuerCount=Number(audit?.comparableIssuerCount??0);
  const comparableOverallCoverage=finite(audit?.comparableIssuerCoverage)?audit.comparableIssuerCoverage:(currentIssuers>0?comparableIssuerCount/currentIssuers:null);
  const comparableWithinGuidanceCoverage=readyGuidanceIssuers>0?comparableIssuerCount/readyGuidanceIssuers:null;
  const integrity=audit?.integrity??{};
  const secIntegrityReady=crossReport?.status==="PASS"&&crossReport?.backfillStatus==="COMPLETE"&&audit?.status==="PASS"&&Number(integrity.currentMissing??0)===0&&Number(integrity.currentHashMismatch??0)===0&&Number(integrity.currentHashMissing??0)===0&&Number(integrity.historyMissing??0)===0&&Number(integrity.historyHashMismatch??0)===0&&Number(integrity.historyHashMissing??0)===0&&Number(integrity.historyPathInvalid??0)===0;
  const rawComponentsReady=secIntegrityReady&&finite(audit?.s12aRaw)&&finite(audit?.s13Raw)&&cfo.status==="READY"&&finite(cfo.raw);
  const gates=[
    gate("G1_SEC_EXTRACTION_COVERAGE",secIntegrityReady?"EVIDENCE_PRESENT":"BLOCKED",secIntegrityReady?"CURRENT_AND_HISTORY_HASH_INTEGRITY_PASS":"SEC_INTEGRITY_NOT_READY",{currentIssuers,readyGuidanceIssuers,comparableIssuerCount,comparableOverallCoverage,comparableWithinGuidanceCoverage,issuerMissingReasons:audit?.issuerMissingReasons??{}}),
    gate("G2_MATCHING_ACCURACY","PARTIAL_AUTOMATED_EVIDENCE","STRICT_KEY_MATCHING_IMPLEMENTED_BUT_MANUAL_SAMPLE_ACCURACY_NOT_YET_REVIEWED",{comparison:"SAME_ISSUER_TARGET_PERIOD_METRIC_BASIS_UNIT_ACROSS_FILINGS",comparableIssuerCount}),
    gate("G3_S12A_S13_SPEARMAN","NOT_EVALUABLE","SINGLE_AGGREGATE_SEC_SNAPSHOT_NO_TIME_SERIES",{s12aRaw:audit?.s12aRaw??null,s13Raw:audit?.s13Raw??null}),
    gate("G4_S12B_OVERLAP","NOT_EVALUABLE","INSUFFICIENT_CFO_REVISION_TIME_SERIES_FOR_S1_S2_S6_GROWTH_OVERLAP",{cfoReadyPeriods:cfoHistory.readyPeriodCount,cfoReadyRevisions:cfoHistory.readyRevisionCount,latestRaw:cfo.raw??null}),
    gate("G5_FORWARD_LEAD_RELATIONSHIP","NOT_EVALUABLE","NO_ALIGNED_NEXT_1Q_2Q_OUTCOME_WINDOW",{}),
    gate("G6_PIT_ONLY_BACKTEST","NOT_EVALUABLE","RETROSPECTIVE_SEC_HISTORY_LOCAL_STORED_AT_STARTS_AFTER_HISTORICAL_SOURCE_TIMESTAMPS",{historyEntries:storage.entryCount,earliestStoredAt:storage.earliestStoredAt,latestStoredAt:storage.latestStoredAt,earliestSourceAvailableAt:storage.earliestSourceAvailableAt,storedAfterSourceCount:storage.storedAfterSourceCount}),
    gate("G7_PRODUCTION_BASELINE","PRESERVED","E1_R4_REMAINS_ACTIVE_E1_R5_SHADOW_ONLY",{productionActivation:E1_R5_FORWARD_R2_CONTRACT.productionActivation,productionBaseline:E1_R5_FORWARD_READINESS_R3_CONTRACT.productionBaseline}),
  ];
  return {version:E1_R5_FORWARD_READINESS_R3_VERSION,status:rawComponentsReady?"RAW_READY_VALIDATION_PENDING":"BLOCKED_RAW_INPUT",at:new Date().toISOString(),asOf,researchOnly:true,productionReady:false,rawComponentsReady,productionBaseline:E1_R5_FORWARD_READINESS_R3_CONTRACT.productionBaseline,approvedWeights:{s12a:4,s12b:3,s13:3,futureBlock:10},raw:{s12a:audit?.s12aRaw??null,s12b:cfo.raw??null,s13:audit?.s13Raw??null,s12Normalized:null,futureNormalized:null},normalization:{status:"NOT_READY",reason:"HISTORICAL_PERCENTILE_PIT_SERIES_NOT_AVAILABLE",s12aScore:null,s12bScore:null,s13Score:null,s12Score:null,futureScore:null,noReweight:true},sec:{status:crossReport?.status??"MISSING",backfillStatus:crossReport?.backfillStatus??"MISSING",currentIssuers,readyGuidanceIssuers,comparableIssuerCount,comparableOverallCoverage,comparableWithinGuidanceCoverage,issuerMissingReasons:audit?.issuerMissingReasons??{},directions:audit?.directions??null},cfo:{status:cfo.status,reason:cfo.reason??null,surveyYear:cfo.surveyYear??null,surveyQuarter:cfo.surveyQuarter??null,raw:cfo.raw??null,currentLevel:cfo.currentLevel??null,previousLevel:cfo.previousLevel??null,history:cfoHistory},historicalStorage:storage,validationGates:gates,nextRequiredEvidence:["PROSPECTIVE_PIT_SNAPSHOTS_FOR_HISTORICAL_PERCENTILES","MULTI_PERIOD_S12A_S13_SERIES_FOR_SPEARMAN","MULTI_PERIOD_S12B_SERIES_ALIGNED_TO_S1_S2_S6_AND_GROWTH","NEXT_1Q_2Q_EARNINGS_REVENUE_MARGIN_BREADTH_OUTCOMES","MANUAL_SAMPLE_REVIEW_OF_SEC_PERIOD_BASIS_UNIT_MATCHING"],networkCalls:0,dbWrites:0,productionActivation:false,formulaChanged:false,weightChanged:false,normalizationChanged:false};
}
function formatPct(value){return finite(value)?`${(value*100).toFixed(2)}%`:"-";}
function formatNumber(value){return finite(value)?String(Number(value.toFixed(8))):"-";}
function formatText(report){return [`E1-R5 FORWARD READINESS R3: ${report.status}`,`VERSION: ${report.version}`,`AS_OF: ${report.asOf}`,`RAW_COMPONENTS_READY: ${report.rawComponentsReady?"YES":"NO"}`,`PRODUCTION_READY: NO`,`PRODUCTION_BASELINE: ${report.productionBaseline}`,`S12A_RAW: ${formatNumber(report.raw.s12a)}`,`S12B_RAW: ${formatNumber(report.raw.s12b)}`,`S13_RAW: ${formatNumber(report.raw.s13)}`,`SEC_COVERAGE: comparable=${report.sec.comparableIssuerCount}/${report.sec.currentIssuers} overall=${formatPct(report.sec.comparableOverallCoverage)} withinCurrentGuidance=${formatPct(report.sec.comparableWithinGuidanceCoverage)}`,`SEC_MISSING_REASONS: ${JSON.stringify(report.sec.issuerMissingReasons??{})}`,`CFO_HISTORY: readyPeriods=${report.cfo.history.readyPeriodCount} readyRevisions=${report.cfo.history.readyRevisionCount}`,`HISTORY_STORAGE: entries=${report.historicalStorage.entryCount} earliestStoredAt=${report.historicalStorage.earliestStoredAt??"-"} latestStoredAt=${report.historicalStorage.latestStoredAt??"-"} storedAfterSource=${report.historicalStorage.storedAfterSourceCount}`,`NORMALIZATION: ${report.normalization.status} reason=${report.normalization.reason}`,...report.validationGates.map(row=>`GATE ${row.id}: ${row.status} reason=${row.reason}`),`NETWORK_CALLS: 0`,`DB_WRITES: 0`,`PRODUCTION_ACTIVATION: NO`,`FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`NORMALIZATION_CHANGED: NO`].join("\r\n")+"\r\n";}

export function runForwardReadinessR3({base=DEFAULT_BASE,asOf=new Date().toISOString(),crossReportFile,cfoFile,historyLedgerFile,reportsDir}={}){
  const reports=reportsDir??path.join(base,"manual-input","e1-r5","reports"),crossPath=crossReportFile??path.join(reports,"e1-r5-sec-cross-filing-audit-last.json"),cfoPath=cfoFile??path.join(base,"manual-input","e1-r5","cfo-survey-r1","releases.json"),ledgerPath=historyLedgerFile??path.join(base,"manual-input","e1-r5","sec-guidance-r17","historical-backfill-r1.json");
  if(!fs.existsSync(crossPath))throw Object.assign(new Error("CROSS_FILING_REPORT_MISSING"),{code:"CROSS_FILING_REPORT_MISSING"});
  if(!fs.existsSync(cfoPath))throw Object.assign(new Error("CFO_RELEASES_MISSING"),{code:"CFO_RELEASES_MISSING"});
  if(!fs.existsSync(ledgerPath))throw Object.assign(new Error("HISTORY_LEDGER_MISSING"),{code:"HISTORY_LEDGER_MISSING"});
  const report=buildForwardReadiness({crossReport:readJson(crossPath),cfoDocument:readJson(cfoPath),historyLedger:readJson(ledgerPath),asOf});
  ensureDir(reports);const jsonReport=path.join(reports,"e1-r5-forward-readiness-r3-last.json"),textReport=path.join(reports,"e1-r5-forward-readiness-r3-last.txt");writeJsonAtomic(jsonReport,report);fs.writeFileSync(textReport,formatText(report),"utf8");return {report,jsonReport,textReport,crossReportFile:crossPath,cfoFile:cfoPath,historyLedgerFile:ledgerPath};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();
  try{const result=runForwardReadinessR3({base:cli.base?path.resolve(cli.base):undefined,asOf:cli["as-of"]??undefined,crossReportFile:cli["cross-report"]?path.resolve(cli["cross-report"]):undefined,cfoFile:cli["cfo-file"]?path.resolve(cli["cfo-file"]):undefined,historyLedgerFile:cli.ledger?path.resolve(cli.ledger):undefined,reportsDir:cli["reports-dir"]?path.resolve(cli["reports-dir"]):undefined});console.log(JSON.stringify({status:result.report.status,rawComponentsReady:result.report.rawComponentsReady,productionReady:false,s12aRaw:result.report.raw.s12a,s12bRaw:result.report.raw.s12b,s13Raw:result.report.raw.s13,comparableIssuerCoverage:result.report.sec.comparableOverallCoverage,comparableWithinGuidanceCoverage:result.report.sec.comparableWithinGuidanceCoverage,cfoReadyRevisionCount:result.report.cfo.history.readyRevisionCount,textReport:result.textReport,jsonReport:result.jsonReport,networkCalls:0,dbWrites:0,productionActivation:false}));if(!result.report.rawComponentsReady)process.exitCode=2;}catch(error){console.log(JSON.stringify({status:"FAILED",code:safeCode(error),networkCalls:0,dbWrites:0,productionActivation:false}));process.exitCode=1;}
}
