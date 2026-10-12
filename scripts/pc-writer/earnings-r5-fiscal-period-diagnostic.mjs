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
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {sicDivision} from "./earnings-r5-current-frame-audit.mjs";

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const DEFAULT_MAX_AGE_DAYS=185;
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
  if(!Number.isFinite(ms))return null;
  return Math.floor(ms/DAY_MS);
}
function duration(fact){
  const start=day(fact?.start),end=day(fact?.end);
  return start!=null&&end!=null&&end>=start?end-start+1:null;
}
function ageDays(fact,asOf){
  const end=day(fact?.end),cutoff=day(asOf);
  return end!=null&&cutoff!=null?cutoff-end:null;
}
function normalizeFp(value){
  const fp=clean(value).toUpperCase();
  return ["Q1","Q2","Q3","FY"].includes(fp)?fp:null;
}
function normalizeFy(value){
  const fy=Number(value);
  return Number.isInteger(fy)&&fy>=1900&&fy<=2200?fy:null;
}
function pairComparable(current,prior){
  if(!current||!prior)return false;
  const curEnd=day(current.end),priorEnd=day(prior.end);
  if(curEnd==null||priorEnd==null)return false;
  const gap=curEnd-priorEnd;
  if(gap<320||gap>410)return false;
  const curDuration=current.duration??duration(current),priorDuration=prior.duration??duration(prior);
  if(!Number.isInteger(curDuration)||!Number.isInteger(priorDuration)||Math.abs(curDuration-priorDuration)>45)return false;
  const curFp=normalizeFp(current.fp),priorFp=normalizeFp(prior.fp);
  if(curFp&&priorFp&&curFp!==priorFp)return false;
  const curFy=normalizeFy(current.fy),priorFy=normalizeFy(prior.fy);
  if(curFy!=null&&priorFy!=null&&curFy-priorFy!==1)return false;
  return true;
}
function sameQuarterPeriod(fact,target){
  if(!fact||!target)return false;
  if(fact.end!==target.end)return false;
  const a=fact.duration??duration(fact),b=target.duration??duration(target);
  return Number.isInteger(a)&&Number.isInteger(b)&&Math.abs(a-b)<=15;
}
function bump(map,key){
  const id=clean(key)||"UNKNOWN";
  map[id]=(map[id]??0)+1;
}
function sortedMapText(map,{limit=12}={}){
  const entries=Object.entries(map??{}).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit);
  return entries.length?entries.map(([key,value])=>`${key}:${value}`).join(" "):"-";
}

function factsForMetric(document,metric,asOf,{maxDuration=400}={}){
  const out=[];
  const cutoff=day(asOf);
  if(cutoff==null)return out;
  for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){
    const concept=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]?.[tag];
    if(!concept?.units||typeof concept.units!=="object")continue;
    for(const [unit,rows] of Object.entries(concept.units)){
      if(!secUnitAllowed(metric,unit)||!Array.isArray(rows))continue;
      for(const row of rows){
        if(!row||!E1_R5_SEC_CONTRACT.forms.includes(clean(row.form))||!finite(row.val))continue;
        if(day(row.filed)==null||row.filed>asOf)continue;
        const d=duration(row);if(!Number.isInteger(d)||d<55||d>maxDuration)continue;
        const end=day(row.end);if(end==null||end>cutoff)continue;
        out.push({...row,tag,unit,duration:d,fp:normalizeFp(row.fp),fy:normalizeFy(row.fy)});
      }
    }
  }
  return out;
}
function periodKey(row){return `${row.tag}|${row.unit}|${row.start}|${row.end}`;}
function chooseLatestSafe(rows){
  if(!rows.length)return {fact:null,reason:"NO_FACT"};
  const sorted=[...rows].sort((a,b)=>String(b.filed).localeCompare(String(a.filed))||String(b.accn??"").localeCompare(String(a.accn??"")));
  const latestFiled=sorted[0].filed;
  const top=sorted.filter(row=>row.filed===latestFiled);
  const values=[...new Set(top.map(row=>row.val))];
  if(values.length!==1)return {fact:null,reason:"LATEST_FILED_VALUE_CONFLICT"};
  return {fact:top[0],reason:null};
}
function uniquePeriodFacts(document,metric,asOf,{maxDuration=120}={}){
  const rows=factsForMetric(document,metric,asOf,{maxDuration});
  const grouped=new Map();
  for(const row of rows){
    const key=periodKey(row);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(row);
  }
  const facts=[];let conflicts=0;
  for(const rowsForPeriod of grouped.values()){
    const selected=chooseLatestSafe(rowsForPeriod);
    if(selected.fact)facts.push(selected.fact);else if(selected.reason==="LATEST_FILED_VALUE_CONFLICT")conflicts++;
  }
  facts.sort((a,b)=>day(b.end)-day(a.end)||String(b.filed).localeCompare(String(a.filed)));
  return {facts,conflicts};
}

