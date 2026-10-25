/**
 * IEA 2026 Key Questions on Energy and AI, official HTML report reader.
 * The two observed scalars are extracted from the original page at run time.
 * No HTML, chart, historical-series estimate or proprietary dataset is saved.
 * Published +17% is rounded; an exact 2024 base and acceleration remain NULL.
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const IEA_DATA_CENTRE_REPORT = 'https://www.iea.org/reports/key-questions-on-energy-and-ai/executive-summary';
const MAX_HTML_BYTES = 1_000_000;

export function parseIeaDataCentreReport(html) {
  if (typeof html !== 'string' || html.length < 500 || Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    throw new Error('IEA_INVALID_HTML_SIZE');
  }
  // Only page prose is eligible. Ignore metadata, embedded JSON, scripts and CSS.
  const prose = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|thinsp|ensp|emsp);|&#(?:160|8239);/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ');
  if (!/Key Questions on Energy and AI/i.test(prose) || !/Executive summary/i.test(prose)) {
    throw new Error('IEA_REPORT_IDENTITY_CHANGED');
  }
  const count = [...prose.matchAll(/electricity consumption from data centres\s+roughly doubling from\s+([\d,.]+)\s+TWh in\s+(20\d{2})\s+to\s+([\d,.]+)\s+TWh in\s+(20\d{2})/gi)];
  const growth = [...prose.matchAll(/global electricity demand of data centres[^.]{0,150}?grew by\s+([\d,.]+)%\s+in\s+(20\d{2})/gi)];
  if (count.length !== 1 || growth.length !== 1) throw new Error('IEA_REPORTED_METRIC_NOT_UNIQUE');
  const observedTwh = Number(count[0][1].replaceAll(',', ''));
  const observedYear = Number(count[0][2]);
  const forecastTwh = Number(count[0][3].replaceAll(',', ''));
  const forecastYear = Number(count[0][4]);
  const roundedYoy = Number(growth[0][1].replaceAll(',', ''));
  const growthYear = Number(growth[0][2]);
  if (!Number.isFinite(observedTwh) || observedTwh <= 0 || observedTwh > 10000
    || !Number.isFinite(forecastTwh) || forecastTwh <= 0 || forecastYear <= observedYear
    || !Number.isFinite(roundedYoy) || roundedYoy < -100 || roundedYoy > 500
    || observedYear !== growthYear || observedYear !== 2025 || forecastYear !== 2030) {
    throw new Error('IEA_OBSERVATION_OR_REPORT_VINTAGE_DRIFT');
  }
  return {
    state: 'OFFICIAL_LIVE_HTML_REPORTED_ANNUAL_ESTIMATE_RESEARCH_ONLY',
    source: 'IEA — Key Questions on Energy and AI (2026), executive summary',
    officialReport: IEA_DATA_CENTRE_REPORT,
    observationPeriod: String(observedYear),
    sourceDocumentYear: 2026,
    metric: 'global_data_centre_annual_electricity_demand',
    units: 'TWh_per_calendar_year',
    regionAndCoverage: 'worldwide_data_centres_not_electricity_utility_revenue',
    latestRawTwh: observedTwh,
    priorYearRawTwh: null,
    yoyGrowthPct: null,
    publishedRoundedYoyGrowthPct: roundedYoy,
    sequentialYoyAccelerationPctPoints: null,
    historicalYoyReferenceCount: 0,
    historicalAccelerationReferenceCount: 0,
    dataRefreshMode: 'LIVE_ORIGINAL_2026_REPORT_REVIEW_NEW_IEA_REPORT',
    rightsState: 'IEA_REPORT_CC_BY_4_0_SOURCE_CREDIT_REQUIRED',
    G: null, D: null, M: null, ranking: null,
    notes: [
      '2025 demand is an IEA estimate; the 2030 projection is not used as an observed value.',
      'Rounded 17% does not provide an exact 2024 denominator or historical acceleration.',
      'The official 2026 report URL is checked live; a newer publication must be reviewed separately.',
      'The full page is never persisted; no ranking or trading is enabled.',
    ],
  };
}

export async function fetchLatestOfficialIeaDataCentres({ fetchFn = fetch } = {}) {
  const response = await fetchFn(IEA_DATA_CENTRE_REPORT, {
    signal: AbortSignal.timeout(18000), headers: { accept: 'text/html' },
  });
  if (!response?.ok) throw new Error(`IEA_HTTP_${response?.status ?? 'UNAVAILABLE'}`);
  const actual = new URL(response.url ?? IEA_DATA_CENTRE_REPORT);
  if (actual.href !== IEA_DATA_CENTRE_REPORT) throw new Error('IEA_OFFICIAL_URL_DRIFT');
  const type = response.headers?.get?.('content-type');
  if (type && !type.toLowerCase().includes('text/html')) throw new Error('IEA_CONTENT_TYPE_DRIFT');
  const size = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(size) && size > MAX_HTML_BYTES) throw new Error('IEA_SOURCE_TOO_LARGE');
  return parseIeaDataCentreReport(await response.text());
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fetchLatestOfficialIeaDataCentres()
    .then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => { process.stderr.write(`${error?.message ?? error}\n`); process.exitCode = 1; });
}
