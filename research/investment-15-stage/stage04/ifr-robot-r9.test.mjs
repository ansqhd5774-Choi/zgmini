import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  IFR_WORLD_ROBOTICS_2026_PDF, IFR_WORLD_ROBOTICS_2026_SHA256,
  readPinnedIfrWorldRoboticsReport, fetchLatestOfficialIfrRobots,
} from './ifr-robot-official-readonly.mjs';

const syntheticPdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(170, 81)]);
const syntheticSha = createHash('sha256').update(syntheticPdf).digest('hex');

test('IFR same-vintage scalar facts remain unranked without a precise 2024 denominator', () => {
  const result = readPinnedIfrWorldRoboticsReport(syntheticPdf, { expectedSha256: syntheticSha });
  assert.equal(result.sourceDocumentYear, 2026);
  assert.equal(result.observationPeriod, '2025');
  assert.equal(result.latestRawCount, 603307);
  assert.equal(result.historical2022RawCount, 552946);
  assert.equal(result.publishedRoundedYoyGrowthPct, 11);
  assert.equal(result.priorYearRawCount, null);
  assert.equal(result.yoyGrowthPct, null);
  assert.equal(result.sequentialYoyAccelerationPctPoints, null);
  assert.equal(result.historicalYoyReferenceCount, 0);
  assert.equal(result.M, null);
});

test('IFR pinned PDF bytes fail closed on new vintage or invalid PDF', () => {
  assert.match(IFR_WORLD_ROBOTICS_2026_SHA256, /^[0-9a-f]{64}$/);
  assert.throws(() => readPinnedIfrWorldRoboticsReport(syntheticPdf), /IFR_SOURCE_VERSION_DRIFT/);
  assert.throws(() => readPinnedIfrWorldRoboticsReport(Buffer.alloc(200)), /IFR_INVALID_PDF_CONTENT/);
});

test('IFR same official URL, content type and size are enforced', async () => {
  const ok = async (url) => ({
    ok: true, status: 200, url,
    headers: { get: (key) => key === 'content-type' ? 'application/pdf' : null },
    arrayBuffer: async () => syntheticPdf,
  });
  await assert.rejects(() => fetchLatestOfficialIfrRobots({ fetchFn: ok }), /SOURCE_VERSION_DRIFT/);
  await assert.rejects(() => fetchLatestOfficialIfrRobots({
    fetchFn: async () => ({ ...await ok('https://example.com/other.pdf') }),
  }), /OFFICIAL_URL_DRIFT/);
  await assert.rejects(() => fetchLatestOfficialIfrRobots({
    fetchFn: async () => ({ ...await ok(IFR_WORLD_ROBOTICS_2026_PDF),
      headers: { get: (key) => key === 'content-type' ? 'text/html' : null } }),
  }), /CONTENT_TYPE_DRIFT/);
});

test('IFR 503 never falls back to cached scalar', async () => {
  await assert.rejects(() => fetchLatestOfficialIfrRobots({
    fetchFn: async () => ({ ok: false, status: 503 }),
  }), /IFR_HTTP_503/);
});
