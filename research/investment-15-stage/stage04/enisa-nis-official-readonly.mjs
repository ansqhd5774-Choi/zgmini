/**
 * ENISA NIS Investments 2025 official press-release observation.
 * Fetches the designated original article at execution time. Only validated
 * aggregate survey observations leave this reader; no HTML is persisted.
 * Cross-cohort cybersecurity budget share is NOT market revenue YoY growth.
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const ENISA_NIS_2025_RELEASE = 'https://www.enisa.europa.eu/news/whats-driving-cybersecurity-investments-and-where-lie-the-challenges';
const MAX_HTML_BYTES = 1_000_000;

export function parseEnisaNis2025Release(html) {
  if (typeof html !== 'string' || html.length < 2000 || Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    throw new Error('ENISA_INVALID_HTML_SIZE');
  }
  const prose = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|thinsp|ensp|emsp);|&#(?:160|8239);/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ');

  if (!/What.s Driving Cybersecurity Investments and Where Lie The Challenges/i.test(prose)
    || !/Press Release\s+8 Dec 2025\b/i.test(prose)
    || !/6\s*th edition of the NIS Investments report/i.test(prose)) {
    throw new Error('ENISA_REPORT_IDENTITY_OR_VINTAGE_DRIFT');
  }

  // Context-bound extraction avoids confusing a budget-share percentage with
  // other risk, staffing, compliance or survey-response percentages.
  const sample = [...prose.matchAll(/survey was carried out across\s+([\d,]+)\s+public and private organisations/gi)];
  const cohort = [...prose.matchAll(/sample for this year.s survey included\s+([\d,.]+)%\s+large enterprises and\s+([\d,.]+)%\s+SMEs/gi)];
  const spending = [...prose.matchAll(/cybersecurity investment at levels comparable to last year.s\s*\(\s*([\d,.]+)%\s+of IT budgets\s*;\s*median\s+([\d,.]+)\s+million euro\s*\)/gi)];
  if (sample.length !== 1 || cohort.length !== 1 || spending.length !== 1) {
    throw new Error('ENISA_SURVEY_METRIC_NOT_UNIQUE');
  }
  const sampleSize = Number(sample[0][1].replaceAll(',', ''));
  const largePct = Number(cohort[0][1].replaceAll(',', ''));
  const smePct = Number(cohort[0][2].replaceAll(',', ''));
  const budgetSharePct = Number(spending[0][1].replaceAll(',', ''));
  const medianEuro = Number(spending[0][2].replaceAll(',', '')) * 1_000_000;
  if (!Number.isSafeInteger(sampleSize) || sampleSize < 100 || sampleSize > 100_000
    || !Number.isFinite(largePct) || !Number.isFinite(smePct) || largePct < 0 || smePct < 0
    || largePct + smePct !== 100 || !Number.isFinite(budgetSharePct)
    || budgetSharePct <= 0 || budgetSharePct > 100
    || !Number.isSafeInteger(medianEuro) || medianEuro <= 0 || medianEuro > 1_000_000_000) {
    throw new Error('ENISA_SURVEY_METRIC_OUT_OF_RANGE');
  }

  return {
    state: 'OFFICIAL_LIVE_2025_SURVEY_BUDGET_SHARE_RESEARCH_ONLY',
    officialRelease: ENISA_NIS_2025_RELEASE,
    sourceDocumentYear: 2025,
    sourcePublished: '2025-12-08',
    observationPeriod: '2025 survey (spending fiscal year not asserted)',
    regionAndCoverage: 'EU_NIS2_SURVEY_RESPONDENTS_NOT_GLOBAL_CYBERSECURITY_MARKET',
    metric: 'survey_cybersecurity_spending_share_of_respondents_it_budgets',
    units: 'percent_of_IT_budgets',
    latestRawPct: budgetSharePct,
    surveyRespondents: sampleSize,
    surveyLargePct: largePct,
    surveySmePct: smePct,
    medianCybersecurityEuro: medianEuro,
    priorYearComparablePct: null,
    yoyGrowthPct: null,
    sequentialYoyAccelerationPctPoints: null,
    historicalYoyReferenceCount: 0,
    historicalAccelerationReferenceCount: 0,
    dataRefreshMode: 'LIVE_ORIGINAL_2025_PRESS_RELEASE_REVIEW_NEXT_ANNUAL_SURVEY',
    rightsState: 'PUBLIC_OFFICIAL_NEWS_RESEARCH_ONLY_SOURCE_CREDIT_REQUIRED',
    G: null, D: null, M: null, ranking: null,
    notes: [
      'A share of surveyed organisations IT budgets is not cybersecurity market size or annual market growth.',
      'The report says comparable to last year, but sample/cohort is not a paired same-vintage growth series.',
      '2025 is the release and survey edition, not a verified calendar-year spending observation.',
      'Source is checked live at execution. No raw article, historical database, ranking or order is saved.',
    ],
  };
}

export async function fetchLatestOfficialEnisaNis2025({ fetchFn = fetch } = {}) {
  const response = await fetchFn(ENISA_NIS_2025_RELEASE, {
    signal: AbortSignal.timeout(18000), headers: { accept: 'text/html' },
  });
  if (!response?.ok) throw new Error(`ENISA_HTTP_${response?.status ?? 'UNAVAILABLE'}`);
  if (new URL(response.url ?? ENISA_NIS_2025_RELEASE).href !== ENISA_NIS_2025_RELEASE) {
    throw new Error('ENISA_OFFICIAL_URL_DRIFT');
  }
  const type = response.headers?.get?.('content-type');
  if (type && !type.toLowerCase().includes('text/html')) throw new Error('ENISA_CONTENT_TYPE_DRIFT');
  const size = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(size) && size > MAX_HTML_BYTES) throw new Error('ENISA_SOURCE_TOO_LARGE');
  return parseEnisaNis2025Release(await response.text());
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fetchLatestOfficialEnisaNis2025()
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => { process.stderr.write(`${error?.message ?? error}\n`); process.exitCode = 1; });
}
