import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {validateSecCompanyFactsDocument} from "../../lib/market-score/earnings-e1-r5-input-contract.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {buildEarningsR5RawComponents} from "../../lib/market-score/earnings-e1-r5-shadow-calculator.mjs";
import {latestMatureFrame,MATURE_LAG_DAYS} from "../../lib/market-score/sec-earnings-e1-r2-provider.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {buildIssuerRowFromDocuments,sicDivision} from "./earnings-r5-current-frame-audit.mjs";
import {
  VERSION as SELECTOR_VERSION,
  selectFiscalComparablePairR2,
  selectFiscalCurrentQuarterR2,
  selectFiscalMarginPairR2,
  selectFiscalQuarterFlowR2,
} from "./earnings-r5-fiscal-period-selector-r2.mjs";

export const VERSION="E1-R5-FISCAL-QUARTER-SHADOW-AUDIT-A3";
export const CANDIDATE_AGE_DAYS=210;
export const SENSITIVITY_AGE_DAYS=240;
const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const DAY_MS=86400000;
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clean=value=>String(value??"").trim();
const pct=(n,d)=>d>0?n/d:null;
const pctText=value=>finite(value)?`${(100*value).toFixed(1)}%`:"-";
const rawText=value=>finite(value)?String(Math.round(value*1e6)/1e6):"null";

function parseArgs(argv=process.argv.slice(2)){
  const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;
}
function day(value){if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;const ms=Date.parse(`${value}T00:00:00Z`);return Number.isFinite(ms)?Math.floor(ms/DAY_MS):null;}
function duration(fact){const s=day(fact?.start),e=day(fact?.end);return s!=null&&e!=null&&e>=s?e-s+1:null;}
function sameAnchor(fact,target,{endTolerance=15,durationTolerance=15}={}){
  if(!fact||!target)return false;const a=day(fact.end),b=day(target.end);if(a==null||b==null||Math.abs(a-b)>endTolerance)return false;
  const ad=fact.duration??duration(fact),bd=target.duration??duration(target);return Number.isInteger(ad)&&Number.isInteger(bd)&&Math.abs(ad-bd)<=durationTolerance;
}
function resolveSecJson(directory,cik,nested){const name=`CIK${cik}.json`;return [path.join(directory,name),path.join(directory,nested,name),path.join(directory,path.basename(directory),name)].find(file=>fs.existsSync(file)&&fs.statSync(file).isFile())??null;}
function readJson(file){try{return file?JSON.parse(fs.readFileSync(file,"utf8")):null;}catch{return null;}}
function padCik(value){const digits=String(value??"").replace(/\D/g,"");return digits?digits.padStart(10,"0"):null;}

