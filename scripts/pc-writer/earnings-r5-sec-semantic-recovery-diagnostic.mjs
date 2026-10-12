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

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const ACTIVE_MAX_AGE_DAYS=185;
const EXTENDED_MAX_AGE_DAYS=240;
const DAY_MS=86400000;
const EPS_BASIC_TAG="EarningsPerShareBasic";
const REVENUE_INCLUDED_TAX_TAG="RevenueFromContractWithCustomerIncludingAssessedTax";
const CAPEX_AUDIT_TAGS=Object.freeze([
  "PaymentsToAcquireProductiveAssets",
  "PaymentsToAcquireOtherProductiveAssets",
  "PaymentsToAcquireOtherPropertyPlantAndEquipment",
  "CapitalExpenditureDiscontinuedOperations",
]);
const CAPEX_NAME_REJECTS=Object.freeze([
  "ProceedsFromSaleOfPropertyPlantAndEquipment",
  "ProceedsFromSaleOfProductiveAssets",
  "CapitalExpendituresIncurredButNotYetPaid",
  "PropertyPlantAndEquipmentAdditions",
  "PropertyPlantAndEquipmentDisposals",
]);
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
function ageDays(value,asOf){
  const current=day(value),cutoff=day(asOf);
  return current!=null&&cutoff!=null?cutoff-current:null;
}
function median(values){
  const rows=values.filter(finite).sort((a,b)=>a-b);
  if(!rows.length)return null;
  const middle=Math.floor(rows.length/2);
  return rows.length%2?rows[middle]:(rows[middle-1]+rows[middle])/2;
}
function bump(map,key){
  const id=clean(key)||"UNKNOWN";
  map[id]=(map[id]??0)+1;
}
function filedAgeBucket(age){
  if(!Number.isInteger(age)||age<0)return "NONE";
  if(age<=60)return "LE60";
  if(age<=90)return "D61_90";
  if(age<=120)return "D91_120";
  if(age<=185)return "D121_185";
  return "GT185";
}
function sortedMapText(map,{limit=12}={}){
  const entries=Object.entries(map??{}).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,limit);
  return entries.length?entries.map(([key,value])=>`${key}:${value}`).join(" "):"-";
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

