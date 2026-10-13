import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {collapseGuidanceCandidates,buildIssuerCrossFilingPair} from "./earnings-r5-sec-cross-filing-audit.mjs";
import {extractSecEpsGuidance,buildGuidanceShadowDiagnostic} from "../../lib/market-score/earnings-e1-r5-guidance-r2.mjs";

export const E1_R5_G3_VALIDATION_R1_VERSION="E1-R5-G3-VALIDATION-R1";
export const E1_R5_G3_VALIDATION_R1_CONTRACT=Object.freeze({
  researchOnly:true,
  productionActivation:false,
  networkCalls:0,
  dbWrites:0,
  formulaChanged:false,
  weightChanged:false,
  normalizationChanged:false,
  pitBacktestClaim:false,
  sourceClassification:"RETROSPECTIVE_SOURCE_TIME_NOT_PIT",
  monthlyCadence:true,
  minComparableIssuersPerPoint:10,
  minValidMonthlyPoints:6,
  minUniqueValuesPerSeries:4,
  maxAbsSpearman:0.90,
  maxAbsLeaveOneOutSpearman:0.95,
  maxAbsFirstDifferenceSpearman:0.80,
  requireDifferentRankVectors:true,
});
const DEFAULT_BASE=process.env.ZGMINI_PC_HOME||path.join(os.homedir(),".zgmini","pc-writer");
function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});}
function writeJsonAtomic(file,value){ensureDir(path.dirname(file));const part=`${file}.${process.pid}.part`;fs.writeFileSync(part,JSON.stringify(value,null,2)+"\n","utf8");fs.renameSync(part,file);}
function safeCode(error){const raw=String(error?.code??error?.message??"G3_VALIDATION_FAILED");return /^[A-Z0-9_:-]+$/.test(raw)?raw:"G3_VALIDATION_FAILED";}
const clean = v => String(v ?? "").trim();
const finite = Number.isFinite;
const cik10 = v => clean(v).replace(/\D/g, "").padStart(10, "0");
const accessionKey = v => clean(v).replaceAll("-", "");
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function sourceIso(row) {
  const a = Date.parse(clean(row?.acceptedAt));
  if (finite(a)) return new Date(a).toISOString();
  const f = clean(row?.filed);
  const b = /^\d{4}-\d{2}-\d{2}$/.test(f) ? Date.parse(`${f}T23:59:59Z`) : Date.parse(f);
  return finite(b) ? new Date(b).toISOString() : null;
}
function inRoot(rootPath, file) {
  const basePath = path.resolve(rootPath) + path.sep;
  const target = path.resolve(file);
  return target.startsWith(basePath);
}
function locateCurrent(item,{documentsRoot}) {
  const expected = clean(item?.sourceSha256).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expected)) return {status:"HASH_MISSING", sources:[]};
  const dir = path.join(documentsRoot, cik10(item?.cik), accessionKey(item?.accessionNumber));
  if (!fs.existsSync(dir)) return {status:"MISSING", sources:[]};
  let files = [];
  try {
    files = fs.readdirSync(dir, {withFileTypes:true})
      .filter(x => x.isFile() && !x.name.endsWith(".part"))
      .map(x => path.join(dir, x.name)).sort();
  } catch { return {status:"MISSING", sources:[]}; }
  for (const file of files) {
    const bytes = fs.readFileSync(file);
    if (sha256(bytes) === expected) return {status:"MATCH", sources:[{role:"CURRENT", file, bytes}]};
  }
  return {status:files.length ? "HASH_MISMATCH" : "MISSING", sources:[]};
}
function locateHistory(item,{root}) {
  const rows = Array.isArray(item?.sourceFiles) ? item.sourceFiles : [];
  if (!rows.length) return {status:"MISSING", sources:[]};
  const sources = [];
  for (const row of rows) {
    const expected = clean(row?.sha256).toLowerCase();
    const rel = clean(row?.file);
    if (!/^[a-f0-9]{64}$/.test(expected) || !rel) return {status:"HASH_MISSING", sources:[]};
    const file = path.resolve(root, rel);
    if (!inRoot(root, file)) return {status:"PATH_INVALID", sources:[]};
    if (!fs.existsSync(file)) return {status:"MISSING", sources:[]};
    const bytes = fs.readFileSync(file);
    if (sha256(bytes) !== expected) return {status:"HASH_MISMATCH", sources:[]};
    sources.push({role:clean(row?.role)||"HISTORY", file, bytes});
  }
  return {status:"MATCH", sources};
}
function parseSources(sources, metadata) {
  const all = [];
  for (const source of sources) {
    const parsed = extractSecEpsGuidance(source.bytes.toString("utf8"), metadata);
    for (const candidate of parsed?.candidates ?? []) {
      all.push({...candidate, sourceRole:source.role, sourceFile:path.basename(source.file)});
    }
  }
  const collapsed = collapseGuidanceCandidates(all);
  return {ready:collapsed.ready, ambiguousKeys:collapsed.ambiguousKeys};
}
function monthEndMs(year, month0) {
  return Date.UTC(year, month0+1, 1, 0, 0, 0, 0) - 1;
}
function rank(values) {
  const indexed = values.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v);
  const out = Array(values.length);
  let p = 0;
  while (p < indexed.length) {
    let q = p + 1;
    while (q < indexed.length && indexed[q].v === indexed[p].v) q++;
    const avg = (p + 1 + q) / 2;
    for (let k=p;k<q;k++) out[indexed[k].i] = avg;
    p = q;
  }
  return out;
}
function pearson(a,b) {
  if (a.length !== b.length || a.length < 2) return null;
  const ma = a.reduce((s,x)=>s+x,0)/a.length, mb = b.reduce((s,x)=>s+x,0)/b.length;
  let num=0, da=0, db=0;
  for (let i=0;i<a.length;i++) {
    const x=a[i]-ma, y=b[i]-mb;
    num += x*y; da += x*x; db += y*y;
  }
  return da>0 && db>0 ? num/Math.sqrt(da*db) : null;
}
function spearman(a,b) {
  return pearson(rank(a), rank(b));
}
function uniqueCount(values) { return new Set(values.map(v => JSON.stringify(v))).size; }
function absOrNull(value){return finite(value)?Math.abs(value):null;}
export function evaluateG3Validation(monthly,{contract=E1_R5_G3_VALIDATION_R1_CONTRACT}={}){
  const eligible=(monthly??[]).filter(row=>
    finite(row?.s12aRaw)&&finite(row?.s13Raw)&&
    Number(row?.comparableIssuerCount??0)>=contract.minComparableIssuersPerPoint
  );
  const xs=eligible.map(row=>row.s12aRaw);
  const ys=eligible.map(row=>row.s13Raw);
  const rho=spearman(xs,ys);
  const uniqueS12aValues=uniqueCount(xs);
  const uniqueS13Values=uniqueCount(ys);
  const rankX=rank(xs),rankY=rank(ys);
  const rankVectorsIdentical=JSON.stringify(rankX)===JSON.stringify(rankY);
  const firstDiffX=[],firstDiffY=[];
  for(let i=1;i<eligible.length;i++){
    firstDiffX.push(eligible[i].s12aRaw-eligible[i-1].s12aRaw);
    firstDiffY.push(eligible[i].s13Raw-eligible[i-1].s13Raw);
  }
  const firstDifferenceSpearman=firstDiffX.length>=2?spearman(firstDiffX,firstDiffY):null;
  const leaveOneOut=[];
  if(eligible.length>=4){
    for(let drop=0;drop<eligible.length;drop++){
      const ax=xs.filter((_,i)=>i!==drop),ay=ys.filter((_,i)=>i!==drop);
      leaveOneOut.push({droppedMonth:eligible[drop].month,rho:spearman(ax,ay)});
    }
  }
  const looAbs=leaveOneOut.map(row=>absOrNull(row.rho)).filter(finite);
  const maxAbsLeaveOneOut=looAbs.length?Math.max(...looAbs):null;
  const checks={
    minimumMonthlyPoints:eligible.length>=contract.minValidMonthlyPoints,
    minimumS12aVariation:uniqueS12aValues>=contract.minUniqueValuesPerSeries,
    minimumS13Variation:uniqueS13Values>=contract.minUniqueValuesPerSeries,
    staticNotNearDuplicate:finite(rho)&&Math.abs(rho)<contract.maxAbsSpearman,
    leaveOneOutNotNearDuplicate:finite(maxAbsLeaveOneOut)&&maxAbsLeaveOneOut<contract.maxAbsLeaveOneOutSpearman,
    dynamicNotNearDuplicate:finite(firstDifferenceSpearman)&&Math.abs(firstDifferenceSpearman)<contract.maxAbsFirstDifferenceSpearman,
    rankVectorsDifferent:contract.requireDifferentRankVectors?!rankVectorsIdentical:true,
  };
  let status="EVIDENCE_PRESENT",reason="S12A_S13_INCREMENTAL_INFORMATION_NON_REDUNDANT";
  if(!checks.minimumMonthlyPoints){
    status="NOT_EVALUABLE";reason="INSUFFICIENT_VALID_MONTHLY_POINTS";
  }else if(!checks.minimumS12aVariation||!checks.minimumS13Variation){
    status="NOT_EVALUABLE";reason="INSUFFICIENT_SERIES_VARIATION";
  }else if(!finite(rho)||!finite(firstDifferenceSpearman)||!finite(maxAbsLeaveOneOut)){
    status="NOT_EVALUABLE";reason="CORRELATION_UNAVAILABLE";
  }else if(!checks.rankVectorsDifferent){
    status="FAILED";reason="RANK_VECTORS_IDENTICAL";
  }else if(!checks.staticNotNearDuplicate){
    status="FAILED";reason="STATIC_SPEARMAN_NEAR_DUPLICATE";
  }else if(!checks.leaveOneOutNotNearDuplicate){
    status="FAILED";reason="LEAVE_ONE_OUT_NEAR_DUPLICATE";
  }else if(!checks.dynamicNotNearDuplicate){
    status="FAILED";reason="FIRST_DIFFERENCE_NEAR_DUPLICATE";
  }
  return {
    status,reason,
    validMonthlyPointCount:eligible.length,
    validMonths:eligible.map(row=>row.month),
    minComparableIssuersPerPoint:eligible.length?Math.min(...eligible.map(row=>row.comparableIssuerCount)):null,
    spearmanS12aVsS13:rho,
    firstDifferenceSpearman,
    uniqueS12aValues,
    uniqueS13Values,
    uniqueJointStates:uniqueCount(eligible.map(row=>[row.s12aRaw,row.s13Raw])),
    rankVectorsIdentical,
    maxAbsLeaveOneOut,
    leaveOneOut,
    rankResidualShare:finite(rho)?1-rho*rho:null,
    checks,
    thresholds:{
      minComparableIssuersPerPoint:contract.minComparableIssuersPerPoint,
      minValidMonthlyPoints:contract.minValidMonthlyPoints,
      minUniqueValuesPerSeries:contract.minUniqueValuesPerSeries,
      maxAbsSpearman:contract.maxAbsSpearman,
      maxAbsLeaveOneOutSpearman:contract.maxAbsLeaveOneOutSpearman,
      maxAbsFirstDifferenceSpearman:contract.maxAbsFirstDifferenceSpearman,
      requireDifferentRankVectors:contract.requireDifferentRankVectors,
    },
  };
}

