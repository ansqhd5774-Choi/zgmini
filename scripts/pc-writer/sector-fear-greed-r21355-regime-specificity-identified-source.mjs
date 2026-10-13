import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {collectAnchoredSpyRowsR21354,normalizeSpyRowsR21354} from './sector-fear-greed-r21354-spy-source-overlap-inventory.mjs';
import {buildRegimesR21353,regimeSummaryR21353,pairedSpecificityR21353} from './sector-fear-greed-r21353-regime-sector-specificity.mjs';

const DEFAULT_BASE=path.join(os.homedir(),'.zgmini','pc-writer');
const F42='local-sector-fear-greed-r21342-tail-correlation-screen.json';
const F52='local-sector-fear-greed-r21352-frozen-historical-robustness.json';
const F54='local-sector-fear-greed-r21354-spy-source-overlap-inventory.json';
const SPY_SOURCE='local-sector-fear-greed-r1-iex-price-history.json';
const OUT='local-sector-fear-greed-r21355-regime-specificity-identified-source';
export const R21355_FEATURE='internalCorrelationShock';
export const R21355_HORIZONS=Object.freeze([5,20,60]);
export const R21355_REFERENCE_OBSERVATIONS=756;
export const R21355_EXPECTED_DIRECTION='NEGATIVE';
export const R21355_SPY_SOURCE=SPY_SOURCE;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const round=x=>finite(x)?Math.round(x*1e6)/1e6:null;
function safeJson(f){if(!fs.existsSync(f))return null;try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return null;}}
function saveJson(f,v){fs.mkdirSync(path.dirname(f),{recursive:true});const t=`${f}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(t,JSON.stringify(v,null,2)+'\n');fs.renameSync(t,f);}
function saveText(f,v){fs.mkdirSync(path.dirname(f),{recursive:true});const t=`${f}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(t,v);fs.renameSync(t,f);}

export function analyzeR21355(s42,s52,s54,spyRows){
 if(s42?.status!=='SHADOW_R21342_TAIL_CORRELATION_SCREEN_COMPLETE'||s42?.featureResults?.[R21355_FEATURE]?.status!=='READY_252')throw new Error('R21355_R21342_NOT_READY');
 if(s42?.approvedR1ReferenceRequirement!==R21355_REFERENCE_OBSERVATIONS||s42?.normalizationChanged!==false||s42?.weightsChanged!==false||s42?.referenceWindowChanged!==false)throw new Error('R21355_R21342_CONTRACT_MISMATCH');
 if(s52?.status!=='SHADOW_R21352_FROZEN_HISTORICAL_ROBUSTNESS_COMPLETE'||s52?.retuning!==false)throw new Error('R21355_R21352_NOT_READY');
 if(s54?.status!=='SHADOW_R21354_SPY_SOURCE_OVERLAP_INVENTORY_COMPLETE'||s54?.bestSource!==R21355_SPY_SOURCE||Number(s54?.bestTrailing63Eligible??0)<100)throw new Error('R21355_R21354_SOURCE_NOT_READY');
 const spy=normalizeSpyRowsR21354(spyRows).rows;if(spy.length<64)throw new Error(`R21355_SPY_HISTORY_TOO_SHORT:${spy.length}`);
 const feature=s42.featureResults[R21355_FEATURE];
 const dates=[...new Set(R21355_HORIZONS.flatMap(h=>(feature.crossSectional?.detail?.[h]?.drawdown??[]).map(x=>x.date)))].sort();
 const reg=buildRegimesR21353(spy,dates);if(reg.rows.length<100)throw new Error(`R21355_REGIME_COVERAGE_TOO_SMALL:${reg.rows.length}`);
 const horizons={};for(const h of R21355_HORIZONS){const ret=feature.crossSectional?.detail?.[h]?.return??[],dd=feature.crossSectional?.detail?.[h]?.drawdown??[],loso=feature.loso?.summary?.[h]?.drawdown??{};const regime=regimeSummaryR21353(dd,reg.rows),available=Object.values(regime).filter(x=>x.n>=10),negativeRegimes=available.filter(x=>finite(x.median)&&x.median<0).length;const full=Number(loso.full),min=Number(loso.min),max=Number(loso.max),maxAbsDelta=Number(loso.maxAbsDelta);horizons[h]={drawdownRegimes:regime,regimeAvailable:available.length,regimeNegative:negativeRegimes,loso:{full:finite(full)?round(full):null,min:finite(min)?round(min):null,max:finite(max)?round(max):null,maxAbsDelta:finite(maxAbsDelta)?round(maxAbsDelta):null,negativeRuns:loso.negativeRuns??null,positiveRuns:loso.positiveRuns??null,signStable:finite(min)&&finite(max)&&min<0&&max<0,relativeMaxDelta:finite(full)&&full!==0&&finite(maxAbsDelta)?round(Math.abs(maxAbsDelta/full)):null},specificity:pairedSpecificityR21353(ret,dd,h)};}
 const specificityStrong=R21355_HORIZONS.filter(h=>{const x=horizons[h].specificity;return finite(x?.medianDiffDrawdownMinusReturn)&&x.medianDiffDrawdownMinusReturn<0&&finite(x?.neweyWest?.pOneSidedNegative)&&x.neweyWest.pOneSidedNegative<=.05&&finite(x?.blockSignFlip?.pOneSidedNegative)&&x.blockSignFlip.pOneSidedNegative<=.05;}).length;
 const regimeBroad=R21355_HORIZONS.filter(h=>horizons[h].regimeAvailable>=3&&horizons[h].regimeNegative>=Math.ceil(horizons[h].regimeAvailable/2)).length;
 const losoStable=R21355_HORIZONS.filter(h=>horizons[h].loso.signStable===true).length;
 const judgment=specificityStrong>=2&&regimeBroad>=2&&losoStable>=2?'DOWNSIDE_RISK_SPECIFIC_SURVIVOR_NOT_GENERAL_AXIS':'INTERNAL_CORRELATION_RESEARCH_CANDIDATE_CLOSE';
 return {spy:{rows:spy.length,firstDate:spy[0]?.date??null,lastDate:spy.at(-1)?.date??null,regimeDates:reg.rows.length,volThreshold:reg.threshold,source:R21355_SPY_SOURCE},horizons,priorR21352:s52.synthesis,synthesis:{specificityStrongHorizons:specificityStrong,regimeBroadHorizons:regimeBroad,losoSignStableHorizons:losoStable,generalAxisEligible:false,judgment,candidateSelected:false,optionsReplacementSelected:false}};
}

