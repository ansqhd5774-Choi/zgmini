// Stage 08: an immutable bridge to the user's own 15 original PDF standards.
// This module NEVER consumes the prohibited disclosure data source. It runs
// the original R22 calculators with no fabricated grade inputs, recording why 15 cards
// remain NOT_EVALUATED until source-by-source evidence is verified.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SCORECARD_CATALOG,evaluateCompanyScorecards} from './scorecards/universal-scorecards-r22.mjs';

const CALCULATOR_SHA='973f0c84829c0ab77cead89c717ec99deeec4781c2f04ac458e37cb028033bea';
const PDF_SOURCES=Object.freeze([
 ['INNOVATION','1. 혁신성 최종 기준서 v3.0-OPTIMAL.pdf','8308ff3331073576ac8dd0ebd92733a971c6192e6c4f3fdee85a391796b1eb6f'],
 ['TPVS','2. 기술 발전 속도 최종 기준서.pdf','8af68b858aa7dbb9621a69aca9ba289876ccaade6a4bf112f62d8cc7363fa7e0'],
 ['TAS','3. 기술 우위 점수 최종 기준서.pdf','4c1890deeab709efe9653b900d2f90315c9689b1cd724ed834745d325b2a30a4'],
 ['RRS','4. 대체 저항력 점수 최종 기준서 v2.0-OPTIMAL.pdf','86dab55f2fd3b4f834324acbb4dc3fd3775de3963354769f7effccea0716b958'],
 ['PS','5. 파이프라인 점수 최종 기준서.pdf','d6d7f3b2dd05a8f00c3ac43c6253d99dfb0568f1596e32f01701d660c06e6d65'],
 ['PAS','6. 파트너십 점수 최종 기준서 v2.0-OPTIMAL.pdf','34c039b9535ec6bde87ca6ec44405a522b86d86d8e2ac45a157565fb4f9a9ac6'],
 ['SS','7. 시너지 점수 최종 기준서 v2.0-OPTIMAL.pdf','1bf39c816e6be45c869f02984e0bda604dabcbce8dbf1a2f174ca0fca2fde06c'],
 ['FVS','8. 미래 가치 점수 최종 기준서.pdf','c93876ac6315a2efb734eb542dd6ca29e3f99a507a5e326924d219dc60e2e302'],
 ['EAS','9. 실적 개근 점수 최종 기준서 v2.0-OPTIMAL.pdf','6351427f5643110e6cc3b63f5bfa047c43e1fafb00cf2373850052bcb0ec51b7'],
 ['BMS','10. 기본 지표 점수 최종 기준서 v2.0-OPTIMAL.pdf','1e74a4386e52595f59bd04c7102eb98b14c08188989cfab69bca28b87e76a9ed'],
 ['TEE','11. 기술 확장 및 진화 점수 최종 기준서 v2.0-OPTIMAL.pdf','f2b5c4355e4c8dffbf8cd17e3a92de861427dae17d4c742e9b7bc5f491e9d4d3'],
 ['RAS','12. 규제·인허가 포지션 점수 최종 기준서 v3.0-UNIVERSAL-OPTIMAL.pdf','3e51207a4f7cdf7d04df5dc7f8b030e3cbd1d3fe850c6d675d9b233ec544be85'],
 ['IPLS','13. IP·라이선스 자산 파워 점수 최종 기준서 v7.0-UNIVERSAL-OPTIMAL.pdf','2f8b283f08b14434db9dee2f58da7db72d01e5bba109a38e56c13ac21feafad1'],
 ['LCSS','14. 현금 생존력 및 자본관리 점수 최종 기준서 v4.0-OPTIMAL.pdf','9820b921552e751e68e2c862814823f742205c048e65b0e7da7e3eeb4ad98f4d'],
 ['TBAS','15. 기술적 매수 매력 점수 최종 기준서 v2.0-FAST-OPTIMAL.pdf','116ac56db0b2026f8c6a2a09593442667206164852d4fd3cf072540360447dac'],
]);
const NEEDS={
 EAS:'TIPRANKS_EARNINGS_HISTORY_ONLY',
 BMS:'FINVIZ_POINT_IN_TIME_SINGLE_SOURCE_ONLY',
 LCSS:'ORIGINAL_MANDATORY_SOURCE_PROHIBITED_NO_APPROVED_REPLACEMENT',
 TBAS:'LICENSED_SINGLE_SOURCE_DAILY_OHLCV_AND_200_DAY_HISTORY',
};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const kstAsOf=utc=>{
 const milliseconds=Date.parse(utc||'');
 if(!Number.isFinite(milliseconds))throw Error('STAGE8_INVALID_RETRIEVED_AT');
 return new Date(milliseconds+9*3600_000).toISOString().slice(0,19)+'+09:00';
};

