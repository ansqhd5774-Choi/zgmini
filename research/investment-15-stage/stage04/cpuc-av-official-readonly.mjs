/**
 * CPUC AV Driverless Deployment. The index is read directly from CPUC's
 * quarterly reporting page, and only the small AV_Month aggregate CSV is
 * fetched from a Waymo ZIP via HTTP byte ranges. NEVER read passenger trips,
 * incident locations, trip-level data or the 60MB+ underlying archives.
 * Calendar-quarter comparisons begin in 2025 because the reporting convention
 * changed; this remains a Waymo/California proxy, not the whole AV industry.
 */
import { inflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const CPUC_QUARTERLY_PAGE = 'https://www.cpuc.ca.gov/regulatory-services/licensing/transportation-licensing-and-analysis-branch/autonomous-vehicle-programs/quarterly-reporting';
const URL_PREFIX = 'https://www.cpuc.ca.gov/-/media/cpuc-website/divisions/consumer-protection-and-enforcement-division/documents/tlab/av-programs/';
const MAX_PAGE_CHARS = 1_500_000;
const MAX_TAIL_BYTES = 65536;
const MAX_AGGREGATE_COMPRESSED_BYTES = 250_000;
const MAX_AGGREGATE_UNCOMPRESSED_BYTES = 800_000;

function checkOfficialZipUrl(input) {
  const url = new URL(input, CPUC_QUARTERLY_PAGE);
  if (!url.href.startsWith(URL_PREFIX) || !/^waymo-(?:driverless-)?deployment-202\d-?q[1-4]\.zip$/i.test(url.pathname.split('/').at(-1))
    || url.search || url.hash) throw new Error('CPUC_NONOFFICIAL_ZIP_URL');
  return url.href;
}

export function discoverCpucWaymoQuarterLinks(html) {
  if (typeof html !== 'string' || html.length > MAX_PAGE_CHARS || !html.includes('Quarterly Reporting')) {
    throw new Error('CPUC_PAGE_FORMAT_DRIFT');
  }
  const links = new Map();
  for (const [, href] of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+\.zip)["'][^>]*>/gi)) {
    if (!/waymo-(?:driverless-)?deployment-202\d-?q[1-4]\.zip/i.test(href)) continue;
    const url = checkOfficialZipUrl(href.replaceAll('&amp;', '&'));
    const match = /waymo-(?:driverless-)?deployment-(202\d)-?q([1-4])\.zip/i.exec(url);
    const period = `${match[1]}:Q${match[2]}`;
    if (links.has(period) && links.get(period) !== url) throw new Error('CPUC_DUPLICATE_OFFICIAL_QUARTER');
    links.set(period, url);
  }
  if (links.size < 4) throw new Error('CPUC_TOO_FEW_OFFICIAL_LINKS');
  return links;
}

/** Parse the ZIP directory from a tail range. No ZIP file is saved to disk. */
export function parseZipCentralDirectory(tail, rangeStart) {
  const buf = Buffer.from(tail);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50 && i + 22 + buf.readUInt16LE(i + 20) === buf.length) {
      eocd = i; break;
    }
  }
  if (eocd < 0) throw new Error('CPUC_ZIP_EOCD_NOT_FOUND');
  const entriesCount = buf.readUInt16LE(eocd + 10);
  const centralSize = buf.readUInt32LE(eocd + 12);
  const centralOffset = buf.readUInt32LE(eocd + 16);
  if (entriesCount === 0 || entriesCount > 2000 || centralSize > MAX_TAIL_BYTES
    || centralOffset === 0xffffffff || centralSize === 0xffffffff) {
    throw new Error('CPUC_ZIP_UNSUPPORTED_DIRECTORY');
  }
  let at = centralOffset - rangeStart;
  if (at < 0 || at + centralSize > eocd) throw new Error('CPUC_ZIP_DIRECTORY_OUTSIDE_TAIL');
  const entries = [];
  for (let i = 0; i < entriesCount; i += 1) {
    if (at + 46 > buf.length || buf.readUInt32LE(at) !== 0x02014b50) throw new Error('CPUC_ZIP_INVALID_CENTRAL_HEADER');
    const nameLen = buf.readUInt16LE(at + 28);
    const extraLen = buf.readUInt16LE(at + 30);
    const commentLen = buf.readUInt16LE(at + 32);
    const next = at + 46 + nameLen + extraLen + commentLen;
    if (next > buf.length) throw new Error('CPUC_ZIP_ENTRY_OUTSIDE_TAIL');
    entries.push({
      name: buf.toString('utf8', at + 46, at + 46 + nameLen),
      flags: buf.readUInt16LE(at + 8),
      method: buf.readUInt16LE(at + 10),
      crc32: buf.readUInt32LE(at + 16),
      compressedSize: buf.readUInt32LE(at + 20),
      uncompressedSize: buf.readUInt32LE(at + 24),
      localOffset: buf.readUInt32LE(at + 42),
    });
    at = next;
  }
  if (at !== centralOffset - rangeStart + centralSize) throw new Error('CPUC_ZIP_CENTRAL_SIZE_MISMATCH');
  return entries;
}

