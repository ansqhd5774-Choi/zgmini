/**
 * Stage 04 source-vintage audit (R12). No network call, persistence, score,
 * ranking or market-data reconstruction. Consumes the just-completed live
 * gate result to distinguish source retrieval from observation/publication.
 */

const SOURCE_MODES = Object.freeze({
  'Federal Reserve Financial Services': 'DYNAMIC_QUARTERLY_SERIES',
  Eurostat: 'DYNAMIC_SPARSE_SURVEY_SERIES',
  'FDA CDER': 'PINNED_ANNUAL_REPORT',
  CPUC: 'DYNAMIC_QUARTERLY_ARCHIVE',
  IFR: 'PINNED_ANNUAL_REPORT',
  IEA: 'PINNED_ANNUAL_REPORT',
  ENISA: 'PINNED_ANNUAL_SURVEY',
  'IAEA PRIS': 'UNCONNECTED',
  SIPRI: 'UNCONNECTED_RIGHTS_REVIEW',
});

function sourcePublication(themes, official) {
  const data = {
    'Federal Reserve Financial Services': { pageLastUpdatedText: official?.fednow?.sourcePageLastUpdated ?? null },
    Eurostat: { datasetUpdatedAt: official?.eurostat?.sourceUpdatedAt ?? null },
    'FDA CDER': { documentYear: official?.fdaCder?.sourceDocumentYear ?? null },
    CPUC: {},
    IFR: { documentYear: official?.ifrRobots?.sourceDocumentYear ?? null },
    IEA: { documentYear: official?.ieaDataCentres?.sourceDocumentYear ?? null },
    ENISA: {
      publicationDateIso: official?.enisaNis?.sourcePublished ?? null,
      documentYear: official?.enisaNis?.sourcePublished ? Number(official.enisaNis.sourcePublished.slice(0, 4)) : null,
    },
    'IAEA PRIS': {}, SIPRI: {},
  };
  return data[themes.industryInstitution] ?? {};
}

export function auditStage04SourceVintage(gate) {
  if (!gate || !Array.isArray(gate.themes) || gate.themes.length !== 9
    || !/^INVESTMENT_BOT_STAGE04_INPUT_GATE_R1[12]$/.test(gate.runType ?? '')
    || !/^\d{4}-\d{2}-\d{2}T/.test(gate.runAtUtc ?? '')) {
    throw new Error('SOURCE_VINTAGE_INVALID_GATE_CONTRACT');
  }
  const result = gate.themes.map((row) => {
    const mode = SOURCE_MODES[row.industryInstitution];
    if (!mode) throw new Error('SOURCE_VINTAGE_UNKNOWN_INSTITUTION');
    const originalObserved = row.industryEvidenceState !== 'NOT_AUTOMATICALLY_VERIFIED';
    if (!originalObserved && (row.industryRawCount !== null
      || row.industryRawTwh !== null || row.industryRawPercent !== null)) {
      throw new Error('SOURCE_VINTAGE_UNVERIFIED_NON_NULL_RAW');
    }
    const pub = originalObserved ? sourcePublication(row, gate.officialIndustry) : {};
    const pinned = mode.startsWith('PINNED_');
    return {
      theme: row.theme,
      institution: row.industryInstitution,
      sourceUrl: row.industryOfficialSource,
      observedOriginalThisRun: originalObserved,
      sourceMode: mode,
      observationPeriod: originalObserved ? row.industryObservationPeriod : null,
      publicationDateIso: pub.publicationDateIso ?? null,
      pageLastUpdatedText: pub.pageLastUpdatedText ?? null,
      datasetUpdatedAt: pub.datasetUpdatedAt ?? null,
      sourceDocumentYear: pub.documentYear ?? null,
      gateCompletedAtUtc: gate.runAtUtc,
      editionCurrencyState: !originalObserved ? 'UNVERIFIED_OR_RIGHTS_BLOCKED'
        : pinned ? 'PINNED_EDITION_NEWER_EDITION_NOT_AUTO_DETECTED'
          : 'LIVE_SERIES_FRESHNESS_LIMITED_TO_SOURCE_RESPONSE',
      latestEditionVerified: false,
      approvedGrowthG: null,
      approvedDislocationD: null,
      approvedAttractivenessM: null,
    };
  });

  const institutions = result.map((item) => item.institution);
  if (new Set(institutions).size !== 9
    || gate.officialIndustry?.validatedLiveThemes !== result.filter((x) => x.observedOriginalThisRun).length
    || gate.officialIndustry?.expectedThemes !== 9
    || gate.automatedTradeEnabled !== false || !Array.isArray(gate.orderRequests)
    || gate.orderRequests.length !== 0
    || gate.themes.some((x) => x.approvedGrowthG !== null || x.approvedDislocationD !== null
      || x.approvedAttractivenessM !== null || x.officialRank !== null)) {
    throw new Error('SOURCE_VINTAGE_INPUT_OR_NO_TRADE_CONTRACT_DRIFT');
  }
  return {
    state: 'LIVE_ORIGIN_VINTAGE_AUDITED_LATEST_EDITION_NOT_PROVEN',
    gateCompletedAtUtc: gate.runAtUtc,
    observedOriginalSources: result.filter((x) => x.observedOriginalThisRun).length,
    fixedEditionSources: result.filter((x) => x.observedOriginalThisRun && x.sourceMode.startsWith('PINNED_')).length,
    dynamicSourceSeries: result.filter((x) => x.observedOriginalThisRun && x.sourceMode.startsWith('DYNAMIC_')).length,
    unavailableSources: result.filter((x) => !x.observedOriginalThisRun).length,
    automaticLatestEditionClaims: 0,
    rows: result,
  };
}
