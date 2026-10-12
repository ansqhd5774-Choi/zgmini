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
import {classifyTotalCapexLabel} from "./earnings-r5-fiscal-s5-total-capex-presentation-audit.mjs";

export const VERSION="E1-R5-FISCAL-S5-EXHAUSTIVE-TOTAL-CAPEX-INVENTORY-R1";
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
function compactDate(v){return typeof v==="string"?v.replace(/-/g,""):"";}
function key(tag,version){return `${tag}|${version}`;}

export function classifyInventoryCandidate({approvedTag=false,custom=false,standardRecoverable=false,fsdsDirect=false}={}){
  if(approvedTag&&fsdsDirect)return "APPROVED_TAG_FSDS_DIRECT";
  if(!custom&&standardRecoverable)return "STANDARD_TOTAL_PRESENTATION";
  if(custom&&fsdsDirect)return "CUSTOM_TOTAL_PRESENTATION_DIRECT";
  if(custom)return "CUSTOM_TOTAL_PRESENTATION_REVIEW";
  return "STANDARD_TOTAL_PRESENTATION_REVIEW";
}

async function scanPre(file,targets){
  if(!fs.existsSync(file))return [];
  const input=fs.createReadStream(file,{encoding:"utf8"}),rl=readline.createInterface({input,crlfDelay:Infinity});
  let idx=null;const out=[];
  for await(const raw of rl){
    const line=raw.replace(/\r$/,"");
    if(!idx){const h=line.split("\t");idx=Object.fromEntries(h.map((x,i)=>[x.toLowerCase(),i]));continue;}
    const c=line.split("\t"),adsh=idx.adsh!=null?c[idx.adsh]:"";if(!targets.has(adsh))continue;
    const stmt=idx.stmt!=null?c[idx.stmt]:"",plabel=idx.plabel!=null?c[idx.plabel]:"";
    if(String(stmt).toUpperCase()!=="CF"||classifyTotalCapexLabel(plabel)!=="TOTAL_CAPEX")continue;
    out.push({adsh,tag:idx.tag!=null?c[idx.tag]:"",version:idx.version!=null?c[idx.version]:"",stmt,line:idx.line!=null?c[idx.line]:"",plabel});
  }
  return out;
}

async function scanTag(file,keySet){
  if(!fs.existsSync(file))return [];
  const input=fs.createReadStream(file,{encoding:"utf8"}),rl=readline.createInterface({input,crlfDelay:Infinity});
  let idx=null;const out=[];
  for await(const raw of rl){
    const line=raw.replace(/\r$/,"");
    if(!idx){const h=line.split("\t");idx=Object.fromEntries(h.map((x,i)=>[x.toLowerCase(),i]));continue;}
    const c=line.split("\t"),tag=idx.tag!=null?c[idx.tag]:"",version=idx.version!=null?c[idx.version]:"";if(!keySet.has(key(tag,version)))continue;
    out.push({tag,version,custom:idx.custom!=null?c[idx.custom]:"",tlabel:idx.tlabel!=null?c[idx.tlabel]:"",doc:idx.doc!=null?c[idx.doc]:""});
  }
  return out;
}

async function scanNum(file,candidateByAdsh){
  if(!fs.existsSync(file))return [];
  const input=fs.createReadStream(file,{encoding:"utf8"}),rl=readline.createInterface({input,crlfDelay:Infinity});
  let idx=null;const out=[];
  for await(const raw of rl){
    const line=raw.replace(/\r$/,"");
    if(!idx){const h=line.split("\t");idx=Object.fromEntries(h.map((x,i)=>[x.toLowerCase(),i]));continue;}
    const c=line.split("\t"),adsh=idx.adsh!=null?c[idx.adsh]:"",targets=candidateByAdsh.get(adsh);if(!targets)continue;
    const tag=idx.tag!=null?c[idx.tag]:"",version=idx.version!=null?c[idx.version]:"",k=key(tag,version);if(!targets.has(k))continue;
    const qtrs=Number(idx.qtrs!=null?c[idx.qtrs]:NaN),uom=idx.uom!=null?c[idx.uom]:"",coreg=idx.coreg!=null?clean(c[idx.coreg]):"",value=Number(idx.value!=null?c[idx.value]:NaN),ddate=idx.ddate!=null?c[idx.ddate]:"";
    if(uom!=="USD"||coreg||!finite(value))continue;
    out.push({adsh,tag,version,ddate,qtrs,value});
  }
  return out;
}

