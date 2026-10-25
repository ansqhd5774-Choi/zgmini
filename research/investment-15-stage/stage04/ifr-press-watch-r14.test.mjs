import test from 'node:test';
import assert from 'node:assert/strict';
import { IFR_OFFICIAL_PRESS_INDEX, parseIfrIndustrialReleaseIndex,
  fetchIfrIndustrialReleaseIndex } from './ifr-edition-press-watch-readonly.mjs';

function pressCard({ year, name, text, slug, subtitle } = {}) {
  return `<div class="mh-news"><div class="container-fluid"><div class="row-fluid">
    <a href="/ifr-press-releases/news/${slug}"><h3 class="heading3">${name}</h3></a>
    <p class="subtitle">${subtitle ?? `World Robotics ${year} Report by IFR released`}</p>
    <div class="col-lg-6 news-teaser"><p>Frankfurt, Sep 24, ${year} — ${text}</p></div>
    </div></div></div> <!-- mh-news -->`;
}
const industrial2026 = pressCard({ year: 2026,
  name: 'Five Million Robots now Operate in Factories Globally',
  text: 'The global operational stock of industrial robots grew; installations were recorded in 2025.',
  slug: 'five-million-robots-now-operate-in-factories-globally' });
const service2027 = pressCard({ year: 2027, name: 'Professional Service Robots Surge',
  text: 'The World Robotics 2027 Service Robots report by IFR says that professional service robots sold worldwide.',
  slug: 'service-robots-grow-in-2027' });
const industrial2027 = pressCard({ year: 2027, name: 'Factory Deployments Grow Globally',
  text: 'The World Robotics industrial robots installations report covers factories worldwide.',
  slug: 'new-industrial-report-2027' });
const pad = '<p>Official IFR Press Room and publisher listing. </p>'.repeat(120);
const build = (...cards) => `<html><head><title>IFR Press Room</title></head><body>
  <h1>IFR Press Room</h1><h1>Press Releases</h1>${cards.join('\n')}${pad}</body></html>`;

test('official IFR 2026 industrial report and service robots 2027 stay separate', () => {
  const result = parseIfrIndustrialReleaseIndex(build(service2027, industrial2026), { asOfYear: 2027 });
  assert.equal(result.newestIndustrialReportYearInVisibleWindow, 2026);
  assert.equal(result.visibleServiceRobotsCardsIgnored, 1);
  assert.equal(result.indexIsCompleteAnnualCatalog, false);
  assert.equal(result.editionAlert, 'NO_LATER_INDUSTRIAL_RELEASE_IN_VISIBLE_PRESS_WINDOW_NOT_PROOF');
  assert.equal(result.latestAnnualReportAutomaticallyVerified, false);
  assert.equal(result.replacementAnnualInstallations, null);
  assert.equal(result.G, null);
});

test('genuine later industrial release signals PDF review but never replaces pinned counts', () => {
  const result = parseIfrIndustrialReleaseIndex(build(industrial2027, industrial2026), { asOfYear: 2027 });
  assert.equal(result.editionAlert, 'NEWER_INDUSTRIAL_WORLD_ROBOTICS_PRESS_RELEASE_REVIEW_REQUIRED');
  assert.equal(result.newestIndustrialReportYearInVisibleWindow, 2027);
  assert.equal(result.pinnedPdfReportYear, 2026);
  assert.equal(result.replacementReportYear, null);
  assert.deepEqual(result.updatedScores, []);
});

test('missing anchor or tampered identity fails closed, older window is explicitly inconclusive', () => {
  assert.throws(() => parseIfrIndustrialReleaseIndex(build(service2027), { asOfYear: 2027 }), /INDUSTRIAL_RELEASE_NOT_VISIBLE/);
  assert.throws(() => parseIfrIndustrialReleaseIndex(build(industrial2026).replace('<h1>Press Releases</h1>', '<h1>Unrelated</h1>')), /IDENTITY_DRIFT/);
  assert.throws(() => parseIfrIndustrialReleaseIndex(build(industrial2027, industrial2026), { asOfYear: 2026 }), /FUTURE_OR_INVALID_RELEASE_YEAR/);
  assert.throws(() => parseIfrIndustrialReleaseIndex(build(industrial2026).replaceAll('class="mh-news"', 'class="other"')), /CARD_STRUCTURE_DRIFT/);
  const old = pressCard({ year: 2025, name: 'Older Industrial Deployment News',
    text: 'Global industrial robots installations grew in 2024.', slug: 'industrial-robots-2025' });
  assert.equal(parseIfrIndustrialReleaseIndex(build(old), { asOfYear: 2026 }).editionAlert,
    'PINNED_REPORT_NOT_VISIBLE_WINDOW_INCONCLUSIVE');
});

test('IFR index GET refuses HTTP failure, host redirects, wrong type and oversized response', async () => {
  const response = (overrides = {}) => ({ url: IFR_OFFICIAL_PRESS_INDEX, ok: true, status: 200,
    headers: { get: (name) => name === 'content-type' ? 'text/html; charset=UTF-8' : null },
    text: async () => build(service2027, industrial2026), ...overrides });
  const ok = await fetchIfrIndustrialReleaseIndex({ fetchFn: async () => response(), asOfDate: '2027-01-04' });
  assert.equal(ok.newestIndustrialReportYearInVisibleWindow, 2026);
  await assert.rejects(fetchIfrIndustrialReleaseIndex({ fetchFn: async () => response({ status: 503, ok: false }) }), /HTTP_503/);
  await assert.rejects(fetchIfrIndustrialReleaseIndex({ fetchFn: async () => response({ url: 'https://example.org/ifr-press-releases' }) }), /OFFICIAL_URL_DRIFT/);
  await assert.rejects(fetchIfrIndustrialReleaseIndex({ fetchFn: async () => response({ headers: { get: () => 'application/pdf' } }) }), /CONTENT_TYPE_DRIFT/);
  await assert.rejects(fetchIfrIndustrialReleaseIndex({ fetchFn: async () => response({ headers: {
    get: (name) => name === 'content-length' ? '400000' : 'text/html',
  } }) }), /SOURCE_TOO_LARGE/);
});
