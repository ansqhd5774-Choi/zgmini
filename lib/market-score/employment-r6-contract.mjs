
import { EMPLOYMENT_R4_SHADOW_TABLES } from "./employment-r4-shadow-contract.mjs";

export const EMPLOYMENT_R6_COLLECTOR_REVISION = "EMP-R6-COLLECTOR-R1";
export const EMPLOYMENT_R6_STORE_REVISION = "EMP-R6-STORE-R1";
export const EMPLOYMENT_R6_SCHEDULER_REVISION = "EMP-R6-SCHEDULER-R1";
export const EMPLOYMENT_R6_PROVIDER_REVISION = "EMP-R6-PROVIDER-R1";

export const EMPLOYMENT_R6_TABLES = Object.freeze({
  observationCurrent: EMPLOYMENT_R4_SHADOW_TABLES.current,
  observationHistory: EMPLOYMENT_R4_SHADOW_TABLES.history,
  runs: EMPLOYMENT_R4_SHADOW_TABLES.runs,
  lock: EMPLOYMENT_R4_SHADOW_TABLES.lock,
  rawSnapshot: "market_score_employment_r6_raw_snapshot_v1",
  featureHistory: "market_score_employment_r6_feature_history_v1",
  readModel: "market_score_employment_r6_read_model_v1",
  readPointer: "market_score_employment_r6_read_pointer_v1",
});

export const EMPLOYMENT_R6_GROUPS = Object.freeze({
  DOL_UI_WEEKLY_CLAIMS: Object.freeze({
    provider: "DOL_ETA",
    kind: "DOL",
    releaseDelayMs: 15*60*1000,
    retryTtlMs: 15*60*1000,
    quotaRetryTtlMs: 24*60*60*1000,
  }),
  BLS_EMPLOYMENT_SITUATION: Object.freeze({
    provider: "BLS",
    kind: "BLS",
    releaseDelayMs: 26*60*60*1000,
    retryTtlMs: 60*60*1000,
    quotaRetryTtlMs: 24*60*60*1000,
    seriesIds: Object.freeze([
      "LNS14000000",
      "LNS13327709",
      "LNS11300000",
      "LNS12300000",
      "CES0000000001",
      "CES0500000002",
      "CES6056132001",
      "CES0500000003",
      "CES0500000022",
    ]),
  }),
  BLS_JOLTS: Object.freeze({
    provider: "BLS",
    kind: "BLS",
    releaseDelayMs: 26*60*60*1000,
    retryTtlMs: 60*60*1000,
    quotaRetryTtlMs: 24*60*60*1000,
    seriesIds: Object.freeze([
      "JTS000000000000000JOL",
      "JTS000000000000000JOR",
      "JTS000000000000000HIR",
      "JTS000000000000000QUR",
      "JTS000000000000000LDR",
    ]),
  }),
  BLS_ECI: Object.freeze({
    provider: "BLS",
    kind: "BLS",
    releaseDelayMs: 26*60*60*1000,
    retryTtlMs: 60*60*1000,
    quotaRetryTtlMs: 24*60*60*1000,
    seriesIds: Object.freeze(["CIU1010000000000A"]),
  }),
  BLS_STATE_MSA: Object.freeze({
    provider: "BLS",
    kind: "BLS",
    releaseDelayMs: 26*60*60*1000,
    retryTtlMs: 60*60*1000,
    quotaRetryTtlMs: 24*60*60*1000,
    seriesIds: Object.freeze([
      "SMS00000000000000022",
      "SMS99999990000000022",
    ]),
  }),
  BLS_BED: Object.freeze({
    provider: "BLS",
    kind: "BED",
    releaseDelayMs: 26*60*60*1000,
    retryTtlMs: 60*60*1000,
    quotaRetryTtlMs: 24*60*60*1000,
  }),
});

