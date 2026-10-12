import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  E1_R5_SEC_CONTRACT,
  secUnitAllowed,
  validateSecCompanyFactsDocument,
} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {quarterFromCumulative} from "../../lib/market-score/earnings-e1-r5-contract.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {sicDivision} from "./earnings-r5-current-frame-audit.mjs";
import {
  buildDocumentFocusDiagnosticFromDocuments,
  selectDocumentFocusComparablePair,
} from "./earnings-r5-document-focus-diagnostic.mjs";
import {selectFiscalQuarterFlow} from "./earnings-r5-fiscal-period-diagnostic.mjs";
import {runEarningsR5OfficialPreflight} from "./earnings-r5-official-preflight.mjs";

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const ACTIVE_MAX_AGE_DAYS=185;
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
function duration(row){
  const start=day(row?.start),end=day(row?.end);
  return start!=null&&end!=null&&end>=start?end-start+1:null;
}
function sameQuarterPeriod(fact,target){
  if(!fact||!target||fact.end!==target.end)return false;
  const a=fact.duration??duration(fact),b=target.duration??duration(target);
  return Number.isInteger(a)&&Number.isInteger(b)&&Math.abs(a-b)<=15;
}
function ageBucket(age){
  if(!Number.isInteger(age)||age<0)return "NONE";
  if(age<=120)return "LE120";
  if(age<=185)return "D121_185";
  if(age<=240)return "D186_240";
  if(age<=365)return "D241_365";
  return "GT365";
}
function bump(map,key){
  const id=clean(key)||"UNKNOWN";
  map[id]=(map[id]??0)+1;
}
function sortedMapText(map,{limit=12}={}){
  const entries=Object.entries(map??{}).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit);
  return entries.length?entries.map(([key,value])=>`${key}:${value}`).join(" "):"-";
}
function median(values){
  const rows=values.filter(finite).sort((a,b)=>a-b);
  if(!rows.length)return null;
  const middle=Math.floor(rows.length/2);
  return rows.length%2?rows[middle]:(rows[middle-1]+rows[middle])/2;
}

function usableRowsForTag(document,tag,asOf,{maxDuration=120,unit=null}={}){
  const concept=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]?.[tag];
  if(!concept?.units||typeof concept.units!=="object")return [];
  const cutoff=day(asOf);
  const out=[];
  for(const [uom,rows] of Object.entries(concept.units)){
    if(unit&&uom!==unit)continue;
    if(!Array.isArray(rows))continue;
    for(const row of rows){
      if(!row||!E1_R5_SEC_CONTRACT.forms.includes(clean(row.form))||!finite(row.val))continue;
      if(day(row.filed)==null||row.filed>asOf)continue;
      const d=duration(row),end=day(row.end);
      if(!Number.isInteger(d)||d<55||d>maxDuration||end==null||end>cutoff)continue;
      out.push({...row,tag,unit:uom,duration:d});
    }
  }
  return out;
}

function latestMappedQuarterAge(document,metric,asOf){
  let latest=null;
  for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){
    const rows=usableRowsForTag(document,tag,asOf,{maxDuration:120});
    for(const row of rows){
      if(!secUnitAllowed(metric,row.unit))continue;
      if(!latest||day(row.end)>day(latest.end)||(row.end===latest.end&&String(row.filed)>String(latest.filed)))latest=row;
    }
  }
  if(!latest)return null;
  const age=day(asOf)-day(latest.end);
  return Number.isInteger(age)&&age>=0?age:null;
}

const candidatePatterns=Object.freeze({
  eps:/EarningsPerShare|IncomeLossPerShare|ProfitLossPerShare/i,
  revenue:/Revenue|SalesRevenue|NetSales|OperatingRevenue/i,
  operatingIncome:/OperatingIncome|IncomeLossFromOperations|OperatingProfit/i,
  capex:/PropertyPlantAndEquipment|CapitalExpenditure|ProductiveAsset|CapitalAsset/i,
});

