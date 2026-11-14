/**
 * W01 independent, source-only one-time public Census XLSX real-file proof.
 * Only runs on a dedicated NO-MERGE support pull_request branch, under the
 * existing Node.js CI. Never used by the PC Collector, B receiver, or site.
 * No file writes / DB / provider API keys / operational installation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const ONE_SHOT_BRANCH = 'support/w01-census-xlsx-live-proof-20261115';
const LIVE = process.env.CI === 'true'
  && process.env.GITHUB_EVENT_NAME === 'pull_request'
  && process.env.GITHUB_HEAD_REF === ONE_SHOT_BRANCH;
const SOURCE = 'https://www.census.gov/manufacturing/m3/prel/historical_data/histshts/naics/naicsinvp.xlsx';
const MAX = 6_000_000;

async function fetchBoundedOnce(url) {
  // Same URL/redirect/time limit as approved W01 source. Exactly one GET.
  const response = await fetch(url, {method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(40_000)});
  assert.equal(response.status, 200, \`OFFICIAL_CENSUS_HTTP_\${response.status}\`);
  assert.equal(response.url, url, 'OFFICIAL_CENSUS_FINAL_URL_DRIFT');
  assert.ok(response.body?.getReader, 'OFFICIAL_CENSUS_NO_STREAM');
  const size = Number(response.headers.get('content-length'));
  assert.ok(!Number.isFinite(size) || size === 0 || size <= MAX, 'OFFICIAL_CENSUS_LENGTH_CAP');
  const parts=[]; let total=0;
  const reader=response.body.getReader();
  while (true) {
    const {done,value} = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX) { await reader.cancel(); throw Error('OFFICIAL_CENSUS_STREAM_SIZE_CAP'); }
    parts.push(Buffer.from(value));
  }
  const bytes = Buffer.concat(parts);
  assert.ok(bytes.length >= 100, 'OFFICIAL_CENSUS_SOURCE_EMPTY');
  assert.equal(bytes.subarray(0,4).toString('hex'), '504b0304', 'OFFICIAL_CENSUS_NOT_XLSX_ZIP');
  return bytes;
}

test('W01 ONCE: actual Census AMTMTI workbook parses with #1061 production XLSX-lite',
  {skip: !LIVE && 'Only the isolated W01 PR branch may perform the one official GET', timeout: 60_000},
  async t => {
    const {parseOfficialCensusInventoryWorkbook,CENSUS_INVENTORY_URL}=
      await import('../scripts/pc-writer/inflation-causal-candidate-manual-official-r1.mjs');
    assert.equal(CENSUS_INVENTORY_URL,SOURCE,'OFFICIAL_CENSUS_URL_CHANGED');
    const bytes=await fetchBoundedOnce(SOURCE);
    const sha=createHash('sha256').update(bytes).digest('hex');
    // IMPORTANT: readWorkbook is intentionally NOT injected. Parse the real
    // bytes using the exact #1061 xlsx-lite source, not a fixture/shim.
    const parsed=await parseOfficialCensusInventoryWorkbook(bytes);
    assert.equal(parsed.sourceSha256,sha);
    assert.equal(parsed.selector,'MTM/TI');
    assert.equal(parsed.unit,'USD_MILLION_SA_NOMINAL');
    assert.equal(parsed.provider,'US_CENSUS_M3');
    assert.ok(parsed.observations.length >= 360,'OFFICIAL_CENSUS_HISTORY_TOO_SHORT');
    assert.ok(parsed.latest >= '2026-09-01','OFFICIAL_CENSUS_LATEST_PRIOR_TO_LAST_VERIFIED');
    assert.ok(parsed.observations.every(r=>Number.isFinite(r.value) && r.value>0),'OFFICIAL_CENSUS_VALUE_INVALID');
    assert.equal(parsed.observations.at(-1)?.date,parsed.latest);
    // Bounded public integrity metadata only. Never log source cells or raw
    // rows, write the download to a file, or mark any PC storage as complete.
    t.diagnostic(\`W01_OFFICIAL_CENSUS_PARSED_REAL_FILE bytes=\${bytes.length} sha256=\${sha} series=AMTMTI months=\${parsed.observations.length} latest=\${parsed.latest}\`);
  });
