import test from 'node:test';
import assert from 'node:assert/strict';
import {
  discoverAsciiLink, parseFedNowAscii, fetchLatestOfficialFedNow, FEDNOW_PAGE,
} from './fednow-official-readonly.mjs';
import { F_ENDPOINT } from './latest-f-readonly.mjs';
import { EUROSTAT_CLOUD_API, parseEurostatCloud } from './eurostat-cloud-readonly.mjs';
import { IEA_DATA_CENTRE_REPORT } from './iea-data-centre-official-readonly.mjs';
import { ENISA_NIS_2025_RELEASE } from './enisa-nis-official-readonly.mjs';
import { FDA_APPROVAL_YEAR_CATALOG } from './fda-edition-catalog-readonly.mjs';
import { INDUSTRY_CONTRACT, runInvestmentBotInputGate } from './investment-bot-gate-readonly.mjs';
import { readPinnedFdaCderReport } from './fda-cder-official-readonly.mjs';
import { createHash } from 'node:crypto';

const asciiUrl = 'https://www.frbservices.org/wp-content/uploads/20261020-quarterly-3q2026-fednow-ascii.txt';
const html = `<html><p>FedNow Service</p><p>Last updated on October 20, 2026</p><a href="${asciiUrl}">ASCII</a></html>`;
const raw = `FedNow - Quarterly Data
 2026:Q3      6,376,467        27.6         370,862,703,867
 2026:Q2      4,997,811        83.2         274,663,803,964
 2026:Q1      2,728,510        10.6         271,252,920,121
 2025:Q4      2,466,494        (1.6)        251,776,175,998
 2025:Q3      2,506,002        17.6         307,275,281,996
 2025:Q2      2,130,889        62.7         245,759,303,513
 2025:Q1      1,310,017        43.1         48,600,347,003
 2024:Q4        915,263       172.0         20,181,963,324
 2024:Q3        336,487       115.6         17,491,272,167
 2024:Q2        156,076        60.2            492,250,054
 2024:Q1         97,424       133.6             31,421,885
 2023:Q4         41,698                         13,656,608
 2023:Q3          5,564                          4,776,756
`;
const names = Object.keys(INDUSTRY_CONTRACT);
const fakePdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(140, 42)]);
const fakePdfHash = createHash('sha256').update(fakePdf).digest('hex');
const fdaReader = async () => readPinnedFdaCderReport(fakePdf, { expectedSha256: fakePdfHash });
const cpucReader = async () => ({
  state: 'OFFICIAL_CALENDAR_QUARTER_RANGE_VERIFIED_RESEARCH_ONLY', observationPeriod: '2026:Q2',
  latestRawCount: 4220075, yoyGrowthPct: 88.8251081026904,
  sequentialYoyAccelerationPctPoints: -25.998404744588726,
  sourceArchivePeriods: ['2026:Q2', '2026:Q1', '2025:Q2', '2025:Q1'],
  historicalYoyReferenceCount: 1, historicalAccelerationReferenceCount: 0,
});
const ifrReader = async () => ({
  state: 'OFFICIAL_PDF_LIVE_HASH_VALIDATED_PARTIAL_ANNUAL_RESEARCH_ONLY',
  observationPeriod: '2025', latestRawCount: 603307,
  yoyGrowthPct: null, sequentialYoyAccelerationPctPoints: null,
  publishedRoundedYoyGrowthPct: 11, sourceSha256: 'test-ifr-sha',
  sourceDocumentYear: 2026,
  dataRefreshMode: 'PINNED_2026_EXECUTIVE_SUMMARY_REQUIRES_REVIEW_ON_NEXT_PUBLICATION',
  rightsState: 'LICENSE_REVIEW_RESEARCH_ONLY_NO_DATABASE_REDISTRIBUTION',
  historicalYoyReferenceCount: 0, historicalAccelerationReferenceCount: 0,
});
const eurostatJson = {
  version: '2.0', class: 'dataset', source: 'ESTAT', updated: '2026-02-27T11:00:00+0100',
  id: ['freq', 'size_emp', 'nace_r2', 'indic_is', 'unit', 'geo', 'time'],
  size: [1, 1, 1, 1, 1, 1, 10],
  value: { '0': 17.82, '2': 18.90, '4': 23.90, '5': 36.10, '6': 40.97, '7': 45.32, '9': 52.74 },
  extension: { datastructure: { version: '46.0' } },
  dimension: {
    freq: { category: { index: { A: 0 } } },
    size_emp: { category: { index: { GE10: 0 } } },
    nace_r2: { category: { index: { 'C10-S951_X_K': 0 } } },
    indic_is: { category: { index: { E_CC: 0 } } },
    unit: { category: { index: { PC_ENT: 0 } } },
    geo: { category: { index: { EU27_2020: 0 } } },
    time: { category: { index: { '2014': 0, '2015': 1, '2016': 2, '2017': 3, '2018': 4,
      '2020': 5, '2021': 6, '2023': 7, '2024': 8, '2025': 9 } } },
  },
};
const ieaHtml = `<html><head><title>Key Questions on Energy and AI</title></head><body>
<h1>Executive summary</h1>
<p>The global electricity demand of data centres – the critical infrastructure for training and running AI models – grew by 17% in 2025, in line with IEA projections.</p>
<p>Our updated projections see electricity consumption from data centres roughly doubling from 485 TWh in 2025 to 950 TWh in 2030, accounting for around 3% of global electricity demand by that date.</p>
<p>${'Report context. '.repeat(45)}</p></body></html>`;
const enisaHtml = `<html><head><title>What’s Driving Cybersecurity Investments and Where Lie The Challenges?</title></head><body>
<p>Press Release 8 Dec 2025</p><p>The 6 th edition of the NIS Investments report covers the EU.</p>
<p>This year, the survey was carried out across 1080 public and private organisations in all Member States.</p>
<p>The sample for this year’s survey included 83% large enterprises and 17% SMEs.</p>
<p>While organisations have maintained cybersecurity investment at levels comparable to last year’s (9% of IT budgets; median 1.5 million euro), spending shifted.</p>
<p>${'EU scope and source context, not annual market growth. '.repeat(45)}</p></body></html>`;
const fdaCatalogHtml = `<html><head><title>Novel Drug Approvals at FDA | FDA</title></head><body>
<h1>Novel Drug Approvals at FDA</h1><p>Center for Drug Evaluation and Research (CDER)</p>
<a href="/drugs/novel-drug-approvals-fda/novel-drug-approvals-2026">Novel Drug Approvals for 2026</a>
<a href="/drugs/novel-drug-approvals-fda/novel-drug-approvals-2025">Novel Drug Approvals for 2025</a>
<p>${'Official FDA index context. '.repeat(90)}</p></body></html>`;

