import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  E1_R5_SEC_CONTRACT,
  secUnitAllowed,
  validateSecCompanyFactsDocument,
} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {sicDivision} from "./earnings-r5-current-frame-audit.mjs";
import {selectFiscalQuarterFlow} from "./earnings-r5-fiscal-period-diagnostic.mjs";

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
  return Number.isFinite(ms)?Math.floor(ms/DAY_MS):null;
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
  return fp||null;
}
function normalizeFy(value){
  const fy=Number(value);
  return Number.isInteger(fy)&&fy>=1900&&fy<=2200?fy:null;
}
function bump(map,key){
  const id=clean(key)||"UNKNOWN";
  map[id]=(map[id]??0)+1;
}
function sortedMapText(map,{limit=12}={}){
  const entries=Object.entries(map??{}).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit);
  return entries.length?entries.map(([key,value])=>`${key}:${value}`).join(" "):"-";
}

function factsForMetric(document,metric,asOf,{maxDuration=120}={}){
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
        const d=duration(row);
        if(!Number.isInteger(d)||d<55||d>maxDuration)continue;
        const end=day(row.end);
        if(end==null||end>cutoff)continue;
        out.push({...row,tag,unit,duration:d,fp:normalizeFp(row.fp),fy:normalizeFy(row.fy)});
      }
    }
  }
  return out;
}
function periodKey(row){return `${row.tag}|${row.unit}|${row.start}|${row.end}`;}
function chooseLatestSafe(rows){
  if(!rows.length)return null;
  const sorted=[...rows].sort((a,b)=>String(b.filed).localeCompare(String(a.filed))||String(b.accn??"").localeCompare(String(a.accn??"")));
  const latestFiled=sorted[0].filed;
  const top=sorted.filter(row=>row.filed===latestFiled);
  if(new Set(top.map(row=>row.val)).size!==1)return null;
  return top[0];
}
function uniqueQuarterFacts(document,metric,asOf){
  const grouped=new Map();
  for(const row of factsForMetric(document,metric,asOf,{maxDuration:120})){
    const key=periodKey(row);
    if(!grouped.has(key))grouped.set(key,[]);
    grouped.get(key).push(row);
  }
  const facts=[];
  for(const rows of grouped.values()){
    const selected=chooseLatestSafe(rows);
    if(selected)facts.push(selected);
  }
  facts.sort((a,b)=>day(b.end)-day(a.end)||String(b.filed).localeCompare(String(a.filed)));
  return facts;
}
function geometryComparable(current,prior){
  if(!current||!prior||current.tag!==prior.tag||current.unit!==prior.unit||current.end===prior.end)return false;
  const currentEnd=day(current.end),priorEnd=day(prior.end);
  if(currentEnd==null||priorEnd==null)return false;
  const gap=currentEnd-priorEnd;
  if(gap<320||gap>410)return false;
  const currentDuration=current.duration??duration(current),priorDuration=prior.duration??duration(prior);
  return Number.isInteger(currentDuration)&&Number.isInteger(priorDuration)&&Math.abs(currentDuration-priorDuration)<=45;
}
function metadataForPair(current,prior){
  const currentFy=normalizeFy(current?.fy),priorFy=normalizeFy(prior?.fy);
  const currentFp=normalizeFp(current?.fp),priorFp=normalizeFp(prior?.fp);
  return {
    fyDelta:currentFy!=null&&priorFy!=null?currentFy-priorFy:null,
    fpRelation:currentFp&&priorFp?(currentFp===priorFp?"MATCH":"MISMATCH"):"MISSING",
    sameAccession:Boolean(clean(current?.accn)&&clean(current?.accn)===clean(prior?.accn)),
    sameFiledDate:Boolean(clean(current?.filed)&&clean(current?.filed)===clean(prior?.filed)),
  };
}

