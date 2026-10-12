import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {classifyR21GuidanceCandidateFromHtml,E1_R5_R21_GUIDANCE_CANDIDATE_POLICY} from "../../lib/market-score/earnings-e1-r5-guidance-r21-candidate.mjs";

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
function emptyDirectionCounts(){return {UP:0,FLAT:0,DOWN:0,WITHDRAW:0,MIXED:0,UNCLASSIFIED:0};}
function normalizedDirection(value){const direction=clean(value);return ["UP","FLAT","DOWN","WITHDRAW","MIXED"].includes(direction)?direction:"UNCLASSIFIED";}
function candidateDirection(result){return normalizedDirection(result?.direction);}
function breadth(counts){const eligible=counts.UP+counts.FLAT+counts.DOWN;return eligible?((counts.UP-counts.DOWN)/eligible):null;}
function coverage(counts,total){const eligible=counts.UP+counts.FLAT+counts.DOWN;return total?eligible/total:null;}
function formatNumber(value){return value==null?"null":String(value);}
function transitionSummary(transitions,max=14){return Object.entries(transitions).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,max).map(([key,value])=>`${key}=${value}`).join(" ");}
function localExcerpt(value,max=420){const text=clean(value).replace(/\s+/g," ");return text.length>max?`${text.slice(0,max)}…`:text;}
function formatPacket(rows,maxChanged){
  const lines=[
    "ZGMINI E1-R5 R21 CANDIDATE GUIDANCE CHANGED-ENTRY REVIEW PACKET",
    "PURPOSE: semantic review of R17 -> R21 candidate changes only",
    "NETWORK_CALLS: 0",
    "DB_WRITES: 0",
    "PRODUCTION_ACTIVATION: NO",
    "FORMULA_CHANGED: NO",
    "RAW_TEXT_PUBLICATION: NO",
    "LOCAL_EXCERPTS_INCLUDED: YES",
    "",
  ];
  let shown=0;
  for(const row of rows){if(!row.changed)continue;if(shown>=maxChanged)break;shown++;
    lines.push(`=== CHANGED ${shown} ===`,`CIK: ${row.cik}`,`ACCESSION: ${row.accessionNumber}`,`FILED: ${row.filed}`,`R17_DIRECTION: ${row.r17Direction}`,`R21_DIRECTION: ${row.r21Direction}`,`R21_ELIGIBLE: ${row.r21Eligible?"YES":"NO"}`,`R21_SIGNAL_COUNTS: ${JSON.stringify(row.r21SignalCounts)}`,`R21_METRIC_COUNTS: ${JSON.stringify(row.r21MetricCounts)}`);
    row.evidence.slice(0,3).forEach((item,index)=>lines.push(`EVIDENCE_${index+1}: ${item.direction}/${item.metrics.join("+")||"NONE"} :: ${localExcerpt(item.context)}`));
    if(row.evidence.length===0)lines.push("EVIDENCE: NONE");
    lines.push("");
  }
  return lines.join("\r\n")+"\r\n";
}
function formatText(report){
  const a=report.r17DirectionCounts,b=report.r21DirectionCounts;
  return [
    `E1-R5 R21 GUIDANCE CANDIDATE COMPARE: ${report.status}`,
    `AT: ${report.at}`,
    `POLICY: ${report.policyVersion} RESEARCH_ONLY=true`,
    `R17_STATUS: ${report.r17Status}`,
    `CHECKPOINT_ENTRIES: ${report.checkpointEntries}`,
    `DOCUMENT_INTEGRITY: matched=${report.hashMatched} missing=${report.missingDocuments} hashMismatch=${report.hashMismatch}`,
    `R17_DIRECTION: UP=${a.UP} FLAT=${a.FLAT} DOWN=${a.DOWN} WITHDRAW=${a.WITHDRAW} MIXED=${a.MIXED} UNCLASSIFIED=${a.UNCLASSIFIED}`,
    `R21_DIRECTION: UP=${b.UP} FLAT=${b.FLAT} DOWN=${b.DOWN} WITHDRAW=${b.WITHDRAW} MIXED=${b.MIXED} UNCLASSIFIED=${b.UNCLASSIFIED}`,
    `ELIGIBLE: R17=${report.r17Eligible}/${report.checkpointEntries} (${formatNumber(report.r17EligibleCoverage)}) R21=${report.r21Eligible}/${report.checkpointEntries} (${formatNumber(report.r21EligibleCoverage)})`,
    `DIAGNOSTIC_NET_BREADTH: R17=${formatNumber(report.r17NetBreadth)} R21=${formatNumber(report.r21NetBreadth)}`,
    `CHANGED_ENTRIES: ${report.changedEntries}`,
    `TRANSITIONS_TOP: ${transitionSummary(report.transitions)}`,
    `SEMANTIC_VALIDATION: REVIEW_REQUIRED`,
    `NETWORK_CALLS: 0`,
    `DB_WRITES: 0`,
    `PRODUCTION_ACTIVATION: NO`,
    `FORMULA_CHANGED: NO`,
    `SCORING_GATE_CHANGED: NO`,
    `RAW_TEXT_PUBLICATION: NO`,
    `LOCAL_CHANGED_PACKET: ${report.packetFile}`,
    report.errorCode?`ERROR: ${report.errorCode}`:null,
  ].filter(Boolean).join("\r\n")+"\r\n";
}

