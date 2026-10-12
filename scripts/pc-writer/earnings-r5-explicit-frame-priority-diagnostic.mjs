import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {E1_R5_SEC_CONTRACT,secUnitAllowed,validateSecCompanyFactsDocument} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {latestMatureFrame} from "../../lib/market-score/sec-earnings-e1-r2-provider.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {sicDivision,selectCompanyFact,selectCurrentQuarterFlow} from "./earnings-r5-current-frame-audit.mjs";

export const VERSION="E1-R5-EXPLICIT-FRAME-PRIORITY-DIAGNOSTIC-R1";
const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const clean=v=>String(v??"").trim();
const day=v=>{if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;const ms=Date.parse(`${v}T00:00:00Z`);return Number.isFinite(ms)?Math.floor(ms/86400000):null;};
const duration=f=>{const s=day(f?.start),e=day(f?.end);return s!=null&&e!=null&&e>=s?e-s+1:null;};
const pct=(n,d)=>d>0?n/d:null;
const pctText=v=>finite(v)?`${(100*v).toFixed(1)}%`:"-";

function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function readJson(file){try{return file?JSON.parse(fs.readFileSync(file,"utf8")):null;}catch{return null;}}
function companyFile(directory,cik){const file=path.join(directory,`CIK${cik}.json`);return fs.existsSync(file)?file:null;}

function exactFrameCandidates(document,{metric,tag,frame,asOf}){
  const concept=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]?.[tag];
  if(!concept?.units||typeof concept.units!=="object")return [];
  const out=[];
  for(const [unit,rows] of Object.entries(concept.units)){
    if(!secUnitAllowed(metric,unit)||!Array.isArray(rows))continue;
    for(const fact of rows){
      if(!fact||fact.frame!==frame||!E1_R5_SEC_CONTRACT.forms.includes(clean(fact.form))||!finite(fact.val))continue;
      if(typeof fact.filed==="string"&&fact.filed>asOf)continue;
      const d=duration(fact);if(!Number.isInteger(d)||d<55||d>120)continue;
      out.push({...fact,tag,unit,duration:d});
    }
  }
  out.sort((a,b)=>String(b.filed??"").localeCompare(String(a.filed??""))||String(b.accn??"").localeCompare(String(a.accn??"")));
  return out;
}
function chooseExact(rows){
  if(!rows.length)return {fact:null,reason:"NO_EXACT_FRAME_FACT"};
  const filed=String(rows[0].filed??"");const top=rows.filter(r=>String(r.filed??"")===filed);
  if(new Set(top.map(r=>r.val)).size!==1)return {fact:null,reason:"FACT_CONFLICT"};
  return {fact:top[0],reason:null};
}
export function selectExactExplicitFrameFact(document,{metric,frame,asOf,tag=null}={}){
  for(const t of tag?[tag]:(E1_R5_SEC_CONTRACT.tags?.[metric]??[])){
    const chosen=chooseExact(exactFrameCandidates(document,{metric,tag:t,frame,asOf}));
    if(chosen.fact)return {...chosen,tag:t};
    if(chosen.reason==="FACT_CONFLICT")return {...chosen,tag:t};
  }
  return {fact:null,reason:"NO_EXACT_FRAME_FACT",tag:null};
}
function pairCompatible(current,prior){
  if(!current||!prior||current.tag!==prior.tag||current.unit!==prior.unit)return false;
  const ce=day(current.end),pe=day(prior.end);if(ce==null||pe==null)return false;
  const gap=ce-pe;if(gap<320||gap>410)return false;
  return Number.isInteger(current.duration)&&Number.isInteger(prior.duration)&&Math.abs(current.duration-prior.duration)<=45;
}
export function selectPriorityComparablePair(document,{metric,currentFrame,priorFrame,currentEnd,priorEnd,asOf}={}){
  for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){
    const ec=selectExactExplicitFrameFact(document,{metric,frame:currentFrame,asOf,tag});
    const ep=selectExactExplicitFrameFact(document,{metric,frame:priorFrame,asOf,tag});
    if(ec.reason==="FACT_CONFLICT"||ep.reason==="FACT_CONFLICT")return {current:null,prior:null,tag,source:"EXACT",reason:"FACT_CONFLICT"};
    if(ec.fact&&ep.fact&&pairCompatible(ec.fact,ep.fact))return {current:ec.fact,prior:ep.fact,tag,source:"EXACT",reason:null};
    const bc=selectCompanyFact(document,{metric,frame:currentFrame,frameEnd:currentEnd,asOf,tag});
    const bp=selectCompanyFact(document,{metric,frame:priorFrame,frameEnd:priorEnd,asOf,tag});
    if(bc.fact&&bp.fact&&pairCompatible(bc.fact,bp.fact))return {current:bc.fact,prior:bp.fact,tag,source:"GEOMETRY",reason:null};
  }
  return {current:null,prior:null,tag:null,source:null,reason:"NO_COMPARABLE_PAIR"};
}

