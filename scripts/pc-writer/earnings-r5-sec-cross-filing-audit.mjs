import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {
  buildGuidanceShadowDiagnostic,
  extractSecEpsGuidance,
} from "../../lib/market-score/earnings-e1-r5-guidance-r2.mjs";

export const E1_R5_SEC_CROSS_FILING_AUDIT_VERSION="E1-R5-SEC-CROSS-FILING-AUDIT-R1";
export const E1_R5_SEC_CROSS_FILING_AUDIT_CONTRACT=Object.freeze({
  sourceCorpusVersion:"E1-R5-R17-SEC-GUIDANCE-R1",
  historyVersion:"E1-R5-SEC-HISTORY-BACKFILL-R1",
  researchOnly:true,
  productionActivation:false,
  networkCalls:0,
  dbWrites:0,
  formulaChanged:false,
  weightChanged:false,
  currentCheckpointMutation:false,
  comparison:"SAME_ISSUER_TARGET_PERIOD_METRIC_BASIS_UNIT_ACROSS_FILINGS",
  multipleComparableKeysPolicy:"MISSING",
  ambiguousPriorPolicy:"MISSING",
  historyStoredAfterAsOfPolicy:"EXCLUDE",
});

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const clean=value=>String(value??"").trim();
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
const accessionKey=value=>clean(value).replaceAll("-","");
const cik10=value=>String(value??"").replace(/\D/g,"").padStart(10,"0");

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){const match=item.match(/^--([^=]+)=(.*)$/);if(match)out[match[1]]=match[2];}
  return out;
}
function safeCode(error){const raw=String(error?.code??error?.message??"SEC_CROSS_FILING_AUDIT_FAILED");return /^[A-Z0-9_:-]+$/.test(raw)?raw:"SEC_CROSS_FILING_AUDIT_FAILED";}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});}
function readJson(file){return JSON.parse(fs.readFileSync(file,"utf8"));}
function writeJsonAtomic(file,value){ensureDir(path.dirname(file));const part=`${file}.part`;fs.writeFileSync(part,JSON.stringify(value,null,2)+"\n","utf8");fs.renameSync(part,file);}
function toIso(value,{endOfDay=false}={}){
  const s=clean(value);if(!s)return null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return `${s}T${endOfDay?"23:59:59":"00:00:00"}Z`;
  const ms=Date.parse(s);return Number.isFinite(ms)?new Date(ms).toISOString():null;
}
function currentAvailableAt(item){return toIso(item?.acceptedAt)||toIso(item?.filed,{endOfDay:true});}
function historyAvailableAt(item){return toIso(item?.acceptedAt)||toIso(item?.filed,{endOfDay:true});}
function candidateKey(row){return [row?.periodKey,row?.metric,row?.basis,row?.unit].map(clean).join("|");}
function rangeKey(row){return [candidateKey(row),row?.low,row?.high].join("|");}
function inRoot(root,file){const base=path.resolve(root)+path.sep;const target=path.resolve(file);return target.startsWith(base);}

function locateCurrentSource(root,documentsRoot,item){
  const expected=clean(item?.sourceSha256).toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(expected))return {status:"HASH_MISSING",sources:[]};
  const directory=path.join(documentsRoot,cik10(item?.cik),accessionKey(item?.accessionNumber));
  if(!fs.existsSync(directory))return {status:"MISSING",sources:[]};
  let files=[];
  try{files=fs.readdirSync(directory,{withFileTypes:true}).filter(entry=>entry.isFile()&&!entry.name.endsWith(".part")).map(entry=>path.join(directory,entry.name)).sort();}catch{return {status:"MISSING",sources:[]};}
  for(const file of files){
    let bytes;try{bytes=fs.readFileSync(file);}catch{continue;}
    if(sha256(bytes)===expected)return {status:"MATCH",sources:[{role:"CURRENT",file,bytes,sha256:expected}]};
  }
  return {status:files.length?"HASH_MISMATCH":"MISSING",sources:[]};
}

