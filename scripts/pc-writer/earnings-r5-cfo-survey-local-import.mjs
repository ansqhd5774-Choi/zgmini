import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {buildCfoSurveyPITRecord} from "../../lib/market-score/earnings-e1-r5-cfo-survey-r1.mjs";

export const E1_R5_CFO_LOCAL_IMPORT_VERSION="E1-R5-CFO-LOCAL-IMPORT-R1";

export const E1_R5_CFO_LOCAL_IMPORT_CONTRACT=Object.freeze({
  mode:"LOCAL_MANUAL_SOURCE_IMPORT_ONLY",
  source:"THE_CFO_SURVEY_RICHMOND_FED_ATLANTA_FED_DUKE",
  allowedHost:"www.richmondfed.org",
  networkCalls:0,
  dbWrites:0,
  productionActivation:false,
  formulaChanged:false,
  weightChanged:false,
  overwriteHistoricalPIT:false,
});

const DEFAULT_BASE=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const text=value=>typeof value==="string"?value.trim():"";
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const sha256=bytes=>createHash("sha256").update(bytes).digest("hex");

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

function decodeHtml(value){
  const entities={
    "&nbsp;":" ","&#160;":" ","&amp;":"&","&quot;":"\"","&#34;":"\"",
    "&apos;":"'","&#39;":"'","&lt;":"<","&gt;":">","&ndash;":"–","&mdash;":"—",
  };
  let out=String(value??"");
  for(const [entity,replacement] of Object.entries(entities))out=out.split(entity).join(replacement);
  out=out.replace(/&#(\d+);/g,(_,code)=>{
    const n=Number(code);
    return Number.isInteger(n)&&n>=0&&n<=0x10ffff?String.fromCodePoint(n):" ";
  });
  return out;
}

