import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { FDA_CDER_2025_SHA256, readPinnedFdaCderReport,
  fetchLatestOfficialFdaCder } from './fda-cder-official-readonly.mjs';
import { CPUC_QUARTERLY_PAGE, discoverCpucWaymoQuarterLinks,
  parseCpucMonthAggregate, parseZipCentralDirectory, unpackSmallAggregate,
  fetchCpucQuarterAggregate } from './cpuc-av-official-readonly.mjs';

const pdfBytes = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(120, 7)]);
const pdfTestSha = createHash('sha256').update(pdfBytes).digest('hex');

test('FDA is exactly one PDF vintage: year, historic N, YoY and acceleration', () => {
  const x = readPinnedFdaCderReport(pdfBytes, { expectedSha256: pdfTestSha });
  assert.equal(x.sourceDocumentYear, 2025);
  assert.equal(x.observationPeriod, '2025');
  assert.equal(x.latestRawCount, 46);
  assert.equal(x.priorYearRawCount, 50);
  assert.equal(x.priorTwoYearRawCount, 54);
  assert.equal(x.historicalAnnualObservations, 10);
  assert.equal(x.historicalYoyReferenceCount, 8);
  assert.equal(x.historicalAccelerationReferenceCount, 7);
  assert.ok(Math.abs(x.yoyGrowthPct + 8) < 0.0001);
  assert.ok(Math.abs(x.sequentialYoyAccelerationPctPoints + 0.59259259) < 0.0001);
  assert.equal(x.M, null);
});

test('FDA source hash mismatch and PDF content change fail closed', async () => {
  assert.match(FDA_CDER_2025_SHA256, /^[a-f0-9]{64}$/);
  assert.throws(() => readPinnedFdaCderReport(pdfBytes), /SOURCE_VERSION_DRIFT/);
  assert.throws(() => readPinnedFdaCderReport(Buffer.alloc(140)), /INVALID_PDF_CONTENT/);
  const fakeResponse = {
    ok: true, status: 200, url: 'https://evil.example/download',
    headers: { get: () => 'application/pdf' }, arrayBuffer: async () => pdfBytes,
  };
  await assert.rejects(() => fetchLatestOfficialFdaCder({ fetchFn: async () => fakeResponse }), /OFFICIAL_URL_DRIFT/);
});

const cpuBase = 'https://www.cpuc.ca.gov/-/media/cpuc-website/divisions/consumer-protection-and-enforcement-division/documents/tlab/av-programs/';
const html = '<h1>Quarterly Reporting</h1>' + [
  'waymo-deployment-2026q2.zip', 'waymo-deployment-2026q1.zip',
  'waymo-deployment-2025q2.zip', 'waymo-driverless-deployment-2025-q1.zip',
].map((file) => `<a href="${cpuBase}${file}">Waymo</a>`).join('');

test('CPUC page discovers 4 periods, rejects unofficial Waymo archive', () => {
  const links = discoverCpucWaymoQuarterLinks(html);
  assert.equal(links.size, 4);
  assert.equal(links.get('2026:Q2'), `${cpuBase}waymo-deployment-2026q2.zip`);
  assert.throws(() => discoverCpucWaymoQuarterLinks(html.replaceAll(cpuBase, 'https://elsewhere.example/')), /NONOFFICIAL_ZIP_URL/);
  assert.throws(() => discoverCpucWaymoQuarterLinks('<p>outdated page</p>'), /PAGE_FORMAT_DRIFT/);
});

test('CPUC month CSV accepts aggregate monthly rows, refuses wrong months and duplicates', () => {
  const q2 = parseCpucMonthAggregate('Month,TotalTrips\n2026-04,1416158\n2026-05,1454991\n2026-06,1348926\n', '2026:Q2');
  assert.equal(q2.totalTrips, 4220075);
  const q1 = parseCpucMonthAggregate('Month,TotalTrips\n1,"550,457"\n2,"559,569"\n3,"708,180"\n', '2025:Q1');
  assert.equal(q1.totalTrips, 1818206);
  assert.throws(() => parseCpucMonthAggregate('Month,TotalTrips\n1,10\n2,20\n4,30', '2025:Q1'), /NOT_IN_QUARTER/);
  assert.throws(() => parseCpucMonthAggregate('Month,TotalTrips\n1,10\n1,20\n3,30', '2025:Q1'), /DUPLICATE/);
  assert.throws(() => parseCpucMonthAggregate('Month,TotalTrips\n1,10\n2,20\n3,NAN', '2025:Q1'), /INVALID_TRIP_COUNT/);
});

