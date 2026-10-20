/**
 * The PC publishes a bounded public display result. This code only validates
 * and presents that stored result; it never reads provider data or calculates
 * V9 factors on a visitor request. No B1-R5 fallbacks are rewritten.
 */
export const V9_PUBLIC_KEY='public:breadth-r10-v9:v1';
export const V9_METHOD='BREADTH_R10_V9_FIXED_5F_VALID_OBSERVATION_SHADOW';
const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const round=x=>Math.round(x*1e9)/1e9;
const factors=Object.freeze([
 ['F1','상승종목 비율','%'],
 ['F2','상승 거래대금 비율','%'],
 ['F3','단기 수급 흐름','점'],
 ['F4','중기 수급 흐름','점'],
 ['F5','20회 관측 수급폭','%'],
]);
export function projectV9PublicDomain(record){
 if(!record||record.version!==1||record.methodologyVersion!==V9_METHOD||record.source!=='PC_LOCAL_B1_R3_STORED_TIME_LABELED_NOT_OFFICIAL_PIT_ATTESTED')return null;
 if(!date(record.asOfDate)||!date(record.observationDate)||record.observationDate>record.asOfDate||!score(record.score))return null;
 if(!['OBSERVED','CARRY_FORWARD'].includes(record.phase)||(record.phase==='OBSERVED')!==(record.asOfDate===record.observationDate))return null;
 if(!Array.isArray(record.trend)||record.trend.length<2||record.trend.length>370)return null;
 let previous='';
 const trend=[];
 for(const row of record.trend){
  if(!date(row?.label)||row.label<=previous||row.label>record.observationDate||!score(row.value))return null;
  trend.push({label:row.label,value:row.value});
  previous=row.label;
 }
 const latest=trend.at(-1);
 if(latest.label!==record.observationDate||Math.abs(latest.value-record.score)>0.000001)return null;
 const f=record.factors;
 if(!f||factors.some(([key])=>!score(f[key])))return null;
 const prior=trend.at(-2);
 const delta=prior?round(record.score-prior.value):null;
 const indicators=factors.map(([id,name,unit])=>({
  id:'breadth-v9-'+id.toLowerCase(),name,label:name,status:'READY',value:f[id],score:f[id],unit,
  asOfDate:record.observationDate,observationDate:record.observationDate,
  source:'STORED_V9_FACTOR',sourceKey:id,freshness:record.phase==='OBSERVED'?'CURRENT':'LAST_VERIFIED',
  criterionLabel:'저장 평가점수',missing:[],
 }));
 return {
  id:'breadth',name:'수급·폭',source:'PC_LOCAL_STORED_V9',
  methodologyVersion:V9_METHOD,
  status:'READY',score:record.score,state:null,interpretation:null,
  trend,indicators,
  asOfDate:record.asOfDate,observationDate:record.observationDate,
  updatedAt:record.sourceStoredAt??null,
  sourceStoredAt:record.sourceStoredAt??null,
  freshness:record.phase==='OBSERVED'?'CURRENT':'LAST_VERIFIED',
  dataPhase:record.phase,
  scoreChange:delta,
  previousScore:prior?.value??null,
  previousObservationDate:prior?.label??null,
  missingFactors:[],
 };
}
export function overlayV9PublicScore(snapshot,projection){
 const candidate=projectV9PublicDomain(projection);
 if(!candidate||!snapshot||snapshot.status!=='SUCCESS'||!Array.isArray(snapshot.domains))return snapshot;
 const matches=snapshot.domains.filter(item=>item?.id==='breadth');
 if(matches.length!==1)return snapshot;
 return {...snapshot,domains:snapshot.domains.map(d=>d?.id==='breadth'?candidate:d)};
}
