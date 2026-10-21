// Display contract for the ten existing S2.1 signals. This does not calculate or change scores.
export const STAGFLATION_INPUT_DETAILS_VERSION='STAGFLATION_INPUTS_V1';
export const STAGFLATION_INPUT_SIGNALS=Object.freeze([
 {id:'PCE_YOY',series:'PCEPI',label:'PCE 물가',content:'전체 소비자 지출 물가의 전년 대비 변화',criterion:'물가 목표 2% 근접',unit:'%',releaseId:'realPce'},
 {id:'CORE_PCE_YOY',series:'PCEPILFE',label:'Core PCE · 전년 대비',content:'식품·에너지를 제외한 기조 물가',criterion:'물가 목표 2% 근접',unit:'%',releaseId:'realPce'},
 {id:'CORE_PCE_3M',series:'PCEPILFE',label:'Core PCE · 3개월 연율',content:'최근 3개월의 기조 물가 상승 속도',criterion:'물가 목표 2% 근접',unit:'%',releaseId:'realPce'},
 {id:'PRODUCTION_3M',series:'INDPRO',label:'산업생산',content:'공장·광산·공익사업의 생산 증가 속도',criterion:'증가세 유지',unit:'%',releaseId:'industrialProduction'},
 {id:'CONSUMPTION_3M',series:'DPCERA3M086SBEA',label:'실질소비',content:'물가 영향을 제거한 소비의 증가 속도',criterion:'증가세 유지',unit:'%',releaseId:'realPce'},
 {id:'INCOME_3M',series:'DSPIC96',label:'실질 가처분소득',content:'가계가 실제로 쓸 수 있는 소득의 증가 속도',criterion:'증가세 유지',unit:'%',releaseId:'disposableIncome'},
 {id:'EMPLOYMENT_3M',series:'PAYEMS',label:'비농업고용 · 증가 속도',content:'최근 3개월 고용 증가율을 연율로 표시',criterion:'증가세 유지',unit:'%',releaseId:'nfp'},
 {id:'EMPLOYMENT_DECELERATION',series:'PAYEMS',label:'비농업고용 · 가속·감속',content:'최근 3개월 연율과 직전 3개월 연율의 차이',criterion:'고용 증가 속도 유지',unit:'%p',releaseId:'nfp'},
 {id:'EXPECTED_INFLATION',series:'EXPINF5YR',label:'5년 기대인플레이션',content:'클리블랜드 연준이 추정한 5년 기대 물가',criterion:'기대 물가 안정',unit:'%',releaseId:null},
 {id:'WTI_YOY',series:'MCOILWTICO',label:'WTI 유가 · 전년 대비',content:'에너지 가격 상승이 주는 비용 부담',criterion:'유가 상승 압력 완화',unit:'%',releaseId:null},
]);

export function projectStagflationInputs(result,series){
 return STAGFLATION_INPUT_SIGNALS.map((meta,index)=>{
  const trend=result.history.map(point=>({date:point.observationMonth,value:point.raw[index],score:100-point.signalRisk[index]}));
  const last=trend.at(-1),prior=trend.at(-2);
  const source=(series[meta.series]??[]).find(row=>row.observationDate===last.date);
  const release=source?.releaseDate??source?.availableAt;
  const releaseDate=typeof release==='string'&&/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(release)&&Number.isFinite(Date.parse(release))?release:null;
  return {id:meta.id,status:'READY',value:last.value,score:last.score,observationMonth:last.date,previousValue:prior.value,previousObservationMonth:prior.date,releaseDate,trend};
 });
}

export function validStagflationInputs(record){
 if(record.inputs===undefined&&record.inputDetailsVersion===undefined)return true; // Existing stored score remains readable.
 if(record.inputDetailsVersion!==STAGFLATION_INPUT_DETAILS_VERSION||!Array.isArray(record.inputs)||record.inputs.length!==10)return false;
 const validScore=x=>Number.isFinite(x)&&x>=0&&x<=100;
 return STAGFLATION_INPUT_SIGNALS.every((meta,i)=>{
  const row=record.inputs[i];
  if(row?.id!==meta.id||row.status!=='READY'||!Number.isFinite(row.value)||!Number.isFinite(row.previousValue)||!validScore(row.score)||row.observationMonth!==record.observationMonth||row.previousObservationMonth!==record.history.at(-2).observationMonth)return false;
  if(row.releaseDate!==null&&(typeof row.releaseDate!=='string'||!Number.isFinite(Date.parse(row.releaseDate))))return false;
  if(!Array.isArray(row.trend)||row.trend.length!==13||!row.trend.every((p,j)=>p.date===record.history[j].observationMonth&&Number.isFinite(p.value)&&validScore(p.score)))return false;
  return row.value===row.trend.at(-1).value&&row.previousValue===row.trend.at(-2).value&&row.score===row.trend.at(-1).score;
 });
}

export function publicStagflationInputs(inputs){
 return (inputs??[]).map(row=>({id:row.id,status:row.status,value:row.value,score:row.score,observationMonth:row.observationMonth,previousValue:row.previousValue,previousObservationMonth:row.previousObservationMonth,releaseDate:row.releaseDate,trend:row.trend.map(p=>({date:p.date,value:p.value}))}));
}
