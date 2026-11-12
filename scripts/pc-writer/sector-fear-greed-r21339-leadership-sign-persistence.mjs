import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const DEFAULT_BASE=path.join(os.homedir(),".zgmini","pc-writer");
const SOURCE_FILE="local-sector-fear-greed-r21338-remaining-feature-orthogonal-validation.json";
const OUT="local-sector-fear-greed-r21339-leadership-sign-persistence";

export const R21339_FEATURE="speculativeLeadership";
export const R21339_HORIZONS=Object.freeze([5,20,60]);
export const R21339_REFERENCE_OBSERVATIONS=756;
export const R21339_WINDOW=252;
export const R21339_BLOCK_SIZE=21;
export const R21339_BLOCKS=12;
export const R21339_EXPECTED_IC_DIRECTION="NEGATIVE";

const finite=x=>typeof x==="number"&&Number.isFinite(x);
const validDate=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const round=x=>finite(x)?Math.round(x*10000)/10000:null;
const median=values=>{const a=(Array.isArray(values)?values:[]).filter(finite).sort((x,y)=>x-y);if(!a.length)return null;const p=(a.length-1)/2,l=Math.floor(p),h=Math.ceil(p);return l===h?a[l]:(a[l]+a[h])/2;};
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch{return null;}}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+"\n");fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}

export function splitR21339Blocks(dates=[]){
  const unique=[...new Set((Array.isArray(dates)?dates:[]).filter(validDate))].sort();
  if(unique.length!==R21339_WINDOW)return [];
  return Array.from({length:R21339_BLOCKS},(_,i)=>({block:i+1,dates:unique.slice(i*R21339_BLOCK_SIZE,(i+1)*R21339_BLOCK_SIZE)}));
}

function signed(value){return !finite(value)?"NA":value<0?"NEGATIVE":value>0?"POSITIVE":"ZERO";}
function longestRun(values=[],target="NEGATIVE"){let best=0,current=0;for(const value of values){if(signed(value)===target){current++;best=Math.max(best,current);}else current=0;}return best;}

export function summarizeR21339Series(dateRows=[],blocks=[]){
  const byDate=new Map((Array.isArray(dateRows)?dateRows:[]).filter(r=>validDate(r?.date)&&finite(r?.partialIcVsFiveRaw)).map(r=>[r.date,r.partialIcVsFiveRaw]));
  const fullValues=[...byDate.values()],fullMedian=round(median(fullValues));
  const blockDetail=[];
  for(const block of blocks){const values=block.dates.map(d=>byDate.get(d)).filter(finite),m=round(median(values));blockDetail.push({block:block.block,firstDate:block.dates[0]??null,lastDate:block.dates.at(-1)??null,dates:block.dates.length,eligibleDates:values.length,medianPartialIc:m,sign:signed(m)});}
  const loo=[];
  for(const block of blocks){const omitted=new Set(block.dates),values=[...byDate.entries()].filter(([date])=>!omitted.has(date)).map(([,value])=>value).filter(finite),m=round(median(values));loo.push({omittedBlock:block.block,eligibleDates:values.length,medianPartialIc:m,sign:signed(m)});}
  const blockMedians=blockDetail.map(x=>x.medianPartialIc).filter(finite),looMedians=loo.map(x=>x.medianPartialIc).filter(finite);
  return {
    eligibleDates:fullValues.length,
    fullMedianPartialIc:fullMedian,
    fullSign:signed(fullMedian),
    blockSummary:{blocks:blockDetail.length,negative:blockMedians.filter(x=>x<0).length,positive:blockMedians.filter(x=>x>0).length,zero:blockMedians.filter(x=>x===0).length,unavailable:blockDetail.filter(x=>!finite(x.medianPartialIc)).length,longestNegativeRun:longestRun(blockMedians,"NEGATIVE"),longestPositiveRun:longestRun(blockMedians,"POSITIVE")},
    blockDetail,
    leaveOneBlockOut:{runs:loo.length,negative:looMedians.filter(x=>x<0).length,positive:looMedians.filter(x=>x>0).length,zero:looMedians.filter(x=>x===0).length,min:round(looMedians.length?Math.min(...looMedians):null),max:round(looMedians.length?Math.max(...looMedians):null),detail:loo}
  };
}

function referenceDatesR21339(leadership={}){
  const fitDates=[...new Set((Array.isArray(leadership?.fitByDate)?leadership.fitByDate:[]).map(r=>r?.date).filter(validDate))].sort();
  if(fitDates.length!==R21339_WINDOW)throw new Error(`R21339_REFERENCE_DATES_NOT_252:${fitDates.length}`);
  return fitDates;
}