function makeFetch({ brokenFedNow = false, brokenF = false, brokenEurostat = false, brokenIea = false, brokenEnisa = false, brokenFdaCatalog = false } = {}) {
  return async (url) => {
    if (url === F_ENDPOINT) return {
      url, ok: !brokenF, status: brokenF ? 503 : 200,
      json: async () => ({
        status: 'READY', sourceVersion: 'TEST', sourceStoredAt: '2026-10-25T05:00:27Z',
        themes: names.map((name) => ({ theme: name, score: 50,
          history: [{ date: '2026-10-23' }] })),
        provisional: { points: [{ date: '2026-10-23', scores: { '바이오·신약': 22.63294 } }] },
      }),
    };
    if (url === FEDNOW_PAGE) return { url, ok: true, status: 200, text: async () => html };
    if (url === EUROSTAT_CLOUD_API) return {
      url, ok: !brokenEurostat, status: brokenEurostat ? 503 : 200,
      json: async () => eurostatJson,
    };
    if (url === IEA_DATA_CENTRE_REPORT) return {
      url, ok: !brokenIea, status: brokenIea ? 503 : 200,
      headers: { get: () => 'text/html; charset=utf-8' },
      text: async () => ieaHtml,
    };
    if (url === ENISA_NIS_2025_RELEASE) return {
      url, ok: !brokenEnisa, status: brokenEnisa ? 503 : 200,
      headers: { get: () => 'text/html; charset=utf-8' },
      text: async () => enisaHtml,
    };
    if (url === FDA_APPROVAL_YEAR_CATALOG) return {
      url, ok: !brokenFdaCatalog, status: brokenFdaCatalog ? 503 : 200,
      headers: { get: () => 'text/html; charset=utf-8' },
      text: async () => fdaCatalogHtml,
    };
    if (url === asciiUrl) return {
      url, ok: !brokenFedNow, status: brokenFedNow ? 503 : 200, text: async () => raw,
    };
    throw new Error('UNEXPECTED_NETWORK_CALL');
  };
}