export function summarizeInventoryCandidates(rows=[],baselineReady=0,denominator=0){
  const groups={APPROVED_TAG_FSDS_DIRECT:new Set(),STANDARD_TOTAL_PRESENTATION:new Set(),CUSTOM_TOTAL_PRESENTATION_DIRECT:new Set()};
  for(const row of rows){if(groups[row.classification])groups[row.classification].add(row.cik);}
  const strictStandard=new Set([...groups.APPROVED_TAG_FSDS_DIRECT,...groups.STANDARD_TOTAL_PRESENTATION]);
  const withCustom=new Set([...strictStandard,...groups.CUSTOM_TOTAL_PRESENTATION_DIRECT]);
  const required=Math.ceil(.70*denominator-1e-12);
  return {
    approvedFsdsDirect:groups.APPROVED_TAG_FSDS_DIRECT.size,
    standardTotal:groups.STANDARD_TOTAL_PRESENTATION.size,
    customDirect:groups.CUSTOM_TOTAL_PRESENTATION_DIRECT.size,
    strictStandardRecovered:strictStandard.size,
    strictStandardCombined:baselineReady+strictStandard.size,
    strictStandardCoverage:pct(baselineReady+strictStandard.size,denominator),
    strictStandardNeed:Math.max(0,required-(baselineReady+strictStandard.size)),
    withCustomRecovered:withCustom.size,
    withCustomCombined:baselineReady+withCustom.size,
    withCustomCoverage:pct(baselineReady+withCustom.size,denominator),
    withCustomNeed:Math.max(0,required-(baselineReady+withCustom.size)),
  };
}

export function buildCapexOnlyTargets({members=[],factsByCik=new Map(),submissionsByCik=new Map(),asOf,ageDays=AGE_DAYS}={}){
  let valid=0,nonFinancial=0,baselineReady=0,capexOnlyMissing=0;const targets=[];
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
    targets.push({cik,ticker:member?.ticker??null,doc,revenue,revenueEnd:revenue.current.end,targetAccn:revenue.current.accn??null});
  }
  return {valid,nonFinancial,baselineReady,capexOnlyMissing,targets};
}

export async function runExhaustiveTotalCapexInventory({incoming,coreFile,fsdsDirs=[],asOf=new Date().toISOString().slice(0,10),ageDays=AGE_DAYS}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming"),core=coreFile??path.join(defaultBase,"storage","core.sqlite"),universe=readLatestEarningsUniverse(core);
  if(universe.status!=="PASS")return {status:"PARTIAL",version:VERSION,reason:"UNIVERSE_REQUIRED",networkCalls:0,dbWrites:0};
  const factsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory),subDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory),factsByCik=new Map(),submissionsByCik=new Map();
  for(const member of universe.members){const cik=padCik(member.cik),ff=resolveSecJson(factsDir,cik,"companyfacts"),sf=resolveSecJson(subDir,cik,"submissions");if(ff)factsByCik.set(cik,readJson(ff));if(sf)submissionsByCik.set(cik,readJson(sf));}
  const base=buildCapexOnlyTargets({members:universe.members,factsByCik,submissionsByCik,asOf,ageDays});
  const targetByAccn=new Map(base.targets.filter(x=>x.targetAccn).map(x=>[x.targetAccn,x]));
  const pre=[];for(const dir of fsdsDirs)pre.push(...await scanPre(path.join(dir,"pre.txt"),targetByAccn));
  const candidateKeys=new Set(pre.map(r=>key(r.tag,r.version))),metaRows=[];for(const dir of fsdsDirs)metaRows.push(...await scanTag(path.join(dir,"tag.txt"),candidateKeys));
  const meta=new Map();for(const row of metaRows)if(!meta.has(key(row.tag,row.version)))meta.set(key(row.tag,row.version),row);
  const candidateByAdsh=new Map();for(const row of pre){if(!candidateByAdsh.has(row.adsh))candidateByAdsh.set(row.adsh,new Set());candidateByAdsh.get(row.adsh).add(key(row.tag,row.version));}
  const nums=[];for(const dir of fsdsDirs)nums.push(...await scanNum(path.join(dir,"num.txt"),candidateByAdsh));
  const numByKey=new Map();for(const row of nums){const k=`${row.adsh}|${key(row.tag,row.version)}`;if(!numByKey.has(k))numByKey.set(k,[]);numByKey.get(k).push(row);}
  const rows=[];
  for(const p of pre){
    const target=targetByAccn.get(p.adsh);if(!target)continue;
    const m=meta.get(key(p.tag,p.version))??{},custom=String(m.custom??"")==="1";
    const fsdsRows=(numByKey.get(`${p.adsh}|${key(p.tag,p.version)}`)??[]).filter(r=>r.ddate===compactDate(target.revenueEnd));
    const directValues=[...new Set(fsdsRows.filter(r=>r.qtrs===1).map(r=>r.value))];
    const fsdsDirect=directValues.length===1;
    let standardRecoverable=false,standardValue=null,standardMethod=null;
    if(!custom){const selected=selectNarrowCapexFlow(target.doc,{tag:p.tag,target:target.revenue.current,asOf});if(finite(selected.value)){standardRecoverable=true;standardValue=selected.value;standardMethod=selected.method;}}
    const approvedTag=APPROVED_CAPEX_TAGS.has(p.tag),classification=classifyInventoryCandidate({approvedTag,custom,standardRecoverable,fsdsDirect});
    rows.push({cik:target.cik,ticker:target.ticker,adsh:p.adsh,revenueEnd:target.revenueEnd,tag:p.tag,version:p.version,label:p.plabel,custom,approvedTag,classification,standardRecoverable,standardValue,standardMethod,fsdsDirect,fsdsDirectValue:fsdsDirect?directValues[0]:null,fsdsQtrs:[...new Set(fsdsRows.map(r=>r.qtrs).filter(Number.isFinite))].sort((a,b)=>a-b),taxonomyLabel:m.tlabel??null,taxonomyDoc:m.doc??null});
  }
  const summary=summarizeInventoryCandidates(rows,base.baselineReady,base.nonFinancial);
  return {status:"PASS",version:VERSION,asOf,ageDays,...base,rows,summary,policies:{researchOnly:true,counterfactualOnly:true,accepted:false,formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,productionActivation:false,customTagAccepted:false,productiveAssetsAccepted:false,q4EpsAnnualMinusNineMonths:"FORBIDDEN"},networkCalls:0,dbWrites:0};
}

