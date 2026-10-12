import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {E1_R5_SEC_CONTRACT,validateSecCompanyFactsDocument,secUnitAllowed} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {quarterFromCumulative} from "../../lib/market-score/earnings-e1-r5-contract.mjs";
import {parseBeaA051rcQuarterlyWorkbook,parseBlsSatelliteInputWorkbook} from "../../lib/market-score/earnings-e1-r5-source-parsers.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {sicDivision} from "./earnings-r5-current-frame-audit.mjs";
import {selectDocumentFocusComparablePair} from "./earnings-r5-document-focus-diagnostic.mjs";
import {selectFiscalQuarterFlow} from "./earnings-r5-fiscal-period-diagnostic.mjs";

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const PERIOD_MAX_AGE_DAYS=240;
const FILING_MAX_AGE_DAYS=185;
const ACTIVE_PERIOD_MAX_AGE_DAYS=185;
const PRODUCTIVE_ASSETS_TAG="PaymentsToAcquireProductiveAssets";
const DAY_MS=86400000;
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clean=value=>String(value??"").trim();
const pct=(valid,total)=>Number.isInteger(valid)&&Number.isInteger(total)&&total>0?valid/total:null;
const pctText=value=>finite(value)?`${(100*value).toFixed(1)}%`:"-";

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){const match=item.match(/^--([^=]+)=(.*)$/);if(match)out[match[1]]=match[2];}
  return out;
}
function day(value){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const ms=Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms)?Math.floor(ms/DAY_MS):null;
}
function ageDays(value,asOf){
  const observed=day(value),cutoff=day(asOf);
  return observed!=null&&cutoff!=null?cutoff-observed:null;
}
function duration(row){
  const start=day(row?.start),end=day(row?.end);
  return start!=null&&end!=null&&end>=start?end-start+1:null;
}
function currentFilingFresh(pair,asOf){
  const age=ageDays(pair?.current?.filed,asOf);
  return Number.isInteger(age)&&age>=0&&age<=FILING_MAX_AGE_DAYS;
}
function dualPair(document,metric,asOf){
  const pair=selectDocumentFocusComparablePair(document,{metric,asOf,maxAgeDays:PERIOD_MAX_AGE_DAYS});
  if(!pair.current)return {...pair,dualEligible:false,filingAgeDays:null};
  const filingAgeDays=ageDays(pair.current.filed,asOf);
  return {...pair,dualEligible:currentFilingFresh(pair,asOf),filingAgeDays};
}
function activePair(document,metric,asOf){return selectDocumentFocusComparablePair(document,{metric,asOf,maxAgeDays:ACTIVE_PERIOD_MAX_AGE_DAYS});}
function uniqueLatest(rows){
  if(!rows.length)return null;
  const sorted=[...rows].sort((a,b)=>String(b.filed).localeCompare(String(a.filed))||String(b.accn??"").localeCompare(String(a.accn??"")));
  const latest=sorted[0]?.filed;
  const top=sorted.filter(row=>row.filed===latest);
  return new Set(top.map(row=>row.val)).size===1?top[0]:null;
}
function mappedFactForTarget(document,metric,asOf,target){
  if(!target?.start||!target?.end)return null;
  for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){
    const concept=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]?.[tag];
    if(!concept?.units)continue;
    for(const [unit,rows] of Object.entries(concept.units)){
      if(!secUnitAllowed(metric,unit)||!Array.isArray(rows))continue;
      const matches=rows.filter(row=>{
        if(!row||!finite(row.val)||!E1_R5_SEC_CONTRACT.forms.includes(clean(row.form)))return false;
        if(row.start!==target.start||row.end!==target.end)return false;
        if(day(row.filed)==null||row.filed>asOf)return false;
        const d=duration(row);return Number.isInteger(d)&&d>=55&&d<=120;
      }).map(row=>({...row,tag,unit}));
      const selected=uniqueLatest(matches);
      if(selected)return selected;
    }
  }
  return null;
}
function exactTagFacts(document,tag,asOf){
  const rows=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]?.[tag]?.units?.USD;
  if(!Array.isArray(rows))return [];
  return rows.filter(row=>row&&finite(row.val)&&E1_R5_SEC_CONTRACT.forms.includes(clean(row.form))&&day(row.filed)!=null&&row.filed<=asOf)
    .map(row=>({...row,tag,unit:"USD",duration:duration(row)})).filter(row=>Number.isInteger(row.duration)&&row.duration>=55&&row.duration<=400);
}
function selectExactQuarterFlow(document,tag,asOf,target){
  if(!target?.end)return {value:null,method:null,reason:"TARGET_PERIOD_MISSING"};
  const facts=exactTagFacts(document,tag,asOf);
  const direct=uniqueLatest(facts.filter(row=>row.duration<=120&&row.start===target.start&&row.end===target.end));
  if(direct)return {value:direct.val,method:"DIRECT_QUARTER",fact:direct,reason:null};
  const cumulative=facts.filter(row=>row.duration>120&&row.end===target.end).sort((a,b)=>String(b.filed).localeCompare(String(a.filed))||b.duration-a.duration);
  for(const current of cumulative){
    const priors=facts.filter(prior=>prior.start===current.start&&day(prior.end)<day(current.end)&&prior.duration<current.duration&&day(current.end)-day(prior.end)>=55&&day(current.end)-day(prior.end)<=125)
      .sort((a,b)=>Math.abs((day(current.end)-day(a.end))-90)-Math.abs((day(current.end)-day(b.end))-90)||day(b.end)-day(a.end));
    if(!priors.length)continue;
    const value=quarterFromCumulative(current.val,priors[0].val);
    if(finite(value))return {value,method:"CUMULATIVE_DELTA",fact:current,priorFact:priors[0],reason:null};
  }
  return {value:null,method:null,reason:facts.length?"NO_ALIGNED_QUARTER_FLOW":"NO_FLOW_FACT"};
}
function coverage(eligible,total){return {eligible,total,coverage:pct(eligible,total)};}
function resolveSecJson(directory,cik,nestedName){
  const name=`CIK${cik}.json`;
  const candidates=[path.join(directory,name),path.join(directory,nestedName,name),path.join(directory,path.basename(directory),name)];
  return candidates.find(file=>fs.existsSync(file)&&fs.statSync(file).isFile())??null;
}
function readJson(file){try{return file?JSON.parse(fs.readFileSync(file,"utf8")):null;}catch{return null;}}
function readBuffer(file){try{return fs.readFileSync(file);}catch{return null;}}
function fmtNumber(value,digits=6){return finite(value)?value.toFixed(digits):"-";}