function cellText(value){
  return decodeHtml(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
    .replace(/<br\s*\/?\s*>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function htmlTableRows(value){
  const html=String(value??"");
  const rows=[];
  for(const tr of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const cells=[];
    for(const cell of tr[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)){
      const normalized=cellText(cell[1]);
      if(normalized)cells.push(normalized);
      else cells.push("");
    }
    if(cells.length)rows.push(cells);
  }
  return rows;
}

function percentMean(cell){
  const match=text(cell).match(/(-?\d+(?:\.\d+)?)\s*%/);
  if(!match)return null;
  const value=Number(match[1]);
  return finite(value)?value:null;
}

function yearTokens(cells){
  const out=[];
  for(const cell of cells){
    for(const match of text(cell).matchAll(/\b(20\d{2})\b/g))out.push(Number(match[1]));
  }
  return out;
}

function normalizedPageText(value){
  return cellText(String(value??"")
    .replace(/<\/(?:p|div|tr|li|h[1-6])\s*>/gi,"\n")
    .replace(/<\/(?:td|th)\s*>/gi," | "));
}

function validateOfficialSourceUrl(value){
  let parsed;
  try{parsed=new URL(text(value));}catch{return {status:"MISSING",reason:"SOURCE_URL_INVALID",url:null};}
  const host=parsed.hostname.toLowerCase();
  if(host!=="www.richmondfed.org"&&host!=="richmondfed.org")return {status:"MISSING",reason:"SOURCE_HOST_NOT_ALLOWED",url:null};
  if(parsed.protocol!=="https:")return {status:"MISSING",reason:"SOURCE_URL_NOT_HTTPS",url:null};
  if(!parsed.pathname.includes("/research/national_economy/cfo_survey/data_and_results/")){
    return {status:"MISSING",reason:"SOURCE_PATH_NOT_ALLOWED",url:null};
  }
  parsed.hash="";
  return {status:"READY",reason:null,url:parsed.toString()};
}

export function parseRichmondFedCfoRevenueRelease(value,{surveyYear,surveyQuarter}={}){
  if(!Number.isInteger(surveyYear)||surveyYear<2000||surveyYear>2100)return {status:"MISSING",reason:"SURVEY_YEAR_INVALID"};
  if(!Number.isInteger(surveyQuarter)||surveyQuarter<1||surveyQuarter>4)return {status:"MISSING",reason:"SURVEY_QUARTER_INVALID"};
  const rows=htmlTableRows(value);
  const pageText=normalizedPageText(value);
  const quarterPattern=new RegExp(`\\bQ${surveyQuarter}\\s+${surveyYear}\\b`,"i");
  if(!quarterPattern.test(pageText))return {status:"MISSING",reason:"RESPONSE_QUARTER_NOT_FOUND"};

  const candidates=rows.filter(cells=>/^revenue\b/i.test(text(cells[0])));
  if(candidates.length!==1)return {status:"MISSING",reason:candidates.length?"REVENUE_ROW_AMBIGUOUS":"REVENUE_ROW_NOT_FOUND"};
  const revenue=candidates[0];
  if(revenue.length<3)return {status:"MISSING",reason:"REVENUE_ROW_TOO_SHORT"};

  const index=rows.indexOf(revenue);
  const nearby=rows.slice(Math.max(0,index-8),index);
  const yearRows=nearby.map(yearTokens).filter(tokens=>tokens.length>=2);
  const matchingYears=yearRows.find(tokens=>tokens[0]===surveyYear&&tokens[1]===surveyYear+1)??null;
  if(!matchingYears)return {status:"MISSING",reason:"TARGET_YEAR_HEADER_NOT_FOUND"};

  const currentYearGrowth=percentMean(revenue[1]);
  const nextYearGrowth=percentMean(revenue[2]);
  if(!finite(currentYearGrowth))return {status:"MISSING",reason:"CURRENT_YEAR_REVENUE_GROWTH_MISSING"};
  if(!finite(nextYearGrowth))return {status:"MISSING",reason:"NEXT_YEAR_REVENUE_GROWTH_MISSING"};

  return {
    status:"READY",
    reason:null,
    surveyYear,
    surveyQuarter,
    currentTargetYear:surveyYear,
    nextTargetYear:surveyYear+1,
    currentYearGrowth,
    nextYearGrowth,
    parserEvidence:{
      responseQuarter:`Q${surveyQuarter} ${surveyYear}`,
      targetYears:[surveyYear,surveyYear+1],
      revenueCells:revenue.length-1,
      statistic:"FIRST_PERCENT_IN_CELL_AS_PUBLISHED_MEAN",
    },
  };
}

function periodOrdinal(row){return Number(row?.surveyYear)*4+(Number(row?.surveyQuarter)-1);}
function releaseIdentity(row){return `${row?.surveyYear}Q${row?.surveyQuarter}|${text(row?.sourceHash).toLowerCase()}`;}

export function mergeCfoSurveyReleaseDocument(existing,record){
  const releases=Array.isArray(existing?.releases)?existing.releases.slice():[];
  const identity=releaseIdentity(record);
  if(releases.some(row=>releaseIdentity(row)===identity)){
    return {
      status:"NOOP",
      changed:false,
      document:{
        version:E1_R5_CFO_LOCAL_IMPORT_VERSION,
        source:E1_R5_CFO_LOCAL_IMPORT_CONTRACT.source,
        releases,
      },
    };
  }
  releases.push(record);
  releases.sort((a,b)=>periodOrdinal(a)-periodOrdinal(b)||text(a?.releaseAt).localeCompare(text(b?.releaseAt))||text(a?.storedAt).localeCompare(text(b?.storedAt)));
  return {
    status:"STORED",
    changed:true,
    document:{
      version:E1_R5_CFO_LOCAL_IMPORT_VERSION,
      source:E1_R5_CFO_LOCAL_IMPORT_CONTRACT.source,
      releases,
    },
  };
}

function persistSourceEvidence(sourceDir,bytes,hash){
  ensureDir(sourceDir);
  const file=path.join(sourceDir,`${hash}.html`);
  if(fs.existsSync(file)){
    const existing=fs.readFileSync(file);
    if(sha256(existing)!==hash)throw Object.assign(new Error("SOURCE_EVIDENCE_HASH_CONFLICT"),{code:"SOURCE_EVIDENCE_HASH_CONFLICT"});
    return {status:"NOOP",file};
  }
  fs.writeFileSync(file,bytes);
  return {status:"STORED",file};
}

export function importCfoSurveyLocalSource({
  base=DEFAULT_BASE,
  sourceFile,
  sourceUrl,
  surveyYear,
  surveyQuarter,
  releaseAt,
  storedAt=new Date().toISOString(),
  revisionId=null,
}={}){
  if(!sourceFile||!fs.existsSync(sourceFile))throw Object.assign(new Error("CFO_SOURCE_FILE_MISSING"),{code:"CFO_SOURCE_FILE_MISSING"});
  const official=validateOfficialSourceUrl(sourceUrl);
  if(official.status!=="READY")throw Object.assign(new Error(official.reason),{code:official.reason});
  const releaseMs=Date.parse(text(releaseAt));
  const storedMs=Date.parse(text(storedAt));
  if(!Number.isFinite(releaseMs))throw Object.assign(new Error("RELEASE_AT_INVALID"),{code:"RELEASE_AT_INVALID"});
  if(!Number.isFinite(storedMs))throw Object.assign(new Error("STORED_AT_INVALID"),{code:"STORED_AT_INVALID"});
  if(storedMs<releaseMs)throw Object.assign(new Error("STORED_BEFORE_RELEASE"),{code:"STORED_BEFORE_RELEASE"});

  const bytes=fs.readFileSync(sourceFile);
  const hash=sha256(bytes);
  const parsed=parseRichmondFedCfoRevenueRelease(bytes.toString("utf8"),{surveyYear,surveyQuarter});
  if(parsed.status!=="READY")throw Object.assign(new Error(parsed.reason),{code:parsed.reason});

  const internalRevision=text(revisionId)||`LOCAL_SOURCE_${hash.slice(0,16)}`;
  const built=buildCfoSurveyPITRecord({
    surveyYear,
    surveyQuarter,
    releaseAt:new Date(releaseMs).toISOString(),
    storedAt:new Date(storedMs).toISOString(),
    currentTargetYear:parsed.currentTargetYear,
    nextTargetYear:parsed.nextTargetYear,
    currentYearGrowth:parsed.currentYearGrowth,
    nextYearGrowth:parsed.nextYearGrowth,
    sourceHash:hash,
    revisionId:internalRevision,
    sourceUrl:official.url,
  });
  if(built.status!=="READY")throw Object.assign(new Error(built.reason??"CFO_PIT_RECORD_INVALID"),{code:built.reason??"CFO_PIT_RECORD_INVALID"});

  const root=path.join(base,"manual-input","e1-r5","cfo-survey-r1");
  const sourceDir=path.join(root,"sources");
  const output=path.join(root,"releases.json");
  const existing=fs.existsSync(output)?readJson(output):{releases:[]};
  const merged=mergeCfoSurveyReleaseDocument(existing,built);
  const evidence=persistSourceEvidence(sourceDir,bytes,hash);
  if(merged.changed)writeJsonAtomic(output,merged.document);

  return {
    version:E1_R5_CFO_LOCAL_IMPORT_VERSION,
    status:merged.status,
    period:`${surveyYear}Q${surveyQuarter}`,
    sourceHash:hash,
    sourceEvidence:evidence.status,
    output,
    sourceEvidenceFile:evidence.file,
    record:built,
    parserEvidence:parsed.parserEvidence,
    networkCalls:0,
    dbWrites:0,
    productionActivation:false,
    formulaChanged:false,
    weightChanged:false,
  };
}

function safeErrorCode(error){
  const raw=String(error?.code??error?.message??"CFO_LOCAL_IMPORT_FAILED");
  return /^[A-Z0-9_:-]+$/.test(raw)?raw:"CFO_LOCAL_IMPORT_FAILED";
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const cli=parseArgs();
  try{
    const result=importCfoSurveyLocalSource({
      base:cli.base?path.resolve(cli.base):undefined,
      sourceFile:cli.file?path.resolve(cli.file):null,
      sourceUrl:cli["source-url"]??null,
      surveyYear:Number(cli["survey-year"]),
      surveyQuarter:Number(cli["survey-quarter"]),
      releaseAt:cli["release-at"]??null,
      storedAt:cli["stored-at"]??undefined,
      revisionId:cli["revision-id"]??null,
    });
    console.log(JSON.stringify({
      status:result.status,
      period:result.period,
      output:result.output,
      sourceEvidenceFile:result.sourceEvidenceFile,
      networkCalls:result.networkCalls,
      dbWrites:result.dbWrites,
      productionActivation:result.productionActivation,
    },null,2));
  }catch(error){
    console.log(JSON.stringify({status:"FAILED",code:safeErrorCode(error)},null,2));
    process.exitCode=1;
  }
}
