import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {collectApprovedNine} from '../scripts/pc-writer/theme-nine-r23-collect.mjs';
import {auditNineR24} from '../scripts/pc-writer/theme-nine-r24-session-audit.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'zgmini-r24-audit-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const rosterPath = path.join(root, 'approved.json');
  fs.writeFileSync(rosterPath, JSON.stringify({
    schema: 'zgmini.theme-nine.r20-approved-three-gate-candidates.v1',
    counts: {themes: 1, positions: 3, uniqueTickers: 3},
    groups: [{theme: 'sample', tickers: ['BOTZ', 'DRIV', 'ROBO']
      .map(ticker => ({ticker, approvedCandidate: true}))}]
  }));
  const makeBar = (symbol, day) => JSON.stringify({symbol,
    timestamp: `2026-10-${day}T19:00:00Z`, open: 10, high: 11,
    low: 9, close: 10.5, volume: 12345, is_gap: false});
  const params = {rosterPath, dataRoot: root, start: '2023-01-01', end: '2026-10-26'};
  const fetchImpl = async url => {
    const symbol = url.pathname.split('/').at(-2);
    const dates = symbol === 'BOTZ' ? ['21'] : ['21', '22'];
    return new Response(dates.map(day => makeBar(symbol, day)).join('\n') + '\n');
  };
  return {params, fetchImpl, root};
}

test('R24 audits SHA-backed 1h sessions against SPY without modifying collection', async t => {
  const {params, fetchImpl, root} = fixture(t);
  assert.equal((await collectApprovedNine({...params, fetchImpl})).status,
    'PRIVATE_RAW_COLLECTION_COMPLETE');
  const base = path.join(root, 'themes/legacy-nine-r23');
  const files = [path.join(base, 'raw-manifest.json'),
    ...fs.readdirSync(path.join(base, 'state')).filter(x => x.endsWith('.json'))
      .map(x => path.join(base, 'state', x))];
  const before = files.map(filename => fs.readFileSync(filename));
  const audit = auditNineR24(params);
  assert.equal(audit.status, 'AUDIT_READ_ONLY_COMPLETE');
  assert.equal(audit.mode, 'NO_NETWORK_NO_DATA_WRITE');
  assert.equal(audit.manifestRawPages, 4);
  assert.equal(audit.spySessionsTotal, 2);
  assert.equal(audit.spyLast252Sessions, 2);
  assert.equal(audit.perSymbol.find(x => x.symbol === 'BOTZ').missingSpySessions, 1);
  assert.equal(audit.perSymbol.find(x => x.symbol === 'ROBO').missingSpySessions, 0);
  assert.equal(audit.providerCalls, 0);
  assert.deepEqual(files.map(filename => fs.readFileSync(filename)), before);
});

test('R24 stops rather than silently counting edited raw data', async t => {
  const {params, fetchImpl, root} = fixture(t);
  await collectApprovedNine({...params, fetchImpl});
  const base = path.join(root, 'themes/legacy-nine-r23');
  const manifest = JSON.parse(fs.readFileSync(path.join(base, 'raw-manifest.json')));
  fs.appendFileSync(path.join(base, manifest.files[0].path), 'tampered');
  assert.throws(() => auditNineR24(params), /RAW_SHA_MISMATCH/);
});

test('R24 CMD embeds the exact audited Node source and approved roster', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const scriptPath = path.join(root, 'scripts/pc-writer/THEME_NINE_R24_SESSION_AUDIT.cmd');
  const contents = fs.readFileSync(scriptPath, 'ascii');
  const embedded = (a, b) => Buffer.from(contents.split(a).at(-1).split(b)[0]
    .replace(/[^A-Za-z0-9+/=]/g, ''), 'base64');
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  assert.ok(contents.includes('--audit 2023-01-01 2026-10-26'));
  assert.ok(contents.includes('THEME_NINE_R24_SESSION_AUDIT_RESULT.txt'));
  assert.equal(/%TEMP%|powershell\.exe|wsl\.exe/i.test(contents), false);
  assert.equal(sha(embedded('::R24_CODE_BEGIN', '::R24_CODE_END')),
    sha(fs.readFileSync(path.join(root, 'scripts/pc-writer/theme-nine-r24-session-audit.mjs'))));
  assert.equal(sha(embedded('::R24_ROSTER_BEGIN', '::R24_ROSTER_END')),
    sha(fs.readFileSync(path.join(root, 'config/theme-nine-r20-approved-candidates.json'))));
});