function rawFactsForTag(document,tag,asOf,{maxDuration=120,units=null}={}){
  const concept=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]?.[tag];
  if(!concept?.units||typeof concept.units!=="object")return [];
  const cutoff=day(asOf);
  const out=[];
  for(const [unit,rows] of Object.entries(concept.units)){
    if(Array.isArray(units)&&!units.includes(unit))continue;
    if(!Array.isArray(rows))continue;
    for(const row of rows){
      if(!row||!E1_R5_SEC_CONTRACT.forms.includes(clean(row.form))||!finite(row.val))continue;
      if(day(row.filed)==null||row.filed>asOf)continue;
      const d=duration(row),end=day(row.end);
      if(!Number.isInteger(d)||d<55||d>maxDuration||end==null||end>cutoff)continue;
      out.push({...row,tag,unit,duration:d});
    }
  }
  return out;
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
    const filed=values[0]?.filed;
    const top=values.filter(row=>row.filed===filed);
    if(new Set(top.map(row=>row.val)).size===1)out.push(top[0]);
  }
  return out.sort((a,b)=>day(b.end)-day(a.end)||String(b.filed).localeCompare(String(a.filed)));
}
function geometryComparable(current,prior){
  if(!current||!prior||current.tag!==prior.tag||current.unit!==prior.unit||current.end===prior.end)return false;
  const currentEnd=day(current.end),priorEnd=day(prior.end);
  if(currentEnd==null||priorEnd==null)return false;
  const gap=currentEnd-priorEnd;
  if(gap<320||gap>410)return false;
  const a=current.duration??duration(current),b=prior.duration??duration(prior);
  return Number.isInteger(a)&&Number.isInteger(b)&&Math.abs(a-b)<=45;
}
function selectPairForExactTag(document,{tag,asOf,maxAgeDays,units,maxDuration=120}={}){
  const facts=uniqueSafeRows(rawFactsForTag(document,tag,asOf,{maxDuration,units}));
  if(!facts.length)return {current:null,prior:null,reason:"NO_QUARTER_FACT"};
  let sawRecent=false;
  for(const current of facts){
    const age=ageDays(current.end,asOf);
    if(!Number.isInteger(age)||age<0||age>maxAgeDays)continue;
    sawRecent=true;
    const priors=facts.filter(prior=>geometryComparable(current,prior)).sort((a,b)=>{
      const gapA=Math.abs((day(current.end)-day(a.end))-365);
      const gapB=Math.abs((day(current.end)-day(b.end))-365);
      return gapA-gapB||day(b.end)-day(a.end)||String(b.filed).localeCompare(String(a.filed));
    });
    if(priors.length)return {current,prior:priors[0],reason:null};
  }
  return {current:null,prior:null,reason:sawRecent?"NO_GEOMETRY_COMPARABLE_PRIOR":"NO_RECENT_QUARTER"};
}
function mappedFactsForMetric(document,metric,asOf,{maxDuration=120}={}){
  return uniqueSafeRows((E1_R5_SEC_CONTRACT.tags?.[metric]??[]).flatMap(tag=>
    rawFactsForTag(document,tag,asOf,{
      maxDuration,
      units:metric==="eps"?E1_R5_SEC_CONTRACT.units.eps:E1_R5_SEC_CONTRACT.units.monetary,
    })
  ));
}
function compatibleUnit(metric,a,b){
  if(metric==="eps")return secUnitAllowed("eps",a)&&secUnitAllowed("eps",b);
  return a===b&&secUnitAllowed(metric,a);
}
function comparisonAccumulator(){
  return {overlapPeriods:0,exact:0,within1Pct:0,within5Pct:0,signMismatch:0,mappedConflict:0,ratios:[],absPctDiffs:[]};
}
function addComparison(acc,candidate,mapped){
  acc.overlapPeriods++;
  if(candidate===mapped)acc.exact++;
  if(candidate!==0&&mapped!==0&&Math.sign(candidate)!==Math.sign(mapped))acc.signMismatch++;
  if(mapped!==0){
    const ratio=candidate/mapped;
    const diff=Math.abs(candidate-mapped)/Math.abs(mapped);
    if(finite(ratio))acc.ratios.push(ratio);
    if(finite(diff)){
      acc.absPctDiffs.push(100*diff);
      if(diff<=0.01)acc.within1Pct++;
      if(diff<=0.05)acc.within5Pct++;
    }
  }else if(candidate===0){
    acc.within1Pct++;
    acc.within5Pct++;
  }
}
function finishComparison(acc){
  return {
    overlapPeriods:acc.overlapPeriods,
    exact:acc.exact,
    within1Pct:acc.within1Pct,
    within5Pct:acc.within5Pct,
    signMismatch:acc.signMismatch,
    mappedConflict:acc.mappedConflict,
    medianRatio:median(acc.ratios),
    medianAbsPctDiff:median(acc.absPctDiffs),
    accepted:false,
  };
}
function compareCandidateTagToMapped(document,{candidateTag,metric,asOf,maxDuration=120}={}){
  const units=metric==="eps"?E1_R5_SEC_CONTRACT.units.eps:E1_R5_SEC_CONTRACT.units.monetary;
  const candidates=uniqueSafeRows(rawFactsForTag(document,candidateTag,asOf,{maxDuration,units}));
  const mapped=mappedFactsForMetric(document,metric,asOf,{maxDuration});
  const acc=comparisonAccumulator();
  for(const candidate of candidates){
    const matches=mapped.filter(row=>row.start===candidate.start&&row.end===candidate.end&&compatibleUnit(metric,row.unit,candidate.unit));
    if(!matches.length)continue;
    const values=[...new Set(matches.map(row=>row.val))];
    if(values.length!==1){acc.mappedConflict++;continue;}
    addComparison(acc,candidate.val,values[0]);
  }
  return acc;
}
function mergeComparison(target,source){
  for(const key of ["overlapPeriods","exact","within1Pct","within5Pct","signMismatch","mappedConflict"])target[key]+=source[key]??0;
  target.ratios.push(...(source.ratios??[]));
  target.absPctDiffs.push(...(source.absPctDiffs??[]));
}
function sameQuarterPeriod(fact,target){
  if(!fact||!target||fact.end!==target.end)return false;
  const a=fact.duration??duration(fact),b=target.duration??duration(target);
  return Number.isInteger(a)&&Number.isInteger(b)&&Math.abs(a-b)<=15;
}
function selectQuarterFlowForExactTag(document,{tag,asOf,target}={}){
  if(!target?.end)return {value:null,method:null,reason:"TARGET_PERIOD_MISSING"};
  const facts=uniqueSafeRows(rawFactsForTag(document,tag,asOf,{maxDuration:400,units:["USD"]}));
  const direct=facts.filter(fact=>fact.duration<=120&&sameQuarterPeriod(fact,target));
  if(direct.length)return {value:direct[0].val,method:"DIRECT_QUARTER",fact:direct[0],priorFact:null,reason:null};
  const cumulative=facts.filter(fact=>fact.duration>120&&fact.end===target.end)
    .sort((a,b)=>String(b.filed).localeCompare(String(a.filed))||b.duration-a.duration);
  for(const current of cumulative){
    const priors=facts.filter(prior=>
      prior.unit===current.unit&&prior.start===current.start&&day(prior.end)<day(current.end)&&
      day(current.end)-day(prior.end)>=55&&day(current.end)-day(prior.end)<=125&&prior.duration<current.duration
    ).sort((a,b)=>Math.abs((day(current.end)-day(a.end))-90)-Math.abs((day(current.end)-day(b.end))-90)||day(b.end)-day(a.end));
    if(!priors.length)continue;
    const value=quarterFromCumulative(current.val,priors[0].val);
    if(finite(value))return {value,method:"CUMULATIVE_DELTA",fact:current,priorFact:priors[0],reason:null};
  }
  return {value:null,method:null,reason:facts.length?"NO_ALIGNED_QUARTER_FLOW":"NO_FLOW_FACT"};
}
function compareCapexHistory(document,candidateTag,asOf){
  const candidates=uniqueSafeRows(rawFactsForTag(document,candidateTag,asOf,{maxDuration:400,units:["USD"]}));
  const mapped=mappedFactsForMetric(document,"capex",asOf,{maxDuration:400});
  const acc=comparisonAccumulator();
  for(const candidate of candidates){
    const matches=mapped.filter(row=>row.start===candidate.start&&row.end===candidate.end&&row.unit===candidate.unit);
    if(!matches.length)continue;
    const values=[...new Set(matches.map(row=>row.val))];
    if(values.length!==1){acc.mappedConflict++;continue;}
    addComparison(acc,candidate.val,values[0]);
  }
  return acc;
}

