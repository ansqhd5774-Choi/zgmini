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
 '1':'원유↑ · 에너지원가↑',
 '3':'가스↑ · 연료비↑',
 '4':'전력료↑ · 생산비↑',
 '5':'철강↑ · 제조원가↑',
 '6':'구리↑ · 소재원가↑',
 '7':'목재↑ · 건설원가↑',
 '8':'화학제품↑ · 원료비↑',
 '9':'곡물↑ · 식품원가↑',
 '10':'육류↑ · 식품원가↑',
 '11':'사료↑ · 축산원가↑',
 '12':'임금↑ · 인건비↑',
 '13':'보상비↑ · 기업비용↑',
 '14':'단위노동비↑ · 원가↑',
 '18':'달러↑ · 수입물가↓*',
 '19':'수입가격↑ · 수입원가↑',
 '21':'공급망지수↑ · 병목↑',
 '25':'중간재↑ · 제조원가↑',
 '26':'실질소비↑ · 수요압력↑*',
 '31':'기대인플레↑ · 물가기대↑',
});


const shortDate=x=>typeof x==='string'&&/^20\d{2}-\d{2}-\d{2}T/.test(x)?x:null;

// Observed period labels are not release dates or collection timestamps.
export function researchObservationPeriod(date,cadence){
 if(typeof date!=='string'||!okDate(date))return null;
 const year=date.slice(0,4),month=Number(date.slice(5,7));
 if(cadence==='분기')return year+'년 '+Math.ceil(month/3)+'분기 관측';
 if(cadence==='월간')return year+'년 '+month+'월 관측';
 return year+'. '+date.slice(5,7)+'. '+date.slice(8,10)+'. 관측';
}

// Descriptive difference between the two actual stored observations.
// Not a seasonally adjusted inflation rate, approved score, threshold or forecast.
export function researchDirectionalJudgement(id,previousValue,value){
 const unavailable={name:'—',tone:'missing'};
 if(!finite(previousValue)||!finite(value))return unavailable;
 // The dollar index has no approved inflation-direction sign. Display a dash
 // while retaining the established neutral presentation tone.
 if(id==='18')return {name:'—',tone:'neutral'};
 if(value>previousValue)return {name:'부정',tone:'negative'};
 if(value<previousValue)return {name:'긍정',tone:'positive'};
 return {name:'중립',tone:'neutral'};
}

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
   sourceDisplay:meta.source,sourceStoredAt:match?shortDate(raw.sourceStoredAt):null,
   availableAt:match?shortDate(raw.availableAt):null,
   researchJudgement:match?researchDirectionalJudgement(meta.id,raw.previousValue,raw.value):{name:'—',tone:'missing'},
   releaseCadence:meta.cadence,history
  };
 });
}