export function analyzeR21339Leadership(source={}){
  const leadership=source?.featureResults?.[R21339_FEATURE];
  if(!leadership)throw new Error("R21339_LEADERSHIP_RESULT_MISSING");
  const referenceDates=referenceDatesR21339(leadership),referenceSet=new Set(referenceDates),blocks=splitR21339Blocks(referenceDates);
  if(blocks.length!==R21339_BLOCKS)throw new Error(`R21339_BLOCK_CONTRACT_INVALID:${blocks.length}`);
  const cells={},blockMatrix=Object.fromEntries(blocks.map(b=>[b.block,{block:b.block,firstDate:b.dates[0],lastDate:b.dates.at(-1),negativeCells:0,positiveCells:0,zeroCells:0,unavailableCells:0}]));
  let fullNegativeCells=0,fullPositiveCells=0,blockMajorityNegativeCells=0,looAllNegativeCells=0;
  for(const h of R21339_HORIZONS){cells[h]={};for(const metric of ["return","drawdown"]){const rows=leadership?.crossSectional?.detail?.[h]?.[metric]??[];if(rows.some(r=>validDate(r?.date)&&!referenceSet.has(r.date)))throw new Error(`R21339_OUTCOME_DATE_OUTSIDE_REFERENCE:${h}:${metric}`);const x=summarizeR21339Series(rows,blocks);cells[h][metric]=x;if(x.fullMedianPartialIc<0)fullNegativeCells++;else if(x.fullMedianPartialIc>0)fullPositiveCells++;if(x.blockSummary.negative>x.blockSummary.positive)blockMajorityNegativeCells++;if(x.leaveOneBlockOut.negative===R21339_BLOCKS)looAllNegativeCells++;for(const row of x.blockDetail){const target=blockMatrix[row.block];if(row.sign==="NEGATIVE")target.negativeCells++;else if(row.sign==="POSITIVE")target.positiveCells++;else if(row.sign==="ZERO")target.zeroCells++;else target.unavailableCells++;}}}
  return {dates:referenceDates,blocks,cells,blockMatrix:Object.values(blockMatrix),synthesis:{expectedIcDirection:R21339_EXPECTED_IC_DIRECTION,fullNegativeCells,fullPositiveCells,blockMajorityNegativeCells,leaveOneBlockOutAllNegativeCells:looAllNegativeCells,judgment:"NO_SELECTION_DIAGNOSTIC_ONLY"}};
}