export function compareEarningsR5R21GuidanceCandidate({base=DEFAULT_BASE,maxChanged=120}={}){
  if(!Number.isInteger(maxChanged)||maxChanged<1||maxChanged>300)throw Object.assign(new Error("R21_MAX_CHANGED_INVALID"),{code:"R21_MAX_CHANGED_INVALID"});
  const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");const documentsRoot=path.join(root,"documents");const checkpoint=readJson(path.join(root,"checkpoint.json"));
  const reports=path.join(base,"manual-input","e1-r5","reports");const r17Report=readJson(path.join(reports,"e1-r5-r17-sec-guidance-last.json"));
  if(!checkpoint?.completed||typeof checkpoint.completed!=="object")throw Object.assign(new Error("R21_CHECKPOINT_MISSING"),{code:"R21_CHECKPOINT_MISSING"});
  if(!r17Report)throw Object.assign(new Error("R21_R17_REPORT_MISSING"),{code:"R21_R17_REPORT_MISSING"});
  ensureDir(reports);
  const r17Counts=emptyDirectionCounts(),r21Counts=emptyDirectionCounts(),transitions={};const rows=[];let hashMatched=0,missingDocuments=0,hashMismatch=0;
  const entries=Object.values(checkpoint.completed).sort((a,b)=>clean(a?.accessionNumber).localeCompare(clean(b?.accessionNumber)));
  for(const item of entries){
    const r17Direction=normalizedDirection(item?.direction);r17Counts[r17Direction]++;
    const located=locateSourceByHash(documentsRoot,item);if(located.status==="MISSING"){missingDocuments++;continue;}if(located.status==="HASH_MISMATCH"){hashMismatch++;continue;}hashMatched++;
    const candidate=classifyR21GuidanceCandidateFromHtml(located.bytes.toString("utf8"));const r21Direction=candidateDirection(candidate);r21Counts[r21Direction]++;
    const transition=`${r17Direction}->${r21Direction}`;transitions[transition]=(transitions[transition]??0)+1;
    rows.push({cik:clean(item?.cik),accessionNumber:clean(item?.accessionNumber),filed:clean(item?.filed),sourceRole:clean(item?.sourceRole)||"OTHER",r17Direction,r21Direction,r21Eligible:candidate.eligibleForBreadth===true,changed:r17Direction!==r21Direction,r21SignalCounts:candidate.counts,r21MetricCounts:candidate.metricCounts,evidence:candidate.signals.map(signal=>({direction:signal.direction,metrics:signal.metrics,context:signal.context}))});
  }
  const checkpointEntries=entries.length;const r17Complete=r17Report.status==="COMPLETE"&&Number(r17Report.remainingIssuers)===0&&Number(r17Report.completedIssuers)===checkpointEntries;
  const structuralPass=r17Complete&&hashMatched===checkpointEntries&&missingDocuments===0&&hashMismatch===0;
  const r17Eligible=r17Counts.UP+r17Counts.FLAT+r17Counts.DOWN,r21Eligible=r21Counts.UP+r21Counts.FLAT+r21Counts.DOWN;
  const packetFile=path.join(reports,"e1-r5-r21-guidance-changed-packet.txt");fs.writeFileSync(packetFile,formatPacket(rows,maxChanged),"utf8");
  const jsonFile=path.join(reports,"e1-r5-r21-guidance-candidate-compare-last.json");const textFile=path.join(reports,"e1-r5-r21-guidance-candidate-compare-last.txt");
  const report={version:"E1-R5-R21-GUIDANCE-CANDIDATE-COMPARE-R1",policyVersion:E1_R5_R21_GUIDANCE_CANDIDATE_POLICY.version,status:structuralPass?"COMPLETE":"FAILED",at:new Date().toISOString(),r17Status:r17Report.status??"UNKNOWN",r17Complete,checkpointEntries,hashMatched,missingDocuments,hashMismatch,r17DirectionCounts:r17Counts,r21DirectionCounts:r21Counts,r17Eligible,r21Eligible,r17EligibleCoverage:coverage(r17Counts,checkpointEntries),r21EligibleCoverage:coverage(r21Counts,checkpointEntries),r17NetBreadth:breadth(r17Counts),r21NetBreadth:breadth(r21Counts),changedEntries:rows.filter(row=>row.changed).length,transitions,semanticValidation:"REVIEW_REQUIRED",networkCalls:0,dbWrites:0,productionActivation:false,formulaChanged:false,scoringGateChanged:false,rawTextPublication:false,packetFile,errorCode:structuralPass?null:"R21_STRUCTURAL_AUDIT_FAILED",rows:rows.map(({evidence,...row})=>row)};
  writeJsonAtomic(jsonFile,report);fs.writeFileSync(textFile,formatText(report),"utf8");return {report,jsonFile,textFile,packetFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();const maxChanged=Number(cli["max-changed"]??120);
  try{const result=compareEarningsR5R21GuidanceCandidate({base:cli.base?path.resolve(cli.base):undefined,maxChanged:Number.isInteger(maxChanged)?maxChanged:120});console.log(JSON.stringify({status:result.report.status,textReport:result.textFile,jsonReport:result.jsonFile,packetFile:result.packetFile,changedEntries:result.report.changedEntries,r21Eligible:result.report.r21Eligible,r21NetBreadth:result.report.r21NetBreadth,networkCalls:0,dbWrites:0,productionActivation:false,formulaChanged:false,semanticValidation:"REVIEW_REQUIRED"}));if(result.report.status!=="COMPLETE")process.exitCode=1;}catch(error){console.log(JSON.stringify({status:"FAILED",code:String(error?.code??"R21_FAILED")}));process.exitCode=1;}
}
