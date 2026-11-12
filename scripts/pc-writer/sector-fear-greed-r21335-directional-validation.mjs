import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const SOURCE_FILE="local-sector-fear-greed-r21334-economic-robustness.json";
const OUT="local-sector-fear-greed-r21335-directional-validation";
export const R21335_HORIZONS=Object.freeze([5,20,60]);
export const R21335_REFERENCE_OBSERVATIONS=756;
export const R21335_EXPECTED_IC_DIRECTION="NEGATIVE";
export const R21335_INTERPRETATION_HYPOTHESIS="HIGHER_GREED_SCORE_ASSOCIATES_WITH_LOWER_FORWARD_RETURN_AND_DEEPER_FORWARD_DRAWDOWN";
export const R21335_MODEL_PAIRS=Object.freeze({raw:Object.freeze(["fiveRaw","sixRaw"]),smoothed:Object.freeze(["fiveSmoothed","sixSmoothed"])});

const finite=x=>typeof x==="number"&&Number.isFinite(x);
const round=x=>finite(x)?Math.round(x*10000)/10000:null;
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}

export function classifyR21335DirectionalChange(five,six){
  if(!finite(five)||!finite(six))return {five:null,six:null,delta:null,class:"UNAVAILABLE",fiveNegative:null,sixNegative:null};
  const delta=round(six-five),cls=delta<0?"STRONGER_NEGATIVE":delta>0?"WEAKER_NEGATIVE":"EQUAL";
  return {five:round(five),six:round(six),delta,class:cls,fiveNegative:five<0,sixNegative:six<0};
}

function summarizeClasses(cells=[]){
  const valid=cells.filter(x=>x&&x.class!=="UNAVAILABLE");
  return {cells:valid.length,strongerNegative:valid.filter(x=>x.class==="STRONGER_NEGATIVE").length,weakerNegative:valid.filter(x=>x.class==="WEAKER_NEGATIVE").length,equal:valid.filter(x=>x.class==="EQUAL").length,fiveNegative:valid.filter(x=>x.fiveNegative===true).length,sixNegative:valid.filter(x=>x.sixNegative===true).length};
}

export function analyzeR21335CrossSectional(prior={}){
  const detail={};const cells=[];
  for(const type of Object.keys(R21335_MODEL_PAIRS)){
    detail[type]={};
    for(const h of R21335_HORIZONS){
      detail[type][h]={};
      for(const metric of ["return","drawdown"]){
        const src=prior?.crossSectionalSigns?.[type]?.[h]?.[metric]??{};
        const x=classifyR21335DirectionalChange(src.fiveMedianIC,src.sixMedianIC);
        detail[type][h][metric]=x;cells.push(x);
      }
    }
  }
  return {summary:summarizeClasses(cells),detail};
}

export function analyzeR21335SectorTimeSeries(prior={}){
  const result={};const all=[];
  for(const type of Object.keys(R21335_MODEL_PAIRS)){
    const rows=[];const typeCells=[];
    for(const sector of prior?.sectorDeltas?.[type]?.sectorDetail??[]){
      const row={sectorId:sector.sectorId,horizons:{}};
      for(const h of R21335_HORIZONS){
        row.horizons[h]={};
        for(const metric of ["return","drawdown"]){
          const src=sector?.horizons?.[h]?.[metric]??{};
          const x=classifyR21335DirectionalChange(src.fiveTimeSeriesIC,src.sixTimeSeriesIC);
          row.horizons[h][metric]=x;typeCells.push(x);all.push(x);
        }
      }
      rows.push(row);
    }
    const byHorizon={};for(const h of R21335_HORIZONS){const cells=[];for(const row of rows)for(const metric of ["return","drawdown"])cells.push(row.horizons[h][metric]);byHorizon[h]=summarizeClasses(cells);}
    result[type]={summary:summarizeClasses(typeCells),byHorizon,sectorDetail:rows};
  }
  return {summary:summarizeClasses(all),types:result};
}

