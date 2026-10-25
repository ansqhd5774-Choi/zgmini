import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ENISA_NIS_2025_RELEASE, parseEnisaNis2025Release, fetchLatestOfficialEnisaNis2025,
} from './enisa-nis-official-readonly.mjs';

export const ENISA_TEST_HTML = `<html><head><title>What’s Driving Cybersecurity Investments and Where Lie The Challenges?</title></head><body>
<p>Press Release 8 Dec 2025</p>
<p>The 6 th edition of the NIS Investments report reveals investments shifting from people to technology.</p>
<p>This year, the survey was carried out across 1080 public and private organisations in all Member States and covered all sectors and subsectors of high criticality under the NIS2 Directive.</p>
<p>The sample for this year’s survey included 83% large enterprises and 17% SMEs, enabling comparative insights between different types of organisations.</p>
<p>While organisations have maintained cybersecurity investment at levels comparable to last year’s (9% of IT budgets; median 1.5 million euro), spending is increasingly targeted towards technology.</p>
<p>${'Additional publication context, not a time series of market growth. '.repeat(35)}</p>
</body></html>`;

test('ENISA 2025 official survey captures budget share and sample, not annual industry growth', () => {
  const x = parseEnisaNis2025Release(ENISA_TEST_HTML);
  assert.equal(x.latestRawPct, 9);
  assert.equal(x.surveyRespondents, 1080);
  assert.equal(x.surveyLargePct, 83);
  assert.equal(x.surveySmePct, 17);
  assert.equal(x.medianCybersecurityEuro, 1_500_000);
  assert.equal(x.observationPeriod, '2025 survey (spending fiscal year not asserted)');
  assert.equal(x.yoyGrowthPct, null);
  assert.equal(x.sequentialYoyAccelerationPctPoints, null);
  assert.equal(x.G, null);
  assert.equal(x.M, null);
});

test('ENISA wrong edition, changed survey terms, multiple observations or invalid shares fail closed', () => {
  assert.throws(() => parseEnisaNis2025Release(ENISA_TEST_HTML.replace('8 Dec 2025', '8 Dec 2026')), /IDENTITY_OR_VINTAGE_DRIFT/);
  assert.throws(() => parseEnisaNis2025Release(ENISA_TEST_HTML.replace('9% of IT budgets', '9% revenue growth')), /METRIC_NOT_UNIQUE/);
  assert.throws(() => parseEnisaNis2025Release(ENISA_TEST_HTML.replace('83% large enterprises', '93% large enterprises')), /OUT_OF_RANGE/);
  assert.throws(() => parseEnisaNis2025Release(ENISA_TEST_HTML.replace('</body>', '<p>While organisations have maintained cybersecurity investment at levels comparable to last year’s (9% of IT budgets; median 1.5 million euro)</p></body>')), /METRIC_NOT_UNIQUE/);
});

test('ENISA ignores script-only metrics and does not accept markup pretending to be prose', () => {
  const noProse = ENISA_TEST_HTML.replace('9% of IT budgets; median 1.5 million euro', 'investment not published');
  const injected = noProse.replace('</body>', '<script>cybersecurity investment at levels comparable to last year’s (9% of IT budgets; median 1.5 million euro)</script></body>');
  assert.throws(() => parseEnisaNis2025Release(injected), /METRIC_NOT_UNIQUE/);
  assert.throws(() => parseEnisaNis2025Release(''), /INVALID_HTML_SIZE/);
});

test('ENISA fetch validates origin, MIME and HTTP before parsing live HTML', async () => {
  const response = (overrides = {}) => ({
    url: ENISA_NIS_2025_RELEASE, ok: true, status: 200,
    headers: { get: (key) => key === 'content-type' ? 'text/html; charset=utf-8' : null },
    text: async () => ENISA_TEST_HTML, ...overrides,
  });
  assert.equal((await fetchLatestOfficialEnisaNis2025({ fetchFn: async () => response() })).latestRawPct, 9);
  await assert.rejects(fetchLatestOfficialEnisaNis2025({ fetchFn: async () => response({ ok: false, status: 503 }) }), /ENISA_HTTP_503/);
  await assert.rejects(fetchLatestOfficialEnisaNis2025({ fetchFn: async () => response({ url: 'https://example.com/page' }) }), /ENISA_OFFICIAL_URL_DRIFT/);
  await assert.rejects(fetchLatestOfficialEnisaNis2025({ fetchFn: async () => response({ headers: { get: () => 'application/json' } }) }), /ENISA_CONTENT_TYPE_DRIFT/);
});
