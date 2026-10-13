import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {normalizeSecGuidanceText} from "../../lib/market-score/earnings-e1-r5-guidance-r2.mjs";

export const E1_R5_SEC_MATCHING_SOURCE_REVIEW_R1_VERSION="E1-R5-SEC-MATCHING-SOURCE-REVIEW-R1";
export const E1_R5_SEC_MATCHING_SOURCE_REVIEW_R1_CONTRACT=Object.freeze({
  sourceVersion:"E1-R5-SEC-MATCHING-SAMPLE-R1",
  sourceCorpusVersion:"E1-R5-R17-SEC-GUIDANCE-R1",
  historyVersion:"E1-R5-SEC-HISTORY-BACKFILL-R1",
  researchOnly:true,
  productionActivation:false,
  networkCalls:0,
  dbWrites:0,
  formulaChanged:false,
  weightChanged:false,
  normalizationChanged:false,
  rawPublication:false,
  purpose:"PREPARE_LOCAL_SEC_SOURCE_TEXT_EXCERPTS_FOR_G2_MATCHING_ACCURACY_REVIEW",
});

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const clean=value=>String(value??"").trim();
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
const accessionKey=value=>clean(value).replaceAll("-","");
const cik10=value=>String(value??"").replace(/\D/g,"").padStart(10,"0");
const finite=value=>typeof value==="number"&&Number.isFinite(value);

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}
  return out;
}
function safeCode(error){const raw=String(error?.code??error?.message??"SEC_MATCHING_SOURCE_REVIEW_R1_FAILED");return /^[A-Z0-9_:-]+$/.test(raw)?raw:"SEC_MATCHING_SOURCE_REVIEW_R1_FAILED";}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});}
function readJson(file){return JSON.parse(fs.readFileSync(file,"utf8"));}
function writeJsonAtomic(file,value){ensureDir(path.dirname(file));const part=`${file}.${process.pid}.part`;fs.writeFileSync(part,JSON.stringify(value,null,2)+"\n","utf8");fs.renameSync(part,file);}
function inRoot(root,file){const base=path.resolve(root)+path.sep;const target=path.resolve(file);return target.startsWith(base);}
function calendarYearLike(value){return finite(value)&&Number.isInteger(value)&&value>=2000&&value<=2100;}

function locateCurrentSource(root,documentsRoot,item){
  const expected=clean(item?.sourceSha256).toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(expected))return {status:"HASH_MISSING",source:null};
  const dir=path.join(documentsRoot,cik10(item?.cik),accessionKey(item?.accessionNumber));
  if(!fs.existsSync(dir))return {status:"MISSING",source:null};
  const files=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isFile()&&!e.name.endsWith(".part")).map(e=>path.join(dir,e.name)).sort();
  for(const file of files){
    const bytes=fs.readFileSync(file);
    if(sha256(bytes)===expected)return {status:"MATCH",source:{file,bytes,sha256:expected}};
  }
  return {status:files.length?"HASH_MISMATCH":"MISSING",source:null};
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

function scoreParagraph(paragraph,{periodKey,midpoint}){
  const p=clean(paragraph);
  if(!p)return -1;
  let score=0;
  const year=clean(periodKey).match(/20\d{2}/)?.[0]??null;
  if(/\b(?:eps|earnings\s+per\s+(?:diluted\s+)?share|diluted\s+earnings\s+per\s+share)\b/i.test(p))score+=5;
  if(/\b(?:guidance|outlook|forecast|expects?|expected|raised|raises|lowered|lowers|reaffirmed|reiterated|maintained|updated)\b/i.test(p))score+=4;
  if(year&&p.includes(year))score+=2;
  if(calendarYearLike(midpoint)&&new RegExp(`\\b${midpoint-1}\\s*(?:to|through|–|—|-)\\s*${midpoint+1}\\b`).test(p))score+=8;
  return score;
}

function excerptsFromBytes(bytes,{periodKey,midpoint}){
  const normalized=normalizeSecGuidanceText(bytes.toString("utf8"));
  const paragraphs=normalized.split(/\n+/).map(clean).filter(Boolean);
  const ranked=paragraphs.map((paragraph,index)=>({index,paragraph,score:scoreParagraph(paragraph,{periodKey,midpoint})}))
    .filter(row=>row.score>0)
    .sort((a,b)=>b.score-a.score||a.index-b.index)
    .slice(0,6)
    .sort((a,b)=>a.index-b.index);
  return ranked.map(row=>({index:row.index,score:row.score,text:row.paragraph.slice(0,1400)}));
}

