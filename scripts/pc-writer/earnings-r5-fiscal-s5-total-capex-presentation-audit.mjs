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

export const VERSION="E1-R5-FISCAL-S5-TOTAL-CAPEX-PRESENTATION-AUDIT-R1";
export const AGE_DAYS=210;
const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const clean=v=>String(v??"").trim();
const pct=(n,d)=>d>0?n/d:null;
const pctText=v=>finite(v)?`${(100*v).toFixed(1)}%`:"-";
const APPROVED_CAPEX_TAGS=new Set(E1_R5_SEC_CONTRACT.tags?.capex??[]);

function parseArgs(argv=process.argv.slice(2)){const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;}
function padCik(v){const d=String(v??"").replace(/\D/g,"");return d?d.padStart(10,"0"):null;}
function resolveSecJson(directory,cik,nested){const name=`CIK${cik}.json`;return [path.join(directory,name),path.join(directory,nested,name),path.join(directory,path.basename(directory),name)].find(file=>fs.existsSync(file)&&fs.statSync(file).isFile())??null;}
function readJson(file){try{return file?JSON.parse(fs.readFileSync(file,"utf8")):null;}catch{return null;}}

export function isPhysicalCashCapexCandidate(tag,concept={}){
  const t=clean(tag),desc=clean(concept?.description).toLowerCase();
  if(!t||APPROVED_CAPEX_TAGS.has(t))return false;
  if(!/^Payments/i.test(t))return false;
  if(!/(PropertyPlant|Equipment|Machinery|Flight|Building|Land)/i.test(t))return false;
  if(desc&&!/cash outflow|cash paid|cash payment/.test(desc))return false;
  if(/intangible|software|mineral|royalt|business|investment|securit|receivable|inventory|productive assets|real estate/.test(desc))return false;
  if(/OilAndGasProperty(?!AndEquipment)/i.test(t))return false;
  if(/OilAndGasPropertyAndEquipment/i.test(t))return false;
  return true;
}

export function classifyTotalCapexLabel(label){
  const text=clean(label).replace(/\s+/g," ").toLowerCase();
  if(!text)return "MISSING";
  const partial=/\b(other|flight|aircraft|oil|gas|mineral|machinery|vehicle|lease|software|intangible|land|building|property acquisitions?)\b/;
  if(partial.test(text))return "PARTIAL_OR_BROAD";
  if(/^capital expenditures?$/.test(text)||/^capital spending$/.test(text))return "TOTAL_CAPEX";
  if(/^(purchases?|payments?|acquisitions?|additions?) (of |for |to )?(property,? plant(,? and)? equipment|property and equipment|plant and equipment|fixed assets)$/.test(text))return "TOTAL_CAPEX";
  if(/^(purchases?|payments?) of property, plant and equipment$/.test(text))return "TOTAL_CAPEX";
  return "OTHER";
}

function cfLabels(rows=[]){return [...new Set(rows.filter(r=>String(r?.stmt??"").toUpperCase()==="CF").map(r=>clean(r?.plabel)).filter(Boolean))];}
export function strictPresentationDecision({currentRows=[],priorRows=[]}={}){
  const current=cfLabels(currentRows),prior=cfLabels(priorRows);
  const currentClasses=current.map(classifyTotalCapexLabel),priorClasses=prior.map(classifyTotalCapexLabel);
  const currentPass=currentClasses.includes("TOTAL_CAPEX")&&!currentClasses.includes("PARTIAL_OR_BROAD");
  const priorPass=prior.length===0||(priorClasses.includes("TOTAL_CAPEX")&&!priorClasses.includes("PARTIAL_OR_BROAD"));
  return {accepted:currentPass&&priorPass,current,currentClasses,prior,priorClasses};
}

