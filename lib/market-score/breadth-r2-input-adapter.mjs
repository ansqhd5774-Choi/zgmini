const finite = value => typeof value === "number" && Number.isFinite(value);

function numeric(value) {
  if (finite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function text(value) {
  return value == null ? "" : String(value).trim();
}

export function normalizeBeaForeignPortfolioRows(rows = []) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map(row => ({
      timePeriod: text(row?.TimePeriod ?? row?.timePeriod),
      value: numeric(row?.DataValue ?? row?.dataValue),
      unit: text(row?.CL_UNIT ?? row?.unit) || null,
      unitMult: numeric(row?.UNIT_MULT ?? row?.unitMult),
    }))
    .filter(row => /^\d{4}Q[1-4]$/.test(row.timePeriod) && finite(row.value))
    .sort((a, b) => a.timePeriod.localeCompare(b.timePeriod));
}

export function buildBeaScoreInput(rows = [], targetPeriod, historyQuarters = 20) {
  const normalized = normalizeBeaForeignPortfolioRows(rows);
  const index = normalized.findIndex(row => row.timePeriod === targetPeriod);
  if (index < 0) {
    return { status: "PARTIAL", reason: "BEA_TARGET_PERIOD_MISSING", targetPeriod };
  }
  const prior = normalized.slice(Math.max(0, index - historyQuarters), index);
  if (prior.length < historyQuarters) {
    return {
      status: "PARTIAL",
      reason: "BEA_PRIOR_HISTORY_TOO_SHORT",
      targetPeriod,
      availableHistory: prior.length,
      requiredHistory: historyQuarters,
    };
  }
  return {
    status: "READY",
    targetPeriod,
    value: normalized[index].value,
    priorValues: prior.map(row => row.value),
    sourceUnit: normalized[index].unit,
    unitMult: normalized[index].unitMult,
  };
}

export function normalizeSecFrameRows(frame = {}) {
  const rows = Array.isArray(frame?.data) ? frame.data : [];
  const byCik = new Map();

  for (const row of rows) {
    const cik = text(row?.cik);
    const shares = numeric(row?.val);
    if (!cik || !finite(shares) || shares <= 0) continue;
    if (byCik.has(cik)) continue;

    byCik.set(cik, {
      cik,
      entityName: text(row?.entityName ?? row?.entity) || null,
      shares,
      start: text(row?.start) || null,
      end: text(row?.end) || null,
      filed: text(row?.filed) || null,
      accn: text(row?.accn) || null,
    });
  }

  return byCik;
}

export function buildSecSupplyInput({
  previousFrame,
  currentFrame,
  corporateActionAdjuster = null,
} = {}) {
  const previous = normalizeSecFrameRows(previousFrame);
  const current = normalizeSecFrameRows(currentFrame);
  const smaller = Math.min(previous.size, current.size);
  const issuers = [];

  for (const [cik, prior] of previous.entries()) {
    const next = current.get(cik);
    if (!next) continue;

    let previousShares = prior.shares;
    let currentShares = next.shares;
    let adjustment = null;

    if (typeof corporateActionAdjuster === "function") {
      adjustment = corporateActionAdjuster({ cik, prior, next });
      if (adjustment?.exclude === true) continue;
      if (finite(adjustment?.previousShares)) previousShares = adjustment.previousShares;
      if (finite(adjustment?.currentShares)) currentShares = adjustment.currentShares;
    }

    issuers.push({
      cik,
      previousShares,
      currentShares,
      prior,
      next,
      adjustment,
    });
  }

  return {
    status: issuers.length ? "READY" : "PARTIAL",
    reason: issuers.length ? null : "SEC_NO_MATCHED_ISSUERS",
    issuers,
    matched: issuers.length,
    previousUniverse: previous.size,
    currentUniverse: current.size,
    retention: smaller > 0 ? issuers.length / smaller : null,
  };
}

const CFTC_FIELD_ALIASES = {
  date: ["report_date_as_yyyy_mm_dd", "Report_Date_as_YYYY_MM_DD"],
  contractCode: ["cftc_contract_market_code", "CFTC_Contract_Market_Code"],
  openInterest: ["open_interest_all", "Open_Interest_All"],
  assetLong: ["asset_mgr_positions_long", "Asset_Mgr_Positions_Long_All"],
  assetShort: ["asset_mgr_positions_short", "Asset_Mgr_Positions_Short_All"],
  leveragedLong: ["lev_money_positions_long", "Lev_Money_Positions_Long_All"],
  leveragedShort: ["lev_money_positions_short", "Lev_Money_Positions_Short_All"],
};

function first(row, aliases) {
  for (const key of aliases) {
    if (row && Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  }
  return undefined;
}

export function normalizeCftcTffRows(rows = [], requiredCodes = []) {
  if (!Array.isArray(rows)) return [];
  const allowed = new Set(requiredCodes.map(String));
  return rows
    .map(row => ({
      date: text(first(row, CFTC_FIELD_ALIASES.date)).slice(0, 10),
      contractCode: text(first(row, CFTC_FIELD_ALIASES.contractCode)),
      openInterest: numeric(first(row, CFTC_FIELD_ALIASES.openInterest)),
      assetLong: numeric(first(row, CFTC_FIELD_ALIASES.assetLong)),
      assetShort: numeric(first(row, CFTC_FIELD_ALIASES.assetShort)),
      leveragedLong: numeric(first(row, CFTC_FIELD_ALIASES.leveragedLong)),
      leveragedShort: numeric(first(row, CFTC_FIELD_ALIASES.leveragedShort)),
    }))
    .filter(row =>
      /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
      (!allowed.size || allowed.has(row.contractCode)) &&
      [row.openInterest, row.assetLong, row.assetShort, row.leveragedLong, row.leveragedShort].every(finite) &&
      row.openInterest > 0
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.contractCode.localeCompare(b.contractCode));
}

export function buildCftcGroupInput({
  rows = [],
  asOfDate,
  requiredCodes = [],
  group,
} = {}) {
  const normalized = normalizeCftcTffRows(rows, requiredCodes);
  const byCode = new Map();
  for (const code of requiredCodes) byCode.set(String(code), []);

  for (const row of normalized) {
    if (!byCode.has(row.contractCode)) continue;
    if (asOfDate && row.date > asOfDate) continue;
    byCode.get(row.contractCode).push(row);
  }

  const contracts = [];
  const usedDates = [];

  for (const code of requiredCodes) {
    const list = byCode.get(String(code)) || [];
    if (!list.length) {
      return {
        status: "PARTIAL",
        reason: "CFTC_REQUIRED_CONTRACT_MISSING",
        missingContract: String(code),
        asOfDate,
      };
    }
    const row = list[list.length - 1];
    const long = group === "asset-manager" ? row.assetLong : row.leveragedLong;
    const short = group === "asset-manager" ? row.assetShort : row.leveragedShort;

    contracts.push({
      contractCode: String(code),
      long,
      short,
      openInterest: row.openInterest,
      observationDate: row.date,
    });
    usedDates.push(row.date);
  }

  const uniqueDates = [...new Set(usedDates)];
  if (uniqueDates.length !== 1) {
    return {
      status: "PARTIAL",
      reason: "CFTC_CONTRACT_DATES_MISALIGNED",
      dates: uniqueDates,
      asOfDate,
    };
  }

  return {
    status: "READY",
    observationDate: uniqueDates[0],
    contracts,
  };
}

export function buildCandidateInputBundle({
  beaRows,
  beaTargetPeriod,
  secPreviousFrame,
  secCurrentFrame,
  secCorporateActionAdjuster = null,
  cftcRows,
  cftcAsOfDate,
  cftcRequiredCodes = [],
} = {}) {
  return {
    foreignPortfolio: buildBeaScoreInput(beaRows, beaTargetPeriod, 20),
    shareSupply: buildSecSupplyInput({
      previousFrame: secPreviousFrame,
      currentFrame: secCurrentFrame,
      corporateActionAdjuster: secCorporateActionAdjuster,
    }),
    institutionalFutures: buildCftcGroupInput({
      rows: cftcRows,
      asOfDate: cftcAsOfDate,
      requiredCodes: cftcRequiredCodes,
      group: "asset-manager",
    }),
    leveragedFutures: buildCftcGroupInput({
      rows: cftcRows,
      asOfDate: cftcAsOfDate,
      requiredCodes: cftcRequiredCodes,
      group: "leveraged",
    }),
  };
}