test('official page points to fresh original ASCII (not hard-coded archive)', () => {
  assert.equal(discoverAsciiLink(html), asciiUrl);
  assert.throws(() => discoverAsciiLink('<p>FedNow</p>'), /LINK_NOT_FOUND/);
  assert.throws(() => discoverAsciiLink('<p>FedNow</p><a href="https://example.com/fednow-ascii.txt">ASCII</a>'), /URL_NOT_OFFICIAL/);
});

test('original quarterly counts recompute official YoY and consecutive YoY change', () => {
  const x = parseFedNowAscii(raw);
  assert.equal(x.observationPeriod, '2026:Q3');
  assert.equal(x.latestRawCount, 6376467);
  assert.equal(x.previousYearSameQuarterCount, 2506002);
  assert.equal(x.fullQuarterObservations, 11);
  assert.equal(x.historicalYoyReferenceCount, 6);
  assert.equal(x.historicalAccelerationReferenceCount, 5);
  assert.ok(Math.abs(x.yoyGrowthPct - 154.4478) < 0.003);
  assert.ok(Math.abs(x.sequentialYoyAccelerationPctPoints - 19.9067) < 0.003);
  assert.equal(x.M, null);
});

test('duplicate, missing quarter and invalid source format are rejected', () => {
  assert.throws(() => parseFedNowAscii(`${raw} 2026:Q3 1,234 1.1\n`), /DUPLICATE/);
  assert.throws(() => parseFedNowAscii(raw.replace(/ 2025:Q2[^\n]*\n/, '')), /SEQUENCE_GAP/);
  assert.throws(() => parseFedNowAscii('Old saved market number 99'), /FORMAT_CHANGED/);
});

test('source browser fetch reads live URL and validates source content', async () => {
  const data = await fetchLatestOfficialFedNow({ fetchFn: makeFetch() });
  assert.equal(data.asciiUrl, asciiUrl);
  assert.equal(data.sourcePageLastUpdated, 'October 20, 2026');
});

test('Eurostat same-vintage sparse percentage-point differences never invent YoY', () => {
  const x = parseEurostatCloud(eurostatJson);
  assert.equal(x.latestAvailableYear, 2025);
  assert.equal(x.latestRawPct, 52.74);
  assert.deepEqual(x.twoYearComparisonYears, [2021, 2023, 2025]);
  assert.ok(Math.abs(x.twoYearDeltaPctPoints - 7.42) < 0.0001);
  assert.ok(Math.abs(x.changeBetweenTwoYearWindowsPctPoints - 3.07) < 0.0001);
  assert.deepEqual(x.missingYears, [2015, 2017, 2024]);
  assert.equal(x.G, null);
});

test('Eurostat changed cohort, bad rate, or missing comparison stays explicit', () => {
  assert.throws(() => parseEurostatCloud({ ...eurostatJson, dimension: {
    ...eurostatJson.dimension,
    geo: { category: { index: { US: 0 } } },
  } }), /DATA_SCOPE_DRIFT/);
  assert.throws(() => parseEurostatCloud({ ...eurostatJson, value: {
    ...eurostatJson.value, '9': 103,
  } }), /OUT_OF_RANGE_VALUE/);
  const missing = parseEurostatCloud({ ...eurostatJson, value: {
    ...eurostatJson.value, '7': undefined,
  } });
  assert.equal(missing.twoYearDeltaPctPoints, null);
  assert.equal(missing.state, 'OFFICIAL_SERIES_HISTORY_LIMITED');
});

