import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const E1_R5_SEC_CORPUS_TOPOLOGY_AUDIT_VERSION="E1-R5-SEC-CORPUS-TOPOLOGY-AUDIT-R1";

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const text=value=>typeof value==="string"?value.trim():"";
const accessionKey=value=>text(value).replaceAll("-","");

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
function directories(dir){
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir,{withFileTypes:true})
    .filter(entry=>entry.isDirectory())
    .map(entry=>entry.name)
    .sort();
}
function countBy(values){
  const out=new Map();
  for(const value of values)out.set(value,(out.get(value)??0)+1);
  return out;
}
function maxCount(map){
  let max=0;
  for(const value of map.values())if(value>max)max=value;
  return max;
}
function multiCount(map){
  let count=0;
  for(const value of map.values())if(value>1)count++;
  return count;
}

export function auditSecCorpusTopology({checkpoint,documentsRoot}={}){
  if(!checkpoint?.completed||typeof checkpoint.completed!=="object"){
    throw Object.assign(new Error("SEC_GUIDANCE_CHECKPOINT_INVALID"),{code:"SEC_GUIDANCE_CHECKPOINT_INVALID"});
  }
  if(!documentsRoot||!fs.existsSync(documentsRoot)){
    throw Object.assign(new Error("SEC_GUIDANCE_DOCUMENT_ROOT_MISSING"),{code:"SEC_GUIDANCE_DOCUMENT_ROOT_MISSING"});
  }

  const entries=Object.values(checkpoint.completed);
  const checkpointCiks=entries.map(row=>text(row?.cik)).filter(Boolean);
  const checkpointCounts=countBy(checkpointCiks);
  const referenced=new Set(entries
    .map(row=>`${text(row?.cik)}|${accessionKey(row?.accessionNumber)}`)
    .filter(key=>!key.startsWith("|")&&!key.endsWith("|")));

  const physical=[];
  const physicalCounts=new Map();
  for(const cik of directories(documentsRoot)){
    const accessionDirs=directories(path.join(documentsRoot,cik));
    physicalCounts.set(cik,accessionDirs.length);
    for(const accession of accessionDirs)physical.push({cik,accession,key:`${cik}|${accession}`});
  }

  const physicalSet=new Set(physical.map(row=>row.key));
  const unreferenced=physical.filter(row=>!referenced.has(row.key));
  const missingCheckpointDirectories=[...referenced].filter(key=>!physicalSet.has(key));
  const ciksWithMultiplePhysicalAccessions=[...physicalCounts.entries()]
    .filter(([,count])=>count>1)
    .map(([cik,count])=>({cik,count}))
    .sort((a,b)=>b.count-a.count||a.cik.localeCompare(b.cik));

  const decision=ciksWithMultiplePhysicalAccessions.length
    ?"LOCAL_MULTI_ACCESSION_CORPUS_PRESENT"
    :"HISTORICAL_BACKFILL_REQUIRED";

  return {
    version:E1_R5_SEC_CORPUS_TOPOLOGY_AUDIT_VERSION,
    status:"PASS",
    corpusVersion:text(checkpoint?.version)||null,
    checkpoint:{
      entryCount:entries.length,
      uniqueCiks:checkpointCounts.size,
      ciksWithMultipleEntries:multiCount(checkpointCounts),
      maxEntriesPerCik:maxCount(checkpointCounts),
    },
    documentTree:{
      uniqueCiks:physicalCounts.size,
      accessionDirectoryCount:physical.length,
      ciksWithMultipleAccessions:ciksWithMultiplePhysicalAccessions.length,
      maxAccessionsPerCik:maxCount(physicalCounts),
    },
    referencedAccessions:referenced.size,
    unreferencedAccessionCount:unreferenced.length,
    missingCheckpointDirectoryCount:missingCheckpointDirectories.length,
    ciksWithMultiplePhysicalAccessions,
    unreferencedAccessions:unreferenced,
    missingCheckpointDirectories,
    decision,
    note:"TOPOLOGY_ONLY_NOT_S12A_SCORE_NOT_COMPARABILITY_PROOF",
    networkCalls:0,
    dbWrites:0,
    productionActivation:false,
    formulaChanged:false,
    weightChanged:false,
  };
}

