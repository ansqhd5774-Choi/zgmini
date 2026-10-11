import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {parseWorkbook} from "../../worker/consumption-r3-census-lib.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {buildApprovedSicNaics3Document,parseCensusConcordanceWorkbook} from "../../lib/market-score/earnings-e1-r5-sic-naics3-concordance.mjs";

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const SOURCE_SPECS=Object.freeze([
  {key:"censusSic1987ToNaics2002",fromYear:1987,toYear:2002,fromSystem:"sic",toSystem:"naics",fromDigits:4,toDigits:6,changesOnly:false},
  {key:"censusNaics2002To2007",fromYear:2002,toYear:2007,fromSystem:"naics",toSystem:"naics",fromDigits:6,toDigits:6,changesOnly:false},
  {key:"censusNaics2007To2012",fromYear:2007,toYear:2012,fromSystem:"naics",toSystem:"naics",fromDigits:6,toDigits:6,changesOnly:false},
  {key:"censusNaics2012To2017",fromYear:2012,toYear:2017,fromSystem:"naics",toSystem:"naics",fromDigits:6,toDigits:6,changesOnly:false},
  {key:"censusNaics2017To2022Changes",fromYear:2017,toYear:2022,fromSystem:"naics",toSystem:"naics",fromDigits:6,toDigits:6,changesOnly:true},
  {key:"censusNaics2022To2017Changes",fromYear:2022,toYear:2017,fromSystem:"naics",toSystem:"naics",fromDigits:6,toDigits:6,changesOnly:true},
]);
const sha256=buffer=>createHash("sha256").update(buffer).digest("hex");

function parseArgs(argv=process.argv.slice(2)){
  const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;
}
function relationName(key){return key.replace(/^census/,"").replace(/^[A-Z]/,c=>c.toLowerCase());}

export function buildR15MappingFromBuffers(buffers){
  const relations={};const sources=[];
  for(const spec of SOURCE_SPECS){
    const buffer=buffers?.[spec.key];
    if(!Buffer.isBuffer(buffer)||!buffer.length){relations[relationName(spec.key)]={status:"FAIL",reason:"CENSUS_CONCORDANCE_FILE_REQUIRED",map:new Map()};sources.push({key:spec.key,status:"MISSING",bytes:0,sha256:null});continue;}
    let workbook;
    try{workbook=parseWorkbook(buffer);}catch(error){relations[relationName(spec.key)]={status:"FAIL",reason:"CENSUS_CONCORDANCE_WORKBOOK_PARSE_FAILED",map:new Map()};sources.push({key:spec.key,status:"PARSE_FAILED",bytes:buffer.length,sha256:sha256(buffer),format:null});continue;}
    const relation=parseCensusConcordanceWorkbook(workbook.sheets,spec);relations[relationName(spec.key)]=relation;sources.push({key:spec.key,status:relation.status,reason:relation.reason??null,bytes:buffer.length,sha256:sha256(buffer),format:workbook.format,relationshipCount:relation.relationshipCount??0,sourceCount:relation.sourceCount??0,sheetName:relation.sheetName??null});
  }
  const document=buildApprovedSicNaics3Document({
    sic1987To2002:relations.sic1987ToNaics2002,
    naics2002To2007:relations.naics2002To2007,
    naics2007To2012:relations.naics2007To2012,
    naics2012To2017:relations.naics2012To2017,
    naics2017To2022Changes:relations.naics2017To2022Changes,
    naics2022To2017Changes:relations.naics2022To2017Changes,
  });
  return {document,relations,sources};
}

