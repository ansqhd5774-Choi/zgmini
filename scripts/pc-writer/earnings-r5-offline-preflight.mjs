import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";
import {createHash} from "node:crypto";
import {DatabaseSync} from "node:sqlite";
import {fileURLToPath} from "node:url";
import {classifySecFact,validateSecFsdsHeaders} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {inspectXlsxArchive} from "../../lib/market-score/earnings-e1-r5-offline-preflight.mjs";

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const clean=value=>String(value??"").trim();
const split=line=>String(line??"").replace(/\r$/,"").split("\t").map(clean);
const indexOfHeaders=headers=>Object.fromEntries(headers.map((value,index)=>[value.toLowerCase(),index]));
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const padCik=value=>{const digits=String(value??"").replace(/\D/g,"");return digits?digits.padStart(10,"0"):null;};

function args(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){
    const match=item.match(/^--([^=]+)=(.*)$/);
    if(match)out[match[1]]=match[2];
  }
  return out;
}

async function hashFile(file){
  const hash=createHash("sha256");
  await new Promise((resolve,reject)=>{
    const stream=fs.createReadStream(file);
    stream.on("data",chunk=>hash.update(chunk));
    stream.on("end",resolve);
    stream.on("error",reject);
  });
  return hash.digest("hex");
}

async function lineReader(file){
  const input=fs.createReadStream(file,{encoding:"utf8"});
  return readline.createInterface({input,crlfDelay:Infinity});
}

export function readLatestEarningsUniverse(coreFile){
  if(!coreFile||!fs.existsSync(coreFile))return {status:"MISSING",reason:"CORE_SQLITE_REQUIRED",members:[],ciks:new Set()};
  let db;
  try{
    db=new DatabaseSync(coreFile,{readOnly:true,timeout:30000});
    const table=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='market_score_earnings_e1_r3_universe_v1'").get();
    if(!table)return {status:"PARTIAL",reason:"EARNINGS_UNIVERSE_TABLE_MISSING",members:[],ciks:new Set(),readOnly:true};
    const row=db.prepare(`SELECT period_end,body_json,security_count,issuer_count,wikipedia_revision_id,retrieved_at
      FROM market_score_earnings_e1_r3_universe_v1 ORDER BY period_end DESC LIMIT 1`).get();
    if(!row)return {status:"PARTIAL",reason:"EARNINGS_UNIVERSE_EMPTY",members:[],ciks:new Set(),readOnly:true};
    let body={};try{body=JSON.parse(String(row.body_json??"{}"));}catch{return {status:"FAIL",reason:"EARNINGS_UNIVERSE_JSON_INVALID",members:[],ciks:new Set(),readOnly:true};}
    const members=[];const ciks=new Set();
    for(const item of Array.isArray(body?.members)?body.members:[]){
      const cik=padCik(item?.cik);if(!cik||cik==="0000000000"||ciks.has(cik))continue;
      ciks.add(cik);members.push({cik,ticker:clean(item?.ticker),name:clean(item?.name)});
    }
    return {
      status:members.length?"PASS":"PARTIAL",
      reason:members.length?null:"EARNINGS_UNIVERSE_MEMBERS_EMPTY",
      periodEnd:String(row.period_end??""),
      securityCount:Number(row.security_count??0),
      issuerCount:Number(row.issuer_count??members.length),
      memberCount:members.length,
      wikipediaRevisionId:row.wikipedia_revision_id??null,
      retrievedAt:row.retrieved_at??null,
      readOnly:true,
      members,
      ciks,
    };
  }catch(error){
    return {status:"FAIL",reason:"EARNINGS_UNIVERSE_READ_FAILED",code:error?.code??null,members:[],ciks:new Set(),readOnly:true};
  }finally{try{db?.close();}catch{}}
}