function formatText(report){
  return [
    `E1-R5 SEC CORPUS TOPOLOGY AUDIT: ${report.status}`,
    `VERSION: ${report.version}`,
    `CORPUS_VERSION: ${report.corpusVersion??"-"}`,
    `CHECKPOINT: entries=${report.checkpoint.entryCount} uniqueCiks=${report.checkpoint.uniqueCiks} multiEntryCiks=${report.checkpoint.ciksWithMultipleEntries} maxEntriesPerCik=${report.checkpoint.maxEntriesPerCik}`,
    `DOCUMENT_TREE: ciks=${report.documentTree.uniqueCiks} accessions=${report.documentTree.accessionDirectoryCount} multiAccessionCiks=${report.documentTree.ciksWithMultipleAccessions} maxAccessionsPerCik=${report.documentTree.maxAccessionsPerCik}`,
    `REFERENCED_ACCESSIONS: ${report.referencedAccessions}`,
    `UNREFERENCED_ACCESSIONS: ${report.unreferencedAccessionCount}`,
    `MISSING_CHECKPOINT_DIRS: ${report.missingCheckpointDirectoryCount}`,
    `DECISION: ${report.decision}`,
    `NOTE: ${report.note}`,
    `NETWORK_CALLS: 0`,
    `DB_WRITES: 0`,
    `PRODUCTION_ACTIVATION: NO`,
    `FORMULA_CHANGED: NO`,
    `WEIGHT_CHANGED: NO`,
  ].join("\r\n")+"\r\n";
}

export function runSecCorpusTopologyAudit({base=DEFAULT_BASE,checkpointFile,documentsRoot,reportsDir}={}){
  const root=path.join(base,"manual-input","e1-r5","sec-guidance-r17");
  const checkpointPath=checkpointFile??path.join(root,"checkpoint.json");
  const documentsPath=documentsRoot??path.join(root,"documents");
  const reports=reportsDir??path.join(base,"manual-input","e1-r5","reports");
  if(!fs.existsSync(checkpointPath))throw Object.assign(new Error("SEC_GUIDANCE_CHECKPOINT_MISSING"),{code:"SEC_GUIDANCE_CHECKPOINT_MISSING"});
  const report=auditSecCorpusTopology({checkpoint:readJson(checkpointPath),documentsRoot:documentsPath});
  ensureDir(reports);
  const jsonReport=path.join(reports,"e1-r5-sec-corpus-topology-last.json");
  const textReport=path.join(reports,"e1-r5-sec-corpus-topology-last.txt");
  writeJsonAtomic(jsonReport,report);
  fs.writeFileSync(textReport,formatText(report),"utf8");
  return {report,jsonReport,textReport};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();
  try{
    const result=runSecCorpusTopologyAudit({
      base:cli.base?path.resolve(cli.base):undefined,
      checkpointFile:cli.checkpoint?path.resolve(cli.checkpoint):undefined,
      documentsRoot:cli.documents?path.resolve(cli.documents):undefined,
      reportsDir:cli["reports-dir"]?path.resolve(cli["reports-dir"]):undefined,
    });
    console.log(JSON.stringify({
      status:result.report.status,
      decision:result.report.decision,
      checkpointEntries:result.report.checkpoint.entryCount,
      checkpointUniqueCiks:result.report.checkpoint.uniqueCiks,
      documentAccessions:result.report.documentTree.accessionDirectoryCount,
      multiAccessionCiks:result.report.documentTree.ciksWithMultipleAccessions,
      unreferencedAccessions:result.report.unreferencedAccessionCount,
      missingCheckpointDirs:result.report.missingCheckpointDirectoryCount,
      textReport:result.textReport,
      jsonReport:result.jsonReport,
      networkCalls:0,
      dbWrites:0,
      productionActivation:false,
    }));
  }catch(error){
    const code=String(error?.code??error?.message??"SEC_TOPOLOGY_AUDIT_FAILED").replace(/[^A-Z0-9_:-]/gi,"_");
    console.log(JSON.stringify({status:"FAILED",code,networkCalls:0,dbWrites:0,productionActivation:false}));
    process.exitCode=1;
  }
}
