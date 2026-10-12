import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {buildCfoSurveyPITRecord} from "../../lib/market-score/earnings-e1-r5-cfo-survey-r1.mjs";
import {
  E1_R5_CFO_LOCAL_IMPORT_CONTRACT,
  E1_R5_CFO_LOCAL_IMPORT_VERSION,
  mergeCfoSurveyReleaseDocument,
} from "./earnings-r5-cfo-survey-local-import.mjs";
import {parseRichmondFedCfoRevenueReleaseR2} from "./earnings-r5-cfo-survey-local-import-r2.mjs";

export const E1_R5_CFO_LOCAL_IMPORT_R3_VERSION="E1-R5-CFO-LOCAL-IMPORT-R3";
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
  return String(value??"")
    .replace(/&nbsp;|&#160;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;|&#34;/gi,"\"")
    .replace(/&apos;|&#39;/gi,"'")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/&#(\d+);/g,(_,code)=>{
      const n=Number(code);
      return Number.isInteger(n)&&n>=0&&n<=0x10ffff?String.fromCodePoint(n):" ";
    });
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

function htmlTables(value){
  const tables=[];
  for(const table of String(value??"").matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)){
    const rows=[];
    for(const tr of table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
      const cells=[];
      for(const cell of tr[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)){
        cells.push(cellText(cell[1]));
      }
      if(cells.length)rows.push(cells);
    }
    if(rows.length)tables.push(rows);
  }
  return tables;
}

function previousResponsePeriod(surveyYear,surveyQuarter){
  return surveyQuarter===1?{year:surveyYear-1,quarter:4}:{year:surveyYear,quarter:surveyQuarter-1};
}

function quarterKeys(cells){
  const keys=new Set();
  for(const raw of cells){
    const value=text(raw);
    for(const match of value.matchAll(/\bQ([1-4])\s+(20\d{2})\b/gi))keys.add(`${match[2]}Q${match[1]}`);
    for(const match of value.matchAll(/(20\d{2})\s*년\s*([1-4])\s*분기/g))keys.add(`${match[1]}Q${match[2]}`);
  }
  return [...keys];
}

function yearTokens(cells){
  const out=[];
  for(const cell of cells){
    for(const match of text(cell).matchAll(/\b(20\d{2})\b/g))out.push(Number(match[1]));
  }
  return out;
}

function hasSequence(tokens,expected){
  for(let index=0;index<=tokens.length-expected.length;index+=1){
    if(expected.every((value,offset)=>tokens[index+offset]===value))return true;
  }
  return false;
}

function meanMedian(cell){
  const match=text(cell).match(/(-?\d+(?:\.\d+)?)\s*%\s*\(\s*(-?\d+(?:\.\d+)?)\s*%\s*\)/);
  if(!match)return null;
  const mean=Number(match[1]);
  const median=Number(match[2]);
  return finite(mean)&&finite(median)?{mean,median}:null;
}

function isRevenueLabel(value){
  return /^(?:revenue\b|수익(?:$|\s)|매출(?:액)?(?:$|\s))/i.test(text(value));
}