test('bot joins nine existing F themes but never issues a ranking or an order', async () => {
  const result = await runInvestmentBotInputGate({ fetchFn: makeFetch(), asOfDate: '2026-10-25', fdaReader, cpucReader, ifrReader });
  assert.equal(result.runType, 'INVESTMENT_BOT_STAGE04_INPUT_GATE_R13');
  assert.equal(result.status, 'LIVE_INPUT_PARTIAL_INDUSTRY_UNRANKED');
  assert.equal(result.themes.length, 9);
  assert.equal(result.officialIndustry.validatedLiveThemes, 7);
  assert.equal(result.sourceVintageAudit.observedOriginalSources, 7);
  assert.equal(result.sourceVintageAudit.fixedEditionSources, 4);
  assert.equal(result.sourceVintageAudit.dynamicSourceSeries, 3);
  assert.equal(result.sourceVintageAudit.automaticLatestEditionClaims, 0);
  assert.equal(result.officialIndustry.fdaEditionCatalog.newestYearInOfficialIndex, 2026);
  assert.equal(result.officialIndustry.fdaEditionCatalog.editionAlert, 'NEWER_CURRENT_YEAR_PARTIAL_LISTING_NOT_ANNUAL_REPORT');
  assert.equal(result.sourceVintageAudit.rows.find((x) => x.institution === 'FDA CDER').newerPeriodCatalogAlert, 'NEWER_CURRENT_YEAR_PARTIAL_LISTING_NOT_ANNUAL_REPORT');
  assert.equal(result.sourceVintageAudit.rows.find((x) => x.institution === 'FDA CDER').editionCurrencyState, 'CURRENT_YEAR_LISTING_FOUND_PINNED_REPORT_STILL_LAST_VALIDATED');
  const robots = result.themes.find((x) => x.theme === '로봇·자동화');
  assert.equal(robots.industryRawCount, 603307);
  assert.equal(robots.industryGrowthPct, null);
  assert.equal(robots.industryReportedRoundedGrowthPct, 11);
  assert.equal(robots.industryAccelerationPctPoints, null);
  const biotech = result.themes.find((x) => x.theme === '바이오·신약');
  assert.equal(biotech.sentimentPhase, 'PROVISIONAL');
  assert.equal(biotech.sentimentF, 22.63294);
  assert.equal(biotech.industryRawCount, 46);
  assert.equal(biotech.industryObservationPeriod, '2025');
  assert.ok(Math.abs(biotech.industryGrowthPct + 8) < 0.000001);
  assert.equal(biotech.industryEvidenceState, 'LIVE_SOURCE_HASH_VALIDATED_FIXED_2025_REPORT');
  const av = result.themes.find((x) => x.theme === '자율주행');
  assert.equal(av.industryRawCount, 4220075);
  assert.ok(Math.abs(av.industryAccelerationPctPoints + 25.9984) < 0.003);
  const fintech = result.themes.find((x) => x.theme === '핀테크');
  assert.equal(fintech.industryObservationPeriod, '2026:Q3');
  assert.equal(fintech.industryRawCount, 6376467);
  const cloud = result.themes.find((x) => x.theme === '클라우드·SaaS');
  assert.equal(cloud.industryRawPercent, 52.74);
  assert.ok(Math.abs(cloud.industryTwoYearDeltaPctPoints - 7.42) < 0.0001);
  assert.equal(cloud.industryGrowthPct, null);
  const power = result.themes.find((x) => x.theme === '데이터센터·전력');
  assert.equal(power.industryObservationPeriod, '2025');
  assert.equal(power.industryRawTwh, 485);
  assert.equal(power.industryReportedRoundedGrowthPct, 17);
  assert.equal(power.industryGrowthPct, null);
  const cyber = result.themes.find((x) => x.theme === '사이버보안');
  assert.equal(cyber.industryRawPercent, 9);
  assert.equal(cyber.industrySurveyRespondents, 1080);
  assert.equal(cyber.industryMedianEuro, 1_500_000);
  assert.equal(cyber.industryGrowthPct, null);
  assert.equal(cyber.industryAccelerationPctPoints, null);
  assert.equal(result.officialIndustry.enisaNis.sourcePublished, '2025-12-08');
  assert.ok(result.themes.every((x) => x.approvedAttractivenessM === null && x.officialRank === null));
  assert.equal(result.automatedTradeEnabled, false);
  assert.deepEqual(result.orderRequests, []);
});

