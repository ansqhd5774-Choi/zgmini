import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {scoreOneR25, calculateNineR25} from '../scripts/pc-writer/theme-nine-r25-individual-score.mjs';
import {selectRealHourlySessions} from '../scripts/pc-writer/theme-nine-r25-approved-selector.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const rosterPath = path.resolve(here, '../config/theme-nine-r20-approved-candidates.json');
const rosterBytes = fs.readFileSync(rosterPath);
const roster = JSON.parse(rosterBytes);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

// Selector proves the NYC hour in *the existing* source, including DST and early close.
const probe = selectRealHourlySessions([
  {timestamp: '2024-01-02T19:20:00Z', close: 10}, // NYC 14, reject
  {timestamp: '2024-01-02T20:30:00Z', close: 11}, // NYC 15, keep
  {timestamp: '2024-07-02T19:20:00Z', close: 12}, // NYC 15, keep
  {timestamp: '2024-07-03T16:20:00Z', close: 13}, // NYC 12, early close keep
  {timestamp: '2024-07-03T19:20:00Z', close: 14}, // NYC 15, early close reject
  {timestamp: '2024-11-29T17:20:00Z', close: 15}, // NYC 12, early close keep
  {timestamp: '2024-11-29T20:20:00Z', close: 16}  // NYC 15, early close reject
]);
assert.deepEqual(probe.map(row => [row.date, row.close]), [
  ['2024-01-02', 11], ['2024-07-02', 12],
  ['2024-07-03', 13], ['2024-11-29', 15]
]);

const dates = [];
for (let stamp = Date.parse('2024-01-02T00:00:00Z'); dates.length < 320; stamp += 86_400_000) {
  const day = new Date(stamp), wd = day.getUTCDay();
  if (wd !== 0 && wd !== 6) dates.push(day.toISOString().slice(0, 10));
}
const close = (i, symbolIndex) => 40 + symbolIndex * 0.4 + i * 0.03 + Math.sin(i * 0.19 + symbolIndex) * 2;
const spy = dates.map((date, i) => ({date, close: close(i, 0)}));
const own = dates.map((date, i) => ({date, close: close(i, 1)}));
const scored = scoreOneR25({symbol: 'TEST', spySessions: spy, ownSessions: own});
assert.equal(scored.history.length, 252);
assert.equal(scored.latest252RealProxySessions, 252);
assert.ok(scored.latest252ScoredSessions > 0);
assert.ok(scored.latestScore >= 0 && scored.latestScore <= 100);
const short = scoreOneR25({symbol: 'TEST', spySessions: spy, ownSessions: own.slice(-3)});
assert.equal(short.latest252ScoredSessions, 0);
assert.equal(short.latestStatus, 'BELOW_40_REAL_SESSIONS');
assert.equal(short.latestScore, null);
const missing = scoreOneR25({symbol: 'TEST', spySessions: spy,
  ownSessions: own.filter((_, i) => i !== 310)});
assert.equal(missing.history.find(row => row.date === dates[310]).status, 'NO_REAL_CLOSE');
assert.equal(missing.history.find(row => row.date === dates[310]).score, null);
assert.throws(() => scoreOneR25({symbol: 'TEST', spySessions: spy,
  ownSessions: [...own, {date: '2020-01-01', close: 5}]}), /NON_SPY_DATE/);

