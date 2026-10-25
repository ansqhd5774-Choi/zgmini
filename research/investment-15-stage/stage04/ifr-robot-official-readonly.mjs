/**
 * IFR World Robotics 2026 single-publication validation, research only.
 * This verifies the actual official PDF bytes by SHA256 on every run. Only
 * three disclosed scalar facts are preregistered: 2025 installation count,
 * rounded 2025 YoY, and the 2022 historical record. The full (licensed)
 * World Robotics database is neither scraped nor redistributed.
 *
 * IMPORTANT: an 11% rounded published YoY is NOT a precisely calculated YoY,
 * and the 2022 count is NOT the previous year. Missing same-vintage exact
 * 2023–24 counts leave derived growth and acceleration NULL.
 */
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const IFR_WORLD_ROBOTICS_2026_PDF = 'https://ifr.org/img/worldrobotics/Executive_Summary_WR_2026_-_Industrial_Robots.pdf';
export const IFR_WORLD_ROBOTICS_2026_SHA256 = 'a6c2ab78c54fcbe01f6b4cabf16ad0eda9674e71d9516b8659c7dde546ba31d5';
const MAX_PDF_BYTES = 6_000_000;

export function readPinnedIfrWorldRoboticsReport(bytes, {
  expectedSha256 = IFR_WORLD_ROBOTICS_2026_SHA256,
} = {}) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 100 || bytes.length > MAX_PDF_BYTES
    || Buffer.from(bytes.subarray(0, 5)).toString('ascii') !== '%PDF-') {
    throw new Error('IFR_INVALID_PDF_CONTENT');
  }
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (sha !== expectedSha256) throw new Error('IFR_SOURCE_VERSION_DRIFT');
  return {
    state: 'OFFICIAL_PDF_LIVE_HASH_VALIDATED_PARTIAL_ANNUAL_RESEARCH_ONLY',
    source: 'International Federation of Robotics, World Robotics 2026 Industrial Robots, executive summary',
    officialPdf: IFR_WORLD_ROBOTICS_2026_PDF,
    sourceSha256: sha,
    sourceDocumentYear: 2026,
    observationPeriod: '2025',
    metric: 'world_industrial_robot_new_installations_per_calendar_year',
    units: 'robots_newly_installed_annually',
    regionAndCoverage: 'worldwide_industrial_robots_not_operational_stock_or_service_robots',
    latestRawCount: 603307,
    historical2022RawCount: 552946,
    priorYearRawCount: null,
    yoyGrowthPct: null,
    sequentialYoyAccelerationPctPoints: null,
    publishedRoundedYoyGrowthPct: 11,
    historicalYoyReferenceCount: 0,
    historicalAccelerationReferenceCount: 0,
    dataRefreshMode: 'PINNED_2026_EXECUTIVE_SUMMARY_REQUIRES_REVIEW_ON_NEXT_PUBLICATION',
    rightsState: 'LICENSE_REVIEW_RESEARCH_ONLY_NO_DATABASE_REDISTRIBUTION',
    G: null, D: null, M: null, ranking: null,
    notes: [
      '603,307 is the 2025 measured installation count; 655,000 for 2026 is only a forecast and is excluded.',
      'Published +11% is rounded, not recomputed from a same-vintage exact 2024 base.',
      'The 2022 record of 552,946 is a historical reference, not the 2024 denominator.',
      'No licensed World Robotics data query, PDF reproduction, official G score, ranking or trading.',
    ],
  };
}

export async function fetchLatestOfficialIfrRobots({ fetchFn = fetch } = {}) {
  const response = await fetchFn(IFR_WORLD_ROBOTICS_2026_PDF, {
    signal: AbortSignal.timeout(25000), headers: { accept: 'application/pdf' },
  });
  if (!response?.ok) throw new Error(`IFR_HTTP_${response?.status ?? 'UNAVAILABLE'}`);
  if (new URL(response.url ?? IFR_WORLD_ROBOTICS_2026_PDF).href !== IFR_WORLD_ROBOTICS_2026_PDF) {
    throw new Error('IFR_OFFICIAL_URL_DRIFT');
  }
  const type = response.headers?.get?.('content-type');
  if (type && !type.toLowerCase().includes('application/pdf')) throw new Error('IFR_CONTENT_TYPE_DRIFT');
  const lengthHeader = response.headers?.get?.('content-length');
  if (lengthHeader && Number(lengthHeader) > MAX_PDF_BYTES) throw new Error('IFR_SOURCE_TOO_LARGE');
  return readPinnedIfrWorldRoboticsReport(new Uint8Array(await response.arrayBuffer()));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fetchLatestOfficialIfrRobots().then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => { process.stderr.write(`${error?.message ?? error}\n`); process.exitCode = 1; });
}
