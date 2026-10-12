import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {E1_R5_SEC_CONTRACT,validateSecCompanyFactsDocument} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {quarterFromCumulative} from "../../lib/market-score/earnings-e1-r5-contract.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {sicDivision} from "./earnings-r5-current-frame-audit.mjs";
import {selectDocumentFocusComparablePair} from "./earnings-r5-document-focus-diagnostic.mjs";
import {selectFiscalQuarterFlow} from "./earnings-r5-fiscal-period-diagnostic.mjs";

export const E1_R5_CAPEX_CANDIDATE_COUNTERFACTUAL_VERSION="E1-R5-CAPEX-CANDIDATE-COUNTERFACTUAL-R1";
export const E1_R5_CAPEX_CANDIDATES=Object.freeze([
  "PaymentsToAcquireProductiveAssets",
  "PaymentsToAcquireOtherPropertyPlantAndEquipment",
  "PaymentsToAcquireOtherProductiveAssets",
  "PropertyPlantAndEquipmentAdditions",
  "CapitalExpendituresIncurredButNotYetPaid",
]);

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clean=value=>String(value??"").trim();
const day=value=>{
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const ms=Date.parse(`${value}T00:00:00Z`);return Number.isFinite(ms)?Math.floor(ms/86400000):null;
};
const duration=fact=>{const s=day(fact?.start),e=day(fact?.end);return s!=null&&e!=null&&e>=s?e-s+1:null;};
const pct=(n,d)=>Number.isInteger(n)&&Number.isInteger(d)&&d>0?n/d:null;
const pctText=value=>finite(value)?`${(100*value).toFixed(1)}%`:"-";

function parseArgs(argv=process.argv.slice(2)){
  const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;
}
function readJson(file){try{return file?JSON.parse(fs.readFileSync(file,"utf8")):null;}catch{return null;}}
function resolveSecJson(directory,cik,nested){
  const name=`CIK${cik}.json`;
  const candidates=[path.join(directory,name),path.join(directory,nested,name),path.join(directory,path.basename(directory),name)];
  return candidates.find(file=>fs.existsSync(file)&&fs.statSync(file).isFile())??null;
}
function median(values){
  const rows=values.filter(finite).sort((a,b)=>a-b);if(!rows.length)return null;
  const i=Math.floor(rows.length/2);return rows.length%2?rows[i]:(rows[i-1]+rows[i])/2;
}
function sameQuarterPeriod(fact,target){
  if(!fact||!target||fact.end!==target.end)return false;
  const a=fact.duration??duration(fact),b=target.duration??duration(target);
  return Number.isInteger(a)&&Number.isInteger(b)&&Math.abs(a-b)<=15;
}
function uniqueCandidateFacts(document,{tag,asOf}={}){
  const rows=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]?.[tag]?.units?.USD;
  if(!Array.isArray(rows))return [];
  const grouped=new Map();
  for(const fact of rows){
    if(!fact||!E1_R5_SEC_CONTRACT.forms.includes(clean(fact.form))||!finite(fact.val))continue;
    if(typeof fact.filed!=="string"||fact.filed>asOf)continue;
    const d=duration(fact),e=day(fact.end);
    if(!Number.isInteger(d)||d<55||d>400||e==null||e>day(asOf))continue;
    const row={...fact,tag,unit:"USD",duration:d};
    const key=`${tag}|USD|${row.start}|${row.end}`;
    if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(row);
  }
  const out=[];
  for(const values of grouped.values()){
    values.sort((a,b)=>String(b.filed).localeCompare(String(a.filed))||String(b.accn??"").localeCompare(String(a.accn??"")));
    const latest=values[0]?.filed;const top=values.filter(row=>row.filed===latest);
    if(new Set(top.map(row=>row.val)).size===1)out.push(top[0]);
  }
  return out;
}
export function selectCandidateQuarterFlow(document,{tag,asOf,target}={}){
  if(!target?.end)return {value:null,method:null,reason:"TARGET_PERIOD_MISSING"};
  const facts=uniqueCandidateFacts(document,{tag,asOf});
  const direct=facts.filter(fact=>fact.duration<=120&&sameQuarterPeriod(fact,target))
    .sort((a,b)=>String(b.filed).localeCompare(String(a.filed)));
  if(direct.length)return {value:direct[0].val,method:"DIRECT_QUARTER",fact:direct[0],priorFact:null,reason:null};
  const cumulative=facts.filter(fact=>fact.duration>120&&fact.end===target.end)
    .sort((a,b)=>String(b.filed).localeCompare(String(a.filed))||b.duration-a.duration);
  for(const current of cumulative){
    const priors=facts.filter(prior=>
      prior.start===current.start&&day(prior.end)<day(current.end)&&
      day(current.end)-day(prior.end)>=55&&day(current.end)-day(prior.end)<=125&&prior.duration<current.duration
    ).sort((a,b)=>Math.abs((day(current.end)-day(a.end))-90)-Math.abs((day(current.end)-day(b.end))-90)||day(b.end)-day(a.end));
    if(!priors.length)continue;
    const value=quarterFromCumulative(current.val,priors[0].val);
    if(finite(value))return {value,method:"CUMULATIVE_DELTA",fact:current,priorFact:priors[0],reason:null};
  }
  return {value:null,method:null,fact:null,priorFact:null,reason:facts.length?"NO_ALIGNED_QUARTER_FLOW":"NO_FLOW_FACT"};
}