function calculateCrc32(buf) {
  let value = 0xffffffff;
  for (const byte of buf) {
    value ^= byte;
    for (let j = 0; j < 8; j += 1) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}

export function unpackSmallAggregate(localRange, entry) {
  const buffer = Buffer.from(localRange);
  if (buffer.length < 30 || buffer.readUInt32LE(0) !== 0x04034b50) throw new Error('CPUC_ZIP_INVALID_LOCAL_HEADER');
  const method = buffer.readUInt16LE(8);
  if (method !== entry.method || ![0, 8].includes(method) || entry.flags & 1) throw new Error('CPUC_ZIP_COMPRESSION_NOT_ALLOWED');
  const compressedStart = 30 + buffer.readUInt16LE(26) + buffer.readUInt16LE(28);
  if (buffer.length < compressedStart + entry.compressedSize) throw new Error('CPUC_ZIP_AGGREGATE_TRUNCATED');
  const compressed = buffer.subarray(compressedStart, compressedStart + entry.compressedSize);
  const data = method === 8 ? inflateRawSync(compressed, { maxOutputLength: MAX_AGGREGATE_UNCOMPRESSED_BYTES }) : compressed;
  if (data.length !== entry.uncompressedSize || calculateCrc32(data) !== entry.crc32) {
    throw new Error('CPUC_ZIP_AGGREGATE_CRC_OR_SIZE_MISMATCH');
  }
  return data.toString('utf8');
}

function parseCsvRows(csv) {
  // Official monthly aggregate tables are flat; retain support for commas and
  // double-quoted fields, and reject ambiguous malformed quotes.
  const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  return lines.map((line) => {
    const cells = []; let value = ''; let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') { value += '"'; i += 1; }
        else quoted = !quoted;
      } else if (ch === ',' && !quoted) { cells.push(value.trim()); value = ''; }
      else value += ch;
    }
    if (quoted) throw new Error('CPUC_CSV_UNCLOSED_QUOTE');
    cells.push(value.trim());
    return cells;
  });
}

export function parseCpucMonthAggregate(csv, period) {
  if (typeof csv !== 'string' || csv.length > MAX_AGGREGATE_UNCOMPRESSED_BYTES) throw new Error('CPUC_AGGREGATE_TOO_LARGE');
  const data = parseCsvRows(csv);
  if (data.length < 4) throw new Error('CPUC_MONTH_TOO_FEW_ROWS');
  const headers = data[0].map((h) => h.replace(/[^a-z0-9]/gi, '').toLowerCase());
  const monthIdx = headers.findIndex((h) => h === 'month' || h === 'yearmonth' || h === 'reportingmonth');
  const totalTripsIdx = headers.indexOf('totaltrips');
  if (monthIdx < 0 || totalTripsIdx < 0) throw new Error('CPUC_MONTH_COLUMNS_DRIFT');
  const [year, quarter] = period.split(':Q').map(Number);
  const expectedMonths = new Set([year * 100 + (quarter - 1) * 3 + 1, year * 100 + (quarter - 1) * 3 + 2, year * 100 + (quarter - 1) * 3 + 3]);
  const seen = new Set(); let totalTrips = 0;
  for (const cells of data.slice(1)) {
    if (cells.every((s) => s === '')) continue;
    const rawMonth = cells[monthIdx] ?? '';
    const digits = rawMonth.replace(/[^\d]/g, '');
    const month = digits.length === 6 ? Number(digits)
      : /^\d{1,2}$/.test(rawMonth.trim()) ? year * 100 + Number(rawMonth) : NaN;
    if (!expectedMonths.has(month) || seen.has(month)) throw new Error(`CPUC_MONTH_NOT_IN_QUARTER_OR_DUPLICATE_${period}_${rawMonth}`);
    const countRaw = cells[totalTripsIdx];
    if (!/^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)$/.test(countRaw ?? '')) throw new Error('CPUC_MONTH_INVALID_TRIP_COUNT');
    const count = Number(countRaw.replaceAll(',', ''));
    if (!Number.isSafeInteger(count)) throw new Error('CPUC_MONTH_UNSAFE_TRIP_COUNT');
    totalTrips += count;
    if (!Number.isSafeInteger(totalTrips)) throw new Error('CPUC_MONTH_UNSAFE_TOTAL');
    seen.add(month);
  }
  if (seen.size !== 3) throw new Error('CPUC_MONTH_INCOMPLETE_QUARTER');
  return { period, totalTrips, monthCount: 3 };
}

