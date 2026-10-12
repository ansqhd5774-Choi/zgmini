import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  E1_R5_SEC_CONTRACT,
  secUnitAllowed,
  validateSecCompanyFactsDocument,
} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {latestMatureFrame,MATURE_LAG_DAYS} from "../../lib/market-score/sec-earnings-e1-r2-provider.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {
  buildIssuerRowFromDocuments,
  selectCompanyFact,
  selectCurrentQuarterFlow,
} from "./earnings-r5-current-frame-audit.mjs";

export const E1_R5_CURRENT_FRAME_COVERAGE_DIAGNOSTIC_VERSION="E1-R5-CURRENT-FRAME-COVERAGE-DIAGNOSTIC-R1";

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const day=value=>{
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const ms=Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(ms)?Math.floor(ms/86400000):null;
};
const durationDays=fact=>{
  const start=day(fact?.start),end=day(fact?.end);
  return start!=null&&end!=null&&end>=start?end-start+1:null;
};
const pct=value=>finite(value)?`${(100*value).toFixed(1)}%`:"-";

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){
    const match=item.match(/^--([^=]+)=(.*)$/);
    if(match)out[match[1]]=match[2];
  }
  return out;
}
function readJson(file){try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function companyFile(directory,cik){
  const file=path.join(directory,`CIK${cik}.json`);
  return fs.existsSync(file)?file:null;
}
function samePeriod(a,b){
  if(!a||!b)return false;
  const ae=day(a.end),be=day(b.end),ad=a.duration??durationDays(a),bd=b.duration??durationDays(b);
  return ae!=null&&be!=null&&Number.isInteger(ad)&&Number.isInteger(bd)&&Math.abs(ae-be)<=45&&Math.abs(ad-bd)<=45;
}
function pairCompatible(current,prior){
  if(!current||!prior||current.tag!==prior.tag||current.unit!==prior.unit)return false;
  const ce=day(current.end),pe=day(prior.end);
  const cd=current.duration??durationDays(current),pd=prior.duration??durationDays(prior);
  if(ce==null||pe==null||!Number.isInteger(cd)||!Number.isInteger(pd))return false;
  const gap=ce-pe;
  return gap>=320&&gap<=410&&Math.abs(cd-pd)<=45;
}
function currentStatus(selected){
  if(selected?.fact)return "READY";
  if(selected?.reason==="LATEST_FILED_VALUE_CONFLICT")return "CONFLICT";
  return "MISSING";
}
function selectCurrent(document,{metric,frame,asOf}){
  const selected=selectCompanyFact(document,{metric,frame:frame.frame,frameEnd:frame.end,asOf});
  return {...selected,status:currentStatus(selected)};
}

export function diagnoseComparablePair(document,{metric,frame,asOf}={}){
  const tags=E1_R5_SEC_CONTRACT.tags?.[metric]??[];
  let sawCurrent=false,sawPrior=false;
  for(const tag of tags){
    const current=selectCompanyFact(document,{metric,frame:frame.frame,frameEnd:frame.end,asOf,tag});
    const prior=selectCompanyFact(document,{metric,frame:frame.priorFrame,frameEnd:frame.priorEnd,asOf,tag});
    if(current.reason==="LATEST_FILED_VALUE_CONFLICT")return {status:"CURRENT_CONFLICT",tag,current:null,prior:null};
    if(prior.reason==="LATEST_FILED_VALUE_CONFLICT")return {status:"PRIOR_CONFLICT",tag,current:null,prior:null};
    if(current.fact)sawCurrent=true;
    if(prior.fact)sawPrior=true;
    if(current.fact&&prior.fact&&pairCompatible(current.fact,prior.fact)){
      return {status:"READY",tag,current:current.fact,prior:prior.fact};
    }
  }
  if(!sawCurrent&&!sawPrior)return {status:"BOTH_MISSING",tag:null,current:null,prior:null};
  if(!sawCurrent)return {status:"CURRENT_MISSING",tag:null,current:null,prior:null};
  if(!sawPrior)return {status:"PRIOR_MISSING",tag:null,current:null,prior:null};
  return {status:"PAIR_INCOMPATIBLE",tag:null,current:null,prior:null};
}

function flowStatus(flow){
  if(finite(flow?.value))return flow.method==="CUMULATIVE_DELTA"?"READY_CUMULATIVE_DELTA":"READY_DIRECT_QUARTER";
  return flow?.reason??"MISSING";
}

export function diagnoseIssuerCoverage({member,companyFacts,submission,frame,asOf}={}){
  const cik=String(member?.cik??"").padStart(10,"0");
  const validation=validateSecCompanyFactsDocument(companyFacts);
  if(validation.status!=="PASS"||validation.cik!==cik){
    return {
      cik,ticker:member?.ticker??null,
      valid:false,
      isFinancial:null,
      actual:{S1:false,S2:false,S3:false,S4:false,S5:false,S7:false,S8:false},
      potential:{S1:false,S2:false,S3:false,S4:false,S5:false,S7:false,S8:false},
      reasons:{S1:"INVALID_COMPANYFACTS",S2:"INVALID_COMPANYFACTS",S3:"NOT_IN_NONFINANCIAL_DENOMINATOR",S4:"NOT_IN_NONFINANCIAL_DENOMINATOR",S5:"NOT_IN_NONFINANCIAL_DENOMINATOR",S7:"INVALID_COMPANYFACTS",S8:"INVALID_COMPANYFACTS"},
      pair:{eps:"INVALID_COMPANYFACTS",revenue:"INVALID_COMPANYFACTS",operatingIncome:"INVALID_COMPANYFACTS",netIncome:"INVALID_COMPANYFACTS"},
      currentOnly:{revenue:"INVALID_COMPANYFACTS",operatingIncome:"INVALID_COMPANYFACTS",netIncome:"INVALID_COMPANYFACTS"},
      flow:{operatingCashFlow:"TARGET_PERIOD_MISSING",capex:"TARGET_PERIOD_MISSING"},
    };
  }

  const row=buildIssuerRowFromDocuments({member,companyFacts,submission,frame,asOf});
  const epsPair=diagnoseComparablePair(companyFacts,{metric:"eps",frame,asOf});
  const revenuePair=diagnoseComparablePair(companyFacts,{metric:"revenue",frame,asOf});
  const opPair=diagnoseComparablePair(companyFacts,{metric:"operatingIncome",frame,asOf});
  const netPair=diagnoseComparablePair(companyFacts,{metric:"netIncome",frame,asOf});
  const revenueCurrent=selectCurrent(companyFacts,{metric:"revenue",frame,asOf});
  const opCurrent=selectCurrent(companyFacts,{metric:"operatingIncome",frame,asOf});
  const netCurrent=selectCurrent(companyFacts,{metric:"netIncome",frame,asOf});
  const cfoPotential=selectCurrentQuarterFlow(companyFacts,{metric:"operatingCashFlow",asOf,target:revenueCurrent.fact});
  const capexPotential=selectCurrentQuarterFlow(companyFacts,{metric:"capex",asOf,target:revenueCurrent.fact});

  const nonFinancial=row.isFinancial===false;
  const current=row.current??{},prior=row.priorYear??{};
  const actual={
    S1:finite(current.eps)&&finite(prior.eps),
    S2:finite(current.revenue)&&finite(prior.revenue)&&prior.revenue>0,
    S3:nonFinancial&&finite(current.operatingIncome)&&finite(current.revenue)&&current.revenue>0,
    S4:nonFinancial&&finite(current.operatingIncome)&&finite(current.revenue)&&current.revenue>0&&finite(prior.operatingIncome)&&finite(prior.revenue)&&prior.revenue>0,
    S5:nonFinancial&&finite(current.operatingCashFlow)&&finite(current.capex)&&finite(current.revenue)&&current.revenue>0,
    S7:finite(current.eps)&&finite(prior.eps),
    S8:finite(current.netIncome),
  };
  const potentialS3=nonFinancial&&revenueCurrent.status==="READY"&&opCurrent.status==="READY"&&revenueCurrent.fact.val>0&&samePeriod(revenueCurrent.fact,opCurrent.fact);
  const potentialS5=nonFinancial&&revenueCurrent.status==="READY"&&revenueCurrent.fact.val>0&&finite(cfoPotential.value)&&finite(capexPotential.value);
  const potentialS8=netCurrent.status==="READY";
  const potential={...actual,S3:potentialS3,S5:potentialS5,S8:potentialS8};

  const reasons={};
  reasons.S1=actual.S1?"READY":`EPS_${epsPair.status}`;
  reasons.S7=reasons.S1;
  reasons.S2=actual.S2?"READY":revenuePair.status!=="READY"?`REVENUE_${revenuePair.status}`:"PRIOR_REVENUE_NONPOSITIVE";
  if(!nonFinancial){
    reasons.S3=reasons.S4=reasons.S5="NOT_IN_NONFINANCIAL_DENOMINATOR";
  }else{
    reasons.S3=actual.S3?"READY":
      revenueCurrent.status!=="READY"?`REVENUE_CURRENT_${revenueCurrent.status}`:
      !(revenueCurrent.fact.val>0)?"CURRENT_REVENUE_NONPOSITIVE":
      opCurrent.status!=="READY"?`OPERATING_INCOME_CURRENT_${opCurrent.status}`:
      !samePeriod(revenueCurrent.fact,opCurrent.fact)?"CURRENT_PERIOD_MISMATCH":
      potentialS3?"PAIR_DEPENDENCY_ONLY":"OTHER";
    reasons.S4=actual.S4?"READY":
      revenuePair.status!=="READY"?`REVENUE_${revenuePair.status}`:
      opPair.status!=="READY"?`OPERATING_INCOME_${opPair.status}`:
      !samePeriod(revenuePair.current,opPair.current)||!samePeriod(revenuePair.prior,opPair.prior)?"PAIR_PERIOD_MISMATCH":"OTHER";
    reasons.S5=actual.S5?"READY":
      revenueCurrent.status!=="READY"?`REVENUE_CURRENT_${revenueCurrent.status}`:
      !(revenueCurrent.fact.val>0)?"CURRENT_REVENUE_NONPOSITIVE":
      !finite(cfoPotential.value)?`CFO_${flowStatus(cfoPotential)}`:
      !finite(capexPotential.value)?`CAPEX_${flowStatus(capexPotential)}`:
      potentialS5?"PAIR_DEPENDENCY_ONLY":"OTHER";
  }
  reasons.S8=actual.S8?"READY":
    netCurrent.status!=="READY"?`NET_INCOME_CURRENT_${netCurrent.status}`:
    potentialS8?"PAIR_DEPENDENCY_ONLY":"OTHER";

  return {
    cik,ticker:member?.ticker??null,
    valid:true,
    isFinancial:row.isFinancial,
    actual,potential,reasons,
    pair:{eps:epsPair.status,revenue:revenuePair.status,operatingIncome:opPair.status,netIncome:netPair.status},
    currentOnly:{revenue:revenueCurrent.status,operatingIncome:opCurrent.status,netIncome:netCurrent.status},
    flow:{operatingCashFlow:flowStatus(cfoPotential),capex:flowStatus(capexPotential)},
  };
}

function inc(object,key){object[key]=(object[key]??0)+1;}
function addSample(samples,component,reason,row,limit=8){
  if(reason==="READY"||reason==="NOT_IN_NONFINANCIAL_DENOMINATOR")return;
  samples[component]??={};samples[component][reason]??=[];
  if(samples[component][reason].length<limit)samples[component][reason].push({ticker:row.ticker,cik:row.cik});
}
function coverage(ready,denominator){return denominator>0?ready/denominator:null;}
function neededForGate(ready,denominator,min){
  if(denominator<=0)return null;
  return Math.max(0,Math.ceil(min*denominator-1e-12)-ready);
}

export function aggregateCoverageDiagnostics(rows){
  const meta={
    S1:{label:"EPS_GROWTH",min:0.80,universe:"ALL"},
    S2:{label:"REVENUE_GROWTH",min:0.80,universe:"ALL"},
    S3:{label:"OPERATING_MARGIN_LEVEL",min:0.80,universe:"NON_FINANCIAL"},
    S4:{label:"OPERATING_MARGIN_CHANGE",min:0.80,universe:"NON_FINANCIAL"},
    S5:{label:"FCF_MARGIN",min:0.70,universe:"NON_FINANCIAL"},
    S7:{label:"EPS_BREADTH",min:0.80,universe:"ALL"},
    S8:{label:"PROFITABLE_BREADTH",min:0.80,universe:"ALL"},
  };
  const counts={},reasons={},samples={};
  const pair={},currentOnly={},flow={};
  for(const key of Object.keys(meta))counts[key]={denominator:0,actualReady:0,potentialReady:0};
  for(const row of rows){
    for(const metric of Object.keys(row.pair??{})){pair[metric]??={};inc(pair[metric],row.pair[metric]);}
    for(const metric of Object.keys(row.currentOnly??{})){currentOnly[metric]??={};inc(currentOnly[metric],row.currentOnly[metric]);}
    for(const metric of Object.keys(row.flow??{})){flow[metric]??={};inc(flow[metric],row.flow[metric]);}
    for(const [key,m] of Object.entries(meta)){
      const inDenominator=m.universe==="ALL"||row.isFinancial===false;
      if(!inDenominator)continue;
      counts[key].denominator++;
      if(row.actual?.[key])counts[key].actualReady++;
      if(row.potential?.[key])counts[key].potentialReady++;
      const reason=row.reasons?.[key]??"UNKNOWN";
      reasons[key]??={};inc(reasons[key],reason);addSample(samples,key,reason,row);
    }
  }
  const components={};
  for(const [key,m] of Object.entries(meta)){
    const c=counts[key];
    components[key]={
      ...m,
      denominator:c.denominator,
      actualReady:c.actualReady,
      actualCoverage:coverage(c.actualReady,c.denominator),
      potentialReady:c.potentialReady,
      semanticPotentialCoverage:coverage(c.potentialReady,c.denominator),
      incrementalPotential:c.potentialReady-c.actualReady,
      additionalNeededForGate:neededForGate(c.actualReady,c.denominator,m.min),
      additionalNeededAfterSemanticPotential:neededForGate(c.potentialReady,c.denominator,m.min),
      reasons:reasons[key]??{},
      samples:samples[key]??{},
    };
  }
  return {components,pair,currentOnly,flow};
}

export function runEarningsR5CurrentFrameCoverageDiagnostic({
  incoming,
  coreFile,
  asOf=new Date().toISOString().slice(0,10),
  lagDays=MATURE_LAG_DAYS,
}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming");
  const core=coreFile??path.join(defaultBase,"storage","core.sqlite");
  const universe=readLatestEarningsUniverse(core);
  const frame=latestMatureFrame(asOf,{lagDays});
  if(universe.status!=="PASS"||!frame){
    return {
      version:E1_R5_CURRENT_FRAME_COVERAGE_DIAGNOSTIC_VERSION,
      status:"PARTIAL",
      reason:universe.status!=="PASS"?"UNIVERSE_REQUIRED":"MATURE_FRAME_REQUIRED",
      active:false,networkCalls:0,dbReads:1,dbWrites:0,productionActivation:false,
    };
  }
  const factsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory);
  const submissionsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory);
  const rows=[];let companyFactsFiles=0,submissionFiles=0,invalidCompanyFacts=0;
  for(const member of universe.members){
    const factFile=companyFile(factsDir,member.cik),submissionFile=companyFile(submissionsDir,member.cik);
    if(factFile)companyFactsFiles++;
    if(submissionFile)submissionFiles++;
    const facts=factFile?readJson(factFile):null;
    const submission=submissionFile?readJson(submissionFile):null;
    const row=diagnoseIssuerCoverage({member,companyFacts:facts,submission,frame,asOf});
    if(!row.valid)invalidCompanyFacts++;
    rows.push(row);
  }
  const aggregate=aggregateCoverageDiagnostics(rows);
  return {
    version:E1_R5_CURRENT_FRAME_COVERAGE_DIAGNOSTIC_VERSION,
    status:"COMPLETE",
    at:new Date().toISOString(),
    asOf,
    active:false,
    frame,
    universe:{periodEnd:universe.periodEnd,memberCount:universe.memberCount},
    sourceCoverage:{companyFactsFiles,submissionFiles,invalidCompanyFacts},
    ...aggregate,
    policies:{
      diagnosticOnly:true,
      currentFrameFormulaChanged:false,
      weightChanged:false,
      scoringGateChanged:false,
      productionActivation:false,
      q4EpsAnnualMinusNineMonths:"FORBIDDEN",
    },
    networkCalls:0,
    dbReads:1,
    dbWrites:0,
    fileWrites:2,
  };
}

