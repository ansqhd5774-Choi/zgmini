/**
 * Stage 04 / R18 — one fixed source per field, shared by the whole theme universe.
 *
 * This is a research preflight. It NEVER swaps providers theme by theme, treats
 * broad sector statistics as a narrow thematic market, or invents G/D/M.
 * The historical R17 per-industry readers remain available for forensic review.
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { F_ENDPOINT, selectThemeF } from './latest-f-readonly.mjs';
import { PROPOSED_INDUSTRY_API, parseUnifiedIndustrySeries } from './unified-industry-series-readonly.mjs';

export const COMMON_G_SOURCE_CANDIDATES = Object.freeze([
  Object.freeze({
    id: 'OECD_STAN_2025',
    url: 'https://data-explorer.oecd.org/vis?df%5Bag%5D=OECD.STI.PIE&df%5Bid%5D=DSD_STAN%40DF_STAN_2025',
    measure: 'ISIC Rev.4 industry output/value added (annual)',
    coverage: 'STANDARD_INDUSTRIES_NOT_THE_NINE_DIRECT_THEMATIC_DEMAND_SERIES',
    commonExactThemeSeriesVerified: false,
  }),
  Object.freeze({
    id: 'US_BEA_INDUSTRY',
    url: 'https://www.bea.gov/industry/industry-economic-accounts-information-guide',
    measure: 'US NAICS industry gross output/value added (annual/quarterly)',
    coverage: 'US_BROAD_INDUSTRY_NOT_NINE_GLOBAL_THEMES',
    commonExactThemeSeriesVerified: false,
  }),
  Object.freeze({
    id: 'US_CENSUS_QSS',
    url: 'https://www.census.gov/services/qss/about_the_survey.html',
    measure: 'US selected services operating revenues (quarterly)',
    coverage: 'SELECTED_US_SERVICES_NOT_ALL_NINE_THEMES',
    commonExactThemeSeriesVerified: false,
  }),
]);

const REQUIRED_G_DATA = Object.freeze([
  'INDUSTRY_DEMAND_X_T',
  'SAME_DEFINITION_X_PREVIOUS',
  'SAME_DEFINITION_GROWTH_HISTORY',
  'SAME_DEFINITION_ACCELERATION_HISTORY',
]);

function failureCode(error) {
  const networkCode = error?.cause?.code;
  if (['EAI_AGAIN', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ENETUNREACH'].includes(networkCode)) {
    return `NETWORK_${networkCode}`;
  }
  const code = error?.message ?? 'UNKNOWN_SOURCE_ERROR';
  return /^[-A-Z0-9_]+$/.test(code) ? code : 'SOURCE_READ_ERROR';
}

export function evaluateCommonSourceStage04(f, { sourceCandidates = COMMON_G_SOURCE_CANDIDATES } = {}) {
  const rows = (f?.themes ?? []).map((theme) => ({
    theme: theme.theme,
    sentimentF: theme.currentInput ?? null,
    sentimentObservationDate: theme.observationDate ?? null,
    sentimentPhase: theme.phase,
    industryDemandSourceId: null,
    industryDemandX: null,
    approvedGrowthG1: null,
    approvedAccelerationG2: null,
    approvedGrowthG: null,
    approvedDislocationD: null,
    approvedAttractivenessM: null,
    officialRank: null,
    stage04State: 'UNIFORM_INDUSTRY_SOURCE_UNVERIFIED_UNRANKED',
  }));
  const sourceUsable = sourceCandidates.some((candidate) => candidate.commonExactThemeSeriesVerified === true);
  // No candidate may be promoted by a static flag alone. A live, rights-cleared,
  // same-definition X history and explicit scoring approval are still required.
  return {
    runType: 'INVESTMENT_BOT_STAGE04_COMMON_SOURCE_GATE_R18',
    runAtUtc: new Date().toISOString(),
    mode: 'READ_ONLY_RESEARCH_ONLY_NO_TRADE',
    status: f?.status === 'LIVE_F_OBSERVED' ? 'COMMON_INDUSTRY_SOURCE_GAP_UNRANKED' : 'F_INPUT_INCOMPLETE_UNRANKED',
    F: {
      state: f?.status ?? 'SOURCE_FAILED',
      endpoint: F_ENDPOINT,
      sourceVersion: f?.sourceVersion ?? null,
      sourceStoredAt: f?.sourceStoredAt ?? null,
      evaluatedAsOfKst: f?.evaluatedAsOfKst ?? null,
      observedThemeCount: rows.filter((row) => row.sentimentF !== null).length,
      universeCount: rows.length,
    },
    industryCommonSource: {
      state: sourceUsable ? 'CANDIDATE_UNVERIFIED_FOR_LIVE_USE' : 'NO_VALIDATED_COMMON_SOURCE',
      candidates: sourceCandidates,
      verifiedLiveCommonSourceId: null,
      checkedThemes: rows.map((row) => row.theme),
      exactThemeHistoryVerifiedCount: 0,
      missingRequiredFields: REQUIRED_G_DATA,
      perThemeProviderSwitchAllowed: false,
      legacyPerThemeProxyScoresEligible: false,
    },
    themes: rows,
    missingFieldReport: {
      commonInvestigationImpossibleAtPresent: [...REQUIRED_G_DATA],
      derivedFieldsBlocked: ['G1', 'G2', 'G', 'D', 'M', 'OFFICIAL_RANK'],
      interpretation: 'NO_VERIFIED_UNIFORM_THEME_DEMAND_SOURCE_IS_NOT_PROOF_THAT_NO_SOURCE_EXISTS',
      zgminiCandidateAddition: 'INDEPENDENT_STAGE04_INDUSTRY_DEMAND_SOURCE_REGISTRY_AND_SERIES_ONLY',
      mustNotChange: ['EXISTING_F', 'ETF_BASKETS', 'SCORE_FORMULAS', 'D1', 'PC_SCHEDULERS', 'TRADE_GATE'],
      condition: 'Adding an API endpoint alone cannot create missing actual industry demand observations; verify source, scope, publication vintage, rights and formula approval first.',
    },
    automatedTradeEnabled: false,
    orderRequests: [],
  };
}

export async function runCommonSourceStage04({ fetchFn = fetch, asOfDate, industryFeedUrl = null } = {}) {
  let f = null;
  let fFailureCode = null;
  try {
    const response = await fetchFn(F_ENDPOINT, {
      signal: AbortSignal.timeout(15000), headers: { accept: 'application/json' },
    });
    if (!response?.ok) throw new Error(`F_API_HTTP_${response?.status ?? 'UNAVAILABLE'}`);
    if (new URL(response.url ?? F_ENDPOINT).origin !== new URL(F_ENDPOINT).origin) {
      throw new Error('F_API_ORIGIN_DRIFT');
    }
    f = selectThemeF(await response.json(), asOfDate ? { asOfDate } : {});
  } catch (error) {
    fFailureCode = failureCode(error);
  }
  const result = evaluateCommonSourceStage04(f);
  const baseline = { ...result, F: { ...result.F, failureCode: fFailureCode } };
  // Proposed unified endpoint is intentionally not called by default: it has
  // not been created or approved for ZGMINI production. A caller can test the
  // contract explicitly, but cannot silently substitute theme-specific URLs.
  if (industryFeedUrl === null || f?.status !== 'LIVE_F_OBSERVED') return baseline;
  if (industryFeedUrl !== PROPOSED_INDUSTRY_API) {
    return {
      ...baseline, industryCommonSource: {
        ...baseline.industryCommonSource, feedFailureCode: 'UNAPPROVED_INDUSTRY_FEED_URL',
      },
    };
  }
  try {
    const response = await fetchFn(industryFeedUrl, {
      signal: AbortSignal.timeout(15000), headers: { accept: 'application/json' },
    });
    if (!response?.ok) throw new Error(`INDUSTRY_API_HTTP_${response?.status ?? 'UNAVAILABLE'}`);
    if (new URL(response.url ?? industryFeedUrl).origin !== new URL(industryFeedUrl).origin) {
      throw new Error('INDUSTRY_API_ORIGIN_DRIFT');
    }
    const evidence = parseUnifiedIndustrySeries(await response.json(), {
      asOfDate: f.evaluatedAsOfKst,
      expectedThemes: f.themes.map((theme) => theme.theme),
    });
    const byName = new Map(evidence.rows.map((row) => [row.theme, row]));
    const rows = baseline.themes.map((theme) => ({
      ...theme, industry: byName.get(theme.theme),
    }));
    const allDirectAndComparable = evidence.rows.every((row) =>
      row.state === 'COMMON_INTERFACE_RAW_GROWTH_RESEARCH_ONLY'
      && row.changeYoY !== null && row.accelerationYoYPp !== null);
    return {
      ...baseline,
      status: allDirectAndComparable ? 'COMMON_INDUSTRY_RAW_INPUT_COMPLETE_UNRANKED' : 'COMMON_INDUSTRY_PARTIAL_UNRANKED',
      themes: rows,
      industryCommonSource: {
        ...baseline.industryCommonSource,
        state: 'UNIFIED_SOURCE_OBSERVED_RESEARCH_ONLY',
        verifiedLiveCommonSourceId: 'ZGMINI_STAGE04_INDUSTRY_DEMAND_V1',
        exactThemeHistoryVerifiedCount: evidence.rows.filter((row) =>
          row.state === 'COMMON_INTERFACE_RAW_GROWTH_RESEARCH_ONLY'
          && row.changeYoY !== null && row.accelerationYoYPp !== null).length,
        unifiedFeed: {
          schemaVersion: evidence.schemaVersion,
          sourceVersion: evidence.sourceVersion,
          sourceStoredAt: evidence.sourceStoredAt,
          rawGrowthObservedCount: evidence.rawGrowthObservedCount,
          accelerationObservedCount: evidence.accelerationObservedCount,
        },
      },
      missingFieldReport: {
        ...baseline.missingFieldReport,
        commonInvestigationImpossibleAtPresent: [
          ['INDUSTRY_DEMAND_X_T', (row) => row.rawValue !== null],
          ['SAME_DEFINITION_X_PREVIOUS', (row) => row.priorYearValue !== null],
          ['SAME_DEFINITION_GROWTH_HISTORY', (row) => row.changeYoY !== null],
          ['SAME_DEFINITION_ACCELERATION_HISTORY', (row) => row.accelerationYoYPp !== null],
        ].filter(([, available]) => evidence.rows.some((row) =>
          row.state !== 'COMMON_INTERFACE_RAW_GROWTH_RESEARCH_ONLY' || !available(row)))
          .map(([field]) => field),
        missingByTheme: evidence.rows.filter((row) =>
          row.state !== 'COMMON_INTERFACE_RAW_GROWTH_RESEARCH_ONLY'
          || row.changeYoY === null || row.accelerationYoYPp === null)
          .map((row) => ({ theme: row.theme, reason: row.state,
            growthMissing: row.changeYoY === null, accelerationMissing: row.accelerationYoYPp === null })),
        // Formula weights / historical normalisation remain unapproved even
        // if all raw X values happen to be present. No promotion to ranking.
        derivedFieldsBlocked: ['G1', 'G2', 'G', 'D', 'M', 'OFFICIAL_RANK'],
      },
    };
  } catch (error) {
    return {
      ...baseline,
      industryCommonSource: {
        ...baseline.industryCommonSource, feedFailureCode: failureCode(error),
      },
    };
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCommonSourceStage04().then((result) => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    // A missing industry series is a REPORTABLE gap, not a transport error.
    // 2 signals input failure; successful preflight remains 0 even if unranked.
    if (result.F.state !== 'LIVE_F_OBSERVED') process.exitCode = 2;
  });
}