export function selectFiscalComparablePair(document,{metric,asOf,maxAgeDays=DEFAULT_MAX_AGE_DAYS}={}){
  const {facts,conflicts}=uniquePeriodFacts(document,metric,asOf,{maxDuration:120});
  if(!facts.length)return {current:null,prior:null,reason:conflicts?"PERIOD_CONFLICT":"NO_QUARTER_FACT",conflicts};
  let sawRecent=false;
  for(const current of facts){
    const age=ageDays(current,asOf);
    if(!Number.isInteger(age)||age<0)continue;
    if(age>maxAgeDays)continue;
    sawRecent=true;
    const priors=facts.filter(prior=>
      prior.tag===current.tag&&
      prior.unit===current.unit&&
      prior.end!==current.end&&
      pairComparable(current,prior)
    ).sort((a,b)=>{
      const gapA=Math.abs((day(current.end)-day(a.end))-365);
      const gapB=Math.abs((day(current.end)-day(b.end))-365);
      if(gapA!==gapB)return gapA-gapB;
      const durA=Math.abs(current.duration-a.duration),durB=Math.abs(current.duration-b.duration);
      if(durA!==durB)return durA-durB;
      return day(b.end)-day(a.end)||String(b.filed).localeCompare(String(a.filed));
    });
    if(!priors.length)continue;
    return {current,prior:priors[0],reason:null,ageDays:age,conflicts};
  }
  return {current:null,prior:null,reason:sawRecent?"NO_COMPARABLE_PRIOR":"NO_RECENT_QUARTER",conflicts};
}

export function selectFiscalCurrentQuarter(document,{metric,asOf,maxAgeDays=DEFAULT_MAX_AGE_DAYS}={}){
  const {facts,conflicts}=uniquePeriodFacts(document,metric,asOf,{maxDuration:120});
  for(const fact of facts){
    const age=ageDays(fact,asOf);
    if(Number.isInteger(age)&&age>=0&&age<=maxAgeDays)return {fact,reason:null,ageDays:age,conflicts};
  }
  return {fact:null,reason:facts.length?"NO_RECENT_QUARTER":conflicts?"PERIOD_CONFLICT":"NO_QUARTER_FACT",ageDays:null,conflicts};
}

function selectSameTagPeriodPair(document,metric,asOf,currentTarget,priorTarget){
  const {facts}=uniquePeriodFacts(document,metric,asOf,{maxDuration:120});
  for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){
    const current=facts.filter(fact=>fact.tag===tag&&sameQuarterPeriod(fact,currentTarget));
    const prior=facts.filter(fact=>fact.tag===tag&&sameQuarterPeriod(fact,priorTarget));
    if(!current.length||!prior.length)continue;
    const c=current[0],p=prior[0];
    if(!pairComparable(c,p))continue;
    return {current:c,prior:p,tag};
  }
  return {current:null,prior:null,tag:null};
}

export function selectFiscalMarginPair(document,{asOf,maxAgeDays=DEFAULT_MAX_AGE_DAYS}={}){
  const revenue=selectFiscalComparablePair(document,{metric:"revenue",asOf,maxAgeDays});
  if(!revenue.current)return {revenueCurrent:null,revenuePrior:null,opCurrent:null,opPrior:null,reason:"REVENUE_PAIR_MISSING"};
  const operating=selectSameTagPeriodPair(document,"operatingIncome",asOf,revenue.current,revenue.prior);
  if(!operating.current)return {revenueCurrent:revenue.current,revenuePrior:revenue.prior,opCurrent:null,opPrior:null,reason:"OPERATING_INCOME_PAIR_MISSING"};
  return {revenueCurrent:revenue.current,revenuePrior:revenue.prior,opCurrent:operating.current,opPrior:operating.prior,reason:null};
}