export const EMPLOYMENT_R6_BLS_SERIES = Object.freeze({
  LNS14000000: Object.freeze({logicalSeriesId:"U3_UNEMPLOYMENT_RATE",provider:"BLS_CPS",geographyType:"NATIONAL",geographyCode:"US",frequency:"MONTHLY",unit:"PERCENT",seasonalAdjustment:"SA",populationCoverage:"CIVILIAN_NONINSTITUTIONAL_16_PLUS"}),
  LNS13327709: Object.freeze({logicalSeriesId:"U6_UNEMPLOYMENT_RATE",provider:"BLS_CPS",geographyType:"NATIONAL",geographyCode:"US",frequency:"MONTHLY",unit:"PERCENT",seasonalAdjustment:"SA",populationCoverage:"CIVILIAN_NONINSTITUTIONAL_16_PLUS"}),
  LNS11300000: Object.freeze({logicalSeriesId:"LABOR_FORCE_PARTICIPATION_RATE",provider:"BLS_CPS",geographyType:"NATIONAL",geographyCode:"US",frequency:"MONTHLY",unit:"PERCENT",seasonalAdjustment:"SA",populationCoverage:"CIVILIAN_NONINSTITUTIONAL_16_PLUS"}),
  LNS12300000: Object.freeze({logicalSeriesId:"EMPLOYMENT_POPULATION_RATIO",provider:"BLS_CPS",geographyType:"NATIONAL",geographyCode:"US",frequency:"MONTHLY",unit:"PERCENT",seasonalAdjustment:"SA",populationCoverage:"CIVILIAN_NONINSTITUTIONAL_16_PLUS"}),
  CES0000000001: Object.freeze({logicalSeriesId:"PAYEMS_LEVEL",provider:"BLS_CES",geographyType:"NATIONAL",geographyCode:"US",frequency:"MONTHLY",unit:"THOUSANDS_PERSONS",seasonalAdjustment:"SA",populationCoverage:"TOTAL_NONFARM"}),
  CES0500000002: Object.freeze({logicalSeriesId:"AVG_WEEKLY_HOURS_TOTAL_PRIVATE",provider:"BLS_CES",geographyType:"NATIONAL",geographyCode:"US",frequency:"MONTHLY",unit:"HOURS",seasonalAdjustment:"SA",populationCoverage:"TOTAL_PRIVATE"}),
  CES6056132001: Object.freeze({logicalSeriesId:"TEMP_HELP_EMPLOYMENT",provider:"BLS_CES",geographyType:"NATIONAL",geographyCode:"US",frequency:"MONTHLY",unit:"THOUSANDS_PERSONS",seasonalAdjustment:"SA",populationCoverage:"TEMPORARY_HELP_SERVICES"}),
  CES0500000003: Object.freeze({logicalSeriesId:"AHE_TOTAL_PRIVATE",provider:"BLS_CES",geographyType:"NATIONAL",geographyCode:"US",frequency:"MONTHLY",unit:"DOLLARS_PER_HOUR",seasonalAdjustment:"SA",populationCoverage:"TOTAL_PRIVATE"}),
  CES0500000022: Object.freeze({logicalSeriesId:"INDUSTRY_EMP_DIFFUSION_3M",provider:"BLS_CES",geographyType:"AGGREGATE_GROUP",geographyCode:"TOTAL_PRIVATE",frequency:"MONTHLY",unit:"DIFFUSION_INDEX_0_100",seasonalAdjustment:"SA",populationCoverage:"TOTAL_PRIVATE_INDUSTRIES"}),
  JTS000000000000000JOL: Object.freeze({logicalSeriesId:"JOLTS_JOB_OPENINGS_LEVEL",provider:"BLS_JOLTS",geographyType:"NATIONAL",geographyCode:"US",frequency:"MONTHLY",unit:"THOUSANDS_LEVEL",seasonalAdjustment:"SA",populationCoverage:"TOTAL_NONFARM"}),
  JTS000000000000000JOR: Object.freeze({logicalSeriesId:"JOLTS_JOB_OPENINGS_RATE",provider:"BLS_JOLTS",geographyType:"NATIONAL",geographyCode:"US",frequency:"MONTHLY",unit:"PERCENT",seasonalAdjustment:"SA",populationCoverage:"TOTAL_NONFARM"}),
  JTS000000000000000HIR: Object.freeze({logicalSeriesId:"JOLTS_HIRES_RATE",provider:"BLS_JOLTS",geographyType:"NATIONAL",geographyCode:"US",frequency:"MONTHLY",unit:"PERCENT",seasonalAdjustment:"SA",populationCoverage:"TOTAL_NONFARM"}),
  JTS000000000000000QUR: Object.freeze({logicalSeriesId:"JOLTS_QUITS_RATE",provider:"BLS_JOLTS",geographyType:"NATIONAL",geographyCode:"US",frequency:"MONTHLY",unit:"PERCENT",seasonalAdjustment:"SA",populationCoverage:"TOTAL_NONFARM"}),
  JTS000000000000000LDR: Object.freeze({logicalSeriesId:"JOLTS_LAYOFFS_DISCHARGES_RATE",provider:"BLS_JOLTS",geographyType:"NATIONAL",geographyCode:"US",frequency:"MONTHLY",unit:"PERCENT",seasonalAdjustment:"SA",populationCoverage:"TOTAL_NONFARM"}),
  CIU1010000000000A: Object.freeze({logicalSeriesId:"ECI_TOTAL_COMPENSATION_12M",provider:"BLS_ECI",geographyType:"NATIONAL",geographyCode:"US",frequency:"QUARTERLY",unit:"PERCENT_12M",seasonalAdjustment:"NSA",populationCoverage:"CIVILIAN_WORKERS"}),
  SMS00000000000000022: Object.freeze({logicalSeriesId:"STATE_EMP_DIFFUSION_3M",provider:"BLS_CES_SAE",geographyType:"AGGREGATE_GROUP",geographyCode:"ALL_STATES",frequency:"MONTHLY",unit:"DIFFUSION_INDEX_0_100",seasonalAdjustment:"SA",populationCoverage:"ALL_STATES"}),
  SMS99999990000000022: Object.freeze({logicalSeriesId:"MSA_EMP_DIFFUSION_3M",provider:"BLS_CES_SAE",geographyType:"AGGREGATE_GROUP",geographyCode:"ALL_MSAS",frequency:"MONTHLY",unit:"DIFFUSION_INDEX_0_100",seasonalAdjustment:"SA",populationCoverage:"ALL_MSAS"}),
});

