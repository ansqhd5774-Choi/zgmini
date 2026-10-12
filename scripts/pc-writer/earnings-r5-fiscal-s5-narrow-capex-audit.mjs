import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {E1_R5_SEC_CONTRACT,validateSecCompanyFactsDocument} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {sicDivision} from "./earnings-r5-current-frame-audit.mjs";
import {selectFiscalComparablePairR2,selectFiscalQuarterFlowR2} from "./earnings-r5-fiscal-period-selector-r2.mjs";

export const VERSION="E1-R5-FISCAL-S5-NARROW-CAPEX-AUDIT-R1";
export const AGE_DAYS=210;
export const NARROW_CAPEX_TAGS=Object.freeze([
  "PaymentsToAcquireOtherPropertyPlantAndEquipment",
  "PaymentsToAcquireOilAndGasPropertyAndEquipment",
  "PaymentsToAcquireOilAndGasProperty",
  "PaymentsForFlightEquipment",
]);
const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const DAY_MS=86400000;
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const clean=v=>String(v??"").trim();
const pct=(n,d)=>d>0?n/d:null;
const pctText=v=>finite(v)?`${(100*v).toFixed(1)}%`:"-";
function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function day(v){if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;const ms=Date.parse(`${v}T00:00:00Z`);return Number.isFinite(ms)?Math.floor(ms/DAY_MS):null;}
function duration(f){const s=day(f?.start),e=day(f?.end);return s!=null&&e!=null&&e>=s?e-s+1:null;}
function padCik(v){const d=String(v??"").replace(/\D/g,"");return d?d.padStart(10,"0"):null;}
function resolveSecJson(directory,cik,nested){const name=`CIK${cik}.json`;return [path.join(directory,name),path.join(directory,nested,name),path.join(directory,path.basename(directory),name)].find(file=>fs.existsSync(file)&&fs.statSync(file).isFile())??null;}
function readJson(file){try{return file?JSON.parse(fs.readFileSync(file,"utf8")):null;}catch{return null;}}
function chooseLatestSafe(rows){if(!rows.length)return null;const sorted=[...rows].sort((a,b)=>String(b.filed??"").localeCompare(String(a.filed??""))||String(b.accn??"").localeCompare(String(a.accn??"")));const latest=String(sorted[0].filed??"");const top=sorted.filter(r=>String(r.filed??"")===latest);return new Set(top.map(r=>r.val)).size===1?top[0]:null;}
function arbitraryTagFacts(document,tag,asOf){const concept=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]?.[tag];const rows=concept?.units?.USD;if(!Array.isArray(rows))return [];const grouped=new Map();for(const r of rows){if(!r||!E1_R5_SEC_CONTRACT.forms.includes(clean(r.form))||!finite(r.val)||typeof r.filed!=="string"||r.filed>asOf)continue;const d=duration(r);if(!Number.isInteger(d)||d<55||d>400)continue;const key=`${r.start}|${r.end}`;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push({...r,duration:d,tag,unit:"USD"});}const out=[];for(const group of grouped.values()){const selected=chooseLatestSafe(group);if(selected)out.push(selected);}return out;}
export function selectNarrowCapexFlow(document,{tag,target,asOf}={}){
  if(!target?.end)return {value:null,method:null,fact:null,priorFact:null,reason:"TARGET_PERIOD_MISSING"};
  const facts=arbitraryTagFacts(document,tag,asOf),td=target.duration??duration(target);
  const direct=facts.filter(f=>f.duration<=120&&f.end===target.end&&Number.isInteger(td)&&Math.abs(f.duration-td)<=15).sort((a,b)=>String(b.filed).localeCompare(String(a.filed)));
  if(direct.length)return {value:direct[0].val,method:"DIRECT_QUARTER",fact:direct[0],priorFact:null,reason:null};
  const cumulative=facts.filter(f=>f.duration>120&&f.end===target.end).sort((a,b)=>String(b.filed).localeCompare(String(a.filed))||b.duration-a.duration);
  for(const current of cumulative){const priors=facts.filter(p=>p.start===current.start&&day(p.end)<day(current.end)&&day(current.end)-day(p.end)>=55&&day(current.end)-day(p.end)<=125&&p.duration<current.duration).sort((a,b)=>Math.abs((day(current.end)-day(a.end))-90)-Math.abs((day(current.end)-day(b.end))-90)||day(b.end)-day(a.end));if(!priors.length)continue;const value=current.val-priors[0].val;if(finite(value))return {value,method:"CUMULATIVE_DELTA",fact:current,priorFact:priors[0],reason:null};}
  return {value:null,method:null,fact:null,priorFact:null,reason:facts.length?"NO_ALIGNED_QUARTER_FLOW":"NO_TAG_FACT"};
}
function emptyTagStats(tag){return {tag,recovered:new Set(),overlap:0,exact:0,within01pct:0,within1pct:0,greater:0,less:0,direct:0,cumulative:0};}
function addParity(stats,approved,candidate){if(!finite(approved)||!finite(candidate))return;stats.overlap++;const diff=candidate-approved,scale=Math.max(1,Math.abs(approved)),rel=Math.abs(diff)/scale;if(Math.abs(diff)<=Math.max(1e-9,Math.abs(approved)*1e-9))stats.exact++;if(rel<=.001)stats.within01pct++;if(rel<=.01)stats.within1pct++;if(diff>0)stats.greater++;else if(diff<0)stats.less++;}
function recoveryText(row){return `${row.ticker??row.cik}:${row.tag}:${row.method}:${row.revenueEnd}`;}