export function buildFiscalCommonAnchorIssuerRowA3({member,companyFacts,submission,asOf,maxAgeDays=CANDIDATE_AGE_DAYS}={}){
  const cik=padCik(member?.cik),validation=validateSecCompanyFactsDocument(companyFacts);
  const div=sicDivision(submission?.sic);
  if(!cik||validation.status!=="PASS"||validation.cik!==cik){
    return {cik,ticker:member?.ticker??null,name:member?.name??null,isFinancial:div?div.financial:null,sectorId:div?.id??null,current:{},priorYear:{},audit:{status:"INVALID_COMPANYFACTS"}};
  }
  const revenue=selectFiscalComparablePairR2(companyFacts,{metric:"revenue",asOf,maxAgeDays});
  const eps=selectFiscalComparablePairR2(companyFacts,{metric:"eps",asOf,maxAgeDays});
  const margin=div?.financial===false?selectFiscalMarginPairR2(companyFacts,{asOf,maxAgeDays}):{opCurrent:null,opPrior:null};
  const netCurrent=selectFiscalCurrentQuarterR2(companyFacts,{metric:"netIncome",asOf,maxAgeDays});
  const netPair=selectFiscalComparablePairR2(companyFacts,{metric:"netIncome",asOf,maxAgeDays});
  const hasRevenue=Boolean(revenue.current&&revenue.prior&&finite(revenue.prior.val)&&revenue.prior.val>0);
  const epsAligned=hasRevenue&&eps.current&&eps.prior&&sameAnchor(eps.current,revenue.current)&&sameAnchor(eps.prior,revenue.prior);
  const netCurrentAligned=hasRevenue&&netCurrent.fact&&sameAnchor(netCurrent.fact,revenue.current);
  const netPairAligned=hasRevenue&&netPair.current&&netPair.prior&&sameAnchor(netPair.current,revenue.current)&&sameAnchor(netPair.prior,revenue.prior);
  let cfo={value:null,method:null,reason:"REVENUE_PAIR_MISSING"},capex={value:null,method:null,reason:"REVENUE_PAIR_MISSING"};
  if(div?.financial===false&&revenue.current){
    cfo=selectFiscalQuarterFlowR2(companyFacts,{metric:"operatingCashFlow",asOf,target:revenue.current});
    capex=selectFiscalQuarterFlowR2(companyFacts,{metric:"capex",asOf,target:revenue.current});
  }
  const current={
    eps:epsAligned?eps.current.val:null,
    revenue:hasRevenue?revenue.current.val:null,
    operatingIncome:div?.financial===false&&margin.opCurrent?margin.opCurrent.val:null,
    netIncome:netCurrentAligned?netCurrent.fact.val:null,
    operatingCashFlow:finite(cfo.value)?cfo.value:null,
    capex:finite(capex.value)?capex.value:null,
  };
  const priorYear={
    eps:epsAligned?eps.prior.val:null,
    revenue:hasRevenue?revenue.prior.val:null,
    operatingIncome:div?.financial===false&&margin.opPrior?margin.opPrior.val:null,
    netIncome:netPairAligned?netPair.prior.val:null,
  };
  if(netPairAligned)current.netIncome=netPair.current.val;
  return {
    cik,ticker:member?.ticker??null,name:member?.name??null,isFinancial:div?div.financial:null,sectorId:div?.id??null,
    current,priorYear,
    audit:{status:"PASS",maxAgeDays,revenueEnd:revenue.current?.end??null,revenuePriorEnd:revenue.prior?.end??null,epsAligned:Boolean(epsAligned),netCurrentAligned:Boolean(netCurrentAligned),netPairAligned:Boolean(netPairAligned),cfoMethod:cfo.method,capexMethod:capex.method,q4EpsAnnualMinusNineMonths:"FORBIDDEN"},
  };
}

export function readyForComponent(row,key){
  const c=row?.current??{},p=row?.priorYear??{},nf=row?.isFinancial===false;
  if(key==="S1"||key==="S7")return finite(c.eps)&&finite(p.eps);
  if(key==="S2")return finite(c.revenue)&&finite(p.revenue)&&p.revenue>0;
  if(key==="S3")return nf&&finite(c.operatingIncome)&&finite(c.revenue)&&c.revenue>0;
  if(key==="S4")return nf&&finite(c.operatingIncome)&&finite(p.operatingIncome)&&finite(c.revenue)&&c.revenue>0&&finite(p.revenue)&&p.revenue>0;
  if(key==="S5")return nf&&finite(c.operatingCashFlow)&&finite(c.capex)&&finite(c.revenue)&&c.revenue>0;
  if(key==="S8")return finite(c.netIncome);
  if(key==="S9")return row?.sectorId!=null&&finite(c.netIncome)&&finite(p.netIncome);
  return false;
}

export function cohortOverlap(fixedRows=[],fiscalRows=[],key){
  const fixed=new Set(fixedRows.filter(row=>readyForComponent(row,key)).map(row=>row.cik));
  const fiscal=new Set(fiscalRows.filter(row=>readyForComponent(row,key)).map(row=>row.cik));
  let both=0;for(const cik of fixed)if(fiscal.has(cik))both++;
  return {fixed:fixed.size,fiscal:fiscal.size,both,fixedOnly:fixed.size-both,fiscalOnly:fiscal.size-both,union:fixed.size+fiscal.size-both,jaccard:(fixed.size+fiscal.size-both)>0?both/(fixed.size+fiscal.size-both):null,fixedRetention:fixed.size>0?both/fixed.size:null};
}