function locateHistoricalSources(root,item){
  const rows=Array.isArray(item?.sourceFiles)?item.sourceFiles:[];
  if(!rows.length)return {status:"MISSING",sources:[]};
  const sources=[];
  for(const row of rows){
    const expected=clean(row?.sha256).toLowerCase();
    const relative=clean(row?.file);
    if(!/^[a-f0-9]{64}$/.test(expected)||!relative)return {status:"HASH_MISSING",sources:[]};
    const file=path.resolve(root,relative);
    if(!inRoot(root,file))return {status:"PATH_INVALID",sources:[]};
    if(!fs.existsSync(file))return {status:"MISSING",sources:[]};
    const bytes=fs.readFileSync(file);
    if(sha256(bytes)!==expected)return {status:"HASH_MISMATCH",sources:[]};
    sources.push({role:clean(row?.role)||"HISTORY",file,bytes,sha256:expected});
  }
  return {status:"MATCH",sources};
}

export function collapseGuidanceCandidates(candidates=[]){
  const byKey=new Map();
  for(const row of candidates){
    if(row?.status!=="READY")continue;
    const key=candidateKey(row);if(!key||key.startsWith("|||"))continue;
    if(!byKey.has(key))byKey.set(key,new Map());
    byKey.get(key).set(rangeKey(row),row);
  }
  const ready=[];const ambiguousKeys=[];
  for(const [key,ranges] of byKey.entries()){
    if(ranges.size===1)ready.push([...ranges.values()][0]);
    else ambiguousKeys.push(key);
  }
  return {ready,ambiguousKeys};
}

function parseAccessionSources(sources,metadata){
  const all=[];let scannedSegments=0;
  for(const source of sources){
    const parsed=extractSecEpsGuidance(source.bytes.toString("utf8"),metadata);
    scannedSegments+=Number(parsed?.scannedSegments??0);
    for(const candidate of parsed?.candidates??[])all.push({...candidate,sourceRole:source.role,sourceFile:path.basename(source.file)});
  }
  const collapsed=collapseGuidanceCandidates(all);
  return {...collapsed,scannedSegments};
}

function comparablePair(current,previous){
  if(!current||!previous)return false;
  return clean(current.periodKey)===clean(previous.periodKey)
    &&clean(current.metric).toUpperCase()===clean(previous.metric).toUpperCase()
    &&clean(current.basis).toUpperCase()===clean(previous.basis).toUpperCase()
    &&clean(current.unit).toUpperCase()===clean(previous.unit).toUpperCase();
}

export function buildIssuerCrossFilingPair({currentCandidates=[],historicalFilings=[]}={}){
  const pairs=[];const reasons={};
  for(const current of currentCandidates){
    const key=candidateKey(current);
    let selected=null;let blockedByAmbiguity=false;
    for(const filing of historicalFilings){
      if(filing.ambiguousKeys?.includes(key)){blockedByAmbiguity=true;break;}
      const match=(filing.candidates??[]).find(previous=>comparablePair(current,previous));
      if(match){selected={current,previous:match,priorAccessionNumber:filing.accessionNumber,priorFiled:filing.filed};break;}
    }
    if(blockedByAmbiguity){reasons.PRIOR_GUIDANCE_AMBIGUOUS=(reasons.PRIOR_GUIDANCE_AMBIGUOUS??0)+1;continue;}
    if(!selected){reasons.NO_PRIOR_COMPARABLE_GUIDANCE=(reasons.NO_PRIOR_COMPARABLE_GUIDANCE??0)+1;continue;}
    pairs.push(selected);
  }
  if(pairs.length===1)return {status:"READY",pair:pairs[0],reason:null,reasons};
  if(pairs.length>1)return {status:"MISSING",pair:null,reason:"MULTIPLE_COMPARABLE_GUIDANCE_KEYS",reasons:{...reasons,MULTIPLE_COMPARABLE_GUIDANCE_KEYS:pairs.length}};
  const reason=Object.keys(reasons)[0]??"NO_CURRENT_COMPARABLE_GUIDANCE";
  return {status:"MISSING",pair:null,reason,reasons};
}

