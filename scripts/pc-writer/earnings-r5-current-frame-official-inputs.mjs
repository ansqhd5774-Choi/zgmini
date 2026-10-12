import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {parseBeaA051rcQuarterlyWorkbook,parseBlsSatelliteInputWorkbook} from "../../lib/market-score/earnings-e1-r5-source-parsers.mjs";
import {
  E1_R5_R4_BLS_SOURCE_CONTRACT,
  buildS10CostPressureCoverage,
  parseBlsNetOutputSeries,
  parseBlsPpiOutputData,
  validateApprovedSicNaics3Mapping,
} from "../../lib/market-score/earnings-e1-r5-cost-pressure-sources.mjs";

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const nearlyEqual=(a,b,tolerance=1e-9)=>finite(a)&&finite(b)&&Math.abs(a-b)<=tolerance;

function readText(file){return file&&fs.existsSync(file)&&fs.statSync(file).isFile()?fs.readFileSync(file,"utf8"):null;}
function readJson(file){try{return file&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,"utf8")):null;}catch{return null;}}
function asMonth(asOf){return /^\d{4}-\d{2}-\d{2}$/.test(String(asOf??""))?`${asOf.slice(0,7)}-01`:"9999-12-01";}

export function selectBeaCorporateProfitsForFrame(parsed,frame){
  const observations=Array.isArray(parsed?.observations)?parsed.observations:[];
  const current=observations.find(row=>row?.year===frame?.year&&row?.quarter===frame?.quarter)??null;
  const priorYear=observations.find(row=>row?.year===frame?.year-1&&row?.quarter===frame?.quarter)??null;
  if(!current||!priorYear||!finite(current.value)||!finite(priorYear.value)){
    return {status:"MISSING",reason:"BEA_FRAME_PAIR_REQUIRED",source:parsed?.source??"BEA_NIPA_T11200_CURRENT_WORKBOOK",current:null,priorYear:null,input:null};
  }
  return {
    status:"READY",
    reason:null,
    source:parsed?.source??"BEA_NIPA_T11200_CURRENT_WORKBOOK",
    seriesCode:parsed?.seriesCode??E1_R5_OFFICIAL_SOURCE_MANIFEST.beaCorporateProfits.seriesCode,
    current,
    priorYear,
    input:{current:current.value,priorYear:priorYear.value},
  };
}

export function buildProducerIndustriesFromS10Result({s10,inputSeries=[],outputSeries=[]}={}){
  if(s10?.status!=="PASS"||!finite(s10?.raw)||!finite(s10?.eligibleRevenue)||!finite(s10?.mappedRevenue)||s10.eligibleRevenue<=0||s10.mappedRevenue<=0){
    return {status:"MISSING",reason:"S10_PASS_WITH_REVENUE_REQUIRED",producerIndustries:[]};
  }
  if(s10?.weighting!=="PRIOR_REVENUE_MAPPED_ONLY"||s10?.formula!=="SUM_PRIOR_REVENUE_WEIGHT*(INPUT_3M_ANN-OUTPUT_3M_ANN)"){
    return {status:"REJECTED",reason:"S10_POLICY_MISMATCH",producerIndustries:[]};
  }
  if(s10?.classification?.complete!==true){
    return {status:"REJECTED",reason:"S10_CLASSIFICATION_INCOMPLETE",producerIndustries:[]};
  }
  const inputByNaics=new Map((inputSeries??[]).filter(row=>/^\d{3}$/.test(String(row?.naics??""))).map(row=>[String(row.naics),row]));
  const outputByNaics=new Map((outputSeries??[]).filter(row=>/^\d{3}$/.test(String(row?.naics3??""))).map(row=>[String(row.naics3),row]));
  const producerIndustries=[];
  let mappedRevenue=0,weightedPressure=0;
  for(const sector of s10?.sectors??[]){
    const naics3=String(sector?.naics3??"");
    const input=inputByNaics.get(naics3),output=outputByNaics.get(naics3);
    const values=[sector?.priorRevenue,input?.latest?.value,input?.lag3m?.value,output?.latest?.value,output?.lag3m?.value,input?.annualized3m,output?.annualized3m,sector?.pressure];
    if(!values.every(finite)||sector.priorRevenue<=0){
      return {status:"REJECTED",reason:"S10_SECTOR_SOURCE_PAIR_MISSING",naics3,producerIndustries:[]};
    }
    if(!nearlyEqual(input.annualized3m,sector.inputAnnualized3m)||!nearlyEqual(output.annualized3m,sector.outputAnnualized3m)||!nearlyEqual(input.annualized3m-output.annualized3m,sector.pressure)){
      return {status:"REJECTED",reason:"S10_SECTOR_SOURCE_MISMATCH",naics3,producerIndustries:[]};
    }
    mappedRevenue+=sector.priorRevenue;
    weightedPressure+=sector.priorRevenue*sector.pressure;
    producerIndustries.push({
      naics3,
      priorRevenue:sector.priorRevenue,
      inputCurrent:input.latest.value,
      inputLag3m:input.lag3m.value,
      outputCurrent:output.latest.value,
      outputLag3m:output.lag3m.value,
      issuerCount:sector.issuerCount??null,
      source:"BLS_R14_EXACT_NAICS3",
    });
  }
  const reconstructedRaw=mappedRevenue>0?weightedPressure/mappedRevenue:null;
  if(!nearlyEqual(mappedRevenue,s10.mappedRevenue,1e-6)||!nearlyEqual(reconstructedRaw,s10.raw,1e-9)){
    return {status:"REJECTED",reason:"S10_RECONSTRUCTION_MISMATCH",producerIndustries:[]};
  }
  const unmatchedRevenue=s10.eligibleRevenue-s10.mappedRevenue;
  if(unmatchedRevenue<-1e-6){
    return {status:"REJECTED",reason:"S10_REVENUE_DENOMINATOR_INVALID",producerIndustries:[]};
  }
  if(unmatchedRevenue>1e-6){
    producerIndustries.push({priorRevenue:unmatchedRevenue,source:"BLS_R14_UNMAPPED_STRICT_DENOMINATOR"});
  }
  return {
    status:"READY",
    reason:null,
    raw:s10.raw,
    issuerCoverage:s10.issuerCoverage??null,
    revenueCoverage:s10.revenueCoverage??null,
    mappedRevenue:s10.mappedRevenue,
    eligibleRevenue:s10.eligibleRevenue,
    producerIndustries,
  };
}

