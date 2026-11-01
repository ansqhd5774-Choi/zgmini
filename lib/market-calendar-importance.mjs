// ZGMINI editorial impact tiers, independent of event sourcing and of user favorites.
// 1 = routine detail, 2 = sector/macro watch, 3 = broad-market focal point.
// This is a deterministic expected-impact label, not an observed market reaction.
const fixedImportance = Object.freeze({
  employment: 3, cpi: 3, pce: 3, gdp: 3, fomc: 3,
  retail: 2, ppi: 2, jolts: 2, eci: 2, press: 2,
  'industrial-production': 2,
  'import-export-prices': 1, productivity: 1, 'real-earnings': 1,
  'consumer-expenditures': 1, 'employer-compensation': 1
});

export function releaseImportance(id, title = '') {
  const name = String(title || '');
  if (id === 'gdp' && /second estimate|third estimate|updated estimate|revision/i.test(name)) return 2;
  if (Object.hasOwn(fixedImportance, id)) return fixedImportance[id];
  if (/employment situation\b|consumer price index\b|personal consumption expenditures\b|federal funds rate\b/i.test(name)) return 3;
  if (/gross domestic product\b/i.test(name)) return /advance estimate/i.test(name) ? 3 : 2;
  if (/producer price index\b|job openings and labor turnover\b|employment cost index\b|retail sales\b|industrial production\b/i.test(name)) return 2;
  return 1;
}

export function rowsForSelectedDay(periodRows, activeDate) {
  return activeDate ? periodRows.filter((row) => row.date === activeDate) : periodRows;
}
