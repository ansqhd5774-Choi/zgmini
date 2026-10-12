import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {
  extractSecEpsGuidance,
  extractSecGuidanceRevisionPairs,
} from "../../lib/market-score/earnings-e1-r5-guidance-r2.mjs";
import {
  buildCfoSurveyPITRecord,
  buildCfoSurveyShadowDiagnostic,
} from "../../lib/market-score/earnings-e1-r5-cfo-survey-r1.mjs";
import {guidanceBreadthRaw,median} from "../../lib/market-score/earnings-e1-r5-forward-r2.mjs";

export const E1_R5_FORWARD_R2_LOCAL_AUDIT_VERSION="E1-R5-FORWARD-R2-LOCAL-AUDIT-R1";

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const text=value=>typeof value==="string"?value.trim():"";
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");
const accessionKey=value=>text(value).replaceAll("-","");
const finite=value=>typeof value==="number"&&Number.isFinite(value);

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
  const part=`${file}.part`;
  fs.writeFileSync(part,JSON.stringify(value,null,2)+"\n","utf8");
  fs.renameSync(part,file);
}
function safeErrorCode(error){
  const raw=String(error?.code??error?.message??"FORWARD_R2_LOCAL_AUDIT_FAILED");
  return /^[A-Z0-9_:-]+$/.test(raw)?raw:"FORWARD_R2_LOCAL_AUDIT_FAILED";
}
function toFiledAt(value){
  const filed=text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(filed)?`${filed}T23:59:59Z`:filed||null;
}
function sourceDirectory(documentsRoot,item){
  return path.join(documentsRoot,text(item?.cik),accessionKey(item?.accessionNumber));
}
function locateSourceByHash(documentsRoot,item){
  const expected=text(item?.sourceSha256).toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(expected))return {status:"HASH_MISSING",file:null,bytes:null};
  const directory=sourceDirectory(documentsRoot,item);
  if(!fs.existsSync(directory))return {status:"MISSING",file:null,bytes:null};
  let files=[];
  try{
    files=fs.readdirSync(directory,{withFileTypes:true})
      .filter(entry=>entry.isFile()&&!entry.name.endsWith(".part"))
      .map(entry=>path.join(directory,entry.name))
      .sort();
  }catch{return {status:"MISSING",file:null,bytes:null};}
  for(const file of files){
    let bytes;
    try{bytes=fs.readFileSync(file);}catch{continue;}
    if(sha256(bytes)===expected)return {status:"MATCH",file,bytes};
  }
  return {status:files.length?"HASH_MISMATCH":"MISSING",file:null,bytes:null};
}

function directionFromRaw(raw,epsilon=1e-12){
  if(!finite(raw))return null;
  if(Math.abs(raw)<=epsilon)return "SAME";
  return raw>0?"UP":"DOWN";
}

export function auditExistingSecGuidanceCorpus({checkpoint,documentsRoot}={}){
  if(!checkpoint?.completed||typeof checkpoint.completed!=="object"){
    throw Object.assign(new Error("SEC_GUIDANCE_CHECKPOINT_INVALID"),{code:"SEC_GUIDANCE_CHECKPOINT_INVALID"});
  }
  const entries=Object.values(checkpoint.completed)
    .sort((a,b)=>text(a?.cik).localeCompare(text(b?.cik))||text(a?.accessionNumber).localeCompare(text(b?.accessionNumber)));
  const integrity={matched:0,missing:0,hashMismatch:0,hashMissing:0};
  const parse={anyCurrentGuidanceIssuers:0,directPairIssuers:0,ambiguousPairIssuers:0,noPairIssuers:0};
  const missingReasons={};
  const directPairs=[];
  const periodCounts={};
  const basisCounts={GAAP:0,ADJUSTED:0};
  const directions={up:0,same:0,down:0};

  for(const item of entries){
    const located=locateSourceByHash(documentsRoot,item);
    if(located.status!=="MATCH"){
      if(located.status==="MISSING")integrity.missing++;
      else if(located.status==="HASH_MISMATCH")integrity.hashMismatch++;
      else integrity.hashMissing++;
      continue;
    }
    integrity.matched++;
    const html=located.bytes.toString("utf8");
    const metadata={
      cik:item?.cik,
      accession:item?.accessionNumber,
      form:"8-K",
      filedAt:toFiledAt(item?.filed),
    };
    const current=extractSecEpsGuidance(html,metadata);
    if(current.status==="READY")parse.anyCurrentGuidanceIssuers++;
    const revisions=extractSecGuidanceRevisionPairs(html,metadata);
    if(revisions.pairs.length===1){
      parse.directPairIssuers++;
      const pair=revisions.pairs[0];
      directPairs.push({
        cik:text(item?.cik),
        accessionNumber:text(item?.accessionNumber),
        filed:text(item?.filed),
        periodKey:pair.periodKey,
        basis:pair.basis,
        raw:pair.raw,
        currentMidpoint:pair.current?.midpoint??null,
        previousMidpoint:pair.previous?.midpoint??null,
      });
      periodCounts[pair.periodKey]=(periodCounts[pair.periodKey]??0)+1;
      if(pair.basis in basisCounts)basisCounts[pair.basis]++;
      const direction=directionFromRaw(pair.raw);
      if(direction==="UP")directions.up++;
      else if(direction==="DOWN")directions.down++;
      else if(direction==="SAME")directions.same++;
    }else if(revisions.pairs.length>1){
      parse.ambiguousPairIssuers++;
    }else{
      parse.noPairIssuers++;
      const reasons=new Set(revisions.rejected.map(row=>text(row?.reason)).filter(Boolean));
      if(!reasons.size)reasons.add("NO_DIRECT_REVISION_PAIR");
      for(const reason of reasons)missingReasons[reason]=(missingReasons[reason]??0)+1;
    }
  }

  const totalIssuers=entries.length;
  const integrityPass=integrity.missing===0&&integrity.hashMismatch===0&&integrity.hashMissing===0&&integrity.matched===totalIssuers;
  const directPairMedian=median(directPairs.map(row=>row.raw));
  const directPairBreadth=guidanceBreadthRaw(directions);
  return {
    status:integrityPass?"PASS":"FAILED",
    corpusVersion:text(checkpoint?.version)||null,
    totalIssuers,
    integrity,
    parse,
    currentGuidanceCoverage:totalIssuers?parse.anyCurrentGuidanceIssuers/totalIssuers:null,
    directPairIssuerCoverage:totalIssuers?parse.directPairIssuers/totalIssuers:null,
    diagnosticOnly:{
      directPairMedian,
      directPairBreadth,
      directions,
      periodCounts,
      basisCounts,
      note:"LOWER_BOUND_SAME_FILING_DIRECT_PAIR_DIAGNOSTIC_NOT_S12A_SCORE",
    },
    missingReasons,
    directPairs,
  };
}