export function buildExplicitFramePriorityDiagnosticFromDocuments({members=[],factsByCik=new Map(),submissionsByCik=new Map(),frame,asOf}={}){
  const counts={issuers:members.length,valid:0,nonFinancial:0};
  const baseline={eps:0,revenue:0,margin:0,net:0,fcf:0};
  const priority={eps:0,revenue:0,margin:0,net:0,fcf:0};
  const exactRecovered={eps:0,revenue:0,margin:0,net:0,fcf:0};
  const rejectedExactCurrent={eps:0,revenue:0,operatingIncome:0,netIncome:0};
  const samples={eps:[],revenue:[],margin:[],net:[],fcf:[]};

  for(const member of members){
    const cik=String(member?.cik??"").replace(/\D/g,"").padStart(10,"0");
    const doc=factsByCik.get(cik);const validation=validateSecCompanyFactsDocument(doc);
    if(validation.status!=="PASS"||validation.cik!==cik)continue;
    counts.valid++;
    const isNonFinancial=sicDivision(submissionsByCik.get(cik)?.sic)?.financial===false;if(isNonFinancial)counts.nonFinancial++;

    for(const metric of ["eps","revenue","operatingIncome","netIncome"]){
      const exact=selectExactExplicitFrameFact(doc,{metric,frame:frame.frame,asOf});
      const base=selectCompanyFact(doc,{metric,frame:frame.frame,frameEnd:frame.end,asOf});
      if(exact.fact&&!base.fact)rejectedExactCurrent[metric]++;
    }

    const basePair=metric=>{
      for(const tag of E1_R5_SEC_CONTRACT.tags?.[metric]??[]){
        const c=selectCompanyFact(doc,{metric,frame:frame.frame,frameEnd:frame.end,asOf,tag});
        const p=selectCompanyFact(doc,{metric,frame:frame.priorFrame,frameEnd:frame.priorEnd,asOf,tag});
        if(c.fact&&p.fact&&pairCompatible(c.fact,p.fact))return {current:c.fact,prior:p.fact,tag};
      }
      return {current:null,prior:null,tag:null};
    };
    const be=basePair("eps"),br=basePair("revenue"),bo=basePair("operatingIncome"),bn=basePair("netIncome");
    const pe=selectPriorityComparablePair(doc,{metric:"eps",currentFrame:frame.frame,priorFrame:frame.priorFrame,currentEnd:frame.end,priorEnd:frame.priorEnd,asOf});
    const pr=selectPriorityComparablePair(doc,{metric:"revenue",currentFrame:frame.frame,priorFrame:frame.priorFrame,currentEnd:frame.end,priorEnd:frame.priorEnd,asOf});
    const po=selectPriorityComparablePair(doc,{metric:"operatingIncome",currentFrame:frame.frame,priorFrame:frame.priorFrame,currentEnd:frame.end,priorEnd:frame.priorEnd,asOf});
    const pn=selectPriorityComparablePair(doc,{metric:"netIncome",currentFrame:frame.frame,priorFrame:frame.priorFrame,currentEnd:frame.end,priorEnd:frame.priorEnd,asOf});

    if(be.current)baseline.eps++;if(pe.current)priority.eps++;
    if(br.current&&br.prior?.val>0)baseline.revenue++;if(pr.current&&pr.prior?.val>0)priority.revenue++;
    if(bn.current)baseline.net++;if(pn.current)priority.net++;
    if(isNonFinancial&&br.current&&bo.current&&br.current.val!==0&&br.prior.val!==0)baseline.margin++;
    if(isNonFinancial&&pr.current&&po.current&&pr.current.val!==0&&pr.prior.val!==0)priority.margin++;

    if(isNonFinancial&&br.current){
      const cfo=selectCurrentQuarterFlow(doc,{metric:"operatingCashFlow",asOf,target:br.current});
      const capex=selectCurrentQuarterFlow(doc,{metric:"capex",asOf,target:br.current});
      if(finite(cfo.value)&&finite(capex.value))baseline.fcf++;
    }
    if(isNonFinancial&&pr.current){
      const cfo=selectCurrentQuarterFlow(doc,{metric:"operatingCashFlow",asOf,target:pr.current});
      const capex=selectCurrentQuarterFlow(doc,{metric:"capex",asOf,target:pr.current});
      if(finite(cfo.value)&&finite(capex.value))priority.fcf++;
    }

    for(const key of ["eps","revenue","margin","net","fcf"]){
      if(priority[key]>baseline[key]&&samples[key].length<12)samples[key].push(member?.ticker??cik);
    }
  }
  for(const key of Object.keys(exactRecovered))exactRecovered[key]=priority[key]-baseline[key];
  const total=counts.issuers,nonFin=counts.nonFinancial;
  return {version:VERSION,status:"PASS",active:false,frame,counts,baseline,priority,exactRecovered,rejectedExactCurrent,
    coverage:{baseline:{eps:pct(baseline.eps,total),revenue:pct(baseline.revenue,total),margin:pct(baseline.margin,nonFin),net:pct(baseline.net,total),fcf:pct(baseline.fcf,nonFin)},priority:{eps:pct(priority.eps,total),revenue:pct(priority.revenue,total),margin:pct(priority.margin,nonFin),net:pct(priority.net,total),fcf:pct(priority.fcf,nonFin)}},samples,
    policies:{researchOnly:true,counterfactualOnly:true,formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,productionActivation:false,exactExplicitFramePriorityAccepted:false,q4EpsAnnualMinusNineMonths:"FORBIDDEN"},networkCalls:0,dbWrites:0};
}

