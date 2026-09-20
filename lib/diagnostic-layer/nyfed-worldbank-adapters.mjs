import {readXlsxWorkbook, XlsxLiteError} from './xlsx-lite.mjs';

export class OfficialWorkbookError extends Error {
  constructor(status) {
    super(status);
    this.name = 'OfficialWorkbookError';
    this.status = status;
  }
}
const fail = status => { throw new OfficialWorkbookError(status); };
const finite = value => typeof value === 'number' && Number.isFinite(value);

export const CMDI_XLSX_URL =
  'https://www.newyorkfed.org/medialibrary/research/interactives/data/cmdi/cmdi_interactive_data.xlsx';
export const WORLD_BANK_COPPER_XLSX_URL =
  'https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx';

function cellColumn(ref) {
  return /^([A-Z]+)/.exec(ref ?? '')?.[1] ?? null;
}
function columnNumber(letters) {
  if (!letters) return null;
  let number = 0;
  for (const char of letters) number = number * 26 + (char.charCodeAt(0) - 64);
  return number;
}
function columnLetters(number) {
  let out = '';
  for (let n = number; n > 0; n = Math.floor((n - 1) / 26)) {
    out = String.fromCharCode(((n - 1) % 26) + 65) + out;
  }
  return out;
}
function numeric(cell) {
  const value = Number(cell?.value);
  return Number.isFinite(value) ? value : null;
}
function excelSerialDate(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial) || serial <= 0) return null;
  const millis = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
  const date = new Date(millis);
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}
function parseMonthText(value) {
  const text = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}$/.test(text)) return `${text}-01`;
  if (/^\d{4}M\d{2}$/.test(text)) return `${text.slice(0, 4)}-${text.slice(5)}-01`;
  const match = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(text);
  if (match) {
    const months = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
    const month = months[match[2][0].toUpperCase() + match[2].slice(1).toLowerCase()];
    if (!month) return null;
    return `${match[3]}-${String(month).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
  }
  return excelSerialDate(text);
}
function findHeader(rows, requiredValues) {
  for (const row of rows) {
    const index = new Map();
    for (const [ref, cell] of Object.entries(row.cells)) {
      index.set(String(cell.value).trim(), cellColumn(ref));
    }
    if (requiredValues.every(value => index.has(value))) return {row, index};
  }
  return null;
}
function valueAt(row, column) {
  if (!row || !column) return undefined;
  return row.cells?.[`${column}${row.rowNum}`]?.value;
}
function standardRow(observationDate, value, extra = {}) {
  return {
    observationDate,
    value,
    releaseDate: null,
    availableAt: null,
    vintageId: null,
    vintageMethod: 'CURRENT_VINTAGE_ONLY',
    ...extra,
  };
}

export async function parseCmdiWorkbook(bytes) {
  const workbook = await readXlsxWorkbook(bytes);
  let match = null;
  for (const [sheetName, rows] of workbook.sheets) {
    const header = findHeader(rows, ['eow_friday', 'Market CMDI', 'IG CMDI', 'HY CMDI']);
    if (header) { match = {sheetName, rows, ...header}; break; }
  }
  if (!match) fail('CMDI_SCHEMA_NOT_FOUND');

  const dateCol = match.index.get('eow_friday');
  const marketCol = match.index.get('Market CMDI');
  const igCol = match.index.get('IG CMDI');
  const hyCol = match.index.get('HY CMDI');
  const percentileNames = ['p5','p10','p25','p50','p75','p90','p95','p99'];
  const percentileCols = Object.fromEntries(
    percentileNames.filter(name => match.index.has(name)).map(name => [name, match.index.get(name)])
  );

  const out = [];
  for (const row of match.rows) {
    if (row.rowNum <= match.row.rowNum) continue;
    const observationDate = parseMonthText(valueAt(row, dateCol));
    if (!observationDate) continue;
    const market = Number(valueAt(row, marketCol));
    const ig = Number(valueAt(row, igCol));
    const hy = Number(valueAt(row, hyCol));
    if (![market, ig, hy].every(Number.isFinite)) fail(`CMDI_INVALID_NUMERIC:${row.rowNum}`);
    const percentiles = {};
    for (const [name, col] of Object.entries(percentileCols)) {
      const value = Number(valueAt(row, col));
      percentiles[name] = Number.isFinite(value) ? value : null;
    }
    out.push({
      observationDate,
      market,
      ig,
      hy,
      percentiles,
      releaseDate: null,
      availableAt: null,
      vintageId: null,
      vintageMethod: 'CURRENT_VINTAGE_ONLY',
    });
  }
  if (!out.length) fail('CMDI_NO_ROWS');
  out.sort((a,b) => a.observationDate.localeCompare(b.observationDate));
  return {
    source: 'NY_FED_CMDI',
    sheet: match.sheetName,
    status: 'READY_CURRENT_VINTAGE_RAW',
    rows: out,
  };
}

export async function parseGscpiWorkbook(bytes) {
  const workbook = await readXlsxWorkbook(bytes);
  const rows = workbook.sheets.get('SCPI');
  if (!rows) fail('GSCPI_SHEET_NOT_FOUND');
  const header = findHeader(rows, ['Date', 'Global']);
  if (!header) fail('GSCPI_SCHEMA_NOT_FOUND');
  const dateCol = header.index.get('Date');
  const globalCol = header.index.get('Global');

  const out = [];
  for (const row of rows) {
    if (row.rowNum <= header.row.rowNum) continue;
    const observationDate = parseMonthText(valueAt(row, dateCol));
    const value = Number(valueAt(row, globalCol));
    if (!observationDate) continue;
    if (!Number.isFinite(value)) fail(`GSCPI_INVALID_NUMERIC:${row.rowNum}`);
    out.push(standardRow(observationDate.slice(0,7) + '-01', value));
  }
  if (!out.length) fail('GSCPI_NO_ROWS');
  return {
    source: 'NY_FED_GSCPI',
    sheet: 'SCPI',
    status: 'READY_CURRENT_VINTAGE_RAW',
    rows: out.sort((a,b) => a.observationDate.localeCompare(b.observationDate)),
  };
}

export async function parseWorldBankCopperWorkbook(bytes) {
  const workbook = await readXlsxWorkbook(bytes);
  const rows = workbook.sheets.get('Monthly Prices');
  if (!rows) fail('WORLD_BANK_MONTHLY_SHEET_NOT_FOUND');

  const header = findHeader(rows, ['Copper']);
  if (!header) fail('COPPER_HEADER_NOT_FOUND');
  const copperCol = header.index.get('Copper');
  if (copperCol !== 'BM') fail(`COPPER_COLUMN_CHANGED:${copperCol}`);

  const unitRow = rows.find(row => row.rowNum === header.row.rowNum + 1);
  const unit = valueAt(unitRow, copperCol);
  if (unit !== '($/mt)') fail(`COPPER_UNIT_CHANGED:${unit}`);

  const out = [];
  for (const row of rows) {
    if (row.rowNum <= header.row.rowNum + 1) continue;
    const observationDate = parseMonthText(valueAt(row, 'A'));
    const value = Number(valueAt(row, copperCol));
    if (!observationDate || !Number.isFinite(value)) continue;
    out.push(standardRow(observationDate.slice(0,7) + '-01', value, {unit: '$/mt'}));
  }
  if (out.length < 12) fail('COPPER_INSUFFICIENT_ROWS');
  return {
    source: 'WORLD_BANK_PINK_SHEET',
    sheet: 'Monthly Prices',
    column: copperCol,
    unit,
    status: 'READY_CURRENT_VINTAGE_RAW',
    rows: out.sort((a,b) => a.observationDate.localeCompare(b.observationDate)),
  };
}

async function fetchBytesBounded(url, {
  fetchImpl = globalThis.fetch,
  allowedHosts,
  timeoutMs = 12000,
  maxBytes = 15_000_000,
  maxRequests = 4,
} = {}) {
  let current = new URL(url);
  let requests = 0;
  while (true) {
    if (!allowedHosts.has(current.hostname)) fail('HOST_NOT_ALLOWED');
    if (requests >= maxRequests) fail('REQUEST_CAP_EXCEEDED');
    requests += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(timeoutMs, 12000));
    try {
      const response = await Reflect.apply(fetchImpl, globalThis, [
        current,
        {redirect:'manual', signal:controller.signal, headers:{accept:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*'}},
      ]);
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) fail('REDIRECT_WITHOUT_LOCATION');
        current = new URL(location, current);
        continue;
      }
      if (!response.ok) fail(response.status === 429 ? 'QUOTA_EXCEEDED' : 'HTTP_ERROR');
      const reader = response.body?.getReader();
      if (!reader) fail('INVALID_RESPONSE');
      const chunks = [];
      let size = 0;
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) fail('BODY_LIMIT');
        chunks.push(value);
      }
      return {bytes:new Uint8Array(await new Blob(chunks).arrayBuffer()), requestCount:requests};
    } catch (error) {
      if (controller.signal.aborted) throw new OfficialWorkbookError('TIMEOUT');
      if (error instanceof OfficialWorkbookError || error instanceof XlsxLiteError) throw error;
      throw new OfficialWorkbookError('REQUEST_FAILED');
    } finally {
      clearTimeout(timer);
    }
  }
}

export async function fetchCmdiWorkbook(options = {}) {
  const started = Date.now();
  try {
    const fetched = await fetchBytesBounded(CMDI_XLSX_URL, {
      ...options,
      allowedHosts:new Set(['www.newyorkfed.org']),
    });
    const parsed = await parseCmdiWorkbook(fetched.bytes);
    return {...parsed, requestCount:fetched.requestCount, durationMs:Date.now()-started};
  } catch (error) {
    return {
      source:'NY_FED_CMDI',
      status:error?.status ?? 'REQUEST_FAILED',
      requestCount:0,
      durationMs:Date.now()-started,
      rows:[],
    };
  }
}

export async function fetchWorldBankCopper(options = {}) {
  const started = Date.now();
  try {
    const fetched = await fetchBytesBounded(WORLD_BANK_COPPER_XLSX_URL, {
      ...options,
      allowedHosts:new Set(['thedocs.worldbank.org']),
    });
    const parsed = await parseWorldBankCopperWorkbook(fetched.bytes);
    return {...parsed, requestCount:fetched.requestCount, durationMs:Date.now()-started};
  } catch (error) {
    return {
      source:'WORLD_BANK_PINK_SHEET',
      status:error?.status ?? 'REQUEST_FAILED',
      requestCount:0,
      durationMs:Date.now()-started,
      rows:[],
    };
  }
}
