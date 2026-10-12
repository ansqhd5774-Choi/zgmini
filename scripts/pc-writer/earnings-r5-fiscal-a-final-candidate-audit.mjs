import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {buildEarningsR5RawComponents} from "../../lib/market-score/earnings-e1-r5-shadow-calculator.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {buildFiscalCommonAnchorIssuerRowA3,readyForComponent} from "./earnings-r5-fiscal-quarter-shadow-audit-a3.mjs";
import {normalizeInvalidFiscalRowA4} from "./earnings-r5-fiscal-quarter-shadow-audit-a4.mjs";
import {selectFiscalComparablePairR2,selectFiscalQuarterFlowR2} from "./earnings-r5-fiscal-period-selector-r2.mjs";
import {selectNarrowCapexFlow} from "./earnings-r5-fiscal-s5-narrow-capex-audit.mjs";
import {validateSecCompanyFactsDocument} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";

export const VERSION="E1-R5-FISCAL-A-FINAL-CANDIDATE-AUDIT-R1";
export const AGE_DAYS=210;
export const SAFE_FALLBACKS=Object.freeze({
  ADP:"PaymentsToAcquireOtherPropertyPlantAndEquipment",
  DOW:"PaymentsToAcquireMachineryAndEquipment",
  LLY:"PaymentsToAcquireOtherPropertyPlantAndEquipment",
  GLW:"PaymentsForCapitalImprovements",
});
const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const pct=(n,d)=>d>0?n/d:null;
const pctText=v=>finite(v)?`${(100*v).toFixed(1)}%`:"-";
const rawText=v=>finite(v)?String(Math.round(v*1e6)/1e6):"null";
const rawMap={S1:"epsGrowthStrength",S2:"revenueGrowth",S3:"operatingMarginLevel",S4:"operatingMarginChange",S5:"freeCashFlowMargin",S7:"epsImprovementBreadth",S8:"profitableCompanyBreadth",S9:"improvingSectorBreadth"};
function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function padCik(v){const d=String(v??"").replace(/\D/g,"");return d?d.padStart(10,"0"):null;}
function resolveSecJson(directory,cik,nested){const name=`CIK${cik}.json`;return [path.join(directory,name),path.join(directory,nested,name),path.join(directory,path.basename(directory),name)].find(file=>fs.existsSync(file)&&fs.statSync(file).isFile())??null;}
function readJson(file){try{return file?JSON.parse(fs.readFileSync(file,"utf8")):null;}catch{return null;}}
function snapshot(rows){const r=buildEarningsR5RawComponents({issuerRows:rows});return Object.fromEntries(Object.entries(rawMap).map(([id,key])=>[id,{raw:r.components?.[key]?.raw??null,coverage:r.components?.[key]?.coverage??null,eligibleCount:r.components?.[key]?.eligibleCount??null}]));}
export function fallbackAllowed(ticker,tag){return SAFE_FALLBACKS[ticker]===tag&&!/ProductiveAssets/i.test(tag);}
export function applyFallbackToRow(row,{ticker,tag,value,method,revenueEnd}={}){
  if(!row||!fallbackAllowed(ticker,tag)||!finite(value))return {row,applied:false,reason:"NOT_ALLOWED"};
  if(finite(row?.current?.capex))return {row,applied:false,reason:"APPROVED_CAPEX_PRESENT"};
  if(!finite(row?.current?.operatingCashFlow)||!finite(row?.current?.revenue)||row.current.revenue<=0)return {row,applied:false,reason:"S5_PREREQUISITE_MISSING"};
  if(row?.audit?.revenueEnd&&revenueEnd&&row.audit.revenueEnd!==revenueEnd)return {row,applied:false,reason:"ANCHOR_MISMATCH"};
  return {row:{...row,current:{...row.current,capex:value},audit:{...row.audit,capexFallbackTag:tag,capexFallbackMethod:method,capexFallbackResearchOnly:true}},applied:true,reason:null};
}
function gate(key,ready,denom){const threshold=key==="S5"?.70:.80;return {ready,denom,coverage:pct(ready,denom),threshold,pass:denom>0&&ready/denom>=threshold};}
export function summarizeGates(rows){const nonFinancial=rows.filter(r=>r?.isFinancial===false).length,total=rows.length;const out={};for(const key of ["S1","S2","S3","S4","S5","S7","S8"]){const denom=["S3","S4","S5"].includes(key)?nonFinancial:total;out[key]=gate(key,rows.filter(r=>readyForComponent(r,key)).length,denom);}return {total,nonFinancial,gates:out};}

