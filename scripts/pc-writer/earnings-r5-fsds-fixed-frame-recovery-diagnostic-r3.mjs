import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import {fileURLToPath} from "node:url";
import {classifySecFact} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {latestMatureFrame,MATURE_LAG_DAYS} from "../../lib/market-score/sec-earnings-e1-r2-provider.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {buildFsdsRecoveryDiagnosticFromDocuments} from "./earnings-r5-fsds-fixed-frame-recovery-diagnostic.mjs";

export const VERSION="E1-R5-FSDS-FIXED-FRAME-RECOVERY-DIAGNOSTIC-R3";
const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const clean=value=>String(value??"").trim();
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const pctText=value=>finite(value)?`${(100*value).toFixed(1)}%`:"-";
function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function split(line){return String(line??"").replace(/\r$/,"").split("\t").map(clean);}
function indexes(headers){return Object.fromEntries(headers.map((v,i)=>[v.toLowerCase(),i]));}
function padCik(value){const digits=String(value??"").replace(/\D/g,"");return digits?digits.padStart(10,"0"):null;}
function normalizeSecDate(value){const text=clean(value);if(/^\d{8}$/.test(text))return `${text.slice(0,4)}-${text.slice(4,6)}-${text.slice(6,8)}`;if(/^\d{4}-\d{2}-\d{2}$/.test(text))return text;return null;}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function resolveJson(directory,cik,nested){const name=`CIK${cik}.json`;for(const file of [path.join(directory,name),path.join(directory,nested,name),path.join(directory,path.basename(directory),name)])if(fs.existsSync(file))return file;return null;}
async function lineReader(file){return readline.createInterface({input:fs.createReadStream(file,{encoding:"utf8"}),crlfDelay:Infinity});}
function bump(object,key){object[key]=(object[key]??0)+1;}

export async function loadFsdsFactsR3({subFile,numFile,universeCiks,asOf}={}){
  if(!subFile||!numFile||!fs.existsSync(subFile)||!fs.existsSync(numFile))return {status:"MISSING",factsByCik:new Map(),submissionCount:0,acceptedFacts:0};
  const universe=universeCiks instanceof Set?universeCiks:new Set();
  const normalizedAsOf=normalizeSecDate(asOf);
  if(!normalizedAsOf)return {status:"FAIL",reason:"AS_OF_INVALID",factsByCik:new Map(),submissionCount:0,acceptedFacts:0};
  const submissions=new Map();let subHeaders=null,subIndex=null,subRows=0,universeSubmissionRows=0,invalidFiledDateRows=0,futureFiledRows=0;
  for await(const line of await lineReader(subFile)){
    if(!subHeaders){subHeaders=split(line);subIndex=indexes(subHeaders);continue;}
    subRows++;
    const row=split(line),adsh=row[subIndex.adsh],cik=padCik(row[subIndex.cik]),form=row[subIndex.form],filed=normalizeSecDate(row[subIndex.filed]);
    if(!adsh||!cik||!["10-Q","10-K"].includes(form)||!universe.has(cik))continue;
    if(!filed){invalidFiledDateRows++;continue;}
    if(filed>normalizedAsOf){futureFiledRows++;continue;}
    submissions.set(adsh,{cik,form,filed,period:normalizeSecDate(row[subIndex.period])??row[subIndex.period],fy:row[subIndex.fy],fp:row[subIndex.fp]});
    universeSubmissionRows++;
  }

  const factsByCik=new Map();let numHeaders=null,numIndex=null;
  const counters={numRows:0,joinedSubmissionRows:0,finiteValueRows:0,acceptedByContract:0,storedUniverseFacts:0,invalidFiledDateRows,futureFiledRows};
  const rejected={UNMAPPED_TAG:0,COREGISTRANT_FACT:0,INVALID_DURATION:0,INVALID_UNIT:0};
  const acceptedByMetric={eps:0,revenue:0,operatingIncome:0,netIncome:0,operatingCashFlow:0,capex:0};
  for await(const line of await lineReader(numFile)){
    if(!numHeaders){numHeaders=split(line);numIndex=indexes(numHeaders);continue;}
    counters.numRows++;
    const row=split(line),submission=submissions.get(row[numIndex.adsh]);
    if(!submission)continue;
    counters.joinedSubmissionRows++;
    const value=Number(row[numIndex.value]);if(!finite(value))continue;
    counters.finiteValueRows++;
    const classified=classifySecFact({tag:row[numIndex.tag],qtrs:Number(row[numIndex.qtrs]),uom:row[numIndex.uom],coreg:row[numIndex.coreg]});
    if(classified.status!=="ACCEPT"){
      if(Object.hasOwn(rejected,classified.reason))bump(rejected,classified.reason);
      continue;
    }
    counters.acceptedByContract++;acceptedByMetric[classified.metric]++;
    const ddate=normalizeSecDate(row[numIndex.ddate]);
    if(!ddate)continue;
    if(!factsByCik.has(submission.cik))factsByCik.set(submission.cik,[]);
    factsByCik.get(submission.cik).push({metric:classified.metric,tag:row[numIndex.tag],unit:row[numIndex.uom],qtrs:Number(row[numIndex.qtrs]),val:value,ddate,adsh:row[numIndex.adsh],...submission});
    counters.storedUniverseFacts++;
  }
  return {status:"PASS",factsByCik,submissionCount:submissions.size,subRows,universeSubmissionRows,acceptedFacts:counters.storedUniverseFacts,counters,rejected,acceptedByMetric};
}

