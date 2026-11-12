import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const SOURCE_FILE="local-sector-fear-greed-r21333-economic-validation.json";
const OUT="local-sector-fear-greed-r21334-economic-robustness";
export const R21334_HORIZONS=Object.freeze([5,20,60]);
export const R21334_MODELS=Object.freeze(["fiveRaw","sixRaw","fiveSmoothed","sixSmoothed"]);
export const R21334_REFERENCE_OBSERVATIONS=756;
export const R21334_MODEL_PAIRS=Object.freeze({raw:Object.freeze(["fiveRaw","sixRaw"]),smoothed:Object.freeze(["fiveSmoothed","sixSmoothed"])});

const finite=x=>typeof x==="number"&&Number.isFinite(x);
const round=x=>finite(x)?Math.round(x*10000)/10000:null;
const median=values=>{const a=(Array.isArray(values)?values:[]).filter(finite).sort((a,b)=>a-b);if(!a.length)return null;const p=(a.length-1)/2,l=Math.floor(p),h=Math.ceil(p);return l===h?a[l]:(a[l]+a[h])/2;};
const sign=x=>finite(x)?Math.sign(x):null;
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}
function frequency(values=[]){const out={};for(const value of values){const key=String(value);out[key]=(out[key]??0)+1;}return Object.fromEntries(Object.entries(out).sort((a,b)=>Number(a[0])-Number(b[0])));}
function compareNumber(a,b){return finite(a)&&finite(b)?round(b-a):null;}

export function analyzeR21334NonOverlap60(models={}){
  const result={};
  for(const modelId of R21334_MODELS){
    const model=models?.[modelId];
    result[modelId]={};
    for(const metric of ["return","drawdown"]){
      const sectorRows=[];
      for(const [sectorId,sector] of Object.entries(model?.sectors??{}).sort((a,b)=>a[0].localeCompare(b[0]))){
        const summary=sector?.nonOverlap?.[60]?.[metric]??{};
        const eligible=(Array.isArray(summary?.buckets)?summary.buckets:[]).filter(x=>Number.isInteger(x?.n)&&x.n>=3&&finite(x?.rho));
        const pairSizes=eligible.map(x=>x.n),rhos=eligible.map(x=>x.rho);
        sectorRows.push({sectorId,eligibleOffsets:eligible.length,minPairs:pairSizes.length?Math.min(...pairSizes):0,medianPairs:round(median(pairSizes)),maxPairs:pairSizes.length?Math.max(...pairSizes):0,medianIC:finite(summary?.medianIC)?summary.medianIC:null,exactMinusHalfBuckets:rhos.filter(x=>x===-0.5).length,pairCountDistribution:frequency(pairSizes),rhoDistribution:frequency(rhos)});
      }
      const allBuckets=[];
      for(const sector of Object.values(model?.sectors??{})){
        const buckets=sector?.nonOverlap?.[60]?.[metric]?.buckets;
        for(const bucket of Array.isArray(buckets)?buckets:[])if(Number.isInteger(bucket?.n)&&bucket.n>=3&&finite(bucket?.rho))allBuckets.push(bucket);
      }
      const pairSizes=allBuckets.map(x=>x.n),rhos=allBuckets.map(x=>x.rho),sectorMedians=sectorRows.map(x=>x.medianIC).filter(finite),threeOrFour=pairSizes.filter(x=>x===3||x===4).length,smallSampleDiscreteRegime=pairSizes.length>0&&Math.max(...pairSizes)<=4,aggregateMedianIC=model?.nonOverlap?.[60]?.[metric]?.medianOffsetICAcrossSectors;
      result[modelId][metric]={sectors:sectorRows.length,aggregateMedianIC:finite(aggregateMedianIC)?aggregateMedianIC:null,totalEligibleBuckets:allBuckets.length,minPairs:pairSizes.length?Math.min(...pairSizes):0,medianPairs:round(median(pairSizes)),maxPairs:pairSizes.length?Math.max(...pairSizes):0,pairCountDistribution:frequency(pairSizes),threeOrFourPairBuckets:threeOrFour,threeOrFourShare:pairSizes.length?round(threeOrFour/pairSizes.length):null,exactMinusHalfBuckets:rhos.filter(x=>x===-0.5).length,exactMinusHalfShare:rhos.length?round(rhos.filter(x=>x===-0.5).length/rhos.length):null,sectorMedianMinusHalfCount:sectorMedians.filter(x=>x===-0.5).length,rhoDistribution:frequency(rhos),smallSampleDiscreteRegime,classification:smallSampleDiscreteRegime?"SMALL_N_DISCRETE_SPEARMAN_60D":"NOT_FULLY_EXPLAINED_BY_SMALL_N",sectorDetail:sectorRows};
    }
  }
  return result;
}

