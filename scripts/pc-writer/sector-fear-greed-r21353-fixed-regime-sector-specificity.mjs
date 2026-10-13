import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {R21353_FEATURE,R21353_HORIZONS,R21353_REFERENCE_OBSERVATIONS,R21353_EXPECTED_DIRECTION,normalizeSpyR21353,buildRegimesR21353,regimeSummaryR21353,pairedSpecificityR21353} from './sector-fear-greed-r21353-regime-sector-specificity.mjs';

const DEFAULT_BASE=path.join(os.homedir(),'.zgmini','pc-writer');
const F42='local-sector-fear-greed-r21342-tail-correlation-screen.json';
const F52='local-sector-fear-greed-r21352-frozen-historical-robustness.json';
const SPY_FILES=['local-sector-fear-greed-r21325-spy-history-backfill.json','local-sector-fear-greed-r21320-alpaca-benchmark-backfill.json','local-sector-fear-greed-r21322-spy-gap-backfill.json'];
const OUT='local-sector-fear-greed-r21353-fixed-regime-sector-specificity';
export const R21353_FIXED_MIN_SPY_ROWS=64;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const round=x=>finite(x)?Math.round(x*1e6)/1e6:null;
const safeJson=f=>{if(!fs.existsSync(f))return null;try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return null;}};
function saveJson(f,v){fs.mkdirSync(path.dirname(f),{recursive:true});const t=`${f}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(t,JSON.stringify(v,null,2)+'\n');fs.renameSync(t,f);}
function saveText(f,v){fs.mkdirSync(path.dirname(f),{recursive:true});const t=`${f}.tmp-${process.pid}-${Date.now()}`;fs.writeFileSync(t,v);fs.renameSync(t,f);}

export function analyzeR21353Fixed(s42,s52,spy){
 if(s42?.status!=='SHADOW_R21342_TAIL_CORRELATION_SCREEN_COMPLETE'||s42?.featureResults?.[R21353_FEATURE]?.status!=='READY_252')throw new Error('R21353_FIXED_R21342_NOT_READY');
 if(s42?.approvedR1ReferenceRequirement!==R21353_REFERENCE_OBSERVATIONS||s42?.normalizationChanged!==false||s42?.weightsChanged!==false||s42?.referenceWindowChanged!==false)throw new Error('R21353_FIXED_R21342_CONTRACT_MISMATCH');
 if(s52?.status!=='SHADOW_R21352_FROZEN_HISTORICAL_ROBUSTNESS_COMPLETE'||s52?.retuning!==false)throw new Error('R21353_FIXED_R21352_NOT_READY');
 if(!Array.isArray(spy)||spy.length<R21353_FIXED_MIN_SPY_ROWS)throw new Error(`R21353_FIXED_SPY_HISTORY_TOO_SHORT:${spy?.length??0}`);
 const feature=s42.featureResults[R21353_FEATURE],dates=[...new Set(R21353_HORIZONS.flatMap(h=>(feature.crossSectional?.detail?.[h]?.drawdown??[]).map(x=>x.date)))].sort(),reg=buildRegimesR21353(spy,dates);
 if(reg.rows.length<100)throw new Error(`R21353_FIXED_REGIME_COVERAGE_TOO_SMALL:${reg.rows.length}`);
 const horizons={};
 for(const h of R21353_HORIZONS){
  const ret=feature.crossSectional.detail[h].return??[],dd=feature.crossSectional.detail[h].drawdown??[],loso=feature.loso?.summary?.[h]?.drawdown??{};
  const regime=regimeSummaryR21353(dd,reg.rows),available=Object.values(regime).filter(x=>x.n>=10),negativeRegimes=available.filter(x=>finite(x.median)&&x.median<0).length;
  const full=Number(loso.full),min=Number(loso.min),max=Number(loso.max),maxAbsDelta=Number(loso.maxAbsDelta);
  horizons[h]={drawdownRegimes:regime,regimeAvailable:available.length,regimeNegative:negativeRegimes,loso:{full:finite(full)?round(full):null,min:finite(min)?round(min):null,max:finite(max)?round(max):null,maxAbsDelta:finite(maxAbsDelta)?round(maxAbsDelta):null,negativeRuns:loso.negativeRuns??null,positiveRuns:loso.positiveRuns??null,signStable:finite(min)&&finite(max)&&min<0&&max<0,relativeMaxDelta:finite(full)&&full!==0&&finite(maxAbsDelta)?round(Math.abs(maxAbsDelta/full)):null},specificity:pairedSpecificityR21353(ret,dd,h)};
 }
 return {spy:{rows:spy.length,firstDate:spy[0]?.date??null,lastDate:spy.at(-1)?.date??null,regimeDates:reg.rows.length,volThreshold:reg.threshold},horizons,priorR21352:s52.synthesis,synthesis:{generalAxisEligible:false,reason:'R21352_ZERO_STRONG_CELLS_AFTER_HAC_SIGNFLIP_HOLM',candidateSelected:false,optionsReplacementSelected:false,interpretation:'R21353_CHARACTERIZES_REGIME_AND_DOWNSIDE_SPECIFICITY_WITH_EXISTING_DATA_ONLY;DOES_NOT_OVERRIDE_R21352_GENERAL_AXIS_FAILURE'}};
}

export function runR21353Fixed(base=process.env.ZGMINI_PC_HOME??DEFAULT_BASE,{now=new Date()}={}){
 const s42=safeJson(path.join(base,F42)),s52=safeJson(path.join(base,F52));if(!s42)throw new Error(`R21353_FIXED_INPUT_MISSING:${F42}`);if(!s52)throw new Error(`R21353_FIXED_INPUT_MISSING:${F52}`);
 let spy=[],spyFile=null;for(const name of SPY_FILES){const x=safeJson(path.join(base,name));if(!x)continue;const rows=normalizeSpyR21353(x);if(rows.length>spy.length){spy=rows;spyFile=name;}}
 if(!spyFile)throw new Error('R21353_FIXED_SPY_SOURCE_MISSING');
 const a=analyzeR21353Fixed(s42,s52,spy),generatedAt=(now instanceof Date?now:new Date(now)).toISOString(),report={version:'R2.13.53-FIXED-REGIME-SECTOR-SPECIFICITY',generatedAt,status:'SHADOW_R21353_FIXED_REGIME_SECTOR_SPECIFICITY_COMPLETE',mode:'LOCAL_STORED_DATA_ONLY_NO_FUTURE_DEPENDENCY',feature:R21353_FEATURE,expectedDirection:R21353_EXPECTED_DIRECTION,minimumSpyRows:R21353_FIXED_MIN_SPY_ROWS,providerCalls:0,publicMutation:false,d1Mutation:false,dbSchemaChanged:false,productionFormulaChanged:false,schedulerChanged:false,referenceRequirementChanged:false,approvedR1ReferenceRequirement:756,normalizationChanged:false,weightsChanged:false,referenceWindowChanged:false,retuning:false,candidateSelected:false,optionsReplacementSelected:false,diagnosticOnly:true,spySourceFile:spyFile,...a,next:'REVIEW_R21353_FIXED_AND_CLOSE_OR_DOWNGRADE_INTERNAL_CORRELATION_CANDIDATE'};
 const lines=['ZGMINI SECTOR FEAR & GREED R2.13.53 FIXED REGIME + SECTOR SPECIFICITY',`generatedAt=${generatedAt}`,`status=${report.status}`,'mode=LOCAL_STORED_DATA_ONLY_NO_FUTURE_DEPENDENCY',`spySourceFile=${spyFile} spyRows=${a.spy.rows} spyDates=${a.spy.firstDate}..${a.spy.lastDate} regimeDates=${a.spy.regimeDates} volThreshold=${a.spy.volThreshold}`,`minimumSpyRows=${R21353_FIXED_MIN_SPY_ROWS} reason=TRAILING_63_RETURN_REQUIRES_INDEX_63_NOT_252_ROWS`,'providerCalls=0 publicMutation=false d1Mutation=false productionFormulaChanged=false schedulerChanged=false','approvedR1ReferenceRequirement=756 normalizationChanged=false weightsChanged=false referenceWindowChanged=false retuning=false','candidateSelected=false optionsReplacementSelected=false diagnosticOnly=true','','H | REGIME_NEG/AVAILABLE | LOSO_NEG/POS | LOSO_MIN | LOSO_MAX | REL_MAX_DELTA | DD_MINUS_RETURN | SPEC_HAC_P | SPEC_SIGN_P'];
 for(const h of R21353_HORIZONS){const x=a.horizons[h];lines.push(`${h} | ${x.regimeNegative}/${x.regimeAvailable} | ${x.loso.negativeRuns??'NA'}/${x.loso.positiveRuns??'NA'} | ${x.loso.min??'NA'} | ${x.loso.max??'NA'} | ${x.loso.relativeMaxDelta??'NA'} | ${x.specificity.medianDiffDrawdownMinusReturn??'NA'} | ${x.specificity.neweyWest.pOneSidedNegative??'NA'} | ${x.specificity.blockSignFlip.pOneSidedNegative??'NA'}`);for(const [k,v] of Object.entries(x.drawdownRegimes))lines.push(`  ${k} n=${v.n} median=${v.median??'NA'} neg/pos=${v.negative}/${v.positive}`);}
 lines.push('',`generalAxisEligible=${a.synthesis.generalAxisEligible}`,`reason=${a.synthesis.reason}`,`interpretation=${a.synthesis.interpretation}`,'note=FIX_ONLY_REMOVES_ERRONEOUS_252_ROW_SPY_GUARD;REGIME_COVERAGE_STILL_REQUIRES_100_ACTUAL_MATCHED_DATES','note=REGIMES_USE_SAME_DATE_SPY_TRAILING63_RETURN_AND_TRAILING20_REALIZED_VOLATILITY','note=NO_PROVIDER_NO_PUBLICATION_NO_RETUNING_NO_FORMULA_WEIGHT_REFERENCE_SCHEMA_SCHEDULER_OR_PRODUCTION_CHANGE',`next=${report.next}`);
 const jf=path.join(base,`${OUT}.json`),tf=path.join(base,`${OUT}.txt`);saveJson(jf,report);saveText(tf,lines.join('\n')+'\n');return {...report,jsonFile:jf,txtFile:tf};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){try{const r=runR21353Fixed();console.log(JSON.stringify({status:r.status,jsonFile:r.jsonFile,txtFile:r.txtFile,providerCalls:r.providerCalls,synthesis:r.synthesis,next:r.next},null,2));}catch(e){console.error(e?.stack??e?.message??String(e));process.exitCode=1;}}
