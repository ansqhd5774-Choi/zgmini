/** V11 display-only projection, distinct from the pinned V9 public artifact. */
import {projectV9PublicDomain,V9_METHOD,overlayV9PublicScore} from './breadth-v9-public-view.mjs';
export const V11_PUBLIC_KEY='public:breadth-v11:v1';
export const V11_METHOD='BREADTH_V11_FIXED_5F_OBSERVED_EMA3_CONTINUITY';
const SOURCE='PC_LOCAL_B1_R3_STORED_TIME_LABELED_NOT_OFFICIAL_PIT_ATTESTED';
const FACTORS=Object.freeze([
 ['F1','상승·보합 종목의 비중을 나타냅니다.','종목 상승·보합 비율'],
 ['F2','상승·보합 종목의 거래대금 비중을 나타냅니다.','상승 거래대금 비율'],
 ['F3','유효 관측 자료에서 계산한 단기 수급 흐름입니다.','단기 수급 평가'],
 ['F4','유효 관측 자료에서 계산한 중기 수급 흐름입니다.','중기 수급 평가'],
 ['F5','현재와 20회 이전 적격 관측의 종가를 비교한 비중입니다.','20회 적격 관측 비교'],
]);
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
export function projectV11PublicDomain(record){
 if(!record||record.version!==1||record.methodologyVersion!==V11_METHOD||record.source!==SOURCE)return null;
 const a=record.annualValidation;
 if(!a||a.requiredSessions!==252||!Number.isInteger(a.observedSessions)||a.observedSessions<2||a.observedSessions>252||
   a.missingSessions!==252-a.observedSessions||a.completeYear!==(a.observedSessions===252)||
   a.observedSessions!==record.trend?.length)return null;
 const history=record.factorHistory;
 const enriched=Object.prototype.hasOwnProperty.call(record,'factorHistory');
 if(enriched&&(!history||typeof history!=='object'))return null;
 if(enriched){
 const dates=record.trend.map(p=>p.label);
 const first=history.F1;
 if(!Array.isArray(first)||first.length!==a.observedSessions)return null;
 for(const [key] of FACTORS){
  const rows=history[key];
  if(!Array.isArray(rows)||rows.length!==dates.length)return null;
  for(let i=0;i<rows.length;i++){
   const v=rows[i];
   if(v?.date!==dates[i]||!validScore(v.value)||typeof v.breakBefore!=='boolean')return null;
   if(key!=='F1'&&v.breakBefore!==first[i].breakBefore)return null;
   if(i===0&&v.breakBefore)return null;
  }
  if(Math.abs(rows.at(-1).value-record.factors?.[key])>1e-6)return null;
 }
 }
 // Reuse the frozen V9 numeric/date/source validator without altering V9 data.
 const projection=projectV9PublicDomain({...record,methodologyVersion:V9_METHOD});
 if(!projection)return null;
 return {...projection,methodologyVersion:V11_METHOD,source:'PC_LOCAL_STORED_V11',
  annualValidation:{...a},
  indicators:!enriched?projection.indicators.map((x,i)=>({...x,id:'breadth-v11-f'+(i+1),source:'STORED_V11_FACTOR'})):projection.indicators.map((x,i)=>{
   const [key,description,criterionLabel]=FACTORS[i],rows=history[key],previous=rows.at(-2);
   return {...x,id:'breadth-v11-f'+(i+1),
    source:'MarketParquet · 저장 산출',sourceKey:key,description,criterionLabel,
    previousValue:previous?.value??null,previousObservationDate:previous?.date??null,
    releaseCadence:'매 거래일',nextReleaseDate:null,
    trend:rows.map(v=>({date:v.date,value:v.value,breakBefore:v.breakBefore}))};
  })};
}
export function overlayV11PublicScore(snapshot,record){
 const candidate=projectV11PublicDomain(record);
 if(!candidate||!snapshot||snapshot.status!=='SUCCESS'||!Array.isArray(snapshot.domains))return snapshot;
 if(snapshot.domains.filter(d=>d?.id==='breadth').length!==1)return snapshot;
 return {...snapshot,domains:snapshot.domains.map(d=>d?.id==='breadth'?candidate:d)};
}
