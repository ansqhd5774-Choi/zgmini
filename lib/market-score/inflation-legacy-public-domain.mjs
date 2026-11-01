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

// Construct a one-year CURRENT_VINTAGE_ONLY trend exclusively from the same
// four stored diagnostic component-score histories. This is NOT a PIT history.
function legacyTrendFromScoredComponents(rows,asOfDate,score){
  if(!validDate(asOfDate)||!validScore(score))return [];
  const [year,month]=asOfDate.split('-').map(Number);
  const minDate=new Date(asOfDate+'T00:00:00Z');
  minDate.setUTCFullYear(minDate.getUTCFullYear()-1);
  // Include the exact window boundary as well as month ends. A month-end-only
  // series otherwise loses the first partial month of the composite's 1Y view.
  // The normal component check below still excludes an unsupported boundary.
  const anchors=new Set([minDate.toISOString().slice(0,10),asOfDate]);
  for(let back=0;back<13;back++){
    const end=new Date(Date.UTC(year,month-back,0)).toISOString().slice(0,10);
    if(end>=minDate.toISOString().slice(0,10)&&end<asOfDate)anchors.add(end);
  }
  const trend=[];
  for(const date of [...anchors].sort()){
    const points=LEGACY_MARKET_INFLATION_PARTS.map(part=>latestScore(rows[part.id],date));
    if(points.some(point=>point===null))continue;
    const value=points.reduce((sum,point,index)=>sum+point.score*LEGACY_MARKET_INFLATION_PARTS[index].weight,0);
    if(!validScore(value))continue;
    trend.push({label:date,value:date===asOfDate?score:value});
  }
  return trend;
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
    // R2 snapshots are never relabeled. Only four-factor stored-score histories
    // are reconstructed, explicitly retaining the current-vintage limitation.
    trend:matches?legacyTrendFromScoredComponents(rows,asOfDate,aggregate.score):[],
    methodologyVersion:LEGACY_MARKET_INFLATION_METHOD,
    source:'STORED_DIAGNOSTIC_R7',
    freshness:'CURRENT_VINTAGE_ONLY',
    asOfDate:validDate(asOfDate)?asOfDate:null,
    interpretation:'저장 진단의 물가 안정 4개 구성 점수로 계산합니다. 과거 차트는 최신 보관본으로 재계산한 현재 빈티지 이력이며 당시 공개값(PIT)으로 검증되지 않았습니다.',
  };
}
