import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {parseBlsSatelliteInputWorkbook} from "../../lib/market-score/earnings-e1-r5-source-parsers.mjs";
import {
  E1_R5_R4_BLS_SOURCE_CONTRACT,
  buildS10CostPressureCoverage,
  parseBlsNetOutputSeries,
  parseBlsPpiOutputData,
  validateApprovedSicNaics3Mapping,
  validateBlsUnitLaborCostSource,
} from "../../lib/market-score/earnings-e1-r5-cost-pressure-sources.mjs";
import {latestMatureFrame,MATURE_LAG_DAYS} from "../../lib/market-score/sec-earnings-e1-r2-provider.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {buildIssuerRowFromDocuments} from "./earnings-r5-current-frame-audit.mjs";

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const finite=value=>typeof value==="number"&&Number.isFinite(value);

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){const match=item.match(/^--([^=]+)=(.*)$/);if(match)out[match[1]]=match[2];}
  return out;
}
function readText(file){return file&&fs.existsSync(file)&&fs.statSync(file).isFile()?fs.readFileSync(file,"utf8"):null;}
function readJson(file){try{return file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):null;}catch{return null;}}
function companyFile(directory,cik){const file=path.join(directory,`CIK${String(cik).padStart(10,"0")}.json`);return fs.existsSync(file)?file:null;}
function asMonth(asOf){return /^\d{4}-\d{2}-\d{2}$/.test(String(asOf??""))?`${asOf.slice(0,7)}-01`:"9999-12-01";}
function missingSource(reason){return {status:"MISSING",reason};}

export async function runEarningsR5R14CostPressureDiagnostic({incoming,coreFile,mappingFile,asOf=new Date().toISOString().slice(0,10),lagDays=MATURE_LAG_DAYS}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming");
  const core=coreFile??path.join(defaultBase,"storage","core.sqlite");
  const approvedMapFile=mappingFile??path.join(defaultBase,"manual-input","e1-r5","approved-sic-naics3.json");
  const universe=readLatestEarningsUniverse(core);
  const frame=latestMatureFrame(asOf,{lagDays});
  if(universe.status!=="PASS"||!frame)return {status:"PARTIAL",reason:universe.status!=="PASS"?"UNIVERSE_REQUIRED":"MATURE_FRAME_REQUIRED",active:false,networkCalls:0,dbWrites:0};

  const factsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory);
  const submissionsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory);
  const issuerRows=[];let companyFactsFiles=0,submissionFiles=0;
  for(const member of universe.members){
    const factFile=companyFile(factsDir,member.cik),submissionFile=companyFile(submissionsDir,member.cik);
    if(factFile)companyFactsFiles++;if(submissionFile)submissionFiles++;
    issuerRows.push(buildIssuerRowFromDocuments({member,companyFacts:readJson(factFile),submission:readJson(submissionFile),frame,asOf}));
  }

  const inputFile=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.blsProducerInput.localName);
  const inputReport=fs.existsSync(inputFile)?parseBlsSatelliteInputWorkbook(fs.readFileSync(inputFile),{asOf}):missingSource("BLS_INPUT_XLSX_REQUIRED");

  const outputSeriesText=readText(path.join(inputDir,E1_R5_R4_BLS_SOURCE_CONTRACT.outputSeries.localName));
  const outputDataText=readText(path.join(inputDir,E1_R5_R4_BLS_SOURCE_CONTRACT.outputData.localName));
  const outputMeta=outputSeriesText?parseBlsNetOutputSeries(outputSeriesText):missingSource("BLS_PC_SERIES_REQUIRED");
  const outputReport=outputDataText&&outputMeta.status==="PASS"?parseBlsPpiOutputData(outputDataText,{series:outputMeta.series,asOfMonth:asMonth(asOf)}):missingSource(outputDataText?"BLS_PC_NET_OUTPUT_SERIES_REQUIRED":"BLS_PC_DATA_REQUIRED");

  const ulcSeries=readText(path.join(inputDir,E1_R5_R4_BLS_SOURCE_CONTRACT.ulcSeries.localName));
  const ulcMeasure=readText(path.join(inputDir,E1_R5_R4_BLS_SOURCE_CONTRACT.ulcMeasure.localName));
  const ulcDuration=readText(path.join(inputDir,E1_R5_R4_BLS_SOURCE_CONTRACT.ulcDuration.localName));
  const ulcData=readText(path.join(inputDir,E1_R5_R4_BLS_SOURCE_CONTRACT.ulcData.localName));
  const ulcReport=ulcSeries&&ulcMeasure&&ulcDuration&&ulcData
    ?validateBlsUnitLaborCostSource({seriesText:ulcSeries,measureText:ulcMeasure,durationText:ulcDuration,dataText:ulcData,seriesId:E1_R5_R4_BLS_SOURCE_CONTRACT.ulcData.seriesId})
    :missingSource("BLS_ULC_METADATA_AND_DATA_REQUIRED");
  const ulcFrameValue=ulcReport.status==="PASS"?(ulcReport.observations??[]).find(row=>row.year===frame.year&&row.quarter===frame.quarter)?.value??null:null;

  const mapping=validateApprovedSicNaics3Mapping(readJson(approvedMapFile));
  const s10=buildS10CostPressureCoverage({issuerRows,approvedMapping:mapping,inputSeries:inputReport.series??[],outputSeries:outputReport.series??[]});
  const s11={
    status:finite(ulcFrameValue)?"PASS":"PARTIAL",
    reason:finite(ulcFrameValue)?null:(ulcReport.reason??"BLS_ULC_FRAME_VALUE_REQUIRED"),
    raw:ulcFrameValue,
    sourceStatus:ulcReport.status,
    measure:ulcReport.measure??null,
    duration:ulcReport.duration??null,
    transform:ulcReport.transform??null,
    latest:ulcReport.latest??null,
  };
  const status=s10.status==="PASS"&&s11.status==="PASS"?"PASS":"PARTIAL";
  return {
    version:1,methodologyVersion:"E1-R5-SHADOW-R1",at:new Date().toISOString(),asOf,active:false,researchOnly:true,
    status,reason:status==="PASS"?null:"R4_COST_PRESSURE_INPUTS_INCOMPLETE",networkCalls:0,dbReads:1,dbWrites:0,
    frame:{...frame},universe:{periodEnd:universe.periodEnd,memberCount:universe.memberCount},
    sourceCoverage:{companyFactsFiles,submissionFiles},
    bls:{input:inputReport,outputMeta,output:outputReport,ulc:ulcReport},
    mapping:{status:mapping.status,reason:mapping.reason,version:mapping.version??null,approvedRows:mapping.approvedRows??0,ambiguousRows:mapping.ambiguousRows??0,noNaicsRows:mapping.noNaicsRows??0,invalid:mapping.invalid??0},
    s10,s11,policies:{noImputedMapping:true,noRenormalization:true,productionActivation:false},
  };
}