function crc32(bytes) {
  let result = 0xffffffff;
  for (const byte of bytes) {
    result ^= byte;
    for (let i = 0; i < 8; i += 1) result = (result >>> 1) ^ ((result & 1) ? 0xedb88320 : 0);
  }
  return (result ^ 0xffffffff) >>> 0;
}

function makeSmallZip(content, filename = 'Waymo/PSG_2026_AV_Month_Part0-Deployment.csv') {
  const name = Buffer.from(filename, 'utf8');
  const raw = Buffer.from(content, 'utf8');
  const compressed = deflateRawSync(raw);
  const check = crc32(raw);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(check, 14);
  local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(raw.length, 22);
  local.writeUInt16LE(name.length, 26);
  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE(8, 10);
  entry.writeUInt32LE(check, 16);
  entry.writeUInt32LE(compressed.length, 20);
  entry.writeUInt32LE(raw.length, 24);
  entry.writeUInt16LE(name.length, 28);
  const centralOffset = local.length + name.length + compressed.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(entry.length + name.length, 12);
  end.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([local, name, compressed, entry, name, end]);
}

test('CPUC ZIP central directory selects ONLY aggregate CSV and verifies CRC', () => {
  const content = 'Month,TotalTrips\n2026-04,1416158\n2026-05,1454991\n2026-06,1348926\n';
  const zip = makeSmallZip(content);
  const entry = parseZipCentralDirectory(zip, 0)[0];
  assert.equal(entry.name, 'Waymo/PSG_2026_AV_Month_Part0-Deployment.csv');
  assert.equal(unpackSmallAggregate(zip.subarray(0, entry.compressedSize + 100), entry), content);
  assert.throws(() => unpackSmallAggregate(Buffer.alloc(40), entry), /INVALID_LOCAL_HEADER/);
  assert.throws(() => parseZipCentralDirectory(Buffer.from('not a zip'), 0), /EOCD_NOT_FOUND/);
});

test('CPUC synthetic range-only ZIP download never requests full archive', async () => {
  const zip = makeSmallZip('Month,TotalTrips\n2026-04,1416158\n2026-05,1454991\n2026-06,1348926\n');
  const archiveUrl = `${cpuBase}waymo-deployment-2026q2.zip`;
  const requestedRanges = [];
  const fakeFetch = async (url, options) => {
    assert.equal(url, archiveUrl);
    const requested = options.headers.range;
    requestedRanges.push(requested);
    let start; let end;
    if (requested.startsWith('bytes=-')) {
      start = Math.max(0, zip.length - Number(requested.split('-')[1])); end = zip.length - 1;
    } else {
      const match = /^bytes=(\d+)-(\d+)$/.exec(requested);
      start = Number(match[1]); end = Math.min(Number(match[2]), zip.length - 1);
    }
    return { url, status: 206,
      headers: { get: (name) => name === 'content-range' ? `bytes ${start}-${end}/${zip.length}` : null },
      arrayBuffer: async () => zip.subarray(start, end + 1),
    };
  };
  const result = await fetchCpucQuarterAggregate('2026:Q2', archiveUrl, { fetchFn: fakeFetch });
  assert.equal(result.totalTrips, 4220075);
  assert.equal(requestedRanges.length, 3);
  assert.equal(requestedRanges[0], 'bytes=-65536');
  assert.equal(requestedRanges[1], 'bytes=0-29');
  assert.match(requestedRanges[2], /^bytes=0-\d+$/);
  assert.equal(CPUC_QUARTERLY_PAGE.startsWith('https://www.cpuc.ca.gov/'), true);
});
