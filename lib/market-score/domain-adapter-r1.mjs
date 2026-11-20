const finiteScore=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=100;

const normalizeStatus=value=>{
  if(value==="READY")return "READY";
  if(value==="UNAVAILABLE")return "UNAVAILABLE";
  return "PARTIAL";
};

function fromScore(id,name,source,{score=null,status="PARTIAL",missingFactors=[],trend=[],indicators=[],freshness=null,updatedAt=null,interpretation=null}={}){
  const ready=status==="READY"&&finiteScore(score);
  return {
    id,name,
    score:ready?score:null,
    status:ready?"READY":normalizeStatus(status),
    state:null,
    source,
    interpretation,
    trend:Array.isArray(trend)?trend:[],
    indicators:Array.isArray(indicators)?indicators:[],
    freshness,
    updatedAt,
    missingFactors:Array.isArray(missingFactors)?missingFactors:[],
  };
}

function fromDiagnostic(id,name,key,diagnostics){
  const d=diagnostics?.[key]??null;
  return fromScore(id,name,key,{
    score:d?.score??null,
    status:d?.status==="READY"?"READY":(d?"PARTIAL":"UNAVAILABLE"),
    missingFactors:d?.missing??[],
  });
}

function explicitDomain(id,name,source,value){
  if(!value)return fromScore(id,name,source,{status:"UNAVAILABLE",missingFactors:["APPROVED_PUBLIC_DOMAIN_PRODUCER_NOT_WIRED"]});
  const base=fromScore(id,name,source,{
    score:value.score??null,
    status:value.status??"PARTIAL",
    missingFactors:value.missingFactors??value.missing??[],
    trend:value.trend??[],
    indicators:value.indicators??[],
  });
  return {
    ...base,
    freshness:value.freshness??base.freshness??null,
    updatedAt:value.updatedAt??base.updatedAt??null,
    interpretation:value.interpretation??base.interpretation??null,
    methodologyVersion:value.methodologyVersion??base.methodologyVersion??null,
    asOfDate:value.asOfDate??base.asOfDate??null,
    ...(id==='breadth'&&value.paidSource?{paidSource:value.paidSource}:{}),
  };
}

function employmentPublicDomain(employment){
  const hasExplicitScore=employment&&Object.prototype.hasOwnProperty.call(employment,"score");
  const score=hasExplicitScore?employment?.score:employment?.current?.score??null;
  const trend=Array.isArray(employment?.trend)
    ? employment.trend
    : Array.isArray(employment?.rows)
      ? employment.rows.filter(row=>row.observationDate<=employment?.current?.observationDate&&finiteScore(row.score))
        .map(row=>({label:row.observationDate,value:row.score}))
      : employment?.chart??[];
  const base=fromScore("employment","고용",employment?.methodologyVersion??"EMPLOYMENT_R53_8",{
    score,
    status:employment?.status==="READY"?"READY":(employment?"PARTIAL":"UNAVAILABLE"),
    missingFactors:employment?.missingFactors??(employment?.reason?[employment.reason]:[]),
    trend,
    indicators:employment?.indicators??[],
    freshness:employment?.freshness??null,
    updatedAt:employment?.updatedAt??null,
    interpretation:employment?.interpretation??null,
  });
  return {
    ...base,
    methodologyVersion:employment?.methodologyVersion??"EMPLOYMENT_R53_8",
    asOfDate:employment?.asOfDate??null,
  };
}

// Existing indicator.trend display contract: project only already-computed
// R54 factor scores (never SEC raw monthly rows or a synthetic headline trend).
// CURRENT_VINTAGE_ONLY, not independently stored historical PIT events.
// A source file's publication date is NOT the observation month or PC/D1 publish time.
// Only the valid, stored SEC release provenance for a READY R54 score may be exposed.
function r54SourceReleaseDate(fundFlows){
 const date=fundFlows?.sourceReleaseDate,observed=fundFlows?.observationDate;
 if(fundFlows?.status!=='READY'||typeof date!=='string'||typeof observed!=='string'
    ||!/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(date)
    ||date<observed)return null;
 const parsed=new Date(date+'T00:00:00Z');
 return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date?date:null;
}
const r54MonthIndex=date=>typeof date==='string'&&/^\d{4}-(0[1-9]|1[0-2])-01$/.test(date)
 ?Number(date.slice(0,4))*12+Number(date.slice(5,7))-1:null;
function r54FactorMiniTrend(fundFlows,field){
 const finalMonth=r54MonthIndex(fundFlows?.observationDate);
 if(fundFlows?.status!=='READY'||finalMonth===null||!Array.isArray(fundFlows?.rows))return [];
 const rows=fundFlows.rows.filter(row=>{
  const idx=r54MonthIndex(row?.observationDate);
  return idx!==null&&idx>=finalMonth-12&&idx<=finalMonth;
 });
 // Reject conflicting/ambiguous month rows instead of selecting arbitrarily.
 if(new Set(rows.map(row=>row.observationDate)).size!==rows.length)return [];
 rows.sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
 let previousMonth=null,previousMissing=false;
 return rows.map(row=>{
  const idx=r54MonthIndex(row.observationDate);
  const value=finiteScore(row?.[field])?row[field]:null;
  const breakBefore=previousMonth!==null&&(idx!==previousMonth+1||previousMissing);
  previousMonth=idx;
  previousMissing=value===null;
  return {label:row.observationDate,value,
   status:value===null?'PARTIAL':'READY',...(breakBefore?{breakBefore:true}:{})};
 });
}