export function buildSourceReview({sampleReport,checkpoint,historyLedger,root,documentsRoot}={}){
  if(sampleReport?.version!==E1_R5_SEC_MATCHING_SOURCE_REVIEW_R1_CONTRACT.sourceVersion)throw Object.assign(new Error("SAMPLE_VERSION_MISMATCH"),{code:"SAMPLE_VERSION_MISMATCH"});
  if(checkpoint?.version!==E1_R5_SEC_MATCHING_SOURCE_REVIEW_R1_CONTRACT.sourceCorpusVersion)throw Object.assign(new Error("SOURCE_CORPUS_VERSION_MISMATCH"),{code:"SOURCE_CORPUS_VERSION_MISMATCH"});
  if(historyLedger?.version!==E1_R5_SEC_MATCHING_SOURCE_REVIEW_R1_CONTRACT.historyVersion)throw Object.assign(new Error("HISTORY_VERSION_MISMATCH"),{code:"HISTORY_VERSION_MISMATCH"});
  const samples=Array.isArray(sampleReport?.sample)?sampleReport.sample:[];
  if(!samples.length)throw Object.assign(new Error("SAMPLE_EMPTY"),{code:"SAMPLE_EMPTY"});
  const currentByAccession=checkpoint.completed??{};
  const historyByAccession=historyLedger.completed??{};
  const rows=[];
  let flaggedYearRange=0;
  let sourceReady=0;
  for(const sample of samples){
    const currentEntry=currentByAccession[sample.currentAccessionNumber];
    const priorEntry=historyByAccession[sample.priorAccessionNumber];
    const currentLocated=currentEntry?locateCurrentSource(root,documentsRoot,currentEntry):{status:"ENTRY_MISSING",source:null};
    const priorLocated=priorEntry?locateHistoricalSources(root,priorEntry):{status:"ENTRY_MISSING",sources:[]};
    const currentExcerpts=currentLocated.source?excerptsFromBytes(currentLocated.source.bytes,{periodKey:sample.periodKey,midpoint:sample.currentMidpoint}):[];
    const priorExcerpts=[];
    for(const source of priorLocated.sources??[]){
      for(const excerpt of excerptsFromBytes(source.bytes,{periodKey:sample.periodKey,midpoint:sample.previousMidpoint}))priorExcerpts.push({role:source.role,file:path.basename(source.file),...excerpt});
    }
    const yearFlag=calendarYearLike(sample.currentMidpoint)||calendarYearLike(sample.previousMidpoint);
    if(yearFlag)flaggedYearRange++;
    const integrityReady=currentLocated.status==="MATCH"&&priorLocated.status==="MATCH"&&currentExcerpts.length>0&&priorExcerpts.length>0;
    if(integrityReady)sourceReady++;
    rows.push({
      sampleIndex:sample.sampleIndex,
      cik:sample.cik,
      currentAccessionNumber:sample.currentAccessionNumber,
      priorAccessionNumber:sample.priorAccessionNumber,
      periodKey:sample.periodKey,
      basis:sample.basis,
      currentMidpoint:sample.currentMidpoint,
      previousMidpoint:sample.previousMidpoint,
      sourceIntegrity:{current:currentLocated.status,prior:priorLocated.status},
      autoFlags:{midpointLooksLikeCalendarYear:yearFlag},
      reviewStatus:yearFlag?"AUTO_FLAG_YEAR_RANGE":integrityReady?"SOURCE_TEXT_READY":"SOURCE_TEXT_INCOMPLETE",
      currentSourceFile:currentLocated.source?path.basename(currentLocated.source.file):null,
      currentExcerpts,
      priorExcerpts,
    });
  }
  return {
    version:E1_R5_SEC_MATCHING_SOURCE_REVIEW_R1_VERSION,
    status:sourceReady===rows.length?"REVIEW_READY":"REVIEW_PARTIAL",
    generatedAt:new Date().toISOString(),
    sourceVersion:sampleReport.version,
    sourceAsOf:sampleReport.sourceAsOf??null,
    sampleCount:rows.length,
    sourceReadyCount:sourceReady,
    flaggedYearRangeCount:flaggedYearRange,
    manualAccuracyGate:"PENDING_HUMAN_SOURCE_TEXT_DECISION",
    rows,
    networkCalls:0,
    dbWrites:0,
    productionActivation:false,
    formulaChanged:false,
    weightChanged:false,
    normalizationChanged:false,
  };
}