const rawKeys={S1:"epsGrowthStrength",S2:"revenueGrowth",S3:"operatingMarginLevel",S4:"operatingMarginChange",S5:"freeCashFlowMargin",S7:"epsImprovementBreadth",S8:"profitableCompanyBreadth",S9:"improvingSectorBreadth"};
function rawSnapshot(rows){
  const raw=buildEarningsR5RawComponents({issuerRows:rows});
  return Object.fromEntries(Object.entries(rawKeys).map(([id,key])=>[id,{raw:raw.components?.[key]?.raw??null,coverage:raw.components?.[key]?.coverage??null,eligibleCount:raw.components?.[key]?.eligibleCount??null}]));
}
function delta(a,b){return finite(a)&&finite(b)?b-a:null;}

export function buildFiscalQuarterA3FromDocuments({members=[],factsByCik=new Map(),submissionsByCik=new Map(),asOf,frame,candidateAgeDays=CANDIDATE_AGE_DAYS,sensitivityAgeDays=SENSITIVITY_AGE_DAYS}={}){
  const fixedRows=[],candidateRows=[],sensitivityRows=[];
  for(const member of members){
    const cik=padCik(member?.cik),doc=factsByCik.get(cik),sub=submissionsByCik.get(cik);
    fixedRows.push(buildIssuerRowFromDocuments({member,companyFacts:doc,submission:sub,frame,asOf}));
    candidateRows.push(buildFiscalCommonAnchorIssuerRowA3({member,companyFacts:doc,submission:sub,asOf,maxAgeDays:candidateAgeDays}));
    sensitivityRows.push(buildFiscalCommonAnchorIssuerRowA3({member,companyFacts:doc,submission:sub,asOf,maxAgeDays:sensitivityAgeDays}));
  }
  const fixed=rawSnapshot(fixedRows),candidate=rawSnapshot(candidateRows),sensitivity=rawSnapshot(sensitivityRows);
  const overlaps={};for(const key of Object.keys(rawKeys))overlaps[key]=cohortOverlap(fixedRows,candidateRows,key);
  const changes={};for(const key of Object.keys(rawKeys))changes[key]={fixedToCandidate:delta(fixed[key].raw,candidate[key].raw),candidateToSensitivity:delta(candidate[key].raw,sensitivity[key].raw)};
  const s5Ready=candidateRows.filter(row=>readyForComponent(row,"S5")).length;
  const nonFinancial=candidateRows.filter(row=>row.isFinancial===false).length;
  return {
    status:"PASS",version:VERSION,selectorVersion:SELECTOR_VERSION,asOf,frame,candidateAgeDays,sensitivityAgeDays,
    raw:{fixed,candidate,sensitivity},changes,overlaps,
    s5:{ready:s5Ready,denominator:nonFinancial,coverage:pct(s5Ready,nonFinancial),gate:.70,need:Math.max(0,Math.ceil(.70*nonFinancial-1e-12)-s5Ready)},
    policies:{researchOnly:true,fiscalPolicyAccepted:false,formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,q4EpsAnnualMinusNineMonths:"FORBIDDEN",productionActivation:false},networkCalls:0,dbWrites:0,
  };
}