export function buildCapexCandidateCounterfactualFromDocuments({members=[],factsByCik=new Map(),submissionsByCik=new Map(),asOf,ageWindows=[185,240,365],candidateTags=E1_R5_CAPEX_CANDIDATES}={}){
  const windows={};
  for(const maxAgeDays of ageWindows){
    let nonFinancial=0,baselineReady=0;
    const candidates={};
    for(const tag of candidateTags)candidates[tag]={tag,ready:0,overlap:0,identical:0,different:0,ratios:[],candidateOnlyAdds:0,samples:[]};
    for(const member of members){
      const cik=String(member?.cik??"").replace(/\D/g,"").padStart(10,"0");
      const document=factsByCik.get(cik);
      const validation=validateSecCompanyFactsDocument(document);
      if(validation.status!=="PASS"||validation.cik!==cik)continue;
      if(sicDivision(submissionsByCik.get(cik)?.sic)?.financial!==false)continue;
      nonFinancial++;
      const revenue=selectDocumentFocusComparablePair(document,{metric:"revenue",asOf,maxAgeDays});
      if(!revenue.current)continue;
      const cfo=selectFiscalQuarterFlow(document,{metric:"operatingCashFlow",asOf,target:revenue.current});
      const mapped=selectFiscalQuarterFlow(document,{metric:"capex",asOf,target:revenue.current});
      const base=finite(cfo.value)&&finite(mapped.value);if(base)baselineReady++;
      for(const tag of candidateTags){
        const row=candidates[tag];
        const candidate=selectCandidateQuarterFlow(document,{tag,asOf,target:revenue.current});
        if(finite(candidate.value))row.ready++;
        if(finite(mapped.value)&&finite(candidate.value)){
          row.overlap++;
          if(Math.abs(mapped.value-candidate.value)<=1e-9)row.identical++;else row.different++;
          if(mapped.value!==0)row.ratios.push(candidate.value/mapped.value);
        }
        if(finite(cfo.value)&&!finite(mapped.value)&&finite(candidate.value)){
          row.candidateOnlyAdds++;
          if(row.samples.length<12)row.samples.push({ticker:member?.ticker??null,cik});
        }
      }
    }
    for(const row of Object.values(candidates)){
      row.combinedReady=baselineReady+row.candidateOnlyAdds;
      row.combinedCoverage=pct(row.combinedReady,nonFinancial);
      row.passes70=finite(row.combinedCoverage)&&row.combinedCoverage>=0.70;
      row.medianCandidateToMappedRatio=median(row.ratios);
      delete row.ratios;
      row.accepted=false;
    }
    windows[String(maxAgeDays)]={maxAgeDays,nonFinancial,baselineReady,baselineCoverage:pct(baselineReady,nonFinancial),neededFor70:Math.max(0,Math.ceil(0.70*nonFinancial-1e-12)-baselineReady),candidates};
  }
  return {
    version:E1_R5_CAPEX_CANDIDATE_COUNTERFACTUAL_VERSION,
    status:"PASS",
    active:false,
    asOf,
    windows,
    policies:{researchOnly:true,counterfactualOnly:true,formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,productionActivation:false,q4EpsAnnualMinusNineMonths:"FORBIDDEN"},
    networkCalls:0,dbWrites:0,
  };
}

