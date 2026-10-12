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
  parseRichmondFedCfoRevenueRelease as parseTableRelease,
} from "./earnings-r5-cfo-survey-local-import.mjs";

export const E1_R5_CFO_LOCAL_IMPORT_R2_VERSION="E1-R5-CFO-LOCAL-IMPORT-R2";
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

function decodeSourceEscapes(value){
  return String(value??"")
    .replace(/\\u([0-9a-fA-F]{4})/g,(_,code)=>String.fromCharCode(Number.parseInt(code,16)))
    .replace(/\\n|\\r|\\t/g," ")
    .replace(/\\\"/g,"\"");
}

function flattenedVisibleText(value){
  return decodeHtml(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
    .replace(/<br\s*\/?\s*>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function flattenedSourceText(value){
  return decodeSourceEscapes(decodeHtml(value))
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
    .replace(/<br\s*\/?\s*>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/\s+/g," ")
    .trim();
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

function previousResponsePeriod(surveyYear,surveyQuarter){
  if(surveyQuarter===1)return {year:surveyYear-1,quarter:4};
  return {year:surveyYear,quarter:surveyQuarter-1};
}

function extractRevenueGrowthFromFlattenedText(pageText,{surveyYear,surveyQuarter,parserPath}){
  const responseQuarterPattern=new RegExp(`\\bQ${surveyQuarter}\\s+${surveyYear}\\b`,"i");
  if(!responseQuarterPattern.test(pageText))return {status:"MISSING",reason:"RESPONSE_QUARTER_NOT_FOUND"};

  const previous=previousResponsePeriod(surveyYear,surveyQuarter);
  const responseHeaderPattern=new RegExp(`\\bQ${surveyQuarter}\\s+${surveyYear}\\b[\\s\\S]{0,500}\\bQ${previous.quarter}\\s+${previous.year}\\b`,"i");
  const targetYearSequencePattern=new RegExp(`\\b${surveyYear}\\b\\s+\\b${surveyYear+1}\\b\\s+\\b${surveyYear}\\b\\s+\\b${surveyYear+1}\\b`);
  const meanMedianPairs=/(-?\d+(?:\.\d+)?)\s*%\s*\(\s*(-?\d+(?:\.\d+)?)\s*%\s*\)/g;
  const revenuePattern=/\bRevenue\b/gi;
  let sawResponseHeader=false;
  let sawTargetYears=false;
  let sawRevenue=false;
  let sawRevenuePairs=false;

  for(const revenueMatch of pageText.matchAll(revenuePattern)){
    const revenueIndex=revenueMatch.index??-1;
    if(revenueIndex<0)continue;
    const prefix=pageText.slice(Math.max(0,revenueIndex-3500),revenueIndex);
    if(!responseHeaderPattern.test(prefix))continue;
    sawResponseHeader=true;
    if(!targetYearSequencePattern.test(prefix))continue;
    sawTargetYears=true;
    sawRevenue=true;

    const afterRevenue=pageText.slice(revenueIndex+revenueMatch[0].length,revenueIndex+1600);
    const nextMetric=/\b(?:Price|Unit Cost|Employment|Average Wage)\b/i.exec(afterRevenue);
    const revenueBlock=nextMetric?afterRevenue.slice(0,nextMetric.index):afterRevenue;
    const pairs=[...revenueBlock.matchAll(meanMedianPairs)];
    if(pairs.length<4)continue;
    sawRevenuePairs=true;

    const currentYearGrowth=Number(pairs[0][1]);
    const nextYearGrowth=Number(pairs[1][1]);
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
        comparisonQuarter:`Q${previous.quarter} ${previous.year}`,
        targetYears:[surveyYear,surveyYear+1,surveyYear,surveyYear+1],
        revenuePairs:pairs.length,
        statistic:"MEAN_FROM_PUBLISHED_MEAN_MEDIAN_PAIRS",
        parserPath,
      },
    };
  }

  if(!sawResponseHeader)return {status:"MISSING",reason:"GROWTH_RESPONSE_HEADER_NOT_FOUND"};
  if(!sawTargetYears)return {status:"MISSING",reason:"TARGET_YEAR_HEADER_NOT_FOUND"};
  if(!sawRevenue)return {status:"MISSING",reason:"REVENUE_ROW_NOT_FOUND"};
  if(!sawRevenuePairs)return {status:"MISSING",reason:"REVENUE_MEAN_MEDIAN_PAIRS_MISSING"};
  return {status:"MISSING",reason:"GROWTH_EXPECTATIONS_BLOCK_NOT_FOUND"};
}

export function parseRichmondFedCfoRevenueReleaseR2(value,{surveyYear,surveyQuarter}={}){
  const table=parseTableRelease(value,{surveyYear,surveyQuarter});
  if(table.status==="READY")return {...table,parserEvidence:{...table.parserEvidence,parserPath:"HTML_TABLE"}};
  if(table.reason!=="REVENUE_ROW_NOT_FOUND")return table;
  if(!Number.isInteger(surveyYear)||surveyYear<2000||surveyYear>2100)return {status:"MISSING",reason:"SURVEY_YEAR_INVALID"};
  if(!Number.isInteger(surveyQuarter)||surveyQuarter<1||surveyQuarter>4)return {status:"MISSING",reason:"SURVEY_QUARTER_INVALID"};

  const representations=[
    {parserPath:"FLATTENED_VISIBLE_TEXT",pageText:flattenedVisibleText(value)},
    {parserPath:"FLATTENED_SOURCE_TEXT",pageText:flattenedSourceText(value)},
  ];
  const failures=[];
  for(const representation of representations){
    if(!representation.pageText)continue;
    const parsed=extractRevenueGrowthFromFlattenedText(representation.pageText,{surveyYear,surveyQuarter,parserPath:representation.parserPath});
    if(parsed.status==="READY")return parsed;
    failures.push(parsed.reason);
  }

  const priority=[
    "RESPONSE_QUARTER_NOT_FOUND",
    "GROWTH_RESPONSE_HEADER_NOT_FOUND",
    "TARGET_YEAR_HEADER_NOT_FOUND",
    "REVENUE_ROW_NOT_FOUND",
    "REVENUE_MEAN_MEDIAN_PAIRS_MISSING",
  ];
  for(let index=priority.length-1;index>=0;index-=1){
    if(failures.includes(priority[index]))return {status:"MISSING",reason:priority[index]};
  }
  return {status:"MISSING",reason:failures.at(-1)??"GROWTH_EXPECTATIONS_BLOCK_NOT_FOUND"};
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

export function importCfoSurveyLocalSourceR2({
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
  const parsed=parseRichmondFedCfoRevenueReleaseR2(bytes.toString("utf8"),{surveyYear,surveyQuarter});
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
    importerVersion:E1_R5_CFO_LOCAL_IMPORT_R2_VERSION,
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
    const result=importCfoSurveyLocalSourceR2({
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