function uniqueFlowFacts(document,metric,asOf){return uniquePeriodFacts(document,metric,asOf,{maxDuration:400}).facts;}
export function selectFiscalQuarterFlow(document,{metric,asOf,target}={}){
  if(!target?.end)return {value:null,method:null,fact:null,priorFact:null,reason:"TARGET_PERIOD_MISSING"};
  const facts=uniqueFlowFacts(document,metric,asOf);
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
  return {value:null,method:null,fact:null,priorFact:null,reason:facts.length?"NO_ALIGNED_QUARTER_FLOW":"NO_FLOW_FACT"};
}

function candidateCapexTags(document,{asOf,targetEnd}={}){
  const out=[];
  const facts=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]??{};
  const mapped=new Set(E1_R5_SEC_CONTRACT.tags.capex);
  for(const [tag,concept] of Object.entries(facts)){
    if(mapped.has(tag)||!/PropertyPlantAndEquipment|CapitalExpenditure|ProductiveAsset|CapitalAsset/i.test(tag))continue;
    const rows=concept?.units?.USD;if(!Array.isArray(rows))continue;
    const usable=rows.some(row=>{
      if(!row||!E1_R5_SEC_CONTRACT.forms.includes(clean(row.form))||!finite(row.val))return false;
      if(day(row.filed)==null||row.filed>asOf||day(row.end)==null)return false;
      const d=duration(row);if(!Number.isInteger(d)||d<55||d>400)return false;
      return targetEnd?Math.abs(day(row.end)-day(targetEnd))<=45:true;
    });
    if(usable)out.push(tag);
  }
  return out;
}

export function buildFiscalPeriodDiagnosticFromDocuments({members=[],factsByCik=new Map(),submissionsByCik=new Map(),asOf,maxAgeDays=DEFAULT_MAX_AGE_DAYS}={}){
  let validDocuments=0,nonFinancial=0,eps=0,revenue=0,margin=0,netCurrent=0,netPair=0,fcf=0;
  let cfoDirect=0,cfoReconstructed=0,capexDirect=0,capexReconstructed=0;
  const epsFp={},revenueFp={},fcfFp={},epsFailures={},revenueFailures={},marginFailures={},fcfFailures={},capexCandidateTags={};
  for(const member of members){
    const cik=String(member?.cik??"").replace(/\D/g,"").padStart(10,"0");
    const document=factsByCik.get(cik);
    const validation=validateSecCompanyFactsDocument(document);
    if(validation.status!=="PASS"||validation.cik!==cik)continue;
    validDocuments++;
    const division=sicDivision(submissionsByCik.get(cik)?.sic);
    const isNonFinancial=division?.financial===false;
    if(isNonFinancial)nonFinancial++;

    const epsPair=selectFiscalComparablePair(document,{metric:"eps",asOf,maxAgeDays});
    if(epsPair.current){eps++;bump(epsFp,epsPair.current.fp??"FP_MISSING");}else bump(epsFailures,epsPair.reason);
    const revenuePair=selectFiscalComparablePair(document,{metric:"revenue",asOf,maxAgeDays});
    if(revenuePair.current){revenue++;bump(revenueFp,revenuePair.current.fp??"FP_MISSING");}else bump(revenueFailures,revenuePair.reason);
    const net=selectFiscalCurrentQuarter(document,{metric:"netIncome",asOf,maxAgeDays});
    if(net.fact)netCurrent++;
    const netComparable=selectFiscalComparablePair(document,{metric:"netIncome",asOf,maxAgeDays});
    if(netComparable.current)netPair++;

    if(isNonFinancial){
      const marginPair=selectFiscalMarginPair(document,{asOf,maxAgeDays});
      if(marginPair.opCurrent)margin++;else bump(marginFailures,marginPair.reason);
      if(revenuePair.current){
        const cfo=selectFiscalQuarterFlow(document,{metric:"operatingCashFlow",asOf,target:revenuePair.current});
        const capex=selectFiscalQuarterFlow(document,{metric:"capex",asOf,target:revenuePair.current});
        if(cfo.method==="DIRECT_QUARTER")cfoDirect++;
        if(cfo.method==="CUMULATIVE_DELTA")cfoReconstructed++;
        if(capex.method==="DIRECT_QUARTER")capexDirect++;
        if(capex.method==="CUMULATIVE_DELTA")capexReconstructed++;
        if(finite(cfo.value)&&finite(capex.value)){
          fcf++;bump(fcfFp,revenuePair.current.fp??"FP_MISSING");
        }else{
          bump(fcfFailures,!finite(cfo.value)?cfo.reason:capex.reason);
          if(finite(cfo.value)&&!finite(capex.value))for(const tag of candidateCapexTags(document,{asOf,targetEnd:revenuePair.current.end}))bump(capexCandidateTags,tag);
        }
      }else bump(fcfFailures,"REVENUE_PAIR_MISSING");
    }
  }
  const issuerCount=members.length;
  return {
    status:"PASS",active:false,
    policy:{
      researchOnly:true,
      formulaChanged:false,
      scoringGateChanged:false,
      latestComparableMaxAgeDays:maxAgeDays,
      pairPolicy:"SAME_TAG_UNIT_PERIOD_DATES_WITH_FP_FY_CONSISTENCY",
      directQuarterPolicy:"55_TO_120_DAY_REPORTED_FACT",
      additiveFlowReconstruction:"MATCHED_TAG_UNIT_START_PERIOD_ONLY",
      q4EpsAnnualMinusNineMonths:"FORBIDDEN",
    },
    counts:{issuerCount,validDocuments,nonFinancial},
    coverage:{
      fiscalComparableEps:{eligible:eps,total:issuerCount,coverage:pct(eps,issuerCount)},
      fiscalComparableRevenue:{eligible:revenue,total:issuerCount,coverage:pct(revenue,issuerCount)},
      fiscalComparableMargin:{eligible:margin,total:nonFinancial,coverage:pct(margin,nonFinancial)},
      fiscalCurrentNetIncome:{eligible:netCurrent,total:issuerCount,coverage:pct(netCurrent,issuerCount)},
      fiscalComparableNetIncome:{eligible:netPair,total:issuerCount,coverage:pct(netPair,issuerCount)},
      fiscalAlignedFcfInput:{eligible:fcf,total:nonFinancial,coverage:pct(fcf,nonFinancial)},
    },
    flowMethods:{cfoDirect,cfoReconstructed,capexDirect,capexReconstructed},
    distributions:{epsFp,revenueFp,fcfFp},
    failureReasons:{eps:epsFailures,revenue:revenueFailures,margin:marginFailures,fcf:fcfFailures},
    unmappedCapexCandidateTags:capexCandidateTags,
    networkCalls:0,dbWrites:0,
  };
}