export function selectDocumentFocusComparablePair(document,{metric,asOf,maxAgeDays=DEFAULT_MAX_AGE_DAYS}={}){
  const facts=uniqueQuarterFacts(document,metric,asOf);
  if(!facts.length)return {current:null,prior:null,reason:"NO_QUARTER_FACT",metadata:null};
  let sawRecent=false;
  for(const current of facts){
    const age=ageDays(current,asOf);
    if(!Number.isInteger(age)||age<0||age>maxAgeDays)continue;
    sawRecent=true;
    const priors=facts.filter(prior=>geometryComparable(current,prior)).sort((a,b)=>{
      const gapA=Math.abs((day(current.end)-day(a.end))-365);
      const gapB=Math.abs((day(current.end)-day(b.end))-365);
      if(gapA!==gapB)return gapA-gapB;
      const durA=Math.abs(current.duration-a.duration),durB=Math.abs(current.duration-b.duration);
      if(durA!==durB)return durA-durB;
      return day(b.end)-day(a.end)||String(b.filed).localeCompare(String(a.filed));
    });
    if(!priors.length)continue;
    const prior=priors[0];
    return {current,prior,reason:null,ageDays:age,metadata:metadataForPair(current,prior)};
  }
  return {current:null,prior:null,reason:sawRecent?"NO_GEOMETRY_COMPARABLE_PRIOR":"NO_RECENT_QUARTER",metadata:null};
}

function sameQuarterPeriod(fact,target){
  if(!fact||!target||fact.end!==target.end)return false;
  const a=fact.duration??duration(fact),b=target.duration??duration(target);
  return Number.isInteger(a)&&Number.isInteger(b)&&Math.abs(a-b)<=15;
}
function selectMetricForTarget(document,metric,asOf,target){
  const facts=uniqueQuarterFacts(document,metric,asOf);
  for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){
    const matches=facts.filter(fact=>fact.tag===tag&&sameQuarterPeriod(fact,target));
    if(matches.length)return matches[0];
  }
  return null;
}
function candidateCapexTags(document,{asOf,targetEnd}={}){
  const out=[];
  const facts=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]??{};
  const mapped=new Set(E1_R5_SEC_CONTRACT.tags.capex);
  for(const [tag,concept] of Object.entries(facts)){
    if(mapped.has(tag)||!/PropertyPlantAndEquipment|CapitalExpenditure|ProductiveAsset|CapitalAsset/i.test(tag))continue;
    const rows=concept?.units?.USD;
    if(!Array.isArray(rows))continue;
    const usable=rows.some(row=>{
      if(!row||!E1_R5_SEC_CONTRACT.forms.includes(clean(row.form))||!finite(row.val))return false;
      if(day(row.filed)==null||row.filed>asOf||day(row.end)==null)return false;
      const d=duration(row);
      if(!Number.isInteger(d)||d<55||d>400)return false;
      return targetEnd?Math.abs(day(row.end)-day(targetEnd))<=45:true;
    });
    if(usable)out.push(tag);
  }
  return out;
}

