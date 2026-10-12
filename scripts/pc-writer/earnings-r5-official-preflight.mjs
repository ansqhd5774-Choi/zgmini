import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST,inspectBeaSection1Workbook} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {
  inspectBlsInputXlsx,
  inspectBlsPrFile,
  inspectSecCompanyFactsDir,
  inspectSecFiles,
  readLatestEarningsUniverse,
} from "./earnings-r5-offline-preflight.mjs";

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){
    const match=item.match(/^--([^=]+)=(.*)$/);
    if(match)out[match[1]]=match[2];
  }
  return out;
}

function compactUniverse(universe){
  return {
    status:universe.status,
    reason:universe.reason??null,
    periodEnd:universe.periodEnd??null,
    securityCount:universe.securityCount??null,
    issuerCount:universe.issuerCount??null,
    memberCount:universe.memberCount??0,
    wikipediaRevisionId:universe.wikipediaRevisionId??null,
    retrievedAt:universe.retrievedAt??null,
    readOnly:universe.readOnly===true,
  };
}

function pct(value){
  return typeof value==="number"&&Number.isFinite(value)?`${(value*100).toFixed(1)}%`:"-";
}

export function formatEarningsR5OfficialPreflightText(report){
  const sec=report?.inputs?.secCompanyFacts??{};
  const labor=report?.inputs?.blsUnitLaborCost??{};
  const ppi=report?.inputs?.blsProducerInput??{};
  const bea=report?.inputs?.beaCorporateProfits??{};
  const lines=[
    `E1-R5 OFFICIAL PREFLIGHT: ${report?.status??"UNKNOWN"}`,
    `AT: ${report?.at??"-"}`,
    `ACTIVE: ${report?.active===true?"true":"false"}`,
    `NETWORK_CALLS: ${report?.networkCalls??"-"}`,
    `DB_READS: ${report?.dbReads??"-"}`,
    `DB_WRITES: ${report?.dbWrites??"-"}`,
    `UNIVERSE: ${report?.universe?.status??"-"} period=${report?.universe?.periodEnd??"-"} issuers=${report?.universe?.memberCount??0}`,
    `SEC_COMPANYFACTS: ${sec.status??"-"} files=${sec.filesFound??0}/${sec.universeCount??0} parsed=${sec.parsedFiles??0}`,
  ];
  for(const metric of ["eps","revenue","operatingIncome","netIncome","operatingCashFlow","capex"]){
    const coverage=sec.explicitQuarterCoverage?.[metric];
    lines.push(`SEC_${metric.toUpperCase()}_EXPLICIT_QUARTER_COVERAGE: ${pct(coverage?.coverage)} (${coverage?.matched??0}/${coverage?.universeCount??0})`);
  }
  lines.push(
    `SEC_Q4_EPS_EXPLICIT_ISSUERS: ${sec.q4ExplicitIssuerCounts?.eps??0}`,
    `SEC_Q4_EPS_ANNUAL_MINUS_9M: ${sec.q4EpsAnnualMinusNineMonths??"-"}`,
    `BLS_UNIT_LABOR_COST: ${labor.status??"-"} observations=${labor.observationCount??0} latest=${labor.latest?`${labor.latest.year}Q${labor.latest.quarter} ${labor.latest.value}`:"-"}`,
    `BLS_PRODUCER_INPUT_XLSX: ${ppi.status??"-"} sheets=${Array.isArray(ppi.sheets)?ppi.sheets.length:0}`,
    `BEA_CORPORATE_PROFITS: ${bea.status??"-"} quarterlyMatches=${bea.quarterlyMatchCount??0}`,
    `FSDS_SECONDARY: ${report?.inputs?.secFsdsSecondary?.status??"MISSING"}`,
  );
  const missing=[];
  if(report?.universe?.status!=="PASS")missing.push("UNIVERSE");
  for(const [key,item] of Object.entries({SEC:sec,BLS_ULC:labor,BLS_INPUT:ppi,BEA:bea}))if(item?.status!=="PASS")missing.push(key);
  lines.push(`MISSING_OR_PARTIAL: ${missing.length?missing.join(","):"NONE"}`);
  return lines.join("\r\n")+"\r\n";
}

