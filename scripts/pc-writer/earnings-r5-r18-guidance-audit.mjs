import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {classifyGuidanceDirectionFromHtml,htmlToVisibleText} from "../../lib/market-score/earnings-e1-r5-guidance-r17.mjs";

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");

function parseArgs(argv=process.argv.slice(2)){
  const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;
}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});}
function writeJsonAtomic(file,value){ensureDir(path.dirname(file));const part=`${file}.part`;fs.writeFileSync(part,JSON.stringify(value,null,2)+"\n","utf8");fs.renameSync(part,file);}
function sha256(bytes){return createHash("sha256").update(bytes).digest("hex");}
function accessionKey(value){return String(value??"").replaceAll("-","");}
function clean(value){return String(value??"").trim();}
function stableRank(value){return createHash("sha256").update(String(value??"")).digest("hex");}
function safeRelative(root,file){return path.relative(root,file).split(path.sep).join("/");}

function sourceDirectory(documentsRoot,item){
  return path.join(documentsRoot,clean(item?.cik),accessionKey(item?.accessionNumber));
}
function locateSourceByHash(documentsRoot,item){
  const expected=clean(item?.sourceSha256).toLowerCase();
  const directory=sourceDirectory(documentsRoot,item);
  if(!expected||!fs.existsSync(directory))return {status:"MISSING",file:null,bytes:null};
  let files=[];
  try{files=fs.readdirSync(directory,{withFileTypes:true}).filter(entry=>entry.isFile()&&!entry.name.endsWith(".part")).map(entry=>path.join(directory,entry.name)).sort();}catch{return {status:"MISSING",file:null,bytes:null};}
  if(files.length===0)return {status:"MISSING",file:null,bytes:null};
  for(const file of files){
    let bytes;try{bytes=fs.readFileSync(file);}catch{continue;}
    if(sha256(bytes)===expected)return {status:"MATCH",file,bytes};
  }
  return {status:"HASH_MISMATCH",file:null,bytes:null};
}
function expectedDirection(item){return clean(item?.direction)||"UNCLASSIFIED";}
function actualDirection(classification){return clean(classification?.direction)||"UNCLASSIFIED";}
function hasGuidanceAnchor(text){return /\b(?:guidance|outlook|forecast)\b/i.test(String(text??""));}
function bucketFor(direction,{unclassifiedAnchorPresent=false}={}){
  if(direction!=="UNCLASSIFIED")return direction;
  return unclassifiedAnchorPresent?"UNCLASSIFIED_ANCHOR_PRESENT":"UNCLASSIFIED_NO_ANCHOR";
}
function pickSamples(rows,samplePerBucket){
  const grouped=new Map();
  for(const row of rows){if(!grouped.has(row.bucket))grouped.set(row.bucket,[]);grouped.get(row.bucket).push(row);}
  const out={};
  for(const [bucket,items] of grouped){
    items.sort((a,b)=>stableRank(`${bucket}|${a.accessionNumber}`).localeCompare(stableRank(`${bucket}|${b.accessionNumber}`)));
    out[bucket]=items.slice(0,samplePerBucket).map(item=>({
      cik:item.cik,
      accessionNumber:item.accessionNumber,
      filed:item.filed,
      direction:item.direction,
      sourceRole:item.sourceRole,
      documentRelativePath:item.documentRelativePath,
      sourceSha256:item.sourceSha256,
    }));
  }
  return out;
}
function formatText(report){
  const c=report.directionCounts;
  return [
    `E1-R5 R18 LOCAL GUIDANCE AUDIT: ${report.status}`,
    `AT: ${report.at}`,
    `R17_STATUS: ${report.r17Status}`,
    `CHECKPOINT_ENTRIES: ${report.checkpointEntries}`,
    `DOCUMENT_INTEGRITY: matched=${report.hashMatched} missing=${report.missingDocuments} hashMismatch=${report.hashMismatch}`,
    `RECLASSIFICATION: matched=${report.reclassificationMatched} mismatch=${report.reclassificationMismatch}`,
    `DIRECTION: UP=${c.UP} FLAT=${c.FLAT} DOWN=${c.DOWN} WITHDRAW=${c.WITHDRAW} MIXED=${c.MIXED} UNCLASSIFIED=${c.UNCLASSIFIED}`,
    `UNCLASSIFIED_REVIEW: anchorPresent=${report.unclassifiedAnchorPresent} noAnchor=${report.unclassifiedNoAnchor}`,
    `ELIGIBLE: ${report.eligibleDirections}/${report.checkpointEntries} (${report.eligibleCoverage})`,
    `SOURCE_ROLE: PRIMARY=${report.sourceRoleCounts.PRIMARY} EXHIBIT=${report.sourceRoleCounts.EXHIBIT} OTHER=${report.sourceRoleCounts.OTHER}`,
    `SEMANTIC_VALIDATION: ${report.semanticValidation}`,
    `NETWORK_CALLS: 0`,
    `DB_WRITES: 0`,
    `PRODUCTION_ACTIVATION: NO`,
    `RAW_TEXT_PUBLICATION: NO`,
    report.errorCode?`ERROR: ${report.errorCode}`:null,
  ].filter(Boolean).join("\r\n")+"\r\n";
}

