import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import {fileURLToPath} from "node:url";
import {E1_R5_SEC_CONTRACT,validateSecCompanyFactsDocument} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {sicDivision} from "./earnings-r5-current-frame-audit.mjs";
import {selectFiscalComparablePairR2,selectFiscalQuarterFlowR2} from "./earnings-r5-fiscal-period-selector-r2.mjs";
import {selectNarrowCapexFlow,NARROW_CAPEX_TAGS} from "./earnings-r5-fiscal-s5-narrow-capex-audit.mjs";

export const VERSION="E1-R5-FISCAL-S5-SEMANTIC-EVIDENCE-AUDIT-R1";
export const AGE_DAYS=210;
export const STRICT_PP_E_TAGS=Object.freeze([
  "PaymentsToAcquireOtherPropertyPlantAndEquipment",
  "PaymentsForFlightEquipment",
]);
export const REVIEW_TAGS=Object.freeze([
  "PaymentsToAcquireOilAndGasPropertyAndEquipment",
  "PaymentsToAcquireOilAndGasProperty",
]);
const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const clean=v=>String(v??"").trim();
function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function padCik(v){const d=String(v??"").replace(/\D/g,"");return d?d.padStart(10,"0"):null;}
function resolveSecJson(directory,cik,nested){const name=`CIK${cik}.json`;return [path.join(directory,name),path.join(directory,nested,name),path.join(directory,path.basename(directory),name)].find(file=>fs.existsSync(file)&&fs.statSync(file).isFile())??null;}
function readJson(file){try{return file?JSON.parse(fs.readFileSync(file,"utf8")):null;}catch{return null;}}
const pct=(n,d)=>d>0?n/d:null;
const pctText=v=>finite(v)?`${(100*v).toFixed(1)}%`:"-";

export function classifyCandidateTag(tag){
  if(STRICT_PP_E_TAGS.includes(tag))return "STRICT_PP_E";
  if(REVIEW_TAGS.includes(tag))return "REVIEW_OIL_GAS";
  return "REJECT";
}
export function summarizeStrictRecoveries(recoveries=[],baselineReady=0,denominator=0){
  const byCik=new Map();
  for(const row of recoveries){if(!byCik.has(row.cik))byCik.set(row.cik,[]);byCik.get(row.cik).push(row);}
  let strictUnique=0,strictAny=0,ambiguousMulti=0,reviewOnly=0;
  for(const rows of byCik.values()){
    const strict=rows.filter(r=>classifyCandidateTag(r.tag)==="STRICT_PP_E");
    const review=rows.filter(r=>classifyCandidateTag(r.tag)==="REVIEW_OIL_GAS");
    if(strict.length)strictAny++;
    if(rows.length===1&&strict.length===1)strictUnique++;
    if(rows.length>1&&strict.length)ambiguousMulti++;
    if(!strict.length&&review.length)reviewOnly++;
  }
  const required=Math.ceil(.70*denominator-1e-12);
  return {
    strictUnique,strictAny,ambiguousMulti,reviewOnly,
    strictUniqueCombined:baselineReady+strictUnique,
    strictAnyCombined:baselineReady+strictAny,
    strictUniqueCoverage:pct(baselineReady+strictUnique,denominator),
    strictAnyCoverage:pct(baselineReady+strictAny,denominator),
    required,
    strictUniqueNeed:Math.max(0,required-(baselineReady+strictUnique)),
    strictAnyNeed:Math.max(0,required-(baselineReady+strictAny)),
  };
}

async function scanTsv(file,{adshSet=null,tagSet=null}={}){
  if(!fs.existsSync(file))return [];
  const input=fs.createReadStream(file,{encoding:"utf8"});
  const rl=readline.createInterface({input,crlfDelay:Infinity});
  let header=null,idx=null;const out=[];
  for await(const raw of rl){
    const line=raw.replace(/\r$/,"");
    if(!header){header=line.split("\t");idx=Object.fromEntries(header.map((x,i)=>[x.toLowerCase(),i]));continue;}
    const cols=line.split("\t");
    const adsh=idx.adsh!=null?cols[idx.adsh]:null,tag=idx.tag!=null?cols[idx.tag]:null;
    if(adshSet&&(!adsh||!adshSet.has(adsh)))continue;
    if(tagSet&&(!tag||!tagSet.has(tag)))continue;
    const row={};for(const key of ["adsh","tag","version","custom","abstract","datatype","iord","crdr","tlabel","doc","report","line","stmt","inpth","rfile","plabel","negating"]){if(idx[key]!=null)row[key]=cols[idx[key]]??"";}
    out.push(row);
  }
  return out;
}

