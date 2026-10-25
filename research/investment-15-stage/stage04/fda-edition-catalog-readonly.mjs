/**
 * FDA CDER report-vintage watch, R13.
 * Visits the designated official year index at execution. A link to the
 * current calendar year is an in-progress listing, NOT an annual close-out
 * report; no count is extracted, stored, backfilled or added to G/D/M.
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const FDA_APPROVAL_YEAR_CATALOG = 'https://www.fda.gov/drugs/development-approval-process-drugs/novel-drug-approvals-fda';
const MAX_HTML_BYTES = 500_000;
const PINNED_COMPLETED_REPORT_YEAR = 2025;

export function parseFdaApprovalYearCatalog(html, { asOfYear = 2026 } = {}) {
  if (typeof html !== 'string' || html.length < 2000 || Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    throw new Error('FDA_CATALOG_INVALID_HTML_SIZE');
  }
  const clean = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ');
  if (!/<title>Novel Drug Approvals at FDA\s*\|\s*FDA<\/title>/i.test(clean)
    || !/Center for Drug Evaluation and Research|CDER/.test(clean)) {
    throw new Error('FDA_CATALOG_IDENTITY_DRIFT');
  }
  const links = [...clean.matchAll(/<a\b[^>]*href=["']\/drugs\/novel-drug-approvals-fda\/novel-drug-approvals-(20\d{2})["'][^>]*>\s*Novel Drug Approvals for\s+(20\d{2})\s*<\/a>/gi)];
  if (!links.length || !Number.isSafeInteger(asOfYear) || asOfYear < PINNED_COMPLETED_REPORT_YEAR
    || asOfYear > 2100) throw new Error('FDA_CATALOG_YEAR_LINKS_MISSING');
  const years = [...new Set(links.map((match) => {
    if (match[1] !== match[2]) throw new Error('FDA_CATALOG_LINK_TEXT_YEAR_MISMATCH');
    return Number(match[1]);
  }))].sort((a, b) => b - a);
  if (years.some((year) => year < 2010 || year > asOfYear) || !years.includes(PINNED_COMPLETED_REPORT_YEAR)) {
    throw new Error('FDA_CATALOG_YEAR_VINTAGE_DRIFT');
  }
  const latestListedYear = years[0];
  return {
    state: 'FDA_OFFICIAL_YEAR_CATALOG_LIVE_RESEARCH_ONLY',
    officialIndex: FDA_APPROVAL_YEAR_CATALOG,
    asOfCalendarYearKst: asOfYear,
    pinnedCompletedAnnualReportYear: PINNED_COMPLETED_REPORT_YEAR,
    newestYearInOfficialIndex: latestListedYear,
    currentYearListPresent: years.includes(asOfYear),
    latestFullCalendarYearEnded: asOfYear - 1,
    editionAlert: latestListedYear > PINNED_COMPLETED_REPORT_YEAR
      ? latestListedYear === asOfYear
        ? 'NEWER_CURRENT_YEAR_PARTIAL_LISTING_NOT_ANNUAL_REPORT'
        : 'NEWER_COMPLETED_YEAR_LISTED_ANNUAL_REPORT_REVIEW_REQUIRED'
      : 'NO_LATER_APPROVAL_YEAR_LISTED',
    latestAnnualReportAutomaticallyVerified: false,
    annualCountFromCatalog: null,
    annualYoYGrowthFromCatalog: null,
    annualAccelerationFromCatalog: null,
    updatedScores: [],
    G: null, D: null, M: null, ranking: null,
  };
}

export async function fetchFdaApprovalYearCatalog({ fetchFn = fetch, asOfDate } = {}) {
  const asOfYear = asOfDate ? Number(String(asOfDate).slice(0, 4))
    : Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date()));
  const response = await fetchFn(FDA_APPROVAL_YEAR_CATALOG, {
    signal: AbortSignal.timeout(18000), headers: { accept: 'text/html' },
  });
  if (!response?.ok) throw new Error(`FDA_CATALOG_HTTP_${response?.status ?? 'UNAVAILABLE'}`);
  if (new URL(response.url ?? FDA_APPROVAL_YEAR_CATALOG).href !== FDA_APPROVAL_YEAR_CATALOG) {
    throw new Error('FDA_CATALOG_OFFICIAL_URL_DRIFT');
  }
  const type = response.headers?.get?.('content-type');
  if (type && !type.toLowerCase().includes('text/html')) throw new Error('FDA_CATALOG_CONTENT_TYPE_DRIFT');
  const length = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(length) && length > MAX_HTML_BYTES) throw new Error('FDA_CATALOG_SOURCE_TOO_LARGE');
  return parseFdaApprovalYearCatalog(await response.text(), { asOfYear });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fetchFdaApprovalYearCatalog().then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => { process.stderr.write(`${error?.message ?? error}\n`); process.exitCode = 1; });
}
