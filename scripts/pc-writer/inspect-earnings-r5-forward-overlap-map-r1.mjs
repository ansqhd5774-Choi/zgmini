export const E1_R5_FORWARD_OVERLAP_MAP_R1_VERSION="E1-R5-FORWARD-OVERLAP-MAP-R1";

export const E1_R5_FORWARD_OVERLAP_MAP_R1_CONTRACT=Object.freeze({
  researchOnly:true,
  productionActivation:false,
  networkCalls:0,
  dbWrites:0,
  formulaChanged:false,
  weightChanged:false,
  normalizationChanged:false,
  productionBaseline:"E1-R4",
  gatePassThresholdsDefined:false,
});

export const E1_R5_G4_COMPONENT_MAP=Object.freeze({
  S1:Object.freeze({
    componentKey:"epsGrowthStrength",
    label:"EPS 성장 강도",
    source:"SEC",
    approvedSemantic:"CROSS_SECTIONAL_MEDIAN_SYMMETRIC_CHANGE_CURRENT_VS_PRIOR_YEAR_DILUTED_EPS",
    exactResearchInput:"E1_R5_FISCAL_COMMON_ANCHOR_SEC_COMPANY_FACTS",
    existingE1R4StoredMetric:"epsGrowth",
    e1r4Use:"OVERLAP_PROXY_ONLY",
    reason:"E1-R4 uses a calendar-frame stored metric while approved E1-R5 S1 uses the issuer-fiscal common-anchor selector; do not relabel E1-R4 history as exact S1 PIT history.",
  }),
  S2:Object.freeze({
    componentKey:"revenueGrowth",
    label:"매출 성장률",
    source:"SEC",
    approvedSemantic:"CROSS_SECTIONAL_MEDIAN_PERCENT_CHANGE_CURRENT_VS_PRIOR_YEAR_REVENUE",
    exactResearchInput:"E1_R5_FISCAL_COMMON_ANCHOR_SEC_COMPANY_FACTS",
    existingE1R4StoredMetric:"revenueGrowth",
    e1r4Use:"OVERLAP_PROXY_ONLY",
    reason:"E1-R4 uses a calendar-frame signed-change metric while approved E1-R5 S2 uses issuer-fiscal common-anchor percent change; use only as descriptive overlap infrastructure.",
  }),
  S6:Object.freeze({
    componentKey:"beaCorporateProfitGrowth",
    label:"미국 전체 기업이익 성장",
    source:"BEA",
    approvedSemantic:"SYMMETRIC_YEAR_OVER_YEAR_CHANGE_OF_A051RC",
    seriesCode:"A051RC",
    localFile:"manual-input/e1-r5/incoming/bea-section1-all.xlsx",
    parser:"parseBeaA051rcQuarterlyWorkbook",
    currentVintageOnly:true,
    lookAheadSafeHistorical:false,
    e1r4Use:"NOT_APPLICABLE",
    reason:"S6 is a separate BEA quarterly series and must retain vintage/release evidence for any PIT overlap test.",
  }),
  Growth:Object.freeze({
    componentKey:"growthDomain",
    label:"Growth domain",
    source:"ZGMINI_STORED_MARKET_SNAPSHOTS",
    approvedSemantic:"STORED_PUBLISHED_GROWTH_DOMAIN_SCORE",
    localTable:"market_public_snapshots_v1",
    e1r4Use:"DIRECT_STORED_DOMAIN_HISTORY",
  }),
});

const finite=value=>typeof value==="number"&&Number.isFinite(value);

export function buildG4OverlapReadiness({
  cfoRevisionCount=0,
  s1AlignedCount=0,
  s2AlignedCount=0,
  s6AlignedCount=0,
  growthAlignedCount=0,
}={}){
  const counts={
    cfoRevisionCount:Number(cfoRevisionCount)||0,
    s1AlignedCount:Number(s1AlignedCount)||0,
    s2AlignedCount:Number(s2AlignedCount)||0,
    s6AlignedCount:Number(s6AlignedCount)||0,
    growthAlignedCount:Number(growthAlignedCount)||0,
  };
  const mathematicallyMultiPoint=counts.cfoRevisionCount>=2;
  const alignedSeries={
    S1:counts.s1AlignedCount,
    S2:counts.s2AlignedCount,
    S6:counts.s6AlignedCount,
    Growth:counts.growthAlignedCount,
  };
  const sourceMapComplete=Object.keys(E1_R5_G4_COMPONENT_MAP).length===4;
  const allHaveAtLeastTwo=Object.values(alignedSeries).every(value=>finite(value)&&value>=2);
  return {
    version:E1_R5_FORWARD_OVERLAP_MAP_R1_VERSION,
    contract:E1_R5_FORWARD_OVERLAP_MAP_R1_CONTRACT,
    sourceMapComplete,
    counts,
    alignedSeries,
    descriptiveEvaluable:mathematicallyMultiPoint&&allHaveAtLeastTwo,
    status:mathematicallyMultiPoint&&allHaveAtLeastTwo
      ?"DESCRIPTIVE_MULTI_POINT_ALIGNMENT_READY_NO_GATE_THRESHOLD"
      :"NOT_EVALUABLE_INSUFFICIENT_MULTI_PERIOD_ALIGNMENT",
    productionGatePass:false,
  };
}
