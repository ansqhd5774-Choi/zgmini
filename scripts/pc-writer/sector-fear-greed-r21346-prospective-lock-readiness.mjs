import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const R21342_FILE="local-sector-fear-greed-r21342-tail-correlation-screen.json";
const R21343_FILE="local-sector-fear-greed-r21343-internal-correlation-sign-persistence.json";
const R21344_FILE="local-sector-fear-greed-r21344-internal-correlation-incremental-robustness.json";
const R21345_FILE="local-sector-fear-greed-r21345-pre-discovery-holdout-validation.json";
const OUT="local-sector-fear-greed-r21346-prospective-lock-readiness";

export const R21346_FEATURE="internalCorrelationShock";
export const R21346_REFERENCE_OBSERVATIONS=756;
export const R21346_HORIZONS=Object.freeze([5,20,60]);
export const R21346_EXPECTED_IC_DIRECTION="NEGATIVE";
export const R21346_PRIMARY_OUTCOME="FORWARD_DRAWDOWN";

const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));return value;}
export function contractHashR21346(contract){return crypto.createHash("sha256").update(JSON.stringify(stable(contract))).digest("hex");}

export function buildLockContractR21346({source42,source43}={}){
  const definition=source42?.definitions?.[R21346_FEATURE],dates=Array.isArray(source43?.dates)?source43.dates.filter(validDate).sort():[];
  if(typeof definition!=="string"||!definition)throw new Error("R21346_LOCK_DEFINITION_MISSING");
  if(dates.length!==252)throw new Error(`R21346_DISCOVERY_DATES_NOT_252:${dates.length}`);
  return {
    feature:R21346_FEATURE,
    definition,
    normalizationReference:R21346_REFERENCE_OBSERVATIONS,
    expectedIcDirection:R21346_EXPECTED_IC_DIRECTION,
    primaryOutcome:R21346_PRIMARY_OUTCOME,
    horizons:[...R21346_HORIZONS],
    fiveRawControlDefinition:"R21332_FIVE_AXIS_252_DIAGNOSTIC_COMPOSITE_UNCHANGED",
    discoveryStart:dates[0],
    discoveryEnd:dates.at(-1),
    prospectiveRule:"ONLY_SIGNAL_DATES_STRICTLY_AFTER_DISCOVERY_END_NO_RETUNING",
    forwardOutcomeRule:"OUTCOME_END_MUST_EXIST_AFTER_PROSPECTIVE_SIGNAL_DATE_BY_HORIZON",
  };
}

export function validateExistingLockR21346(existing,contract){
  if(!existing)return {exists:false,valid:true};
  const expected=contractHashR21346(contract),valid=existing?.contractHash===expected&&existing?.contract?.feature===contract.feature&&existing?.contract?.discoveryEnd===contract.discoveryEnd;
  if(!valid)throw new Error("R21346_EXISTING_LOCK_CONTRACT_MISMATCH");
  return {exists:true,valid:true,createdAt:existing.createdAt??null};
}

