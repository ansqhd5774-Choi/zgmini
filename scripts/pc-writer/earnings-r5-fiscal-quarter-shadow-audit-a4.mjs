import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {buildEarningsR5RawComponents} from "../../lib/market-score/earnings-e1-r5-shadow-calculator.mjs";
import {E1_R5_OFFICIAL_SOURCE_MANIFEST} from "../../lib/market-score/earnings-e1-r5-official-sources.mjs";
import {latestMatureFrame,MATURE_LAG_DAYS} from "../../lib/market-score/sec-earnings-e1-r2-provider.mjs";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {buildIssuerRowFromDocuments} from "./earnings-r5-current-frame-audit.mjs";
import {evaluateFiscalWindowA2} from "./earnings-r5-fiscal-quarter-shadow-audit-a2.mjs";
import {
  buildFiscalCommonAnchorIssuerRowA3,
  cohortOverlap,
  readyForComponent,
} from "./earnings-r5-fiscal-quarter-shadow-audit-a3.mjs";

export const VERSION="E1-R5-FISCAL-QUARTER-SHADOW-AUDIT-A4";
export const CANDIDATE_AGE_DAYS=210;
export const SENSITIVITY_AGE_DAYS=240;
const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const pct=(n,d)=>d>0?n/d:null;
const pctText=value=>finite(value)?`${(100*value).toFixed(1)}%`:"-";
const rawText=value=>finite(value)?String(Math.round(value*1e6)/1e6):"null";
const componentKeys=["S1","S2","S3","S4","S5","S7","S8"];
const rawKeys={S1:"epsGrowthStrength",S2:"revenueGrowth",S3:"operatingMarginLevel",S4:"operatingMarginChange",S5:"freeCashFlowMargin",S7:"epsImprovementBreadth",S8:"profitableCompanyBreadth",S9:"improvingSectorBreadth"};

function parseArgs(argv=process.argv.slice(2)){
  const out={};for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}return out;
}
function padCik(value){const digits=String(value??"").replace(/\D/g,"");return digits?digits.padStart(10,"0"):null;}
function resolveSecJson(directory,cik,nested){const name=`CIK${cik}.json`;return [path.join(directory,name),path.join(directory,nested,name),path.join(directory,path.basename(directory),name)].find(file=>fs.existsSync(file)&&fs.statSync(file).isFile())??null;}
function readJson(file){try{return file?JSON.parse(fs.readFileSync(file,"utf8")):null;}catch{return null;}}

export function normalizeInvalidFiscalRowA4(row){
  if(row?.audit?.status==="PASS")return row;
  return {...row,isFinancial:null,sectorId:null};
}
export function countNonFinancialA4(rows=[]){return rows.filter(row=>row?.isFinancial===false).length;}
function rawSnapshot(rows){
  const raw=buildEarningsR5RawComponents({issuerRows:rows});
  return {
    components:Object.fromEntries(Object.entries(rawKeys).map(([id,key])=>[id,{raw:raw.components?.[key]?.raw??null,coverage:raw.components?.[key]?.coverage??null,eligibleCount:raw.components?.[key]?.eligibleCount??null}])),
    quality:raw.quality??{},
  };
}
function delta(a,b){return finite(a)&&finite(b)?b-a:null;}
function a2ReadyMap(window){return Object.fromEntries(componentKeys.map(key=>[key,window?.anchoredGates?.[key]?.ready??null]));}
function rawReadyMap(snapshot){return Object.fromEntries(componentKeys.map(key=>[key,snapshot?.components?.[key]?.eligibleCount??null]));}
function mapsEqual(a,b){return componentKeys.every(key=>a?.[key]===b?.[key]);}