export function analyzeR21335JointRobustness(prior={},cross={}){
  const detail={};const counts={bothImproved:0,directionOnly:0,stabilityOnly:0,bothWorsened:0,equalDirection:0};
  for(const type of Object.keys(R21335_MODEL_PAIRS)){
    detail[type]={};
    for(const h of R21335_HORIZONS){
      detail[type][h]={};
      for(const metric of ["return","drawdown"]){
        const direction=cross?.detail?.[type]?.[h]?.[metric]?.class??"UNAVAILABLE";
        const stable=prior?.losoStability?.[type]?.[h]?.[metric]?.sixLessSectorSensitive;
        let joint="UNAVAILABLE";
        if(direction==="EQUAL"){joint="EQUAL_DIRECTION";counts.equalDirection++;}
        else if(direction!=="UNAVAILABLE"&&typeof stable==="boolean"){
          if(direction==="STRONGER_NEGATIVE"&&stable){joint="BOTH_IMPROVED";counts.bothImproved++;}
          else if(direction==="STRONGER_NEGATIVE"&&!stable){joint="DIRECTION_ONLY";counts.directionOnly++;}
          else if(direction==="WEAKER_NEGATIVE"&&stable){joint="STABILITY_ONLY";counts.stabilityOnly++;}
          else {joint="BOTH_WORSENED";counts.bothWorsened++;}
        }
        detail[type][h][metric]={directionClass:direction,sixLessSectorSensitive:typeof stable==="boolean"?stable:null,joint};
      }
    }
  }
  return {summary:counts,detail};
}

function buildSynthesis(prior,cross,sector,joint){
  const c=cross.summary,s=sector.summary,j=joint.summary;
  const sixtyExcluded=prior?.synthesis?.sixtyDayNonOverlapSuitableForSelection===false;
  const reasons=[];
  if(sixtyExcluded)reasons.push("R21335_60D_NONOVERLAP_EXCLUDED_SMALL_N");
  if(c.weakerNegative>c.strongerNegative)reasons.push("R21335_CROSS_SECTIONAL_MORE_WEAKER_THAN_STRONGER_NEGATIVE");
  if(s.weakerNegative>s.strongerNegative)reasons.push("R21335_SECTOR_TIME_SERIES_MORE_WEAKER_THAN_STRONGER_NEGATIVE");
  if(j.bothWorsened>j.bothImproved)reasons.push("R21335_JOINT_ROBUSTNESS_MORE_BOTH_WORSENED_THAN_BOTH_IMPROVED");
  const finding=s.weakerNegative>s.strongerNegative&&c.weakerNegative>c.strongerNegative?"SIXTH_AXIS_DIRECTIONAL_SUPPORT_WEAK":"DIRECTIONAL_EVIDENCE_MIXED";
  return {expectedIcDirection:R21335_EXPECTED_IC_DIRECTION,interpretationHypothesis:R21335_INTERPRETATION_HYPOTHESIS,sixtyDayNonOverlapExcludedFromSelection:sixtyExcluded,crossSectional:c,sectorTimeSeries:s,jointRobustness:j,researchFinding:finding,judgment:"NO_SELECTION_DIAGNOSTIC_ONLY",reasonCodes:reasons};
}