function candidateTagsForMetric(document,metric,asOf,{maxAgeDays=365}={}){
  const mapped=new Set(E1_R5_SEC_CONTRACT.tags?.[metric]??[]);
  const pattern=candidatePatterns[metric];
  if(!pattern)return [];
  const facts=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]??{};
  const cutoff=day(asOf);
  const found=[];
  for(const [tag,concept] of Object.entries(facts)){
    if(mapped.has(tag)||!pattern.test(tag)||!concept?.units)continue;
    let usable=false;
    for(const [unit,rows] of Object.entries(concept.units)){
      if(!Array.isArray(rows))continue;
      if(metric==="eps"&&!["USD/shares","USD-per-shares"].includes(unit))continue;
      if(metric!=="eps"&&unit!=="USD")continue;
      for(const row of rows){
        if(!row||!E1_R5_SEC_CONTRACT.forms.includes(clean(row.form))||!finite(row.val))continue;
        const filed=day(row.filed),end=day(row.end),d=duration(row);
        if(filed==null||row.filed>asOf||end==null||end>cutoff||!Number.isInteger(d)||d<55||d>(metric==="capex"?400:120))continue;
        const age=cutoff-end;
        if(age>=0&&age<=maxAgeDays){usable=true;break;}
      }
      if(usable)break;
    }
    if(usable)found.push(tag);
  }
  return found;
}

function uniqueSafeRows(rows){
  const groups=new Map();
  for(const row of rows){
    const key=`${row.tag}|${row.unit}|${row.start}|${row.end}`;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(row);
  }
  const out=[];
  for(const values of groups.values()){
    values.sort((a,b)=>String(b.filed).localeCompare(String(a.filed))||String(b.accn??"").localeCompare(String(a.accn??"")));
    const latestFiled=values[0]?.filed;
    const top=values.filter(row=>row.filed===latestFiled);
    if(new Set(top.map(row=>row.val)).size===1)out.push(top[0]);
  }
  return out.sort((a,b)=>day(b.end)-day(a.end)||String(b.filed).localeCompare(String(a.filed)));
}

function selectQuarterFlowForExactTag(document,{tag,asOf,target}={}){
  if(!target?.end)return {value:null,method:null,reason:"TARGET_PERIOD_MISSING"};
  const facts=uniqueSafeRows(usableRowsForTag(document,tag,asOf,{maxDuration:400,unit:"USD"}));
  const direct=facts.filter(fact=>fact.duration<=120&&sameQuarterPeriod(fact,target));
  if(direct.length)return {value:direct[0].val,method:"DIRECT_QUARTER",fact:direct[0],priorFact:null,reason:null};
  const cumulative=facts.filter(fact=>fact.duration>120&&fact.end===target.end)
    .sort((a,b)=>String(b.filed).localeCompare(String(a.filed))||b.duration-a.duration);
  for(const current of cumulative){
    const priors=facts.filter(prior=>
      prior.tag===current.tag&&prior.unit===current.unit&&prior.start===current.start&&
      day(prior.end)<day(current.end)&&
      day(current.end)-day(prior.end)>=55&&day(current.end)-day(prior.end)<=125&&
      prior.duration<current.duration
    ).sort((a,b)=>Math.abs((day(current.end)-day(a.end))-90)-Math.abs((day(current.end)-day(b.end))-90)||day(b.end)-day(a.end));
    if(!priors.length)continue;
    const value=quarterFromCumulative(current.val,priors[0].val);
    if(finite(value))return {value,method:"CUMULATIVE_DELTA",fact:current,priorFact:priors[0],reason:null};
  }
  return {value:null,method:null,reason:facts.length?"NO_ALIGNED_QUARTER_FLOW":"NO_FLOW_FACT"};
}

function coverageSnapshot(report){
  const c=report?.coverage??{};
  return {
    eps:c.geometryComparableEps??null,
    revenue:c.geometryComparableRevenue??null,
    margin:c.geometryComparableMargin??null,
    netIncome:c.geometryComparableNetIncome??null,
    fcf:c.geometryAlignedFcfInput??null,
  };
}