export function buildFinalCandidateFromDocuments({members=[],factsByCik=new Map(),submissionsByCik=new Map(),asOf,ageDays=AGE_DAYS}={}){
  const baselineRows=[],candidateRows=[],fallbacks=[];
  for(const member of members){
    const cik=padCik(member?.cik),doc=factsByCik.get(cik),sub=submissionsByCik.get(cik);
    const base=normalizeInvalidFiscalRowA4(buildFiscalCommonAnchorIssuerRowA3({member,companyFacts:doc,submission:sub,asOf,maxAgeDays:ageDays}));
    baselineRows.push(base);
    let next=base;
    const ticker=String(member?.ticker??"").toUpperCase(),tag=SAFE_FALLBACKS[ticker];
    if(tag&&validateSecCompanyFactsDocument(doc).status==="PASS"){
      const revenue=selectFiscalComparablePairR2(doc,{metric:"revenue",asOf,maxAgeDays:ageDays});
      const approved=selectFiscalQuarterFlowR2(doc,{metric:"capex",asOf,target:revenue.current});
      const selected=selectNarrowCapexFlow(doc,{tag,target:revenue.current,asOf});
      const applied=applyFallbackToRow(base,{ticker,tag,value:selected.value,method:selected.method,revenueEnd:revenue.current?.end??null});
      next=applied.row;
      fallbacks.push({ticker,cik,tag,approvedPresent:finite(approved.value),value:selected.value,method:selected.method,revenueEnd:revenue.current?.end??null,applied:applied.applied,reason:applied.reason,capexPctRevenue:finite(selected.value)&&finite(revenue.current?.val)&&revenue.current.val>0?selected.value/revenue.current.val:null,fcfMargin:applied.applied?(base.current.operatingCashFlow-selected.value)/base.current.revenue:null});
    }
    candidateRows.push(next);
  }
  const baseline=snapshot(baselineRows),candidate=snapshot(candidateRows),baseGates=summarizeGates(baselineRows),candidateGates=summarizeGates(candidateRows);
  const applied=fallbacks.filter(x=>x.applied);
  const allRequiredApplied=Object.keys(SAFE_FALLBACKS).every(t=>applied.some(x=>x.ticker===t));
  const allGatesPass=Object.values(candidateGates.gates).every(x=>x.pass);
  return {status:allRequiredApplied&&allGatesPass?"PASS":"FAILED",version:VERSION,asOf,ageDays,baseline,candidate,baseGates,candidateGates,fallbacks,summary:{requiredFallbacks:Object.keys(SAFE_FALLBACKS).length,appliedFallbacks:applied.length,allRequiredApplied,allGatesPass,s5RawDelta:finite(baseline.S5.raw)&&finite(candidate.S5.raw)?candidate.S5.raw-baseline.S5.raw:null},policies:{researchOnly:true,candidateOnly:true,fiscalPolicyAccepted:false,fallbackPolicyAccepted:false,formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,productionActivation:false,productiveAssetsAccepted:false,customTagAccepted:false,q4EpsAnnualMinusNineMonths:"FORBIDDEN"},networkCalls:0,dbWrites:0};
}
export function formatFinalCandidate(r){const lines=[`E1-R5 FISCAL A FINAL CANDIDATE AUDIT: ${r.status}`,`VERSION: ${r.version}`,`AS_OF: ${r.asOf}`,`AGE_DAYS: ${r.ageDays}`,`DENOMINATORS: total=${r.candidateGates.total} nonFinancial=${r.candidateGates.nonFinancial}`,`SUMMARY: requiredFallbacks=${r.summary.requiredFallbacks} appliedFallbacks=${r.summary.appliedFallbacks} allRequiredApplied=${r.summary.allRequiredApplied?"YES":"NO"} allGatesPass=${r.summary.allGatesPass?"YES":"NO"} s5RawBaseline=${rawText(r.baseline.S5.raw)} s5RawCandidate=${rawText(r.candidate.S5.raw)} s5RawDelta=${rawText(r.summary.s5RawDelta)}`];for(const key of ["S1","S2","S3","S4","S5","S7","S8"]){const b=r.baseGates.gates[key],c=r.candidateGates.gates[key];lines.push(`GATE_${key}: baseline=${b.ready}/${b.denom} ${pctText(b.coverage)} candidate=${c.ready}/${c.denom} ${pctText(c.coverage)} threshold=${pctText(c.threshold)} pass=${c.pass?"YES":"NO"}`);}for(const x of r.fallbacks)lines.push(`FALLBACK: ${x.ticker} tag=${x.tag} applied=${x.applied?"YES":"NO"} approvedPresent=${x.approvedPresent?"YES":"NO"} method=${x.method??"-"} end=${x.revenueEnd??"-"} value=${finite(x.value)?x.value:"-"} capexPctRevenue=${pctText(x.capexPctRevenue)} fcfMargin=${pctText(x.fcfMargin)} reason=${x.reason??"-"}`);lines.push(`SAFE_FALLBACKS: ${Object.entries(SAFE_FALLBACKS).map(([t,tag])=>`${t}:${tag}`).join(",")}`,`PRODUCTIVE_ASSETS_ACCEPTED: NO`,`CUSTOM_TAG_ACCEPTED: NO`,`FISCAL_POLICY_ACCEPTED: NO`,`FALLBACK_POLICY_ACCEPTED: NO`,`Q4_EPS_ANNUAL_MINUS_9M: FORBIDDEN`,`FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`SCORING_GATE_CHANGED: NO`,`INPUT_CONTRACT_CHANGED: NO`,`PRODUCTION_ACTIVATION: NO`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`);return lines.join("\r\n")+"\r\n";}
export async function runFinalCandidate({incoming,coreFile,asOf=new Date().toISOString().slice(0,10),ageDays=AGE_DAYS}={}){const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming"),core=coreFile??path.join(defaultBase,"storage","core.sqlite"),universe=readLatestEarningsUniverse(core);if(universe.status!=="PASS")return {status:"PARTIAL",version:VERSION,reason:"UNIVERSE_REQUIRED",networkCalls:0,dbWrites:0};const factsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory),subDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory),factsByCik=new Map(),submissionsByCik=new Map();for(const member of universe.members){const cik=padCik(member.cik),ff=resolveSecJson(factsDir,cik,"companyfacts"),sf=resolveSecJson(subDir,cik,"submissions");if(ff)factsByCik.set(cik,readJson(ff));if(sf)submissionsByCik.set(cik,readJson(sf));}return buildFinalCandidateFromDocuments({members:universe.members,factsByCik,submissionsByCik,asOf,ageDays});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const cli=parseArgs();const r=await runFinalCandidate({incoming:cli.incoming?path.resolve(cli.incoming):undefined,coreFile:cli.core?path.resolve(cli.core):undefined,asOf:cli["as-of"]??undefined,ageDays:cli.age?Number(cli.age):AGE_DAYS});console.log(formatFinalCandidate(r));if(r.status!=="PASS")process.exitCode=1;}catch(error){console.log(`E1-R5 FISCAL A FINAL CANDIDATE AUDIT: FAILED\r\nCODE: ${error?.code??"E1_R5_FISCAL_A_FINAL_CANDIDATE_FAILED"}`);process.exitCode=1;}}