function resolveSecJson(directory,cik,nestedName){
  const name=`CIK${cik}.json`;
  const candidates=[
    path.join(directory,name),
    path.join(directory,nestedName,name),
    path.join(directory,path.basename(directory),name),
  ];
  return candidates.find(file=>fs.existsSync(file)&&fs.statSync(file).isFile())??null;
}
function readJson(file){try{return file?JSON.parse(fs.readFileSync(file,"utf8")):null;}catch{return null;}}

export async function runEarningsR5FiscalPeriodDiagnostic({incoming,coreFile,asOf,maxAgeDays=DEFAULT_MAX_AGE_DAYS}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming");
  const core=coreFile??path.join(defaultBase,"storage","core.sqlite");
  const effectiveAsOf=asOf??new Date().toISOString().slice(0,10);
  const universe=readLatestEarningsUniverse(core);
  if(universe.status!=="PASS")return {status:"PARTIAL",active:false,reason:"EARNINGS_UNIVERSE_REQUIRED",networkCalls:0,dbWrites:0};
  const factsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory);
  const submissionsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory);
  const factsByCik=new Map(),submissionsByCik=new Map();
  let factsFiles=0,submissionFiles=0;
  for(const member of universe.members){
    const cik=String(member.cik).padStart(10,"0");
    const factsFile=resolveSecJson(factsDir,cik,"companyfacts");
    const submissionFile=resolveSecJson(submissionsDir,cik,"submissions");
    if(factsFile){factsFiles++;factsByCik.set(cik,readJson(factsFile));}
    if(submissionFile){submissionFiles++;submissionsByCik.set(cik,readJson(submissionFile));}
  }
  const report=buildFiscalPeriodDiagnosticFromDocuments({members:universe.members,factsByCik,submissionsByCik,asOf:effectiveAsOf,maxAgeDays});
  return {...report,at:new Date().toISOString(),asOf:effectiveAsOf,files:{companyFacts:factsFiles,submissions:submissionFiles},dbReads:1,networkCalls:0,dbWrites:0};
}