export function buildCoverageRecoveryDiagnosticFromDocuments({
  members=[],
  factsByCik=new Map(),
  submissionsByCik=new Map(),
  asOf,
  preflight=null,
}={}){
  const ageBuckets={
    eps:{LE120:0,D121_185:0,D186_240:0,D241_365:0,GT365:0,NONE:0},
    revenue:{LE120:0,D121_185:0,D186_240:0,D241_365:0,GT365:0,NONE:0},
    operatingIncome:{LE120:0,D121_185:0,D186_240:0,D241_365:0,GT365:0,NONE:0},
    netIncome:{LE120:0,D121_185:0,D186_240:0,D241_365:0,GT365:0,NONE:0},
  };
  const candidateTagIssuerCounts={eps:{},revenue:{},operatingIncome:{},capex:{}};
  let validDocuments=0,nonFinancial=0;
  let productiveOverlap=0,productiveIdentical=0,productiveDifferent=0,productiveCandidateOnlyFcf=0,existingFcf=0;
  const productiveRatios=[];

  const active=buildDocumentFocusDiagnosticFromDocuments({members,factsByCik,submissionsByCik,asOf,maxAgeDays:ACTIVE_MAX_AGE_DAYS});
  const age240=buildDocumentFocusDiagnosticFromDocuments({members,factsByCik,submissionsByCik,asOf,maxAgeDays:240});
  const age365=buildDocumentFocusDiagnosticFromDocuments({members,factsByCik,submissionsByCik,asOf,maxAgeDays:365});

  for(const member of members){
    const cik=String(member?.cik??"").replace(/\D/g,"").padStart(10,"0");
    const document=factsByCik.get(cik);
    const validation=validateSecCompanyFactsDocument(document);
    if(validation.status!=="PASS"||validation.cik!==cik)continue;
    validDocuments++;
    const division=sicDivision(submissionsByCik.get(cik)?.sic);
    const isNonFinancial=division?.financial===false;
    if(isNonFinancial)nonFinancial++;

    for(const metric of ["eps","revenue","operatingIncome","netIncome"]){
      const age=latestMappedQuarterAge(document,metric,asOf);
      bump(ageBuckets[metric],ageBucket(age));
    }

    const epsPair=selectDocumentFocusComparablePair(document,{metric:"eps",asOf,maxAgeDays:ACTIVE_MAX_AGE_DAYS});
    if(!epsPair.current)for(const tag of candidateTagsForMetric(document,"eps",asOf))bump(candidateTagIssuerCounts.eps,tag);
    const revenuePair=selectDocumentFocusComparablePair(document,{metric:"revenue",asOf,maxAgeDays:ACTIVE_MAX_AGE_DAYS});
    if(!revenuePair.current)for(const tag of candidateTagsForMetric(document,"revenue",asOf))bump(candidateTagIssuerCounts.revenue,tag);

    if(isNonFinancial){
      let opMissing=true;
      if(revenuePair.current){
        const opTags=E1_R5_SEC_CONTRACT.tags.operatingIncome;
        const currentRows=opTags.flatMap(tag=>usableRowsForTag(document,tag,asOf,{maxDuration:120,unit:"USD"}))
          .filter(row=>sameQuarterPeriod(row,revenuePair.current));
        const priorRows=opTags.flatMap(tag=>usableRowsForTag(document,tag,asOf,{maxDuration:120,unit:"USD"}))
          .filter(row=>sameQuarterPeriod(row,revenuePair.prior));
        opMissing=!currentRows.some(current=>priorRows.some(prior=>current.tag===prior.tag&&current.unit===prior.unit));
      }
      if(opMissing)for(const tag of candidateTagsForMetric(document,"operatingIncome",asOf))bump(candidateTagIssuerCounts.operatingIncome,tag);

      if(revenuePair.current){
        const cfo=selectFiscalQuarterFlow(document,{metric:"operatingCashFlow",asOf,target:revenuePair.current});
        const mappedCapex=selectFiscalQuarterFlow(document,{metric:"capex",asOf,target:revenuePair.current});
        const productive=selectQuarterFlowForExactTag(document,{tag:"PaymentsToAcquireProductiveAssets",asOf,target:revenuePair.current});
        if(finite(cfo.value)&&finite(mappedCapex.value))existingFcf++;
        if(finite(mappedCapex.value)&&finite(productive.value)){
          productiveOverlap++;
          if(Object.is(mappedCapex.value,productive.value)||mappedCapex.value===productive.value)productiveIdentical++;
          else productiveDifferent++;
          if(mappedCapex.value!==0)productiveRatios.push(productive.value/mappedCapex.value);
        }
        if(finite(cfo.value)&&!finite(mappedCapex.value)&&finite(productive.value))productiveCandidateOnlyFcf++;
        if(!finite(mappedCapex.value))for(const tag of candidateTagsForMetric(document,"capex",asOf))bump(candidateTagIssuerCounts.capex,tag);
      }
    }
  }

  const s6Pre=preflight?.inputs?.beaCorporateProfits;
  const s10Pre=preflight?.inputs?.blsProducerInput;
  const s6Readiness=s6Pre?.status==="PASS"&&Number(s6Pre?.quarterlyMatchCount??0)>0
    ?"SCHEMA_READY_VALUE_PARSER_PENDING"
    :"SOURCE_NOT_READY";
  const s10Readiness=s10Pre?.status==="PASS"
    ?"SOURCE_READY_INDUSTRY_MAPPING_PENDING"
    :"SOURCE_NOT_READY";
  const fcfPotential=existingFcf+productiveCandidateOnlyFcf;

  return {
    status:"PASS",
    active:false,
    policy:{
      researchOnly:true,
      formulaChanged:false,
      scoringGateChanged:false,
      inputContractChanged:false,
      activeMaxAgeDays:ACTIVE_MAX_AGE_DAYS,
      counterfactualAgeWindows:[240,365],
      counterfactualOnly:true,
      q4EpsAnnualMinusNineMonths:"FORBIDDEN",
    },
    counts:{issuerCount:members.length,validDocuments,nonFinancial},
    latestMappedQuarterAgeBuckets:ageBuckets,
    standardTagCoverage:{
      d185:coverageSnapshot(active),
      d240:coverageSnapshot(age240),
      d365:coverageSnapshot(age365),
    },
    candidateTagIssuerCounts,
    capexProductiveAssetsValidation:{
      tag:"PaymentsToAcquireProductiveAssets",
      overlap:productiveOverlap,
      identical:productiveIdentical,
      different:productiveDifferent,
      medianCandidateToMappedRatio:median(productiveRatios),
      candidateOnlyFcfAdds:productiveCandidateOnlyFcf,
      existingFcf,
      counterfactualFcfWithCandidate:{
        eligible:fcfPotential,
        total:nonFinancial,
        coverage:pct(fcfPotential,nonFinancial),
        accepted:false,
      },
    },
    componentReadiness:{
      s6:{
        status:s6Readiness,
        sourceStatus:s6Pre?.status??"MISSING",
        quarterlyMatches:s6Pre?.quarterlyMatchCount??0,
        note:"No S6 raw value is activated by this audit.",
      },
      s10:{
        status:s10Readiness,
        sourceStatus:s10Pre?.status??"MISSING",
        note:"SIC-to-BLS-industry mapping remains unresolved; no S10 raw value is activated.",
      },
    },
    networkCalls:0,
    dbWrites:0,
  };
}