export function buildCmR1DomainResults({
  diagnostics={},
  employment=null,
  rates=null,
  credit=null,
  fundFlows=null,
  dollarFx=null,
  publicDomains={},
}= {}){
  const fundFlowCurrent=fundFlows?.status==="READY"&&Array.isArray(fundFlows?.rows)
    ? fundFlows.rows.find(row=>row?.observationDate===fundFlows?.observationDate)??null
    : null;
  const fundFlowIndicator=(id,name,score,value,unit,source,scoreField,extra={})=>({
    id,name,label:name,
    status:finiteScore(score)?"READY":"PARTIAL",
    score:finiteScore(score)?score:null,
    value:typeof value==="number"&&Number.isFinite(value)?value:null,
    unit,observationDate:fundFlows?.observationDate??null,
    source,trend:r54FactorMiniTrend(fundFlows,scoreField),...extra,
  });
  const fundFlowIndicators=fundFlowCurrent?[
    fundFlowIndicator("fund-flow-54-1","전체 등록펀드 순유입",fundFlowCurrent.allNetScore,fundFlowCurrent.allNetRatio,"%","SEC Registered Fund Statistics / Section.3_Flows_Table.3.2 / All - Net","allNetScore"),
    fundFlowIndicator("fund-flow-54-2","순유입 모멘텀",fundFlowCurrent.momentumScore,fundFlowCurrent.netFlowMomentum,"%p","SEC Registered Fund Statistics / Section.3_Flows_Table.3.2 / All - Net MoM","momentumScore"),
    fundFlowIndicator("fund-flow-54-3","인덱스·비인덱스 동반 유입",fundFlowCurrent.participationScore,null,"%","SEC Registered Fund Statistics / Section.3_Flows_Table.3.2 / Index - Net + Non-Index - Net","participationScore",{indexNetRatio:fundFlowCurrent.indexNetRatio,nonIndexNetRatio:fundFlowCurrent.nonIndexNetRatio}),
    fundFlowIndicator("fund-flow-54-4","환매 압력",fundFlowCurrent.redemptionScore,fundFlowCurrent.outflowPressure,"%","SEC Registered Fund Statistics / Section.3_Flows_Table.3.2 / All - Outflow","redemptionScore"),
  ]:[];
  const dollarFxCurrent=dollarFx?.status==="READY"&&Array.isArray(dollarFx?.rows)
    ? dollarFx.rows.find(row=>row?.observationDate===dollarFx?.observationDate)??null
    : null;
  const dollarFxIndicator=(id,name,score,value,unit)=>({
    id,name,label:name,
    status:finiteScore(score)?"READY":"PARTIAL",
    score:finiteScore(score)?score:null,
    value:typeof value==="number"&&Number.isFinite(value)?value:null,
    unit,
    observationDate:dollarFx?.observationDate??null,
    source:"Federal Reserve Broad Dollar Index / DTWEXBGS",
  });
  const dollarFxIndicators=dollarFxCurrent?[
    dollarFxIndicator("dollar-fx-54-1","달러 수준 부담",dollarFxCurrent.levelScore,dollarFxCurrent.broadDollarIndex,"index"),
    dollarFxIndicator("dollar-fx-54-2","단기 달러 모멘텀",dollarFxCurrent.shortMomentumScore,dollarFxCurrent.shortMomentum,"%"),
    dollarFxIndicator("dollar-fx-54-3","중기 달러 모멘텀",dollarFxCurrent.mediumMomentumScore,dollarFxCurrent.mediumMomentum,"%"),
    dollarFxIndicator("dollar-fx-54-4","달러 변동성",dollarFxCurrent.volatilityScore,dollarFxCurrent.volatility20,"%"),
  ]:[];
  return [
    publicDomains.inflation
      ? {...explicitDomain("inflation","물가",publicDomains.inflation?.source??"INFLATION_R2_R29_56",publicDomains.inflation),methodologyVersion:publicDomains.inflation?.methodologyVersion??null}
      : fromDiagnostic("inflation","물가","inflationStability",diagnostics),
    employmentPublicDomain(employment),
    {...fromScore("rates","금리",rates?.modelVersion??"RATE_R3",{
      score:rates?.score??null,
      status:rates?.status??(rates?"PARTIAL":"UNAVAILABLE"),
      missingFactors:rates?.reason?[rates.reason]:[],
      trend:rates?.trend??[],
      indicators:rates?.indicators??[],
      freshness:rates?.freshness??null,
      updatedAt:rates?.updatedAt??rates?.observationDate??null,
      interpretation:rates?.interpretation??null,
    }),modelVersion:rates?.modelVersion??"RATE_R3"},
    credit
      ? {...explicitDomain("credit","채권·신용","CREDIT_R2_NFCI_4FACTOR_R1",credit),methodologyVersion:credit?.methodologyVersion??"CREDIT_R2_NFCI_4FACTOR_R1"}
      : fromDiagnostic("credit","채권·신용","creditRiskDefense",diagnostics),
    publicDomains.growth?.status==="READY"
      ? {...explicitDomain("growth","경기","GROWTH_R2_G16_CANDIDATE_R1",publicDomains.growth),methodologyVersion:publicDomains.growth?.methodologyVersion??"GROWTH_R2_G16_CANDIDATE_R1"}
      : fromDiagnostic("growth","경기","recessionDefense",diagnostics),

    // CM-R1 forbids inventing a numeric consumer aggregation.
    // Stage11 validated Real PCE / Retail components, but did not recover an approved
    // executable single consumer-domain score. It must be supplied explicitly later.
    explicitDomain("consumption","소비",publicDomains.consumption?.methodologyVersion??"CONSUMPTION_R4",publicDomains.consumption),

    {...explicitDomain("earnings","실적","EARNINGS_E1",publicDomains.earnings),
      methodologyVersion:publicDomains.earnings?.methodologyVersion??null,
      // Preserve only explicit metadata. Universe membership is not the number
      // of issuers eligible for every component; never publish raw quality data.
      financialPeriodEnd:publicDomains.earnings?.financialPeriodEnd??null,
      issuerCount:Number.isInteger(publicDomains.earnings?.quality?.issuerCount)&&publicDomains.earnings.quality.issuerCount>=0?publicDomains.earnings.quality.issuerCount:null,
      universeCount:Number.isInteger(publicDomains.earnings?.quality?.universeCount)&&publicDomains.earnings.quality.universeCount>=0?publicDomains.earnings.quality.universeCount:null},
    explicitDomain("liquidity","유동성","LIQUIDITY_D3_ACTIVE_PUBLIC_R1",publicDomains.liquidity),

    {...fromScore("fundFlows","자금흐름","FUND_FLOW_R54_1",{
      score:fundFlows?.score??null,
      status:fundFlows?.status??(fundFlows?"PARTIAL":"UNAVAILABLE"),
      missingFactors:fundFlows?.reason?[fundFlows.reason]:[],
      trend:(fundFlows?.rows??[])
        .filter(row=>row.observationDate<=fundFlows?.observationDate&&finiteScore(row.score)&&typeof row?.shock==="number"&&Number.isFinite(row.shock))
        .map(row=>({label:row.observationDate,value:row.score})),
      indicators:fundFlowIndicators,
      interpretation:"SEC 등록펀드의 전체 순유입, 순유입 모멘텀, 인덱스·비인덱스 동반 유입, 환매 압력을 저장 이력 기준으로 종합합니다.",
      updatedAt:fundFlows?.observationDate??null,
    }),methodologyVersion:fundFlows?.methodologyVersion??"FUND_FLOW_R54_1",
      // SEC monthly observation period, never the API retrieval or release date.
      observationDate:fundFlows?.observationDate??null,
      sourceReleaseDate:r54SourceReleaseDate(fundFlows)},

    // B1-R4 public contract. Preserve stored row provenance; never invent a provider.
    {...explicitDomain("breadth","수급·폭",publicDomains.breadth?.source??"D1_STORED_BREADTH_PRICE_VOLUME",publicDomains.breadth),
      methodologyVersion:publicDomains.breadth?.methodologyVersion??null,
      asOfDate:publicDomains.breadth?.asOfDate??null,
      observationDate:publicDomains.breadth?.observationDate??null},

    {...fromScore("dollarFx","달러·환율","DOLLAR_FX_R54_1",{
      score:dollarFx?.score??null,
      status:dollarFx?.status??(dollarFx?"PARTIAL":"UNAVAILABLE"),
      missingFactors:dollarFx?.reason?[dollarFx.reason]:[],
      trend:Array.isArray(dollarFx?.rows)
        ? dollarFx.rows.slice(-370).filter(x=>finiteScore(x?.score)).map(x=>({label:x.observationDate,value:x.score}))
        : [],
      indicators:dollarFxIndicators,
      interpretation:"Broad Dollar Index의 수준, 20일·60일 모멘텀, 20일 변동성을 저장 이력 percentile로 평가합니다.",
      updatedAt:dollarFx?.observationDate??null,
    }),methodologyVersion:dollarFx?.methodologyVersion??"DOLLAR_FX_R54_1",
      // The official stored DTWEXBGS observation, never the API evaluation day.
      observationDate:dollarFx?.observationDate??null},

    // supplyShockSafety is intentionally NOT substituted for the public
    // 유가·원자재 domain because CM-R1 preserves semantic separation.
    explicitDomain("commodities","유가·원자재","COMMODITIES_K1",publicDomains.commodities),
  ];
}
