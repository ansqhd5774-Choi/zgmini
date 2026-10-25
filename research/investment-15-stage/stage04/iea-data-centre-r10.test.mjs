import test from 'node:test';
import assert from 'node:assert/strict';
import { IEA_DATA_CENTRE_REPORT, parseIeaDataCentreReport,
  fetchLatestOfficialIeaDataCentres } from './iea-data-centre-official-readonly.mjs';

export const validIeaHtml = `<html><head><title>Key Questions on Energy and AI</title></head><body>
<h1>Executive summary</h1><p>The global electricity demand of data centres – the critical infrastructure for training and running AI models – grew by 17% in 2025, in line with IEA projections.</p>
<p>Our updated projections see electricity consumption from data centres roughly doubling from 485 TWh in 2025 to 950 TWh in 2030, accounting for around 3% of global electricity demand by that date.</p>
<div>${'Other official report text. '.repeat(20)}</div></body></html>`;

test('IEA original 2026 report prose supplies dynamic 2025 raw TWh and separately rounded growth', () => {
  const x = parseIeaDataCentreReport(validIeaHtml);
  assert.equal(x.latestRawTwh, 485);
  assert.equal(x.publishedRoundedYoyGrowthPct, 17);
  assert.equal(x.observationPeriod, '2025');
  assert.equal(x.priorYearRawTwh, null);
  assert.equal(x.yoyGrowthPct, null);
  assert.equal(x.sequentialYoyAccelerationPctPoints, null);
  assert.equal(x.G, null);
  assert.equal(x.M, null);
});

test('IEA page source updates change parsed original values, not a pinned local snapshot', () => {
  const revised = validIeaHtml.replace('17% in 2025', '18% in 2025')
    .replace('485 TWh in 2025', '490 TWh in 2025');
  const x = parseIeaDataCentreReport(revised);
  assert.equal(x.latestRawTwh, 490);
  assert.equal(x.publishedRoundedYoyGrowthPct, 18);
});

test('IEA missing, ambiguous or mismatched years never fabricate current observations', () => {
  assert.throws(() => parseIeaDataCentreReport(validIeaHtml.replace('grew by 17%', 'grew substantially')),
    /METRIC_NOT_UNIQUE/);
  assert.throws(() => parseIeaDataCentreReport(validIeaHtml.replace('17% in 2025', '17% in 2024')),
    /VINTAGE_DRIFT/);
  assert.throws(() => parseIeaDataCentreReport(validIeaHtml.replace('</body>', `<p>The global electricity demand of data centres grew by 20% in 2025.</p></body>`)),
    /METRIC_NOT_UNIQUE/);
  assert.throws(() => parseIeaDataCentreReport(validIeaHtml.replace('485 TWh in 2025', '485 TWh in 2030')),
    /VINTAGE_DRIFT/);
});

test('IEA fetch validates original host, content type, and HTTP errors', async () => {
  const fetchFn = async (url) => ({ url, ok: true, status: 200,
    headers: { get: (name) => name === 'content-type' ? 'text/html; charset=utf-8' : null },
    text: async () => validIeaHtml });
  const result = await fetchLatestOfficialIeaDataCentres({ fetchFn });
  assert.equal(result.officialReport, IEA_DATA_CENTRE_REPORT);
  await assert.rejects(fetchLatestOfficialIeaDataCentres({ fetchFn: async () => ({
    url: 'https://unverified.example/report', ok: true,
  }) }), /OFFICIAL_URL_DRIFT/);
  await assert.rejects(fetchLatestOfficialIeaDataCentres({ fetchFn: async (url) => ({
    url, status: 503, ok: false,
  }) }), /IEA_HTTP_503/);
});