export function decomposeR21334SectorDeltas(models={}){
  const out={};
  for(const [type,[fiveId,sixId]] of Object.entries(R21334_MODEL_PAIRS)){
    const five=models?.[fiveId]??{},six=models?.[sixId]??{},sectors=[...new Set([...Object.keys(five.sectors??{}),...Object.keys(six.sectors??{})])].sort(),rows=[];
    for(const sectorId of sectors){
      const row={sectorId,horizons:{}};
      for(const h of R21334_HORIZONS){row.horizons[h]={};for(const metric of ["return","drawdown"]){const icKey=metric==="return"?"returnIC":"drawdownIC",a=five.sectors?.[sectorId]?.timeSeries?.[h]?.[icKey],b=six.sectors?.[sectorId]?.timeSeries?.[h]?.[icKey],na=five.sectors?.[sectorId]?.nonOverlap?.[h]?.[metric]?.medianIC,nb=six.sectors?.[sectorId]?.nonOverlap?.[h]?.[metric]?.medianIC;row.horizons[h][metric]={fiveTimeSeriesIC:finite(a)?a:null,sixTimeSeriesIC:finite(b)?b:null,timeSeriesDelta:compareNumber(a,b),timeSeriesSignPreserved:finite(a)&&finite(b)?sign(a)===sign(b):null,fiveNonOverlapMedianIC:finite(na)?na:null,sixNonOverlapMedianIC:finite(nb)?nb:null,nonOverlapDelta:compareNumber(na,nb),nonOverlapSignPreserved:finite(na)&&finite(nb)?sign(na)===sign(nb):null};}}
      rows.push(row);
    }
    const cells=[];for(const row of rows)for(const h of R21334_HORIZONS)for(const metric of ["return","drawdown"])cells.push(row.horizons[h][metric]);
    out[type]={fiveModel:fiveId,sixModel:sixId,sectors:rows.length,timeSeriesHigher:cells.filter(x=>finite(x.timeSeriesDelta)&&x.timeSeriesDelta>0).length,timeSeriesLower:cells.filter(x=>finite(x.timeSeriesDelta)&&x.timeSeriesDelta<0).length,timeSeriesEqual:cells.filter(x=>x.timeSeriesDelta===0).length,timeSeriesSignFlips:cells.filter(x=>x.timeSeriesSignPreserved===false).length,nonOverlapHigher:cells.filter(x=>finite(x.nonOverlapDelta)&&x.nonOverlapDelta>0).length,nonOverlapLower:cells.filter(x=>finite(x.nonOverlapDelta)&&x.nonOverlapDelta<0).length,nonOverlapEqual:cells.filter(x=>x.nonOverlapDelta===0).length,nonOverlapSignFlips:cells.filter(x=>x.nonOverlapSignPreserved===false).length,sectorDetail:rows};
  }
  return out;
}