function normalizeCfoInput(document){
  if(Array.isArray(document))return document;
  if(Array.isArray(document?.releases))return document.releases;
  return [];
}
function periodOrdinal(row){return Number(row?.surveyYear)*4+(Number(row?.surveyQuarter)-1);}

export function auditLocalCfoSurveyFile(document,{asOf}={}){
  const input=normalizeCfoInput(document);
  const built=input.map(buildCfoSurveyPITRecord);
  const ready=built.filter(row=>row.status==="READY");
  const invalid=built.filter(row=>row.status!=="READY");
  const invalidReasons={};
  for(const row of invalid){const reason=text(row?.reason)||"UNKNOWN";invalidReasons[reason]=(invalidReasons[reason]??0)+1;}
  const asOfMs=Date.parse(text(asOf));
  const available=ready.filter(row=>!Number.isFinite(asOfMs)||Date.parse(row.releaseAt)<=asOfMs);
  available.sort((a,b)=>periodOrdinal(b)-periodOrdinal(a)||Date.parse(b.releaseAt)-Date.parse(a.releaseAt));
  const latest=available[0]??null;
  if(!latest){
    return {status:"MISSING",reason:"NO_READY_RELEASE_AS_OF",inputCount:input.length,readyCount:ready.length,invalidCount:invalid.length,invalidReasons,raw:null};
  }
  const diagnostic=buildCfoSurveyShadowDiagnostic(ready,{asOf,surveyYear:latest.surveyYear,surveyQuarter:latest.surveyQuarter});
  return {
    status:diagnostic.status,
    reason:diagnostic.reason??null,
    inputCount:input.length,
    readyCount:ready.length,
    invalidCount:invalid.length,
    invalidReasons,
    surveyYear:latest.surveyYear,
    surveyQuarter:latest.surveyQuarter,
    raw:diagnostic.raw??null,
    currentLevel:diagnostic.currentLevel??null,
    previousLevel:diagnostic.previousLevel??null,
    currentRevisionId:diagnostic.current?.revisionId??null,
    previousRevisionId:diagnostic.previous?.revisionId??null,
  };
}

