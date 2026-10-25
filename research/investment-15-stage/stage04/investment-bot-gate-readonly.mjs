/**
 * AI investment BOT / stage04 research-input gate (prototype R9).
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
import { fetchLatestOfficialFdaCder } from './fda-cder-official-readonly.mjs';
import { fetchLatestOfficialCpucAv } from './cpuc-av-official-readonly.mjs';
import { fetchLatestOfficialIfrRobots } from './ifr-robot-official-readonly.mjs';

export const INDUSTRY_CONTRACT = Object.freeze({
  '로봇·자동화': { institution: 'IFR', source: 'https://ifr.org/img/worldrobotics/Executive_Summary_WR_2026_-_Industrial_Robots.pdf', review: '2025_COUNT_ONLY_ROUNDED_YOY_NO_EXACT_HISTORY_AND_LICENSE_REVIEW' },
  '클라우드·SaaS': { institution: 'Eurostat', source: 'https://ec.europa.eu/eurostat/databrowser/view/isoc_cicce_use/', review: 'SPARSE_SURVEY_YEARS_AND_SOURCE_CREDIT' },
  '자율주행': { institution: 'CPUC', source: 'https://www.cpuc.ca.gov/regulatory-services/licensing/transportation-licensing-and-analysis-branch/autonomous-vehicle-programs/quarterly-reporting', review: 'WAYMO_CALIFORNIA_ONLY_SHORT_YOY_HISTORY_AND_RIGHTS_REVIEW' },
  '원전·SMR': { institution: 'IAEA PRIS', source: 'https://pris.iaea.org/', review: 'STOCK_VS_FLOW_REQUIRES_APPROVAL' },
  '방산': { institution: 'SIPRI', source: 'https://www.sipri.org/about/terms-and-conditions', review: 'COMMERCIAL_RIGHTS_REVIEW' },
  '핀테크': { institution: 'Federal Reserve Financial Services', source: 'https://www.frbservices.org/resources/financial-services/fednow-service-resources/fednow-service-volume-value-statistics/', review: 'FEDNOW_ONLY_PROXY_AND_COMMERCIAL_RIGHTS_REVIEW' },
  '사이버보안': { institution: 'ENISA', source: 'https://www.enisa.europa.eu/', review: 'SURVEY_COHORT_COMPARABILITY' },
  '바이오·신약': { institution: 'FDA CDER', source: 'https://www.fda.gov/media/190705/download', review: 'PINNED_2025_REPORT_REVIEW_NEXT_YEAR_AND_LIMITED_PROXY' },
  '데이터센터·전력': { institution: 'IEA', source: 'https://www.iea.org/', review: 'LONG_HISTORY_RAW_VALUES_UNAVAILABLE' },
});

function errorCode(error) {
  const code = error?.message ?? 'UNKNOWN_SOURCE_ERROR';
  return /^[-A-Z0-9_]+$/.test(code) ? code : 'SOURCE_READ_ERROR';
}

export async function runInvestmentBotInputGate({
  fetchFn = fetch, asOfDate,
  fdaReader = fetchLatestOfficialFdaCder,
  cpucReader = fetchLatestOfficialCpucAv,
  ifrReader = fetchLatestOfficialIfrRobots,
} = {}) {
  const [fResult, fednowResult, eurostatResult, fdaResult, cpucResult, ifrResult] = await Promise.allSettled([
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
    fdaReader({ fetchFn }),
    cpucReader({ fetchFn }),
    ifrReader({ fetchFn }),
  ]);

  const f = fResult.status === 'fulfilled' ? fResult.value : null;
  const fednow = fednowResult.status === 'fulfilled' ? fednowResult.value : null;
  const eurostat = eurostatResult.status === 'fulfilled' ? eurostatResult.value : null;
  const fda = fdaResult.status === 'fulfilled' ? fdaResult.value : null;
  const cpuc = cpucResult.status === 'fulfilled' ? cpucResult.value : null;
  const ifr = ifrResult.status === 'fulfilled' ? ifrResult.value : null;
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
    const fdaObserved = name === '바이오·신약' && fda !== null;
    const cpucObserved = name === '자율주행' && cpuc !== null;
    const ifrObserved = name === '로봇·자동화' && ifr !== null;
    const countObserved = fednowObserved ? fednow : fdaObserved ? fda : cpucObserved ? cpuc
      : ifrObserved ? ifr : null;
    return {
      theme: name,
      sentimentF: theme?.currentInput ?? null,
      sentimentObservationDate: theme?.observationDate ?? null,
      sentimentPhase: theme?.phase ?? 'UNAVAILABLE',
      industryInstitution: contract.institution,
      industryOfficialSource: contract.source,
      industryEvidenceState: fednowObserved ? 'LIVE_ORIGINAL_OBSERVATION'
        : eurostatObserved ? 'LIVE_ORIGINAL_SPARSE_SURVEY'
          : fdaObserved ? 'LIVE_SOURCE_HASH_VALIDATED_FIXED_2025_REPORT'
            : cpucObserved ? 'LIVE_ORIGINAL_QUARTERLY_AGGREGATE'
              : ifrObserved ? 'LIVE_SOURCE_HASH_VALIDATED_PARTIAL_2026_REPORT' : 'NOT_AUTOMATICALLY_VERIFIED',
      industryReviewFlag: contract.review,
      industryObservationPeriod: countObserved ? countObserved.observationPeriod
        : eurostatObserved ? String(eurostat.latestAvailableYear) : null,
      industryRawCount: countObserved?.latestRawCount ?? null,
      industryRawPercent: eurostatObserved ? eurostat.latestRawPct : null,
      industryGrowthPct: countObserved?.yoyGrowthPct ?? null,
      industryReportedRoundedGrowthPct: ifrObserved ? ifr.publishedRoundedYoyGrowthPct : null,
      industryAccelerationPctPoints: countObserved?.sequentialYoyAccelerationPctPoints ?? null,
      industryTwoYearDeltaPctPoints: eurostatObserved ? eurostat.twoYearDeltaPctPoints : null,
      industryTwoYearWindowChangePctPoints: eurostatObserved ? eurostat.changeBetweenTwoYearWindowsPctPoints : null,
      provisionalIndustryProxy: fednowObserved ? 'FEDNOW_NETWORK_NOT_WHOLE_FINTECH'
        : eurostatObserved ? 'EU_CLOUD_ADOPTION_NOT_GLOBAL_SAAS_REVENUE'
          : fdaObserved ? 'FDA_CDER_NOVEL_APPROVALS_NOT_WHOLE_BIOTECH'
            : cpucObserved ? 'CALIFORNIA_WAYMO_DRIVERLESS_ONLY_NOT_GLOBAL_AV'
              : ifrObserved ? 'GLOBAL_INDUSTRIAL_ROBOT_INSTALLATIONS_NOT_SERVICE_OR_OPERATIONAL_STOCK' : null,
      approvedGrowthG: null,
      approvedDislocationD: null,
      approvedAttractivenessM: null,
      officialRank: null,
      stage04State: 'EVIDENCE_PENDING_UNRANKED',
    };
  });

  return {
    runType: 'INVESTMENT_BOT_STAGE04_INPUT_GATE_R9',
    runAtUtc: new Date().toISOString(),
    mode: 'READ_ONLY_RESEARCH_ONLY_NO_TRADE',
    status: inputContractValid && fednow && eurostat && fda && cpuc && ifr
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
      validatedLiveThemes: Number(Boolean(fednow)) + Number(Boolean(eurostat))
        + Number(Boolean(fda)) + Number(Boolean(cpuc)) + Number(Boolean(ifr)),
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
      fdaCder: {
        state: fda?.state ?? 'SOURCE_FAILED',
        failureCode: fdaResult.status === 'rejected' ? errorCode(fdaResult.reason) : null,
        sourceSha256: fda?.sourceSha256 ?? null,
        sourceDocumentYear: fda?.sourceDocumentYear ?? null,
        historicalYoyReferenceCount: fda?.historicalYoyReferenceCount ?? null,
        historicalAccelerationReferenceCount: fda?.historicalAccelerationReferenceCount ?? null,
        refreshMode: fda?.dataRefreshMode ?? null,
      },
      cpucAv: {
        state: cpuc?.state ?? 'SOURCE_FAILED',
        failureCode: cpucResult.status === 'rejected' ? errorCode(cpucResult.reason) : null,
        sourceArchivePeriods: cpuc?.sourceArchivePeriods ?? null,
        historicalYoyReferenceCount: cpuc?.historicalYoyReferenceCount ?? null,
        historicalAccelerationReferenceCount: cpuc?.historicalAccelerationReferenceCount ?? null,
      },
      ifrRobots: {
        state: ifr?.state ?? 'SOURCE_FAILED',
        failureCode: ifrResult.status === 'rejected' ? errorCode(ifrResult.reason) : null,
        sourceSha256: ifr?.sourceSha256 ?? null,
        sourceDocumentYear: ifr?.sourceDocumentYear ?? null,
        dataRefreshMode: ifr?.dataRefreshMode ?? null,
        rightsState: ifr?.rightsState ?? null,
        historicalYoyReferenceCount: ifr?.historicalYoyReferenceCount ?? null,
        historicalAccelerationReferenceCount: ifr?.historicalAccelerationReferenceCount ?? null,
      },
    },
    themes: rows,
    automatedTradeEnabled: false,
    orderRequests: [],
    nextRequired: [
      'Automate same-vintage official industry data for the other four themes without changing registered metrics.',
      'IFR 2025 installation count is verified but precise 2024 base and historical YoY/acceleration remain unavailable; do not infer them from rounded 11%.',
      'Review the next annual FDA report explicitly; the validated 2025 report is not a live 2026 observation.',
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
