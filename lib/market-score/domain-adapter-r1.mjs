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
  return fromScore(id,name,source,{
    score:value.score??null,
    status:value.status??"PARTIAL",
    missingFactors:value.missingFactors??value.missing??[],
    trend:value.trend??[],
    indicators:value.indicators??[],
    freshness:value.freshness??null,
    updatedAt:value.updatedAt??null,
    interpretation:value.interpretation??null,
  });
}

export function buildCmR1DomainResults({
  diagnostics={},
  employment=null,
  rates=null,
  fundFlows=null,
  dollarFx=null,
  publicDomains={},
}={}){
  return [
    fromDiagnostic("inflation","물가","inflationStability",diagnostics),
    fromScore("employment","고용","EMPLOYMENT_R53_8",{
      score:employment?.current?.score??employment?.score??null,
      status:employment?.status==="READY"?"READY":(employment?"PARTIAL":"UNAVAILABLE"),
      missingFactors:employment?.reason?[employment.reason]:[],
      trend:Array.isArray(employment?.rows)
        ? employment.rows.filter(row=>row.observationDate<=employment?.current?.observationDate&&finiteScore(row.score))
          .map(row=>({label:row.observationDate,value:row.score}))
        : employment?.chart??[],
    }),
    fromScore("rates","금리","RATE_R2",{
      score:rates?.score??null,
      status:rates?.status??(rates?"PARTIAL":"UNAVAILABLE"),
      missingFactors:rates?.reason?[rates.reason]:[],
      trend:rates?.trend??[],
      indicators:rates?.indicators??[],
      freshness:rates?.freshness??null,
      updatedAt:rates?.updatedAt??rates?.observationDate??null,
      interpretation:rates?.interpretation??null,
    }),
    fromDiagnostic("credit","채권·신용","creditRiskDefense",diagnostics),
    fromDiagnostic("growth","경기","recessionDefense",diagnostics),

    // CM-R1 forbids inventing a numeric consumer aggregation.
    // Stage11 validated Real PCE / Retail components, but did not recover an approved
    // executable single consumer-domain score. It must be supplied explicitly later.
    explicitDomain("consumption","소비","CONSUMPTION_C1",publicDomains.consumption),

    {...explicitDomain("earnings","실적","EARNINGS_E1",publicDomains.earnings),
      methodologyVersion:publicDomains.earnings?.methodologyVersion??null},
    fromDiagnostic("liquidity","유동성","liquidityCrisisDefense",diagnostics),

    fromScore("fundFlows","자금흐름","FUND_FLOW_R53_3",{
      score:fundFlows?.score??null,
      status:fundFlows?.status??(fundFlows?"PARTIAL":"UNAVAILABLE"),
      missingFactors:fundFlows?.reason?[fundFlows.reason]:[],
      trend:(fundFlows?.rows??[])
        .filter(row=>row.observationDate<=fundFlows?.observationDate&&finiteScore(row.score)&&finiteScore(row.shock))
        .map(row=>({label:row.observationDate,value:row.score})),
      indicators:(fundFlows?.rows??[])
        .filter(row=>fundFlows?.status==="READY"&&row.observationDate===fundFlows?.observationDate)
        .map(row=>({name:"등록펀드 순유입",status:typeof row.netFlowRatio==="number"&&Number.isFinite(row.netFlowRatio)?"READY":"PARTIAL",value:typeof row.netFlowRatio==="number"&&Number.isFinite(row.netFlowRatio)?row.netFlowRatio:null,unit:"%",observationDate:row.observationDate,source:"SEC Registered Fund Statistics / Section.3_Flows_Table.3.2 / All - Net"})),
      interpretation:"SEC 등록펀드 전체 순유입 / 전월 순자산 비율. 월별 현재 빈티지 관측이며 미국 주식형 펀드만의 값이 아닙니다.",
      updatedAt:fundFlows?.observationDate??null,
    }),

    // Breadth-R2 final public contract. Legacy B1/Equibles is not substituted.
    {...explicitDomain("breadth","수급·폭","ZGMINI_BREADTH_R2_METHOD_R1",publicDomains.breadth),
      methodologyVersion:publicDomains.breadth?.methodologyVersion??null,
      asOfDate:publicDomains.breadth?.asOfDate??null},

    fromScore("dollarFx","달러·환율","DOLLAR_FX_R53_3",{
      score:dollarFx?.score??null,
      status:dollarFx?.status??(dollarFx?"PARTIAL":"UNAVAILABLE"),
      missingFactors:dollarFx?.reason?[dollarFx.reason]:[],
      trend:Array.isArray(dollarFx?.rows)
        ? dollarFx.rows.slice(-12).filter(x=>finiteScore(x?.score)).map(x=>({label:x.observationDate,value:x.score}))
        : [],
    }),

    // supplyShockSafety is intentionally NOT substituted for the public
    // 유가·원자재 domain because CM-R1 preserves semantic separation.
    explicitDomain("commodities","유가·원자재","COMMODITIES_K1",publicDomains.commodities),
  ];
}
