const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp100 = value => Math.max(0, Math.min(100, value));

function normalize(rows = []) {
  const map = new Map();
  for (const row of rows ?? []) {
    const observationDate = row?.observationDate ?? row?.date;
    const value = Number(row?.value);
    if (typeof observationDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(observationDate) || !finite(value)) continue;
    map.set(observationDate, {observationDate, value});
  }
  return [...map.values()].sort((a, b) => a.observationDate.localeCompare(b.observationDate));
}

function shiftMonth(date, delta) {
  const [year, month] = date.slice(0, 7).split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function percentile(values, current) {
  if (!values.length || !finite(current)) return null;
  let below = 0, equal = 0;
  for (const value of values) {
    if (value < current) below++;
    else if (value === current) equal++;
  }
  return 100 * (below + 0.5 * equal) / values.length;
}

function expandingScores(rawRows, minValid = 60) {
  const seen = [];
  return rawRows.map(row => {
    seen.push(row.value);
    return {
      observationDate: row.observationDate,
      value: seen.length >= minValid ? percentile(seen, row.value) : null,
    };
  });
}

export function buildEmploymentR538({
  unemploymentRows = [],
  payrollLevelRows = [],
  asOfDate = '9999-12-31',
  shockMinValid = 60,
} = {}) {
  const unemployment = normalize(unemploymentRows);
  const payroll = normalize(payrollLevelRows);
  const uMap = new Map(unemployment.map(row => [row.observationDate, row.value]));
  const pMap = new Map(payroll.map(row => [row.observationDate, row.value]));

  const scoreRows = [];
  const payrollAdverse = [];
  const unemploymentAdverse = [];

  for (const row of unemployment) {
    const date = row.observationDate;
    const p = pMap.get(date);
    const pLag3 = pMap.get(shiftMonth(date, -3));
    const pLag1 = pMap.get(shiftMonth(date, -1));
    const uLag3 = uMap.get(shiftMonth(date, -3));

    if (finite(p) && finite(pLag3) && p > 0 && pLag3 > 0) {
      const unemploymentScore = clamp100(70 - (15 * (row.value - 4)));
      const payrollGrowth3M = 400 * Math.log(p / pLag3);
      const payrollTrendScore = clamp100(50 + (10 * payrollGrowth3M));
      const score = (0.70 * unemploymentScore) + (0.30 * payrollTrendScore);
      scoreRows.push({
        observationDate: date,
        unemploymentRate: row.value,
        payrollLevel: p,
        payrollGrowth3M,
        unemploymentScore,
        payrollTrendScore,
        score,
      });
    }

    if (finite(p) && finite(pLag1) && p > 0 && pLag1 > 0) {
      payrollAdverse.push({
        observationDate: date,
        value: -100 * ((p / pLag1) - 1),
      });
    }
    if (finite(uLag3)) {
      unemploymentAdverse.push({
        observationDate: date,
        value: row.value - uLag3,
      });
    }
  }

  const payrollShock = expandingScores(payrollAdverse, shockMinValid);
  const unemploymentShock = expandingScores(unemploymentAdverse, shockMinValid);
  const ps = new Map(payrollShock.map(row => [row.observationDate, row.value]));
  const us = new Map(unemploymentShock.map(row => [row.observationDate, row.value]));

  const rows = scoreRows.map(row => {
    const payrollShockScore = ps.get(row.observationDate) ?? null;
    const unemploymentShockScore = us.get(row.observationDate) ?? null;
    return {
      ...row,
      payrollShock: payrollShockScore,
      unemploymentShock: unemploymentShockScore,
      employmentShock: finite(payrollShockScore) && finite(unemploymentShockScore)
        ? 0.50 * payrollShockScore + 0.50 * unemploymentShockScore
        : null,
    };
  });

  const eligible = rows.filter(row => row.observationDate <= asOfDate);
  const current = eligible.at(-1) ?? null;
  if (!current) {
    return {
      status: 'PARTIAL',
      methodology: 'EMPLOYMENT_R53_8',
      current: null,
      rows,
      chart: [],
      persistent: false,
      reason: 'INSUFFICIENT_ALIGNED_EMPLOYMENT_HISTORY',
    };
  }

  const shockEligible = eligible.filter(row => finite(row.employmentShock));
  const last3 = shockEligible.slice(-3);
  const persistent = last3.length === 3
    && last3.filter(row => row.employmentShock >= 80).length >= 2;

  return {
    status: 'READY',
    methodology: 'EMPLOYMENT_R53_8',
    current,
    rows,
    chart: eligible.slice(-12).map(row => ({
      label: row.observationDate.slice(5).replace('-', '/'),
      value: row.score,
    })),
    persistent,
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
  };
}