export function buildFiscalQuarterA4FromDocuments({members=[],factsByCik=new Map(),submissionsByCik=new Map(),asOf,frame,candidateAgeDays=CANDIDATE_AGE_DAYS,sensitivityAgeDays=SENSITIVITY_AGE_DAYS}={}){
  const fixedRows=[],candidateRows=[],sensitivityRows=[];
  for(const member of members){
    const cik=padCik(member?.cik),doc=factsByCik.get(cik),sub=submissionsByCik.get(cik);
    fixedRows.push(buildIssuerRowFromDocuments({member,companyFacts:doc,submission:sub,frame,asOf}));
    candidateRows.push(normalizeInvalidFiscalRowA4(buildFiscalCommonAnchorIssuerRowA3({member,companyFacts:doc,submission:sub,asOf,maxAgeDays:candidateAgeDays})));
    sensitivityRows.push(normalizeInvalidFiscalRowA4(buildFiscalCommonAnchorIssuerRowA3({member,companyFacts:doc,submission:sub,asOf,maxAgeDays:sensitivityAgeDays})));
  }
  const fixed=rawSnapshot(fixedRows),candidate=rawSnapshot(candidateRows),sensitivity=rawSnapshot(sensitivityRows);
  const a2Candidate=evaluateFiscalWindowA2({members,factsByCik,submissionsByCik,asOf,maxAgeDays:candidateAgeDays});
  const a2Sensitivity=evaluateFiscalWindowA2({members,factsByCik,submissionsByCik,asOf,maxAgeDays:sensitivityAgeDays});
  const denominators={
    fixed:countNonFinancialA4(fixedRows),candidate:countNonFinancialA4(candidateRows),sensitivity:countNonFinancialA4(sensitivityRows),
    a2Candidate:a2Candidate.nonFinancial,a2Sensitivity:a2Sensitivity.nonFinancial,
  };
  const candidateReady=rawReadyMap(candidate),sensitivityReady=rawReadyMap(sensitivity);
  const a2CandidateReady=a2ReadyMap(a2Candidate),a2SensitivityReady=a2ReadyMap(a2Sensitivity);
  const denominatorMatch=denominators.fixed===denominators.candidate&&denominators.candidate===denominators.sensitivity&&denominators.candidate===denominators.a2Candidate&&denominators.sensitivity===denominators.a2Sensitivity;
  const candidateReadyMatch=mapsEqual(candidateReady,a2CandidateReady),sensitivityReadyMatch=mapsEqual(sensitivityReady,a2SensitivityReady);
  const overlaps={};for(const key of Object.keys(rawKeys))overlaps[key]=cohortOverlap(fixedRows,candidateRows,key);
  const changes={};for(const key of Object.keys(rawKeys))changes[key]={fixedToCandidate:delta(fixed.components[key].raw,candidate.components[key].raw),candidateToSensitivity:delta(candidate.components[key].raw,sensitivity.components[key].raw)};
  const s5Ready=candidate.components.S5.eligibleCount??0,nonFinancial=denominators.candidate;
  const status=denominatorMatch&&candidateReadyMatch&&sensitivityReadyMatch?"PASS":"FAILED";
  return {
    status,version:VERSION,asOf,frame,candidateAgeDays,sensitivityAgeDays,
    raw:{fixed,candidate:candidate.components,sensitivity:sensitivity.components},changes,overlaps,denominators,
    reconciliation:{denominatorMatch,candidateReadyMatch,sensitivityReadyMatch,candidateReady,a2CandidateReady,sensitivityReady,a2SensitivityReady},
    s5:{ready:s5Ready,denominator:nonFinancial,coverage:pct(s5Ready,nonFinancial),gate:.70,need:Math.max(0,Math.ceil(.70*nonFinancial-1e-12)-s5Ready)},
    policies:{researchOnly:true,fiscalPolicyAccepted:false,formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,q4EpsAnnualMinusNineMonths:"FORBIDDEN",productionActivation:false},networkCalls:0,dbWrites:0,
  };
}