export function formatFiscalQuarterA3(report){
  const lines=[
    `E1-R5 FISCAL QUARTER SHADOW AUDIT A3: ${report?.status??"UNKNOWN"}`,
    `VERSION: ${report?.version??"-"}`,
    `SELECTOR_VERSION: ${report?.selectorVersion??"-"}`,
    `AS_OF: ${report?.asOf??"-"}`,
    `CANDIDATE_AGE_DAYS: ${report?.candidateAgeDays??"-"}`,
    `SENSITIVITY_AGE_DAYS: ${report?.sensitivityAgeDays??"-"}`,
  ];
  for(const key of Object.keys(rawKeys)){
    const f=report?.raw?.fixed?.[key]??{},c=report?.raw?.candidate?.[key]??{},s=report?.raw?.sensitivity?.[key]??{},d=report?.changes?.[key]??{},o=report?.overlaps?.[key]??{};
    lines.push(`RAW_${key}: fixed=${rawText(f.raw)} cov=${pctText(f.coverage)} candidate=${rawText(c.raw)} cov=${pctText(c.coverage)} sensitivity=${rawText(s.raw)} cov=${pctText(s.coverage)} deltaFixedToCandidate=${rawText(d.fixedToCandidate)} deltaCandidateToSensitivity=${rawText(d.candidateToSensitivity)}`);
    lines.push(`COHORT_${key}: fixed=${o.fixed??0} candidate=${o.fiscal??0} both=${o.both??0} fixedOnly=${o.fixedOnly??0} candidateOnly=${o.fiscalOnly??0} jaccard=${pctText(o.jaccard)} fixedRetention=${pctText(o.fixedRetention)}`);
  }
  lines.push(
    `S5_CANDIDATE: ready=${report?.s5?.ready??0}/${report?.s5?.denominator??0} coverage=${pctText(report?.s5?.coverage)} gate=${pctText(report?.s5?.gate)} need=${report?.s5?.need??0}`,
    `FISCAL_POLICY_ACCEPTED: NO`,
    `Q4_EPS_ANNUAL_MINUS_9M: ${report?.policies?.q4EpsAnnualMinusNineMonths??"FORBIDDEN"}`,
    `FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`SCORING_GATE_CHANGED: NO`,`INPUT_CONTRACT_CHANGED: NO`,`PRODUCTION_ACTIVATION: NO`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`,
  );
  return lines.join("\r\n")+"\r\n";
}

export async function runFiscalQuarterA3({incoming,coreFile,asOf=new Date().toISOString().slice(0,10),lagDays=MATURE_LAG_DAYS,candidateAgeDays=CANDIDATE_AGE_DAYS,sensitivityAgeDays=SENSITIVITY_AGE_DAYS}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming"),core=coreFile??path.join(defaultBase,"storage","core.sqlite");
  const universe=readLatestEarningsUniverse(core),frame=latestMatureFrame(asOf,{lagDays});
  if(universe.status!=="PASS"||!frame)return {status:"PARTIAL",version:VERSION,reason:universe.status!=="PASS"?"UNIVERSE_REQUIRED":"FRAME_REQUIRED",networkCalls:0,dbWrites:0};
  const factsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory),subDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory);
  const factsByCik=new Map(),submissionsByCik=new Map();let factFiles=0,submissionFiles=0;
  for(const member of universe.members){const cik=padCik(member.cik),ff=resolveSecJson(factsDir,cik,"companyfacts"),sf=resolveSecJson(subDir,cik,"submissions");if(ff){factFiles++;factsByCik.set(cik,readJson(ff));}if(sf){submissionFiles++;submissionsByCik.set(cik,readJson(sf));}}
  const report=buildFiscalQuarterA3FromDocuments({members:universe.members,factsByCik,submissionsByCik,asOf,frame,candidateAgeDays,sensitivityAgeDays});
  return {...report,files:{companyFacts:factFiles,submissions:submissionFiles},universe:{memberCount:universe.memberCount,periodEnd:universe.periodEnd},dbReads:1};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const cli=parseArgs();const report=await runFiscalQuarterA3({incoming:cli.incoming?path.resolve(cli.incoming):undefined,coreFile:cli.core?path.resolve(cli.core):undefined,asOf:cli["as-of"]??undefined,candidateAgeDays:cli["candidate-age"]?Number(cli["candidate-age"]):CANDIDATE_AGE_DAYS,sensitivityAgeDays:cli["sensitivity-age"]?Number(cli["sensitivity-age"]):SENSITIVITY_AGE_DAYS});console.log(formatFiscalQuarterA3(report));if(report.status!=="PASS")process.exitCode=1;}catch(error){console.log(`E1-R5 FISCAL QUARTER SHADOW AUDIT A3: FAILED\r\nCODE: ${error?.code??"E1_R5_FISCAL_A3_FAILED"}`);process.exitCode=1;}
}