export function formatEarningsR5FiscalPeriodDiagnosticText(report){
  const c=report?.coverage??{},f=report?.flowMethods??{},d=report?.distributions??{},r=report?.failureReasons??{};
  return [
    `E1-R5 FISCAL PERIOD DIAGNOSTIC: ${report?.status??"UNKNOWN"}`,
    `AT: ${report?.at??"-"}`,
    `AS_OF: ${report?.asOf??"-"}`,
    `POLICY: RESEARCH_ONLY formulaChanged=${report?.policy?.formulaChanged===false?"false":"unknown"} gateChanged=${report?.policy?.scoringGateChanged===false?"false":"unknown"} pairing=${report?.policy?.pairPolicy??"-"}`,
    `FILES: companyFacts=${report?.files?.companyFacts??0} submissions=${report?.files?.submissions??0}`,
    `FISCAL_EPS_PAIR_COVERAGE: ${pctText(c.fiscalComparableEps?.coverage)} (${c.fiscalComparableEps?.eligible??0}/${c.fiscalComparableEps?.total??0})`,
    `FISCAL_REVENUE_PAIR_COVERAGE: ${pctText(c.fiscalComparableRevenue?.coverage)} (${c.fiscalComparableRevenue?.eligible??0}/${c.fiscalComparableRevenue?.total??0})`,
    `FISCAL_MARGIN_PAIR_COVERAGE: ${pctText(c.fiscalComparableMargin?.coverage)} (${c.fiscalComparableMargin?.eligible??0}/${c.fiscalComparableMargin?.total??0})`,
    `FISCAL_NET_CURRENT_COVERAGE: ${pctText(c.fiscalCurrentNetIncome?.coverage)} (${c.fiscalCurrentNetIncome?.eligible??0}/${c.fiscalCurrentNetIncome?.total??0})`,
    `FISCAL_NET_PAIR_COVERAGE: ${pctText(c.fiscalComparableNetIncome?.coverage)} (${c.fiscalComparableNetIncome?.eligible??0}/${c.fiscalComparableNetIncome?.total??0})`,
    `FISCAL_FCF_INPUT_COVERAGE: ${pctText(c.fiscalAlignedFcfInput?.coverage)} (${c.fiscalAlignedFcfInput?.eligible??0}/${c.fiscalAlignedFcfInput?.total??0})`,
    `CFO_METHODS: direct=${f.cfoDirect??0} reconstructed=${f.cfoReconstructed??0}`,
    `CAPEX_METHODS: direct=${f.capexDirect??0} reconstructed=${f.capexReconstructed??0}`,
    `EPS_FP_DISTRIBUTION: ${sortedMapText(d.epsFp)}`,
    `REVENUE_FP_DISTRIBUTION: ${sortedMapText(d.revenueFp)}`,
    `FCF_FP_DISTRIBUTION: ${sortedMapText(d.fcfFp)}`,
    `EPS_FAILURES: ${sortedMapText(r.eps)}`,
    `REVENUE_FAILURES: ${sortedMapText(r.revenue)}`,
    `MARGIN_FAILURES: ${sortedMapText(r.margin)}`,
    `FCF_FAILURES: ${sortedMapText(r.fcf)}`,
    `UNMAPPED_CAPEX_CANDIDATE_TAGS: ${sortedMapText(report?.unmappedCapexCandidateTags,{limit:10})}`,
    `Q4_EPS_ANNUAL_MINUS_9M: ${report?.policy?.q4EpsAnnualMinusNineMonths??"-"}`,
    `NETWORK_CALLS: ${report?.networkCalls??0}`,
    `DB_WRITES: ${report?.dbWrites??0}`,
  ].join("\r\n")+"\r\n";
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const cli=parseArgs();
    const report=await runEarningsR5FiscalPeriodDiagnostic({
      incoming:cli.incoming?path.resolve(cli.incoming):undefined,
      coreFile:cli.core?path.resolve(cli.core):undefined,
      asOf:cli["as-of"]??undefined,
      maxAgeDays:cli["max-age-days"]?Number(cli["max-age-days"]):undefined,
    });
    console.log(formatEarningsR5FiscalPeriodDiagnosticText(report));
  }catch(error){
    console.log(`E1-R5 FISCAL PERIOD DIAGNOSTIC: FAILED\r\nCODE: ${error?.code??"E1_R5_FISCAL_PERIOD_DIAGNOSTIC_FAILED"}`);
    process.exitCode=1;
  }
}
