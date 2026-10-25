/**
 * Read an ORIGINAL Federal Reserve Financial Services quarterly FedNow table.
 * The active ASCII file URL is discovered afresh from the official statistics
 * page; a previously observed file URL is never silently used as a fallback.
 *
 * Research only: no G/M scores, automatic orders, disk writes or schedules.
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const FEDNOW_PAGE = 'https://www.frbservices.org/resources/financial-services/fednow-service-resources/fednow-service-volume-value-statistics/';
// The official WordPress statistics page currently includes ~4.1 MB of site
// chrome, while its machine-friendly ASCII quarterly table is much smaller.
const MAX_HTML_BYTES = 5_000_000;
const MAX_ASCII_BYTES = 300_000;

function assertOfficialUrl(value, extension) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'www.frbservices.org' || !url.pathname.endsWith(extension)) {
    throw new Error('FEDNOW_SOURCE_URL_NOT_OFFICIAL');
  }
  return url.href;
}

function quarterOrdinal(period) {
  const match = /^(20\d{2}):Q([1-4])$/.exec(period);
  if (!match) throw new Error('FEDNOW_INVALID_QUARTER');
  return Number(match[1]) * 4 + Number(match[2]) - 1;
}

function growth(current, prior) {
  if (!Number.isSafeInteger(current) || !Number.isSafeInteger(prior) || prior <= 0) {
    throw new Error('FEDNOW_BAD_YOY_DENOMINATOR');
  }
  return 100 * (current / prior - 1);
}

export function discoverAsciiLink(html) {
  if (typeof html !== 'string' || html.length > MAX_HTML_BYTES || !html.includes('FedNow')) {
    throw new Error('FEDNOW_OFFICIAL_PAGE_UNEXPECTED');
  }
  const match = html.match(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>\s*ASCII\s*<\/a>/i);
  if (!match) throw new Error('FEDNOW_ASCII_LINK_NOT_FOUND');
  const url = new URL(match[1].replaceAll('&amp;', '&'), FEDNOW_PAGE);
  if (!/fednow.*ascii\.txt$/i.test(url.pathname)) throw new Error('FEDNOW_ASCII_FILE_IDENTITY_DRIFT');
  return assertOfficialUrl(url.href, '.txt');
}

export function parseFedNowAscii(raw, { asciiUrl = null, pageLastUpdated = null } = {}) {
  if (typeof raw !== 'string' || raw.length > MAX_ASCII_BYTES || !/FedNow\s*-\s*Quarterly Data/i.test(raw)) {
    throw new Error('FEDNOW_ASCII_FORMAT_CHANGED');
  }
  const all = [];
  const seen = new Set();
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*(20\d{2}):Q([1-4])\s+([\d,]+)(?:\s|$)/);
    if (!match) continue;
    const period = `${match[1]}:Q${match[2]}`;
    const payments = Number(match[3].replaceAll(',', ''));
    if (!Number.isSafeInteger(payments) || payments <= 0 || seen.has(period)) {
      throw new Error('FEDNOW_INVALID_OR_DUPLICATE_OBSERVATION');
    }
    seen.add(period);
    all.push({ period, payments });
  }
  if (all.length < 8) throw new Error('FEDNOW_TOO_FEW_QUARTERS');
  for (let i = 1; i < all.length; i += 1) {
    if (quarterOrdinal(all[i - 1].period) - quarterOrdinal(all[i].period) !== 1) {
      throw new Error('FEDNOW_QUARTER_SEQUENCE_GAP_OR_DRIFT');
    }
  }

  // 2023:Q3 is not a full quarter, and 2023:Q4 is excluded from the R5
  // preregistered sensitivity series. Preserve only 2024:Q1 onward.
  const quarters = all.filter(({ period }) => quarterOrdinal(period) >= quarterOrdinal('2024:Q1')).reverse();
  if (quarters.length < 8) throw new Error('FEDNOW_TOO_FEW_FULL_QUARTERS');
  const yoy = quarters.map((point, i) => i < 4 ? null : growth(point.payments, quarters[i - 4].payments));
  const accel = yoy.map((current, i) => i <= 4 ? null : current - yoy[i - 1]);
  const last = quarters.length - 1;
  return {
    source: 'Federal Reserve Financial Services — FedNow Service Volume and Value Statistics',
    officialPage: FEDNOW_PAGE,
    asciiUrl,
    sourcePageLastUpdated: pageLastUpdated,
    observationPeriod: quarters[last].period,
    metric: 'settled_customer_credit_transfers_count',
    units: 'payments_per_calendar_quarter',
    regionAndCoverage: 'FedNow network only, not total fintech market',
    latestRawCount: quarters[last].payments,
    previousYearSameQuarterCount: quarters[last - 4].payments,
    previousQuarterCount: quarters[last - 1].payments,
    yoyGrowthPct: yoy[last],
    sequentialYoyAccelerationPctPoints: accel[last],
    fullQuarterObservations: quarters.length,
    historicalYoyReferenceCount: yoy.slice(0, -1).filter((value) => value !== null).length,
    historicalAccelerationReferenceCount: accel.slice(0, -1).filter((value) => value !== null).length,
    state: 'OFFICIAL_SOURCE_LIVE_RESEARCH_ONLY',
    G: null,
    D: null,
    M: null,
    ranking: null,
    notes: [
      'Each rate is recomputed from official raw counts, not from published QoQ percentages.',
      'No percentile minimum N or G/D/M weights have been approved.',
      'Only the registered 2024:Q1+ full-quarter research window is used.',
      'Single-network adoption is a limited industry proxy; no trade signal.',
    ],
  };
}

async function getText(url, fetchFn) {
  const response = await fetchFn(url, { signal: AbortSignal.timeout(15000), headers: { accept: 'text/html, text/plain' } });
  if (!response?.ok) throw new Error(`FEDNOW_HTTP_${response?.status ?? 'UNAVAILABLE'}`);
  // A redirect to another host must never be accepted as an official data feed.
  assertOfficialUrl(response.url ?? url, url.endsWith('.txt') ? '.txt' : '/');
  const content = await response.text();
  if (content.length > (url.endsWith('.txt') ? MAX_ASCII_BYTES : MAX_HTML_BYTES)) {
    throw new Error('FEDNOW_SOURCE_TOO_LARGE');
  }
  return content;
}

export async function fetchLatestOfficialFedNow({ fetchFn = fetch } = {}) {
  const html = await getText(FEDNOW_PAGE, fetchFn);
  const url = discoverAsciiLink(html);
  const match = html.match(/Last\s+updated\s+on\s+(?:<[^>]+>\s*)?([A-Za-z]+\s+\d{1,2},\s+20\d{2})/i);
  const ascii = await getText(url, fetchFn);
  return parseFedNowAscii(ascii, { asciiUrl: url, pageLastUpdated: match?.[1] ?? null });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fetchLatestOfficialFedNow().then((data) => {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
  }).catch((error) => {
    process.stderr.write(`FEDNOW_OFFICIAL_UNAVAILABLE: ${error?.message ?? String(error)}\n`);
    process.exitCode = 1;
  });
}