export async function runFsdsRecoveryDiagnosticR3({incoming,coreFile,asOf=new Date().toISOString().slice(0,10),lagDays=MATURE_LAG_DAYS}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming"),core=coreFile??path.join(defaultBase,"storage","core.sqlite");
  const universe=readLatestEarningsUniverse(core),frame=latestMatureFrame(asOf,{lagDays});
  if(universe.status!=="PASS"||!frame)return {version:VERSION,status:"PARTIAL",reason:universe.status!=="PASS"?"UNIVERSE_REQUIRED":"FRAME_REQUIRED",networkCalls:0,dbWrites:0};
  const fsds=await loadFsdsFactsR3({subFile:path.join(inputDir,"sub.txt"),numFile:path.join(inputDir,"num.txt"),universeCiks:universe.ciks,asOf});
  if(fsds.status!=="PASS")return {version:VERSION,status:"PARTIAL",reason:fsds.reason??"FSDS_REQUIRED",networkCalls:0,dbWrites:0};
  const factDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory),subDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory),factsByCik=new Map(),submissionsByCik=new Map();
  for(const member of universe.members){const cik=String(member.cik).replace(/\D/g,"").padStart(10,"0");factsByCik.set(cik,readJson(resolveJson(factDir,cik,"companyfacts")));submissionsByCik.set(cik,readJson(resolveJson(subDir,cik,"submissions")));}
  const base=buildFsdsRecoveryDiagnosticFromDocuments({members:universe.members,factsByCik,submissionsByCik,fsdsFactsByCik:fsds.factsByCik,frame,asOf});
  return {...base,version:VERSION,fsds:{submissionCount:fsds.submissionCount,acceptedFacts:fsds.acceptedFacts,counters:fsds.counters,rejected:fsds.rejected,acceptedByMetric:fsds.acceptedByMetric}};
}

export function formatFsdsRecoveryDiagnosticR3Text(r){
  const lines=[`E1-R5 FSDS FIXED FRAME RECOVERY DIAGNOSTIC: ${r.status}`,`VERSION: ${r.version}`,`FRAME: ${r.frame?.frame??"-"} prior=${r.frame?.priorFrame??"-"} end=${r.frame?.end??"-"}`,`FSDS: submissions=${r.fsds?.submissionCount??0} acceptedFacts=${r.fsds?.acceptedFacts??0}`,`FSDS_FILTER: ${Object.entries(r.fsds?.counters??{}).map(([k,v])=>`${k}=${v}`).join(" ")||"NONE"}`,`FSDS_ACCEPTED_BY_METRIC: ${Object.entries(r.fsds?.acceptedByMetric??{}).map(([k,v])=>`${k}=${v}`).join(" ")||"NONE"}`,`FSDS_REJECTED: ${Object.entries(r.fsds?.rejected??{}).map(([k,v])=>`${k}=${v}`).join(" ")||"NONE"}`,`POLICY: RESEARCH_ONLY companyFactsPreferred=true fsdsSecondary=true approvedQ4Additive=true accepted=NO`];
  for(const k of ["S1","S2","S3","S4","S5","S7","S8"]){const g=r.gates?.[k];lines.push(`${k}: ${pctText(g?.coverage)} ${g?.ready??0}/${g?.denominator??0} min=${pctText(g?.min)} pass=${g?.pass?"YES":"NO"} need=${g?.need??"-"}`);}
  for(const [k,v] of Object.entries(r.methods??{}))lines.push(`METHOD_${k}: ${Object.entries(v).sort((a,b)=>b[1]-a[1]).map(([x,n])=>`${x}=${n}`).join(" ")||"NONE"}`);
  lines.push(`Q4_EPS_ANNUAL_MINUS_9M: ${r.policies?.q4EpsAnnualMinusNineMonths??"-"}`,`FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`SCORING_GATE_CHANGED: NO`,`INPUT_CONTRACT_CHANGED: NO`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`);
  return lines.join("\r\n")+"\r\n";
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const cli=parseArgs();const report=await runFsdsRecoveryDiagnosticR3({incoming:cli.incoming?path.resolve(cli.incoming):undefined,coreFile:cli.core?path.resolve(cli.core):undefined,asOf:cli["as-of"]??undefined});console.log(formatFsdsRecoveryDiagnosticR3Text(report));if(report.status!=="PASS")process.exitCode=1;}
  catch(error){console.log(`E1-R5 FSDS FIXED FRAME RECOVERY DIAGNOSTIC: FAILED\r\nCODE: ${error?.code??"E1_R5_FSDS_RECOVERY_R3_FAILED"}`);process.exitCode=1;}
}