export function buildEarningsR5R9DiagnosticFromDocuments({members=[],factsByCik=new Map(),submissionsByCik=new Map(),asOf,beaBuffer=null,blsInputBuffer=null}={}){
  let validDocuments=0,nonFinancial=0;
  let eps=0,revenue=0,margin=0,net=0,fcf=0,fcfWithProductiveAssets=0;
  let epsRecovered=0,revenueRecovered=0,netRecovered=0;
  let productiveAssetsAdded=0,productiveAssetsDirect=0,productiveAssetsReconstructed=0;
  const filingAgeBuckets={LE60:0,D61_90:0,D91_120:0,D121_185:0,GT185:0};

  const bumpFilingAge=age=>{
    if(!Number.isInteger(age)||age<0)return;
    if(age<=60)filingAgeBuckets.LE60++;
    else if(age<=90)filingAgeBuckets.D61_90++;
    else if(age<=120)filingAgeBuckets.D91_120++;
    else if(age<=185)filingAgeBuckets.D121_185++;
    else filingAgeBuckets.GT185++;
  };

  for(const member of members){
    const cik=String(member?.cik??"").replace(/\D/g,"").padStart(10,"0");
    const document=factsByCik.get(cik);
    const validation=validateSecCompanyFactsDocument(document);
    if(validation.status!=="PASS"||validation.cik!==cik)continue;
    validDocuments++;
    const division=sicDivision(submissionsByCik.get(cik)?.sic);
    const isNonFinancial=division?.financial===false;
    if(isNonFinancial)nonFinancial++;

    const epsDual=dualPair(document,"eps",asOf),revenueDual=dualPair(document,"revenue",asOf),netDual=dualPair(document,"netIncome",asOf);
    if(epsDual.dualEligible){eps++;bumpFilingAge(epsDual.filingAgeDays);if(!activePair(document,"eps",asOf).current)epsRecovered++;}
    if(revenueDual.dualEligible){revenue++;if(!activePair(document,"revenue",asOf).current)revenueRecovered++;}
    if(netDual.dualEligible){net++;if(!activePair(document,"netIncome",asOf).current)netRecovered++;}

    if(!isNonFinancial||!revenueDual.dualEligible)continue;
    const opCurrent=mappedFactForTarget(document,"operatingIncome",asOf,revenueDual.current);
    const opPrior=mappedFactForTarget(document,"operatingIncome",asOf,revenueDual.prior);
    if(opCurrent&&opPrior&&opCurrent.tag===opPrior.tag&&opCurrent.unit===opPrior.unit)margin++;

    const cfo=selectFiscalQuarterFlow(document,{metric:"operatingCashFlow",asOf,target:revenueDual.current});
    const mappedCapex=selectFiscalQuarterFlow(document,{metric:"capex",asOf,target:revenueDual.current});
    if(finite(cfo.value)&&finite(mappedCapex.value)){
      fcf++;fcfWithProductiveAssets++;continue;
    }
    if(!finite(cfo.value))continue;
    const candidate=selectExactQuarterFlow(document,PRODUCTIVE_ASSETS_TAG,asOf,revenueDual.current);
    if(finite(candidate.value)){
      fcfWithProductiveAssets++;productiveAssetsAdded++;
      if(candidate.method==="DIRECT_QUARTER")productiveAssetsDirect++;
      if(candidate.method==="CUMULATIVE_DELTA")productiveAssetsReconstructed++;
    }
  }

  const bea=beaBuffer?parseBeaA051rcQuarterlyWorkbook(beaBuffer,{asOf}):{status:"PARTIAL",reason:"BEA_FILE_MISSING",symmetricYoY:null};
  const blsInput=blsInputBuffer?parseBlsSatelliteInputWorkbook(blsInputBuffer,{asOf}):{status:"PARTIAL",reason:"BLS_INPUT_FILE_MISSING",rootSeriesCount:0,annualized3mReadyCount:0,latestMonthDistribution:{},series:[]};
  const issuerCount=members.length;
  const dualCoverage={
    eps:coverage(eps,issuerCount),
    revenue:coverage(revenue,issuerCount),
    margin:coverage(margin,nonFinancial),
    netIncome:coverage(net,issuerCount),
    fcf:coverage(fcf,nonFinancial),
    fcfWithProductiveAssets:coverage(fcfWithProductiveAssets,nonFinancial),
  };
  return {
    status:"PASS",
    active:false,
    policy:{
      researchOnly:true,
      formulaChanged:false,
      scoringGateChanged:false,
      inputContractChanged:false,
      periodMaxAgeDays:PERIOD_MAX_AGE_DAYS,
      currentFilingMaxAgeDays:FILING_MAX_AGE_DAYS,
      dualGateAccepted:false,
      productiveAssetsAccepted:false,
      q4EpsAnnualMinusNineMonths:"FORBIDDEN",
    },
    counts:{issuerCount,validDocuments,nonFinancial},
    dualCoverage,
    recoveredVs185:{eps:epsRecovered,revenue:revenueRecovered,netIncome:netRecovered},
    dualCurrentFilingAgeBuckets:filingAgeBuckets,
    productiveAssetsSimulation:{
      tag:PRODUCTIVE_ASSETS_TAG,
      accepted:false,
      addedIssuers:productiveAssetsAdded,
      direct:productiveAssetsDirect,
      reconstructed:productiveAssetsReconstructed,
      baselineFcfEligible:fcf,
      candidateFcfEligible:fcfWithProductiveAssets,
      baselineCoverage:dualCoverage.fcf.coverage,
      candidateCoverage:dualCoverage.fcfWithProductiveAssets.coverage,
    },
    s6:{
      status:bea.status,
      reason:bea.reason??null,
      source:bea.source??null,
      currentVintageOnly:bea.currentVintageOnly===true,
      lookAheadSafeHistorical:bea.lookAheadSafeHistorical===true,
      observationCount:bea.observationCount??0,
      latest:bea.latest??null,
      priorYear:bea.priorYear??null,
      rawSymmetricYoY:bea.symmetricYoY??null,
      displayYoYPercent:bea.conventionalYoYPercent??null,
    },
    s10:{
      status:"PARTIAL",
      inputWorkbookStatus:blsInput.status,
      inputReason:blsInput.reason??null,
      rootInputSeries:blsInput.rootSeriesCount??0,
      input3mReadySeries:blsInput.annualized3mReadyCount??0,
      latestMonthDistribution:blsInput.latestMonthDistribution??{},
      outputPpiMappingStatus:"UNRESOLVED",
      issuerNaicsMappingStatus:"UNRESOLVED",
      reason:"OUTPUT_PPI_AND_ISSUER_NAICS_MAPPING_REQUIRED",
      inputExperimental:blsInput.experimental===true,
      currentVintageOnly:blsInput.currentVintageOnly===true,
      lookAheadSafeHistorical:blsInput.lookAheadSafeHistorical===true,
    },
    networkCalls:0,
    dbWrites:0,
  };
}