export function analyzeR21334CrossSectionalSigns(models={}){
  const out={};for(const [type,[fiveId,sixId]] of Object.entries(R21334_MODEL_PAIRS)){out[type]={};for(const h of R21334_HORIZONS){out[type][h]={};for(const metric of ["return","drawdown"]){const a=models?.[fiveId]?.crossSectional?.[h]?.[metric]?.medianIC,b=models?.[sixId]?.crossSectional?.[h]?.[metric]?.medianIC;out[type][h][metric]={fiveMedianIC:finite(a)?a:null,sixMedianIC:finite(b)?b:null,delta:compareNumber(a,b),signPreserved:finite(a)&&finite(b)?sign(a)===sign(b):null};}}}return out;
}

export function analyzeR21334LosoStability(models={}){
  const out={};for(const [type,[fiveId,sixId]] of Object.entries(R21334_MODEL_PAIRS)){out[type]={};for(const h of R21334_HORIZONS){out[type][h]={};for(const metric of ["return","drawdown"]){const a=models?.[fiveId]?.loso?.[h]?.[metric]?.maxAbsDeltaMedianIC,b=models?.[sixId]?.loso?.[h]?.[metric]?.maxAbsDeltaMedianIC,aFlips=models?.[fiveId]?.loso?.[h]?.[metric]?.signFlipOmissions,bFlips=models?.[sixId]?.loso?.[h]?.[metric]?.signFlipOmissions,delta=compareNumber(a,b);out[type][h][metric]={fiveMaxAbsDelta:finite(a)?a:null,sixMaxAbsDelta:finite(b)?b:null,deltaMaxAbs:delta,sixLessSectorSensitive:finite(delta)?delta<0:null,fiveSignFlipOmissions:Number.isInteger(aFlips)?aFlips:null,sixSignFlipOmissions:Number.isInteger(bFlips)?bFlips:null};}}}return out;
}

function buildSynthesis(nonOverlap60,crossSigns,loso){
  const sixtyEntries=[];for(const model of Object.values(nonOverlap60))for(const metric of Object.values(model))sixtyEntries.push(metric);const all60SmallN=sixtyEntries.length===8&&sixtyEntries.every(x=>x.smallSampleDiscreteRegime===true);
  const signCells=[];for(const type of Object.values(crossSigns))for(const h of Object.values(type))for(const metric of Object.values(h))signCells.push(metric);
  const losoCells=[];for(const type of Object.values(loso))for(const h of Object.values(type))for(const metric of Object.values(h))losoCells.push(metric);
  const losoImproved=losoCells.filter(x=>x.sixLessSectorSensitive===true).length,losoWorsened=losoCells.filter(x=>x.sixLessSectorSensitive===false&&finite(x.deltaMaxAbs)&&x.deltaMaxAbs>0).length,losoEqual=losoCells.filter(x=>x.deltaMaxAbs===0).length,signFlips=signCells.filter(x=>x.signPreserved===false).length,reasons=[];
  if(all60SmallN)reasons.push("R21334_60D_NONOVERLAP_SMALL_N_DISCRETE");if(signFlips>0)reasons.push("R21334_CROSS_SECTIONAL_SIGN_FLIPS_PRESENT");if(losoImproved>0&&losoWorsened>0)reasons.push("R21334_LOSO_MIXED");
  return {all60NonOverlapSmallNDiscrete:all60SmallN,sixtyDayNonOverlapSuitableForSelection:!all60SmallN,crossSectionalCells:signCells.length,crossSectionalSignFlips:signFlips,losoCells:losoCells.length,losoImproved,losoWorsened,losoEqual,judgment:"MIXED_ROBUSTNESS_NO_SELECTION",reasonCodes:reasons};
}