export const EMPLOYMENT_R6_RELEASE_CALENDAR_2026 = Object.freeze({
  BLS_EMPLOYMENT_SITUATION: Object.freeze([
    "2026-10-02T08:30:00-04:00",
    "2026-11-06T08:30:00-05:00",
    "2026-12-04T08:30:00-05:00",
  ]),
  BLS_JOLTS: Object.freeze([
    "2026-09-29T10:00:00-04:00",
    "2026-11-03T10:00:00-05:00",
    "2026-12-01T10:00:00-05:00",
  ]),
  BLS_ECI: Object.freeze([
    "2026-10-30T08:30:00-04:00",
  ]),
  BLS_STATE_MSA: Object.freeze([
    "2026-09-30T10:00:00-04:00",
    "2026-10-28T10:00:00-04:00",
    "2026-12-02T10:00:00-05:00",
    "2026-12-30T10:00:00-05:00",
  ]),
  BLS_BED: Object.freeze([
    "2026-10-28T10:00:00-04:00",
  ]),
});

export const EMPLOYMENT_R6_API_BUDGET = Object.freeze({
  blsUnregisteredDailyQueries:25,
  blsSeriesPerQuery:25,
  blsYearsPerQuery:10,
  blsPublicationLagMs:24*60*60*1000,
  initialBackfillBlsCalls:18,
  initialBackfillDolCalls:2,
  initialBackfillTotalCalls:20,
  steadyStateMaxBlsCallsIfAllGroupsDueSameDay:9,
});

export const EMPLOYMENT_R6_CONTRACT = Object.freeze({
  storeOnly:true,
  scoreComputedInCollector:false,
  livePublicOutput:false,
  routeWiring:false,
  publicProviderRequests:0,
  currentHistoryRunReuse:"EMPLOYMENT_R4_SHADOW_TABLES",
  newPhysicalTables:Object.freeze([
    EMPLOYMENT_R6_TABLES.rawSnapshot,
    EMPLOYMENT_R6_TABLES.featureHistory,
    EMPLOYMENT_R6_TABLES.readModel,
    EMPLOYMENT_R6_TABLES.readPointer,
  ]),
});
