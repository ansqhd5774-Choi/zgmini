import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root = new URL('../tools/fg-cnn-archive-r12/', import.meta.url);
const script = fs.readFileSync(new URL('install.mjs', root), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', root), 'utf8'));
const sha256 = value => createHash('sha256').update(value).digest('hex');

test('R12 pins exact single-file transition without scheduler, DB or D1 mutations', () => {
  assert.equal(manifest.scope, 'ONE_SIDECAR_SOURCE_FILE_ONLY');
  assert.equal(manifest.target, 'E:\\ZGmini\\data\\pc-writer\\archive-sidecar-r7\\archive-run.mjs');
  assert.match(script, /const BEFORE_SHA = 'e6966138c99d8bf45382e7aad2f00082102dd0ac4cd1d689ffee71fa2098e892'/);
  assert.match(script, /const AFTER_SHA = 'ce07af0b5e8d17625644e204f2815c1f754aff2468bc5434ac13c0dadcecd907'/);
  assert.match(script, /const OLD_APPROVAL = 'a23c12cc8dd3238fa59adb417a4fdd5fce1bd57e'/);
  assert.match(script, /const NEW_APPROVAL = 'f7ed1e44957b5a8994163c1f2e5bd23bc1cb9ab5'/);
  assert.match(script, /STOP_INSTALLED_FILE_SHA_CHANGED/);
  assert.match(script, /STOP_PROJECT_HEAD_MISMATCH/);
  assert.match(script, /STOP_WRITER_UNVERIFIED/);
  assert.match(script, /STOP_PUBLICATION_UNVERIFIED/);
  assert.match(script, /STOP_CORE_BUSY_OR_STALE_LOCK/);
  assert.match(script, /rollbackIfOwned/);
  assert.equal(manifest.expectedInstalledSha256.length, 64);
  assert.equal(manifest.targetSha256.length, 64);
  assert.equal(manifest.operationState, 'SOURCE_PREPARED__B_INSTALL_ROUTE_AND_RUNTIME_VERIFICATION_PENDING');
});

test('one exact approval substitution and changed/missing source are distinguishable', () => {
  const before = "const APPROVED='a23c12cc8dd3238fa59adb417a4fdd5fce1bd57e';";
  const old = manifest.previousCoreSourceSha;
  const next = manifest.approvedCoreSourceSha;
  assert.equal(before.split(old).length - 1, 1);
  const after = before.replace(old, next);
  assert.equal(after.length, before.length);
  assert.notEqual(sha256(after), sha256(before));
  assert.equal(after.split(next).length - 1, 1);
  assert.equal(before.replace('nonexistent', next), before);
});

test('installer syntax validates without execution', () => {
  const checked = spawnSync(process.execPath, ['--check', '--input-type=module'], {
    input: script, encoding: 'utf8', timeout: 10000,
  });
  assert.equal(checked.status, 0, checked.stderr);
});
