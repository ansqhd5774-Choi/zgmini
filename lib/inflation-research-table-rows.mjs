// Presentation-only adaptation: independently stored 19 candidate inputs,
// never a replacement for the existing 4 Inflation R2 scored indicators.
import {INFLATION_CAUSAL_19} from './inflation-causal-public-catalog.mjs';
export const RESEARCH_INPUTS_SCHEMA='inflation-causal-public-19-r1-v1';
const okDate=x=>typeof x==='string'&&/^(?:19|20)\d\d-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.test(x);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const valid=p=>p?.status==='READY'&&finite(p.value)&&okDate(p.observationDate);
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
   content:meta.description,criterionLabel:'원자료 · 점수 미산출',
   releaseCadence:meta.cadence,history
  };
 });
}