export function formatEarningsR5R9DiagnosticText(report){
  const c=report?.dualCoverage??{};
  const coverageText=(name,item)=>`${name}:${pctText(item?.coverage)}(${item?.eligible??0}/${item?.total??0})`;
  const buckets=Object.entries(report?.dualCurrentFilingAgeBuckets??{}).filter(([,value])=>value).map(([key,value])=>`${key}:${value}`).join(" ")||"-";
  const months=Object.entries(report?.s10?.latestMonthDistribution??{}).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,12).map(([key,value])=>`${key}:${value}`).join(" ")||"-";
  const lines=[
    `E1-R5 R9 POLICY/SOURCE AUDIT: ${report?.status??"UNKNOWN"}`,
    `AT: ${report?.at??"-"}`,
    `AS_OF: ${report?.asOf??"-"}`,
    `POLICY: RESEARCH_ONLY formulaChanged=${report?.policy?.formulaChanged===true?"true":"false"} gateChanged=${report?.policy?.scoringGateChanged===true?"true":"false"} contractChanged=${report?.policy?.inputContractChanged===true?"true":"false"} periodMaxAgeDays=${report?.policy?.periodMaxAgeDays??"-"} filingMaxAgeDays=${report?.policy?.currentFilingMaxAgeDays??"-"} dualAccepted=${report?.policy?.dualGateAccepted===true?"true":"false"}`,
    `FILES: companyFacts=${report?.files?.companyFacts??0} submissions=${report?.files?.submissions??0} bea=${report?.files?.bea?"YES":"NO"} blsInput=${report?.files?.blsInput?"YES":"NO"}`,
    `DUAL_GATE_COVERAGE: ${coverageText("EPS",c.eps)} ${coverageText("REVENUE",c.revenue)} ${coverageText("MARGIN",c.margin)} ${coverageText("NET",c.netIncome)} ${coverageText("FCF",c.fcf)}`,
    `RECOVERED_VS_185: EPS=${report?.recoveredVs185?.eps??0} REVENUE=${report?.recoveredVs185?.revenue??0} NET=${report?.recoveredVs185?.netIncome??0}`,
    `DUAL_CURRENT_FILING_AGE: ${buckets}`,
    `PRODUCTIVE_ASSETS_SIMULATION: tag=${report?.productiveAssetsSimulation?.tag??"-"} baseline=${pctText(report?.productiveAssetsSimulation?.baselineCoverage)} candidate=${pctText(report?.productiveAssetsSimulation?.candidateCoverage)} added=${report?.productiveAssetsSimulation?.addedIssuers??0} direct=${report?.productiveAssetsSimulation?.direct??0} reconstructed=${report?.productiveAssetsSimulation?.reconstructed??0} accepted=${report?.productiveAssetsSimulation?.accepted===true?"true":"false"}`,
    `S6_BEA: ${report?.s6?.status??"PARTIAL"} latest=${report?.s6?.latest?.period??"-"} current=${fmtNumber(report?.s6?.latest?.value,3)} prior=${report?.s6?.priorYear?.period??"-"} priorValue=${fmtNumber(report?.s6?.priorYear?.value,3)} rawSymmetric=${fmtNumber(report?.s6?.rawSymmetricYoY)} displayYoY=${finite(report?.s6?.displayYoYPercent)?report.s6.displayYoYPercent.toFixed(3)+"%":"-"} currentVintageOnly=${report?.s6?.currentVintageOnly===true?"true":"false"} lookAheadSafeHistorical=${report?.s6?.lookAheadSafeHistorical===true?"true":"false"} reason=${report?.s6?.reason??"-"}`,
    `S10_BLS_INPUT: ${report?.s10?.inputWorkbookStatus??"PARTIAL"} rootSeries=${report?.s10?.rootInputSeries??0} ready3m=${report?.s10?.input3mReadySeries??0} latestMonths=${months}`,
    `S10_STATUS: ${report?.s10?.status??"PARTIAL"} outputPpi=${report?.s10?.outputPpiMappingStatus??"-"} issuerNaics=${report?.s10?.issuerNaicsMappingStatus??"-"} reason=${report?.s10?.reason??"-"}`,
    `Q4_EPS_ANNUAL_MINUS_9M: ${report?.policy?.q4EpsAnnualMinusNineMonths??"-"}`,
    `NETWORK_CALLS: ${report?.networkCalls??"-"}`,
    `DB_WRITES: ${report?.dbWrites??"-"}`,
  ];
  return lines.join("\r\n")+"\r\n";
}