async function scanPre(file,adshSet,tagSet){
  if(!fs.existsSync(file))return [];
  const input=fs.createReadStream(file,{encoding:"utf8"}),rl=readline.createInterface({input,crlfDelay:Infinity});
  let idx=null;const out=[];
  for await(const raw of rl){const line=raw.replace(/\r$/,"");if(!idx){const h=line.split("\t");idx=Object.fromEntries(h.map((x,i)=>[x.toLowerCase(),i]));continue;}const c=line.split("\t"),adsh=idx.adsh!=null?c[idx.adsh]:"",tag=idx.tag!=null?c[idx.tag]:"";if(!adshSet.has(adsh)||!tagSet.has(tag))continue;out.push({adsh,tag,stmt:idx.stmt!=null?c[idx.stmt]:"",line:idx.line!=null?c[idx.line]:"",plabel:idx.plabel!=null?c[idx.plabel]:""});}
  return out;
}

export function buildTotalCapexCandidates({members=[],factsByCik=new Map(),submissionsByCik=new Map(),asOf,ageDays=AGE_DAYS}={}){
  let valid=0,nonFinancial=0,baselineReady=0,capexOnlyMissing=0;
  const hits=[];
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
    capexOnlyMissing++;
    const gaap=doc?.facts?.[E1_R5_SEC_CONTRACT.taxonomy]??{};
    for(const [tag,concept] of Object.entries(gaap)){
      if(!isPhysicalCashCapexCandidate(tag,concept))continue;
      const selected=selectNarrowCapexFlow(doc,{tag,target:revenue.current,asOf});
      if(!finite(selected.value))continue;
      hits.push({cik,ticker:member?.ticker??null,tag,value:selected.value,method:selected.method,revenueEnd:revenue.current.end,currentAccn:selected.fact?.accn??null,priorAccn:selected.priorFact?.accn??null,label:concept?.label??null,description:concept?.description??null});
    }
  }
  return {valid,nonFinancial,baselineReady,capexOnlyMissing,hits};
}

export async function attachPresentation(hits=[],fsdsDirs=[]){
  const adshSet=new Set(hits.flatMap(x=>[x.currentAccn,x.priorAccn]).filter(Boolean)),tagSet=new Set(hits.map(x=>x.tag));
  const rows=[];for(const dir of fsdsDirs)rows.push(...await scanPre(path.join(dir,"pre.txt"),adshSet,tagSet));
  const byKey=new Map();for(const row of rows){const key=`${row.adsh}|${row.tag}`;if(!byKey.has(key))byKey.set(key,[]);byKey.get(key).push(row);}
  return hits.map(hit=>{const currentRows=byKey.get(`${hit.currentAccn}|${hit.tag}`)??[],priorRows=byKey.get(`${hit.priorAccn}|${hit.tag}`)??[],decision=strictPresentationDecision({currentRows,priorRows});return {...hit,currentRows,priorRows,decision};});
}

export async function runTotalCapexPresentationAudit({incoming,coreFile,fsdsDirs=[],asOf=new Date().toISOString().slice(0,10),ageDays=AGE_DAYS}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming"),core=coreFile??path.join(defaultBase,"storage","core.sqlite"),universe=readLatestEarningsUniverse(core);
  if(universe.status!=="PASS")return {status:"PARTIAL",version:VERSION,reason:"UNIVERSE_REQUIRED",networkCalls:0,dbWrites:0};
  const factsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory),subDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory),factsByCik=new Map(),submissionsByCik=new Map();
  for(const member of universe.members){const cik=padCik(member.cik),ff=resolveSecJson(factsDir,cik,"companyfacts"),sf=resolveSecJson(subDir,cik,"submissions");if(ff)factsByCik.set(cik,readJson(ff));if(sf)submissionsByCik.set(cik,readJson(sf));}
  const base=buildTotalCapexCandidates({members:universe.members,factsByCik,submissionsByCik,asOf,ageDays}),evidence=await attachPresentation(base.hits,fsdsDirs);
  const acceptedByCik=new Map();for(const row of evidence.filter(x=>x.decision.accepted)){if(!acceptedByCik.has(row.cik))acceptedByCik.set(row.cik,[]);acceptedByCik.get(row.cik).push(row);}
  const uniqueAccepted=[...acceptedByCik.entries()].filter(([,rows])=>rows.length===1).map(([,rows])=>rows[0]);
  const ambiguousAccepted=[...acceptedByCik.entries()].filter(([,rows])=>rows.length>1).flatMap(([,rows])=>rows);
  const combined=base.baselineReady+uniqueAccepted.length,required=Math.ceil(.70*base.nonFinancial-1e-12);
  return {status:"PASS",version:VERSION,asOf,ageDays,...base,evidence,strict:{uniqueAccepted,ambiguousAccepted,combined,coverage:pct(combined,base.nonFinancial),required,need:Math.max(0,required-combined)},policies:{researchOnly:true,counterfactualOnly:true,accepted:false,formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,productionActivation:false,productiveAssetsAccepted:false,q4EpsAnnualMinusNineMonths:"FORBIDDEN"},networkCalls:0,dbWrites:0};
}