export function buildSecSemanticRecoveryDiagnosticFromDocuments({members=[],factsByCik=new Map(),submissionsByCik=new Map(),asOf}={}){
  const active=buildDocumentFocusDiagnosticFromDocuments({members,factsByCik,submissionsByCik,asOf,maxAgeDays:ACTIVE_MAX_AGE_DAYS});
  const extended=buildDocumentFocusDiagnosticFromDocuments({members,factsByCik,submissionsByCik,asOf,maxAgeDays:EXTENDED_MAX_AGE_DAYS});
  const recovered={
    eps:{count:0,filedAgeBuckets:{}},
    revenue:{count:0,filedAgeBuckets:{}},
    netIncome:{count:0,filedAgeBuckets:{}},
  };
  const epsBasicComparison=comparisonAccumulator();
  const revenueIncludedTaxComparison=comparisonAccumulator();
  const capexComparisons=Object.fromEntries(CAPEX_AUDIT_TAGS.map(tag=>[tag,comparisonAccumulator()]));
  const incremental={
    epsBasic:{d185:0,d240:0},
    revenueIncludingTax:{d185:0,d240:0},
    capexPotentialFcf:{
      d185:{issuers:0,byTag:{}},
      d240:{issuers:0,byTag:{}},
    },
  };
  let validDocuments=0,nonFinancial=0;

  for(const member of members){
    const cik=String(member?.cik??"").replace(/\D/g,"").padStart(10,"0");
    const document=factsByCik.get(cik);
    const validation=validateSecCompanyFactsDocument(document);
    if(validation.status!=="PASS"||validation.cik!==cik)continue;
    validDocuments++;
    const division=sicDivision(submissionsByCik.get(cik)?.sic);
    const isNonFinancial=division?.financial===false;
    if(isNonFinancial)nonFinancial++;

    for(const metric of ["eps","revenue","netIncome"]){
      const a=selectDocumentFocusComparablePair(document,{metric,asOf,maxAgeDays:ACTIVE_MAX_AGE_DAYS});
      const e=selectDocumentFocusComparablePair(document,{metric,asOf,maxAgeDays:EXTENDED_MAX_AGE_DAYS});
      if(!a.current&&e.current){
        recovered[metric].count++;
        bump(recovered[metric].filedAgeBuckets,filedAgeBucket(ageDays(e.current.filed,asOf)));
      }
    }

    const epsBasic185=selectPairForExactTag(document,{tag:EPS_BASIC_TAG,asOf,maxAgeDays:ACTIVE_MAX_AGE_DAYS,units:E1_R5_SEC_CONTRACT.units.eps});
    const epsBasic240=selectPairForExactTag(document,{tag:EPS_BASIC_TAG,asOf,maxAgeDays:EXTENDED_MAX_AGE_DAYS,units:E1_R5_SEC_CONTRACT.units.eps});
    const epsMapped185=selectDocumentFocusComparablePair(document,{metric:"eps",asOf,maxAgeDays:ACTIVE_MAX_AGE_DAYS});
    const epsMapped240=selectDocumentFocusComparablePair(document,{metric:"eps",asOf,maxAgeDays:EXTENDED_MAX_AGE_DAYS});
    if(!epsMapped185.current&&epsBasic185.current)incremental.epsBasic.d185++;
    if(!epsMapped240.current&&epsBasic240.current)incremental.epsBasic.d240++;
    mergeComparison(epsBasicComparison,compareCandidateTagToMapped(document,{candidateTag:EPS_BASIC_TAG,metric:"eps",asOf}));

    const revenueCandidate185=selectPairForExactTag(document,{tag:REVENUE_INCLUDED_TAX_TAG,asOf,maxAgeDays:ACTIVE_MAX_AGE_DAYS,units:["USD"]});
    const revenueCandidate240=selectPairForExactTag(document,{tag:REVENUE_INCLUDED_TAX_TAG,asOf,maxAgeDays:EXTENDED_MAX_AGE_DAYS,units:["USD"]});
    const revenueMapped185=selectDocumentFocusComparablePair(document,{metric:"revenue",asOf,maxAgeDays:ACTIVE_MAX_AGE_DAYS});
    const revenueMapped240=selectDocumentFocusComparablePair(document,{metric:"revenue",asOf,maxAgeDays:EXTENDED_MAX_AGE_DAYS});
    if(!revenueMapped185.current&&revenueCandidate185.current)incremental.revenueIncludingTax.d185++;
    if(!revenueMapped240.current&&revenueCandidate240.current)incremental.revenueIncludingTax.d240++;
    mergeComparison(revenueIncludedTaxComparison,compareCandidateTagToMapped(document,{candidateTag:REVENUE_INCLUDED_TAX_TAG,metric:"revenue",asOf}));

    for(const tag of CAPEX_AUDIT_TAGS)mergeComparison(capexComparisons[tag],compareCapexHistory(document,tag,asOf));

    if(isNonFinancial){
      for(const [key,maxAgeDays] of [["d185",ACTIVE_MAX_AGE_DAYS],["d240",EXTENDED_MAX_AGE_DAYS]]){
        const revenuePair=selectDocumentFocusComparablePair(document,{metric:"revenue",asOf,maxAgeDays});
        if(!revenuePair.current)continue;
        const cfo=selectFiscalQuarterFlow(document,{metric:"operatingCashFlow",asOf,target:revenuePair.current});
        const mappedCapex=selectFiscalQuarterFlow(document,{metric:"capex",asOf,target:revenuePair.current});
        if(!finite(cfo.value)||finite(mappedCapex.value))continue;
        const available=[];
        for(const tag of CAPEX_AUDIT_TAGS){
          const candidate=selectQuarterFlowForExactTag(document,{tag,asOf,target:revenuePair.current});
          if(finite(candidate.value)){
            available.push(tag);
            bump(incremental.capexPotentialFcf[key].byTag,tag);
          }
        }
        if(available.length)incremental.capexPotentialFcf[key].issuers++;
      }
    }
  }

  return {
    status:"PASS",
    active:false,
    policy:{
      researchOnly:true,
      formulaChanged:false,
      scoringGateChanged:false,
      inputContractChanged:false,
      activeMaxAgeDays:ACTIVE_MAX_AGE_DAYS,
      extendedAgeDays:EXTENDED_MAX_AGE_DAYS,
      extendedAgeAccepted:false,
      candidateTagsAccepted:false,
      q4EpsAnnualMinusNineMonths:"FORBIDDEN",
    },
    counts:{issuerCount:members.length,validDocuments,nonFinancial},
    coverage:{active:coverageSnapshot(active),extended240:coverageSnapshot(extended)},
    recovered185To240:recovered,
    candidateSemantics:{
      epsBasic:{tag:EPS_BASIC_TAG,...finishComparison(epsBasicComparison),incrementalComparableIssuers:incremental.epsBasic},
      revenueIncludingTax:{tag:REVENUE_INCLUDED_TAX_TAG,...finishComparison(revenueIncludedTaxComparison),incrementalComparableIssuers:incremental.revenueIncludingTax},
      capex:Object.fromEntries(CAPEX_AUDIT_TAGS.map(tag=>[tag,{
        tag,
        ...finishComparison(capexComparisons[tag]),
        potentialFcfIssuers185:incremental.capexPotentialFcf.d185.byTag[tag]??0,
        potentialFcfIssuers240:incremental.capexPotentialFcf.d240.byTag[tag]??0,
      }])),
      capexRejectedByName:CAPEX_NAME_REJECTS.map(tag=>({tag,accepted:false,reason:"SEMANTICALLY_NOT_CASH_CAPEX_ACQUISITION"})),
    },
    potentialFcfRecovery:{
      d185:{...incremental.capexPotentialFcf.d185,accepted:false},
      d240:{...incremental.capexPotentialFcf.d240,accepted:false},
    },
    networkCalls:0,
    dbWrites:0,
  };
}