export function formatCapexCandidateCounterfactualText(report){
  const lines=[
    `E1-R5 CAPEX CANDIDATE COUNTERFACTUAL: ${report?.status??"UNKNOWN"}`,
    `VERSION: ${report?.version??"-"}`,
    `AS_OF: ${report?.asOf??"-"}`,
    `POLICY: RESEARCH_ONLY formulaChanged=${report?.policies?.formulaChanged===true?"true":"false"} gateChanged=${report?.policies?.scoringGateChanged===true?"true":"false"} contractChanged=${report?.policies?.inputContractChanged===true?"true":"false"}`,
  ];
  for(const key of Object.keys(report?.windows??{}).sort((a,b)=>Number(a)-Number(b))){
    const w=report.windows[key];
    lines.push(`WINDOW_${key}_BASELINE: ${pctText(w.baselineCoverage)} (${w.baselineReady}/${w.nonFinancial}) needFor70=${w.neededFor70}`);
    for(const tag of E1_R5_CAPEX_CANDIDATES){
      const c=w.candidates?.[tag];if(!c)continue;
      lines.push(`WINDOW_${key}_${tag}: ready=${c.ready} overlap=${c.overlap} identical=${c.identical} different=${c.different} medianRatio=${finite(c.medianCandidateToMappedRatio)?c.medianCandidateToMappedRatio.toFixed(6):"-"} add=${c.candidateOnlyAdds} combined=${pctText(c.combinedCoverage)} (${c.combinedReady}/${w.nonFinancial}) pass70=${c.passes70?"YES":"NO"} accepted=NO samples=${c.samples.map(x=>x.ticker??x.cik).join(",")||"-"}`);
    }
  }
  lines.push(`Q4_EPS_ANNUAL_MINUS_9M: ${report?.policies?.q4EpsAnnualMinusNineMonths??"-"}`,
    `NETWORK_CALLS: ${report?.networkCalls??0}`,`DB_WRITES: ${report?.dbWrites??0}`);
  return lines.join("\r\n")+"\r\n";
}

export function runCapexCandidateCounterfactual({incoming,coreFile,asOf=new Date().toISOString().slice(0,10)}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming");
  const core=coreFile??path.join(defaultBase,"storage","core.sqlite");
  const universe=readLatestEarningsUniverse(core);
  if(universe.status!=="PASS")return {version:E1_R5_CAPEX_CANDIDATE_COUNTERFACTUAL_VERSION,status:"PARTIAL",reason:"UNIVERSE_REQUIRED",active:false,networkCalls:0,dbWrites:0};
  const factsDir=path.join(inputDir,"companyfacts"),submissionsDir=path.join(inputDir,"submissions");
  const factsByCik=new Map(),submissionsByCik=new Map();
  for(const member of universe.members){
    const cik=String(member?.cik??"").replace(/\D/g,"").padStart(10,"0");
    factsByCik.set(cik,readJson(resolveSecJson(factsDir,cik,"companyfacts")));
    submissionsByCik.set(cik,readJson(resolveSecJson(submissionsDir,cik,"submissions")));
  }
  return buildCapexCandidateCounterfactualFromDocuments({members:universe.members,factsByCik,submissionsByCik,asOf});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const cli=parseArgs();
    const report=runCapexCandidateCounterfactual({incoming:cli.incoming?path.resolve(cli.incoming):undefined,coreFile:cli.core?path.resolve(cli.core):undefined,asOf:cli["as-of"]??undefined});
    console.log(formatCapexCandidateCounterfactualText(report));
  }catch(error){
    console.log(`E1-R5 CAPEX CANDIDATE COUNTERFACTUAL: FAILED\r\nCODE: ${error?.code??"E1_R5_CAPEX_CANDIDATE_COUNTERFACTUAL_FAILED"}`);process.exitCode=1;
  }
}
