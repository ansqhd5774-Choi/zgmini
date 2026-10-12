import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {classifyR21GuidanceCandidateFromHtml} from "../../lib/market-score/earnings-e1-r5-guidance-r21-candidate.mjs";
import {classifyR22GuidanceCandidateFromHtml} from "../../lib/market-score/earnings-e1-r5-guidance-r22-candidate.mjs";

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const clean=value=>String(value??"").trim();
function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});}
function writeJsonAtomic(file,value){ensureDir(path.dirname(file));const part=`${file}.part`;fs.writeFileSync(part,JSON.stringify(value,null,2)+"\n","utf8");fs.renameSync(part,file);}
function sha256(bytes){return createHash("sha256").update(bytes).digest("hex");}
function accessionKey(value){return String(value??"").replaceAll("-","");}
function sourceDirectory(documentsRoot,item){return path.join(documentsRoot,clean(item?.cik),accessionKey(item?.accessionNumber));}
function locateSourceByHash(documentsRoot,item){
  const expected=clean(item?.sourceSha256).toLowerCase();const directory=sourceDirectory(documentsRoot,item);
  if(!expected||!fs.existsSync(directory))return {status:"MISSING"};
  let files=[];try{files=fs.readdirSync(directory,{withFileTypes:true}).filter(entry=>entry.isFile()&&!entry.name.endsWith(".part")).map(entry=>path.join(directory,entry.name)).sort();}catch{return {status:"MISSING"};}
  for(const file of files){let bytes;try{bytes=fs.readFileSync(file);}catch{continue;}if(sha256(bytes)===expected)return {status:"MATCH",file,bytes};}
  return {status:files.length?"HASH_MISMATCH":"MISSING"};
}
function normalizedDirection(value){const direction=clean(value);return ["UP","FLAT","DOWN","WITHDRAW","MIXED"].includes(direction)?direction:"UNCLASSIFIED";}
function directionOf(result){return normalizedDirection(result?.direction);}
function localExcerpt(value,max=520){const text=clean(value).replace(/\s+/g," ");return text.length>max?`${text.slice(0,max)}…`:text;}
function signalRows(result){return (result?.signals??[]).map(signal=>({direction:signal.direction,metrics:signal.metrics??[],context:signal.context??""}));}
function flagFor(r21,r22){
  const e21=r21?.eligibleForBreadth===true,e22=r22?.eligibleForBreadth===true,d21=directionOf(r21),d22=directionOf(r22);
  if(e21&&d22==="UNCLASSIFIED")return "POTENTIAL_REGRESSION";
  if(d21==="WITHDRAW"&&d22!=="WITHDRAW")return "FALSE_WITHDRAWAL_FIX_CANDIDATE";
  if(d21==="UNCLASSIFIED"&&e22)return "COVERAGE_GAIN";
  if(e21&&e22&&d21!==d22)return "DIRECTION_CHANGE";
  if(!e21&&e22)return "ELIGIBILITY_GAIN";
  if(e21&&!e22)return "ELIGIBILITY_LOSS";
  return "OTHER";
}
function countFlags(rows){const out={};for(const row of rows)out[row.flag]=(out[row.flag]??0)+1;return out;}
function formatEvidence(lines,label,evidence){
  if(evidence.length===0){lines.push(`${label}_EVIDENCE: NONE`);return;}
  evidence.slice(0,4).forEach((item,index)=>lines.push(`${label}_EVIDENCE_${index+1}: ${item.direction}/${item.metrics.join("+")||"NONE"} :: ${localExcerpt(item.context)}`));
}
function formatPacket(rows){
  const lines=[
    "ZGMINI E1-R5 R23 GUIDANCE REGRESSION AUDIT PACKET",
    "PURPOSE: local semantic review of R21 -> R22 changed entries with evidence from both classifiers",
    "NETWORK_CALLS: 0",
    "DB_WRITES: 0",
    "PRODUCTION_ACTIVATION: NO",
    "FORMULA_CHANGED: NO",
    "SCORING_GATE_CHANGED: NO",
    "RAW_TEXT_PUBLICATION: NO",
    "LOCAL_EXCERPTS_INCLUDED: YES",
    "",
  ];
  let shown=0;
  for(const row of rows){if(!row.changed)continue;shown++;
    lines.push(`=== CHANGED ${shown} ===`,`FLAG: ${row.flag}`,`CIK: ${row.cik}`,`ACCESSION: ${row.accessionNumber}`,`FILED: ${row.filed}`,`R17_DIRECTION: ${row.r17Direction}`,`R21_DIRECTION: ${row.r21Direction}`,`R22_DIRECTION: ${row.r22Direction}`,`R21_ELIGIBLE: ${row.r21Eligible?"YES":"NO"}`,`R22_ELIGIBLE: ${row.r22Eligible?"YES":"NO"}`,`R21_SIGNAL_COUNTS: ${JSON.stringify(row.r21SignalCounts)}`,`R22_SIGNAL_COUNTS: ${JSON.stringify(row.r22SignalCounts)}`);
    formatEvidence(lines,"R21",row.r21Evidence);formatEvidence(lines,"R22",row.r22Evidence);lines.push("");
  }
  return lines.join("\r\n")+"\r\n";
}
function formatText(report){
  const flags=Object.entries(report.flagCounts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([k,v])=>`${k}=${v}`).join(" ");
  return [
    `E1-R5 R23 GUIDANCE REGRESSION AUDIT: ${report.status}`,
    `AT: ${report.at}`,
    `CHECKPOINT_ENTRIES: ${report.checkpointEntries}`,
    `DOCUMENT_INTEGRITY: matched=${report.hashMatched} missing=${report.missingDocuments} hashMismatch=${report.hashMismatch}`,
    `R21_TO_R22_CHANGED_ENTRIES: ${report.changedEntries}`,
    `FLAGS: ${flags||"NONE"}`,
    `POTENTIAL_REGRESSIONS: ${report.potentialRegressions}`,
    `SEMANTIC_VALIDATION: REVIEW_REQUIRED`,
    `NETWORK_CALLS: 0`,
    `DB_WRITES: 0`,
    `PRODUCTION_ACTIVATION: NO`,
    `FORMULA_CHANGED: NO`,
    `SCORING_GATE_CHANGED: NO`,
    `RAW_TEXT_PUBLICATION: NO`,
    `LOCAL_PACKET: ${report.packetFile}`,
    report.errorCode?`ERROR: ${report.errorCode}`:null,
  ].filter(Boolean).join("\r\n")+"\r\n";
}

