// Read-only projection of the approved four-part inflationStability diagnostic.
// No reweighting, renormalization, provider calls, or changes to risk Inflation R2.
export const LEGACY_MARKET_INFLATION_METHOD='CM_R1_INFLATION_STABILITY_R7_4FACTOR';
export const LEGACY_MARKET_INFLATION_PARTS=Object.freeze([
  Object.freeze({id:'corePce',name:'근원 PCE',weight:0.35,source:'FRED PCEPILFE'}),
  Object.freeze({id:'coreCpi',name:'근원 CPI',weight:0.25,source:'FRED CPILFESL / PCEPILFE'}),
  Object.freeze({id:'cpi',name:'소비자물가',weight:0.15,source:'FRED CPIAUCSL / PCEPI'}),
  Object.freeze({id:'inflationExpectations',name:'기대 인플레이션',weight:0.25,source:'FRED EXPINF5YR'}),
]);
const validScore=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
function latestScore(rows,asOfDate){
  let chosen=null;
  for(const row of Array.isArray(rows)?rows:[]){
    if(!validDate(row?.observationDate)||row.observationDate>asOfDate||!validScore(row?.value))continue;
    if(!chosen||row.observationDate>chosen.observationDate)chosen={observationDate:row.observationDate,score:row.value};
  }
  return chosen;
}
export function buildLegacyMarketInflationDomain(diagnostic,asOfDate){
  const aggregate=diagnostic?.snapshot?.diagnostics?.inflationStability;
  const artifacts=diagnostic?.artifacts??{};
  const batch=artifacts.inflationBatchA??{};
  const rows={
    corePce:batch.corePce?.score,
    coreCpi:batch.coreCpi?.score,
    cpi:batch.headlineCpi?.score,
    inflationExpectations:artifacts.inflationExpectations?.score,
  };
  const indicators=LEGACY_MARKET_INFLATION_PARTS.map(part=>{
    const observation=validDate(asOfDate)?latestScore(rows[part.id],asOfDate):null;
    return {
      id:part.id,name:part.name,label:part.name,
      status:observation?'READY':'PARTIAL',score:observation?.score??null,
      observationDate:observation?.observationDate??null,
      source:part.source,
    };
  });
  const complete=indicators.every(item=>item.status==='READY');
  const computed=complete?indicators.reduce((sum,item,index)=>sum+item.score*LEGACY_MARKET_INFLATION_PARTS[index].weight,0):null;
  const matches=complete&&aggregate?.status==='READY'&&validScore(aggregate?.score)&&Math.abs(computed-aggregate.score)<1e-6;
  const missing=indicators.filter(item=>item.status!=='READY').map(item=>item.id);
  if(complete&&!matches)missing.push('DIAGNOSTIC_AGGREGATE_MISMATCH');
  return {
    status:matches?'READY':'PARTIAL',
    score:matches?aggregate.score:null,
    missingFactors:missing,
    indicators,
    // R2 historical trend cannot be relabeled as legacy four-factor history.
    trend:matches?[{label:asOfDate,value:aggregate.score}]:[],
    methodologyVersion:LEGACY_MARKET_INFLATION_METHOD,
    source:'STORED_DIAGNOSTIC_R7',
    freshness:'CURRENT_VINTAGE_ONLY',
    asOfDate:validDate(asOfDate)?asOfDate:null,
    interpretation:'저장 진단의 물가 안정 4개 구성 점수로 계산한 결과입니다.',
  };
}