function formatCoverage(label,item){
  return `${label}: ${pctText(item?.coverage)} (${item?.eligible??0}/${item?.total??0})`;
}

export function formatEarningsR5CoverageRecoveryDiagnosticText(report){
  const c185=report?.standardTagCoverage?.d185??{};
  const c240=report?.standardTagCoverage?.d240??{};
  const c365=report?.standardTagCoverage?.d365??{};
  const cap=report?.capexProductiveAssetsValidation??{};
  const lines=[
    `E1-R5 COVERAGE RECOVERY AUDIT: ${report?.status??"UNKNOWN"}`,
    `AT: ${report?.at??"-"}`,
    `AS_OF: ${report?.asOf??"-"}`,
    `POLICY: RESEARCH_ONLY formulaChanged=${report?.policy?.formulaChanged===true?"true":"false"} gateChanged=${report?.policy?.scoringGateChanged===true?"true":"false"} contractChanged=${report?.policy?.inputContractChanged===true?"true":"false"} activeMaxAgeDays=${report?.policy?.activeMaxAgeDays??"-"}`,
    `FILES: companyFacts=${report?.files?.companyFacts??0} submissions=${report?.files?.submissions??0}`,
  ];
  for(const metric of ["eps","revenue","operatingIncome","netIncome"]){
    lines.push(`${metric.toUpperCase()}_LATEST_QUARTER_AGE_BUCKETS: ${sortedMapText(report?.latestMappedQuarterAgeBuckets?.[metric],{limit:20})}`);
  }
  lines.push(
    `STANDARD_TAG_COVERAGE_185: ${formatCoverage("EPS",c185.eps)} ${formatCoverage("REVENUE",c185.revenue)} ${formatCoverage("MARGIN",c185.margin)} ${formatCoverage("NET",c185.netIncome)} ${formatCoverage("FCF",c185.fcf)}`,
    `STANDARD_TAG_COUNTERFACTUAL_240: ${formatCoverage("EPS",c240.eps)} ${formatCoverage("REVENUE",c240.revenue)} ${formatCoverage("MARGIN",c240.margin)} ${formatCoverage("NET",c240.netIncome)} ${formatCoverage("FCF",c240.fcf)}`,
    `STANDARD_TAG_COUNTERFACTUAL_365: ${formatCoverage("EPS",c365.eps)} ${formatCoverage("REVENUE",c365.revenue)} ${formatCoverage("MARGIN",c365.margin)} ${formatCoverage("NET",c365.netIncome)} ${formatCoverage("FCF",c365.fcf)}`,
    `UNMAPPED_EPS_CANDIDATE_TAGS: ${sortedMapText(report?.candidateTagIssuerCounts?.eps)}`,
    `UNMAPPED_REVENUE_CANDIDATE_TAGS: ${sortedMapText(report?.candidateTagIssuerCounts?.revenue)}`,
    `UNMAPPED_OPERATING_INCOME_CANDIDATE_TAGS: ${sortedMapText(report?.candidateTagIssuerCounts?.operatingIncome)}`,
    `UNMAPPED_CAPEX_CANDIDATE_TAGS: ${sortedMapText(report?.candidateTagIssuerCounts?.capex)}`,
    `CAPEX_PRODUCTIVE_ASSETS_OVERLAP: total=${cap.overlap??0} identical=${cap.identical??0} different=${cap.different??0} medianRatio=${finite(cap.medianCandidateToMappedRatio)?cap.medianCandidateToMappedRatio.toFixed(6):"-"}`,
    `CAPEX_PRODUCTIVE_ASSETS_CANDIDATE_ONLY_FCF: ${cap.candidateOnlyFcfAdds??0}`,
    `FCF_COUNTERFACTUAL_WITH_PRODUCTIVE_ASSETS: ${pctText(cap?.counterfactualFcfWithCandidate?.coverage)} (${cap?.counterfactualFcfWithCandidate?.eligible??0}/${cap?.counterfactualFcfWithCandidate?.total??0}) accepted=${cap?.counterfactualFcfWithCandidate?.accepted===true?"true":"false"}`,
    `S6_CONNECT_READINESS: ${report?.componentReadiness?.s6?.status??"-"} source=${report?.componentReadiness?.s6?.sourceStatus??"-"} quarterlyMatches=${report?.componentReadiness?.s6?.quarterlyMatches??0}`,
    `S10_CONNECT_READINESS: ${report?.componentReadiness?.s10?.status??"-"} source=${report?.componentReadiness?.s10?.sourceStatus??"-"}`,
    `Q4_EPS_ANNUAL_MINUS_9M: ${report?.policy?.q4EpsAnnualMinusNineMonths??"-"}`,
    `NETWORK_CALLS: ${report?.networkCalls??"-"}`,
    `DB_WRITES: ${report?.dbWrites??"-"}`,
  );
  return lines.join("\r\n")+"\r\n";
}