export function buildDocumentFocusDiagnosticFromDocuments({members=[],factsByCik=new Map(),submissionsByCik=new Map(),asOf,maxAgeDays=DEFAULT_MAX_AGE_DAYS}={}){
  let validDocuments=0,nonFinancial=0,eps=0,revenue=0,margin=0,net=0,fcf=0;
  let cfoDirect=0,cfoReconstructed=0,capexDirect=0,capexReconstructed=0;
  const epsFyDelta={},revenueFyDelta={},epsFpRelation={},revenueFpRelation={},epsFailures={},revenueFailures={},marginFailures={},fcfFailures={},capexCandidateTags={};
  let epsSameAccession=0,revenueSameAccession=0,epsSameFiledDate=0,revenueSameFiledDate=0;

  for(const member of members){
    const cik=String(member?.cik??"").replace(/\D/g,"").padStart(10,"0");
    const document=factsByCik.get(cik);
    const validation=validateSecCompanyFactsDocument(document);
    if(validation.status!=="PASS"||validation.cik!==cik)continue;
    validDocuments++;
    const division=sicDivision(submissionsByCik.get(cik)?.sic);
    const isNonFinancial=division?.financial===false;
    if(isNonFinancial)nonFinancial++;

    const epsPair=selectDocumentFocusComparablePair(document,{metric:"eps",asOf,maxAgeDays});
    if(epsPair.current){
      eps++;
      bump(epsFyDelta,epsPair.metadata?.fyDelta==null?"MISSING":String(epsPair.metadata.fyDelta));
      bump(epsFpRelation,epsPair.metadata?.fpRelation);
      if(epsPair.metadata?.sameAccession)epsSameAccession++;
      if(epsPair.metadata?.sameFiledDate)epsSameFiledDate++;
    }else bump(epsFailures,epsPair.reason);

    const revenuePair=selectDocumentFocusComparablePair(document,{metric:"revenue",asOf,maxAgeDays});
    if(revenuePair.current){
      revenue++;
      bump(revenueFyDelta,revenuePair.metadata?.fyDelta==null?"MISSING":String(revenuePair.metadata.fyDelta));
      bump(revenueFpRelation,revenuePair.metadata?.fpRelation);
      if(revenuePair.metadata?.sameAccession)revenueSameAccession++;
      if(revenuePair.metadata?.sameFiledDate)revenueSameFiledDate++;
    }else bump(revenueFailures,revenuePair.reason);

    const netPair=selectDocumentFocusComparablePair(document,{metric:"netIncome",asOf,maxAgeDays});
    if(netPair.current)net++;

    if(isNonFinancial){
      if(revenuePair.current){
        const opCurrent=selectMetricForTarget(document,"operatingIncome",asOf,revenuePair.current);
        const opPrior=selectMetricForTarget(document,"operatingIncome",asOf,revenuePair.prior);
        if(opCurrent&&opPrior&&opCurrent.tag===opPrior.tag&&opCurrent.unit===opPrior.unit)margin++;
        else bump(marginFailures,"OPERATING_INCOME_PAIR_MISSING");

        const cfo=selectFiscalQuarterFlow(document,{metric:"operatingCashFlow",asOf,target:revenuePair.current});
        const capex=selectFiscalQuarterFlow(document,{metric:"capex",asOf,target:revenuePair.current});
        if(cfo.method==="DIRECT_QUARTER")cfoDirect++;
        if(cfo.method==="CUMULATIVE_DELTA")cfoReconstructed++;
        if(capex.method==="DIRECT_QUARTER")capexDirect++;
        if(capex.method==="CUMULATIVE_DELTA")capexReconstructed++;
        if(finite(cfo.value)&&finite(capex.value))fcf++;
        else{
          bump(fcfFailures,!finite(cfo.value)?cfo.reason:capex.reason);
          if(finite(cfo.value)&&!finite(capex.value))for(const tag of candidateCapexTags(document,{asOf,targetEnd:revenuePair.current.end}))bump(capexCandidateTags,tag);
        }
      }else{
        bump(marginFailures,"REVENUE_PAIR_MISSING");
        bump(fcfFailures,"REVENUE_PAIR_MISSING");
      }
    }
  }

  const issuerCount=members.length;
  return {
    status:"PASS",
    active:false,
    policy:{
      researchOnly:true,
      formulaChanged:false,
      scoringGateChanged:false,
      pairPolicy:"SAME_TAG_UNIT_PERIOD_GEOMETRY;_DOCUMENT_FP_FY_DIAGNOSTIC_ONLY",
      rationale:"SEC_FP_FY_ARE_DOCUMENT_FOCUS_METADATA_NOT_FACT_PERIOD_IDENTIFIERS",
      latestComparableMaxAgeDays:maxAgeDays,
      q4EpsAnnualMinusNineMonths:"FORBIDDEN",
    },
    counts:{issuerCount,validDocuments,nonFinancial},
    coverage:{
      geometryComparableEps:{eligible:eps,total:issuerCount,coverage:pct(eps,issuerCount)},
      geometryComparableRevenue:{eligible:revenue,total:issuerCount,coverage:pct(revenue,issuerCount)},
      geometryComparableMargin:{eligible:margin,total:nonFinancial,coverage:pct(margin,nonFinancial)},
      geometryComparableNetIncome:{eligible:net,total:issuerCount,coverage:pct(net,issuerCount)},
      geometryAlignedFcfInput:{eligible:fcf,total:nonFinancial,coverage:pct(fcf,nonFinancial)},
    },
    documentFocusEvidence:{
      epsFyDelta,revenueFyDelta,epsFpRelation,revenueFpRelation,
      epsSameAccession,revenueSameAccession,epsSameFiledDate,revenueSameFiledDate,
    },
    flowMethods:{cfoDirect,cfoReconstructed,capexDirect,capexReconstructed},
    failureReasons:{eps:epsFailures,revenue:revenueFailures,margin:marginFailures,fcf:fcfFailures},
    unmappedCapexCandidateTags:capexCandidateTags,
    networkCalls:0,
    dbWrites:0,
  };
}

function resolveSecJson(directory,cik,nestedName){
  const name=`CIK${cik}.json`;
  const candidates=[path.join(directory,name),path.join(directory,nestedName,name),path.join(directory,path.basename(directory),name)];
  return candidates.find(file=>fs.existsSync(file)&&fs.statSync(file).isFile())??null;
}
function readJson(file){try{return file?JSON.parse(fs.readFileSync(file,"utf8")):null;}catch{return null;}}

