export const EMPLOYMENT_R4_FORWARD_REVISION = "EMP-R4-FORWARD-EVAL-R1";

export const EMPLOYMENT_R4_FORWARD_FLOORS = Object.freeze({
  claims: Object.freeze({
    earlyForwardObservations: 13,
    finalForwardObservations: 26,
    normalizerHistoryObservations: 52,
    rawHistoryWeeksBeforeFirstForwardScore: 108,
  }),
  geographic: Object.freeze({
    earlyForwardObservations: 3,
    finalForwardObservations: 6,
  }),
});

export const EMPLOYMENT_R4_FORWARD_FAMILIES = Object.freeze({
  claims: Object.freeze({
    id: "STATE_CLAIMS_BREADTH",
    rawCore: "CLAIMS_BREADTH_POSITIVE",
    rawSeries: "STATE_INITIAL_CLAIMS",
    normalization: "CAUSAL_ROBUST_Z_INV",
    comparator: "CAUSAL_PERCENTILE_INV",
    economicDirection: "HIGHER_RAW_IS_WEAKER_EMPLOYMENT",
    independentTargets: Object.freeze(["U3_LEVEL","R53_8","PAYROLL_TREND"]),
    leadsMonths: Object.freeze([0,1,3]),
  }),
  geographic: Object.freeze({
    id: "GEOGRAPHIC_EMPLOYMENT_BREADTH",
    primarySeries: "STATE_EMP_DIFFUSION_3M",
    challengerSeries: "MSA_EMP_DIFFUSION_3M",
    normalization: "RAW_DIRECT_0_100",
    economicDirection: "HIGHER_IS_STRONGER_EMPLOYMENT",
    primaryTarget: "U3_LEVEL",
    secondaryTarget: "R53_8",
    auxiliaryTarget: "PAYROLL_TREND",
    leadsMonths: Object.freeze([0,1,3]),
    familyCap: "STATE_AND_MSA_NOT_TWO_INDEPENDENT_FULL_WEIGHT_FAMILIES",
  }),
});

export const EMPLOYMENT_R4_FORWARD_CONTRACT = Object.freeze({
  storedDataOnly: true,
  providerCalls: 0,
  collectorScoreCalculation: 0,
  evaluatorProviderCalls: 0,
  activeMethodologyChanged: false,
  overallEmploymentWeightChanged: false,
  publicUiChanged: false,
  bedCollection: "DEFERRED_STRUCTURAL_CANDIDATE",
  historicalBackfillClass: Object.freeze({
    claims: "HISTORICAL_CURRENT_OR_REVISED_PROVIDER_HISTORY",
    geographic: "HISTORICAL_CURRENT_VINTAGE",
  }),
  decisiveCandidatePitClass: "FORWARD_OBSERVED_TRUE_PIT",
  currentVintageNeverRelabeledFirstKnown: true,
  noAutomaticPassThreshold: true,
});
