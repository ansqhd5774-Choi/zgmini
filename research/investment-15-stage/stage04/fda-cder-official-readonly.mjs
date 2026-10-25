/**
 * FDA CDER novel-drug approvals. 2016–2025 values were transcribed from
 * page 8 of the single FDA 2025 annual report, and independently checked
 * against its text chart. The LIVE official PDF is fetched on every run:
 * the values are usable ONLY while its complete SHA256 matches the pinned
 * source document. A new/revised FDA publication fails closed, requiring
 * a reviewed series update. No fabricated live extraction is claimed.
 */
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FDA_CDER_2025_PDF = 'https://www.fda.gov/media/190705/download';
export const FDA_CDER_2025_SHA256 = '28818ae67b755166d1e16886b2968d47941b0f27e88ae7548a4a52facac6a9dc';
const MAX_PDF_BYTES = 6_000_000;
const ONE_REPORT_SERIES = Object.freeze([
  [2016, 22], [2017, 46], [2018, 59], [2019, 48], [2020, 53],
  [2021, 50], [2022, 37], [2023, 54], [2024, 50], [2025, 46],
]);

function annualYoy(value, prior) {
  if (!Number.isSafeInteger(value) || !Number.isSafeInteger(prior) || prior <= 0) {
    throw new Error('FDA_CDER_INVALID_SOURCE_COUNTS');
  }
  return 100 * (value / prior - 1);
}

export function readPinnedFdaCderReport(bytes, { expectedSha256 = FDA_CDER_2025_SHA256 } = {}) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 100 || bytes.length > MAX_PDF_BYTES
    || Buffer.from(bytes.subarray(0, 5)).toString('ascii') !== '%PDF-') {
    throw new Error('FDA_CDER_INVALID_PDF_CONTENT');
  }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== expectedSha256) throw new Error('FDA_CDER_SOURCE_VERSION_DRIFT');
  const observations = ONE_REPORT_SERIES.map(([year, count]) => ({ year, count }));
  for (let i = 1; i < observations.length; i += 1) {
    if (observations[i].year !== observations[i - 1].year + 1) {
      throw new Error('FDA_CDER_SERIES_GAP');
    }
  }
  const yoy = observations.map((row, i) => i === 0 ? null : annualYoy(row.count, observations[i - 1].count));
  const last = observations.length - 1;
  return {
    state: 'OFFICIAL_PDF_LIVE_HASH_VALIDATED_FIXED_REPORT_RESEARCH_ONLY',
    source: 'U.S. FDA CDER — New Drug Therapy Approvals 2025, page 8 annual chart',
    officialPdf: FDA_CDER_2025_PDF,
    sourceSha256: sha256,
    observationPeriod: String(observations[last].year),
    metric: 'CDER_novel_drug_approvals_annual_count',
    units: 'novel_approvals_per_calendar_year',
    regionAndCoverage: 'US_FDA_CDER_novel_drugs_not_total_biotech_industry',
    latestRawCount: observations[last].count,
    priorYearRawCount: observations[last - 1].count,
    priorTwoYearRawCount: observations[last - 2].count,
    yoyGrowthPct: yoy[last],
    sequentialYoyAccelerationPctPoints: yoy[last] - yoy[last - 1],
    historicalAnnualObservations: observations.length,
    historicalYoyReferenceCount: yoy.slice(1, -1).filter((x) => x !== null).length,
    historicalAccelerationReferenceCount: observations.length - 3,
    sourceDocumentYear: 2025,
    dataRefreshMode: 'PINNED_SINGLE_VINTAGE_REQUIRES_NEW_REVIEW_ON_PUBLICATION',
    G: null, D: null, M: null, ranking: null,
    notes: [
      'Published report facts are a fixed 2025 vintage; a successful check does not imply 2026 approvals.',
      'The entire official PDF is hashed on every run; a changed publication is not silently trusted.',
      'FDA CDER approvals are a limited scientific-output proxy, not the full biotechnology market.',
      'No ranking, historical percentile threshold, or investment weights are approved.',
    ],
  };
}

export async function fetchLatestOfficialFdaCder({ fetchFn = fetch } = {}) {
  const response = await fetchFn(FDA_CDER_2025_PDF, {
    signal: AbortSignal.timeout(20000), headers: { accept: 'application/pdf' },
  });
  if (!response?.ok) throw new Error(`FDA_CDER_HTTP_${response?.status ?? 'UNAVAILABLE'}`);
  const url = new URL(response.url ?? FDA_CDER_2025_PDF);
  if (url.protocol !== 'https:' || url.hostname !== 'www.fda.gov' || url.pathname !== '/media/190705/download') {
    throw new Error('FDA_CDER_OFFICIAL_URL_DRIFT');
  }
  const type = response.headers?.get?.('content-type');
  if (type && !type.toLowerCase().includes('application/pdf')) throw new Error('FDA_CDER_CONTENT_TYPE_DRIFT');
  const contentLength = Number(response.headers?.get?.('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_PDF_BYTES) {
    throw new Error('FDA_CDER_SOURCE_TOO_LARGE');
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  return readPinnedFdaCderReport(bytes);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fetchLatestOfficialFdaCder().then((data) => process.stdout.write(`${JSON.stringify(data, null, 2)}\n`))
    .catch((error) => { process.stderr.write(`${error?.message ?? error}\n`); process.exitCode = 1; });
}
