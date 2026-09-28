export const EMPLOYMENT_R4_SHADOW_SCHEMA_VERSION = 1;
export const EMPLOYMENT_R4_SHADOW_STORE_REVISION = "EMP-R4-SHADOW-STORE-R1E";
export const EMPLOYMENT_R4_SHADOW_COLLECTOR_REVISION = "EMP-R4-SHADOW-COLLECTOR-R1G";
export const EMPLOYMENT_R4_SHADOW_WORKER_REVISION = "EMP-R4-SHADOW-WORKER-R2";
export const EMPLOYMENT_R4_SHADOW_PROVIDER_REVISION = "EMP-R4-SHADOW-PROVIDER-R2";

export const EMPLOYMENT_R4_SHADOW_TABLES = Object.freeze({
  current: "market_score_employment_r4_shadow_current_v1",
  history: "market_score_employment_r4_shadow_history_v1",
  runs: "market_score_employment_r4_shadow_runs_v1",
  lock: "market_score_employment_r4_shadow_lock_v1",
});

export const EMPLOYMENT_R4_PIT_CLASSES = Object.freeze({
  historicalCurrentOrRevised: "HISTORICAL_CURRENT_OR_REVISED_PROVIDER_HISTORY",
  historicalCurrentVintage: "HISTORICAL_CURRENT_VINTAGE",
  historicalOfficialArchiveVintage: "HISTORICAL_OFFICIAL_ARCHIVE_VINTAGE",
  forwardObserved: "FORWARD_OBSERVED_TRUE_PIT",
});

export const EMPLOYMENT_R4_CORE_STATES = Object.freeze([
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
]);

export const EMPLOYMENT_R4_DIFFUSION_SERIES = Object.freeze({
  SMS00000000000000021: Object.freeze({logicalSeriesId:"STATE_EMP_DIFFUSION_1M", geographyCode:"ALL_STATES", horizonMonths:1}),
  SMS00000000000000022: Object.freeze({logicalSeriesId:"STATE_EMP_DIFFUSION_3M", geographyCode:"ALL_STATES", horizonMonths:3}),
  SMS00000000000000023: Object.freeze({logicalSeriesId:"STATE_EMP_DIFFUSION_6M", geographyCode:"ALL_STATES", horizonMonths:6}),
  SMS00000000000000024: Object.freeze({logicalSeriesId:"STATE_EMP_DIFFUSION_12M", geographyCode:"ALL_STATES", horizonMonths:12}),
  SMS99999990000000021: Object.freeze({logicalSeriesId:"MSA_EMP_DIFFUSION_1M", geographyCode:"ALL_MSAS", horizonMonths:1}),
  SMS99999990000000022: Object.freeze({logicalSeriesId:"MSA_EMP_DIFFUSION_3M", geographyCode:"ALL_MSAS", horizonMonths:3}),
  SMS99999990000000023: Object.freeze({logicalSeriesId:"MSA_EMP_DIFFUSION_6M", geographyCode:"ALL_MSAS", horizonMonths:6}),
  SMS99999990000000024: Object.freeze({logicalSeriesId:"MSA_EMP_DIFFUSION_12M", geographyCode:"ALL_MSAS", horizonMonths:12}),
});

export const EMPLOYMENT_R4_SHADOW_CONTRACT = Object.freeze({
  activeEmploymentMethodologyChanged: false,
  overallEmploymentWeightChanged: false,
  publicUiChanged: false,
  scoreComputationInCollector: false,
  providers: Object.freeze(["DOL_ETA", "BLS_CES_SAE"]),
  bedCollection: "DEFERRED_STRUCTURAL_CANDIDATE",
});