export function runG3ValidationR1({base=DEFAULT_BASE,reportsDir}={}){
  const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");
  const documentsRoot=path.join(root,"documents");
  const checkpointFile=path.join(root,"checkpoint.json");
  const ledgerFile=path.join(root,"historical-backfill-r1.json");
  const reports=reportsDir??path.join(base,"manual-input","e1-r5","reports");
  if(!fs.existsSync(checkpointFile))throw Object.assign(new Error("CHECKPOINT_MISSING"),{code:"CHECKPOINT_MISSING"});
  if(!fs.existsSync(ledgerFile))throw Object.assign(new Error("HISTORY_LEDGER_MISSING"),{code:"HISTORY_LEDGER_MISSING"});
  const checkpoint=readJson(checkpointFile);
  const ledger=readJson(ledgerFile);
  if(checkpoint?.version!=="E1-R5-R17-SEC-GUIDANCE-R1")throw Object.assign(new Error("CHECKPOINT_VERSION_MISMATCH"),{code:"CHECKPOINT_VERSION_MISMATCH"});
  if(ledger?.version!=="E1-R5-SEC-HISTORY-BACKFILL-R1")throw Object.assign(new Error("HISTORY_VERSION_MISMATCH"),{code:"HISTORY_VERSION_MISMATCH"});

  const filingsByCik=new Map();
  const integrity={currentMatched:0,currentFailed:0,historyMatched:0,historyFailed:0,parsedFilings:0};
  function addParsed(item,role,located){
    const availableAt=sourceIso(item);
    if(!availableAt||located.status!=="MATCH")return;
    const cik=cik10(item?.cik);
    const metadata={cik,accession:item?.accessionNumber,form:item?.form??"8-K",acceptedAt:availableAt};
    const parsed=parseSources(located.sources,metadata);
    const row={cik,accessionNumber:clean(item?.accessionNumber),filed:clean(item?.filed),availableAt,ms:Date.parse(availableAt),role,candidates:parsed.ready,ambiguousKeys:parsed.ambiguousKeys};
    if(!filingsByCik.has(cik))filingsByCik.set(cik,[]);
    filingsByCik.get(cik).push(row);
    integrity.parsedFilings++;
  }

  for(const item of Object.values(ledger?.completed??{})){
    const located=locateHistory(item,{root});
    if(located.status==="MATCH"){integrity.historyMatched++;addParsed(item,"HISTORY",located);}
    else integrity.historyFailed++;
  }
  for(const item of Object.values(checkpoint?.completed??{})){
    const located=locateCurrent(item,{documentsRoot});
    if(located.status==="MATCH"){integrity.currentMatched++;addParsed(item,"CURRENT",located);}
    else integrity.currentFailed++;
  }
  if(integrity.currentFailed||integrity.historyFailed)throw Object.assign(new Error("SOURCE_INTEGRITY_FAILED"),{code:"SOURCE_INTEGRITY_FAILED"});
  for(const seq of filingsByCik.values())seq.sort((a,b)=>a.ms-b.ms||a.accessionNumber.localeCompare(b.accessionNumber));

  let minMs=Infinity,maxMs=-Infinity;
  for(const seq of filingsByCik.values())for(const row of seq){minMs=Math.min(minMs,row.ms);maxMs=Math.max(maxMs,row.ms);}
  if(!finite(minMs)||!finite(maxMs))throw Object.assign(new Error("SOURCE_TIME_RANGE_MISSING"),{code:"SOURCE_TIME_RANGE_MISSING"});

  function replay(asOfMs){
    const issuerPairs=[];const missing={};let eligibleIssuerCount=0,latestWithGuidance=0;
    for(const [cik,seq] of filingsByCik){
      const eligible=seq.filter(row=>row.ms<=asOfMs);
      if(!eligible.length)continue;
      eligibleIssuerCount++;
      const latest=eligible.at(-1);
      if(latest.candidates.length)latestWithGuidance++;
      const prior=eligible.slice(0,-1).reverse().map(row=>({accessionNumber:row.accessionNumber,filed:row.filed,candidates:row.candidates,ambiguousKeys:row.ambiguousKeys}));
      const result=buildIssuerCrossFilingPair({currentCandidates:latest.candidates,historicalFilings:prior});
      if(result.status==="READY")issuerPairs.push({cik,currentAccessionNumber:latest.accessionNumber,...result.pair});
      else{const reason=result.reason??"UNKNOWN";missing[reason]=(missing[reason]??0)+1;}
    }
    const diagnostic=buildGuidanceShadowDiagnostic(issuerPairs.map(row=>({current:row.current,previous:row.previous})));
    return {eligibleIssuerCount,latestWithGuidance,comparableIssuerCount:diagnostic.comparableCount,s12aRaw:diagnostic.s12aRaw,s13Raw:diagnostic.s13Raw,directions:diagnostic.directions,missingReasons:missing};
  }

  const monthly=[];
  let cursor=new Date(minMs),year=cursor.getUTCFullYear(),month=cursor.getUTCMonth();
  const end=new Date(maxMs);
  while(year<end.getUTCFullYear()||(year===end.getUTCFullYear()&&month<=end.getUTCMonth())){
    const asOfMs=Math.min(monthEndMs(year,month),maxMs);
    monthly.push({month:`${year}-${String(month+1).padStart(2,"0")}`,asOf:new Date(asOfMs).toISOString(),...replay(asOfMs)});
    month++;if(month===12){month=0;year++;}
  }

  const g3=evaluateG3Validation(monthly);
  const report={
    version:E1_R5_G3_VALIDATION_R1_VERSION,
    status:g3.status,
    reason:g3.reason,
    classification:E1_R5_G3_VALIDATION_R1_CONTRACT.sourceClassification,
    source:{
      checkpointVersion:checkpoint.version,
      historyVersion:ledger.version,
      currentRows:Object.keys(checkpoint.completed??{}).length,
      historicalRows:Object.keys(ledger.completed??{}).length,
      parsedIssuers:filingsByCik.size,
      parsedFilings:integrity.parsedFilings,
      earliestSourceAt:new Date(minMs).toISOString(),
      latestSourceAt:new Date(maxMs).toISOString(),
    },
    integrity,monthly,g3,
    safety:{networkCalls:0,dbWrites:0,productionActivation:false,formulaChanged:false,weightChanged:false,normalizationChanged:false,pitBacktestClaim:false},
  };
  ensureDir(reports);
  const jsonReport=path.join(reports,"e1-r5-g3-validation-r1-last.json");
  const textReport=path.join(reports,"e1-r5-g3-validation-r1-last.txt");
  writeJsonAtomic(jsonReport,report);
  const lines=[
    `E1-R5 G3 VALIDATION R1: ${report.status}`,
    `REASON: ${report.reason}`,
    `CLASSIFICATION: ${report.classification}`,
    `SOURCE: current=${report.source.currentRows} historical=${report.source.historicalRows} parsed=${report.source.parsedFilings}`,
    `VALID_MONTHS: ${g3.validMonthlyPointCount} ${g3.validMonths.join(",")}`,
    `MIN_COMPARABLE_ISSUERS: ${g3.minComparableIssuersPerPoint??"-"}`,
    `SPEARMAN_S12A_S13: ${finite(g3.spearmanS12aVsS13)?g3.spearmanS12aVsS13.toFixed(8):"-"}`,
    `FIRST_DIFF_SPEARMAN: ${finite(g3.firstDifferenceSpearman)?g3.firstDifferenceSpearman.toFixed(8):"-"}`,
    `MAX_ABS_LOO_SPEARMAN: ${finite(g3.maxAbsLeaveOneOut)?g3.maxAbsLeaveOneOut.toFixed(8):"-"}`,
    `RANK_VECTORS_IDENTICAL: ${g3.rankVectorsIdentical?"YES":"NO"}`,
    `RANK_RESIDUAL_SHARE: ${finite(g3.rankResidualShare)?g3.rankResidualShare.toFixed(8):"-"}`,
    `CHECKS: ${JSON.stringify(g3.checks)}`,
    `NETWORK_CALLS: 0`,
    `DB_WRITES: 0`,
    `PRODUCTION_ACTIVATION: NO`,
    `FORMULA_CHANGED: NO`,
    `WEIGHT_CHANGED: NO`,
    `NORMALIZATION_CHANGED: NO`,
    `PIT_BACKTEST_CLAIM: NO`,
  ];
  fs.writeFileSync(textReport,lines.join("\r\n")+"\r\n","utf8");
  return {report,jsonReport,textReport};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();
  try{
    const result=runG3ValidationR1({base:cli.base?path.resolve(cli.base):undefined,reportsDir:cli["reports-dir"]?path.resolve(cli["reports-dir"]):undefined});
    console.log(JSON.stringify({status:result.report.status,reason:result.report.reason,validMonthlyPointCount:result.report.g3.validMonthlyPointCount,spearmanS12aVsS13:result.report.g3.spearmanS12aVsS13,firstDifferenceSpearman:result.report.g3.firstDifferenceSpearman,maxAbsLeaveOneOut:result.report.g3.maxAbsLeaveOneOut,textReport:result.textReport,jsonReport:result.jsonReport,networkCalls:0,dbWrites:0,productionActivation:false}));
    if(result.report.status!=="EVIDENCE_PRESENT")process.exitCode=2;
  }catch(error){
    console.log(JSON.stringify({status:"FAILED",code:safeCode(error),networkCalls:0,dbWrites:0,productionActivation:false}));
    process.exitCode=1;
  }
}
