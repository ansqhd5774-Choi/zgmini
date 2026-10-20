/** V11 display-only projection, distinct from the pinned V9 public artifact. */
import {projectV9PublicDomain,V9_METHOD,overlayV9PublicScore} from './breadth-v9-public-view.mjs';
export const V11_PUBLIC_KEY='public:breadth-v11:v1';
export const V11_METHOD='BREADTH_V11_FIXED_5F_OBSERVED_EMA3_CONTINUITY';
const SOURCE='PC_LOCAL_B1_R3_STORED_TIME_LABELED_NOT_OFFICIAL_PIT_ATTESTED';
export function projectV11PublicDomain(record){
 if(!record||record.version!==1||record.methodologyVersion!==V11_METHOD||record.source!==SOURCE)return null;
 const a=record.annualValidation;
 if(!a||a.requiredSessions!==252||!Number.isInteger(a.observedSessions)||a.observedSessions<2||a.observedSessions>252||
   a.missingSessions!==252-a.observedSessions||a.completeYear!==(a.observedSessions===252)||
   a.observedSessions!==record.trend?.length)return null;
 // Reuse the frozen V9 numeric/date/source validator without altering V9 data.
 const projection=projectV9PublicDomain({...record,methodologyVersion:V9_METHOD});
 if(!projection)return null;
 return {...projection,methodologyVersion:V11_METHOD,source:'PC_LOCAL_STORED_V11',
  annualValidation:{...a},
  indicators:projection.indicators.map((x,i)=>({...x,id:'breadth-v11-f'+(i+1),source:'STORED_V11_FACTOR'}))};
}
export function overlayV11PublicScore(snapshot,record){
 const candidate=projectV11PublicDomain(record);
 if(!candidate||!snapshot||snapshot.status!=='SUCCESS'||!Array.isArray(snapshot.domains))return snapshot;
 if(snapshot.domains.filter(d=>d?.id==='breadth').length!==1)return snapshot;
 return {...snapshot,domains:snapshot.domains.map(d=>d?.id==='breadth'?candidate:d)};
}