function formatText(report){
  const lines=[
    `E1-R5 SEC MATCHING SOURCE REVIEW R1: ${report.status}`,
    `VERSION: ${report.version}`,
    `SOURCE_VERSION: ${report.sourceVersion}`,
    `SOURCE_AS_OF: ${report.sourceAsOf??"-"}`,
    `SAMPLE_COUNT: ${report.sampleCount}`,
    `SOURCE_READY_COUNT: ${report.sourceReadyCount}`,
    `FLAGGED_YEAR_RANGE_COUNT: ${report.flaggedYearRangeCount}`,
    `MANUAL_ACCURACY_GATE: ${report.manualAccuracyGate}`,
    `NETWORK_CALLS: 0`,
    `DB_WRITES: 0`,
    `PRODUCTION_ACTIVATION: NO`,
    "",
  ];
  for(const row of report.rows){
    lines.push(`SAMPLE ${row.sampleIndex}: CIK=${row.cik} PERIOD=${row.periodKey} BASIS=${row.basis} CURRENT_MID=${row.currentMidpoint} PRIOR_MID=${row.previousMidpoint} STATUS=${row.reviewStatus} CURRENT_INTEGRITY=${row.sourceIntegrity.current} PRIOR_INTEGRITY=${row.sourceIntegrity.prior}`);
    lines.push(`  CURRENT_ACCESSION=${row.currentAccessionNumber} FILE=${row.currentSourceFile??"-"}`);
    for(const ex of row.currentExcerpts)lines.push(`  CURRENT_TEXT[${ex.index}|${ex.score}]: ${ex.text}`);
    lines.push(`  PRIOR_ACCESSION=${row.priorAccessionNumber}`);
    for(const ex of row.priorExcerpts)lines.push(`  PRIOR_TEXT[${ex.role}|${ex.file}|${ex.index}|${ex.score}]: ${ex.text}`);
    lines.push("");
  }
  return lines.join("\r\n")+"\r\n";
}

export function runSecMatchingSourceReviewR1({base=DEFAULT_BASE,reportsDir}={}){
  const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");
  const documentsRoot=path.join(root,"documents");
  const reports=reportsDir??path.join(base,"manual-input","e1-r5","reports");
  const sampleFile=path.join(reports,"e1-r5-sec-matching-sample-r1-last.json");
  const checkpointFile=path.join(root,"checkpoint.json");
  const historyFile=path.join(root,"historical-backfill-r1.json");
  for(const [file,code] of [[sampleFile,"SAMPLE_REPORT_MISSING"],[checkpointFile,"SOURCE_CHECKPOINT_MISSING"],[historyFile,"HISTORY_LEDGER_MISSING"]]){
    if(!fs.existsSync(file))throw Object.assign(new Error(code),{code});
  }
  const report=buildSourceReview({sampleReport:readJson(sampleFile),checkpoint:readJson(checkpointFile),historyLedger:readJson(historyFile),root,documentsRoot});
  ensureDir(reports);
  const jsonReport=path.join(reports,"e1-r5-sec-matching-source-review-r1-last.json");
  const textReport=path.join(reports,"e1-r5-sec-matching-source-review-r1-last.txt");
  writeJsonAtomic(jsonReport,report);
  fs.writeFileSync(textReport,formatText(report),"utf8");
  return {report,jsonReport,textReport};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();
  try{
    const result=runSecMatchingSourceReviewR1({base:cli.base?path.resolve(cli.base):undefined,reportsDir:cli["reports-dir"]?path.resolve(cli["reports-dir"]):undefined});
    console.log(JSON.stringify({status:result.report.status,sampleCount:result.report.sampleCount,sourceReadyCount:result.report.sourceReadyCount,flaggedYearRangeCount:result.report.flaggedYearRangeCount,jsonReport:result.jsonReport,textReport:result.textReport,networkCalls:0,dbWrites:0,productionActivation:false}));
  }catch(error){
    console.log(JSON.stringify({status:"FAILED",code:safeCode(error),networkCalls:0,dbWrites:0,productionActivation:false}));
    process.exitCode=1;
  }
}