export function auditSecCrossFilingCorpus({checkpoint,historyLedger,root,documentsRoot,asOf}={}){
  if(checkpoint?.version!==E1_R5_SEC_CROSS_FILING_AUDIT_CONTRACT.sourceCorpusVersion)throw Object.assign(new Error("SOURCE_CORPUS_VERSION_MISMATCH"),{code:"SOURCE_CORPUS_VERSION_MISMATCH"});
  if(historyLedger?.version!==E1_R5_SEC_CROSS_FILING_AUDIT_CONTRACT.historyVersion)throw Object.assign(new Error("HISTORY_LEDGER_VERSION_MISMATCH"),{code:"HISTORY_LEDGER_VERSION_MISMATCH"});
  const asOfMs=Date.parse(clean(asOf));if(!Number.isFinite(asOfMs))throw Object.assign(new Error("AS_OF_INVALID"),{code:"AS_OF_INVALID"});
  const currentEntries=Object.values(checkpoint.completed??{}).sort((a,b)=>cik10(a?.cik).localeCompare(cik10(b?.cik)));
  const historyEntries=Object.values(historyLedger.completed??{});
  const historyByCik=new Map();
  const integrity={currentMatched:0,currentMissing:0,currentHashMismatch:0,currentHashMissing:0,historyMatched:0,historyMissing:0,historyHashMismatch:0,historyHashMissing:0,historyPathInvalid:0,historyExcludedStoredAfterAsOf:0};
  const parsedHistory=[];

  for(const item of historyEntries){
    const storedAtMs=Date.parse(clean(item?.storedAt));
    if(!Number.isFinite(storedAtMs)||storedAtMs>asOfMs){integrity.historyExcludedStoredAfterAsOf++;continue;}
    const located=locateHistoricalSources(root,item);
    if(located.status!=="MATCH"){
      if(located.status==="HASH_MISMATCH")integrity.historyHashMismatch++;
      else if(located.status==="HASH_MISSING")integrity.historyHashMissing++;
      else if(located.status==="PATH_INVALID")integrity.historyPathInvalid++;
      else integrity.historyMissing++;
      continue;
    }
    integrity.historyMatched++;
    const metadata={cik:cik10(item?.cik),accession:item?.accessionNumber,form:item?.form??"8-K",acceptedAt:historyAvailableAt(item)};
    const parsed=parseAccessionSources(located.sources,metadata);
    const row={cik:cik10(item?.cik),accessionNumber:clean(item?.accessionNumber),filed:clean(item?.filed),availableAt:historyAvailableAt(item),candidates:parsed.ready,ambiguousKeys:parsed.ambiguousKeys};
    parsedHistory.push(row);
    if(!historyByCik.has(row.cik))historyByCik.set(row.cik,[]);
    historyByCik.get(row.cik).push(row);
  }
  for(const rows of historyByCik.values())rows.sort((a,b)=>Date.parse(b.availableAt)-Date.parse(a.availableAt)||b.accessionNumber.localeCompare(a.accessionNumber));

  const issuerPairs=[];const issuerMissingReasons={};const currentParse={readyIssuers:0,ambiguousIssuers:0,noGuidanceIssuers:0};const detail=[];
  for(const item of currentEntries){
    const cik=cik10(item?.cik);const located=locateCurrentSource(root,documentsRoot,item);
    if(located.status!=="MATCH"){
      if(located.status==="HASH_MISMATCH")integrity.currentHashMismatch++;
      else if(located.status==="HASH_MISSING")integrity.currentHashMissing++;
      else integrity.currentMissing++;
      continue;
    }
    integrity.currentMatched++;
    const metadata={cik,accession:item?.accessionNumber,form:item?.form??"8-K",acceptedAt:currentAvailableAt(item)};
    const parsed=parseAccessionSources(located.sources,metadata);
    if(parsed.ambiguousKeys.length)currentParse.ambiguousIssuers++;
    if(parsed.ready.length)currentParse.readyIssuers++;else currentParse.noGuidanceIssuers++;
    const pairResult=buildIssuerCrossFilingPair({currentCandidates:parsed.ready,historicalFilings:historyByCik.get(cik)??[]});
    if(pairResult.status==="READY"){
      issuerPairs.push({cik,currentAccessionNumber:clean(item?.accessionNumber),...pairResult.pair});
    }else{
      const reason=pairResult.reason??"UNKNOWN";issuerMissingReasons[reason]=(issuerMissingReasons[reason]??0)+1;
    }
    detail.push({cik,currentAccessionNumber:clean(item?.accessionNumber),currentCandidateCount:parsed.ready.length,currentAmbiguousKeyCount:parsed.ambiguousKeys.length,historyFilingCount:(historyByCik.get(cik)??[]).length,status:pairResult.status,reason:pairResult.reason??null,priorAccessionNumber:pairResult.pair?.priorAccessionNumber??null});
  }

  const diagnostic=buildGuidanceShadowDiagnostic(issuerPairs.map(row=>({current:row.current,previous:row.previous})));
  const integrityPass=integrity.currentMissing===0&&integrity.currentHashMismatch===0&&integrity.currentHashMissing===0&&integrity.historyMissing===0&&integrity.historyHashMismatch===0&&integrity.historyHashMissing===0&&integrity.historyPathInvalid===0;
  return {
    status:integrityPass?"PASS":"FAILED",
    asOf:new Date(asOfMs).toISOString(),
    currentIssuerCount:currentEntries.length,
    historicalLedgerCount:historyEntries.length,
    historicalUsableCount:parsedHistory.length,
    integrity,
    currentParse,
    comparableIssuerCount:diagnostic.comparableCount,
    comparableIssuerCoverage:currentEntries.length?diagnostic.comparableCount/currentEntries.length:null,
    s12aRaw:diagnostic.s12aRaw,
    s13Raw:diagnostic.s13Raw,
    directions:diagnostic.directions,
    issuerMissingReasons,
    issuerPairs:issuerPairs.map(row=>({
      cik:row.cik,currentAccessionNumber:row.currentAccessionNumber,priorAccessionNumber:row.priorAccessionNumber,priorFiled:row.priorFiled,
      periodKey:row.current.periodKey,basis:row.current.basis,currentMidpoint:row.current.midpoint,previousMidpoint:row.previous.midpoint,
    })),
    detail,
    note:"SHADOW_CROSS_FILING_RAW_ONLY_NOT_NORMALIZED_NOT_PRODUCTION_SCORE",
  };
}