export function runR21346(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const source42=safeJson(path.join(base,R21342_FILE)),source43=safeJson(path.join(base,R21343_FILE)),source44=safeJson(path.join(base,R21344_FILE)),source45=safeJson(path.join(base,R21345_FILE));
  if(source42?.status!=="SHADOW_R21342_TAIL_CORRELATION_SCREEN_COMPLETE")throw new Error("R21346_R21342_NOT_READY");
  if(source43?.status!=="SHADOW_R21343_INTERNAL_CORRELATION_SIGN_PERSISTENCE_COMPLETE")throw new Error("R21346_R21343_NOT_READY");
  if(source44?.status!=="SHADOW_R21344_INTERNAL_CORRELATION_INCREMENTAL_ROBUSTNESS_COMPLETE")throw new Error("R21346_R21344_NOT_READY");
  if(source45?.status!=="SHADOW_R21345_PRE_DISCOVERY_HOLDOUT_VALIDATION_COMPLETE")throw new Error("R21346_R21345_NOT_READY");
  if(source45.feature!==R21346_FEATURE||source44.feature!==R21346_FEATURE||source43.feature!==R21346_FEATURE)throw new Error("R21346_FEATURE_CONTRACT_MISMATCH");
  if(source45.approvedR1ReferenceRequirement!==R21346_REFERENCE_OBSERVATIONS||source44.approvedR1ReferenceRequirement!==R21346_REFERENCE_OBSERVATIONS)throw new Error("R21346_REFERENCE_CONTRACT_MISMATCH");
  if(source45.productionFormulaChanged!==false||source45.weightsChanged!==false||source45.normalizationChanged!==false||source45.referenceWindowChanged!==false||source45.candidateSelected!==false||source45.optionsReplacementSelected!==false)throw new Error("R21346_SOURCE_MUTATION_CONTRACT_MISMATCH");

  const contract=buildLockContractR21346({source42,source43}),contractHash=contractHashR21346(contract),jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`),existing=safeJson(jsonFile),existingState=validateExistingLockR21346(existing,contract),createdAt=existingState.exists?existingState.createdAt:(now instanceof Date?now:new Date(now)).toISOString();
  const commonPreDiscoveryDates=Number(source45.commonPreDiscoveryDates??0),historicalHoldoutAvailable=commonPreDiscoveryDates>0;
  const report={
    version:"R2.13.46-PROSPECTIVE-LOCK-READINESS",
    generatedAt:(now instanceof Date?now:new Date(now)).toISOString(),
    createdAt,
    status:"SHADOW_R21346_PROSPECTIVE_LOCK_READY",
    mode:"LOCAL_ONLY_FROZEN_RESEARCH_LOCK",
    providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,candidateSelected:false,optionsReplacementSelected:false,selectionThresholdIntroduced:false,diagnosticOnly:true,
    lockCreated:!existingState.exists,
    contractHash,
    contract,
    historicalHoldout:{available:historicalHoldoutAvailable,commonPreDiscoveryDates,reason:historicalHoldoutAvailable?null:"NO_COMMON_SCORED_DATE_BEFORE_DISCOVERY_START_UNDER_UNCHANGED_756_REFERENCE"},
    discoveryEvidence:{
      drawdownFiveRawPartial:Object.fromEntries(R21346_HORIZONS.map(h=>[h,source44?.storedFiveRawPartialDrawdown?.[h]?.median??null])),
      bootstrapProbNegative:Object.fromEntries(R21346_HORIZONS.map(h=>[h,source44?.blockBootstrapFiveRawPartialDrawdown?.[h]?.probNegative??null])),
      redundancyVsVolatilityMedian:source44?.redundancyVsVolatility?.median??null,
    },
    prospectiveReadiness:{
      locked:true,
      firstEligibleSignalRule:`date > ${contract.discoveryEnd}`,
      requiredForwardSessionsByHorizon:Object.fromEntries(R21346_HORIZONS.map(h=>[h,h])),
      currentProspectiveObservations:0,
      state:"WAIT_FOR_NEW_POST_LOCK_MARKET_DATA",
    },
    next:"AFTER_NEW_POST_LOCK_DATA_ACCUMULATES_RUN_FROZEN_PROSPECTIVE_VALIDATION_WITHOUT_RETUNING",
  };
  saveJson(jsonFile,report);
  const lines=[
    "ZGMINI SECTOR FEAR & GREED R2.13.46 PROSPECTIVE LOCK READINESS",
    `generatedAt=${report.generatedAt}`,
    `status=${report.status}`,
    `lockCreated=${report.lockCreated}`,
    `contractHash=${contractHash}`,
    `feature=${contract.feature}`,
    `definition=${contract.definition}`,
    `reference=${contract.normalizationReference}`,
    `discoveryStart=${contract.discoveryStart}`,
    `discoveryEnd=${contract.discoveryEnd}`,
    `historicalHoldoutAvailable=${historicalHoldoutAvailable}`,
    `commonPreDiscoveryDates=${commonPreDiscoveryDates}`,
    `historicalHoldoutReason=${report.historicalHoldout.reason??"AVAILABLE"}`,
    `prospectiveState=${report.prospectiveReadiness.state}`,
    `firstEligibleSignalRule=${report.prospectiveReadiness.firstEligibleSignalRule}`,
    "requiredForwardSessions=5:5 20:20 60:60",
    "providerCalls=0 publicMutation=false d1Mutation=false productionFormulaChanged=false schedulerChanged=false",
    "approvedR1ReferenceRequirement=756 (UNCHANGED) normalizationChanged=false weightsChanged=false referenceWindowChanged=false",
    "candidateSelected=false optionsReplacementSelected=false diagnosticOnly=true",
    "note=LOCK_PREVENTS_RETUNING_AFTER_DISCOVERY_WINDOW",
    "note=NO_HISTORICAL_HOLDOUT_IS_FABRICATED_WHEN_COMMON_PRE_DISCOVERY_DATES_ARE_ZERO",
    "note=TRUE_PROSPECTIVE_EVIDENCE_REQUIRES_NEW_POST_LOCK_MARKET_DATA",
    `next=${report.next}`,
  ];
  saveText(txtFile,lines.join("\n")+"\n");
  return {...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21346();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,lockCreated:r.lockCreated,contractHash:r.contractHash,historicalHoldout:r.historicalHoldout,prospectiveReadiness:r.prospectiveReadiness,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
