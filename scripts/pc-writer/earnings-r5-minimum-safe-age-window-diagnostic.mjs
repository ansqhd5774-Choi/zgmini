import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {readLatestEarningsUniverse} from "./earnings-r5-offline-preflight.mjs";
import {buildDocumentFocusDiagnosticFromDocuments} from "./earnings-r5-document-focus-diagnostic.mjs";
import {buildCapexCandidateCounterfactualFromDocuments} from "./earnings-r5-capex-candidate-counterfactual.mjs";

export const E1_R5_MINIMUM_SAFE_AGE_WINDOW_DIAGNOSTIC_VERSION="E1-R5-MINIMUM-SAFE-AGE-WINDOW-DIAGNOSTIC-R1";
export const SAFE_CAPEX_CANDIDATE="PaymentsToAcquireOtherPropertyPlantAndEquipment";

const defaultBase=process.env.ZGMINI_PC_HOME??path.join(os.homedir(),".zgmini","pc-writer");
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const pct=value=>finite(value)?`${(100*value).toFixed(1)}%`:"-";

function parseArgs(argv=process.argv.slice(2)){
  const out={};
  for(const item of argv){const m=item.match(/^--([^=]+)=(.*)$/);if(m)out[m[1]]=m[2];}
  return out;
}
function readJson(file){try{return file?JSON.parse(fs.readFileSync(file,"utf8")):null;}catch{return null;}}
function resolveSecJson(directory,cik,nested){
  const name=`CIK${cik}.json`;
  const candidates=[path.join(directory,name),path.join(directory,nested,name),path.join(directory,path.basename(directory),name)];
  return candidates.find(file=>fs.existsSync(file)&&fs.statSync(file).isFile())??null;
}

export function evaluateAgeWindow({ageDays,documentFocus,capexWindow}={}){
  const c=documentFocus?.coverage??{};
  const candidate=capexWindow?.candidates?.[SAFE_CAPEX_CANDIDATE]??null;
  const coverages={
    S1:c.geometryComparableEps?.coverage??null,
    S2:c.geometryComparableRevenue?.coverage??null,
    S3:c.geometryComparableMargin?.coverage??null,
    S4:c.geometryComparableMargin?.coverage??null,
    S5:candidate?.combinedCoverage??null,
    S7:c.geometryComparableEps?.coverage??null,
    S8:c.geometryComparableNetIncome?.coverage??null,
  };
  const baselineFcf=c.geometryAlignedFcfInput?.coverage??null;
  const gates={
    S1:finite(coverages.S1)&&coverages.S1>=0.80,
    S2:finite(coverages.S2)&&coverages.S2>=0.80,
    S3:finite(coverages.S3)&&coverages.S3>=0.80,
    S4:finite(coverages.S4)&&coverages.S4>=0.80,
    S5:finite(coverages.S5)&&coverages.S5>=0.70,
    S7:finite(coverages.S7)&&coverages.S7>=0.80,
    S8:finite(coverages.S8)&&coverages.S8>=0.80,
  };
  return {
    ageDays,
    coverages,
    baselineFcf,
    safeCandidateAdds:candidate?.candidateOnlyAdds??0,
    safeCandidateReady:candidate?.ready??0,
    safeCandidateOverlap:candidate?.overlap??0,
    safeCandidateIdentical:candidate?.identical??0,
    safeCandidateDifferent:candidate?.different??0,
    safeCandidateAccepted:false,
    gates,
    allSecGatesPass:Object.values(gates).every(Boolean),
  };
}

export function findMinimumPassingAge(rows=[]){
  return [...rows].sort((a,b)=>a.ageDays-b.ageDays).find(row=>row.allSecGatesPass)??null;
}

export function buildMinimumSafeAgeWindowDiagnosticFromDocuments({members=[],factsByCik=new Map(),submissionsByCik=new Map(),asOf,minAgeDays=185,maxAgeDays=365}={}){
  const rows=[];
  for(let ageDays=minAgeDays;ageDays<=maxAgeDays;ageDays++){
    const documentFocus=buildDocumentFocusDiagnosticFromDocuments({members,factsByCik,submissionsByCik,asOf,maxAgeDays:ageDays});
    const capex=buildCapexCandidateCounterfactualFromDocuments({members,factsByCik,submissionsByCik,asOf,ageWindows:[ageDays],candidateTags:[SAFE_CAPEX_CANDIDATE]});
    rows.push(evaluateAgeWindow({ageDays,documentFocus,capexWindow:capex.windows?.[String(ageDays)]}));
  }
  const minimum=findMinimumPassingAge(rows);
  const standardOnly=rows.find(row=>
    finite(row.coverages.S1)&&row.coverages.S1>=0.80&&
    finite(row.coverages.S2)&&row.coverages.S2>=0.80&&
    finite(row.coverages.S3)&&row.coverages.S3>=0.80&&
    finite(row.coverages.S4)&&row.coverages.S4>=0.80&&
    finite(row.baselineFcf)&&row.baselineFcf>=0.70&&
    finite(row.coverages.S7)&&row.coverages.S7>=0.80&&
    finite(row.coverages.S8)&&row.coverages.S8>=0.80
  )??null;
  return {
    version:E1_R5_MINIMUM_SAFE_AGE_WINDOW_DIAGNOSTIC_VERSION,
    status:"PASS",
    active:false,
    asOf,
    minAgeDays,
    maxAgeDays,
    safeCapexCandidate:SAFE_CAPEX_CANDIDATE,
    minimumPassingAgeDays:minimum?.ageDays??null,
    minimumPassingRow:minimum,
    minimumStandardOnlyAgeDays:standardOnly?.ageDays??null,
    rows,
    policies:{researchOnly:true,counterfactualOnly:true,formulaChanged:false,weightChanged:false,scoringGateChanged:false,inputContractChanged:false,productionActivation:false,safeCandidateAccepted:false,q4EpsAnnualMinusNineMonths:"FORBIDDEN"},
    networkCalls:0,dbWrites:0,
  };
}

