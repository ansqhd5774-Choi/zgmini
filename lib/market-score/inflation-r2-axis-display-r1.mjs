// Public presentation of the seven REAL validated Inflation R2 score axes.
// Does not expose component raw records, model weights or formula internals.
import {INFLATION_R2_AXES} from '../diagnostic-layer/inflation-r2-stored.mjs';
export const INFLATION_R2_AXIS_DISPLAY=Object.freeze({
  "TARGET_STABILITY": {
    "label": "목표 물가 안정",
    "description": "핵심 소비자·개인소비 물가의 목표 안정 상태"
  },
  "UNDERLYING_MOMENTUM": {
    "label": "기조물가 흐름",
    "description": "단기 및 중심 기조물가의 변화 방향"
  },
  "HEADLINE_PRESSURE": {
    "label": "전체 물가 압력",
    "description": "식품·에너지를 포함한 소비물가 압력"
  },
  "EXPECTATIONS": {
    "label": "기대 인플레이션",
    "description": "중기 기대물가의 안정 상태"
  },
  "SUPPLY_PIPELINE": {
    "label": "공급측 물가 압력",
    "description": "에너지·생산자·수입 가격에서 오는 공급측 부담"
  },
  "LABOR_COST_PERSISTENCE": {
    "label": "인건비 물가 압력",
    "description": "임금과 고용비용에서 오는 물가 압력"
  },
  "DEMAND_CONTEXT": {
    "label": "수요·생산 여건",
    "description": "산업 생산으로 확인하는 수요·생산 환경"
  }
});
export function inflationR2PublicAxisIndicators(axes,asOf){
 return INFLATION_R2_AXES.map(id=>{
  const value=axes?.[id],valid=typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
  const meta=INFLATION_R2_AXIS_DISPLAY[id];
  return {id,name:meta.label,label:meta.label,description:meta.description,
   status:valid?'READY':'PARTIAL',score:valid?value:null,asOfDate:asOf,
   source:'STORED_PIT_HISTORY'};
 });
}
