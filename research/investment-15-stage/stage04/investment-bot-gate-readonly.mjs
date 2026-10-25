/**
 * AI investment BOT / stage04 research-input gate (prototype R7).
 *
 * Automatic read-only retrieval of the existing 9 theme F inputs and an
 * independent official industry observation. Do not silently promote either
 * to an investment ranking. Unapproved scores & all trading stay disabled.
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { F_ENDPOINT, selectThemeF } from './latest-f-readonly.mjs';
import { fetchLatestOfficialFedNow } from './fednow-official-readonly.mjs';
import { fetchLatestEurostatCloud } from './eurostat-cloud-readonly.mjs';

export const INDUSTRY_CONTRACT = Object.freeze({
  '로봇·자동화': { institution: 'IFR', source: 'https://ifr.org/', review: 'SAME_VINTAGE_AND_RIGHTS_REVIEW' },
  '클라우드·SaaS': { institution: 'Eurostat', source: 'https://ec.europa.eu/eurostat/databrowser/view/isoc_cicce_use/', review: 'SPARSE_SURVEY_YEARS_AND_SOURCE_CREDIT' },
  '자율주행': { institution: 'CPUC', source: 'https://www.cpuc.ca.gov/', review: 'LIMITED_GEOGRAPHY_AND_HISTORY' },
  '원전·SMR': { institution: 'IAEA PRIS', source: 'https://pris.iaea.org/', review: 'STOCK_VS_FLOW_REQUIRES_APPROVAL' },
  '방산': { institution: 'SIPRI', source: 'https://www.sipri.org/about/terms-and-conditions', review: 'COMMERCIAL_RIGHTS_REVIEW' },
  '핀테크': { institution: 'Federal Reserve Financial Services', source: 'https://www.frbservices.org/resources/financial-services/fednow-service-resources/fednow-service-volume-value-statistics/', review: 'FEDNOW_ONLY_PROXY_AND_COMMERCIAL_RIGHTS_REVIEW' },
  '사이버보안': { institution: 'ENISA', source: 'https://www.enisa.europa.eu/', review: 'SURVEY_COHORT_COMPARABILITY' },
  '바이오·신약': { institution: 'FDA CDER', source: 'https://www.fda.gov/media/190705/download', review: 'FDA_2025_SINGLE_VINTAGE_NOT_LIVE_PARSED' },
  '데이터센터·전력': { institution: 'IEA', source: 'https://www.iea.org/', review: 'LONG_HISTORY_RAW_VALUES_UNAVAILABLE' },
});

function errorCode(error) {
  const code = error?.message ?? 'UNKNOWN_SOURCE_ERROR';
  return /^[-A-Z0-9_]+$/.test(code) ? code : 'SOURCE_READ_ERROR';
}

export async function runInvestmentBotInputGate({ fetchFn = fetch, asOfDate } = {}) {
  const [fResult, fednowResult, eurostatResult] = await Promise.allSettled([
    (async () => {
      const response = await fetchFn(F_ENDPOINT, {
        signal: AbortSignal.timeout(15000), headers: { accept: 'application/json' },
      });
      if (!response?.ok) throw new Error(`F_API_HTTP_${response?.status ?? 'UNAVAILABLE'}`);
      if (new URL(response.url ?? F_ENDPOINT).origin !== new URL(F_ENDPOINT).origin) {
        throw new Error('F_API_ORIGIN_DRIFT');
      }
      return selectThemeF(await response.json(), asOfDate ? { asOfDate } : {});
    })(),
    fetchLatestOfficialFedNow({ fetchFn }),
    fetchLatestEurostatCloud({ fetchFn }),
  ]);

  const f = fResult.status === 'fulfilled' ? fResult.value : null;
  const fednow = fednowResult.status === 'fulfilled' ? fednowResult.value : null;
  const eurostat = eurostatResult.status === 'fulfilled' ? eurostatResult.value : null;
  const expected = Object.keys(INDUSTRY_CONTRACT);
  const themesByName = new Map(f?.themes?.map((theme) => [theme.theme, theme]) ?? []);
  const inputContractValid = f?.status === 'LIVE_F_OBSERVED'
    && f.themes.length === expected.length
    && expected.every((name) => themesByName.has(name));

  const rows = expected.map((name) => {
    const theme = themesByName.get(name);
    const contract = INDUSTRY_CONTRACT[name];
    const fednowObserved = name === '핀테크' && fednow !== null;
    const eurostatObserved = name === '클라우드·SaaS' && eurostat !== null;
    return {
      theme: name,
      sentimentF: theme?.currentInput ?? null,
      sentimentObservationDate: theme?.observationDate ?? null,
      sentimentPhase: theme?.phase ?? 'UNAVAILABLE',
      industryInstitution: contract.institution,
      industryOfficialSource: contract.source,
      industryEvidenceState: fednowObserved ? 'LIVE_ORIGINAL_OBSERVATION'
        : eurostatObserved ? 'LIVE_ORIGINAL_SPARSE_SURVEY' : 'NOT_AUTOMATICALLY_VERIFIED',
      industryReviewFlag: contract.review,
      industryObservationPeriod: fednowObserved ? fednow.observationPeriod
        : eurostatObserved ? String(eurostat.latestAvailableYear) : null,
      industryRawCount: fednowObserved ? fednow.latestRawCount : null,
      industryRawPercent: eurostatObserved ? eurostat.latestRawPct : null,
      industryGrowthPct: fednowObserved ? fednow.yoyGrowthPct : null,
      industryAccelerationPctPoints: fednowObserved ? fednow.sequentialYoyAccelerationPctPoints : null,
      industryTwoYearDeltaPctPoints: eurostatObserved ? eurostat.twoYearDeltaPctPoints : null,
      industryTwoYearWindowChangePctPoints: eurostatObserved ? eurostat.changeBetweenTwoYearWindowsPctPoints : null,
      provisionalIndustryProxy: fednowObserved ? 'FEDNOW_NETWORK_NOT_WHOLE_FINTECH'
        : eurostatObserved ? 'EU_CLOUD_ADOPTION_NOT_GLOBAL_SAAS_REVENUE' : null,
      approvedGrowthG: null,
      approvedDislocationD: null,
      approvedAttractivenessM: null,
      officialRank: null,
      stage04State: 'EVIDENCE_PENDING_UNRANKED',
    };
  });

  return {
    runType: 'INVESTMENT_BOT_STAGE04_INPUT_GATE_R7',
    runAtUtc: new Date().toISOString(),
    mode: 'READ_ONLY_RESEARCH_ONLY_NO_TRADE',
    status: inputContractValid && fednow && eurostat
      ? 'LIVE_INPUT_PARTIAL_INDUSTRY_UNRANKED'
      : 'PARTIAL_OR_FAILED_INPUT_UNRANKED',
    inputContractValid,
    F: {
      state: f?.status ?? 'SOURCE_FAILED',
      failureCode: fResult.status === 'rejected' ? errorCode(fResult.reason) : null,
      sourceVersion: f?.sourceVersion ?? null,
      sourceStoredAt: f?.sourceStoredAt ?? null,
      evaluatedAsOfKst: f?.evaluatedAsOfKst ?? null,
    },
    officialIndustry: {
      validatedLiveThemes: Number(Boolean(fednow)) + Number(Boolean(eurostat)),
      expectedThemes: expected.length,
      fednow: {
        state: fednow?.state ?? 'SOURCE_FAILED',
        failureCode: fednowResult.status === 'rejected' ? errorCode(fednowResult.reason) : null,
        asciiUrl: fednow?.asciiUrl ?? null,
        sourcePageLastUpdated: fednow?.sourcePageLastUpdated ?? null,
        historicalYoyReferenceCount: fednow?.historicalYoyReferenceCount ?? null,
        historicalAccelerationReferenceCount: fednow?.historicalAccelerationReferenceCount ?? null,
      },
      eurostat: {
        state: eurostat?.state ?? 'SOURCE_FAILED',
        failureCode: eurostatResult.status === 'rejected' ? errorCode(eurostatResult.reason) : null,
        sourceUpdatedAt: eurostat?.sourceUpdatedAt ?? null,
        datasetVersion: eurostat?.datasetVersion ?? null,
        missingYears: eurostat?.missingYears ?? null,
        twoYearComparisonYears: eurostat?.twoYearComparisonYears ?? null,
      },
    },
    themes: rows,
    automatedTradeEnabled: false,
    orderRequests: [],
    nextRequired: [
      'Automate same-vintage official industry data for the other seven themes without changing registered metrics.',
      'Resolve source rights and proxy limitations before published or commercial derivative scores.',
      'Receive explicit approval for historical sample minima, G/D/M formula weights and ranking.',
      'Keep stage13 human-order gate: do not connect brokerage or place any orders.',
    ],
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runInvestmentBotInputGate().then((result) => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (result.status !== 'LIVE_INPUT_PARTIAL_INDUSTRY_UNRANKED') process.exitCode = 2;
  }).catch((error) => {
    process.stderr.write(`INVESTMENT_BOT_GATE_UNAVAILABLE: ${errorCode(error)}\n`);
    process.exitCode = 1;
  });
}
