import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const DEFAULT_BASE=path.join(os.homedir(),'.zgmini','pc-writer');
const SOURCE42='local-sector-fear-greed-r21342-tail-correlation-screen.json';
const SOURCE43='local-sector-fear-greed-r21343-internal-correlation-sign-persistence.json';
const SOURCE44='local-sector-fear-greed-r21344-internal-correlation-incremental-robustness.json';
const OUT='local-sector-fear-greed-r21352-frozen-historical-robustness';

export const R21352_FEATURE='internalCorrelationShock';
export const R21352_HORIZONS=Object.freeze([5,20,60]);
export const R21352_METRICS=Object.freeze(['return','drawdown']);
export const R21352_REFERENCE_OBSERVATIONS=756;
export const R21352_EXPECTED_IC_DIRECTION='NEGATIVE';
export const R21352_BLOCK_SIZE=21;
export const R21352_ALPHA=.05;
export const R21352_MIN_PURGED_FOLD_OBS=21;

const finite=x=>typeof x==='number'&&Number.isFinite(x);
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(`${x}T00:00:00Z`));
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const median=a=>{const v=(Array.isArray(a)?a:[]).filter(finite).sort((x,y)=>x-y);if(!v.length)return null;const p=(v.length-1)/2,l=Math.floor(p),h=Math.ceil(p);return l===h?v[l]:(v[l]+v[h])/2;};
const round=x=>finite(x)?Math.round(x*1000000)/1000000:null;
function safeJson(file){if(!fs.existsSync(file))return null;try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
function saveJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n');fs.renameSync(tmp,file);}
function saveText(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(tmp,value);fs.renameSync(tmp,file);}

function erf(x){const sign=x<0?-1:1,a=Math.abs(x),t=1/(1+.3275911*a);const y=1-(((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t)*Math.exp(-a*a);return sign*y;}
function normalCdf(x){return .5*(1+erf(x/Math.SQRT2));}

export function neweyWestMeanR21352(values=[],lag=1){
 const x=(Array.isArray(values)?values:[]).filter(finite),n=x.length;if(n<3)return {n,lag:0,mean:round(mean(x)),se:null,t:null,pOneSidedNegative:null};
 const m=mean(x),L=Math.max(0,Math.min(Math.floor(lag),n-2));let omega=0;
 for(let t=0;t<n;t++)omega+=(x[t]-m)**2;omega/=n;
 for(let l=1;l<=L;l++){let gamma=0;for(let t=l;t<n;t++)gamma+=(x[t]-m)*(x[t-l]-m);gamma/=n;const w=1-l/(L+1);omega+=2*w*gamma;}
 const variance=Math.max(0,omega/n),se=Math.sqrt(variance),stat=se>0?m/se:null,p=finite(stat)?normalCdf(stat):null;
 return {n,lag:L,mean:round(m),se:round(se),t:round(stat),pOneSidedNegative:round(p)};
}

export function exactBlockSignFlipR21352(values=[],block=R21352_BLOCK_SIZE){
 const x=(Array.isArray(values)?values:[]).filter(finite);if(!x.length)return {n:0,block,blocks:0,assignments:0,observedMedian:null,pOneSidedNegative:null};
 const blocks=[];for(let i=0;i<x.length;i+=block)blocks.push(x.slice(i,i+block));
 if(blocks.length>20)throw new Error('R21352_TOO_MANY_EXACT_SIGN_BLOCKS');
 const observed=median(x),assignments=2**blocks.length;let le=0;
 for(let mask=0;mask<assignments;mask++){const sample=[];for(let b=0;b<blocks.length;b++){const sign=(mask>>b)&1?-1:1;for(const v of blocks[b])sample.push(sign*v);}if(median(sample)<=observed)le++;}
 return {n:x.length,block,blocks:blocks.length,assignments,observedMedian:round(observed),pOneSidedNegative:round(le/assignments)};
}

export function purgedTimeFoldsR21352(rows=[],horizon,{minObs=R21352_MIN_PURGED_FOLD_OBS}={}){
 const data=(Array.isArray(rows)?rows:[]).filter(r=>validDate(r?.date)&&finite(r?.partialIcVsFiveRaw)).sort((a,b)=>a.date.localeCompare(b.date));
 let folds=4;while(folds>=2){const base=Math.floor(data.length/folds);if(base-horizon>=minObs)break;folds--;}
 if(folds<2)return {folds:0,horizon,detail:[],negative:0,positive:0,zero:0};
 const detail=[];for(let i=0;i<folds;i++){const start=Math.floor(i*data.length/folds),end=Math.floor((i+1)*data.length/folds),block=data.slice(start,end),kept=block.slice(0,Math.max(0,block.length-horizon)),m=median(kept.map(r=>r.partialIcVsFiveRaw));detail.push({fold:i+1,firstDate:kept[0]?.date??null,lastDate:kept.at(-1)?.date??null,rawDates:block.length,purgedTail:horizon,eligible:kept.length,medianPartialIc:round(m),sign:!finite(m)?'NA':m<0?'NEGATIVE':m>0?'POSITIVE':'ZERO'});}
 return {folds,horizon,detail,negative:detail.filter(x=>x.sign==='NEGATIVE').length,positive:detail.filter(x=>x.sign==='POSITIVE').length,zero:detail.filter(x=>x.sign==='ZERO').length};
}

export function holmAdjustR21352(items=[]){
 const valid=items.filter(x=>finite(x?.p)).map(x=>({...x,p:Math.max(0,Math.min(1,x.p))})).sort((a,b)=>a.p-b.p),m=valid.length,out=[];let prev=0;
 for(let i=0;i<m;i++){const adj=Math.max(prev,Math.min(1,(m-i)*valid[i].p));prev=adj;out.push({...valid[i],adjusted:round(adj)});}return out;
}

function extractSeries(source,h,metric){return (source?.featureResults?.[R21352_FEATURE]?.crossSectional?.detail?.[h]?.[metric]??[]).filter(r=>validDate(r?.date)&&finite(r?.partialIcVsFiveRaw)).sort((a,b)=>a.date.localeCompare(b.date));}

export function analyzeR21352(source42,source43,source44){
 if(source42?.status!=='SHADOW_R21342_TAIL_CORRELATION_SCREEN_COMPLETE')throw new Error('R21352_R21342_NOT_READY');
 if(source42?.featureResults?.[R21352_FEATURE]?.status!=='READY_252')throw new Error('R21352_FEATURE_NOT_READY');
 if(source42?.approvedR1ReferenceRequirement!==R21352_REFERENCE_OBSERVATIONS||source42?.normalizationChanged!==false||source42?.weightsChanged!==false||source42?.referenceWindowChanged!==false||source42?.candidateSelected!==false||source42?.optionsReplacementSelected!==false)throw new Error('R21352_R21342_CONTRACT_MISMATCH');
 if(source43?.status!=='SHADOW_R21343_INTERNAL_CORRELATION_SIGN_PERSISTENCE_COMPLETE'||source43?.feature!==R21352_FEATURE)throw new Error('R21352_R21343_NOT_READY');
 if(source44?.status!=='SHADOW_R21344_INTERNAL_CORRELATION_INCREMENTAL_ROBUSTNESS_COMPLETE'||source44?.feature!==R21352_FEATURE)throw new Error('R21352_R21344_NOT_READY');
 const cells={},hacFamily=[],signFamily=[];
 for(const h of R21352_HORIZONS){cells[h]={};for(const metric of R21352_METRICS){const rows=extractSeries(source42,h,metric),values=rows.map(r=>r.partialIcVsFiveRaw),nw=neweyWestMeanR21352(values,Math.min(h,Math.floor(Math.max(1,values.length/4)))),signFlip=exactBlockSignFlipR21352(values),purged=purgedTimeFoldsR21352(rows,h);const fullMedian=round(median(values));cells[h][metric]={eligibleDates:values.length,fullMedian,fullMean:round(mean(values)),neweyWest:nw,blockSignFlip:signFlip,purgedTimeFolds:purged};hacFamily.push({key:`${h}:${metric}`,p:nw.pOneSidedNegative});signFamily.push({key:`${h}:${metric}`,p:signFlip.pOneSidedNegative});}}
 const hacAdj=Object.fromEntries(holmAdjustR21352(hacFamily).map(x=>[x.key,x.adjusted])),signAdj=Object.fromEntries(holmAdjustR21352(signFamily).map(x=>[x.key,x.adjusted]));
 let drawdownStrong=0,returnStrong=0;
 for(const h of R21352_HORIZONS)for(const metric of R21352_METRICS){const c=cells[h][metric],key=`${h}:${metric}`;c.holm={hacP:hacAdj[key]??null,blockSignFlipP:signAdj[key]??null,family:'SIX_ORIGINAL_OUTCOME_CELLS'};const foldMajority=c.purgedTimeFolds.negative>c.purgedTimeFolds.positive;c.directionallyStrong=c.fullMedian<0&&foldMajority&&finite(c.holm.hacP)&&c.holm.hacP<=R21352_ALPHA&&finite(c.holm.blockSignFlipP)&&c.holm.blockSignFlipP<=R21352_ALPHA;if(c.directionallyStrong){if(metric==='drawdown')drawdownStrong++;else returnStrong++;}}
 const priorDrawdownPersistence=source43?.synthesis?.drawdownFullNegativeCells??null,priorVolatilityControlled={};for(const h of R21352_HORIZONS)priorVolatilityControlled[h]=source44?.volatilityControlledDrawdown?.crossSectional?.[h]?.summary?.median??null;
 const judgment=drawdownStrong>=2&&returnStrong===0?'DOWNSIDE_RISK_SPECIFIC_STATISTICAL_SUPPORT':drawdownStrong>=2?'MIXED_GENERAL_SUPPORT':'ROBUSTNESS_INCONCLUSIVE';
 return {cells,multiplicity:{method:'HOLM_BONFERRONI',alpha:R21352_ALPHA,family:'SIX_ORIGINAL_RETURN_DRAWDOWN_CELLS',historicalCandidateFamilyCorrectionComplete:false,note:'FULL_SCREEN_WIDE_CANDIDATE_COUNT_NOT_REGISTERED_IN_STORED_OUTPUTS'},priorEvidence:{r21343DrawdownFullNegativeCells:priorDrawdownPersistence,r21344VolatilityControlledXsMedian:priorVolatilityControlled},synthesis:{expectedIcDirection:R21352_EXPECTED_IC_DIRECTION,drawdownStrongCells:drawdownStrong,returnStrongCells:returnStrong,judgment,candidateSelected:false,optionsReplacementSelected:false}};
}

export function runR21352(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
 const s42=safeJson(path.join(base,SOURCE42)),s43=safeJson(path.join(base,SOURCE43)),s44=safeJson(path.join(base,SOURCE44));if(!s42)throw new Error(`R21352_INPUT_MISSING:${SOURCE42}`);if(!s43)throw new Error(`R21352_INPUT_MISSING:${SOURCE43}`);if(!s44)throw new Error(`R21352_INPUT_MISSING:${SOURCE44}`);
 const analysis=analyzeR21352(s42,s43,s44),generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:'R2.13.52-FROZEN-HISTORICAL-ROBUSTNESS',generatedAt,status:'SHADOW_R21352_FROZEN_HISTORICAL_ROBUSTNESS_COMPLETE',mode:'LOCAL_STORED_DATA_ONLY_NO_FUTURE_DEPENDENCY',feature:R21352_FEATURE,providerCalls:0,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,retuning:false,candidateSelected:false,optionsReplacementSelected:false,diagnosticOnly:true,...analysis,next:'REVIEW_R21352_EXISTING_DATA_EVIDENCE_ONLY'};
 const lines=['ZGMINI SECTOR FEAR & GREED R2.13.52 FROZEN HISTORICAL ROBUSTNESS',`generatedAt=${generatedAt}`,`status=${report.status}`,'mode=LOCAL_STORED_DATA_ONLY_NO_FUTURE_DEPENDENCY','providerCalls=0 publicMutation=false d1Mutation=false dbSchemaChanged=false productionFormulaChanged=false schedulerChanged=false','approvedR1ReferenceRequirement=756 normalizationChanged=false weightsChanged=false referenceWindowChanged=false retuning=false','candidateSelected=false optionsReplacementSelected=false diagnosticOnly=true',`feature=${R21352_FEATURE}`,`expectedIcDirection=${R21352_EXPECTED_IC_DIRECTION}`,'','H | METRIC | N | MEDIAN | HAC_MEAN | HAC_T | HAC_P | HOLM_HAC | SIGNFLIP_P | HOLM_SIGN | PURGED_NEG/POS | STRONG'];
 for(const h of R21352_HORIZONS)for(const metric of R21352_METRICS){const c=analysis.cells[h][metric];lines.push(`${h} | ${metric} | ${c.eligibleDates} | ${c.fullMedian??'NA'} | ${c.neweyWest.mean??'NA'} | ${c.neweyWest.t??'NA'} | ${c.neweyWest.pOneSidedNegative??'NA'} | ${c.holm.hacP??'NA'} | ${c.blockSignFlip.pOneSidedNegative??'NA'} | ${c.holm.blockSignFlipP??'NA'} | ${c.purgedTimeFolds.negative}/${c.purgedTimeFolds.positive} | ${c.directionallyStrong?'YES':'NO'}`);}
 lines.push('',`drawdownStrongCells=${analysis.synthesis.drawdownStrongCells}/3`,`returnStrongCells=${analysis.synthesis.returnStrongCells}/3`,`judgment=${analysis.synthesis.judgment}`,`r21343DrawdownFullNegativeCells=${analysis.priorEvidence.r21343DrawdownFullNegativeCells??'NA'}`,`r21344VolatilityControlledXs5=${analysis.priorEvidence.r21344VolatilityControlledXsMedian[5]??'NA'} r21344VolatilityControlledXs20=${analysis.priorEvidence.r21344VolatilityControlledXsMedian[20]??'NA'} r21344VolatilityControlledXs60=${analysis.priorEvidence.r21344VolatilityControlledXsMedian[60]??'NA'}`,'note=HAC_USES_ONE_SIDED_NEGATIVE_TEST_WITH_LAG_CAPPED_AT_HORIZON','note=EXACT_21_SESSION_BLOCK_SIGN_FLIP_PRESERVES_WITHIN_BLOCK_DEPENDENCE_UNDER_SIGN_SYMMETRY_NULL','note=PURGED_TIME_FOLDS_DROP_HORIZON_TAIL_FROM_EACH_CONTIGUOUS_FOLD_TO_REDUCE_FORWARD_OVERLAP','note=HOLM_CORRECTION_COVERS_THE_SIX_ORIGINAL_RETURN_DRAWDOWN_OUTCOME_CELLS','note=FULL_SCREEN_WIDE_MULTIPLE_TESTING_CANNOT_BE_EXACTLY_CORRECTED_WITHOUT_A_REGISTERED_TOTAL_CANDIDATE_FAMILY_COUNT','note=NO_PROVIDER_NO_PUBLICATION_NO_RETUNING_NO_FORMULA_WEIGHT_REFERENCE_SCHEMA_SCHEDULER_OR_PRODUCTION_CHANGE',`next=${report.next}`);
 const jsonFile=path.join(base,`${OUT}.json`),txtFile=path.join(base,`${OUT}.txt`);saveJson(jsonFile,report);saveText(txtFile,lines.join('\n')+'\n');return {...report,jsonFile,txtFile};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21352();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,synthesis:r.synthesis,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
