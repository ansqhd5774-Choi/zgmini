// Presentation-only adaptation: independently stored 19 candidate inputs,
// never a replacement for the existing 4 Inflation R2 scored indicators.
import {INFLATION_CAUSAL_19} from './inflation-causal-public-catalog.mjs';
export const RESEARCH_INPUTS_SCHEMA='inflation-causal-public-19-r1-v1';
const okDate=x=>typeof x==='string'&&/^(?:19|20)\d\d-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.test(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const valid=p=>p?.status==='READY'&&finite(p.value)&&okDate(p.observationDate);
// UI reading guides only. These are directional considerations, NOT
// thresholds, approved score weights, or independent buy/sell judgements.
export const RESEARCH_READING_CRITERIA=Object.freeze({
 '1':'원유 가격이 상승하면 에너지 원가 압력이 커질 수 있음',
 '3':'가스 가격 상승은 연료·에너지 원가 부담을 키울 수 있음',
 '4':'전력요금 상승은 산업 생산비 부담을 키울 수 있음',
 '5':'철강 가격 상승은 제조업 투입비용 부담을 키울 수 있음',
 '6':'구리·황동 가격 상승은 소재 원가 부담을 키울 수 있음',
 '7':'목재 가격 상승은 건설·제조 원가에 부담이 될 수 있음',
 '8':'화학제품 가격 상승은 산업 원료비 부담을 키울 수 있음',
 '9':'곡물 가격 상승은 식품 원료비 부담을 키울 수 있음',
 '10':'육류 가격 상승은 식품 제조·유통비에 영향을 줄 수 있음',
 '11':'사료 가격 상승은 축산 생산비 부담을 키울 수 있음',
 '12':'시간당 임금 상승은 인건비 압력으로 이어질 수 있음',
 '13':'고용비용 상승은 기업 노동비용 부담을 키울 수 있음',
 '14':'단위노동비용 상승은 제품당 생산비 압력을 키울 수 있음',
 '18':'달러 강세는 수입물가 압력을 완화할 수 있음 (조건부)',
 '19':'수입가격 상승은 수입 원가 부담을 키울 수 있음',
 '21':'지수가 높아지면 공급망 제약이 커졌을 가능성',
 '25':'가공 중간재 가격 상승은 후속 생산비 부담을 키울 수 있음',
 '26':'실질 소비 증가 시 수요 측 가격 압력이 커질 수 있음',
 '31':'기대인플레이션 상승은 향후 물가 압력 신호가 될 수 있음',
});

export function buildResearchInputRows(snapshot){
 const safe=snapshot?.schemaVersion===RESEARCH_INPUTS_SCHEMA&&
  ['READY','PARTIAL'].includes(snapshot.status)&&
  Array.isArray(snapshot.indicators)&&snapshot.indicators.length===19;
 const byId=safe?new Map(snapshot.indicators.map(p=>[p.id,p])):new Map();
 return INFLATION_CAUSAL_19.map(meta=>{
  const raw=byId.get(meta.id);
  const match=raw?.series===meta.series&&raw?.unit===meta.unit&&valid(raw);
  const history=match&&Array.isArray(raw.history)&&raw.history.length<=13?
   raw.history.filter(p=>okDate(p?.date)&&finite(p?.value))
   .map(p=>({date:p.date,value:p.value})):[];
  return {
   id:'research-'+meta.id,label:meta.name,source:meta.source+' / '+meta.series,
   status:match?'READY':'PENDING',score:null,
   value:match?raw.value:null,unit:' '+meta.unit,
   previousValue:match&&finite(raw.previousValue)?raw.previousValue:null,
   observationDate:match?raw.observationDate:null,
   previousObservationDate:match&&okDate(raw.previousObservationDate)?raw.previousObservationDate:null,
   content:meta.description,criterionLabel:RESEARCH_READING_CRITERIA[meta.id],
   sourceDisplay:meta.source,
   releaseCadence:meta.cadence,history
  };
 });
}