async function fetchRange(url, range, fetchFn) {
  const response = await fetchFn(url, {
    signal: AbortSignal.timeout(25000), headers: { range, accept: 'application/x-zip-compressed, application/zip' },
  });
  if (response?.status !== 206) throw new Error(`CPUC_RANGE_HTTP_${response?.status ?? 'UNAVAILABLE'}`);
  if (checkOfficialZipUrl(response.url ?? url) !== url) throw new Error('CPUC_RANGE_URL_DRIFT');
  const contentRange = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers?.get?.('content-range') ?? '');
  if (!contentRange) throw new Error('CPUC_RANGE_HEADER_DRIFT');
  const start = Number(contentRange[1]); const end = Number(contentRange[2]);
  const total = Number(contentRange[3]);
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || !Number.isSafeInteger(total)
    || end >= total || total > 200_000_000) throw new Error('CPUC_RANGE_SIZE_INVALID');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length !== end - start + 1 || bytes.length > MAX_TAIL_BYTES + MAX_AGGREGATE_COMPRESSED_BYTES + 1024) {
    throw new Error('CPUC_RANGE_LENGTH_MISMATCH');
  }
  return { bytes, start, end, total };
}

export async function fetchCpucQuarterAggregate(period, zipUrl, { fetchFn = fetch } = {}) {
  const url = checkOfficialZipUrl(zipUrl);
  const tail = await fetchRange(url, `bytes=-${MAX_TAIL_BYTES}`, fetchFn);
  if (tail.end !== tail.total - 1) throw new Error('CPUC_RANGE_NOT_ZIP_TAIL');
  const central = parseZipCentralDirectory(tail.bytes, tail.start);
  const monthly = central.filter(({ name }) => /(?:^|\/)\S*AV_\s*(?:Month_Part0-Deployment|Month-Level_Part0|Month_Level-Deployment)\.csv$/i.test(name));
  if (monthly.length !== 1) throw new Error(`CPUC_MONTH_ENTRY_UNAVAILABLE_OR_AMBIGUOUS_${period}_${central.filter(({ name }) => /month/i.test(name)).map(({ name }) => name.split('/').at(-1)).join('_')}`);
  const entry = monthly[0];
  if (![0, 8].includes(entry.method) || (entry.flags & 1)
    || entry.compressedSize > MAX_AGGREGATE_COMPRESSED_BYTES
    || entry.uncompressedSize > MAX_AGGREGATE_UNCOMPRESSED_BYTES) {
    throw new Error('CPUC_MONTH_UNSAFE_ARCHIVE_ENTRY');
  }
  // First fetch exactly the 30-byte local header. Determine the compressed
  // aggregate's precise end, without ever over-reading a neighboring entry.
  const headerEnd = entry.localOffset + 29;
  if (headerEnd >= tail.total) throw new Error('CPUC_MONTH_ENTRY_OUTSIDE_ZIP');
  const header = await fetchRange(url, `bytes=${entry.localOffset}-${headerEnd}`, fetchFn);
  if (header.start !== entry.localOffset || header.end !== headerEnd || header.total !== tail.total
    || Buffer.from(header.bytes).readUInt32LE(0) !== 0x04034b50) {
    throw new Error('CPUC_MONTH_LOCAL_HEADER_DRIFT');
  }
  const localHead = Buffer.from(header.bytes);
  const localNameSize = localHead.readUInt16LE(26);
  const localExtraSize = localHead.readUInt16LE(28);
  if (localNameSize < 1 || localNameSize > 500 || localExtraSize > 500) {
    throw new Error('CPUC_MONTH_UNSAFE_LOCAL_HEADER_LENGTH');
  }
  const endOffset = entry.localOffset + 30 + localNameSize + localExtraSize + entry.compressedSize - 1;
  if (endOffset >= tail.total) throw new Error('CPUC_MONTH_ENTRY_OUTSIDE_ZIP');
  const range = await fetchRange(url, `bytes=${entry.localOffset}-${endOffset}`, fetchFn);
  if (range.start !== entry.localOffset || range.end !== endOffset || range.total !== tail.total) {
    throw new Error('CPUC_MONTH_RANGE_MISMATCH');
  }
  const csv = unpackSmallAggregate(range.bytes, entry);
  return { ...parseCpucMonthAggregate(csv, period), archiveUrl: url };
}

