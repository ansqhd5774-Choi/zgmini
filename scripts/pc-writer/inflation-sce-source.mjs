/**
 * Extract the New York Fed SCE one-year inflation expectation series from the
 * `Inflation expectations` worksheet rows returned by an XLSX reader.
 *
 * The worksheet currently labels its first two columns `YYYYMM` and
 * `Median one-year ahead expected inflation rate`. Do not accidentally use
 * `Median point prediction one-year ahead inflation rate` (another series).
 *
 * This module performs no network, filesystem, calculation or publication IO.
 * Input: rows as arrays or the existing xlsx-lite worksheet row descriptors.
 * Values in the source are percentage points (3.9 means 3.9%, not 0.039).
 */

export const SCE_YEAR_AHEAD_HEADER = 'Median one-year ahead expected inflation rate';
export const SCE_SHEET_NAME = 'Inflation expectations';

const PERIOD_RE = /^(?:19|20|21)\d{2}(?:0[1-9]|1[0-2])$/;
const DECIMAL_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const EMPTY_MARKERS = new Set(['NA', 'N/A', '#N/A']);

function cell(row, index) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const value = Array.isArray(row) ? row[index] :
    row && typeof row === 'object' && Number.isInteger(row.rowNum) &&
    row.cells && typeof row.cells === 'object' ?
      row.cells[`${letters[index]}${row.rowNum}`] : undefined;
  // Some XLSX worksheet readers surface a cell descriptor rather than its v.
  // Accept that documented shape while rejecting arbitrary objects as values.
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (Object.hasOwn(value, 'value')) return value.value;
    if (Object.hasOwn(value, 'v')) return value.v;
  }
  return value;
}

function normalizedText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
}

function monthDate(raw, rowNumber) {
  const candidate = normalizedText(raw);
  if ((typeof candidate !== 'string' && typeof candidate !== 'number') ||
      !PERIOD_RE.test(String(candidate))) {
    throw new Error(`SCE invalid YYYYMM in row ${rowNumber}: ${JSON.stringify(raw)}`);
  }
  const period = String(candidate);
  return `${period.slice(0, 4)}-${period.slice(4, 6)}-01`;
}

function monthIndex(observationDate) {
  return Number(observationDate.slice(0, 4)) * 12 + Number(observationDate.slice(5, 7)) - 1;
}

function fromMonthIndex(index) {
  const year = Math.floor(index / 12);
  const month = index % 12 + 1;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
}

function parsePercent(raw, rowNumber) {
  if (raw === undefined) return { missingReason: 'absent_cell' };
  if (raw === null) return { missingReason: 'null_cell' };
  if (typeof raw === 'string') {
    const value = raw.trim();
    if (value === '') return { missingReason: 'blank_cell' };
    if (EMPTY_MARKERS.has(value.toUpperCase())) return { missingReason: 'source_na' };
    if (!DECIMAL_RE.test(value)) {
      throw new Error(`SCE invalid percentage in row ${rowNumber}: ${JSON.stringify(raw)}`);
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error(`SCE nonfinite percentage in row ${rowNumber}`);
    }
    return { value: parsed };
  }
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    throw new Error(`SCE invalid percentage in row ${rowNumber}: ${String(raw)}`);
  }
  return { value: raw };
}

/**
 * @param {unknown} rows Worksheet rows, including metadata/header rows.
 * @returns {{
 *   observations: Array<{observationDate: string, value: number}>,
 *   missing: Array<{observationDate: string, reason: string}>,
 *   firstMonth: string,
 *   latestMonth: string,
 *   latestObservation: {observationDate: string, value: number},
 * }}
 */
export function parseSceYearAheadInflationRows(rows) {
  if (!Array.isArray(rows)) {
    throw new TypeError('SCE worksheet rows must be an array');
  }

  const headerMatches = [];
  for (let i = 0; i < rows.length; i += 1) {
    if (!Array.isArray(rows[i]) && !rows[i]?.cells) continue;
    if (normalizedText(cell(rows[i], 1)) === SCE_YEAR_AHEAD_HEADER) {
      headerMatches.push(i);
    }
  }
  if (headerMatches.length !== 1) {
    throw new Error(`SCE expected exactly one column B header; found ${headerMatches.length}`);
  }

  const seen = new Set();
  const observations = [];
  const missing = [];
  const datedRows = [];
  const headerAt = headerMatches[0];
  for (let i = headerAt + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!Array.isArray(row) && !row?.cells) {
      throw new Error(`SCE worksheet row ${i + 1} is not an array or XLSX row`);
    }
    if (Array.isArray(row) && row.every((v) => v === null || v === undefined || v === '')) continue;
    if (row?.cells && Object.values(row.cells).every(v => {
      const raw = v && typeof v === 'object' ? v.value : v;
      return raw === null || raw === undefined || raw === '';
    })) continue;
    const observationDate = monthDate(cell(row, 0), i + 1);
    if (seen.has(observationDate)) {
      throw new Error(`SCE duplicate observation month: ${observationDate} (row ${i + 1})`);
    }
    seen.add(observationDate);
    datedRows.push(observationDate);
    const parsed = parsePercent(cell(row, 1), i + 1);
    if (Object.hasOwn(parsed, 'value')) {
      observations.push({ observationDate, value: parsed.value });
    } else {
      missing.push({ observationDate, reason: parsed.missingReason });
    }
  }

  if (datedRows.length === 0) {
    throw new Error('SCE worksheet contains no dated observations');
  }
  if (observations.length === 0) {
    throw new Error('SCE worksheet contains no numeric one-year expectation values');
  }

  const orderedDates = [...datedRows].sort();
  for (let i = 1; i < orderedDates.length; i += 1) {
    const previous = monthIndex(orderedDates[i - 1]);
    const current = monthIndex(orderedDates[i]);
    // Absence is distinct from an explicit null/blank value in an existing row.
    for (let m = previous + 1; m < current; m += 1) {
      missing.push({ observationDate: fromMonthIndex(m), reason: 'absent_month' });
    }
  }

  observations.sort((a, b) => a.observationDate.localeCompare(b.observationDate));
  missing.sort((a, b) => a.observationDate.localeCompare(b.observationDate));
  return {
    observations,
    missing,
    firstMonth: orderedDates[0],
    latestMonth: orderedDates.at(-1),
    latestObservation: observations.at(-1),
  };
}