function formatNumber(value){return finite(value)?String(Number(value.toFixed(8))):"-";}
function formatPercent(value){return finite(value)?`${(value*100).toFixed(2)}%`:"-";}
function formatText(report){
  const a=report.audit;
  return [
    `E1-R5 SEC CROSS-FILING AUDIT: ${report.status}`,
    `VERSION: ${E1_R5_SEC_CROSS_FILING_AUDIT_VERSION}`,
    `AS_OF: ${report.asOf}`,
    `BACKFILL_STATUS: ${report.backfillStatus}`,
    `CURRENT_ISSUERS: ${a?.currentIssuerCount??0}`,
    `HISTORY_LEDGER: total=${a?.historicalLedgerCount??0} usable=${a?.historicalUsableCount??0} storedAfterAsOf=${a?.integrity?.historyExcludedStoredAfterAsOf??0}`,
    `CURRENT_INTEGRITY: matched=${a?.integrity?.currentMatched??0} missing=${a?.integrity?.currentMissing??0} hashMismatch=${a?.integrity?.currentHashMismatch??0} hashMissing=${a?.integrity?.currentHashMissing??0}`,
    `HISTORY_INTEGRITY: matched=${a?.integrity?.historyMatched??0} missing=${a?.integrity?.historyMissing??0} hashMismatch=${a?.integrity?.historyHashMismatch??0} hashMissing=${a?.integrity?.historyHashMissing??0} pathInvalid=${a?.integrity?.historyPathInvalid??0}`,
    `CURRENT_GUIDANCE: readyIssuers=${a?.currentParse?.readyIssuers??0} ambiguousIssuers=${a?.currentParse?.ambiguousIssuers??0} noGuidanceIssuers=${a?.currentParse?.noGuidanceIssuers??0}`,
    `CROSS_FILING_COMPARABLE: issuers=${a?.comparableIssuerCount??0}/${a?.currentIssuerCount??0} coverage=${formatPercent(a?.comparableIssuerCoverage)}`,
    `S12A_RAW_MEDIAN: ${formatNumber(a?.s12aRaw)}`,
    `S13_RAW_BREADTH: ${formatNumber(a?.s13Raw)}`,
    `DIRECTIONS: up=${a?.directions?.up??0} same=${a?.directions?.same??0} down=${a?.directions?.down??0}`,
    `NOTE: ${a?.note??"-"}`,
    `NETWORK_CALLS: 0`,
    `DB_WRITES: 0`,
    `CURRENT_R17_CHECKPOINT_MUTATED: NO`,
    `PRODUCTION_ACTIVATION: NO`,
    `FORMULA_CHANGED: NO`,
    `WEIGHT_CHANGED: NO`,
    report.reason?`REASON: ${report.reason}`:null,
  ].filter(Boolean).join("\r\n")+"\r\n";
}