export async function runEarningsR5OfficialPreflight(options={}){
  const incoming=options.incoming??path.join(defaultBase,"manual-input","e1-r5","incoming");
  const coreFile=options.coreFile??path.join(defaultBase,"storage","core.sqlite");
  const universe=readLatestEarningsUniverse(coreFile);
  const manifest=E1_R5_OFFICIAL_SOURCE_MANIFEST;
  const companyFactsDir=options.companyFactsDir??path.join(incoming,manifest.secCompanyFacts.extractedDirectory);
  const laborFile=options.blsUnitLaborCost??path.join(incoming,manifest.blsUnitLaborCost.localName);
  const producerInputFile=options.blsProducerInput??path.join(incoming,manifest.blsProducerInput.localName);
  const beaFile=options.beaCorporateProfits??path.join(incoming,manifest.beaCorporateProfits.localName);
  const fsdsSub=options.fsdsSub??path.join(incoming,"sub.txt");
  const fsdsNum=options.fsdsNum??path.join(incoming,"num.txt");

  const bea=fs.existsSync(beaFile)
    ? {
        ...inspectBeaSection1Workbook(fs.readFileSync(beaFile),{seriesCode:manifest.beaCorporateProfits.seriesCode}),
        file:{name:path.basename(beaFile),bytes:fs.statSync(beaFile).size},
      }
    : {status:"MISSING",reason:"BEA_NIPA_SECTION1_XLSX_REQUIRED",seriesCode:manifest.beaCorporateProfits.seriesCode};

  const result={
    version:1,
    methodologyVersion:"E1-R5-SHADOW-R1",
    at:new Date().toISOString(),
    active:false,
    networkCalls:0,
    dbReads:universe.status==="MISSING"?0:1,
    dbWrites:0,
    sourceFiles:Object.fromEntries(Object.entries(manifest).map(([key,source])=>[key,{authority:source.authority,url:source.url,localName:source.localName??source.extractedDirectory}])),
    universe:compactUniverse(universe),
    inputs:{
      secCompanyFacts:await inspectSecCompanyFactsDir(companyFactsDir,{universeCiks:universe.ciks}),
      secFsdsSecondary:await inspectSecFiles({subFile:fsdsSub,numFile:fsdsNum,universeCiks:universe.ciks}),
      blsUnitLaborCost:await inspectBlsPrFile(laborFile,{seriesId:manifest.blsUnitLaborCost.seriesId}),
      blsProducerInput:await inspectBlsInputXlsx(producerInputFile),
      beaCorporateProfits:bea,
    },
  };
  const required=[result.inputs.secCompanyFacts,result.inputs.blsUnitLaborCost,result.inputs.blsProducerInput,result.inputs.beaCorporateProfits];
  result.status=result.universe.status==="PASS"&&required.every(item=>item.status==="PASS")?"PASS":"PARTIAL";
  return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const cli=parseArgs();
    const report=await runEarningsR5OfficialPreflight({
      incoming:cli.incoming?path.resolve(cli.incoming):undefined,
      coreFile:cli.core?path.resolve(cli.core):undefined,
      companyFactsDir:cli["companyfacts-dir"]?path.resolve(cli["companyfacts-dir"]):undefined,
      blsUnitLaborCost:cli["bls-ulc"]?path.resolve(cli["bls-ulc"]):undefined,
      blsProducerInput:cli["bls-input"]?path.resolve(cli["bls-input"]):undefined,
      beaCorporateProfits:cli.bea?path.resolve(cli.bea):undefined,
      fsdsSub:cli["fsds-sub"]?path.resolve(cli["fsds-sub"]):undefined,
      fsdsNum:cli["fsds-num"]?path.resolve(cli["fsds-num"]):undefined,
    });
    const reportsDir=cli["reports-dir"]?path.resolve(cli["reports-dir"]):path.join(defaultBase,"manual-input","e1-r5","reports");
    fs.mkdirSync(reportsDir,{recursive:true});
    const jsonFile=path.join(reportsDir,"e1-r5-official-preflight-last.json");
    const textFile=path.join(reportsDir,"e1-r5-official-preflight-last.txt");
    fs.writeFileSync(jsonFile,JSON.stringify(report,null,2));
    fs.writeFileSync(textFile,formatEarningsR5OfficialPreflightText(report));
    console.log(JSON.stringify({status:report.status,jsonReport:jsonFile,textReport:textFile,networkCalls:0,dbReads:report.dbReads,dbWrites:0}));
  }catch(error){
    console.log(JSON.stringify({status:"FAILED",code:error?.code??"E1_R5_OFFICIAL_PREFLIGHT_FAILED"}));
    process.exitCode=1;
  }
}