export async function runEarningsR5R9Diagnostic(options={}){
  const incoming=options.incoming??path.join(defaultBase,"manual-input","e1-r5","incoming");
  const coreFile=options.coreFile??path.join(defaultBase,"storage","core.sqlite");
  const asOf=options.asOf??new Date().toISOString().slice(0,10);
  const universe=readLatestEarningsUniverse(coreFile);
  const members=universe.members??[];
  const companyFactsDir=options.companyFactsDir??path.join(incoming,"companyfacts");
  const submissionsDir=options.submissionsDir??path.join(incoming,"submissions");
  const factsByCik=new Map(),submissionsByCik=new Map();
  for(const member of members){
    const cik=String(member?.cik??"").replace(/\D/g,"").padStart(10,"0");
    factsByCik.set(cik,readJson(resolveSecJson(companyFactsDir,cik,"companyfacts")));
    submissionsByCik.set(cik,readJson(resolveSecJson(submissionsDir,cik,"submissions")));
  }
  const beaFile=options.beaFile??path.join(incoming,"bea-section1-all.xlsx");
  const blsInputFile=options.blsInputFile??path.join(incoming,"bls-satellite-input-to-industry-indexes.xlsx");
  const beaBuffer=readBuffer(beaFile),blsInputBuffer=readBuffer(blsInputFile);
  const report=buildEarningsR5R9DiagnosticFromDocuments({members,factsByCik,submissionsByCik,asOf,beaBuffer,blsInputBuffer});
  report.at=new Date().toISOString();report.asOf=asOf;
  report.files={companyFacts:factsByCik.size,submissions:submissionsByCik.size,bea:Boolean(beaBuffer),blsInput:Boolean(blsInputBuffer)};
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const cli=parseArgs();
    const report=await runEarningsR5R9Diagnostic({
      incoming:cli.incoming?path.resolve(cli.incoming):undefined,
      coreFile:cli.core?path.resolve(cli.core):undefined,
      companyFactsDir:cli["companyfacts-dir"]?path.resolve(cli["companyfacts-dir"]):undefined,
      submissionsDir:cli["submissions-dir"]?path.resolve(cli["submissions-dir"]):undefined,
      beaFile:cli.bea?path.resolve(cli.bea):undefined,
      blsInputFile:cli["bls-input"]?path.resolve(cli["bls-input"]):undefined,
      asOf:cli["as-of"]??undefined,
    });
    console.log(formatEarningsR5R9DiagnosticText(report));
  }catch(error){
    console.log(`E1-R5 R9 POLICY/SOURCE AUDIT: FAILED\r\nCODE: ${error?.code??"E1_R5_R9_AUDIT_FAILED"}`);
    process.exitCode=1;
  }
}
