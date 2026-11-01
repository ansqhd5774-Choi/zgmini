// Add verified dated historical raw observations only after the existing
// six-factor score/raw join has succeeded. No score changes or interpolation.
import {validateAssetR10History} from '../../worker/asset-bubble-r10-history-r1.mjs';
import {sameR10StoredSourceOrContent} from './asset-r10-source-vintage-r2.mjs';
const near=(a,b)=>typeof a==='number'&&Number.isFinite(a)
 &&typeof b==='number'&&Number.isFinite(b)&&Math.abs(a-b)<1e-7;

export function mergeAssetR10HistoryForUi(scoredWithRaw,history){
 let parsed;
 try{parsed=validateAssetR10History(history);}catch{return scoredWithRaw;}
 if(!scoredWithRaw||scoredWithRaw.status!=='READY'
  ||scoredWithRaw.methodologyVersion!=='ASSET_BUBBLE_R10_CANDIDATE'
  ||scoredWithRaw.historyMode!=='CURRENT_VINTAGE_ONLY'
  ||scoredWithRaw.rightsStatus!==parsed.rightsStatus
  ||!sameR10StoredSourceOrContent(scoredWithRaw,parsed)
  ||scoredWithRaw.scoreObservationQuarter!==parsed.scoreObservationQuarter
  ||!near(scoredWithRaw.score,parsed.approvedScore)
  ||!Array.isArray(scoredWithRaw.indicators)
  ||scoredWithRaw.indicators.length!==6)return scoredWithRaw;
 for(let i=0;i<6;i++){
  const row=scoredWithRaw.indicators[i],factor=parsed.factors[i];
  const current=factor.points[4],previous=factor.points[3];
  if(row.id!==factor.id||row.rawUnit!==factor.unit||row.source!==factor.source
   ||!near(row.value,current.value)||!near(row.previousValue,previous.value)
   ||row.observationDate!==current.observationDate
   ||row.previousObservationDate!==previous.observationDate)return scoredWithRaw;
 }
 return {...scoredWithRaw,indicators:scoredWithRaw.indicators.map((row,i)=>{
  const factor=parsed.factors[i];
  const points=factor.points.filter(point=>point.observationDate!==null)
   .map(point=>({date:point.observationDate,value:point.value}));
  return {...row,trend:points,
   trendPeriodLabel:factor.status==='READY_1Y'?'1년 · 실제 5개 분기'
    :`실제 ${points.length}개 분기 · 부분 이력`,
   historyStatus:factor.status};
 })};
}