export function formatMinimumSafeAgeWindowDiagnosticText(report){
  const rows=report?.rows??[];
  const min=report?.minimumPassingRow??null;
  const checkpoints=new Set([185,240,365]);
  if(min?.ageDays!=null){checkpoints.add(min.ageDays);if(min.ageDays>report.minAgeDays)checkpoints.add(min.ageDays-1);}
  const lines=[
    `E1-R5 MINIMUM SAFE AGE WINDOW DIAGNOSTIC: ${report?.status??"UNKNOWN"}`,
    `VERSION: ${report?.version??"-"}`,
    `AS_OF: ${report?.asOf??"-"}`,
    `POLICY: RESEARCH_ONLY formulaChanged=${report?.policies?.formulaChanged===true?"true":"false"} gateChanged=${report?.policies?.scoringGateChanged===true?"true":"false"} contractChanged=${report?.policies?.inputContractChanged===true?"true":"false"}`,
    `SAFE_CAPEX_CANDIDATE: ${report?.safeCapexCandidate??"-"} accepted=${report?.policies?.safeCandidateAccepted===true?"YES":"NO"}`,
    `MINIMUM_ALL_SEC_GATES_PASS_AGE_DAYS: ${report?.minimumPassingAgeDays??"NONE"}`,
    `MINIMUM_STANDARD_ONLY_ALL_SEC_GATES_PASS_AGE_DAYS: ${report?.minimumStandardOnlyAgeDays??"NONE"}`,
  ];
  for(const row of rows.filter(item=>checkpoints.has(item.ageDays)).sort((a,b)=>a.ageDays-b.ageDays)){
    lines.push(`AGE_${row.ageDays}: S1=${pct(row.coverages.S1)} S2=${pct(row.coverages.S2)} S3=${pct(row.coverages.S3)} S4=${pct(row.coverages.S4)} S5=${pct(row.coverages.S5)} baselineFCF=${pct(row.baselineFcf)} S7=${pct(row.coverages.S7)} S8=${pct(row.coverages.S8)} capexAdd=${row.safeCandidateAdds} pass=${row.allSecGatesPass?"YES":"NO"}`);
  }
  lines.push(
    `Q4_EPS_ANNUAL_MINUS_9M: ${report?.policies?.q4EpsAnnualMinusNineMonths??"-"}`,
    `FORMULA_CHANGED: ${report?.policies?.formulaChanged===true?"YES":"NO"}`,
    `WEIGHT_CHANGED: ${report?.policies?.weightChanged===true?"YES":"NO"}`,
    `SCORING_GATE_CHANGED: ${report?.policies?.scoringGateChanged===true?"YES":"NO"}`,
    `INPUT_CONTRACT_CHANGED: ${report?.policies?.inputContractChanged===true?"YES":"NO"}`,
    `NETWORK_CALLS: ${report?.networkCalls??0}`,
    `DB_WRITES: ${report?.dbWrites??0}`,
  );
  return lines.join("\r\n")+"\r\n";
}

export function runMinimumSafeAgeWindowDiagnostic({incoming,coreFile,asOf=new Date().toISOString().slice(0,10)}={}){
  const inputDir=incoming??path.join(defaultBase,"manual-input","e1-r5","incoming");
  const core=coreFile??path.join(defaultBase,"storage","core.sqlite");
  const universe=readLatestEarningsUniverse(core);
  if(universe.status!=="PASS")return {version:E1_R5_MINIMUM_SAFE_AGE_WINDOW_DIAGNOSTIC_VERSION,status:"PARTIAL",reason:"UNIVERSE_REQUIRED",active:false,networkCalls:0,dbWrites:0};
  const factsDir=path.join(inputDir,"companyfacts"),submissionsDir=path.join(inputDir,"submissions");
  const factsByCik=new Map(),submissionsByCik=new Map();
  for(const member of universe.members){
    const cik=String(member?.cik??"").replace(/\D/g,"").padStart(10,"0");
    factsByCik.set(cik,readJson(resolveSecJson(factsDir,cik,"companyfacts")));
    submissionsByCik.set(cik,readJson(resolveSecJson(submissionsDir,cik,"submissions")));
  }
  return buildMinimumSafeAgeWindowDiagnosticFromDocuments({members:universe.members,factsByCik,submissionsByCik,asOf});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const cli=parseArgs();
    const report=runMinimumSafeAgeWindowDiagnostic({incoming:cli.incoming?path.resolve(cli.incoming):undefined,coreFile:cli.core?path.resolve(cli.core):undefined,asOf:cli["as-of"]??undefined});
    console.log(formatMinimumSafeAgeWindowDiagnosticText(report));
  }catch(error){
    console.log(`E1-R5 MINIMUM SAFE AGE WINDOW DIAGNOSTIC: FAILED\r\nCODE: ${error?.code??"E1_R5_MINIMUM_SAFE_AGE_WINDOW_FAILED"}`);process.exitCode=1;
  }
}
