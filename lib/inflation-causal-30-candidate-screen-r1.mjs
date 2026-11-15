// W01 independent research screening of the user's 30 candidates (#20 excluded).
// Neither an approved composite inflation formula nor a public D1/PC contract.
// Source is the existing immutable 19 + 7 catalogs; no provider/API/storage effects.
import {INFLATION_CAUSAL_19} from './inflation-causal-public-catalog.mjs';
import {INFLATION_CANDIDATES_7} from './inflation-causal-candidates-public-7-catalog.mjs';

export const INFLATION30_STATUS=Object.freeze({
 CATALOG_19:'CATALOG_19',
 CANDIDATE_7:'CANDIDATE_7',
 MERGED_DERIVATION:'MERGED_DERIVATION',
 DEFERRED_DEFINITION:'DEFERRED_DEFINITION',
});

// This is a feasibility SCREEN only: no score, weights, normalization,
// future adoption decision, new source or publication permission is implied.
const exceptions=Object.freeze({
 '15':Object.freeze({
  name:'품목·국가별 법정 관세율',status:INFLATION30_STATUS.DEFERRED_DEFINITION,
  source:'USITC HTS (Chapter 99 포함)',
  nextDecision:'HTS 품목·원산지·예외·법적 효력일을 확정할 것. 세율을 임의 평균하지 않음',
  sourceReference:'https://www.usitc.gov/harmonized_tariff_information/hts/archive/list',
  sourceReferenceAsOf:'2026-11-15',sourceEdition:'2026 HTS Revision 23 (2026-11-10)',
 }),
 '17':Object.freeze({
  name:'관세 대상 수입 노출 비중',status:INFLATION30_STATUS.DEFERRED_DEFINITION,
  source:'USITC DataWeb Customs Value',
  nextDecision:'대상 품목·분모·원산지·공개권 및 계정/API 키 범위를 확정할 것. API 키 6개월 만료',
  sourceReference:'https://dataweb.usitc.gov/api-key',
  sourceReferenceAsOf:'2026-11-15',
 }),
 '27':Object.freeze({
  name:'실질 PCE 성장률',status:INFLATION30_STATUS.MERGED_DERIVATION,
  source:'기존 #26과 동일 BEA 실질 PCE 원자료',
  mergedWith:'26',nextDecision:'#26에서 파생 계산만 고려, 원자료·가중치 중복 금지',
 }),
 '30':Object.freeze({
  name:'공급 부족',status:INFLATION30_STATUS.DEFERRED_DEFINITION,
  source:'Census M3 주문잔고·재고·출하, Fed G.17 가동률',
  nextDecision:'수요 효과 통제·시차·단위·파생 정의 및 사용자 승인 필요. 주문잔고를 공급 부족으로 간주하지 않음',
  sourceReference:'https://www.census.gov/manufacturing/m3/definitions/index.html',
  sourceReferenceAsOf:'2026-11-15',
 }),
});

const outcomeOnly=new Set(['22','23']);
const correlatedPairs=Object.freeze([
 Object.freeze(['1','2']), // WTI vs gasoline transmission, not identical sources
 Object.freeze(['9','11']), // grain/feed transmission
 Object.freeze(['5','24']), // steel PPI / final-demand PPI potential overlap
 Object.freeze(['21','1']), // aggregate GSCPI vs input shock: empirical test required
 Object.freeze(['24','25']), // final- vs intermediate-demand PPI
 Object.freeze(['12','13']), // wage vs employment cost
]);

function validateSources(){
 const ids19=INFLATION_CAUSAL_19.map(x=>x.id);
 const ids7=INFLATION_CANDIDATES_7.map(x=>x.id);
 const all=[...ids19,...ids7];
 if(ids19.length!==19||ids7.length!==7||new Set(all).size!==26||
   all.some(id=>!/^([1-9]|[12][0-9]|3[01])$/.test(id)||id==='20')||
   ['15','17','27','30'].some(id=>all.includes(id)))
  throw Error('W01_INFLATION_30_CATALOG_SCOPE_DRIFT');
 return new Map([
  ...INFLATION_CAUSAL_19.map(x=>[x.id,{...x,status:INFLATION30_STATUS.CATALOG_19}]),
  ...INFLATION_CANDIDATES_7.map(x=>[x.id,{...x,status:INFLATION30_STATUS.CANDIDATE_7}]),
 ]);
}

const sources=validateSources();
export const INFLATION30_CANDIDATES=Object.freeze(
 Array.from({length:31},(_,i)=>String(i+1)).filter(id=>id!=='20').map(id=>{
  const special=exceptions[id];
  const normal=sources.get(id);
  if(!special&&!normal)throw Error('W01_INFLATION_30_MISSING_CANDIDATE_'+id);
  const status=special?.status??normal.status;
  const row={
   id,
   name:special?.name??normal.name,
   source:special?.source??normal.source??normal.provider,
   series:normal?.series??null,
   sourceGroup:status,
   originalSourceCatalog:normal?.status??null,
   researchRole:outcomeOnly.has(id)?'OUTCOME_OBSERVATION':
     status===INFLATION30_STATUS.MERGED_DERIVATION?'DUPLICATE_DERIVED_VIEW':
     status===INFLATION30_STATUS.DEFERRED_DEFINITION?'DEFINITION_UNRESOLVED':
     'PROVISIONAL_MODEL_CANDIDATE',
   finalAdoption:'UNDECIDED',
   weight:null,
   normalization:null,
   mergedWith:special?.mergedWith??null,
   nextDecision:special?.nextDecision??(
    outcomeOnly.has(id)?'CPI 결과·후행 관측 전용. 선행 원인 점수에 직접 가중하지 않음':
    '시점·중복·공개권·예측 유효성 검증 후 최종 채택 여부 결정'),
   ...(special?.sourceReference?{
    sourceReference:special.sourceReference,sourceReferenceAsOf:special.sourceReferenceAsOf
   }:{}),
   ...(special?.sourceEdition?{sourceEdition:special.sourceEdition}:{})
  };
  return Object.freeze(row);
 })
);

export const INFLATION30_CORRELATION_REVIEW=correlatedPairs;
export function summarizeInflation30Screen(){
 const counts=Object.fromEntries(Object.values(INFLATION30_STATUS).map(s=>
  [s,INFLATION30_CANDIDATES.filter(x=>x.sourceGroup===s).length]));
 const total=Object.values(counts).reduce((a,b)=>a+b,0);
 if(total!==30||counts.CATALOG_19!==19||counts.CANDIDATE_7!==7||
  counts.MERGED_DERIVATION!==1||counts.DEFERRED_DEFINITION!==3)
  throw Error('W01_INFLATION_30_DENOMINATOR_DRIFT');
 return Object.freeze({
  scope:'RESEARCH_ONLY_NOT_APPROVED',originalCandidates:31,
  excluded:Object.freeze(['20']),evaluatedCandidates:total,counts:Object.freeze(counts),
  independentRawCandidates:26,duplicates:Object.freeze([{id:'27',with:'26'}]),
  outcomeOnly:Object.freeze(['22','23']),
  unresolvedDefinitions:Object.freeze(['15','17','30']),
  approvedWeights:0,approvedCompositeFormula:false,
 });
}