export function formatFiscalQuarterA4(report){
  const lines=[
    `E1-R5 FISCAL QUARTER SHADOW AUDIT A4: ${report?.status??"UNKNOWN"}`,
    `VERSION: ${report?.version??"-"}`,
    `AS_OF: ${report?.asOf??"-"}`,
    `CANDIDATE_AGE_DAYS: ${report?.candidateAgeDays??"-"}`,
    `SENSITIVITY_AGE_DAYS: ${report?.sensitivityAgeDays??"-"}`,
    `NONFINANCIAL_DENOMINATORS: fixed=${report?.denominators?.fixed??"-"} candidate=${report?.denominators?.candidate??"-"} sensitivity=${report?.denominators?.sensitivity??"-"} a2Candidate=${report?.denominators?.a2Candidate??"-"} a2Sensitivity=${report?.denominators?.a2Sensitivity??"-"}`,
    `DENOMINATOR_MATCH: ${report?.reconciliation?.denominatorMatch===true?"YES":"NO"}`,
    `A2_CANDIDATE_READY_MATCH: ${report?.reconciliation?.candidateReadyMatch===true?"YES":"NO"}`,
    `A2_SENSITIVITY_READY_MATCH: ${report?.reconciliation?.sensitivityReadyMatch===true?"YES":"NO"}`,
  ];
  for(const key of Object.keys(rawKeys)){
    const f=report?.raw?.fixed?.components?.[key]??{},c=report?.raw?.candidate?.[key]??{},s=report?.raw?.sensitivity?.[key]??{},d=report?.changes?.[key]??{},o=report?.overlaps?.[key]??{};
    lines.push(`RAW_${key}: fixed=${rawText(f.raw)} cov=${pctText(f.coverage)} candidate=${rawText(c.raw)} cov=${pctText(c.coverage)} sensitivity=${rawText(s.raw)} cov=${pctText(s.coverage)} deltaFixedToCandidate=${rawText(d.fixedToCandidate)} deltaCandidateToSensitivity=${rawText(d.candidateToSensitivity)}`);
    lines.push(`COHORT_${key}: fixed=${o.fixed??0} candidate=${o.fiscal??0} both=${o.both??0} fixedOnly=${o.fixedOnly??0} candidateOnly=${o.fiscalOnly??0} jaccard=${pctText(o.jaccard)} fixedRetention=${pctText(o.fixedRetention)}`);
  }
  lines.push(
    `S5_CANDIDATE: ready=${report?.s5?.ready??0}/${report?.s5?.denominator??0} coverage=${pctText(report?.s5?.coverage)} gate=${pctText(report?.s5?.gate)} need=${report?.s5?.need??0}`,
    `FISCAL_POLICY_ACCEPTED: NO`,`Q4_EPS_ANNUAL_MINUS_9M: FORBIDDEN`,`FORMULA_CHANGED: NO`,`WEIGHT_CHANGED: NO`,`SCORING_GATE_CHANGED: NO`,`INPUT_CONTRACT_CHANGED: NO`,`PRODUCTION_ACTIVATION: NO`,`NETWORK_CALLS: 0`,`DB_WRITES: 0`,
  );
  return lines.join("\r\n")+"\r\n";
}

export async function runFiscalQuarterA4({incoming,coreFile,asOf=new Date().toISOString().slice(0,10),lagDays=MATURE_LAG_DAYS,candidateAgeDays=CANDIDATE_AGE_DAYS,sensitivityAgeDays=SENSITIVITY_AGE_DAYS}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming"),core=coreFile??path.join(defaultBase,"storage","core.sqlite");
  const universe=readLatestEarningsUniverse(core),frame=latestMatureFrame(asOf,{lagDays});
  if(universe.status!=="PASS"||!frame)return {status:"PARTIAL",version:VERSION,reason:universe.status!=="PASS"?"UNIVERSE_REQUIRED":"FRAME_REQUIRED",networkCalls:0,dbWrites:0};
  const factsDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secCompanyFacts.extractedDirectory),subDir=path.join(inputDir,E1_R5_OFFICIAL_SOURCE_MANIFEST.secSubmissions.extractedDirectory);
  const factsByCik=new Map(),submissionsByCik=new Map();let factFiles=0,submissionFiles=0;
  for(const member of universe.members){const cik=padCik(member.cik),ff=resolveSecJson(factsDir,cik,"companyfacts"),sf=resolveSecJson(subDir,cik,"submissions");if(ff){factFiles++;factsByCik.set(cik,readJson(ff));}if(sf){submissionFiles++;submissionsByCik.set(cik,readJson(sf));}}
  const report=buildFiscalQuarterA4FromDocuments({members:universe.members,factsByCik,submissionsByCik,asOf,frame,candidateAgeDays,sensitivityAgeDays});
  return {...report,files:{companyFacts:factFiles,submissions:submissionFiles},universe:{memberCount:universe.memberCount,periodEnd:universe.periodEnd},dbReads:1};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const cli=parseArgs();const report=await runFiscalQuarterA4({incoming:cli.incoming?path.resolve(cli.incoming):undefined,coreFile:cli.core?path.resolve(cli.core):undefined,asOf:cli["as-of"]??undefined,candidateAgeDays:cli["candidate-age"]?Number(cli["candidate-age"]):CANDIDATE_AGE_DAYS,sensitivityAgeDays:cli["sensitivity-age"]?Number(cli["sensitivity-age"]):SENSITIVITY_AGE_DAYS});console.log(formatFiscalQuarterA4(report));if(report.status!=="PASS")process.exitCode=1;}catch(error){console.log(`E1-R5 FISCAL QUARTER SHADOW AUDIT A4: FAILED\r\nCODE: ${error?.code??"E1_R5_FISCAL_A4_FAILED"}`);process.exitCode=1;}
}