function formatPercent(value){return finite(value)?`${(value*100).toFixed(1)}%`:"-";}
function formatNumber(value){return finite(value)?String(Number(value.toFixed(6))):"-";}
function formatText(report){
  const sec=report.sec;
  const cfo=report.cfo;
  return [
    `E1-R5 FORWARD R2 LOCAL AUDIT: ${report.status}`,
    `AT: ${report.at}`,
    `AS_OF: ${report.asOf}`,
    `POLICY: RESEARCH_ONLY productionActivation=false formulaChanged=false weightChanged=false`,
    `SEC_CORPUS: status=${sec.status} issuers=${sec.totalIssuers} hashMatched=${sec.integrity.matched} missing=${sec.integrity.missing} hashMismatch=${sec.integrity.hashMismatch} hashMissing=${sec.integrity.hashMissing}`,
    `SEC_CURRENT_GUIDANCE: issuers=${sec.parse.anyCurrentGuidanceIssuers}/${sec.totalIssuers} coverage=${formatPercent(sec.currentGuidanceCoverage)}`,
    `SEC_DIRECT_NUMERIC_PAIR: issuers=${sec.parse.directPairIssuers}/${sec.totalIssuers} coverage=${formatPercent(sec.directPairIssuerCoverage)} ambiguous=${sec.parse.ambiguousPairIssuers}`,
    `SEC_DIRECT_PAIR_DIAGNOSTIC_MEDIAN: ${formatNumber(sec.diagnosticOnly.directPairMedian)}`,
    `SEC_DIRECT_PAIR_DIAGNOSTIC_BREADTH: ${formatNumber(sec.diagnosticOnly.directPairBreadth)}`,
    `SEC_DIRECT_PAIR_NOTE: ${sec.diagnosticOnly.note}`,
    `CFO_SURVEY: status=${cfo.status} reason=${cfo.reason??"-"} period=${cfo.surveyYear?`${cfo.surveyYear}Q${cfo.surveyQuarter}`:"-"} rawRevision=${formatNumber(cfo.raw)} currentLevel=${formatNumber(cfo.currentLevel)} previousLevel=${formatNumber(cfo.previousLevel)}`,
    `NETWORK_CALLS: 0`,
    `DB_WRITES: 0`,
    `PRODUCTION_ACTIVATION: NO`,
    `FORMULA_CHANGED: NO`,
    `WEIGHT_CHANGED: NO`,
  ].join("\r\n")+"\r\n";
}

export function runEarningsR5ForwardR2LocalAudit({
  base=DEFAULT_BASE,
  asOf=new Date().toISOString().slice(0,10),
  checkpointFile,
  documentsRoot,
  cfoFile=null,
  reportsDir,
}={}){
  const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");
  const checkpointPath=checkpointFile??path.join(root,"checkpoint.json");
  const documentsPath=documentsRoot??path.join(root,"documents");
  const reports=reportsDir??path.join(base,"manual-input","e1-r5","reports");
  if(!fs.existsSync(checkpointPath))throw Object.assign(new Error("SEC_GUIDANCE_CHECKPOINT_MISSING"),{code:"SEC_GUIDANCE_CHECKPOINT_MISSING"});
  if(!fs.existsSync(documentsPath))throw Object.assign(new Error("SEC_GUIDANCE_DOCUMENT_ROOT_MISSING"),{code:"SEC_GUIDANCE_DOCUMENT_ROOT_MISSING"});
  const sec=auditExistingSecGuidanceCorpus({checkpoint:readJson(checkpointPath),documentsRoot:documentsPath});
  let cfo={status:"NOT_PROVIDED",reason:"CFO_LOCAL_SOURCE_NOT_PROVIDED",raw:null};
  if(cfoFile){
    if(!fs.existsSync(cfoFile))throw Object.assign(new Error("CFO_LOCAL_SOURCE_MISSING"),{code:"CFO_LOCAL_SOURCE_MISSING"});
    cfo=auditLocalCfoSurveyFile(readJson(cfoFile),{asOf});
  }
  const report={
    version:E1_R5_FORWARD_R2_LOCAL_AUDIT_VERSION,
    status:sec.status==="PASS"?"PASS":"FAILED",
    at:new Date().toISOString(),
    asOf,
    researchOnly:true,
    sec,
    cfo,
    networkCalls:0,
    dbWrites:0,
    productionActivation:false,
    formulaChanged:false,
    weightChanged:false,
  };
  ensureDir(reports);
  const jsonReport=path.join(reports,"e1-r5-forward-r2-local-audit-last.json");
  const textReport=path.join(reports,"e1-r5-forward-r2-local-audit-last.txt");
  writeJsonAtomic(jsonReport,report);
  fs.writeFileSync(textReport,formatText(report),"utf8");
  return {report,jsonReport,textReport,checkpointFile:checkpointPath,documentsRoot:documentsPath,cfoFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();
  try{
    const result=runEarningsR5ForwardR2LocalAudit({
      base:cli.base?path.resolve(cli.base):undefined,
      asOf:cli["as-of"]??undefined,
      checkpointFile:cli.checkpoint?path.resolve(cli.checkpoint):undefined,
      documentsRoot:cli.documents?path.resolve(cli.documents):undefined,
      cfoFile:cli["cfo-file"]?path.resolve(cli["cfo-file"]):null,
      reportsDir:cli["reports-dir"]?path.resolve(cli["reports-dir"]):undefined,
    });
    console.log(JSON.stringify({
      status:result.report.status,
      secDirectPairCoverage:result.report.sec.directPairIssuerCoverage,
      secCurrentGuidanceCoverage:result.report.sec.currentGuidanceCoverage,
      cfoStatus:result.report.cfo.status,
      cfoRaw:result.report.cfo.raw??null,
      textReport:result.textReport,
      jsonReport:result.jsonReport,
      networkCalls:0,
      dbWrites:0,
      productionActivation:false,
    }));
    if(result.report.status!=="PASS")process.exitCode=1;
  }catch(error){
    console.log(JSON.stringify({status:"FAILED",code:safeErrorCode(error),networkCalls:0,dbWrites:0,productionActivation:false}));
    process.exitCode=1;
  }
}
