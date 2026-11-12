import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";

export const SECTOR_FEAR_GREED_R1_PROSPECTIVE_VERSION="SECTOR-FEAR-GREED-R1-PROSPECTIVE-READINESS-V1";
export const SECTOR_FEAR_GREED_R1_REQUIRED_REFERENCE_OBSERVATIONS=756;
const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const INPUT_JSON="local-sector-fear-greed-r1-pit-readiness.json";
const OUTPUT_JSON="local-sector-fear-greed-r1-prospective-readiness.json";
const OUTPUT_TXT="local-sector-fear-greed-r1-prospective-readiness.txt";
const COMPONENTS=["trend","breadth","demand","relativeStrength","volatility"];
const LABELS={trend:"T",breadth:"B",demand:"D",relativeStrength:"R",volatility:"V"};

function finiteInt(value){const n=Number(value);return Number.isFinite(n)&&n>=0?Math.floor(n):0;}
function remaining(referenceObservations,status){if(status==="READY")return 0;return Math.max(0,SECTOR_FEAR_GREED_R1_REQUIRED_REFERENCE_OBSERVATIONS-finiteInt(referenceObservations));}

export function buildSectorProspectiveReadiness(readiness,{now=new Date()}={}){
  if(!readiness||typeof readiness!=="object"||!readiness.sectors||typeof readiness.sectors!=="object")throw new Error("SECTOR_PIT_READINESS_INPUT_INVALID");
  const sectors={};
  const componentSummary=Object.fromEntries(COMPONENTS.map(name=>[name,{label:LABELS[name],minReferenceObservations:null,maxRemaining:0,readySectors:0}]));
  let maxRemaining=0;
  for(const [sectorId,item] of Object.entries(readiness.sectors)){
    const components={};
    for(const name of COMPONENTS){
      const source=item?.components?.[name]??{};
      const refs=finiteInt(source.referenceObservations);
      const left=remaining(refs,source.status);
      components[name]={label:LABELS[name],status:String(source.status??"PARTIAL"),referenceObservations:refs,requiredReferenceObservations:SECTOR_FEAR_GREED_R1_REQUIRED_REFERENCE_OBSERVATIONS,remainingReferenceObservations:left};
      const summary=componentSummary[name];
      summary.minReferenceObservations=summary.minReferenceObservations==null?refs:Math.min(summary.minReferenceObservations,refs);
      summary.maxRemaining=Math.max(summary.maxRemaining,left);
      if(source.status==="READY")summary.readySectors++;
      maxRemaining=Math.max(maxRemaining,left);
    }
    sectors[sectorId]={ticker:item?.ticker??null,status:item?.status??"PARTIAL",components,options:item?.options??{status:"BLOCKED"}};
  }
  const generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  return {
    version:1,
    methodologyVersion:SECTOR_FEAR_GREED_R1_PROSPECTIVE_VERSION,
    status:maxRemaining===0?"READY_5_OF_5_REFERENCE_HISTORY":"ACCUMULATING",
    mode:"SHADOW_PROSPECTIVE_MONITOR_ONLY",
    generatedAt,
    requiredReferenceObservations:SECTOR_FEAR_GREED_R1_REQUIRED_REFERENCE_OBSERVATIONS,
    maxRemainingReferenceObservations:maxRemaining,
    componentSummary,
    sectors,
    options:{status:"BLOCKED",reason:"OPTIONS_BLOCKED_BY_DATA_LICENSE"},
    readinessDateEstimate:null,
    providerCalls:0,
    publicMutation:false,
    dbSchemaChanged:false,
    productionFormulaChanged:false,
    schedulerChanged:false,
    warnings:[
      "REFERENCE_GAP_IS_COUNT_ONLY_NOT_A_CALENDAR_DATE_ESTIMATE",
      "MONITOR_DOES_NOT_COLLECT_DATA_OR_PUBLISH_RESULTS",
      "OPTIONS_REMAIN_BLOCKED_AND_85_PERCENT_IS_NOT_RENORMALIZED",
    ],
  };
}

export function renderSectorProspectiveReadiness(report){
  const lines=[
    "ZGMINI SECTOR FEAR & GREED R1 PROSPECTIVE READINESS",
    `generatedAt=${report.generatedAt}`,
    `status=${report.status}`,
    `requiredReferenceObservations=${report.requiredReferenceObservations}`,
    `maxRemainingReferenceObservations=${report.maxRemainingReferenceObservations}`,
    `readinessDateEstimate=NONE`,
    "",
    "COMPONENT | MIN_REFS | MAX_REMAINING | READY_SECTORS",
  ];
  for(const name of COMPONENTS){const item=report.componentSummary[name];lines.push(`${item.label} | ${item.minReferenceObservations??0} | ${item.maxRemaining} | ${item.readySectors}`);}
  lines.push("","SECTOR | ETF | T_REM | B_REM | D_REM | R_REM | V_REM | OPTIONS");
  for(const [sectorId,item] of Object.entries(report.sectors))lines.push(`${sectorId} | ${item.ticker??""} | ${item.components.trend.remainingReferenceObservations} | ${item.components.breadth.remainingReferenceObservations} | ${item.components.demand.remainingReferenceObservations} | ${item.components.relativeStrength.remainingReferenceObservations} | ${item.components.volatility.remainingReferenceObservations} | ${item.options?.status??"BLOCKED"}`);
  lines.push("",...report.warnings.map(value=>`warning=${value}`));
  return lines.join("\n")+"\n";
}

export function runSectorProspectiveReadiness(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const inputFile=path.join(base,INPUT_JSON);if(!fs.existsSync(inputFile))throw new Error("SECTOR_PIT_READINESS_JSON_MISSING");
  let readiness;try{readiness=JSON.parse(fs.readFileSync(inputFile,"utf8"));}catch{throw new Error("SECTOR_PIT_READINESS_JSON_INVALID")}
  const report=buildSectorProspectiveReadiness(readiness,{now});
  fs.mkdirSync(base,{recursive:true});const jsonFile=path.join(base,OUTPUT_JSON),txtFile=path.join(base,OUTPUT_TXT);
  fs.writeFileSync(jsonFile,JSON.stringify(report,null,2)+"\n");fs.writeFileSync(txtFile,renderSectorProspectiveReadiness(report));
  return {status:report.status,jsonFile,txtFile,maxRemainingReferenceObservations:report.maxRemainingReferenceObservations,providerCalls:0,publicMutation:false,dbSchemaChanged:false,schedulerChanged:false};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{console.log(JSON.stringify(runSectorProspectiveReadiness(),null,2));}
  catch(error){const message=String(error?.message??"");const code=/^[A-Z0-9_:-]+$/.test(message)?message:"SECTOR_PROSPECTIVE_READINESS_FAILED";console.log(JSON.stringify({status:"FAILED",code,providerCalls:0,publicMutation:false,dbSchemaChanged:false,schedulerChanged:false}));process.exitCode=1;}
}
