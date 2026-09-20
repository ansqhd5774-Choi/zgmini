const td = new TextDecoder('utf-8');

export class XlsxLiteError extends Error {
  constructor(status) {
    super(status);
    this.name = 'XlsxLiteError';
    this.status = status;
  }
}
const fail = status => { throw new XlsxLiteError(status); };

const u16 = (view, offset) => view.getUint16(offset, true);
const u32 = (view, offset) => view.getUint32(offset, true);

function findEocd(bytes) {
  const min = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= min; i--) {
    if (
      bytes[i] === 0x50 && bytes[i + 1] === 0x4b
      && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06
    ) return i;
  }
  return -1;
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream !== 'function') fail('DECOMPRESSION_UNAVAILABLE');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function unzipSelected(zipBytes, {
  include = name => name.startsWith('xl/'),
  maxEntries = 512,
  maxEntryBytes = 20_000_000,
  maxTotalBytes = 50_000_000,
} = {}) {
  const bytes = zipBytes instanceof Uint8Array ? zipBytes : new Uint8Array(zipBytes);
  if (bytes.length < 22) fail('ZIP_TOO_SMALL');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEocd(bytes);
  if (eocd < 0) fail('ZIP_EOCD_NOT_FOUND');

  const totalEntries = u16(view, eocd + 10);
  const centralSize = u32(view, eocd + 12);
  const centralOffset = u32(view, eocd + 16);
  if (totalEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    fail('ZIP64_UNSUPPORTED');
  }
  if (totalEntries > maxEntries) fail('ZIP_ENTRY_CAP');
  if (centralOffset + centralSize > bytes.length) fail('ZIP_CENTRAL_DIRECTORY_RANGE');

  const entries = [];
  let pos = centralOffset;
  for (let index = 0; index < totalEntries; index++) {
    if (pos + 46 > bytes.length || u32(view, pos) !== 0x02014b50) fail('ZIP_CENTRAL_ENTRY_INVALID');
    const method = u16(view, pos + 10);
    const compressedSize = u32(view, pos + 20);
    const uncompressedSize = u32(view, pos + 24);
    const nameLen = u16(view, pos + 28);
    const extraLen = u16(view, pos + 30);
    const commentLen = u16(view, pos + 32);
    const localOffset = u32(view, pos + 42);
    const nameStart = pos + 46;
    const nameEnd = nameStart + nameLen;
    if (nameEnd > bytes.length) fail('ZIP_FILENAME_RANGE');
    const name = td.decode(bytes.subarray(nameStart, nameEnd));
    entries.push({name, method, compressedSize, uncompressedSize, localOffset});
    pos = nameEnd + extraLen + commentLen;
  }

  const output = new Map();
  let totalOut = 0;
  for (const entry of entries) {
    if (!include(entry.name)) continue;
    if (entry.uncompressedSize > maxEntryBytes) fail('ZIP_ENTRY_SIZE_CAP');
    const off = entry.localOffset;
    if (off + 30 > bytes.length || u32(view, off) !== 0x04034b50) fail('ZIP_LOCAL_HEADER_INVALID');
    const localNameLen = u16(view, off + 26);
    const localExtraLen = u16(view, off + 28);
    const start = off + 30 + localNameLen + localExtraLen;
    const end = start + entry.compressedSize;
    if (end > bytes.length) fail('ZIP_COMPRESSED_RANGE');
    const compressed = bytes.subarray(start, end);
    let decoded;
    if (entry.method === 0) decoded = new Uint8Array(compressed);
    else if (entry.method === 8) decoded = await inflateRaw(compressed);
    else fail(`ZIP_COMPRESSION_UNSUPPORTED:${entry.method}`);
    if (entry.uncompressedSize && decoded.length !== entry.uncompressedSize) fail('ZIP_SIZE_MISMATCH');
    totalOut += decoded.length;
    if (totalOut > maxTotalBytes) fail('ZIP_TOTAL_SIZE_CAP');
    output.set(entry.name, decoded);
  }
  return output;
}

function xmlDecode(value) {
  return String(value)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'");
}
function stripTags(value) {
  return xmlDecode(String(value).replace(/<[^>]*>/g, ''));
}

function parseSharedStrings(xml) {
  const out = [];
  for (const match of xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)) {
    out.push(stripTags(match[1]));
  }
  return out;
}

function parseSheetRows(xml, sharedStrings) {
  const rows = [];
  for (const rowMatch of xml.matchAll(/<row\s+([^>]*)>([\s\S]*?)<\/row>/g)) {
    const rowNum = Number(/\br="(\d+)"/.exec(rowMatch[1])?.[1] || 0);
    const cells = {};
    for (const cellMatch of rowMatch[2].matchAll(/<c\s+([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = /\br="([^"]+)"/.exec(attrs)?.[1];
      if (!ref) continue;
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1] || '';
      const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let value = '';
      if (type === 's' && raw !== undefined) value = sharedStrings[Number(raw)] ?? '';
      else if (type === 'inlineStr') value = stripTags(body);
      else if ((type === 'str' || type === 'e') && raw !== undefined) value = xmlDecode(raw);
      else if (raw !== undefined) value = xmlDecode(raw);
      const formula = /<f(?:\s[^>]*)?>([\s\S]*?)<\/f>/.exec(body)?.[1] ?? null;
      cells[ref] = {value, formula};
    }
    if (Object.keys(cells).length) rows.push({rowNum, cells});
  }
  return rows;
}

function resolveWorksheetTarget(target) {
  let value = String(target || '').replace(/\\/g, '/');
  value = value.replace(/^\/+/, '');
  if (value.startsWith('xl/')) return value;
  return `xl/${value}`;
}

export async function readXlsxWorkbook(bytes) {
  const entries = await unzipSelected(bytes, {
    include: name =>
      name === 'xl/workbook.xml'
      || name === 'xl/_rels/workbook.xml.rels'
      || name === 'xl/sharedStrings.xml'
      || /^xl\/worksheets\/[^/]+\.xml$/.test(name),
  });

  const workbookBytes = entries.get('xl/workbook.xml');
  const relsBytes = entries.get('xl/_rels/workbook.xml.rels');
  if (!workbookBytes || !relsBytes) fail('XLSX_WORKBOOK_METADATA_MISSING');

  const workbookXml = td.decode(workbookBytes);
  const relsXml = td.decode(relsBytes);
  const shared = entries.has('xl/sharedStrings.xml')
    ? parseSharedStrings(td.decode(entries.get('xl/sharedStrings.xml')))
    : [];

  const relMap = new Map();
  for (const match of relsXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g)) {
    relMap.set(match[1], match[2]);
  }

  const sheets = new Map();
  for (const match of workbookXml.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+r:id="([^"]+)"/g)) {
    const name = xmlDecode(match[1]);
    const target = relMap.get(match[2]);
    if (!target) continue;
    const entryName = resolveWorksheetTarget(target);
    const sheetBytes = entries.get(entryName);
    if (!sheetBytes) continue;
    sheets.set(name, parseSheetRows(td.decode(sheetBytes), shared));
  }
  if (!sheets.size) fail('XLSX_NO_SHEETS');
  return {sheets};
}