export function formatEarningsR5CurrentFrameCoverageDiagnosticText(report){
  const lines=[
    `E1-R5 CURRENT FRAME COVERAGE DIAGNOSTIC: ${report?.status??"UNKNOWN"}`,
    `VERSION: ${report?.version??"-"}`,
    `AT: ${report?.at??"-"}`,
    `AS_OF: ${report?.asOf??"-"}`,
    `FRAME: ${report?.frame?.frame??"-"} prior=${report?.frame?.priorFrame??"-"} end=${report?.frame?.end??"-"}`,
    `UNIVERSE: ${report?.universe?.memberCount??0} period=${report?.universe?.periodEnd??"-"}`,
    `FILES: companyFacts=${report?.sourceCoverage?.companyFactsFiles??0} submissions=${report?.sourceCoverage?.submissionFiles??0} invalid=${report?.sourceCoverage?.invalidCompanyFacts??0}`,
  ];
  for(const [key,row] of Object.entries(report?.components??{})){
    lines.push(
      `${key}_${row.label}: actual=${pct(row.actualCoverage)} ${row.actualReady}/${row.denominator} min=${pct(row.min)} need=${row.additionalNeededForGate} potential=${pct(row.semanticPotentialCoverage)} ${row.potentialReady}/${row.denominator} gain=${row.incrementalPotential} needAfterPotential=${row.additionalNeededAfterSemanticPotential}`,
      `${key}_REASONS: ${Object.entries(row.reasons??{}).sort((a,b)=>b[1]-a[1]).map(([reason,count])=>`${reason}=${count}`).join(" ")||"NONE"}`
    );
  }
  for(const [metric,counts] of Object.entries(report?.pair??{})){
    lines.push(`PAIR_${metric.toUpperCase()}: ${Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([reason,count])=>`${reason}=${count}`).join(" ")||"NONE"}`);
  }
  for(const [metric,counts] of Object.entries(report?.currentOnly??{})){
    lines.push(`CURRENT_ONLY_${metric.toUpperCase()}: ${Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([reason,count])=>`${reason}=${count}`).join(" ")||"NONE"}`);
  }
  for(const [metric,counts] of Object.entries(report?.flow??{})){
    lines.push(`FLOW_${metric.toUpperCase()}: ${Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([reason,count])=>`${reason}=${count}`).join(" ")||"NONE"}`);
  }
  lines.push(
    `FORMULA_CHANGED: ${report?.policies?.currentFrameFormulaChanged===true?"YES":"NO"}`,
    `WEIGHT_CHANGED: ${report?.policies?.weightChanged===true?"YES":"NO"}`,
    `SCORING_GATE_CHANGED: ${report?.policies?.scoringGateChanged===true?"YES":"NO"}`,
    `PRODUCTION_ACTIVATION: ${report?.policies?.productionActivation===true?"YES":"NO"}`,
    `NETWORK_CALLS: ${report?.networkCalls??0}`,
    `DB_WRITES: ${report?.dbWrites??0}`,
  );
  return lines.join("\r\n")+"\r\n";
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const cli=parseArgs();
    const report=runEarningsR5CurrentFrameCoverageDiagnostic({
      incoming:cli.incoming?path.resolve(cli.incoming):undefined,
      coreFile:cli.core?path.resolve(cli.core):undefined,
      asOf:cli["as-of"]??undefined,
    });
    const reportsDir=cli["reports-dir"]?path.resolve(cli["reports-dir"]):path.join(defaultBase,"manual-input","e1-r5","reports");
    fs.mkdirSync(reportsDir,{recursive:true});
    const jsonFile=path.join(reportsDir,"e1-r5-current-frame-coverage-diagnostic-last.json");
    const textFile=path.join(reportsDir,"e1-r5-current-frame-coverage-diagnostic-last.txt");
    fs.writeFileSync(jsonFile,JSON.stringify(report,null,2));
    fs.writeFileSync(textFile,formatEarningsR5CurrentFrameCoverageDiagnosticText(report));
    console.log(JSON.stringify({status:report.status,textReport:textFile,jsonReport:jsonFile,networkCalls:0,dbWrites:0}));
    if(report.status!=="COMPLETE")process.exitCode=1;
  }catch(error){
    console.log(JSON.stringify({status:"FAILED",code:error?.code??"E1_R5_CURRENT_FRAME_COVERAGE_DIAGNOSTIC_FAILED"}));
    process.exitCode=1;
  }
}