export function runR21355(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
 const s42=safeJson(path.join(base,F42)),s52=safeJson(path.join(base,F52)),s54=safeJson(path.join(base,F54)),spyPayload=safeJson(path.join(base,SPY_SOURCE));
 if(!s42)throw new Error(`R21355_INPUT_MISSING:${F42}`);if(!s52)throw new Error(`R21355_INPUT_MISSING:${F52}`);if(!s54)throw new Error(`R21355_INPUT_MISSING:${F54}`);if(!spyPayload)throw new Error(`R21355_INPUT_MISSING:${SPY_SOURCE}`);
 const anchored=collectAnchoredSpyRowsR21354(spyPayload);if(!anchored.length)throw new Error('R21355_IDENTIFIED_SPY_SOURCE_EMPTY');
 const a=analyzeR21355(s42,s52,s54,anchored),generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:'R2.13.55-REGIME-SPECIFICITY-IDENTIFIED-SOURCE',generatedAt,status:'SHADOW_R21355_REGIME_SPECIFICITY_IDENTIFIED_SOURCE_COMPLETE',mode:'LOCAL_STORED_DATA_ONLY_NO_FUTURE_DEPENDENCY',feature:R21355_FEATURE,expectedDirection:R21355_EXPECTED_DIRECTION,providerCalls:0,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,retuning:false,candidateSelected:false,optionsReplacementSelected:false,diagnosticOnly:true,...a,next:'CLOSE_INTERNAL_CORRELATION_GENERAL_AXIS_RESEARCH_OR_RETAIN_AS_DOWNSIDE_ONLY_BASED_ON_R21355'};
 const lines=['ZGMINI SECTOR FEAR & GREED R2.13.55 REGIME + SPECIFICITY IDENTIFIED SOURCE',`generatedAt=${generatedAt}`,`status=${report.status}`,'mode=LOCAL_STORED_DATA_ONLY_NO_FUTURE_DEPENDENCY',`spySource=${a.spy.source} spyRows=${a.spy.rows} spyDates=${a.spy.firstDate}..${a.spy.lastDate} regimeDates=${a.spy.regimeDates} volThreshold=${a.spy.volThreshold}`,'providerCalls=0 publicMutation=false d1Mutation=false productionFormulaChanged=false schedulerChanged=false','approvedR1ReferenceRequirement=756 normalizationChanged=false weightsChanged=false referenceWindowChanged=false retuning=false','candidateSelected=false optionsReplacementSelected=false diagnosticOnly=true','','H | REGIME_NEG/AVAILABLE | LOSO_NEG/POS | LOSO_MIN | LOSO_MAX | REL_MAX_DELTA | DD_MINUS_RETURN | SPEC_HAC_P | SPEC_SIGN_P'];
 for(const h of R21355_HORIZONS){const x=a.horizons[h];lines.push(`${h} | ${x.regimeNegative}/${x.regimeAvailable} | ${x.loso.negativeRuns??'NA'}/${x.loso.positiveRuns??'NA'} | ${x.loso.min??'NA'} | ${x.loso.max??'NA'} | ${x.loso.relativeMaxDelta??'NA'} | ${x.specificity.medianDiffDrawdownMinusReturn??'NA'} | ${x.specificity.neweyWest.pOneSidedNegative??'NA'} | ${x.specificity.blockSignFlip.pOneSidedNegative??'NA'}`);for(const [k,v] of Object.entries(x.drawdownRegimes))lines.push(`  ${k} n=${v.n} median=${v.median??'NA'} neg/pos=${v.negative}/${v.positive}`);}
 lines.push('',`specificityStrongHorizons=${a.synthesis.specificityStrongHorizons}/3`,`regimeBroadHorizons=${a.synthesis.regimeBroadHorizons}/3`,`losoSignStableHorizons=${a.synthesis.losoSignStableHorizons}/3`,`generalAxisEligible=${a.synthesis.generalAxisEligible}`,`judgment=${a.synthesis.judgment}`,'note=SPY_SOURCE_FIXED_TO_R21354_IDENTIFIED_LOCAL_IEX_HISTORY','note=REGIMES_USE_SAME_DATE_SPY_TRAILING63_RETURN_AND_TRAILING20_REALIZED_VOLATILITY','note=REGIME_VOLATILITY_SPLIT_IS_DESCRIPTIVE_SAMPLE_MEDIAN_NOT_A_NEW_SIGNAL_THRESHOLD','note=NO_PROVIDER_NO_PUBLICATION_NO_RETUNING_NO_FORMULA_WEIGHT_REFERENCE_SCHEMA_SCHEDULER_OR_PRODUCTION_CHANGE',`next=${report.next}`);
 const jf=path.join(base,`${OUT}.json`),tf=path.join(base,`${OUT}.txt`);saveJson(jf,report);saveText(tf,lines.join('\n')+'\n');return {...report,jsonFile:jf,txtFile:tf};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21355();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,synthesis:r.synthesis,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