export async function inspectSecFiles({subFile,numFile,universeCiks=null}={}){
  if(!subFile||!numFile||!fs.existsSync(subFile)||!fs.existsSync(numFile))return {status:"MISSING",reason:"SEC_FILES_REQUIRED"};
  const universe=universeCiks instanceof Set?universeCiks:null;
  const submissions=new Map();let subHeaders=null,subIndex=null;
  const forms={"10-Q":0,"10-K":0};
  for await(const line of await lineReader(subFile)){
    if(!subHeaders){subHeaders=split(line);subIndex=indexOfHeaders(subHeaders);continue;}
    const row=split(line),form=row[subIndex.form];
    if(!["10-Q","10-K"].includes(form))continue;
    const adsh=row[subIndex.adsh],cik=padCik(row[subIndex.cik]);
    if(!adsh||!cik)continue;
    submissions.set(adsh,{cik,form});forms[form]++;
  }
  let numHeaders=null,numIndex=null;
  const accepted=Object.fromEntries(["eps","revenue","operatingIncome","netIncome","operatingCashFlow","capex"].map(key=>[key,0]));
  const uniqueCiks=Object.fromEntries(Object.keys(accepted).map(key=>[key,new Set()]));
  const rejected={UNMAPPED_TAG:0,COREGISTRANT_FACT:0,INVALID_DURATION:0,INVALID_UNIT:0};
  let matchedSubmissionFacts=0;
  for await(const line of await lineReader(numFile)){
    if(!numHeaders){
      numHeaders=split(line);numIndex=indexOfHeaders(numHeaders);
      const validation=validateSecFsdsHeaders({submissionHeaders:subHeaders,numberHeaders:numHeaders});
      if(validation.status!=="PASS")return {status:"FAIL",reason:"SEC_FSDS_HEADER_MISMATCH",validation};
      continue;
    }
    const row=split(line),submission=submissions.get(row[numIndex.adsh]);
    if(!submission)continue;
    matchedSubmissionFacts++;
    const value=Number(row[numIndex.value]);if(!finite(value))continue;
    const result=classifySecFact({tag:row[numIndex.tag],qtrs:Number(row[numIndex.qtrs]),uom:row[numIndex.uom],coreg:row[numIndex.coreg]});
    if(result.status!=="ACCEPT"){
      if(Object.hasOwn(rejected,result.reason))rejected[result.reason]++;
      continue;
    }
    accepted[result.metric]++;uniqueCiks[result.metric].add(submission.cik);
  }
  const uniqueCounts=Object.fromEntries(Object.entries(uniqueCiks).map(([key,set])=>[key,set.size]));
  const universeCoverage=universe?Object.fromEntries(Object.entries(uniqueCiks).map(([key,set])=>{
    let matched=0;for(const cik of set)if(universe.has(cik))matched++;
    return [key,{matched,universeCount:universe.size,coverage:universe.size?matched/universe.size:null}];
  })):null;
  const submissionUniverseCount=universe?[...new Set([...submissions.values()].map(item=>item.cik))].filter(cik=>universe.has(cik)).length:null;
  return {
    status:"PASS",
    source:"SEC_FSDS_EXTRACTED_FILES",
    noDbWrites:true,
    submissionCount:submissions.size,
    submissionUniverseCount,
    forms,
    matchedSubmissionFacts,
    acceptedFacts:accepted,
    uniqueCiks:uniqueCounts,
    universeCoverage,
    rejected,
    files:{
      sub:{name:path.basename(subFile),bytes:fs.statSync(subFile).size,sha256:await hashFile(subFile)},
      num:{name:path.basename(numFile),bytes:fs.statSync(numFile).size,sha256:await hashFile(numFile)},
    },
  };
}

export async function inspectBlsPrFile(file,{seriesId="PRS85006111"}={}){
  if(!file||!fs.existsSync(file))return {status:"MISSING",reason:"BLS_PR_FILE_REQUIRED",seriesId};
  let headers=null,index=null;const rows=[];let annualAverageRowsSkipped=0;
  for await(const line of await lineReader(file)){
    if(!headers){
      headers=split(line);index=indexOfHeaders(headers);
      for(const required of ["series_id","year","period","value"]){
        if(index[required]==null)return {status:"FAIL",reason:"BLS_PR_HEADER_MISMATCH",missing:required,seriesId};
      }
      continue;
    }
    const row=split(line);if(row[index.series_id]!==seriesId)continue;
    const period=row[index.period];if(period==="Q05"){annualAverageRowsSkipped++;continue;}
    if(!/^Q0[1-4]$/.test(period))continue;
    const year=Number(row[index.year]),value=Number(row[index.value]);if(!Number.isInteger(year)||!finite(value))continue;
    rows.push({year,quarter:Number(period.slice(-1)),value,revised:clean(row[index.footnote_codes]).includes("R")});
  }
  rows.sort((a,b)=>a.year-b.year||a.quarter-b.quarter);
  return {
    status:rows.length?"PASS":"FAIL",
    reason:rows.length?null:"BLS_PR_SERIES_MISSING",
    source:"BLS_PR_FLAT_TEXT",
    seriesId,
    observationCount:rows.length,
    annualAverageRowsSkipped,
    first:rows[0]??null,
    latest:rows.at(-1)??null,
    file:{name:path.basename(file),bytes:fs.statSync(file).size,sha256:await hashFile(file)},
  };
}

