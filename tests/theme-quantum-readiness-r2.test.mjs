import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

const scripts = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../scripts/pc-writer');
const diag = path.join(scripts, 'theme-quantum-readiness-r2.mjs');

test('R2 local quantum inventory is read-only, date-unique and never claims publish readiness', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'quantum-readonly-r2-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));
  const source = path.join(dir, 'pc-writer');
  const data = path.join(source, 'theme');
  fs.mkdirSync(data, {recursive: true});
  const standalone = path.join(dir, 'theme-quantum-readiness-r2.mjs');
  fs.copyFileSync(diag, standalone);
  const day = i => new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10);
  const rows = (ticker, count) => Array.from({length: count}, (_, i) => ({
    date: day(i), symbol: ticker, proxyClose: 10 + i * .01,
    ...(ticker !== 'SPY' ? {netAssetsUSD: 10000000 + i * 10} : {})
  }));
  for (const [ticker, count] of [['QTUM', 628], ['WQTM', 260], ['SPY', 628]]) {
    const records = rows(ticker, count);
    records.push({...records[0], proxyClose: records[0].proxyClose + .1}); // Hourly duplicate, one date.
    fs.writeFileSync(path.join(data, ticker.toLowerCase() + '-prices.json'), JSON.stringify({rows: records}));
  }
  const run = spawnSync(process.execPath, [standalone], {
    env: {...process.env, ZGMINI_QUANTUM_R2_TEST_ROOT: source}, encoding: 'utf8'
  });
  assert.equal(run.status, 0, run.stderr);
  const report = JSON.parse(fs.readFileSync(path.join(dir, 'QUANTUM_R2_READONLY_RESULT.json'), 'utf8'));
  assert.equal(report.status, 'NOT_READY');
  assert.equal(report.providerCalls, 0);
  assert.equal(report.databaseWrites, 0);
  assert.equal(report.sourceDataWrites, 0);
  assert.equal(report.scoreComputed, false);
  assert.equal(report.published, false);
  assert.equal(report.price.QTUM.uniqueDates, 628);
  assert.equal(report.price.WQTM.uniqueDates, 260);
  assert.equal(report.alignedPriceSessions.uniqueDates, 260);
  assert.equal(report.netAssetsUSD.QTUM.uniqueDatedObservations, 628);
  assert.equal(report.netAssetsUSD.WQTM.uniqueDatedObservations, 260);
  assert.ok(report.blockers.includes('QTUM_WQTM_SPY_UNDER_628_ALIGNED_DATES'));
  assert.ok(report.blockers.includes('WISDOMTREE_DATA_LICENSE_OR_WRITTEN_PERMISSION_NOT_VERIFIED'));
  assert.ok(!JSON.stringify(report).includes('proxyClose'));
  assert.equal(fs.readdirSync(source).join(','), 'theme'); // The input tree was never written.
});