function formatCoverage(label,item){return `${label}:${pctText(item?.coverage)}(${item?.eligible??0}/${item?.total??0})`;}
function formatComparison(item){
  const ratio=finite(item?.medianRatio)?item.medianRatio.toFixed(6):"-";
  const diff=finite(item?.medianAbsPctDiff)?`${item.medianAbsPctDiff.toFixed(2)}%`:"-";
  return `overlap=${item?.overlapPeriods??0} exact=${item?.exact??0} within1=${item?.within1Pct??0} within5=${item?.within5Pct??0} signMismatch=${item?.signMismatch??0} mappedConflict=${item?.mappedConflict??0} medianRatio=${ratio} medianAbsDiff=${diff} accepted=${item?.accepted===true?"true":"false"}`;
}
export function formatEarningsR5SecSemanticRecoveryDiagnosticText(report){
  const active=report?.coverage?.active??{},extended=report?.coverage?.extended240??{};
  const lines=[
    `E1-R5 SEC SEMANTIC RECOVERY AUDIT: ${report?.status??"UNKNOWN"}`,
    `AT: ${report?.at??"-"}`,
    `AS_OF: ${report?.asOf??"-"}`,
    `POLICY: RESEARCH_ONLY formulaChanged=${report?.policy?.formulaChanged===true?"true":"false"} gateChanged=${report?.policy?.scoringGateChanged===true?"true":"false"} contractChanged=${report?.policy?.inputContractChanged===true?"true":"false"} activeMaxAgeDays=${report?.policy?.activeMaxAgeDays??"-"} extendedAgeDays=${report?.policy?.extendedAgeDays??"-"} extendedAccepted=${report?.policy?.extendedAgeAccepted===true?"true":"false"}`,
    `FILES: companyFacts=${report?.files?.companyFacts??0} submissions=${report?.files?.submissions??0}`,
    `ACTIVE_185: ${formatCoverage("EPS",active.eps)} ${formatCoverage("REVENUE",active.revenue)} ${formatCoverage("MARGIN",active.margin)} ${formatCoverage("NET",active.netIncome)} ${formatCoverage("FCF",active.fcf)}`,
    `COUNTERFACTUAL_240: ${formatCoverage("EPS",extended.eps)} ${formatCoverage("REVENUE",extended.revenue)} ${formatCoverage("MARGIN",extended.margin)} ${formatCoverage("NET",extended.netIncome)} ${formatCoverage("FCF",extended.fcf)}`,
  ];
  for(const metric of ["eps","revenue","netIncome"]){
    const item=report?.recovered185To240?.[metric]??{};
    lines.push(`RECOVERED_185_TO_240_${metric.toUpperCase()}: ${item.count??0} filedAge=${sortedMapText(item.filedAgeBuckets,{limit:20})}`);
  }
  const eps=report?.candidateSemantics?.epsBasic??{};
  const revenue=report?.candidateSemantics?.revenueIncludingTax??{};
  lines.push(
    `EPS_BASIC_SEMANTICS: ${formatComparison(eps)} incremental185=${eps?.incrementalComparableIssuers?.d185??0} incremental240=${eps?.incrementalComparableIssuers?.d240??0}`,
    `REVENUE_INCLUDED_TAX_SEMANTICS: ${formatComparison(revenue)} incremental185=${revenue?.incrementalComparableIssuers?.d185??0} incremental240=${revenue?.incrementalComparableIssuers?.d240??0}`,
  );
  for(const tag of CAPEX_AUDIT_TAGS){
    const item=report?.candidateSemantics?.capex?.[tag]??{};
    lines.push(`CAPEX_CANDIDATE_${tag}: ${formatComparison(item)} potentialFcf185=${item?.potentialFcfIssuers185??0} potentialFcf240=${item?.potentialFcfIssuers240??0}`);
  }
  lines.push(
    `CAPEX_POTENTIAL_FCF_185: issuers=${report?.potentialFcfRecovery?.d185?.issuers??0} byTag=${sortedMapText(report?.potentialFcfRecovery?.d185?.byTag)} accepted=${report?.potentialFcfRecovery?.d185?.accepted===true?"true":"false"}`,
    `CAPEX_POTENTIAL_FCF_240: issuers=${report?.potentialFcfRecovery?.d240?.issuers??0} byTag=${sortedMapText(report?.potentialFcfRecovery?.d240?.byTag)} accepted=${report?.potentialFcfRecovery?.d240?.accepted===true?"true":"false"}`,
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

export async function runEarningsR5SecSemanticRecoveryDiagnostic(options={}){
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
  const report=buildSecSemanticRecoveryDiagnosticFromDocuments({members,factsByCik,submissionsByCik,asOf});
  report.at=new Date().toISOString();
  report.asOf=asOf;
  report.files={companyFacts:factsByCik.size,submissions:submissionsByCik.size};
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const cli=parseArgs();
    const report=await runEarningsR5SecSemanticRecoveryDiagnostic({
      incoming:cli.incoming?path.resolve(cli.incoming):undefined,
      coreFile:cli.core?path.resolve(cli.core):undefined,
      companyFactsDir:cli["companyfacts-dir"]?path.resolve(cli["companyfacts-dir"]):undefined,
      submissionsDir:cli["submissions-dir"]?path.resolve(cli["submissions-dir"]):undefined,
      asOf:cli["as-of"]??undefined,
    });
    console.log(formatEarningsR5SecSemanticRecoveryDiagnosticText(report));
  }catch(error){
    console.log(`E1-R5 SEC SEMANTIC RECOVERY AUDIT: FAILED\r\nCODE: ${error?.code??"E1_R5_SEC_SEMANTIC_RECOVERY_FAILED"}`);
    process.exitCode=1;
  }
}