export async function fetchLatestOfficialCpucAv({ fetchFn = fetch } = {}) {
  const response = await fetchFn(CPUC_QUARTERLY_PAGE, {
    signal: AbortSignal.timeout(20000), headers: { accept: 'text/html' },
  });
  if (!response?.ok) throw new Error(`CPUC_PAGE_HTTP_${response?.status ?? 'UNAVAILABLE'}`);
  if (new URL(response.url ?? CPUC_QUARTERLY_PAGE).href !== CPUC_QUARTERLY_PAGE) {
    throw new Error('CPUC_PAGE_URL_DRIFT');
  }
  const links = discoverCpucWaymoQuarterLinks(await response.text());
  const periods = [...links.keys()].sort().reverse();
  const current = periods[0];
  const [year, quarter] = current.split(':Q').map(Number);
  if (year < 2026 || year > 2030) throw new Error('CPUC_REVIEW_NEW_REPORTING_VINTAGE');
  const previous = `${year}:Q${quarter === 1 ? 4 : quarter - 1}`;
  // Q1 previous quarter is preceding year Q4.
  const previousPeriod = quarter === 1 ? `${year - 1}:Q4` : previous;
  const lastYear = `${year - 1}:Q${quarter}`;
  const lastYearPrevious = quarter === 1 ? `${year - 2}:Q4` : `${year - 1}:Q${quarter - 1}`;
  const needed = [current, previousPeriod, lastYear, lastYearPrevious];
  if (needed.some((key) => !links.has(key))) throw new Error('CPUC_MISSING_MATCHED_CALENDAR_QUARTERS');
  const series = await Promise.all(needed.map((key) => fetchCpucQuarterAggregate(key, links.get(key), { fetchFn })));
  const byPeriod = new Map(series.map((row) => [row.period, row]));
  const yoy = (periodA, periodB) => 100 * (byPeriod.get(periodA).totalTrips / byPeriod.get(periodB).totalTrips - 1);
  if (byPeriod.get(lastYear).totalTrips <= 0 || byPeriod.get(lastYearPrevious).totalTrips <= 0) {
    throw new Error('CPUC_ZERO_YOY_DENOMINATOR');
  }
  return {
    state: 'OFFICIAL_CALENDAR_QUARTER_RANGE_VERIFIED_RESEARCH_ONLY',
    officialPage: CPUC_QUARTERLY_PAGE,
    observationPeriod: current,
    metric: 'Waymo_driverless_deployment_total_trips',
    regionAndCoverage: 'California_CPUC_Waymo_only_not_total_global_AV',
    units: 'paid_driverless_trips_per_calendar_quarter',
    latestRawCount: byPeriod.get(current).totalTrips,
    priorYearSameQuarterCount: byPeriod.get(lastYear).totalTrips,
    previousQuarterRawCount: byPeriod.get(previousPeriod).totalTrips,
    yoyGrowthPct: yoy(current, lastYear),
    sequentialYoyAccelerationPctPoints: yoy(current, lastYear) - yoy(previousPeriod, lastYearPrevious),
    historicalYoyReferenceCount: 1,
    historicalAccelerationReferenceCount: 0,
    sourceArchivePeriods: needed,
    sourceMethod: 'OFFICIAL_HTML_DISCOVERY_AND_SMALL_AV_MONTH_CSV_ZIP_RANGE',
    G: null, D: null, M: null, ranking: null,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fetchLatestOfficialCpucAv().then((result) => process.stdout.write(`${JSON.stringify(result, null, 2)}\n`))
    .catch((error) => { process.stderr.write(`${error?.message ?? error}\n`); process.exitCode = 1; });
}