function rowsText(rows=[]){return rows.map(r=>`${r.stmt||"-"}:${r.line||"-"}:${r.plabel||"-"}`).join(" || ")||"MISSING";}
export function formatTotalCapexPresentationAudit(r){
  const s=r.strict??{};const lines=[`E1-R5 FISCAL S5 TOTAL CAPEX PRESENTATION AUDIT: ${r.status}`,`VERSION: ${r.version}`,`AS_OF: ${r.asOf}`,`AGE_DAYS: ${r.ageDays}`,`BASELINE: ready=${r.baselineReady}/${r.nonFinancial} coverage=${pctText(pct(r.baselineReady,r.nonFinancial))}`,`CAPEX_ONLY_MISSING: ${r.capexOnlyMissing}`,`STRICT_TOTAL_SUMMARY: unique=${s.uniqueAccepted?.length??0} ambiguous=${s.ambiguousAccepted?.length??0} combined=${s.combined??0}/${r.nonFinancial} coverage=${pctText(s.coverage)} gate=70.0% need=${s.need??0} accepted=NO`];
  for(const x of r.evidence??[])lines.push(`CANDIDATE: ${x.ticker??x.cik} tag=${x.tag} method=${x.method} end=${x.revenueEnd} value=${x.value} strict=${x.decision.accepted?"YES":"NO"} companyfactsLabel=${x.label??"-"} currentPre=${rowsText(x.currentRows)} priorPre=${rowsText(x.priorRows)}`);
  lines.push(`PRODUCTIVE_ASSETS_ACCEPTED: NO`,`FISCAL_POLICY_ACCEPTED: NO`,`Q4_EPS_ANNUAL_MINUS_9M: FORBIDDEN`,`FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`SCORING_GATE_CHANGED: NO`,`INPUT_CONTRACT_CHANGED: NO`,`PRODUCTION_ACTIVATION: NO`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`);return lines.join("\r\n")+"\r\n";
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const cli=parseArgs(),dirs=cli["fsds-dirs"]?String(cli["fsds-dirs"]).split(";").filter(Boolean):[];const r=await runTotalCapexPresentationAudit({incoming:cli.incoming?path.resolve(cli.incoming):undefined,coreFile:cli.core?path.resolve(cli.core):undefined,fsdsDirs:dirs,asOf:cli["as-of"]??undefined,ageDays:cli.age?Number(cli.age):AGE_DAYS});console.log(formatTotalCapexPresentationAudit(r));if(r.status!=="PASS")process.exitCode=1;}catch(error){console.log(`E1-R5 FISCAL S5 TOTAL CAPEX PRESENTATION AUDIT: FAILED\r\nCODE: ${error?.code??"E1_R5_FISCAL_S5_TOTAL_CAPEX_PRESENTATION_FAILED"}`);process.exitCode=1;}
}
