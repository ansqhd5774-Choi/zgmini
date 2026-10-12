import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {htmlToVisibleText} from "../../lib/market-score/earnings-e1-r5-guidance-r17.mjs";

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const clean=value=>String(value??"").trim();
function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});}
function writeJsonAtomic(file,value){ensureDir(path.dirname(file));const part=`${file}.part`;fs.writeFileSync(part,JSON.stringify(value,null,2)+"\n","utf8");fs.renameSync(part,file);}
function sha256(bytes){return createHash("sha256").update(bytes).digest("hex");}
function accessionKey(value){return String(value??"").replaceAll("-","");}
function normalizeText(value){return String(value??"").replace(/\s+/g," ").trim();}

const evidencePatterns=Object.freeze({
  UP:Object.freeze([
    /\b(?:raises?|raised|raising|increases?|increased|increasing|boosts?|boosted|boosting|lifts?|lifted|lifting|upgrades?|upgraded|upgrading|improves?|improved|improving)\b.{0,120}\b(?:guidance|outlook|forecast)\b/gi,
    /\b(?:guidance|outlook|forecast)\b.{0,120}\b(?:raised|higher|increased|improved|boosted|lifted|upgraded)\b/gi,
  ]),
  DOWN:Object.freeze([
    /\b(?:lowers?|lowered|lowering|reduces?|reduced|reducing|cuts?|cutting|decreases?|decreased|decreasing|downgrades?|downgraded|downgrading)\b.{0,120}\b(?:guidance|outlook|forecast)\b/gi,
    /\b(?:guidance|outlook|forecast)\b.{0,120}\b(?:lowered|lower|reduced|cut|decreased|downgraded)\b/gi,
  ]),
  FLAT:Object.freeze([
    /\b(?:reaffirms?|reaffirmed|reaffirming|reiterates?|reiterated|reiterating|maintains?|maintained|maintaining)\b.{0,120}\b(?:guidance|outlook|forecast)\b/gi,
    /\b(?:guidance|outlook|forecast)\b.{0,120}\b(?:unchanged|reaffirmed|reiterated|maintained)\b/gi,
    /\b(?:no impact to|no change to|unchanged)\b.{0,120}\b(?:guidance|outlook|forecast)\b/gi,
  ]),
  WITHDRAW:Object.freeze([
    /\b(?:withdraws?|withdrawn|withdrawing|suspends?|suspended|suspending|discontinues?|discontinued|discontinuing|rescinds?|rescinded|rescinding)\b.{0,120}\b(?:guidance|outlook|forecast)\b/gi,
    /\bno longer\s+(?:provides?|providing)\b.{0,90}\b(?:guidance|outlook|forecast)\b/gi,
  ]),
});

