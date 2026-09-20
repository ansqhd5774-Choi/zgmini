const finite = value => typeof value === 'number' && Number.isFinite(value);

export class BisSchemaError extends Error {
  constructor(status) {
    super(status);
    this.name = 'BisSchemaError';
    this.status = status;
  }
}
const fail = status => { throw new BisSchemaError(status); };

export function parseCsvLine(line) {
  const out = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        value += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        value += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      out.push(value);
      value = '';
    } else {
      value += ch;
    }
  }
  if (quoted) fail('UNTERMINATED_CSV_QUOTE');
  out.push(value);
  return out;
}

export function bisQuarterToDate(period) {
  const match = /^(\d{4})-Q([1-4])$/.exec(period ?? '');
  if (!match) return null;
  const month = (Number(match[2]) - 1) * 3 + 1;
  return `${match[1]}-${String(month).padStart(2, '0')}-01`;
}

export function parseBisColumnCsv(csvText, dataset) {
  if (!['WS_DSR', 'WS_TC'].includes(dataset)) fail('INVALID_DATASET');
  if (typeof csvText !== 'string' || !csvText.trim()) fail('EMPTY_CSV');

  const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.length > 0);
  if (lines.length < 2) fail('CSV_NO_DATA');

  const header = parseCsvLine(lines[0]);
  const periodStart = header.findIndex(cell => /^\d{4}-Q[1-4]$/.test(cell));
  if (periodStart < 1) fail('QUARTER_COLUMNS_NOT_FOUND');

  const metaHeaders = header.slice(0, periodStart);
  const periods = header.slice(periodStart);
  if (!periods.every(period => bisQuarterToDate(period))) fail('INVALID_QUARTER_HEADER');

  const series = [];
  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const cells = parseCsvLine(lines[lineIndex]);
    if (cells.length !== header.length) fail(`COLUMN_COUNT_MISMATCH:${lineIndex + 1}`);

    const metadata = Object.fromEntries(metaHeaders.map((name, index) => [name, cells[index]]));
    const rows = [];
    for (let i = 0; i < periods.length; i++) {
      const raw = cells[periodStart + i];
      if (raw === '') continue;
      const value = Number(raw);
      if (!finite(value)) fail(`INVALID_NUMERIC:${lineIndex + 1}:${periods[i]}`);
      rows.push({
        observationDate: bisQuarterToDate(periods[i]),
        value,
        releaseDate: null,
        availableAt: null,
        vintageId: null,
        vintageMethod: 'CURRENT_VINTAGE_ONLY',
      });
    }

    series.push({
      dataset,
      metadata,
      seriesKey: metadata.Series ?? null,
      title: metadata.TITLE_TS ?? null,
      frequency: metadata.FREQ ?? null,
      country: metadata.BORROWERS_CTY ?? null,
      rows,
    });
  }
  return {dataset, metaHeaders, periods, series};
}

export function selectBisSeries(parsed, criteria) {
  if (!parsed?.series || !Array.isArray(parsed.series)) fail('INVALID_PARSED_DATA');
  if (!criteria || typeof criteria !== 'object' || Array.isArray(criteria)) fail('INVALID_CRITERIA');
  const entries = Object.entries(criteria);
  if (!entries.length) fail('EMPTY_CRITERIA');

  const matches = parsed.series.filter(series =>
    entries.every(([key, expected]) => series.metadata?.[key] === expected)
  );
  if (matches.length === 0) fail('SERIES_NOT_FOUND');
  if (matches.length > 1) fail('SERIES_SELECTOR_AMBIGUOUS');
  return matches[0];
}

export function usBisCandidateMatrix(parsed) {
  if (!parsed?.series || !Array.isArray(parsed.series)) fail('INVALID_PARSED_DATA');
  return parsed.series
    .filter(series => series.country === 'US')
    .map(series => ({
      dataset: series.dataset,
      seriesKey: series.seriesKey,
      title: series.title,
      frequency: series.frequency,
      metadata: {...series.metadata},
      firstObservationDate: series.rows[0]?.observationDate ?? null,
      latestObservationDate: series.rows.at(-1)?.observationDate ?? null,
      observationCount: series.rows.length,
    }));
}

export function debtRiskBisStatus(dsrParsed, tcParsed) {
  const dsrCandidates = usBisCandidateMatrix(dsrParsed);
  const tcCandidates = usBisCandidateMatrix(tcParsed).filter(candidate =>
    candidate.metadata.UNIT_TYPE === '770'
    && candidate.metadata.TC_ADJUST === 'A'
    && candidate.metadata.TC_LENDERS === 'A'
  );
  return {
    status: 'PARTIAL_SELECTOR_REQUIRED',
    historyMode: 'CURRENT_VINTAGE_ONLY',
    lookAheadSafe: false,
    dsrCandidates,
    debtGdpCandidates: tcCandidates,
    reason: 'ACTIVE_EVIDENCE_DOES_NOT_RECORD_EXACT_BIS_BORROWER_SECTOR_SELECTOR',
  };
}
