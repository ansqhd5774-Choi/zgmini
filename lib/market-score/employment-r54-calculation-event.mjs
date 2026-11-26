// R54 event recorded only inside the existing atomic market snapshot writer.
// Preserves monthly source-observation anchors and keeps independent R6/29 out.
import {EMPLOYMENT_R54_INDICATORS,EMPLOYMENT_R54_METHOD} from './employment-r54-candidate.mjs';
import {verifiedEconomicEmploymentScore} from '../economic-employment-stored-display-r4.mjs';

export const EMPLOYMENT_R54_STORED_EVENT='R54_STORED_CALCULATION_EVENT_R1';
const sources=Object.freeze([
 'BLS / UNRATE',
 'BLS / PAYEMS',
 'DOL ETA 539 / stored state claims',
 'DOL ETA 539 / stored state claims breadth',
]);
const validDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(Date.parse(s+'T00:00:00Z'))&&
 new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const pointDay=p=>p?.label??p?.date;

// Call immediately before the snapshot's body is validated and atomically
// persisted under its real UTC calculation day and current keys.
// A current score displayed by a client, or a historical monthly anchor,
// does NOT establish an actually stored calculation event.
export function recordStoredEmploymentR54Event(body,now){
 if(!Number.isSafeInteger(now)||now<946684800000||
   body?.status!=='SUCCESS'||!Array.isArray(body?.domains)||!validDay(body?.asOfDate))return body;
 const storedAt=new Date(now).toISOString();
 if(body.asOfDate!==storedAt.slice(0,10)||body.updatedAt!==storedAt)return body;
 const matching=body.domains.filter(row=>row?.id==='employment');
 if(matching.length!==1)return body;
 const domain=matching[0];
 if(domain?.methodologyVersion!==EMPLOYMENT_R54_METHOD||
    domain.asOfDate!==body.asOfDate||!Array.isArray(domain?.indicators)||
    domain.indicators.length!==EMPLOYMENT_R54_INDICATORS.length||
    !Array.isArray(domain.trend)||verifiedEconomicEmploymentScore(domain,body.asOfDate)===null)return body;
 for(let i=0;i<EMPLOYMENT_R54_INDICATORS.length;i++){
  if(domain.indicators[i].id!==EMPLOYMENT_R54_INDICATORS[i].id||
     domain.indicators[i].source!==sources[i])return body;
 }
 const point={label:body.asOfDate,value:domain.score,
  pointKind:EMPLOYMENT_R54_STORED_EVENT,calculatedAt:storedAt};
 // Monthly R54 backtest anchors and daily stored calculation events have
 // different time semantics; never publish two contradictory scores for a day.
 // Same-day current event is authoritative only because this writer is
 // persisting the exact factor-verified calculation simultaneously.
 domain.trend=[
  ...domain.trend.filter(p=>pointDay(p)!==body.asOfDate),point,
 ].sort((a,b)=>String(pointDay(a)).localeCompare(String(pointDay(b))));
 domain.lastCalculationEvent={
  kind:EMPLOYMENT_R54_STORED_EVENT,
  methodologyVersion:EMPLOYMENT_R54_METHOD,
  calculatedAt:storedAt,
  factorObservationDates:domain.indicators.map(x=>({id:x.id,date:x.observationDate})),
 };
 return body;
}