export function buildFiscalS5NarrowCapexAudit({members=[],factsByCik=new Map(),submissionsByCik=new Map(),asOf,ageDays=AGE_DAYS}={}){
  const stats=Object.fromEntries(NARROW_CAPEX_TAGS.map(tag=>[tag,emptyTagStats(tag)]));
  let valid=0,nonFinancial=0,baselineReady=0,revenueMissing=0,cfoMissing=0,capexOnlyMissing=0,bothFlowMissing=0;
  const recoveredUnion=new Set(),recoveries=[];let multiCandidate=0;
  for(const member of members){
    const cik=padCik(member?.cik),doc=factsByCik.get(cik),sub=submissionsByCik.get(cik),validation=validateSecCompanyFactsDocument(doc);
    if(!cik||validation.status!=="PASS"||validation.cik!==cik)continue;valid++;
    if(sicDivision(sub?.sic)?.financial!==false)continue;nonFinancial++;
    const revenue=selectFiscalComparablePairR2(doc,{metric:"revenue",asOf,maxAgeDays:ageDays});
    if(!revenue.current||!revenue.prior||!finite(revenue.current.val)||revenue.current.val<=0||!finite(revenue.prior.val)||revenue.prior.val<=0){revenueMissing++;continue;}
    const cfo=selectFiscalQuarterFlowR2(doc,{metric:"operatingCashFlow",asOf,target:revenue.current});
    const approved=selectFiscalQuarterFlowR2(doc,{metric:"capex",asOf,target:revenue.current});
    const hasCfo=finite(cfo.value),hasCapex=finite(approved.value);
    if(hasCfo&&hasCapex)baselineReady++;
    else if(!hasCfo&&!hasCapex)bothFlowMissing++;
    else if(!hasCfo)cfoMissing++;
    else capexOnlyMissing++;
    const hits=[];
    for(const tag of NARROW_CAPEX_TAGS){
      const candidate=selectNarrowCapexFlow(doc,{tag,target:revenue.current,asOf}),s=stats[tag];
      if(finite(candidate.value)){if(candidate.method==="DIRECT_QUARTER")s.direct++;if(candidate.method==="CUMULATIVE_DELTA")s.cumulative++;}
      if(hasCapex&&finite(candidate.value))addParity(s,approved.value,candidate.value);
      if(hasCfo&&!hasCapex&&finite(candidate.value)){s.recovered.add(cik);hits.push({tag,candidate});}
    }
    if(hits.length){recoveredUnion.add(cik);if(hits.length>1)multiCandidate++;for(const hit of hits)recoveries.push({cik,ticker:member?.ticker??null,tag:hit.tag,method:hit.candidate.method,revenueEnd:revenue.current.end,value:hit.candidate.value,multi:hits.length>1});}
  }
  const combinedReady=baselineReady+recoveredUnion.size,required=Math.ceil(.70*nonFinancial-1e-12);
  const rows=NARROW_CAPEX_TAGS.map(tag=>{const s=stats[tag];return {tag,recovered:s.recovered.size,overlap:s.overlap,exact:s.exact,within01pct:s.within01pct,within1pct:s.within1pct,greater:s.greater,less:s.less,direct:s.direct,cumulative:s.cumulative,accepted:false};});
  return {
    version:VERSION,status:"PASS",asOf,ageDays,
    counts:{issuers:members.length,valid,nonFinancial,baselineReady,revenueMissing,cfoMissing,capexOnlyMissing,bothFlowMissing},
    union:{recovered:recoveredUnion.size,multiCandidate,combinedReady,coverage:pct(combinedReady,nonFinancial),gate:.70,required,need:Math.max(0,required-combinedReady)},
    tags:rows,recoveries:recoveries.slice(0,40),
    policies:{researchOnly:true,counterfactualOnly:true,accepted:false,formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,productionActivation:false,productiveAssetsAccepted:false,q4EpsAnnualMinusNineMonths:"FORBIDDEN"},networkCalls:0,dbWrites:0,
  };
}
export function formatFiscalS5NarrowCapexAudit(r){const lines=[
  `E1-R5 FISCAL S5 NARROW CAPEX AUDIT: ${r.status}`,
  `VERSION: ${r.version}`,
  `AS_OF: ${r.asOf}`,
  `AGE_DAYS: ${r.ageDays}`,
  `BASELINE: ready=${r.counts.baselineReady}/${r.counts.nonFinancial} coverage=${pctText(pct(r.counts.baselineReady,r.counts.nonFinancial))}`,
  `MISSING_REASONS: revenue=${r.counts.revenueMissing} cfoOnly=${r.counts.cfoMissing} capexOnly=${r.counts.capexOnlyMissing} bothFlows=${r.counts.bothFlowMissing}`,
  `NARROW_UNION: recovered=${r.union.recovered} multiCandidate=${r.union.multiCandidate} combined=${r.union.combinedReady}/${r.counts.nonFinancial} coverage=${pctText(r.union.coverage)} gate=${pctText(r.union.gate)} need=${r.union.need} accepted=NO`,
];for(const x of r.tags)lines.push(`NARROW_TAG: ${x.tag} recovered=${x.recovered} overlap=${x.overlap} exact=${x.exact} within0.1pct=${x.within01pct} within1pct=${x.within1pct} greater=${x.greater} less=${x.less} direct=${x.direct} cumulative=${x.cumulative} accepted=NO`);for(const x of r.recoveries)lines.push(`RECOVERY: ${recoveryText(x)} multi=${x.multi?"YES":"NO"}`);lines.push(`PRODUCTIVE_ASSETS_ACCEPTED: NO`,`FISCAL_POLICY_ACCEPTED: NO`,`Q4_EPS_ANNUAL_MINUS_9M: FORBIDDEN`,`FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`SCORING_GATE_CHANGED: NO`,`INPUT_CONTRACT_CHANGED: NO`,`PRODUCTION_ACTIVATION: NO`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`);return lines.join("\r\n")+"\r\n";}
export async function runFiscalS5NarrowCapexAudit({incoming,coreFile,asOf=new Date().toISOString().slice(0,10),ageDays=AGE_DAYS}={}){const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming"),core=coreFile??path.join(defaultBase,"storage","core.sqlite"),universe=readLatestEarningsUniverse(core);if(universe.status!=="PASS")return {version:VERSION,status:"PARTIAL",reason:"UNIVERSE_REQUIRED",networkCalls:0,dbWrites:0};const factsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory),subDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory),factsByCik=new Map(),submissionsByCik=new Map();for(const member of universe.members){const cik=padCik(member.cik),ff=resolveSecJson(factsDir,cik,"companyfacts"),sf=resolveSecJson(subDir,cik,"submissions");if(ff)factsByCik.set(cik,readJson(ff));if(sf)submissionsByCik.set(cik,readJson(sf));}return buildFiscalS5NarrowCapexAudit({members:universe.members,factsByCik,submissionsByCik,asOf,ageDays});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const cli=parseArgs();const r=await runFiscalS5NarrowCapexAudit({incoming:cli.incoming?path.resolve(cli.incoming):undefined,coreFile:cli.core?path.resolve(cli.core):undefined,asOf:cli["as-of"]??undefined,ageDays:cli.age?Number(cli.age):AGE_DAYS});console.log(formatFiscalS5NarrowCapexAudit(r));if(r.status!=="PASS")process.exitCode=1;}catch(error){console.log(`E1-R5 FISCAL S5 NARROW CAPEX AUDIT: FAILED\r\nCODE: ${error?.code??"E1_R5_FISCAL_S5_NARROW_CAPEX_FAILED"}`);process.exitCode=1;}}