export function buildRecoveryEvidence({members=[],factsByCik=new Map(),submissionsByCik=new Map(),asOf,ageDays=AGE_DAYS}={}){
  let valid=0,nonFinancial=0,baselineReady=0;
  const recoveries=[];
  for(const member of members){
    const cik=padCik(member?.cik),doc=factsByCik.get(cik),sub=submissionsByCik.get(cik),validation=validateSecCompanyFactsDocument(doc);
    if(!cik||validation.status!=="PASS"||validation.cik!==cik)continue;valid++;
    if(sicDivision(sub?.sic)?.financial!==false)continue;nonFinancial++;
    const revenue=selectFiscalComparablePairR2(doc,{metric:"revenue",asOf,maxAgeDays:ageDays});
    if(!revenue.current||!revenue.prior||!finite(revenue.current.val)||revenue.current.val<=0||!finite(revenue.prior.val)||revenue.prior.val<=0)continue;
    const cfo=selectFiscalQuarterFlowR2(doc,{metric:"operatingCashFlow",asOf,target:revenue.current});
    const approved=selectFiscalQuarterFlowR2(doc,{metric:"capex",asOf,target:revenue.current});
    if(finite(cfo.value)&&finite(approved.value)){baselineReady++;continue;}
    if(!finite(cfo.value)||finite(approved.value))continue;
    const hits=[];
    for(const tag of NARROW_CAPEX_TAGS){
      const selected=selectNarrowCapexFlow(doc,{tag,target:revenue.current,asOf});
      if(!finite(selected.value))continue;
      const concept=doc?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]?.[tag]??{};
      hits.push({
        cik,ticker:member?.ticker??null,tag,semanticClass:classifyCandidateTag(tag),method:selected.method,value:selected.value,
        revenueEnd:revenue.current.end,currentAccn:selected.fact?.accn??null,priorAccn:selected.priorFact?.accn??null,
        label:concept.label??null,description:concept.description??null,
      });
    }
    for(const hit of hits)recoveries.push({...hit,multi:hits.length>1});
  }
  return {valid,nonFinancial,baselineReady,recoveries,strict:summarizeStrictRecoveries(recoveries,baselineReady,nonFinancial)};
}

export async function buildPresentationEvidence(recoveries=[],fsdsDirs=[]){
  const adshSet=new Set(recoveries.flatMap(r=>[r.currentAccn,r.priorAccn]).filter(Boolean));
  const tagSet=new Set(recoveries.map(r=>r.tag));
  const pre=[],tagRows=[];
  for(const dir of fsdsDirs){
    pre.push(...await scanTsv(path.join(dir,"pre.txt"),{adshSet,tagSet}));
    tagRows.push(...await scanTsv(path.join(dir,"tag.txt"),{tagSet}));
  }
  const presentations=new Map();
  for(const row of pre){const key=`${row.adsh}|${row.tag}`;if(!presentations.has(key))presentations.set(key,[]);presentations.get(key).push(row);}
  const taxonomy=new Map();for(const row of tagRows){if(!taxonomy.has(row.tag))taxonomy.set(row.tag,row);}
  return recoveries.map(r=>({
    ...r,
    currentPresentation:presentations.get(`${r.currentAccn}|${r.tag}`)??[],
    priorPresentation:presentations.get(`${r.priorAccn}|${r.tag}`)??[],
    taxonomy:taxonomy.get(r.tag)??null,
  }));
}

export async function runFiscalS5SemanticEvidenceAudit({incoming,coreFile,fsdsDirs=[],asOf=new Date().toISOString().slice(0,10),ageDays=AGE_DAYS}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming"),core=coreFile??path.join(defaultBase,"storage","core.sqlite"),universe=readLatestEarningsUniverse(core);
  if(universe.status!=="PASS")return {status:"PARTIAL",version:VERSION,reason:"UNIVERSE_REQUIRED",networkCalls:0,dbWrites:0};
  const factsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory),subDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory),factsByCik=new Map(),submissionsByCik=new Map();
  for(const member of universe.members){const cik=padCik(member.cik),ff=resolveSecJson(factsDir,cik,"companyfacts"),sf=resolveSecJson(subDir,cik,"submissions");if(ff)factsByCik.set(cik,readJson(ff));if(sf)submissionsByCik.set(cik,readJson(sf));}
  const base=buildRecoveryEvidence({members:universe.members,factsByCik,submissionsByCik,asOf,ageDays});
  const evidence=await buildPresentationEvidence(base.recoveries,fsdsDirs);
  return {status:"PASS",version:VERSION,asOf,ageDays,...base,evidence,policies:{researchOnly:true,counterfactualOnly:true,accepted:false,formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,productionActivation:false,productiveAssetsAccepted:false,q4EpsAnnualMinusNineMonths:"FORBIDDEN"},networkCalls:0,dbWrites:0};
}