export function formatExhaustiveTotalCapexInventory(r){
  const s=r.summary??{};const lines=[
    `E1-R5 FISCAL S5 EXHAUSTIVE TOTAL CAPEX INVENTORY: ${r.status}`,
    `VERSION: ${r.version}`,
    `AS_OF: ${r.asOf}`,
    `AGE_DAYS: ${r.ageDays}`,
    `BASELINE: ready=${r.baselineReady}/${r.nonFinancial} coverage=${pctText(pct(r.baselineReady,r.nonFinancial))}`,
    `CAPEX_ONLY_MISSING: ${r.capexOnlyMissing}`,
    `PRESENTATION_ROWS: ${r.rows?.length??0}`,
    `SUMMARY: approvedFsdsDirect=${s.approvedFsdsDirect??0} standardTotal=${s.standardTotal??0} customDirect=${s.customDirect??0} strictStandardRecovered=${s.strictStandardRecovered??0} strictStandardCombined=${s.strictStandardCombined??0}/${r.nonFinancial} strictStandardCoverage=${pctText(s.strictStandardCoverage)} strictStandardNeed=${s.strictStandardNeed??0} withCustomRecovered=${s.withCustomRecovered??0} withCustomCombined=${s.withCustomCombined??0}/${r.nonFinancial} withCustomCoverage=${pctText(s.withCustomCoverage)} withCustomNeed=${s.withCustomNeed??0}`,
  ];
  for(const x of r.rows??[])lines.push(`PRESENTATION_CANDIDATE: ${x.ticker??x.cik} class=${x.classification} tag=${x.tag} version=${x.version} custom=${x.custom?"YES":"NO"} approvedTag=${x.approvedTag?"YES":"NO"} label=${x.label} end=${x.revenueEnd} standardRecoverable=${x.standardRecoverable?"YES":"NO"} standardMethod=${x.standardMethod??"-"} standardValue=${x.standardValue??"-"} fsdsDirect=${x.fsdsDirect?"YES":"NO"} fsdsDirectValue=${x.fsdsDirectValue??"-"} fsdsQtrs=${(x.fsdsQtrs??[]).join(",")||"-"} taxonomyLabel=${x.taxonomyLabel??"-"}`);
  lines.push(`CUSTOM_TAG_ACCEPTED: NO`,`PRODUCTIVE_ASSETS_ACCEPTED: NO`,`FISCAL_POLICY_ACCEPTED: NO`,`Q4_EPS_ANNUAL_MINUS_9M: FORBIDDEN`,`FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`SCORING_GATE_CHANGED: NO`,`INPUT_CONTRACT_CHANGED: NO`,`PRODUCTION_ACTIVATION: NO`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`);
  return lines.join("\r\n")+"\r\n";
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const cli=parseArgs(),dirs=cli["fsds-dirs"]?String(cli["fsds-dirs"]).split(";").filter(Boolean):[];const r=await runExhaustiveTotalCapexInventory({incoming:cli.incoming?path.resolve(cli.incoming):undefined,coreFile:cli.core?path.resolve(cli.core):undefined,fsdsDirs:dirs,asOf:cli["as-of"]??undefined,ageDays:cli.age?Number(cli.age):AGE_DAYS});console.log(formatExhaustiveTotalCapexInventory(r));if(r.status!=="PASS")process.exitCode=1;}catch(error){console.log(`E1-R5 FISCAL S5 EXHAUSTIVE TOTAL CAPEX INVENTORY: FAILED\r\nCODE: ${error?.code??"E1_R5_FISCAL_S5_EXHAUSTIVE_TOTAL_CAPEX_FAILED"}`);process.exitCode=1;}
}
