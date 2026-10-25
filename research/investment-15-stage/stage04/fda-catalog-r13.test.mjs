import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FDA_APPROVAL_YEAR_CATALOG, parseFdaApprovalYearCatalog, fetchFdaApprovalYearCatalog,
} from './fda-edition-catalog-readonly.mjs';

const html = `<html><head><title>Novel Drug Approvals at FDA | FDA</title></head><body>
<h1>Novel Drug Approvals at FDA</h1>
<p>Center for Drug Evaluation and Research (CDER) catalog of yearly novel drug approval lists.</p>
<a href="/drugs/novel-drug-approvals-fda/novel-drug-approvals-2026">Novel Drug Approvals for 2026</a>
<a href="/drugs/novel-drug-approvals-fda/novel-drug-approvals-2025">Novel Drug Approvals for 2025</a>
<a href="/drugs/novel-drug-approvals-fda/novel-drug-approvals-2024">Novel Drug Approvals for 2024</a>
<p>${'The source is a list of URLs, not completed annual drug totals. '.repeat(40)}</p>
</body></html>`;

test('2026 official index link is a partial current-year listing, not completed 2026 annual growth', () => {
  const result = parseFdaApprovalYearCatalog(html, { asOfYear: 2026 });
  assert.equal(result.newestYearInOfficialIndex, 2026);
  assert.equal(result.latestFullCalendarYearEnded, 2025);
  assert.equal(result.pinnedCompletedAnnualReportYear, 2025);
  assert.equal(result.editionAlert, 'NEWER_CURRENT_YEAR_PARTIAL_LISTING_NOT_ANNUAL_REPORT');
  assert.equal(result.latestAnnualReportAutomaticallyVerified, false);
  assert.equal(result.annualCountFromCatalog, null);
  assert.equal(result.annualYoYGrowthFromCatalog, null);
  assert.deepEqual(result.updatedScores, []);
});

test('after the year end, listing of a later completed year requires manual annual-report review', () => {
  const result = parseFdaApprovalYearCatalog(html, { asOfYear: 2027 });
  assert.equal(result.editionAlert, 'NEWER_COMPLETED_YEAR_LISTED_ANNUAL_REPORT_REVIEW_REQUIRED');
  assert.equal(result.annualCountFromCatalog, null);
});

test('changed FDA identity, mismatched link year, future year and HTML scripts fail closed', () => {
  assert.throws(() => parseFdaApprovalYearCatalog(html.replace('<title>Novel Drug Approvals at FDA | FDA</title>', '<title>Other</title>')), /IDENTITY_DRIFT/);
  assert.throws(() => parseFdaApprovalYearCatalog(html.replace('Novel Drug Approvals for 2026</a>', 'Novel Drug Approvals for 2027</a>')), /LINK_TEXT_YEAR_MISMATCH/);
  assert.throws(() => parseFdaApprovalYearCatalog(html.replace('approvals-2026', 'approvals-2027')), /LINK_TEXT_YEAR_MISMATCH/);
  assert.throws(() => parseFdaApprovalYearCatalog(html.replaceAll('2026', '2027')), /YEAR_VINTAGE_DRIFT/);
  assert.throws(() => parseFdaApprovalYearCatalog('<html></html>'), /INVALID_HTML_SIZE/);
  const noLink = html.replace(/<a\s+href=[^>]+>Novel Drug Approvals for 20\d{2}<\/a>/g, '');
  assert.throws(() => parseFdaApprovalYearCatalog(noLink), /YEAR_LINKS_MISSING/);
});

test('FDA index direct GET validates official path, type and HTTP', async () => {
  const response = (overrides = {}) => ({
    url: FDA_APPROVAL_YEAR_CATALOG, ok: true, status: 200,
    headers: { get: (key) => key === 'content-type' ? 'text/html; charset=utf-8' : null },
    text: async () => html, ...overrides,
  });
  const result = await fetchFdaApprovalYearCatalog({ fetchFn: async () => response(), asOfDate: '2026-10-25' });
  assert.equal(result.currentYearListPresent, true);
  await assert.rejects(fetchFdaApprovalYearCatalog({ fetchFn: async () => response({ ok: false, status: 503 }) }), /FDA_CATALOG_HTTP_503/);
  await assert.rejects(fetchFdaApprovalYearCatalog({ fetchFn: async () => response({ url: 'https://example.org/index' }) }), /FDA_CATALOG_OFFICIAL_URL_DRIFT/);
  await assert.rejects(fetchFdaApprovalYearCatalog({ fetchFn: async () => response({ headers: { get: () => 'application/json' } }) }), /FDA_CATALOG_CONTENT_TYPE_DRIFT/);
});