test('Eurostat source down does not silently reuse a past response', async () => {
  const result = await runInvestmentBotInputGate({
    fetchFn: makeFetch({ brokenEurostat: true }), asOfDate: '2026-10-25', fdaReader, cpucReader, ifrReader,
  });
  assert.equal(result.status, 'PARTIAL_OR_FAILED_INPUT_UNRANKED');
  assert.equal(result.officialIndustry.eurostat.failureCode, 'EUROSTAT_HTTP_503');
  assert.equal(result.themes.find((x) => x.theme === '클라우드·SaaS').industryRawPercent, null);
});

test('IEA official report HTTP failure leaves raw TWh and rounded growth NULL', async () => {
  const result = await runInvestmentBotInputGate({
    fetchFn: makeFetch({ brokenIea: true }), asOfDate: '2026-10-25', fdaReader, cpucReader, ifrReader,
  });
  assert.equal(result.status, 'PARTIAL_OR_FAILED_INPUT_UNRANKED');
  assert.equal(result.officialIndustry.validatedLiveThemes, 6);
  assert.equal(result.officialIndustry.ieaDataCentres.failureCode, 'IEA_HTTP_503');
  const power = result.themes.find((x) => x.theme === '데이터센터·전력');
  assert.equal(power.industryRawTwh, null);
  assert.equal(power.industryReportedRoundedGrowthPct, null);
  assert.equal(power.sentimentF, 50);
  assert.equal(result.automatedTradeEnabled, false);
});

test('FedNow HTTP failure preserves NULL industry values, not fake success', async () => {
  const result = await runInvestmentBotInputGate({ fetchFn: makeFetch({ brokenFedNow: true }), asOfDate: '2026-10-25', fdaReader, cpucReader, ifrReader });
  assert.equal(result.status, 'PARTIAL_OR_FAILED_INPUT_UNRANKED');
  assert.equal(result.officialIndustry.fednow.failureCode, 'FEDNOW_HTTP_503');
  assert.equal(result.themes.find((x) => x.theme === '핀테크').industryRawCount, null);
  assert.equal(result.themes.find((x) => x.theme === '핀테크').sentimentF, 50);
  assert.equal(result.automatedTradeEnabled, false);
});

test('F HTTP failure preserves NULL F without substituting stored values', async () => {
  const result = await runInvestmentBotInputGate({ fetchFn: makeFetch({ brokenF: true }), asOfDate: '2026-10-25', fdaReader, cpucReader, ifrReader });
  assert.equal(result.status, 'PARTIAL_OR_FAILED_INPUT_UNRANKED');
  assert.equal(result.F.failureCode, 'F_API_HTTP_503');
  assert.equal(result.themes.length, 9);
  assert.ok(result.themes.every((x) => x.sentimentF === null && x.approvedGrowthG === null));
  assert.equal(result.automatedTradeEnabled, false);
});

test('FDA source version drift cannot silently promote saved 2025 numbers', async () => {
  const result = await runInvestmentBotInputGate({ fetchFn: makeFetch(), asOfDate: '2026-10-25',
    fdaReader: async () => { throw new Error('FDA_CDER_SOURCE_VERSION_DRIFT'); }, cpucReader, ifrReader });
  assert.equal(result.status, 'PARTIAL_OR_FAILED_INPUT_UNRANKED');
  assert.equal(result.officialIndustry.validatedLiveThemes, 6);
  assert.equal(result.officialIndustry.fdaCder.failureCode, 'FDA_CDER_SOURCE_VERSION_DRIFT');
  assert.equal(result.themes.find((x) => x.theme === '바이오·신약').industryRawCount, null);
  assert.equal(result.themes.find((x) => x.theme === '바이오·신약').sentimentF, 22.63294);
});

