/**
 * Stage 04 source-vintage audit (R12-R14). No network call, persistence, score,
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
    'FDA CDER': {
      documentYear: official?.fdaCder?.sourceDocumentYear ?? null,
      newerPeriodCatalogAlert: official?.fdaEditionCatalog?.editionAlert ?? 'UNVERIFIED',
    },
    CPUC: {},
    IFR: {
      documentYear: official?.ifrRobots?.sourceDocumentYear ?? null,
      newerPeriodCatalogAlert: official?.ifrEditionCatalog?.editionAlert ?? 'UNVERIFIED',
    },
    IEA: { documentYear: official?.ieaDataCentres?.sourceDocumentYear ?? null },
    ENISA: {
      publicationDateIso: official?.enisaNis?.sourcePublished ?? null,
      documentYear: official?.enisaNis?.sourcePublished ? Number(official.enisaNis.sourcePublished.slice(0, 4)) : null,
    },
    'IAEA PRIS': {}, SIPRI: {},
  };
  return data[themes.industryInstitution] ?? {};
}

function pinnedCurrencyState(institution, catalogAlert) {
  if (institution === 'IFR') {
    if (catalogAlert === 'NEWER_INDUSTRIAL_WORLD_ROBOTICS_PRESS_RELEASE_REVIEW_REQUIRED') {
      return 'NEWER_INDUSTRIAL_PRESS_RELEASE_FOUND_PDF_REVIEW_REQUIRED';
    }
    if (catalogAlert === 'NO_LATER_INDUSTRIAL_RELEASE_IN_VISIBLE_PRESS_WINDOW_NOT_PROOF') {
      return 'VISIBLE_PRESS_WINDOW_NO_LATER_INDUSTRIAL_RELEASE_CURRENCY_NOT_PROVEN';
    }
    if (catalogAlert === 'PINNED_REPORT_NOT_VISIBLE_WINDOW_INCONCLUSIVE') {
      return 'PINNED_REPORT_NOT_VISIBLE_IN_PRESS_WINDOW_INCONCLUSIVE';
    }
    return 'PINNED_EDITION_NEWER_EDITION_NOT_AUTO_DETECTED';
  }
  if (institution !== 'FDA CDER') return 'PINNED_EDITION_NEWER_EDITION_NOT_AUTO_DETECTED';
  if (catalogAlert === 'NEWER_CURRENT_YEAR_PARTIAL_LISTING_NOT_ANNUAL_REPORT') {
    return 'CURRENT_YEAR_LISTING_FOUND_PINNED_REPORT_STILL_LAST_VALIDATED';
  }
  if (catalogAlert === 'NEWER_COMPLETED_YEAR_LISTED_ANNUAL_REPORT_REVIEW_REQUIRED') {
    return 'COMPLETED_YEAR_LISTING_FOUND_PINNED_REPORT_REVIEW_REQUIRED';
  }
  if (catalogAlert === 'NO_LATER_APPROVAL_YEAR_LISTED') return 'YEAR_INDEX_CHECKED_NO_LATER_LISTING_ANNUAL_CURRENCY_UNVERIFIED';
  return 'PINNED_EDITION_NEWER_EDITION_NOT_AUTO_DETECTED';
}

export function auditStage04SourceVintage(gate) {
  if (!gate || !Array.isArray(gate.themes) || gate.themes.length !== 9
    || !/^INVESTMENT_BOT_STAGE04_INPUT_GATE_R1[1234]$/.test(gate.runType ?? '')
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
      newerPeriodCatalogAlert: pub.newerPeriodCatalogAlert ?? null,
      gateCompletedAtUtc: gate.runAtUtc,
      editionCurrencyState: !originalObserved ? 'UNVERIFIED_OR_RIGHTS_BLOCKED'
        : pinned ? pinnedCurrencyState(row.industryInstitution, pub.newerPeriodCatalogAlert)
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