// Full 64-symbol in-memory fixture written to an isolated temporary directory.
// This checks the real R24 SHA+checkpoint audit AND R25 score pipeline end to end.
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'zgmini-r25-unit-'));
try {
  const home = path.join(temp, 'themes', 'legacy-nine-r23');
  fs.mkdirSync(path.join(home, 'raw'), {recursive: true});
  fs.mkdirSync(path.join(home, 'state'), {recursive: true});
  const symbols = [...new Set([...roster.groups.flatMap(group => group.tickers.map(v => v.ticker)),
    'SPY'])].sort();
  assert.equal(symbols.length, 64);
  const manifest = {version: 1, project: 'legacy-nine-r23',
    rosterSha256: sha(rosterBytes), source: 'https://getmarkethistory.com',
    licenseStatus: 'PRIVATE_RESEARCH_ONLY_PUBLICATION_NOT_APPROVED', files: []};
  const state = {version: 1, project: 'legacy-nine-r23', rosterSha256: sha(rosterBytes),
    start: '2023-01-01', end: '2026-10-26', symbols: {}};
  for (const [index, symbol] of symbols.entries()) {
    const days = symbol === 'LLMA' ? dates.slice(-15) : symbol === 'RBTX' ? dates.slice(-3) :
      symbol === 'KYC' ? dates.filter((_, i) => i !== 310) : dates;
    const records = days.flatMap(date => {
      const i = dates.indexOf(date), price = close(i, index);
      // UTC 16/17 supports the official NY12 early-close rule; UTC 19/20 NY15.
      return [16, 17, 19, 20].map(hour => ({
        timestamp: `${date}T${String(hour).padStart(2, '0')}:20:00Z`,
        symbol, open: price, high: price, low: price, close: price,
        volume: 100, is_gap: false}));
    });
    const bytes = Buffer.from(records.map(row => JSON.stringify(row)).join('\n') + '\n');
    const hash = sha(bytes), rel = `raw/${symbol}_${hash}.jsonl`;
    fs.writeFileSync(path.join(home, rel), bytes);
    const url = new URL(`/api/v1/bars/stocks/${symbol}/1h`, manifest.source);
    for (const [k, v] of Object.entries({start: state.start, end: state.end,
      limit: '5000', format: 'jsonl', columns: 'timestamp,symbol,open,high,low,close,volume,is_gap'}))
      url.searchParams.set(k, v);
    const entry = {path: rel, symbol, sha256: hash,
      source: manifest.source,
      priceMode: 'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
      schemaVersion: 'GMH_1H_OHLCV_NDJSON_R23',
      requestedUrl: url.toString(), rows: records.length,
      nonGapRows: records.length, gapRows: 0,
      firstTimestampUTC: records[0].timestamp,
      lastTimestampUTC: records.at(-1).timestamp};
    manifest.files.push(entry);
    state.symbols[symbol] = {complete: true, files: [{path: rel, sha256: hash}],
      lastTimestamp: records.at(-1).timestamp};
  }
  fs.writeFileSync(path.join(home, 'raw-manifest.json'), JSON.stringify(manifest));
  const key = sha(JSON.stringify({roster: sha(rosterBytes),
    start: state.start, end: state.end})).slice(0, 20);
  fs.writeFileSync(path.join(home, 'state', `collection-${key}.json`), JSON.stringify(state));
  const result = calculateNineR25({dataRoot: temp, rosterPath,
    start: state.start, end: state.end});
  assert.equal(result.counts.uniqueApprovedETFs, 63);
  assert.equal(result.source.manifestRawPages, 64);
  assert.equal(result.source.latest252SpySessions, 252);
  assert.deepEqual(result.counts.below40RealSessions, ['LLMA', 'RBTX']);
  assert.equal(result.individual.LLMA.latestScore, null);
  assert.equal(result.individual.RBTX.latestScore, null);
  assert.equal(result.individual.KYC.history.find(row => row.date === dates[310]).score, null);
  assert.equal(result.individual.KYC.latest252RealProxySessions, 251);
  assert.ok(result.counts.withCurrentDateScore > 0);
  assert.equal(result.providerCalls, 0);
  assert.equal(result.dataRootWriteCount, 0);
  assert.equal(result.d1Writes, 0);
  const rawFiles = fs.readdirSync(path.join(home, 'raw'));
  assert.equal(rawFiles.length, 64);
  console.log(JSON.stringify({status: 'PASS_R25_ORIGINAL_R2_AND_FULL_R24_PIPELINE',
    symbols: result.counts.uniqueApprovedETFs, spyProxy: result.source.spyProxySessions,
    latestScored: result.counts.withCurrentDateScore,
    under40: result.counts.below40RealSessions,
    fixtureRawFiles: rawFiles.length}));
} finally {
  fs.rmSync(temp, {recursive: true, force: true});
}