export function runEarningsR5R15SicNaics3Mapping({incoming,mappingFile,reportsDir}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming");
  const approvedFile=mappingFile??path.join(defaultBase,"manual-input","e1-r5","approved-sic-naics3.json");
  const reportDir=reportsDir??path.join(defaultBase,"manual-input","e1-r5","reports");
  const buffers={};
  for(const spec of SOURCE_SPECS){const source=E1_R5_OFFICIAL_SOURCE_MANIFEST[spec.key];const file=source?path.join(inputDir,source.localName):null;if(file&&fs.existsSync(file)&&fs.statSync(file).isFile())buffers[spec.key]=fs.readFileSync(file);}
  const built=buildR15MappingFromBuffers(buffers);
  const report={version:1,methodologyVersion:"E1-R5-SHADOW-R1",at:new Date().toISOString(),active:false,researchOnly:true,status:built.document.status==="APPROVED"?"PASS":"PARTIAL",reason:built.document.reason??null,networkCalls:0,dbWrites:0,sourceFiles:built.sources,mapping:{status:built.document.status,version:built.document.version,policy:built.document.policy??null,unchanged2017Rule:built.document.unchanged2017Rule??null,summary:built.document.summary??null,symmetry:built.document.symmetry??null}};
  fs.mkdirSync(reportDir,{recursive:true});
  const reportJson=path.join(reportDir,"e1-r5-r15-sic-naics3-last.json");const reportTxt=path.join(reportDir,"e1-r5-r15-sic-naics3-last.txt");
  fs.writeFileSync(reportJson,JSON.stringify(report,null,2));
  fs.writeFileSync(reportTxt,formatEarningsR5R15SicNaics3Text(report));
  let mappingWritten=false;
  if(built.document.status==="APPROVED"){
    fs.mkdirSync(path.dirname(approvedFile),{recursive:true});
    const sourceHashes=Object.fromEntries(built.sources.map(source=>[source.key,source.sha256]));
    fs.writeFileSync(approvedFile,JSON.stringify({...built.document,generatedAt:report.at,sourceHashes},null,2));mappingWritten=true;
  }
  return {...report,mappingFile:approvedFile,mappingWritten,reportJson,reportTxt};
}

export function formatEarningsR5R15SicNaics3Text(report){
  const summary=report?.mapping?.summary??{};const lines=[
    `E1-R5 R15 SIC-NAICS3 MAPPING: ${report?.status??"UNKNOWN"}`,
    `AT: ${report?.at??"-"}`,
    `POLICY: ${report?.mapping?.policy??"-"}`,
    `UNCHANGED_2017_RULE: ${report?.mapping?.unchanged2017Rule??"-"}`,
    `MAPPING_STATUS: ${report?.mapping?.status??"-"}`,
    `EXACT: ${summary.exact??0}`,
    `AMBIGUOUS: ${summary.ambiguous??0}`,
    `NO_NAICS: ${summary.noNaics??0}`,
    `TOTAL_SIC: ${summary.total??0}`,
    `2017_2022_SYMMETRY: ${report?.mapping?.symmetry?.status??"-"}`,
  ];
  for(const source of report?.sourceFiles??[])lines.push(`SOURCE ${source.key}: ${source.status} format=${source.format??"-"} rows=${source.relationshipCount??0} sha256=${source.sha256??"-"}`);
  lines.push(`NETWORK_CALLS: ${report?.networkCalls??0}`,`DB_WRITES: ${report?.dbWrites??0}`,"PRODUCTION_ACTIVATION: NO");return lines.join("\r\n")+"\r\n";
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const cli=parseArgs();const report=runEarningsR5R15SicNaics3Mapping({incoming:cli.incoming?path.resolve(cli.incoming):undefined,mappingFile:cli.mapping?path.resolve(cli.mapping):undefined,reportsDir:cli["reports-dir"]?path.resolve(cli["reports-dir"]):undefined});
    console.log(JSON.stringify({status:report.status,mappingWritten:report.mappingWritten,mappingFile:report.mappingFile,textReport:report.reportTxt,jsonReport:report.reportJson,networkCalls:0,dbWrites:0}));
  }catch(error){console.log(JSON.stringify({status:"FAILED",code:error?.code??"E1_R5_R15_SIC_NAICS3_FAILED"}));process.exitCode=1;}
}