export function runR21335(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const file=path.join(base,SOURCE_FILE);if(!fs.existsSync(file))throw new Error(`R21335_INPUT_MISSING:${SOURCE_FILE}`);const prior=safeJson(file);if(!prior)throw new Error("R21335_INPUT_INVALID_JSON");
  if(prior.status!=="SHADOW_R21334_ECONOMIC_ROBUSTNESS_COMPLETE"||prior.diagnosticOnly!==true)throw new Error("R21335_R21334_STATUS_INVALID");
  if(prior.approvedR1ReferenceRequirement!==R21335_REFERENCE_OBSERVATIONS||prior.referenceRequirementChanged!==false)throw new Error("R21335_REFERENCE_CONTRACT_MISMATCH");
  if(prior.diagnosticWindow!==252||JSON.stringify(prior.horizons)!==JSON.stringify(R21335_HORIZONS))throw new Error("R21335_WINDOW_CONTRACT_MISMATCH");
  if(prior.providerCalls!==0||prior.publicMutation!==false||prior.d1Mutation!==false||prior.productionFormulaChanged!==false||prior.weightsChanged!==false||prior.normalizationChanged!==false||prior.schedulerChanged!==false)throw new Error("R21335_SOURCE_MUTATION_CONTRACT_MISMATCH");
  if(prior?.synthesis?.judgment!=="MIXED_ROBUSTNESS_NO_SELECTION")throw new Error("R21335_SOURCE_JUDGMENT_INVALID");
  const crossSectional=analyzeR21335CrossSectional(prior),sectorTimeSeries=analyzeR21335SectorTimeSeries(prior),jointRobustness=analyzeR21335JointRobustness(prior,crossSectional),synthesis=buildSynthesis(prior,crossSectional,sectorTimeSeries,jointRobustness),generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  const report={version:"R2.13.35-DIRECTIONAL-VALIDATION",generatedAt,status:"SHADOW_R21335_DIRECTIONAL_VALIDATION_COMPLETE",mode:"LOCAL_READ_ONLY_R21334_DIRECTIONAL_DIAGNOSTIC",sourceFile:SOURCE_FILE,sourceStatus:prior.status,providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,sourceFilesMutated:false,candidateSelected:false,optionsReplacementSelected:false,optionsEquivalenceClaimed:false,selectionThresholdIntroduced:false,diagnosticOnly:true,diagnosticWindow:252,horizons:R21335_HORIZONS,scoreOrientation:"HIGHER_SCORE_MORE_GREED_RISK_APPETITE",expectedIcDirection:R21335_EXPECTED_IC_DIRECTION,interpretationHypothesis:R21335_INTERPRETATION_HYPOTHESIS,crossSectional,sectorTimeSeries,jointRobustness,synthesis,next:"REVIEW_R21335_DIRECTIONAL_EVIDENCE_BEFORE_ANY_SIXTH_AXIS_OR_OPTIONS_REPLACEMENT_DECISION"};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.35 DIRECTIONAL VALIDATION",`generatedAt=${generatedAt}`,`status=${report.status}`,`sourceStatus=${report.sourceStatus}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED) normalizationChanged=false weightsChanged=false referenceWindowChanged=false","candidateSelected=false optionsReplacementSelected=false optionsEquivalenceClaimed=false selectionThresholdIntroduced=false diagnosticOnly=true",`scoreOrientation=${report.scoreOrientation}`,`expectedIcDirection=${report.expectedIcDirection}`,`interpretationHypothesis=${report.interpretationHypothesis}`,"","CROSS-SECTIONAL DIRECTIONAL CHANGE","TYPE | H | METRIC | FIVE_IC | SIX_IC | DELTA | CLASS"];
  for(const type of Object.keys(R21335_MODEL_PAIRS))for(const h of R21335_HORIZONS)for(const metric of ["return","drawdown"]){const x=crossSectional.detail[type][h][metric];lines.push(`${type} | ${h} | ${metric} | ${x.five??"NA"} | ${x.six??"NA"} | ${x.delta??"NA"} | ${x.class}`);}
  lines.push("",`crossCells=${synthesis.crossSectional.cells} strongerNegative=${synthesis.crossSectional.strongerNegative} weakerNegative=${synthesis.crossSectional.weakerNegative} equal=${synthesis.crossSectional.equal}`,"","SECTOR TIME-SERIES DIRECTIONAL COUNTS","TYPE | CELLS | STRONGER_NEGATIVE | WEAKER_NEGATIVE | EQUAL");
  for(const type of Object.keys(R21335_MODEL_PAIRS)){const x=sectorTimeSeries.types[type].summary;lines.push(`${type} | ${x.cells} | ${x.strongerNegative} | ${x.weakerNegative} | ${x.equal}`);}
  lines.push(`all | ${synthesis.sectorTimeSeries.cells} | ${synthesis.sectorTimeSeries.strongerNegative} | ${synthesis.sectorTimeSeries.weakerNegative} | ${synthesis.sectorTimeSeries.equal}`,"","JOINT DIRECTION + LOSO","TYPE | H | METRIC | DIRECTION | SIX_LESS_SECTOR_SENSITIVE | JOINT");
  for(const type of Object.keys(R21335_MODEL_PAIRS))for(const h of R21335_HORIZONS)for(const metric of ["return","drawdown"]){const x=jointRobustness.detail[type][h][metric];lines.push(`${type} | ${h} | ${metric} | ${x.directionClass} | ${x.sixLessSectorSensitive} | ${x.joint}`);}
  lines.push("",`bothImproved=${synthesis.jointRobustness.bothImproved} directionOnly=${synthesis.jointRobustness.directionOnly} stabilityOnly=${synthesis.jointRobustness.stabilityOnly} bothWorsened=${synthesis.jointRobustness.bothWorsened}`,`sixtyDayNonOverlapExcludedFromSelection=${synthesis.sixtyDayNonOverlapExcludedFromSelection}`,`researchFinding=${synthesis.researchFinding}`,`judgment=${synthesis.judgment}`,`reasonCodes=${synthesis.reasonCodes.join(",")}`,"note=NEGATIVE_IC_DIRECTION_IS_A_DIAGNOSTIC_CONTRARIAN_RISK_HYPOTHESIS_NOT_A_PRODUCTION_SELECTION_RULE","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_SCHEMA_SCHEDULER_OR_PRODUCTION_CHANGE","note=RESULTS_DO_NOT_SELECT_A_SIXTH_AXIS_OR_AUTHORIZE_OPTIONS_REPLACEMENT",`next=${report.next}`);
  const jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`);saveJson(jsonFile,report);saveText(txtFile,lines.join("\n")+"\n");return {...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21335();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,referenceRequirementChanged:r.referenceRequirementChanged,synthesis:r.synthesis,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
