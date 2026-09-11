// Server-selected, bounded indicators. Legacy research remains offline-callable.
import {fetchHistory, OPERATIONS} from './phase2-korea-history.mjs';
import {analyzeSeries} from './phase2-korea-analysis.mjs';
import {period} from './phase1-korea.mjs';
import {preparePoints, rollingScores, changes, blendScores} from './phase2-methodology.mjs';
import {smoothedScores} from './phase2-sensitivity.mjs';

export const SCOPED_PROFILE = 'FSC_SCOPED_INDICATORS_V1';
export const SCOPED_VERSION = 'fsc-scoped-1';
export const LIQUIDATION_START = '20231025';
export const SCOPED_COPY = Object.freeze({
  title:'국내 투자자금 지표 · 베타',
  introduction:'신용융자 변화와 반대매매 상대강도를 공식 통계에 기초해 가공한 보조지표입니다. 한국 주식시장 전체를 대표하는 공식 공포·탐욕지수는 아닙니다.',
  history:'과거 값은 현재 확보한 원자료로 재계산한 결과입니다. 해당 날짜에 실제 공개돼 있던 지수나 그 당시 이용 가능했던 자료를 완전히 재현한 기록은 아닙니다.',
  liquidation:'집계 기준 변경 보도를 고려해 2023-10-25 이전 자료를 계산에서 제외했습니다. 이후 자료로 계산 준비기간을 확보한 시점부터 결과를 제공합니다.',
  source:'금융위원회 공공데이터포털 · 금융투자협회종합통계정보 · ZGmini 자체 가공',
  score:'0~100 상대 점수이며 확률·수익률이 아닙니다.'
});
const valid = x => typeof x === 'number' && Number.isFinite(x);
const specs = Object.freeze({
  credit:{field:'crdTrFingWhl',start:'20210101',warmup:312,label:'신용융자 확대 정도',direction:'HIGHER_RELATIVE_CREDIT_EXPANSION',method:'LEV_BLEND20_60'},
  capital:{field:'brkTrdUcolMnyVsOppsTrdAmt',start:LIQUIDATION_START,warmup:254,label:'반대매매 상대강도',direction:'HIGHER_LIQUIDATION_PRESSURE',method:'L3_PRESSURE_P252'}
});

