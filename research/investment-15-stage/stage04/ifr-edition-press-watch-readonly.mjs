/**
 * R14: fetch IFR's designated press-release index every run, and detect only
 * World Robotics INDUSTRIAL report release cards. Service robots, sales trends
 * and general robotics news are not the same statistical publication.
 * This is a discovery alert, not a new PDF validation or a complete index.
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const IFR_OFFICIAL_PRESS_INDEX = 'https://ifr.org/ifr-press-releases';
const PINNED_REPORT_YEAR = 2026;
const MAX_HTML_BYTES = 350_000;

function asPlain(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|mdash|ndash);/gi, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function parseIfrIndustrialReleaseIndex(html, { asOfYear = 2026 } = {}) {
  if (typeof html !== 'string' || html.length < 5000 || Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    throw new Error('IFR_PRESS_INDEX_INVALID_HTML_SIZE');
  }
  if (!Number.isSafeInteger(asOfYear) || asOfYear < PINNED_REPORT_YEAR || asOfYear > 2100) {
    throw new Error('IFR_PRESS_INDEX_INVALID_ASOF_YEAR');
  }
  const clean = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ');
  // The list is intentionally a *visible window*, not the complete history.
  if (!/<h1\b[^>]*>\s*Press Releases\s*<\/h1>/i.test(clean)
    || !/IFR Press Room/i.test(clean)) throw new Error('IFR_PRESS_INDEX_IDENTITY_DRIFT');
  // A real card ends with the site's stable `<!-- mh-news -->` delimiter.
  const cards = [...clean.matchAll(/<div\s+class=["']mh-news["']>([\s\S]*?)<\/div>\s*<!--\s*mh-news\s*-->/gi)];
  if (!cards.length) throw new Error('IFR_PRESS_INDEX_CARD_STRUCTURE_DRIFT');

  const confirmed = [];
  let serviceCardsIgnored = 0;
  for (const item of cards) {
    const card = item[1];
    const header = card.match(/<a\s+href=["'](\/ifr-press-releases\/news\/[a-z0-9-]+)["']>\s*<h3\s+class=["']heading3["']>([\s\S]*?)<\/h3>\s*<\/a>/i);
    const subtitle = card.match(/<p\s+class=["']subtitle["']>([\s\S]*?)<\/p>/i);
    const teaser = card.match(/<div\s+class=["'][^"']*news-teaser[^"']*["']>([\s\S]*?)<\/div>/i);
    if (!header || !subtitle || !teaser) continue;
    const headline = asPlain(header[2]);
    const sub = asPlain(subtitle[1]);
    const excerpt = asPlain(teaser[1]);
    if (/service robots/i.test(`${headline} ${sub} ${excerpt}`)) {
      serviceCardsIgnored++;
      continue;
    }
    const edition = sub.match(/\bWorld Robotics\s+(20\d{2})\s+Report by IFR released\b/i);
    if (!edition || !/industrial robots/i.test(excerpt)) continue;
    const year = Number(edition[1]);
    if (year < 2015 || year > asOfYear) throw new Error('IFR_PRESS_INDEX_FUTURE_OR_INVALID_RELEASE_YEAR');
    confirmed.push({ reportYear: year, releaseUrl: `https://ifr.org${header[1]}` });
  }
  if (!confirmed.length) throw new Error('IFR_PRESS_INDEX_INDUSTRIAL_RELEASE_NOT_VISIBLE');
  const latestInWindow = Math.max(...confirmed.map((x) => x.reportYear));
  return {
    state: 'IFR_OFFICIAL_PRESS_WINDOW_LIVE_RESEARCH_ONLY',
    officialIndex: IFR_OFFICIAL_PRESS_INDEX,
    asOfCalendarYearKst: asOfYear,
    pinnedPdfReportYear: PINNED_REPORT_YEAR,
    newestIndustrialReportYearInVisibleWindow: latestInWindow,
    releasePage: confirmed.find((x) => x.reportYear === latestInWindow)?.releaseUrl ?? null,
    visibleIndustrialReportCards: confirmed.length,
    visibleServiceRobotsCardsIgnored: serviceCardsIgnored,
    indexIsCompleteAnnualCatalog: false,
    editionAlert: latestInWindow > PINNED_REPORT_YEAR
      ? 'NEWER_INDUSTRIAL_WORLD_ROBOTICS_PRESS_RELEASE_REVIEW_REQUIRED'
      : latestInWindow === PINNED_REPORT_YEAR
        ? 'NO_LATER_INDUSTRIAL_RELEASE_IN_VISIBLE_PRESS_WINDOW_NOT_PROOF'
        : 'PINNED_REPORT_NOT_VISIBLE_WINDOW_INCONCLUSIVE',
    latestAnnualReportAutomaticallyVerified: false,
    replacementReportYear: null,
    replacementAnnualInstallations: null,
    updatedScores: [],
    G: null, D: null, M: null, ranking: null,
  };
}

export async function fetchIfrIndustrialReleaseIndex({ fetchFn = fetch, asOfDate } = {}) {
  const asOfYear = asOfDate ? Number(String(asOfDate).slice(0, 4))
    : Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date()));
  const response = await fetchFn(IFR_OFFICIAL_PRESS_INDEX, {
    signal: AbortSignal.timeout(18000), headers: { accept: 'text/html' },
  });
  if (!response?.ok) throw new Error(`IFR_PRESS_INDEX_HTTP_${response?.status ?? 'UNAVAILABLE'}`);
  if (new URL(response.url ?? IFR_OFFICIAL_PRESS_INDEX).href !== IFR_OFFICIAL_PRESS_INDEX) {
    throw new Error('IFR_PRESS_INDEX_OFFICIAL_URL_DRIFT');
  }
  const type = response.headers?.get?.('content-type');
  if (type && !type.toLowerCase().includes('text/html')) throw new Error('IFR_PRESS_INDEX_CONTENT_TYPE_DRIFT');
  const length = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(length) && length > MAX_HTML_BYTES) throw new Error('IFR_PRESS_INDEX_SOURCE_TOO_LARGE');
  return parseIfrIndustrialReleaseIndex(await response.text(), { asOfYear });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fetchIfrIndustrialReleaseIndex().then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => { process.stderr.write(`${error?.message ?? error}\n`); process.exitCode = 1; });
}
