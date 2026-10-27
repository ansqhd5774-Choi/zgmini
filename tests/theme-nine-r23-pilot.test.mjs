import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'scripts/pc-writer/THEME_NINE_R23_PILOT.cmd');
const diagnosticTarget = path.join(root, 'scripts/pc-writer/THEME_NINE_R23_DIAGNOSE.cmd');
const recoveryTarget = path.join(root, 'scripts/pc-writer/THEME_NINE_R23_RECOVER.cmd');
const source = path.join(root, 'scripts/pc-writer/theme-nine-r23-collect.mjs');
const roster = path.join(root, 'config/theme-nine-r20-approved-candidates.json');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

function embedded(text, a, b) {
  const i = text.lastIndexOf(a);
  assert.ok(i >= 0);
  const j = text.indexOf(b, i + a.length);
  assert.ok(j > i);
  return Buffer.from(text.slice(i + a.length, j).replace(/[^A-Za-z0-9+/=]/g, ''), 'base64');
}

test('standalone pilot is ASCII CRLF, SHA-equal to source and avoids other shells', () => {
  const bytes = fs.readFileSync(target);
  const text = bytes.toString('ascii');
  assert.equal(bytes.includes(Buffer.from('\r\n')), true);
  assert.equal(text.replace(/\r\n/g, '').includes('\n'), false);
  assert.equal(/[^\x00-\x7f]/.test(text), false);
  assert.ok(text.includes('exit /b 2\r\n:cleanup'));
  assert.ok(text.includes('--collect-auto 2023-01-01 2026-10-26'));
  assert.ok(text.includes('THEME_NINE_R23_PILOT_RESULT.txt'));
  assert.ok(text.includes('SCOPE=AUTO_UP_TO_64_BATCHES_FOUR_FREE_GET_EACH_60S_PAUSE'));
  assert.equal(/%TEMP%|powershell\.exe|wsl\.exe|^\s*(?:powershell|wsl)\s/im.test(text), false);
  assert.equal(sha(embedded(text, '::R23_BUNDLE_CODE_BEGIN', '::R23_BUNDLE_CODE_END')),
    sha(fs.readFileSync(source)));
  assert.equal(sha(embedded(text, '::R23_BUNDLE_ROSTER_BEGIN', '::R23_BUNDLE_ROSTER_END')),
    sha(fs.readFileSync(roster)));
});

test('extracted embedded collector can inspect 9 themes read-only without checkout', async t => {
  const rootTemp = fs.mkdtempSync(path.join(os.tmpdir(), 'r23-pilot-extract-'));
  t.after(() => fs.rmSync(rootTemp, {recursive: true, force: true}));
  const bundle = fs.readFileSync(target, 'ascii');
  const codePath = path.join(rootTemp, 'standalone.mjs');
  const rosterPath = path.join(rootTemp, 'roster.json');
  const dataRoot = path.join(rootTemp, 'empty-data-root');
  fs.writeFileSync(codePath, embedded(bundle, '::R23_BUNDLE_CODE_BEGIN', '::R23_BUNDLE_CODE_END'));
  fs.writeFileSync(rosterPath, embedded(bundle, '::R23_BUNDLE_ROSTER_BEGIN', '::R23_BUNDLE_ROSTER_END'));
  const {inspectApprovedNine} = await import(pathToFileURL(codePath).href);
  const report = inspectApprovedNine({rosterPath, dataRoot,
    start: '2023-01-01', end: '2026-10-26'});
  assert.equal(report.mode, 'NO_NETWORK_NO_WRITE');
  assert.equal(report.themes, 9);
  assert.equal(report.positions, 64);
  assert.equal(report.uniqueETFs, 63);
  assert.equal(report.totalSymbolsIncludingSPY, 64);
  assert.equal(fs.existsSync(dataRoot), false);
});

test('one-file failure diagnostic contains the same audited code and roster', () => {
  const text = fs.readFileSync(diagnosticTarget, 'ascii');
  assert.ok(text.includes('--inspect-failure 2023-01-01 2026-10-26'));
  assert.ok(text.includes('THEME_NINE_R23_DIAGNOSE_RESULT.txt'));
  assert.ok(text.includes('SCOPE=READ_ONLY_FAILED_CHECKPOINT_NO_NETWORK'));
  assert.equal(sha(embedded(text, '::R23_BUNDLE_CODE_BEGIN', '::R23_BUNDLE_CODE_END')),
    sha(fs.readFileSync(source)));
  assert.equal(sha(embedded(text, '::R23_BUNDLE_ROSTER_BEGIN', '::R23_BUNDLE_ROSTER_END')),
    sha(fs.readFileSync(roster)));
});

test('one-file recovery requires exact checkpoint review before bounded collection', () => {
  const text = fs.readFileSync(recoveryTarget, 'ascii');
  assert.ok(text.includes('--resume-reviewed-timeout 2023-01-01 2026-10-26'));
  assert.ok(text.includes('if errorlevel 1 goto :review_failed'));
  assert.ok(text.includes('--collect-auto 2023-01-01 2026-10-26'));
  assert.ok(text.includes('REVIEW_REJECTED_NO_PROVIDER_CALL'));
  assert.ok(text.includes('THEME_NINE_R23_RECOVER_RESULT.txt'));
  assert.equal(/%TEMP%|powershell\.exe|wsl\.exe|^\s*(?:powershell|wsl)\s/im.test(text), false);
  assert.equal(sha(embedded(text, '::R23_BUNDLE_CODE_BEGIN', '::R23_BUNDLE_CODE_END')),
    sha(fs.readFileSync(source)));
  assert.equal(sha(embedded(text, '::R23_BUNDLE_ROSTER_BEGIN', '::R23_BUNDLE_ROSTER_END')),
    sha(fs.readFileSync(roster)));
});