export function auditEarningsR5R23GuidanceRegression({base=DEFAULT_BASE}={}){
  const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");const documentsRoot=path.join(root,"documents");const checkpoint=readJson(path.join(root,"checkpoint.json"));
  const reports=path.join(base,"manual-input","e1-r5","reports");const r17Report=readJson(path.join(reports,"e1-r5-r17-sec-guidance-last.json"));
  if(!checkpoint?.completed||typeof checkpoint.completed!=="object")throw Object.assign(new Error("R23_CHECKPOINT_MISSING"),{code:"R23_CHECKPOINT_MISSING"});
  if(!r17Report)throw Object.assign(new Error("R23_R17_REPORT_MISSING"),{code:"R23_R17_REPORT_MISSING"});
  ensureDir(reports);
  const entries=Object.values(checkpoint.completed).sort((a,b)=>clean(a?.accessionNumber).localeCompare(clean(b?.accessionNumber)));
  const rows=[];let hashMatched=0,missingDocuments=0,hashMismatch=0;
  for(const item of entries){
    const located=locateSourceByHash(documentsRoot,item);if(located.status==="MISSING"){missingDocuments++;continue;}if(located.status==="HASH_MISMATCH"){hashMismatch++;continue;}hashMatched++;
    const html=located.bytes.toString("utf8");const r21=classifyR21GuidanceCandidateFromHtml(html);const r22=classifyR22GuidanceCandidateFromHtml(html);const r21Direction=directionOf(r21),r22Direction=directionOf(r22);
    rows.push({cik:clean(item?.cik),accessionNumber:clean(item?.accessionNumber),filed:clean(item?.filed),r17Direction:normalizedDirection(item?.direction),r21Direction,r22Direction,r21Eligible:r21.eligibleForBreadth===true,r22Eligible:r22.eligibleForBreadth===true,changed:r21Direction!==r22Direction,flag:flagFor(r21,r22),r21SignalCounts:r21.counts,r22SignalCounts:r22.counts,r21Evidence:signalRows(r21),r22Evidence:signalRows(r22)});
  }
  const checkpointEntries=entries.length;const r17Complete=r17Report.status==="COMPLETE"&&Number(r17Report.remainingIssuers)===0&&Number(r17Report.completedIssuers)===checkpointEntries;
  const structuralPass=r17Complete&&hashMatched===checkpointEntries&&missingDocuments===0&&hashMismatch===0;
  const changedRows=rows.filter(row=>row.changed);const flagCounts=countFlags(changedRows);const packetFile=path.join(reports,"e1-r5-r23-guidance-regression-audit-packet.txt");fs.writeFileSync(packetFile,formatPacket(changedRows),"utf8");
  const jsonFile=path.join(reports,"e1-r5-r23-guidance-regression-audit-last.json");const textFile=path.join(reports,"e1-r5-r23-guidance-regression-audit-last.txt");
  const report={version:"E1-R5-R23-GUIDANCE-REGRESSION-AUDIT-R1",status:structuralPass?"COMPLETE":"FAILED",at:new Date().toISOString(),r17Status:r17Report.status??"UNKNOWN",r17Complete,checkpointEntries,hashMatched,missingDocuments,hashMismatch,changedEntries:changedRows.length,flagCounts,potentialRegressions:flagCounts.POTENTIAL_REGRESSION??0,semanticValidation:"REVIEW_REQUIRED",networkCalls:0,dbWrites:0,productionActivation:false,formulaChanged:false,scoringGateChanged:false,rawTextPublication:false,packetFile,errorCode:structuralPass?null:"R23_STRUCTURAL_AUDIT_FAILED",rows:changedRows.map(({r21Evidence,r22Evidence,...row})=>row)};
  writeJsonAtomic(jsonFile,report);fs.writeFileSync(textFile,formatText(report),"utf8");return {report,jsonFile,textFile,packetFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();
  try{const result=auditEarningsR5R23GuidanceRegression({base:cli.base?path.resolve(cli.base):undefined});console.log(JSON.stringify({status:result.report.status,textReport:result.textFile,jsonReport:result.jsonFile,packetFile:result.packetFile,changedEntries:result.report.changedEntries,potentialRegressions:result.report.potentialRegressions,networkCalls:0,dbWrites:0,productionActivation:false,formulaChanged:false,semanticValidation:"REVIEW_REQUIRED"}));if(result.report.status!=="COMPLETE")process.exitCode=1;}catch(error){console.log(JSON.stringify({status:"FAILED",code:String(error?.code??"R23_FAILED")}));process.exitCode=1;}
}
