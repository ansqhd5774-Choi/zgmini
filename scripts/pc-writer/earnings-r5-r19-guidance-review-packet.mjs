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
function sha256(bytes){return createHash("sha256").update(bytes).digest("hex");}
function ensureDir(dir){fs.mkdirSync(dir,{recursive:true});}
function normalizeText(value){return String(value??"").replace(/\s+/g," ").trim();}
const anchor=/\b(?:guidance|outlook|forecast|raise(?:d|s|ing)?|increase(?:d|s|ing)?|boost(?:ed|s|ing)?|lift(?:ed|s|ing)?|upgrade(?:d|s|ing)?|lower(?:ed|s|ing)?|reduce(?:d|s|ing)?|cut(?:s|ting)?|decrease(?:d|s|ing)?|downgrade(?:d|s|ing)?|reaffirm(?:ed|s|ing)?|reiterate(?:d|s|ing)?|maintain(?:ed|s|ing)?|withdraw(?:n|s|ing)?|suspend(?:ed|s|ing)?|revenue|sales|earnings|eps|margin|full[- ]year|fiscal year|expects?|anticipates?|projects?)\b/ig;
function contextSnippets(text,{radius=320,maxSnippets=2}={}){
  const normalized=normalizeText(text);if(!normalized)return [];
  const matches=[...normalized.matchAll(anchor)];const starts=[];
  for(const match of matches){const index=match.index??0;if(starts.every(existing=>Math.abs(existing-index)>radius))starts.push(index);if(starts.length>=maxSnippets)break;}
  if(starts.length===0)starts.push(0);
  return starts.map(index=>{
    const start=Math.max(0,index-radius);const end=Math.min(normalized.length,index+radius);
    return `${start>0?"…":""}${normalized.slice(start,end)}${end<normalized.length?"…":""}`;
  });
}
function resolveSampleFile(documentsRoot,sample){
  const relative=clean(sample?.documentRelativePath);if(!relative||relative.includes("..")||path.isAbsolute(relative))return null;
  const file=path.resolve(documentsRoot,relative);const root=path.resolve(documentsRoot)+path.sep;if(!file.startsWith(root))return null;return file;
}
function formatPacket(rows){
  const lines=[
    "ZGMINI E1-R5 R19 LOCAL GUIDANCE SEMANTIC REVIEW PACKET",
    `AT: ${new Date().toISOString()}`,
    "PURPOSE: human/LLM semantic review of deterministic R18 samples",
    "NETWORK_CALLS: 0",
    "DB_WRITES: 0",
    "PRODUCTION_ACTIVATION: NO",
    "RAW_TEXT_PUBLICATION: NO",
    "LOCAL_EXCERPTS_INCLUDED: YES",
    "NOTE: excerpts are local review material only; they do not change S13 classification or formula.",
    "",
  ];
  for(const row of rows){
    lines.push(`=== SAMPLE ${row.index} ===`);
    lines.push(`BUCKET: ${row.bucket}`);
    lines.push(`CIK: ${row.cik}`);
    lines.push(`ACCESSION: ${row.accessionNumber}`);
    lines.push(`FILED: ${row.filed}`);
    lines.push(`R17_DIRECTION: ${row.direction}`);
    lines.push(`SOURCE_ROLE: ${row.sourceRole}`);
    lines.push(`HASH_VERIFIED: ${row.hashVerified?"YES":"NO"}`);
    if(row.error){lines.push(`ERROR: ${row.error}`);}else row.snippets.forEach((snippet,i)=>lines.push(`EXCERPT_${i+1}: ${snippet}`));
    lines.push("");
  }
  return lines.join("\r\n")+"\r\n";
}

export function buildR19GuidanceReviewPacket({base=DEFAULT_BASE,maxSamples=80}={}){
  if(!Number.isInteger(maxSamples)||maxSamples<1||maxSamples>200)throw Object.assign(new Error("R19_MAX_SAMPLES_INVALID"),{code:"R19_MAX_SAMPLES_INVALID"});
  const reports=path.join(base,"manual-input","e1-r5","reports");const documentsRoot=path.join(base,"manual-input","e1-r5","sec-guidance-r17","documents");
  const manifestFile=path.join(reports,"e1-r5-r18-guidance-review-manifest.json");const manifest=readJson(manifestFile);if(!manifest?.buckets||typeof manifest.buckets!=="object")throw Object.assign(new Error("R19_R18_MANIFEST_MISSING"),{code:"R19_R18_MANIFEST_MISSING"});
  const rows=[];let index=0,hashVerified=0,errors=0;
  for(const bucket of Object.keys(manifest.buckets).sort()){
    for(const sample of manifest.buckets[bucket]??[]){
      if(rows.length>=maxSamples)break;
      index++;const file=resolveSampleFile(documentsRoot,sample);const row={index,bucket,cik:clean(sample?.cik),accessionNumber:clean(sample?.accessionNumber),filed:clean(sample?.filed),direction:clean(sample?.direction)||"UNCLASSIFIED",sourceRole:clean(sample?.sourceRole)||"OTHER",hashVerified:false,snippets:[]};
      if(!file||!fs.existsSync(file)){row.error="R19_SAMPLE_DOCUMENT_MISSING";errors++;rows.push(row);continue;}
      const bytes=fs.readFileSync(file);if(sha256(bytes)!==clean(sample?.sourceSha256).toLowerCase()){row.error="R19_SAMPLE_HASH_MISMATCH";errors++;rows.push(row);continue;}
      row.hashVerified=true;hashVerified++;row.snippets=contextSnippets(htmlToVisibleText(bytes.toString("utf8")));rows.push(row);
    }
    if(rows.length>=maxSamples)break;
  }
  ensureDir(reports);const packetFile=path.join(reports,"e1-r5-r19-guidance-review-packet.txt");fs.writeFileSync(packetFile,formatPacket(rows),"utf8");
  const reportFile=path.join(reports,"e1-r5-r19-guidance-review-last.txt");const status=errors===0&&rows.length>0?"COMPLETE":"FAILED";
  fs.writeFileSync(reportFile,[`E1-R5 R19 LOCAL GUIDANCE REVIEW PACKET: ${status}`,`SAMPLES: ${rows.length}`,`HASH_VERIFIED: ${hashVerified}`,`ERRORS: ${errors}`,`SEMANTIC_VALIDATION: REVIEW_REQUIRED`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`,`PRODUCTION_ACTIVATION: NO`,`RAW_TEXT_PUBLICATION: NO`,`PACKET: ${packetFile}`].join("\r\n")+"\r\n","utf8");
  return {status,rows,packetFile,reportFile,hashVerified,errors};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();const maxSamples=Number(cli["max-samples"]??80);
  try{const result=buildR19GuidanceReviewPacket({base:cli.base?path.resolve(cli.base):undefined,maxSamples:Number.isInteger(maxSamples)?maxSamples:80});console.log(JSON.stringify({status:result.status,samples:result.rows.length,hashVerified:result.hashVerified,errors:result.errors,packetFile:result.packetFile,reportFile:result.reportFile,networkCalls:0,dbWrites:0,productionActivation:false,semanticValidation:"REVIEW_REQUIRED"}));if(result.status!=="COMPLETE")process.exitCode=1;}catch(error){console.log(JSON.stringify({status:"FAILED",code:String(error?.code??"R19_FAILED")}));process.exitCode=1;}
}