export function runEarningsR5SecCrossFilingAudit({base=DEFAULT_BASE,asOf=new Date().toISOString(),checkpointFile,historyLedgerFile,backfillReportFile,reportsDir}={}){
  const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");
  const checkpointPath=checkpointFile??path.join(root,"checkpoint.json");
  const ledgerPath=historyLedgerFile??path.join(root,"historical-backfill-r1.json");
  const reports=reportsDir??path.join(base,"manual-input","e1-r5","reports");
  const backfillPath=backfillReportFile??path.join(reports,"e1-r5-sec-history-backfill-last.json");
  if(!fs.existsSync(checkpointPath))throw Object.assign(new Error("SOURCE_CHECKPOINT_MISSING"),{code:"SOURCE_CHECKPOINT_MISSING"});
  if(!fs.existsSync(ledgerPath))throw Object.assign(new Error("HISTORY_LEDGER_MISSING"),{code:"HISTORY_LEDGER_MISSING"});
  if(!fs.existsSync(backfillPath))throw Object.assign(new Error("HISTORY_BACKFILL_REPORT_MISSING"),{code:"HISTORY_BACKFILL_REPORT_MISSING"});
  const backfill=readJson(backfillPath);
  let report;
  if(backfill?.status!=="COMPLETE"||Number(backfill?.remainingAccessions??1)!==0){
    report={version:E1_R5_SEC_CROSS_FILING_AUDIT_VERSION,status:"BLOCKED",reason:"HISTORY_BACKFILL_NOT_COMPLETE",at:new Date().toISOString(),asOf,backfillStatus:clean(backfill?.status)||"UNKNOWN",audit:null,networkCalls:0,dbWrites:0,productionActivation:false,formulaChanged:false,weightChanged:false};
  }else{
    const audit=auditSecCrossFilingCorpus({checkpoint:readJson(checkpointPath),historyLedger:readJson(ledgerPath),root,documentsRoot:path.join(root,"documents"),asOf});
    report={version:E1_R5_SEC_CROSS_FILING_AUDIT_VERSION,status:audit.status==="PASS"?"PASS":"FAILED",reason:audit.status==="PASS"?null:"SOURCE_INTEGRITY_FAILED",at:new Date().toISOString(),asOf:audit.asOf,backfillStatus:backfill.status,audit,networkCalls:0,dbWrites:0,productionActivation:false,formulaChanged:false,weightChanged:false};
  }
  ensureDir(reports);
  const jsonReport=path.join(reports,"e1-r5-sec-cross-filing-audit-last.json");
  const textReport=path.join(reports,"e1-r5-sec-cross-filing-audit-last.txt");
  writeJsonAtomic(jsonReport,report);fs.writeFileSync(textReport,formatText(report),"utf8");
  return {report,jsonReport,textReport,checkpointFile:checkpointPath,historyLedgerFile:ledgerPath,backfillReportFile:backfillPath};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();
  try{
    const result=runEarningsR5SecCrossFilingAudit({base:cli.base?path.resolve(cli.base):undefined,asOf:cli["as-of"]??undefined,checkpointFile:cli.checkpoint?path.resolve(cli.checkpoint):undefined,historyLedgerFile:cli.ledger?path.resolve(cli.ledger):undefined,backfillReportFile:cli["backfill-report"]?path.resolve(cli["backfill-report"]):undefined,reportsDir:cli["reports-dir"]?path.resolve(cli["reports-dir"]):undefined});
    console.log(JSON.stringify({status:result.report.status,reason:result.report.reason??null,s12aRaw:result.report.audit?.s12aRaw??null,s13Raw:result.report.audit?.s13Raw??null,comparableIssuerCount:result.report.audit?.comparableIssuerCount??0,coverage:result.report.audit?.comparableIssuerCoverage??null,textReport:result.textReport,jsonReport:result.jsonReport,networkCalls:0,dbWrites:0,productionActivation:false}));
    if(result.report.status!=="PASS")process.exitCode=1;
  }catch(error){console.log(JSON.stringify({status:"FAILED",code:safeCode(error),networkCalls:0,dbWrites:0,productionActivation:false}));process.exitCode=1;}
}