export function runR21334(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const file=path.join(base,SOURCE_FILE);if(!fs.existsSync(file))throw new Error(`R21334_INPUT_MISSING:${SOURCE_FILE}`);const prior=safeJson(file);if(!prior)throw new Error("R21334_INPUT_INVALID_JSON");
  if(prior.status!=="SHADOW_R21333_ECONOMIC_VALIDATION_COMPLETE"||prior.diagnosticOnly!==true)throw new Error("R21334_R21333_STATUS_INVALID");
  if(prior.approvedR1ReferenceRequirement!==R21334_REFERENCE_OBSERVATIONS||prior.referenceRequirementChanged!==false)throw new Error("R21334_REFERENCE_CONTRACT_MISMATCH");
  if(prior.diagnosticWindow!==252||JSON.stringify(prior.horizons)!==JSON.stringify(R21334_HORIZONS))throw new Error("R21334_WINDOW_CONTRACT_MISMATCH");
  if(prior.providerCalls!==0||prior.publicMutation!==false||prior.d1Mutation!==false||prior.productionFormulaChanged!==false||prior.weightsChanged!==false||prior.normalizationChanged!==false||prior.schedulerChanged!==false)throw new Error("R21334_SOURCE_MUTATION_CONTRACT_MISMATCH");
  for(const id of R21334_MODELS)if(!prior.models?.[id])throw new Error(`R21334_MODEL_MISSING:${id}`);for(const id of R21334_MODELS)if(Object.keys(prior.models[id]?.sectors??{}).length!==11)throw new Error(`R21334_SECTOR_COUNT_INVALID:${id}`);
  const nonOverlap60=analyzeR21334NonOverlap60(prior.models),sectorDeltas=decomposeR21334SectorDeltas(prior.models),crossSectionalSigns=analyzeR21334CrossSectionalSigns(prior.models),losoStability=analyzeR21334LosoStability(prior.models),synthesis=buildSynthesis(nonOverlap60,crossSectionalSigns,losoStability),generatedAt=(now instanceof Date?now:new Date(now)).toISOString();
  const report={version:"R2.13.34-ECONOMIC-ROBUSTNESS",generatedAt,status:"SHADOW_R21334_ECONOMIC_ROBUSTNESS_COMPLETE",mode:"LOCAL_READ_ONLY_R21333_ROBUSTNESS_DIAGNOSTIC",sourceFile:SOURCE_FILE,sourceStatus:prior.status,providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,sourceFilesMutated:false,candidateSelected:false,optionsReplacementSelected:false,optionsEquivalenceClaimed:false,selectionThresholdIntroduced:false,diagnosticOnly:true,diagnosticWindow:252,horizons:R21334_HORIZONS,interpretationPolicy:"DELTA_AND_STABILITY_ONLY_NO_GOOD_BAD_IC_DIRECTION_ASSUMED",nonOverlap60,sectorDeltas,crossSectionalSigns,losoStability,synthesis,next:"REVIEW_R21334_BEFORE_ANY_SIXTH_AXIS_OR_OPTIONS_REPLACEMENT_JUDGMENT"};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.34 ECONOMIC ROBUSTNESS",`generatedAt=${generatedAt}`,`status=${report.status}`,`sourceStatus=${report.sourceStatus}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED) normalizationChanged=false weightsChanged=false referenceWindowChanged=false","candidateSelected=false optionsReplacementSelected=false optionsEquivalenceClaimed=false selectionThresholdIntroduced=false diagnosticOnly=true",`interpretationPolicy=${report.interpretationPolicy}`,"","60D NON-OVERLAP DISCRETENESS","MODEL | METRIC | ELIG_BUCKETS | PAIRS_MIN | PAIRS_MED | PAIRS_MAX | N3_OR_N4_SHARE | EXACT_-0.5_BUCKETS | SECTOR_MED_-0.5 | AGG_MED_IC | CLASS"];
  for(const modelId of R21334_MODELS)for(const metric of ["return","drawdown"]){const x=nonOverlap60[modelId][metric];lines.push(`${modelId} | ${metric} | ${x.totalEligibleBuckets} | ${x.minPairs} | ${x.medianPairs??"NA"} | ${x.maxPairs} | ${x.threeOrFourShare??"NA"} | ${x.exactMinusHalfBuckets} | ${x.sectorMedianMinusHalfCount}/${x.sectors} | ${x.aggregateMedianIC??"NA"} | ${x.classification}`);}
  lines.push("","CROSS-SECTIONAL SIGN AUDIT","TYPE | H | METRIC | FIVE_IC | SIX_IC | DELTA | SIGN_PRESERVED");for(const type of Object.keys(R21334_MODEL_PAIRS))for(const h of R21334_HORIZONS)for(const metric of ["return","drawdown"]){const x=crossSectionalSigns[type][h][metric];lines.push(`${type} | ${h} | ${metric} | ${x.fiveMedianIC??"NA"} | ${x.sixMedianIC??"NA"} | ${x.delta??"NA"} | ${x.signPreserved}`);}
  lines.push("","LOSO STABILITY","TYPE | H | METRIC | FIVE_MAX_ABS_DELTA | SIX_MAX_ABS_DELTA | DELTA | SIX_LESS_SECTOR_SENSITIVE");for(const type of Object.keys(R21334_MODEL_PAIRS))for(const h of R21334_HORIZONS)for(const metric of ["return","drawdown"]){const x=losoStability[type][h][metric];lines.push(`${type} | ${h} | ${metric} | ${x.fiveMaxAbsDelta??"NA"} | ${x.sixMaxAbsDelta??"NA"} | ${x.deltaMaxAbs??"NA"} | ${x.sixLessSectorSensitive}`);}
  lines.push("","SECTOR TIME-SERIES FIVE-TO-SIX DELTAS","TYPE | SECTOR | RET5 | RET20 | RET60 | DD5 | DD20 | DD60");for(const type of Object.keys(R21334_MODEL_PAIRS))for(const row of sectorDeltas[type].sectorDetail){const v=(h,m)=>row.horizons[h][m].timeSeriesDelta??"NA";lines.push(`${type} | ${row.sectorId} | ${v(5,"return")} | ${v(20,"return")} | ${v(60,"return")} | ${v(5,"drawdown")} | ${v(20,"drawdown")} | ${v(60,"drawdown")}`);}
  lines.push("",`all60NonOverlapSmallNDiscrete=${synthesis.all60NonOverlapSmallNDiscrete}`,`sixtyDayNonOverlapSuitableForSelection=${synthesis.sixtyDayNonOverlapSuitableForSelection}`,`crossSectionalSignFlips=${synthesis.crossSectionalSignFlips}/${synthesis.crossSectionalCells}`,`losoImproved=${synthesis.losoImproved} losoWorsened=${synthesis.losoWorsened} losoEqual=${synthesis.losoEqual}`,`judgment=${synthesis.judgment}`,`reasonCodes=${synthesis.reasonCodes.join(",")}`,"note=60D_NON_OVERLAP_IS_DIAGNOSED_FROM_THE_STORED_R21333_BUCKET_PAIR_COUNTS_AND_RHO_DISTRIBUTIONS","note=FIVE_TO_SIX_SECTOR_DELTAS_ARE_REPORTED_WITHOUT_ASSIGNING_AN_UNAPPROVED_GOOD_BAD_IC_DIRECTION","note=LOSO_LOWER_MAX_ABS_DELTA_MEANS_LESS_SINGLE_SECTOR_SENSITIVITY_ONLY_AND_DOES_NOT_AUTHORIZE_MODEL_SELECTION","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_SCHEMA_SCHEDULER_OR_PRODUCTION_CHANGE","note=RESULTS_REMAIN_DIAGNOSTIC_ONLY_AND_DO_NOT_SELECT_A_SIXTH_AXIS_OR_AUTHORIZE_OPTIONS_REPLACEMENT",`next=${report.next}`);
  const jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`);saveJson(jsonFile,report);saveText(txtFile,lines.join("\n")+"\n");return {...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21334();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,referenceRequirementChanged:r.referenceRequirementChanged,synthesis:r.synthesis,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