export function auditEarningsR5R18Guidance({base=DEFAULT_BASE,samplePerBucket=8}={}){
  if(!Number.isInteger(samplePerBucket)||samplePerBucket<1||samplePerBucket>50)throw Object.assign(new Error("R18_SAMPLE_SIZE_INVALID"),{code:"R18_SAMPLE_SIZE_INVALID"});
  const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");
  const documentsRoot=path.join(root,"documents");
  const checkpointFile=path.join(root,"checkpoint.json");
  const reportsDir=path.join(base,"manual-input","e1-r5","reports");
  const r17ReportFile=path.join(reportsDir,"e1-r5-r17-sec-guidance-last.json");
  const jsonReport=path.join(reportsDir,"e1-r5-r18-guidance-audit-last.json");
  const textReport=path.join(reportsDir,"e1-r5-r18-guidance-audit-last.txt");
  const reviewManifest=path.join(reportsDir,"e1-r5-r18-guidance-review-manifest.json");
  const checkpoint=readJson(checkpointFile);
  const r17Report=readJson(r17ReportFile);
  if(!checkpoint?.completed||typeof checkpoint.completed!=="object")throw Object.assign(new Error("R18_CHECKPOINT_MISSING"),{code:"R18_CHECKPOINT_MISSING"});
  if(!r17Report)throw Object.assign(new Error("R18_R17_REPORT_MISSING"),{code:"R18_R17_REPORT_MISSING"});

  const entries=Object.values(checkpoint.completed).sort((a,b)=>clean(a?.accessionNumber).localeCompare(clean(b?.accessionNumber)));
  const directionCounts={UP:0,FLAT:0,DOWN:0,WITHDRAW:0,MIXED:0,UNCLASSIFIED:0};
  const sourceRoleCounts={PRIMARY:0,EXHIBIT:0,OTHER:0};
  const reviewRows=[];
  let hashMatched=0,missingDocuments=0,hashMismatch=0,reclassificationMatched=0,reclassificationMismatch=0,eligibleDirections=0,unclassifiedAnchorPresent=0,unclassifiedNoAnchor=0;

  for(const item of entries){
    const direction=expectedDirection(item);
    if(direction in directionCounts)directionCounts[direction]++;else directionCounts.UNCLASSIFIED++;
    const role=clean(item?.sourceRole);if(role==="PRIMARY"||role==="EXHIBIT")sourceRoleCounts[role]++;else sourceRoleCounts.OTHER++;
    if(item?.eligibleForBreadth===true)eligibleDirections++;

    const located=locateSourceByHash(documentsRoot,item);
    if(located.status==="MISSING"){missingDocuments++;continue;}
    if(located.status==="HASH_MISMATCH"){hashMismatch++;continue;}
    hashMatched++;
    const html=located.bytes.toString("utf8");
    const classification=classifyGuidanceDirectionFromHtml(html);
    const actual=actualDirection(classification);
    const statusMatch=clean(classification.status)===clean(item?.classificationStatus);
    const eligibleMatch=(classification.eligibleForBreadth===true)===(item?.eligibleForBreadth===true);
    const directionMatch=actual===direction;
    if(statusMatch&&eligibleMatch&&directionMatch)reclassificationMatched++;else reclassificationMismatch++;

    let anchorPresent=false;
    if(direction==="UNCLASSIFIED"){
      anchorPresent=hasGuidanceAnchor(htmlToVisibleText(html));
      if(anchorPresent)unclassifiedAnchorPresent++;else unclassifiedNoAnchor++;
    }
    reviewRows.push({
      bucket:bucketFor(direction,{unclassifiedAnchorPresent:anchorPresent}),
      cik:clean(item?.cik),accessionNumber:clean(item?.accessionNumber),filed:clean(item?.filed),direction,sourceRole:role||"OTHER",
      documentRelativePath:safeRelative(documentsRoot,located.file),sourceSha256:clean(item?.sourceSha256),
    });
  }

  const r17Complete=r17Report.status==="COMPLETE"&&Number(r17Report.remainingIssuers)===0&&Number(r17Report.completedIssuers)===Number(r17Report.candidateIssuers);
  const countConsistent=Number(r17Report.completedIssuers)===entries.length;
  const structuralPass=r17Complete&&countConsistent&&missingDocuments===0&&hashMismatch===0&&reclassificationMismatch===0&&hashMatched===entries.length;
  const samples=pickSamples(reviewRows,samplePerBucket);
  ensureDir(reportsDir);writeJsonAtomic(reviewManifest,{version:"E1-R5-R18-GUIDANCE-AUDIT-R1",at:new Date().toISOString(),samplePerBucket,rawTextIncluded:false,buckets:samples});
  const report={
    version:"E1-R5-R18-GUIDANCE-AUDIT-R1",status:structuralPass?"COMPLETE":"FAILED",at:new Date().toISOString(),r17Status:r17Report.status??"UNKNOWN",r17Complete,countConsistent,
    checkpointEntries:entries.length,hashMatched,missingDocuments,hashMismatch,reclassificationMatched,reclassificationMismatch,directionCounts,eligibleDirections,
    eligibleCoverage:entries.length?(eligibleDirections/entries.length):null,unclassifiedAnchorPresent,unclassifiedNoAnchor,sourceRoleCounts,
    semanticValidation:"REVIEW_REQUIRED",reviewManifest,rawTextIncluded:false,networkCalls:0,dbWrites:0,productionActivation:false,rawTextPublication:false,
    errorCode:structuralPass?null:"R18_STRUCTURAL_AUDIT_FAILED",
  };
  writeJsonAtomic(jsonReport,report);fs.writeFileSync(textReport,formatText(report),"utf8");
  return {report,jsonReport,textReport,reviewManifest};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();const samplePerBucket=Number(cli["sample-per-bucket"]??8);
  try{
    const result=auditEarningsR5R18Guidance({base:cli.base?path.resolve(cli.base):undefined,samplePerBucket:Number.isInteger(samplePerBucket)?samplePerBucket:8});
    console.log(JSON.stringify({status:result.report.status,textReport:result.textReport,jsonReport:result.jsonReport,reviewManifest:result.reviewManifest,networkCalls:0,dbWrites:0,productionActivation:false,semanticValidation:result.report.semanticValidation}));
    if(result.report.status!=="COMPLETE")process.exitCode=1;
  }catch(error){console.log(JSON.stringify({status:"FAILED",code:String(error?.code??"R18_FAILED")}));process.exitCode=1;}
}