export async function runEarningsR5DocumentFocusDiagnostic({incoming,coreFile,asOf,maxAgeDays=DEFAULT_MAX_AGE_DAYS}={}){
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
  const report=buildDocumentFocusDiagnosticFromDocuments({members:universe.members,factsByCik,submissionsByCik,asOf:effectiveAsOf,maxAgeDays});
  return {...report,at:new Date().toISOString(),asOf:effectiveAsOf,files:{companyFacts:factsFiles,submissions:submissionFiles},dbReads:1,networkCalls:0,dbWrites:0};
}

export function formatEarningsR5DocumentFocusDiagnosticText(report){
  const c=report?.coverage??{},e=report?.documentFocusEvidence??{},f=report?.flowMethods??{},r=report?.failureReasons??{};
  return [
    `E1-R5 DOCUMENT FOCUS SEMANTICS DIAGNOSTIC: ${report?.status??"UNKNOWN"}`,
    `AT: ${report?.at??"-"}`,
    `AS_OF: ${report?.asOf??"-"}`,
    `POLICY: RESEARCH_ONLY formulaChanged=${report?.policy?.formulaChanged===false?"false":"unknown"} gateChanged=${report?.policy?.scoringGateChanged===false?"false":"unknown"} pairing=${report?.policy?.pairPolicy??"-"}`,
    `FILES: companyFacts=${report?.files?.companyFacts??0} submissions=${report?.files?.submissions??0}`,
    `GEOMETRY_EPS_PAIR_COVERAGE: ${pctText(c.geometryComparableEps?.coverage)} (${c.geometryComparableEps?.eligible??0}/${c.geometryComparableEps?.total??0})`,
    `GEOMETRY_REVENUE_PAIR_COVERAGE: ${pctText(c.geometryComparableRevenue?.coverage)} (${c.geometryComparableRevenue?.eligible??0}/${c.geometryComparableRevenue?.total??0})`,
    `GEOMETRY_MARGIN_PAIR_COVERAGE: ${pctText(c.geometryComparableMargin?.coverage)} (${c.geometryComparableMargin?.eligible??0}/${c.geometryComparableMargin?.total??0})`,
    `GEOMETRY_NET_PAIR_COVERAGE: ${pctText(c.geometryComparableNetIncome?.coverage)} (${c.geometryComparableNetIncome?.eligible??0}/${c.geometryComparableNetIncome?.total??0})`,
    `GEOMETRY_FCF_INPUT_COVERAGE: ${pctText(c.geometryAlignedFcfInput?.coverage)} (${c.geometryAlignedFcfInput?.eligible??0}/${c.geometryAlignedFcfInput?.total??0})`,
    `EPS_FY_DELTA_DISTRIBUTION: ${sortedMapText(e.epsFyDelta)}`,
    `REVENUE_FY_DELTA_DISTRIBUTION: ${sortedMapText(e.revenueFyDelta)}`,
    `EPS_FP_RELATION: ${sortedMapText(e.epsFpRelation)}`,
    `REVENUE_FP_RELATION: ${sortedMapText(e.revenueFpRelation)}`,
    `EPS_SAME_ACCESSION: ${e.epsSameAccession??0}`,
    `REVENUE_SAME_ACCESSION: ${e.revenueSameAccession??0}`,
    `EPS_SAME_FILED_DATE: ${e.epsSameFiledDate??0}`,
    `REVENUE_SAME_FILED_DATE: ${e.revenueSameFiledDate??0}`,
    `CFO_METHODS: direct=${f.cfoDirect??0} reconstructed=${f.cfoReconstructed??0}`,
    `CAPEX_METHODS: direct=${f.capexDirect??0} reconstructed=${f.capexReconstructed??0}`,
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
    const report=await runEarningsR5DocumentFocusDiagnostic({
      incoming:cli.incoming?path.resolve(cli.incoming):undefined,
      coreFile:cli.core?path.resolve(cli.core):undefined,
      asOf:cli["as-of"]??undefined,
      maxAgeDays:cli["max-age-days"]?Number(cli["max-age-days"]):undefined,
    });
    console.log(formatEarningsR5DocumentFocusDiagnosticText(report));
  }catch(error){
    console.log(`E1-R5 DOCUMENT FOCUS SEMANTICS DIAGNOSTIC: FAILED\r\nCODE: ${error?.code??"E1_R5_DOCUMENT_FOCUS_DIAGNOSTIC_FAILED"}`);
    process.exitCode=1;
  }
}