export function formatFiscalS5SemanticEvidenceAudit(r){
  const s=r.strict??{};const lines=[
    `E1-R5 FISCAL S5 SEMANTIC EVIDENCE AUDIT: ${r.status}`,
    `VERSION: ${r.version}`,
    `AS_OF: ${r.asOf}`,
    `AGE_DAYS: ${r.ageDays}`,
    `BASELINE: ready=${r.baselineReady}/${r.nonFinancial} coverage=${pctText(pct(r.baselineReady,r.nonFinancial))}`,
    `STRICT_SUMMARY: unique=${s.strictUnique} any=${s.strictAny} ambiguousMulti=${s.ambiguousMulti} reviewOnly=${s.reviewOnly} uniqueCombined=${s.strictUniqueCombined}/${r.nonFinancial} uniqueCoverage=${pctText(s.strictUniqueCoverage)} uniqueNeed=${s.strictUniqueNeed} anyCombined=${s.strictAnyCombined}/${r.nonFinancial} anyCoverage=${pctText(s.strictAnyCoverage)} anyNeed=${s.strictAnyNeed}`,
  ];
  for(const x of r.evidence??[]){
    const cp=(x.currentPresentation??[]).map(p=>`${p.stmt??"-"}:${p.line??"-"}:${p.plabel??"-"}`).join(" || ")||"MISSING";
    const pp=(x.priorPresentation??[]).map(p=>`${p.stmt??"-"}:${p.line??"-"}:${p.plabel??"-"}`).join(" || ")||"MISSING";
    const tax=x.taxonomy?`${x.taxonomy.custom??"-"}:${x.taxonomy.tlabel??"-"}:${x.taxonomy.doc??"-"}`:"MISSING";
    lines.push(`EVIDENCE: ${x.ticker??x.cik} tag=${x.tag} class=${x.semanticClass} multi=${x.multi?"YES":"NO"} method=${x.method} end=${x.revenueEnd} value=${x.value} currentAccn=${x.currentAccn??"-"} priorAccn=${x.priorAccn??"-"} companyfactsLabel=${x.label??"-"} companyfactsDescription=${x.description??"-"} taxonomy=${tax} currentPre=${cp} priorPre=${pp}`);
  }
  lines.push(`SAFE_TAGS: ${STRICT_PP_E_TAGS.join(",")}`,`REVIEW_TAGS: ${REVIEW_TAGS.join(",")}`,`PRODUCTIVE_ASSETS_ACCEPTED: NO`,`FISCAL_POLICY_ACCEPTED: NO`,`Q4_EPS_ANNUAL_MINUS_9M: FORBIDDEN`,`FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`SCORING_GATE_CHANGED: NO`,`INPUT_CONTRACT_CHANGED: NO`,`PRODUCTION_ACTIVATION: NO`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`);
  return lines.join("\r\n")+"\r\n";
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const cli=parseArgs(),dirs=cli["fsds-dirs"]?String(cli["fsds-dirs"]).split(";").filter(Boolean):[];const r=await runFiscalS5SemanticEvidenceAudit({incoming:cli.incoming?path.resolve(cli.incoming):undefined,coreFile:cli.core?path.resolve(cli.core):undefined,fsdsDirs:dirs,asOf:cli["as-of"]??undefined,ageDays:cli.age?Number(cli.age):AGE_DAYS});console.log(formatFiscalS5SemanticEvidenceAudit(r));if(r.status!=="PASS")process.exitCode=1;}catch(error){console.log(`E1-R5 FISCAL S5 SEMANTIC EVIDENCE AUDIT: FAILED\r\nCODE: ${error?.code??"E1_R5_FISCAL_S5_SEMANTIC_EVIDENCE_FAILED"}`);process.exitCode=1;}
}