export function verifyStage8Sources({calculatorUrl=new URL('./scorecards/universal-scorecards-r22.mjs',import.meta.url),
 standardsUrl=new URL('./scorecards/standards/',import.meta.url)}={}){
 let calculatorStatus='PASS';
 try{if(sha(readFileSync(calculatorUrl))!==CALCULATOR_SHA)calculatorStatus='HASH_MISMATCH'}
 catch{calculatorStatus='FILE_NOT_AVAILABLE'}
 const files=PDF_SOURCES.map(([id,filename,expectedHash])=>{
  let status='PASS';
  try{if(sha(readFileSync(new URL(filename,standardsUrl)))!==expectedHash)status='HASH_MISMATCH'}
  catch{status='FILE_NOT_AVAILABLE'}
  return {id,filename,status};
 });
 const catalogMatches=SCORECARD_CATALOG.length===PDF_SOURCES.length&&
  SCORECARD_CATALOG.every((c,i)=>c.id===PDF_SOURCES[i][0]&&
   c.dimensions.reduce((sum,d)=>sum+d.weight,0)===100);
 const passed=files.filter(f=>f.status==='PASS').length;
 return {status:calculatorStatus==='PASS'&&passed===15&&catalogMatches?'PASS':'BLOCKED',
  calculatorStatus,catalogMatches,standardsPassed:passed,standardsExpected:PDF_SOURCES.length,files};
}

export function buildStage8ScorecardBridge({businessQuant,productEvidence,retrievedAt}={}){
 const integrity=verifyStage8Sources();
 const exact=SCORECARD_CATALOG.filter(s=>s.implementation==='EXACT_CALCULATOR').length;
 // Stage 8 retains screened robotics leads whether or not financial statements
 // are available. Industry-screen results are NOT confirmed product businesses.
 const allowedLanes=new Set(['ROBOTICS_INDUSTRY_CANDIDATE','INDUSTRIAL_AUTOMATION_REVIEW']);
 const companies=[];const seen=new Set();
 for(const item of businessQuant?.screenedMatches||[]){
  if(!allowedLanes.has(item.screeningLane)||!item.ticker||!item.market)continue;
  const key=item.market+':'+item.ticker;
  if(seen.has(key))continue;
  seen.add(key);companies.push(item);
 }
 const asOf=kstAsOf(retrievedAt);
 const candidates=companies.map(item=>{
  // Run each of the 15 original calculators with explicit MISSING inputs, not
  // invented field grades. Industry discovery does not prove any rubric grade.
  const result=integrity.status==='PASS'?
   evaluateCompanyScorecards({ticker:item.ticker,asOf,sources:[],inputs:{},newsEvents:[]}):null;
  const cards=SCORECARD_CATALOG.map(spec=>{
   const fromCalculator=result?.scorecards.find(c=>c.id===spec.id);
   return {id:spec.id,name:spec.name,standard:spec.standard,
    implementation:spec.implementation,status:fromCalculator?.status||'NOT_EVALUATED',
    score:null,reason:integrity.status==='PASS'?fromCalculator?.reason||'SOURCE_EVIDENCE_REQUIRED':'SOURCE_INTEGRITY_BLOCKED',
    evidenceNeeded:NEEDS[spec.id]||'DATED_BUSINESS_TECHNICAL_OR_INDEPENDENT_PROOF_REQUIRED'};
  });
  const observed=(productEvidence?.items||[]).find(x=>x.ticker===item.ticker&&x.market===item.market);
  return {ticker:item.ticker,market:item.market,company:item.company||item.ticker,
   asOf,candidateSource:'BUSINESSQUANT_PRIVATE_INDUSTRY_SCREEN',
   issuerVerified:false,productBusinessVerified:false,stage7ObservedFacts:0,
   issuerProductClaimStatus:observed?.status||'NOT_CHECKED',
   issuerProductSegment:observed?.status==='ISSUER_PRODUCT_CLAIM_OBSERVED'?observed.segment:null,
   cards,graded:cards.filter(c=>c.score!==null).length,
   status:integrity.status!=='PASS'?'SOURCE_INTEGRITY_BLOCKED':'CANDIDATE_ONLY_EVIDENCE_GRADING_NOT_PERFORMED'};
 });
 return {status:integrity.status!=='PASS'?'BLOCKED_SOURCE_INTEGRITY':
   candidates.length?'ORIGINAL_CALCULATORS_CONNECTED_SCORES_NOT_EVALUATED':'NO_SCREENED_ROBOTICS_CANDIDATES',
  version:'M2_R21_NO_PROHIBITED_SOURCE_STAGE8',asOf,integrity,
  catalog:SCORECARD_CATALOG.map(c=>({index:c.index,id:c.id,name:c.name,standard:c.standard,
   implementation:c.implementation,evidenceNeeded:NEEDS[c.id]||'DATED_BUSINESS_TECHNICAL_OR_INDEPENDENT_PROOF_REQUIRED'})),
  exactCount:exact,partialCount:SCORECARD_CATALOG.length-exact,
  companyCount:candidates.length,calculatedScores:candidates.reduce((s,c)=>s+c.graded,0),
  possibleScorecards:candidates.length*SCORECARD_CATALOG.length,candidates,
  consolidatedInvestmentScore:null,ranking:null,trades:null,
  limitations:'Industry-screen leads are not issuer or humanoid-revenue verification. All 15 scores remain unevaluated until allowable rubric-specific evidence exists. LCSS original mandatory source is prohibited; no alternative has been approved.'};
}