function pct(value){return finite(value)?`${(100*value).toFixed(1)}%`:"-";}
function num(value){return finite(value)?String(Math.round(value*1e6)/1e6):"null";}
export function formatEarningsR5R14CostPressureDiagnosticText(report){
  const classes=report?.s10?.classification?.classes??{};
  return [
    `E1-R5 R14 COST PRESSURE DIAGNOSTIC: ${report?.status??"UNKNOWN"}`,
    `AT: ${report?.at??"-"}`,
    `AS_OF: ${report?.asOf??"-"}`,
    `FRAME: ${report?.frame?.frame??"-"}`,
    `UNIVERSE: ${report?.universe?.memberCount??0}`,
    `FILES: companyFacts=${report?.sourceCoverage?.companyFactsFiles??0} submissions=${report?.sourceCoverage?.submissionFiles??0}`,
    `BLS_INPUT: ${report?.bls?.input?.status??"MISSING"} roots=${report?.bls?.input?.rootSeriesCount??0} ready3m=${report?.bls?.input?.annualized3mReadyCount??0}`,
    `BLS_OUTPUT: ${report?.bls?.output?.status??"MISSING"} naics3=${report?.bls?.outputMeta?.naics3Count??0} ready3m=${report?.bls?.output?.readyCount??0}`,
    `SIC_NAICS3_MAPPING: ${report?.mapping?.status??"MISSING"} exact=${report?.mapping?.approvedRows??0} ambiguous=${report?.mapping?.ambiguousRows??0} noNaics=${report?.mapping?.noNaicsRows??0} reason=${report?.mapping?.reason??"-"}`,
    `S10_CLASSES: EXACT=${classes.EXACT??0} AMBIGUOUS=${classes.AMBIGUOUS??0} NO_NAICS=${classes.NO_NAICS??0} NO_PPI=${classes.NO_PPI??0} total=${report?.s10?.classification?.total??0} complete=${report?.s10?.classification?.complete===true?"YES":"NO"}`,
    `S10: ${report?.s10?.status??"PARTIAL"} raw=${num(report?.s10?.raw)} issuerCoverage=${pct(report?.s10?.issuerCoverage)} revenueCoverage=${pct(report?.s10?.revenueCoverage)}`,
    `S11: ${report?.s11?.status??"PARTIAL"} raw=${num(report?.s11?.raw)} transform=${report?.s11?.transform??"-"}`,
    `NETWORK_CALLS: ${report?.networkCalls??0}`,
    `DB_WRITES: ${report?.dbWrites??0}`,
    `PRODUCTION_ACTIVATION: ${report?.policies?.productionActivation===false?"NO":"UNKNOWN"}`,
  ].join("\r\n")+"\r\n";
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const cli=parseArgs();
    const report=await runEarningsR5R14CostPressureDiagnostic({
      incoming:cli.incoming?path.resolve(cli.incoming):undefined,
      coreFile:cli.core?path.resolve(cli.core):undefined,
      mappingFile:cli.mapping?path.resolve(cli.mapping):undefined,
      asOf:cli["as-of"]??undefined,
    });
    const reportsDir=cli["reports-dir"]?path.resolve(cli["reports-dir"]):path.join(defaultBase,"manual-input","e1-r5","reports");
    fs.mkdirSync(reportsDir,{recursive:true});
    const jsonFile=path.join(reportsDir,"e1-r5-r14-cost-pressure-last.json"),textFile=path.join(reportsDir,"e1-r5-r14-cost-pressure-last.txt");
    fs.writeFileSync(jsonFile,JSON.stringify(report,null,2));fs.writeFileSync(textFile,formatEarningsR5R14CostPressureDiagnosticText(report));
    console.log(JSON.stringify({status:report.status,textReport:textFile,jsonReport:jsonFile,networkCalls:0,dbWrites:0}));
  }catch(error){console.log(JSON.stringify({status:"FAILED",code:error?.code??"E1_R5_R14_COST_PRESSURE_FAILED"}));process.exitCode=1;}
}
