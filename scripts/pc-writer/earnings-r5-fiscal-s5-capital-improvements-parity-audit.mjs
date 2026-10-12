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
import {selectNarrowCapexFlow} from "./earnings-r5-fiscal-s5-narrow-capex-audit.mjs";

export const VERSION="E1-R5-FISCAL-S5-CAPITAL-IMPROVEMENTS-PARITY-AUDIT-R1";
export const AGE_DAYS=210;
export const TARGET_TAG="PaymentsForCapitalImprovements";
export const TARGET_TICKERS=Object.freeze(["GLW","SNA"]);
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

function safeFacts(concept,asOf){
  const rows=concept?.units?.USD;if(!Array.isArray(rows))return [];
  const groups=new Map();
  for(const r of rows){if(!r||!E1_R5_SEC_CONTRACT.forms.includes(clean(r.form))||!finite(r.val)||typeof r.filed!=="string"||r.filed>asOf)continue;const d=duration(r);if(!Number.isInteger(d)||d<55||d>400)continue;const key=`${r.start}|${r.end}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push({...r,duration:d});}
  const out=[];
  for(const group of groups.values()){group.sort((a,b)=>String(b.filed).localeCompare(String(a.filed))||String(b.accn??"").localeCompare(String(a.accn??"")));const latest=group[0].filed,top=group.filter(x=>x.filed===latest);if(new Set(top.map(x=>x.val)).size===1)out.push(top[0]);}
  return out;
}
export function historicalParity(document,asOf){
  const gaap=document?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]??{},candidate=safeFacts(gaap[TARGET_TAG],asOf),approved=[];
  for(const tag of E1_R5_SEC_CONTRACT.tags?.capex??[])for(const fact of safeFacts(gaap[tag],asOf))approved.push({...fact,tag});
  const byPeriod=new Map(approved.map(x=>[`${x.start}|${x.end}`,x]));
  let overlap=0,exact=0,within01pct=0,within1pct=0,greater=0,less=0;
  for(const c of candidate){const a=byPeriod.get(`${c.start}|${c.end}`);if(!a)continue;overlap++;const diff=c.val-a.val,scale=Math.max(1,Math.abs(a.val)),rel=Math.abs(diff)/scale;if(Math.abs(diff)<=Math.max(1e-9,Math.abs(a.val)*1e-9))exact++;if(rel<=.001)within01pct++;if(rel<=.01)within1pct++;if(diff>0)greater++;else if(diff<0)less++;}
  return {candidateFacts:candidate.length,approvedFacts:approved.length,overlap,exact,within01pct,within1pct,greater,less};
}

function isCapexish(label){return /(capital expenditures?|capital spending|property.*equipment|plant.*equipment|capital improvements?|machinery|fixed assets|construction|flight equipment)/i.test(clean(label));}
function isTotalLabel(label){const x=clean(label).toLowerCase();return /^capital expenditures?$/.test(x)||/^capital spending$/.test(x)||/^(purchases?|payments?|acquisitions?|additions?) (of |for |to )?(property,? plant(,? and)? equipment|property and equipment|plant and equipment|fixed assets)$/.test(x);}
async function scanPre(file,adshSet){
  if(!fs.existsSync(file))return [];
  const rl=readline.createInterface({input:fs.createReadStream(file,{encoding:"utf8"}),crlfDelay:Infinity});let idx=null;const out=[];
  for await(const raw of rl){const line=raw.replace(/\r$/,"");if(!idx){const h=line.split("\t");idx=Object.fromEntries(h.map((x,i)=>[x.toLowerCase(),i]));continue;}const c=line.split("\t"),adsh=idx.adsh!=null?c[idx.adsh]:"";if(!adshSet.has(adsh))continue;const stmt=idx.stmt!=null?c[idx.stmt]:"",plabel=idx.plabel!=null?c[idx.plabel]:"";if(String(stmt).toUpperCase()!=="CF"||!isCapexish(plabel))continue;out.push({adsh,tag:idx.tag!=null?c[idx.tag]:"",line:idx.line!=null?c[idx.line]:"",plabel});}
  return out;
}
export async function presentationEvidence(targets=[],fsdsDirs=[]){
  const adshSet=new Set(targets.flatMap(x=>[x.currentAccn,x.priorAccn]).filter(Boolean)),rows=[];
  for(const dir of fsdsDirs)rows.push(...await scanPre(path.join(dir,"pre.txt"),adshSet));
  const byAdsh=new Map();for(const r of rows){if(!byAdsh.has(r.adsh))byAdsh.set(r.adsh,[]);byAdsh.get(r.adsh).push(r);}
  return targets.map(t=>{const current=byAdsh.get(t.currentAccn)??[],prior=byAdsh.get(t.priorAccn)??[],currentTarget=current.filter(r=>r.tag===TARGET_TAG),priorTarget=prior.filter(r=>r.tag===TARGET_TAG);const currentTotal=currentTarget.some(r=>isTotalLabel(r.plabel)),priorTotal=priorTarget.length===0||priorTarget.some(r=>isTotalLabel(r.plabel));const currentCompeting=current.filter(r=>r.tag!==TARGET_TAG&&isCapexish(r.plabel));const priorCompeting=prior.filter(r=>r.tag!==TARGET_TAG&&isCapexish(r.plabel));return {...t,current,prior,currentTarget,priorTarget,currentTotal,priorTotal,currentCompeting,priorCompeting};});
}

export function conservativeDecision(row){
  const parityStrong=row?.parity?.overlap>0&&row.parity.within1pct===row.parity.overlap;
  const presentationStrong=row?.currentTotal===true&&row?.priorTotal===true&&row?.currentCompeting?.length===0&&row?.priorCompeting?.length===0;
  return {parityStrong,presentationStrong,eligible:parityStrong||presentationStrong};
}

export async function runAudit({incoming,coreFile,fsdsDirs=[],asOf=new Date().toISOString().slice(0,10),ageDays=AGE_DAYS}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming"),core=coreFile??path.join(defaultBase,"storage","core.sqlite"),universe=readLatestEarningsUniverse(core);
  if(universe.status!=="PASS")return {status:"PARTIAL",version:VERSION,reason:"UNIVERSE_REQUIRED",networkCalls:0,dbWrites:0};
  const factsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory),subDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory),factsByCik=new Map(),submissionsByCik=new Map();
  for(const member of universe.members){const cik=padCik(member.cik),ff=resolveSecJson(factsDir,cik,"companyfacts"),sf=resolveSecJson(subDir,cik,"submissions");if(ff)factsByCik.set(cik,readJson(ff));if(sf)submissionsByCik.set(cik,readJson(sf));}
  let nonFinancial=0,baselineReady=0;const targets=[];
  for(const member of universe.members){const cik=padCik(member.cik),doc=factsByCik.get(cik),sub=submissionsByCik.get(cik),validation=validateSecCompanyFactsDocument(doc);if(!cik||validation.status!=="PASS"||validation.cik!==cik)continue;if(sicDivision(sub?.sic)?.financial!==false)continue;nonFinancial++;
    const revenue=selectFiscalComparablePairR2(doc,{metric:"revenue",asOf,maxAgeDays:ageDays});if(!revenue.current||!revenue.prior||!finite(revenue.current.val)||revenue.current.val<=0||!finite(revenue.prior.val)||revenue.prior.val<=0)continue;
    const cfo=selectFiscalQuarterFlowR2(doc,{metric:"operatingCashFlow",asOf,target:revenue.current}),approved=selectFiscalQuarterFlowR2(doc,{metric:"capex",asOf,target:revenue.current});if(finite(cfo.value)&&finite(approved.value)){baselineReady++;continue;}if(!finite(cfo.value)||finite(approved.value)||!TARGET_TICKERS.includes(String(member?.ticker??"").toUpperCase()))continue;
    const selected=selectNarrowCapexFlow(doc,{tag:TARGET_TAG,target:revenue.current,asOf});if(!finite(selected.value))continue;const concept=doc?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]?.[TARGET_TAG]??{};targets.push({cik,ticker:member.ticker,value:selected.value,method:selected.method,revenueEnd:revenue.current.end,currentAccn:selected.fact?.accn??null,priorAccn:selected.priorFact?.accn??null,label:concept.label??null,description:concept.description??null,parity:historicalParity(doc,asOf)});
  }
  const evidence=await presentationEvidence(targets,fsdsDirs);for(const row of evidence)row.decision=conservativeDecision(row);
  const eligible=evidence.filter(x=>x.decision.eligible),combined=baselineReady+eligible.length,required=Math.ceil(.70*nonFinancial-1e-12);
  return {status:"PASS",version:VERSION,asOf,ageDays,nonFinancial,baselineReady,targets:evidence,eligibleCount:eligible.length,combined,coverage:pct(combined,nonFinancial),required,need:Math.max(0,required-combined),policies:{researchOnly:true,accepted:false,formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,productionActivation:false,productiveAssetsAccepted:false,customTagAccepted:false,q4EpsAnnualMinusNineMonths:"FORBIDDEN"},networkCalls:0,dbWrites:0};
}
function rowsText(rows=[]){return rows.map(r=>`${r.tag}:${r.line}:${r.plabel}`).join(" || ")||"MISSING";}
export function formatAudit(r){const lines=[`E1-R5 FISCAL S5 CAPITAL IMPROVEMENTS PARITY AUDIT: ${r.status}`,`VERSION: ${r.version}`,`AS_OF: ${r.asOf}`,`AGE_DAYS: ${r.ageDays}`,`BASELINE: ready=${r.baselineReady}/${r.nonFinancial} coverage=${pctText(pct(r.baselineReady,r.nonFinancial))}`,`SUMMARY: eligible=${r.eligibleCount} combined=${r.combined}/${r.nonFinancial} coverage=${pctText(r.coverage)} gate=70.0% need=${r.need} accepted=NO`];for(const x of r.targets??[])lines.push(`TARGET: ${x.ticker} tag=${TARGET_TAG} method=${x.method} end=${x.revenueEnd} value=${x.value} parityOverlap=${x.parity.overlap} parityExact=${x.parity.exact} parityWithin1pct=${x.parity.within1pct} currentTotal=${x.currentTotal?"YES":"NO"} priorTotal=${x.priorTotal?"YES":"NO"} currentCompeting=${x.currentCompeting.length} priorCompeting=${x.priorCompeting.length} parityStrong=${x.decision.parityStrong?"YES":"NO"} presentationStrong=${x.decision.presentationStrong?"YES":"NO"} eligible=${x.decision.eligible?"YES":"NO"} description=${x.description??"-"} currentRows=${rowsText(x.current)} priorRows=${rowsText(x.prior)}`);lines.push(`PRODUCTIVE_ASSETS_ACCEPTED: NO`,`CUSTOM_TAG_ACCEPTED: NO`,`FISCAL_POLICY_ACCEPTED: NO`,`Q4_EPS_ANNUAL_MINUS_9M: FORBIDDEN`,`FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`SCORING_GATE_CHANGED: NO`,`INPUT_CONTRACT_CHANGED: NO`,`PRODUCTION_ACTIVATION: NO`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`);return lines.join("\r\n")+"\r\n";}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const cli=parseArgs(),dirs=cli["fsds-dirs"]?String(cli["fsds-dirs"]).split(";").filter(Boolean):[];const r=await runAudit({incoming:cli.incoming?path.resolve(cli.incoming):undefined,coreFile:cli.core?path.resolve(cli.core):undefined,fsdsDirs:dirs,asOf:cli["as-of"]??undefined,ageDays:cli.age?Number(cli.age):AGE_DAYS});console.log(formatAudit(r));if(r.status!=="PASS")process.exitCode=1;}catch(error){console.log(`E1-R5 FISCAL S5 CAPITAL IMPROVEMENTS PARITY AUDIT: FAILED\r\nCODE: ${error?.code??"E1_R5_FISCAL_S5_CAPITAL_IMPROVEMENTS_PARITY_FAILED"}`);process.exitCode=1;}}