function classifyMetric(window){
  const t=window.toLowerCase();
  if(/\b(?:capital expenditures?|capex)\b/.test(t))return "CAPEX";
  if(/\b(?:earnings per share|adjusted eps|diluted eps|\beps\b|net income|earnings|adjusted ebitda|ebitda)\b/.test(t))return "EARNINGS";
  if(/\b(?:revenue|revenues|sales)\b/.test(t))return "REVENUE";
  if(/\b(?:margin|margins|operating income)\b/.test(t))return "MARGIN";
  if(/\b(?:cash flow|free cash flow)\b/.test(t))return "CASH_FLOW";
  return "OTHER";
}
function evidenceFromText(text){
  const normalized=normalizeText(text);const out=[];
  for(const [direction,patterns] of Object.entries(evidencePatterns)){
    for(const pattern of patterns){const regex=new RegExp(pattern.source,pattern.flags);for(const match of normalized.matchAll(regex)){
      const index=match.index??0;const start=Math.max(0,index-140);const end=Math.min(normalized.length,index+match[0].length+140);const window=normalized.slice(start,end);
      out.push({direction,index,metric:classifyMetric(window),match:match[0],context:`${start>0?"…":""}${window}${end<normalized.length?"…":""}`});
    }}
  }
  out.sort((a,b)=>a.index-b.index||a.direction.localeCompare(b.direction));return out;
}
function sourceDirectory(documentsRoot,item){return path.join(documentsRoot,clean(item?.cik),accessionKey(item?.accessionNumber));}
function locateSourceByHash(documentsRoot,item){
  const expected=clean(item?.sourceSha256).toLowerCase();const directory=sourceDirectory(documentsRoot,item);
  if(!expected||!fs.existsSync(directory))return {status:"MISSING"};
  let files=[];try{files=fs.readdirSync(directory,{withFileTypes:true}).filter(entry=>entry.isFile()&&!entry.name.endsWith(".part")).map(entry=>path.join(directory,entry.name)).sort();}catch{return {status:"MISSING"};}
  for(const file of files){let bytes;try{bytes=fs.readFileSync(file);}catch{continue;}if(sha256(bytes)===expected)return {status:"MATCH",file,bytes};}
  return {status:files.length?"HASH_MISMATCH":"MISSING"};
}
function evidenceCounts(evidence){const out={UP:0,DOWN:0,FLAT:0,WITHDRAW:0};for(const item of evidence)out[item.direction]++;return out;}
function metricCounts(evidence){const out={EARNINGS:0,REVENUE:0,MARGIN:0,CAPEX:0,CASH_FLOW:0,OTHER:0};for(const item of evidence)out[item.metric]++;return out;}
function flagsFor(direction,evidence){
  const flags=[];const dirs=new Set(evidence.map(item=>item.direction));
  if(direction==="UNCLASSIFIED"&&dirs.size===1){const only=[...dirs][0];flags.push(`MISSED_${only}_PHRASE`);}
  if(["UP","DOWN","FLAT","WITHDRAW"].includes(direction)&&dirs.size>0&&!dirs.has(direction))flags.push("R17_DIRECTION_NOT_SUPPORTED_BY_DIAGNOSTIC_PHRASE");
  if(direction==="UP"&&(dirs.has("DOWN")||dirs.has("WITHDRAW")))flags.push("OPPOSING_NEGATIVE_EVIDENCE");
  if(direction==="DOWN"&&dirs.has("UP"))flags.push("OPPOSING_POSITIVE_EVIDENCE");
  if(direction==="FLAT"&&(dirs.has("UP")||dirs.has("DOWN")||dirs.has("WITHDRAW")))flags.push("FLAT_WITH_DIRECTIONAL_EVIDENCE");
  if(direction==="MIXED"&&dirs.size>0&&[...dirs].every(d=>d==="UP"||d==="FLAT")&&dirs.has("UP"))flags.push("MIXED_UP_FLAT_ONLY");
  if(direction==="MIXED"&&dirs.size>0&&[...dirs].every(d=>d==="DOWN"||d==="FLAT")&&dirs.has("DOWN"))flags.push("MIXED_DOWN_FLAT_ONLY");
  const matching=evidence.filter(item=>item.direction===direction);
  if(direction==="DOWN"&&matching.length>0&&matching.every(item=>item.metric==="CAPEX"||item.metric==="OTHER"))flags.push("DOWN_NON_EARNINGS_METRIC_RISK");
  return [...new Set(flags)];
}
function formatText(report){
  const f=report.flagCounts,m=report.metricCounts,e=report.evidenceCounts;
  return [
    `E1-R5 R20 GUIDANCE SIGNAL DIAGNOSTICS: ${report.status}`,
    `AT: ${report.at}`,
    `CHECKPOINT_ENTRIES: ${report.checkpointEntries}`,
    `DOCUMENT_INTEGRITY: matched=${report.hashMatched} missing=${report.missingDocuments} hashMismatch=${report.hashMismatch}`,
    `EVIDENCE: UP=${e.UP} FLAT=${e.FLAT} DOWN=${e.DOWN} WITHDRAW=${e.WITHDRAW}`,
    `METRIC_EVIDENCE: EARNINGS=${m.EARNINGS} REVENUE=${m.REVENUE} MARGIN=${m.MARGIN} CAPEX=${m.CAPEX} CASH_FLOW=${m.CASH_FLOW} OTHER=${m.OTHER}`,
    `FLAGS: MISSED_UP=${f.MISSED_UP_PHRASE??0} MISSED_FLAT=${f.MISSED_FLAT_PHRASE??0} MISSED_DOWN=${f.MISSED_DOWN_PHRASE??0} MISSED_WITHDRAW=${f.MISSED_WITHDRAW_PHRASE??0} OPPOSING_POSITIVE=${f.OPPOSING_POSITIVE_EVIDENCE??0} OPPOSING_NEGATIVE=${f.OPPOSING_NEGATIVE_EVIDENCE??0} FLAT_DIRECTIONAL=${f.FLAT_WITH_DIRECTIONAL_EVIDENCE??0} MIXED_UP_FLAT_ONLY=${f.MIXED_UP_FLAT_ONLY??0} MIXED_DOWN_FLAT_ONLY=${f.MIXED_DOWN_FLAT_ONLY??0} DOWN_NON_EARNINGS=${f.DOWN_NON_EARNINGS_METRIC_RISK??0} UNSUPPORTED_DIRECTION=${f.R17_DIRECTION_NOT_SUPPORTED_BY_DIAGNOSTIC_PHRASE??0}`,
    `FLAGGED_ENTRIES: ${report.flaggedEntries}`,
    `SEMANTIC_VALIDATION: REVIEW_REQUIRED`,
    `NETWORK_CALLS: 0`,
    `DB_WRITES: 0`,
    `PRODUCTION_ACTIVATION: NO`,
    `RAW_TEXT_PUBLICATION: NO`,
    `LOCAL_EXCERPT_PACKET: ${report.packetFile}`,
    report.errorCode?`ERROR: ${report.errorCode}`:null,
  ].filter(Boolean).join("\r\n")+"\r\n";
}
function formatPacket(rows,maxFlagged){
  const lines=["ZGMINI E1-R5 R20 FLAGGED GUIDANCE SIGNAL REVIEW PACKET","PURPOSE: review only; no S13/formula change","NETWORK_CALLS: 0","DB_WRITES: 0","PRODUCTION_ACTIVATION: NO","RAW_TEXT_PUBLICATION: NO","LOCAL_EXCERPTS_INCLUDED: YES",""];
  let shown=0;
  for(const row of rows){if(row.flags.length===0)continue;if(shown>=maxFlagged)break;shown++;
    lines.push(`=== FLAGGED ${shown} ===`,`CIK: ${row.cik}`,`ACCESSION: ${row.accessionNumber}`,`R17_DIRECTION: ${row.r17Direction}`,`FLAGS: ${row.flags.join(",")}`,`EVIDENCE_COUNTS: ${JSON.stringify(row.evidenceCounts)}`,`METRIC_COUNTS: ${JSON.stringify(row.metricCounts)}`);
    row.evidence.slice(0,4).forEach((item,i)=>{lines.push(`EVIDENCE_${i+1}: ${item.direction}/${item.metric} :: ${item.context}`);});lines.push("");
  }
  return lines.join("\r\n")+"\r\n";
}