export function runR21339(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
  const file=path.join(base,SOURCE_FILE);if(!fs.existsSync(file))throw new Error(`R21339_INPUT_MISSING:${SOURCE_FILE}`);const source=safeJson(file);if(!source)throw new Error("R21339_INPUT_INVALID_JSON");
  if(source.status!=="SHADOW_R21338_REMAINING_FEATURE_ORTHOGONAL_VALIDATION_COMPLETE"||source.diagnosticOnly!==true)throw new Error("R21339_R21338_NOT_READY");
  if(source.approvedR1ReferenceRequirement!==R21339_REFERENCE_OBSERVATIONS||source.referenceRequirementChanged!==false||source.weightsChanged!==false||source.normalizationChanged!==false||source.referenceWindowChanged!==false||source.productionFormulaChanged!==false||source.providerCalls!==0||source.publicMutation!==false||source.d1Mutation!==false||source.schedulerChanged!==false)throw new Error("R21339_SOURCE_CONTRACT_MISMATCH");
  if(source.candidateSelected!==false||source.optionsReplacementSelected!==false)throw new Error("R21339_SOURCE_SELECTION_CONTRACT_MISMATCH");
  const leadership=source?.featureResults?.[R21339_FEATURE];if(!leadership||leadership?.synthesis?.crossSectionalPartialNegativeCells!==4||leadership?.synthesis?.crossSectionalPartialPositiveCells!==2)throw new Error("R21339_LEADERSHIP_EVIDENCE_UNEXPECTED");
  const analysis=analyzeR21339Leadership(source),generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:"R2.13.39-LEADERSHIP-SIGN-PERSISTENCE",generatedAt,status:"SHADOW_R21339_LEADERSHIP_SIGN_PERSISTENCE_COMPLETE",mode:"LOCAL_READ_ONLY_LEADERSHIP_SIGN_PERSISTENCE",sourceStatus:source.status,providerCalls:0,rawRowsStored:false,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,sourceFilesMutated:false,candidateSelected:false,optionsReplacementSelected:false,selectionThresholdIntroduced:false,diagnosticOnly:true,diagnosticWindow:R21339_WINDOW,blockSize:R21339_BLOCK_SIZE,blocks:R21339_BLOCKS,feature:R21339_FEATURE,expectedIcDirection:R21339_EXPECTED_IC_DIRECTION,interpretationPolicy:"SIGN_PERSISTENCE_ONLY_NO_COMPOSITE_WEIGHT_OR_CANDIDATE_SELECTION",...analysis,next:"REVIEW_R21339_SIGN_PERSISTENCE_BEFORE_ANY_NEW_SOURCE_OR_CANDIDATE_DESIGN"};
  const lines=["ZGMINI SECTOR FEAR & GREED R2.13.39 LEADERSHIP SIGN PERSISTENCE",`generatedAt=${generatedAt}`,`status=${report.status}`,`sourceStatus=${report.sourceStatus}`,"providerCalls=0 rawRowsStored=false publicMutation=false d1Mutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false","approvedR1ReferenceRequirement=756 (UNCHANGED) normalizationChanged=false weightsChanged=false referenceWindowChanged=false","candidateSelected=false optionsReplacementSelected=false selectionThresholdIntroduced=false diagnosticOnly=true",`feature=${R21339_FEATURE}`,`expectedIcDirection=${R21339_EXPECTED_IC_DIRECTION}`,`blockSize=${R21339_BLOCK_SIZE} blocks=${R21339_BLOCKS}`,"note=REFERENCE_BLOCKS_USE_ALL_252_FEATURE_DATES_WHILE_FORWARD_OUTCOME_CELLS_CAN_HAVE_FEWER_ELIGIBLE_DATES","","CELL SIGN PERSISTENCE","H | METRIC | ELIGIBLE_DATES | FULL_MEDIAN | FULL_SIGN | BLOCK_NEG/POS/NA | LONGEST_NEG | LOO_NEG/POS | LOO_MIN | LOO_MAX"];
  for(const h of R21339_HORIZONS)for(const metric of ["return","drawdown"]){const x=analysis.cells[h][metric];lines.push(`${h} | ${metric} | ${x.eligibleDates} | ${x.fullMedianPartialIc??"NA"} | ${x.fullSign} | ${x.blockSummary.negative}/${x.blockSummary.positive}/${x.blockSummary.unavailable} | ${x.blockSummary.longestNegativeRun} | ${x.leaveOneBlockOut.negative}/${x.leaveOneBlockOut.positive} | ${x.leaveOneBlockOut.min??"NA"} | ${x.leaveOneBlockOut.max??"NA"}`);}
  lines.push("","21-SESSION BLOCK MATRIX","BLOCK | FIRST | LAST | NEG_CELLS | POS_CELLS | ZERO_CELLS | NA_CELLS");for(const b of analysis.blockMatrix)lines.push(`${b.block} | ${b.firstDate} | ${b.lastDate} | ${b.negativeCells} | ${b.positiveCells} | ${b.zeroCells} | ${b.unavailableCells}`);
  lines.push("",`fullNegativeCells=${analysis.synthesis.fullNegativeCells} fullPositiveCells=${analysis.synthesis.fullPositiveCells}`,`blockMajorityNegativeCells=${analysis.synthesis.blockMajorityNegativeCells}`,`leaveOneBlockOutAllNegativeCells=${analysis.synthesis.leaveOneBlockOutAllNegativeCells}`,`judgment=${analysis.synthesis.judgment}`,"note=R21339_USES_ONLY_STORED_R21338_DAILY_PARTIAL_IC_EVIDENCE","note=21_SESSION_BLOCKS_ARE_DIAGNOSTIC_TIME_SLICES_NOT_A_REFERENCE_WINDOW_CHANGE","note=NO_PROVIDER_NO_PUBLICATION_NO_FORMULA_WEIGHT_REFERENCE_SCHEMA_SCHEDULER_OR_PRODUCTION_CHANGE","note=RESULTS_DO_NOT_SELECT_A_CANDIDATE_OR_AUTHORIZE_OPTIONS_REPLACEMENT",`next=${report.next}`);
  const jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`);saveJson(jsonFile,report);saveText(txtFile,lines.join("\n")+"\n");return {...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21339();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,publicMutation:r.publicMutation,productionFormulaChanged:r.productionFormulaChanged,referenceRequirementChanged:r.referenceRequirementChanged,synthesis:r.synthesis,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