export function scopedIndicator(name, rows, {nowDate, complete=true, fetchedAt=null, calculatedAt=null}={}) {
  const spec=specs[name];
  if(!spec || !period(nowDate,'D') || rows.length>6000)throw Error('SCOPED_INPUT_INVALID');
  // Cut before validation/statistics/rolling state. No pre-boundary value survives.
  const bounded=rows.filter(r=>period(r?.basDt,'D')&&r.basDt>=spec.start&&r.basDt<=nowDate);
  const analysis=analyzeSeries(bounded,{operation:OPERATIONS[name].operation,field:spec.field,nowDate,complete});
  const accepted=new Map(analysis.points.map(p=>[p.date,p.value]));
  // The shared parser removes unusable dates; restore KNOWN slots, not a calendar.
  const points=preparePoints(bounded.map(r=>({date:r.basDt,value:accepted.get(r.basDt)??null})))
    .map(p=>({...p,value:valid(p.value)&&p.value>=0?p.value:null}));
  let scores;
  if(name==='capital') {
    const internalGreed=smoothedScores(points,3,rollingScores);
    scores=internalGreed.map(p=>({...p,value:valid(p.value)?100-p.value:null}));
  } else {
    const shifted=h=>[...points.slice(0,h).map(p=>({date:p.date,value:null})),...rollingScores(changes(points,h).slice(h))];
    scores=blendScores(shifted(20),shifted(60));
  }
  const latest=scores.at(-1), usable=scores.filter(p=>valid(p.value));
  const ready=complete&&valid(latest?.value);
  const status=!complete?'SOURCE_INCOMPLETE':points.length<spec.warmup?'WARMUP':ready?'CALCULATION_READY':'MISSING_WINDOW';
  const summary=analysis.summary;
  // Explicit output allowlist. No raw rows, complete score history, or correlations.
  return {
    id:spec.method,label:spec.label,field:spec.field,operation:OPERATIONS[name].operation,
    score:ready?latest.value:null,status,direction:spec.direction,unit:null,unitSource:null,
    observationDate:latest?.date??null,sourcePublishedAt:null,fetchedAt,calculatedAt,
    historyMode:'RECONSTRUCTED_CURRENT_VINTAGE',pointInTimeVerified:false,historicalVintageVerified:false,
    calculationReady:ready,inputStartDate:spec.start,firstInputDate:points[0]?.date??null,
    requiredRawObservations:spec.warmup,inputObservationSlots:points.length,
    firstUsableScoreDate:usable[0]?.date??null,availableScoreCount:usable.length,
    quality:{missingValueCount:summary.missingValueCount,nonNumericValueCount:summary.nonNumericValueCount,
      duplicateDateCount:summary.duplicateDateCount,conflictingDateCount:summary.conflictingDateCount,
      knownMissingSlots:points.filter(p=>p.value===null).length,calendarCompleteness:'UNCONFIRMED',
      longTermValidation:'UNCONFIRMED',complete},
    scoreSummary:{min:usable.length?Math.min(...usable.map(p=>p.value)):null,max:usable.length?Math.max(...usable.map(p=>p.value)):null},
    ...(name==='capital'?{boundaryBasis:'REPORTED_CHANGE_PRECAUTIONARY_CUTOFF',apiChangeConfirmed:false,
      historicalBackcastConfirmed:false,seriesComparability:'UNCONFIRMED',outputTransform:'100 - existing L3 greed-oriented score'}:{blend:[0.6,0.4]})
  };
}

export async function runFscScoped(env,context={}) {
  const clock=context.clock??(()=>new Date(Date.now())),start=clock();
  const nowDate=new Date(start.getTime()+9*3600000).toISOString().slice(0,10).replaceAll('-','');
  const pairs=await Promise.all(['credit','capital'].map(async name=>{
    const result=await fetchHistory(name,env?.FSC_API_KEY,{fetch:context.fetch,now:start,timeoutMs:context.timeoutMs});
    const acquired=result.status.pagesReceived>0?clock().toISOString():null;
    return [name,result,acquired];
  }));
  const calculatedAt=clock().toISOString(),operations={},indicators={};
  for(const [name,result,fetchedAt] of pairs){
    operations[name]={status:result.status.status,requestCount:result.status.requestCount,complete:result.status.complete,errorType:result.status.errorType};
    indicators[name]=scopedIndicator(name,result.rows,{nowDate,complete:result.status.complete,fetchedAt,calculatedAt});
  }
  return {profile:SCOPED_PROFILE,analysisVersion:SCOPED_VERSION,calculatedAt,copy:{...SCOPED_COPY},
    operations,indicators,compositeScore:null,compositeStatus:'NOT_IN_CURRENT_SCOPE',finalWeights:null,
    rightsAllowedForSelectedSource:true,rightsBasis:'FSC official catalog 15094809: unrestricted license; existing evidence review',
    scopeImplemented:true,calculationReady:Object.values(indicators).every(i=>i.calculationReady),runtimeVerified:false,releaseReady:false,
    excludedDependencies:{BOK:{status:'EXCLUDED_FROM_CURRENT_SCOPE',rightsStatus:'UNCONFIRMED',productionEligible:false},
      KOSIS:{status:'EXCLUDED_FROM_CURRENT_SCOPE'},CMA:{status:'EXCLUDED_FROM_CURRENT_SCOPE'},
      compositeAndWeightGrid:{status:'EXCLUDED_FROM_CURRENT_SCOPE'}},
    limitations:['Publication timing and historical vintages unconfirmed','Not a market-wide fear/greed index','L3 is not an optimal-model claim']};
}