test('CPUC source failure cannot reuse Waymo aggregate or suppress F', async () => {
  const result = await runInvestmentBotInputGate({ fetchFn: makeFetch(), asOfDate: '2026-10-25',
    fdaReader, cpucReader: async () => { throw new Error('CPUC_RANGE_HTTP_503'); }, ifrReader });
  assert.equal(result.status, 'PARTIAL_OR_FAILED_INPUT_UNRANKED');
  assert.equal(result.officialIndustry.cpucAv.failureCode, 'CPUC_RANGE_HTTP_503');
  assert.equal(result.themes.find((x) => x.theme === '자율주행').industryRawCount, null);
  assert.equal(result.themes.find((x) => x.theme === '자율주행').sentimentF, 50);
  assert.equal(result.automatedTradeEnabled, false);
});

test('IFR source drift preserves NULL robot industry rather than turning rounded YoY into precise growth', async () => {
  const result = await runInvestmentBotInputGate({ fetchFn: makeFetch(), asOfDate: '2026-10-25',
    fdaReader, cpucReader,
    ifrReader: async () => { throw new Error('IFR_SOURCE_VERSION_DRIFT'); },
  });
  assert.equal(result.status, 'PARTIAL_OR_FAILED_INPUT_UNRANKED');
  assert.equal(result.officialIndustry.validatedLiveThemes, 6);
  assert.equal(result.officialIndustry.ifrRobots.failureCode, 'IFR_SOURCE_VERSION_DRIFT');
  const robot = result.themes.find((x) => x.theme === '로봇·자동화');
  assert.equal(robot.industryRawCount, null);
  assert.equal(robot.industryReportedRoundedGrowthPct, null);
  assert.equal(robot.industryGrowthPct, null);
  assert.equal(robot.sentimentF, 50);
});

test('ENISA failure preserves F but clears cybersecurity survey observations and blocks full source validation', async () => {
  const result = await runInvestmentBotInputGate({
    fetchFn: makeFetch({ brokenEnisa: true }), asOfDate: '2026-10-25', fdaReader, cpucReader, ifrReader,
  });
  assert.equal(result.status, 'PARTIAL_OR_FAILED_INPUT_UNRANKED');
  assert.equal(result.officialIndustry.validatedLiveThemes, 6);
  assert.equal(result.officialIndustry.enisaNis.failureCode, 'ENISA_HTTP_503');
  const cyber = result.themes.find((x) => x.theme === '사이버보안');
  assert.equal(cyber.industryRawPercent, null);
  assert.equal(cyber.industrySurveyRespondents, null);
  assert.equal(cyber.industryMedianEuro, null);
  assert.equal(cyber.sentimentF, 50);
  assert.equal(cyber.officialRank, null);
  assert.equal(result.automatedTradeEnabled, false);
});

test('FDA catalog HTTP 503 is separately UNVERIFIED, with the 2025 hashed annual report and F unchanged', async () => {
  const result = await runInvestmentBotInputGate({
    fetchFn: makeFetch({ brokenFdaCatalog: true }), asOfDate: '2026-10-25',
    fdaReader, cpucReader, ifrReader,
  });
  assert.equal(result.status, 'LIVE_INPUT_PARTIAL_INDUSTRY_UNRANKED');
  assert.equal(result.officialIndustry.validatedLiveThemes, 7);
  assert.equal(result.officialIndustry.fdaEditionCatalog.failureCode, 'FDA_CATALOG_HTTP_503');
  assert.equal(result.officialIndustry.fdaEditionCatalog.editionAlert, 'UNVERIFIED');
  const fda = result.themes.find((x) => x.theme === '바이오·신약');
  assert.equal(fda.industryRawCount, 46);
  assert.equal(fda.industryObservationPeriod, '2025');
  assert.equal(fda.sentimentF, 22.63294);
  assert.equal(fda.officialRank, null);
  assert.deepEqual(result.orderRequests, []);
});
