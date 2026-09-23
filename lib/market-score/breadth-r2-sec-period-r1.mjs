export const BREADTH_R2_SEC_PERIOD_POLICY_R1 = "BREADTH-R2-SEC-PERIOD-R1";

function dateOnly(value) {
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) {
    throw new TypeError("AS_OF_DATE_INVALID");
  }
  return text;
}

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function quarterEnd(year, quarter) {
  return new Date(Date.UTC(year, quarter * 3, 0)).toISOString().slice(0, 10);
}

function previousQuarter({ year, quarter }) {
  return quarter === 1
    ? { year: year - 1, quarter: 4 }
    : { year, quarter: quarter - 1 };
}

export function secQuarterEligibilityDate(year, quarter) {
  if (!Number.isInteger(year) || year < 2009 || year > 2100) throw new TypeError("SEC_YEAR_INVALID");
  if (![1, 2, 3, 4].includes(quarter)) throw new TypeError("SEC_QUARTER_INVALID");
  const end = quarterEnd(year, quarter);
  return addDays(end, quarter === 4 ? 105 : 50);
}

export function selectBreadthR2SecFramePair(asOfDate) {
  const asOf = dateOnly(asOfDate);
  const currentYear = Number(asOf.slice(0, 4));
  const candidates = [];

  for (let year = currentYear - 2; year <= currentYear + 1; year++) {
    for (let quarter = 1; quarter <= 4; quarter++) {
      const eligibleAt = secQuarterEligibilityDate(year, quarter);
      if (eligibleAt <= asOf) candidates.push({ year, quarter, eligibleAt });
    }
  }

  candidates.sort((a, b) =>
    a.year - b.year ||
    a.quarter - b.quarter
  );

  const current = candidates.at(-1);
  if (!current) throw new Error("SEC_ELIGIBLE_QUARTER_NOT_FOUND");

  const previous = previousQuarter(current);

  return {
    policyVersion: BREADTH_R2_SEC_PERIOD_POLICY_R1,
    asOfDate: asOf,
    previous: {
      ...previous,
      frame: `CY${previous.year}Q${previous.quarter}`,
      eligibleAt: secQuarterEligibilityDate(previous.year, previous.quarter),
    },
    current: {
      year: current.year,
      quarter: current.quarter,
      frame: `CY${current.year}Q${current.quarter}`,
      eligibleAt: current.eligibleAt,
    },
  };
}