function parseTranslatedStructuralRevenue(value,{surveyYear,surveyQuarter}){
  const previous=previousResponsePeriod(surveyYear,surveyQuarter);
  const currentKey=`${surveyYear}Q${surveyQuarter}`;
  const previousKey=`${previous.year}Q${previous.quarter}`;
  const expectedYears=[surveyYear,surveyYear+1,surveyYear,surveyYear+1];
  const candidates=[];

  for(const rows of htmlTables(value)){
    const quarterHeaderIndex=rows.findIndex(row=>{
      const keys=quarterKeys(row);
      return keys.includes(currentKey)&&keys.includes(previousKey);
    });
    if(quarterHeaderIndex<0)continue;

    let yearHeaderIndex=-1;
    for(let index=quarterHeaderIndex+1;index<Math.min(rows.length,quarterHeaderIndex+4);index+=1){
      if(hasSequence(yearTokens(rows[index]),expectedYears)){
        yearHeaderIndex=index;
        break;
      }
    }
    if(yearHeaderIndex<0)continue;

    const revenueRows=[];
    for(let index=yearHeaderIndex+1;index<Math.min(rows.length,yearHeaderIndex+8);index+=1){
      const row=rows[index];
      if(row.length<5||!isRevenueLabel(row[0]))continue;
      const pairs=row.slice(1,5).map(meanMedian);
      if(pairs.every(Boolean))revenueRows.push({row,pairs});
    }
    if(revenueRows.length===1)candidates.push(revenueRows[0]);
    else if(revenueRows.length>1)return {status:"MISSING",reason:"TRANSLATED_REVENUE_ROW_AMBIGUOUS"};
  }

  if(candidates.length!==1){
    return {status:"MISSING",reason:candidates.length?"TRANSLATED_GROWTH_TABLE_AMBIGUOUS":"TRANSLATED_REVENUE_ROW_NOT_FOUND"};
  }

  const candidate=candidates[0];
  return {
    status:"READY",
    reason:null,
    surveyYear,
    surveyQuarter,
    currentTargetYear:surveyYear,
    nextTargetYear:surveyYear+1,
    currentYearGrowth:candidate.pairs[0].mean,
    nextYearGrowth:candidate.pairs[1].mean,
    parserEvidence:{
      responseQuarter:currentKey,
      comparisonQuarter:previousKey,
      targetYears:expectedYears,
      revenuePairs:candidate.pairs.length,
      revenueLabel:candidate.row[0],
      statistic:"MEAN_FROM_PUBLISHED_MEAN_MEDIAN_PAIRS",
      parserPath:"HTML_TABLE_TRANSLATED_STRUCTURAL",
    },
  };
}

export function parseRichmondFedCfoRevenueReleaseR3(value,{surveyYear,surveyQuarter}={}){
  const r2=parseRichmondFedCfoRevenueReleaseR2(value,{surveyYear,surveyQuarter});
  if(r2.status==="READY")return r2;
  if(!Number.isInteger(surveyYear)||surveyYear<2000||surveyYear>2100)return {status:"MISSING",reason:"SURVEY_YEAR_INVALID"};
  if(!Number.isInteger(surveyQuarter)||surveyQuarter<1||surveyQuarter>4)return {status:"MISSING",reason:"SURVEY_QUARTER_INVALID"};

  const structural=parseTranslatedStructuralRevenue(value,{surveyYear,surveyQuarter});
  if(structural.status==="READY")return structural;
  return r2;
}

function validateOfficialSourceUrl(value){
  let parsed;
  try{parsed=new URL(text(value));}catch{return {status:"MISSING",reason:"SOURCE_URL_INVALID",url:null};}
  const host=parsed.hostname.toLowerCase();
  if(host!=="www.richmondfed.org"&&host!=="richmondfed.org")return {status:"MISSING",reason:"SOURCE_HOST_NOT_ALLOWED",url:null};
  if(parsed.protocol!=="https:")return {status:"MISSING",reason:"SOURCE_URL_NOT_HTTPS",url:null};
  if(!parsed.pathname.includes("/research/national_economy/cfo_survey/data_and_results/"))return {status:"MISSING",reason:"SOURCE_PATH_NOT_ALLOWED",url:null};
  parsed.hash="";
  return {status:"READY",reason:null,url:parsed.toString()};
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

export function importCfoSurveyLocalSourceR3({
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
  const parsed=parseRichmondFedCfoRevenueReleaseR3(bytes.toString("utf8"),{surveyYear,surveyQuarter});
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
    importerVersion:E1_R5_CFO_LOCAL_IMPORT_R3_VERSION,
    contract:E1_R5_CFO_LOCAL_IMPORT_CONTRACT,
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
    const result=importCfoSurveyLocalSourceR3({
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
      parserPath:result.parserEvidence?.parserPath??null,
      networkCalls:result.networkCalls,
      dbWrites:result.dbWrites,
      productionActivation:result.productionActivation,
    },null,2));
  }catch(error){
    console.log(JSON.stringify({status:"FAILED",code:safeErrorCode(error)},null,2));
    process.exitCode=1;
  }
}