export function auditEarningsR5R20GuidanceSignals({base=DEFAULT_BASE,maxFlagged=80}={}){
  if(!Number.isInteger(maxFlagged)||maxFlagged<1||maxFlagged>200)throw Object.assign(new Error("R20_MAX_FLAGGED_INVALID"),{code:"R20_MAX_FLAGGED_INVALID"});
  const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");const documentsRoot=path.join(root,"documents");const checkpointFile=path.join(root,"checkpoint.json");const checkpoint=readJson(checkpointFile);
  if(!checkpoint?.completed||typeof checkpoint.completed!=="object")throw Object.assign(new Error("R20_CHECKPOINT_MISSING"),{code:"R20_CHECKPOINT_MISSING"});
  const reports=path.join(base,"manual-input","e1-r5","reports");ensureDir(reports);
  const rows=[];let hashMatched=0,missingDocuments=0,hashMismatch=0;const aggregateEvidence={UP:0,DOWN:0,FLAT:0,WITHDRAW:0};const aggregateMetrics={EARNINGS:0,REVENUE:0,MARGIN:0,CAPEX:0,CASH_FLOW:0,OTHER:0};const flagCounts={};
  for(const item of Object.values(checkpoint.completed).sort((a,b)=>clean(a?.accessionNumber).localeCompare(clean(b?.accessionNumber)))){
    const located=locateSourceByHash(documentsRoot,item);if(located.status==="MISSING"){missingDocuments++;continue;}if(located.status==="HASH_MISMATCH"){hashMismatch++;continue;}hashMatched++;
    const evidence=evidenceFromText(htmlToVisibleText(located.bytes.toString("utf8")));const eCounts=evidenceCounts(evidence),mCounts=metricCounts(evidence);for(const k of Object.keys(aggregateEvidence))aggregateEvidence[k]+=eCounts[k];for(const k of Object.keys(aggregateMetrics))aggregateMetrics[k]+=mCounts[k];
    const r17Direction=clean(item?.direction)||"UNCLASSIFIED";const flags=flagsFor(r17Direction,evidence);for(const flag of flags)flagCounts[flag]=(flagCounts[flag]??0)+1;
    rows.push({cik:clean(item?.cik),accessionNumber:clean(item?.accessionNumber),filed:clean(item?.filed),r17Direction,sourceRole:clean(item?.sourceRole),flags,evidenceCounts:eCounts,metricCounts:mCounts,evidence:evidence.map(({direction,metric,context})=>({direction,metric,context}))});
  }
  const checkpointEntries=Object.keys(checkpoint.completed).length;const structuralPass=hashMatched===checkpointEntries&&missingDocuments===0&&hashMismatch===0;const packetFile=path.join(reports,"e1-r5-r20-guidance-flagged-packet.txt");fs.writeFileSync(packetFile,formatPacket(rows,maxFlagged),"utf8");
  const jsonFile=path.join(reports,"e1-r5-r20-guidance-signal-diagnostics-last.json");const textFile=path.join(reports,"e1-r5-r20-guidance-signal-diagnostics-last.txt");
  const safeRows=rows.map(({evidence,...row})=>row);const report={version:"E1-R5-R20-GUIDANCE-SIGNAL-DIAGNOSTICS-R1",status:structuralPass?"COMPLETE":"FAILED",at:new Date().toISOString(),checkpointEntries,hashMatched,missingDocuments,hashMismatch,evidenceCounts:aggregateEvidence,metricCounts:aggregateMetrics,flagCounts,flaggedEntries:rows.filter(row=>row.flags.length>0).length,semanticValidation:"REVIEW_REQUIRED",networkCalls:0,dbWrites:0,productionActivation:false,rawTextPublication:false,packetFile,errorCode:structuralPass?null:"R20_STRUCTURAL_AUDIT_FAILED",rows:safeRows};
  writeJsonAtomic(jsonFile,report);fs.writeFileSync(textFile,formatText(report),"utf8");return {report,jsonFile,textFile,packetFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();const maxFlagged=Number(cli["max-flagged"]??80);
  try{const result=auditEarningsR5R20GuidanceSignals({base:cli.base?path.resolve(cli.base):undefined,maxFlagged:Number.isInteger(maxFlagged)?maxFlagged:80});console.log(JSON.stringify({status:result.report.status,textReport:result.textFile,jsonReport:result.jsonFile,packetFile:result.packetFile,flaggedEntries:result.report.flaggedEntries,networkCalls:0,dbWrites:0,productionActivation:false,semanticValidation:"REVIEW_REQUIRED"}));if(result.report.status!=="COMPLETE")process.exitCode=1;}catch(error){console.log(JSON.stringify({status:"FAILED",code:String(error?.code??"R20_FAILED")}));process.exitCode=1;}
}
