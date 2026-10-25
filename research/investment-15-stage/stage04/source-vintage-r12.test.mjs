import test from 'node:test';
import assert from 'node:assert/strict';
import { auditStage04SourceVintage } from './source-vintage-audit-readonly.mjs';

const institutions = [
  'IFR', 'Eurostat', 'CPUC', 'IAEA PRIS', 'SIPRI',
  'Federal Reserve Financial Services', 'ENISA', 'FDA CDER', 'IEA',
];
function fakeGate() {
  const themes = institutions.map((name, i) => ({
    theme: `t${i}`, industryInstitution: name,
    industryOfficialSource: `https://example.com/source/${i}`,
    industryEvidenceState: name === 'SIPRI' || name === 'IAEA PRIS'
      ? 'NOT_AUTOMATICALLY_VERIFIED' : 'LIVE_ORIGINAL_OBSERVATION',
    industryObservationPeriod: '2025',
    industryRawCount: name === 'SIPRI' || name === 'IAEA PRIS' ? null : 500,
    industryRawTwh: null, industryRawPercent: null,
    approvedGrowthG: null, approvedDislocationD: null,
    approvedAttractivenessM: null, officialRank: null,
  }));
  return {
    runType: 'INVESTMENT_BOT_STAGE04_INPUT_GATE_R12',
    runAtUtc: '2026-10-25T12:00:00.000Z', themes,
    officialIndustry: {
      validatedLiveThemes: 7, expectedThemes: 9,
      fednow: { sourcePageLastUpdated: 'October 20, 2026' },
      eurostat: { sourceUpdatedAt: '2026-02-27T11:00:00+0100' },
      fdaCder: { sourceDocumentYear: 2025 },
      cpucAv: {}, ifrRobots: { sourceDocumentYear: 2026 },
      ieaDataCentres: { sourceDocumentYear: 2026 },
      enisaNis: { sourcePublished: '2025-12-08' },
    },
    automatedTradeEnabled: false, orderRequests: [],
  };
}

test('R12 separates execution time from original observation and 2025 release date', () => {
  const x = auditStage04SourceVintage(fakeGate());
  assert.equal(x.observedOriginalSources, 7);
  assert.equal(x.fixedEditionSources, 4);
  assert.equal(x.dynamicSourceSeries, 3);
  assert.equal(x.unavailableSources, 2);
  assert.equal(x.automaticLatestEditionClaims, 0);
  const enisa = x.rows.find((v) => v.institution === 'ENISA');
  assert.equal(enisa.observationPeriod, '2025');
  assert.equal(enisa.publicationDateIso, '2025-12-08');
  assert.equal(enisa.sourceDocumentYear, 2025);
  assert.equal(enisa.gateCompletedAtUtc, '2026-10-25T12:00:00.000Z');
  assert.equal(enisa.editionCurrencyState, 'PINNED_EDITION_NEWER_EDITION_NOT_AUTO_DETECTED');
  assert.equal(enisa.latestEditionVerified, false);
  const eu = x.rows.find((v) => v.institution === 'Eurostat');
  assert.equal(eu.datasetUpdatedAt, '2026-02-27T11:00:00+0100');
  assert.equal(eu.publicationDateIso, null);
  const fed = x.rows.find((v) => v.institution === 'Federal Reserve Financial Services');
  assert.equal(fed.pageLastUpdatedText, 'October 20, 2026');
  const fda = x.rows.find((v) => v.institution === 'FDA CDER');
  assert.equal(fda.sourceDocumentYear, 2025);
});

test('unconnected IAEA/SIPRI retain missing observation without inheriting source response age', () => {
  const x = auditStage04SourceVintage(fakeGate());
  for (const institution of ['IAEA PRIS', 'SIPRI']) {
    const row = x.rows.find((v) => v.institution === institution);
    assert.equal(row.observedOriginalThisRun, false);
    assert.equal(row.observationPeriod, null);
    assert.equal(row.publicationDateIso, null);
    assert.equal(row.editionCurrencyState, 'UNVERIFIED_OR_RIGHTS_BLOCKED');
  }
});

test('source-vintage audit rejects invented raw values on unverified themes', () => {
  const gate = fakeGate();
  gate.themes[3].industryRawCount = 200;
  assert.throws(() => auditStage04SourceVintage(gate), /UNVERIFIED_NON_NULL_RAW/);
});

test('source-vintage audit blocks hidden M/ranking, orders or source-count drift', () => {
  const a = fakeGate();
  a.themes[0].approvedAttractivenessM = 45;
  assert.throws(() => auditStage04SourceVintage(a), /NO_TRADE_CONTRACT_DRIFT/);
  const b = fakeGate(); b.orderRequests.push({ symbol: 'SPY' });
  assert.throws(() => auditStage04SourceVintage(b), /NO_TRADE_CONTRACT_DRIFT/);
  const c = fakeGate(); c.officialIndustry.validatedLiveThemes = 8;
  assert.throws(() => auditStage04SourceVintage(c), /NO_TRADE_CONTRACT_DRIFT/);
  const d = fakeGate(); d.themes.pop();
  assert.throws(() => auditStage04SourceVintage(d), /INVALID_GATE_CONTRACT/);
});