function resolveSecJson(directory,cik,nestedName){
  const name=`CIK${cik}.json`;
  const candidates=[path.join(directory,name),path.join(directory,nestedName,name),path.join(directory,path.basename(directory),name)];
  return candidates.find(file=>fs.existsSync(file)&&fs.statSync(file).isFile())??null;
}
function readJson(file){try{return file?JSON.parse(fs.readFileSync(file,"utf8")):null;}catch{return null;}}

export async function runEarningsR5CoverageRecoveryDiagnostic(options={}){
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
    if(!cik)continue;
    factsByCik.set(cik,readJson(resolveSecJson(companyFactsDir,cik,"companyfacts")));
    submissionsByCik.set(cik,readJson(resolveSecJson(submissionsDir,cik,"submissions")));
  }
  const preflight=options.preflight??await runEarningsR5OfficialPreflight({incoming,coreFile});
  const report=buildCoverageRecoveryDiagnosticFromDocuments({members,factsByCik,submissionsByCik,asOf,preflight});
  report.at=new Date().toISOString();
  report.asOf=asOf;
  report.files={companyFacts:factsByCik.size,submissions:submissionsByCik.size};
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const cli=parseArgs();
    const report=await runEarningsR5CoverageRecoveryDiagnostic({
      incoming:cli.incoming?path.resolve(cli.incoming):undefined,
      coreFile:cli.core?path.resolve(cli.core):undefined,
      companyFactsDir:cli["companyfacts-dir"]?path.resolve(cli["companyfacts-dir"]):undefined,
      submissionsDir:cli["submissions-dir"]?path.resolve(cli["submissions-dir"]):undefined,
      asOf:cli["as-of"]??undefined,
    });
    console.log(formatEarningsR5CoverageRecoveryDiagnosticText(report));
  }catch(error){
    console.log(`E1-R5 COVERAGE RECOVERY AUDIT: FAILED\r\nCODE: ${error?.code??"E1_R5_COVERAGE_RECOVERY_FAILED"}`);
    process.exitCode=1;
  }
}