export async function inspectBeaFile(file,{seriesCode="A051RC"}={}){
  if(!file||!fs.existsSync(file))return {status:"MISSING",reason:"BEA_FILE_REQUIRED",seriesCode};
  let codeMatchCount=0,labelMatchCount=0;
  for await(const line of await lineReader(file)){
    if(line.includes(seriesCode))codeMatchCount++;
    if(/corporate profits/i.test(line)&&/inventory valuation|capital consumption|IVA|CCAdj/i.test(line))labelMatchCount++;
  }
  return {
    status:codeMatchCount||labelMatchCount?"PASS":"PARTIAL",
    reason:codeMatchCount||labelMatchCount?null:"BEA_SERIES_MARKER_NOT_FOUND",
    source:"BEA_DIRECT_DOWNLOAD",
    seriesCode,
    codeMatchCount,
    labelMatchCount,
    schemaStatus:"MARKER_ONLY_PENDING_TABLE_SCHEMA",
    file:{name:path.basename(file),bytes:fs.statSync(file).size,sha256:await hashFile(file)},
  };
}

export async function inspectBlsInputXlsx(file){
  if(!file||!fs.existsSync(file))return {status:"MISSING",reason:"BLS_INPUT_XLSX_REQUIRED"};
  const buffer=fs.readFileSync(file),archive=inspectXlsxArchive(buffer);
  return {
    ...archive,
    source:"BLS_SATELLITE_INPUT_TO_INDUSTRY",
    schemaStatus:archive.status==="FAIL"?"INVALID":"CELL_SAMPLE_INSPECTED_MAPPING_PENDING",
    file:{name:path.basename(file),bytes:buffer.length,sha256:await hashFile(file)},
  };
}

export async function runEarningsR5OfflinePreflight(options={}){
  const incoming=options.incoming??path.join(defaultBase,"manual-input","e1-r5","incoming");
  const coreFile=options.coreFile??path.join(defaultBase,"storage","core.sqlite");
  const universe=readLatestEarningsUniverse(coreFile);
  const result={
    version:1,
    at:new Date().toISOString(),
    methodologyVersion:"E1-R5-SHADOW-R1",
    active:false,
    networkCalls:0,
    dbReads:universe.status==="MISSING"?0:1,
    dbWrites:0,
    universe:{...universe,ciks:undefined,members:undefined},
    inputs:{
      sec:await inspectSecFiles({subFile:options.secSub??path.join(incoming,"sub.txt"),numFile:options.secNum??path.join(incoming,"num.txt"),universeCiks:universe.ciks}),
      blsUnitLaborCost:await inspectBlsPrFile(options.blsPr??path.join(incoming,"pr.data.0.Current")),
      blsProducerInput:await inspectBlsInputXlsx(options.blsInput??path.join(incoming,"bls-satellite-input-to-industry-indexes.xlsx")),
      beaCorporateProfits:await inspectBeaFile(options.bea??path.join(incoming,"bea-corporate-profits.csv")),
    },
  };
  const statuses=Object.values(result.inputs).map(item=>item.status);
  result.status=statuses.every(status=>status==="PASS")&&universe.status==="PASS"?"PASS":"PARTIAL";
  return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const cli=args(),incoming=cli.incoming?path.resolve(cli.incoming):undefined;
    const result=await runEarningsR5OfflinePreflight({
      incoming,
      coreFile:cli.core?path.resolve(cli.core):undefined,
      secSub:cli["sec-sub"]?path.resolve(cli["sec-sub"]):undefined,
      secNum:cli["sec-num"]?path.resolve(cli["sec-num"]):undefined,
      blsPr:cli["bls-pr"]?path.resolve(cli["bls-pr"]):undefined,
      blsInput:cli["bls-input"]?path.resolve(cli["bls-input"]):undefined,
      bea:cli.bea?path.resolve(cli.bea):undefined,
    });
    const out=cli.out?path.resolve(cli.out):path.join(defaultBase,"manual-input","e1-r5","reports","e1-r5-preflight-last.json");
    fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));
    console.log(JSON.stringify({status:result.status,report:out,networkCalls:0,dbReads:result.dbReads,dbWrites:0}));
  }catch(error){
    console.log(JSON.stringify({status:"FAILED",code:error?.code??"E1_R5_PREFLIGHT_FAILED"}));process.exitCode=1;
  }
}