export function formatExplicitFramePriorityDiagnosticText(r){
  const b=r.coverage?.baseline??{},p=r.coverage?.priority??{};
  return [
    `E1-R5 EXPLICIT FRAME PRIORITY DIAGNOSTIC: ${r.status}`,
    `VERSION: ${r.version}`,
    `FRAME: ${r.frame?.frame??"-"} prior=${r.frame?.priorFrame??"-"} end=${r.frame?.end??"-"}`,
    `POLICY: RESEARCH_ONLY formulaChanged=false gateChanged=false contractChanged=false accepted=NO`,
    `REJECTED_EXACT_CURRENT: EPS=${r.rejectedExactCurrent.eps} REVENUE=${r.rejectedExactCurrent.revenue} OP=${r.rejectedExactCurrent.operatingIncome} NET=${r.rejectedExactCurrent.netIncome}`,
    `BASELINE: EPS=${pctText(b.eps)} (${r.baseline.eps}/${r.counts.issuers}) REVENUE=${pctText(b.revenue)} (${r.baseline.revenue}/${r.counts.issuers}) MARGIN=${pctText(b.margin)} (${r.baseline.margin}/${r.counts.nonFinancial}) NET=${pctText(b.net)} (${r.baseline.net}/${r.counts.issuers}) FCF=${pctText(b.fcf)} (${r.baseline.fcf}/${r.counts.nonFinancial})`,
    `EXACT_FRAME_PRIORITY: EPS=${pctText(p.eps)} (${r.priority.eps}/${r.counts.issuers}) REVENUE=${pctText(p.revenue)} (${r.priority.revenue}/${r.counts.issuers}) MARGIN=${pctText(p.margin)} (${r.priority.margin}/${r.counts.nonFinancial}) NET=${pctText(p.net)} (${r.priority.net}/${r.counts.issuers}) FCF=${pctText(p.fcf)} (${r.priority.fcf}/${r.counts.nonFinancial})`,
    `RECOVERED: EPS=${r.exactRecovered.eps} REVENUE=${r.exactRecovered.revenue} MARGIN=${r.exactRecovered.margin} NET=${r.exactRecovered.net} FCF=${r.exactRecovered.fcf}`,
    `Q4_EPS_ANNUAL_MINUS_9M: FORBIDDEN`,
    `FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`SCORING_GATE_CHANGED: NO`,`INPUT_CONTRACT_CHANGED: NO`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`
  ].join("\r\n")+"\r\n";
}

export function runExplicitFramePriorityDiagnostic({incoming,coreFile,asOf=new Date().toISOString().slice(0,10)}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming");
  const core=coreFile??path.join(defaultBase,"storage","core.sqlite");
  const universe=readLatestEarningsUniverse(core);const frame=latestMatureFrame(asOf);
  if(universe.status!=="PASS"||!frame)return {version:VERSION,status:"PARTIAL",reason:universe.status!=="PASS"?"UNIVERSE_REQUIRED":"FRAME_REQUIRED",active:false,networkCalls:0,dbWrites:0};
  const factsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory);
  const submissionsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory);
  const factsByCik=new Map(),submissionsByCik=new Map();
  for(const member of universe.members){const cik=String(member.cik).padStart(10,"0");factsByCik.set(cik,readJson(companyFile(factsDir,cik)));submissionsByCik.set(cik,readJson(companyFile(submissionsDir,cik)));}
  return buildExplicitFramePriorityDiagnosticFromDocuments({members:universe.members,factsByCik,submissionsByCik,frame,asOf});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const cli=parseArgs();const report=runExplicitFramePriorityDiagnostic({incoming:cli.incoming?path.resolve(cli.incoming):undefined,coreFile:cli.core?path.resolve(cli.core):undefined,asOf:cli["as-of"]??undefined});console.log(formatExplicitFramePriorityDiagnosticText(report));}
  catch(error){console.log(`E1-R5 EXPLICIT FRAME PRIORITY DIAGNOSTIC: FAILED\r\nCODE: ${error?.code??"E1_R5_EXPLICIT_FRAME_PRIORITY_FAILED"}`);process.exitCode=1;}
}