export function loadEarningsR5CurrentFrameOfficialInputs({inputDir,issuerRows=[],frame,asOf,mappingFile}={}){
  const directory=inputDir??path.join(defaultBase,"manual-input","e1-r5","incoming");
  const approvedMappingFile=mappingFile??path.join(defaultBase,"manual-input","e1-r5","approved-sic-naics3.json");

  const beaFile=path.join(directory,E1_R5_OFFICIAL_SOURCE_MANIFEST.beaCorporateProfits.localName);
  const beaParsed=fs.existsSync(beaFile)
    ?parseBeaA051rcQuarterlyWorkbook(fs.readFileSync(beaFile),{seriesCode:E1_R5_OFFICIAL_SOURCE_MANIFEST.beaCorporateProfits.seriesCode,asOf})
    :{status:"MISSING",reason:"BEA_NIPA_SECTION1_XLSX_REQUIRED",observations:[]};
  const s6=selectBeaCorporateProfitsForFrame(beaParsed,frame);

  const inputFile=path.join(directory,E1_R5_OFFICIAL_SOURCE_MANIFEST.blsProducerInput.localName);
  const inputReport=fs.existsSync(inputFile)
    ?parseBlsSatelliteInputWorkbook(fs.readFileSync(inputFile),{asOf})
    :{status:"MISSING",reason:"BLS_INPUT_XLSX_REQUIRED",series:[]};
  const outputSeriesText=readText(path.join(directory,E1_R5_R4_BLS_SOURCE_CONTRACT.outputSeries.localName));
  const outputDataText=readText(path.join(directory,E1_R5_R4_BLS_SOURCE_CONTRACT.outputData.localName));
  const outputMeta=outputSeriesText?parseBlsNetOutputSeries(outputSeriesText):{status:"MISSING",reason:"BLS_PC_SERIES_REQUIRED",series:[]};
  const outputReport=outputDataText&&outputMeta.status==="PASS"
    ?parseBlsPpiOutputData(outputDataText,{series:outputMeta.series,asOfMonth:asMonth(asOf)})
    :{status:"MISSING",reason:outputDataText?"BLS_PC_NET_OUTPUT_SERIES_REQUIRED":"BLS_PC_DATA_REQUIRED",series:[]};
  const mapping=validateApprovedSicNaics3Mapping(readJson(approvedMappingFile));
  const s10Report=buildS10CostPressureCoverage({issuerRows,approvedMapping:mapping,inputSeries:inputReport.series??[],outputSeries:outputReport.series??[]});
  const s10=buildProducerIndustriesFromS10Result({s10:s10Report,inputSeries:inputReport.series??[],outputSeries:outputReport.series??[]});

  return {
    s6:{...s6,parserStatus:beaParsed.status,parserReason:beaParsed.reason??null},
    s10:{...s10,mappingStatus:mapping.status,inputStatus:inputReport.status,outputStatus:outputReport.status,classification:s10Report.classification??null},
    beaCorporateProfits:s6.status==="READY"?s6.input:null,
    producerIndustries:s10.status==="READY"?s10.producerIndustries:[],
    policy:{researchOnly:true,formulaChanged:false,weightChanged:false,scoringGateChanged:false,productionActivation:false},
    networkCalls:0,
    dbWrites:0,
  };
}
