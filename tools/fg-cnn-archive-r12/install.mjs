// ZGMINI Fear & Greed archive Sidecar R12: one-time, fail-closed source-pin alignment.
// Does NOT run a collection, write SQLite/D1, edit config, or modify scheduled tasks.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash, randomBytes} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const HOME = 'E:\\ZGmini\\data\\pc-writer';
const SOURCE_ROOT = 'E:\\ZGmini\\projects\\zgmini-earnings-history-pc-release';
const NODE = 'E:\\ZGmini\\runtime\\node.exe';
const SIDECAR = path.join(HOME, 'archive-sidecar-r7');
const TARGET = path.join(SIDECAR, 'archive-run.mjs');
const CORE = path.join(SIDECAR, 'archive-core-r10.mjs');
const CHECKS = path.join(SIDECAR, 'verified-checks-r10.mjs');
const CORE_LOCK = path.join(HOME, 'local-cycle.lock');
const LOCK = path.join(SIDECAR, '.zgmini-fg-source-pin-r11.install.lock');
const IDLE_WAIT_LIMIT_MS = 15 * 60 * 1000;
const BEFORE_SHA = 'e6966138c99d8bf45382e7aad2f00082102dd0ac4cd1d689ffee71fa2098e892';
const AFTER_SHA = 'ce07af0b5e8d17625644e204f2815c1f754aff2468bc5434ac13c0dadcecd907';
const OLD_APPROVAL = 'a23c12cc8dd3238fa59adb417a4fdd5fce1bd57e';
const NEW_APPROVAL = 'f7ed1e44957b5a8994163c1f2e5bd23bc1cb9ab5';
const STAMP = new Date().toISOString().replace(/[-:.]/g, '').replace('Z', 'Z');
const BASE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPORT_PATH = path.join(os.tmpdir(), `ZGMINI_FG_SOURCE_PIN_R12_RESULT_${STAMP}-${process.pid}.txt`);
const report = [
  'ZGMINI_FG_SOURCE_PIN_R12',
  'variant=R12_MINIMAL_SHA_ALIGNMENT',
  `at=${new Date().toISOString()}`,
  `originalSha256=${BEFORE_SHA}`,
  `expectedNewSha256=${AFTER_SHA}`,
  `approvedWriterSha=${NEW_APPROVAL}`,
  'scope=ONE_SIDECAR_SOURCE_FILE',
  'providerCalls=0',
  'dbWrites=0',
  'd1Writes=0',
  'taskChanges=0',
];
let ownLock = false;
let reportFd = null;
const lockIdentity = `${process.pid}:${randomBytes(12).toString('hex')}`;
let stagePath = null;
let backupPath = null;
let wasReplaced = false;

function sha(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function stop(code) { const error = new Error(code); error.safeCode = code; throw error; }
function requireFile(file) {
  const st = fs.lstatSync(file);
  if (!st.isFile() || st.isSymbolicLink()) stop('STOP_NOT_REGULAR_FILE');
  return st;
}
function requireDirectDirectory(dir) {
  const st = fs.lstatSync(dir);
  if (!st.isDirectory() || st.isSymbolicLink()) stop('STOP_DIRECTORY_REPARSE_OR_MISSING');
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function git(...args) {
  return execFileSync('git', args, {
    cwd: SOURCE_ROOT, encoding: 'utf8', windowsHide: true, timeout: 15000, maxBuffer: 32768,
  }).trim();
}
function coreLockPresent() {
  try {
    const st = fs.lstatSync(CORE_LOCK);
    if (!st.isFile() || st.isSymbolicLink()) stop('STOP_CYCLE_LOCK_UNEXPECTED_TYPE');
    return true;
  } catch (e) {
    if (e?.code === 'ENOENT') return false;
    throw e;
  }
}
function waitForIdleWindow() {
  const startedAt = Date.now();
  const waiter = new Int32Array(new SharedArrayBuffer(4));
  while (Date.now() - startedAt < IDLE_WAIT_LIMIT_MS) {
    if (!coreLockPresent()) {
      Atomics.wait(waiter, 0, 0, 2500);
      if (!coreLockPresent()) {
        report.push(`idleWaitSeconds=${Math.ceil((Date.now() - startedAt) / 1000)}`);
        return;
      }
    }
    Atomics.wait(waiter, 0, 0, 2500);
  }
  stop('STOP_CORE_BUSY_OR_STALE_LOCK');
}
function stableApproval({allowCoreRunning=false}={}) {
  requireFile(path.join(HOME, 'config.json'));
  const cfg = readJson(path.join(HOME, 'config.json'));
  if (cfg?.source !== NEW_APPROVAL || cfg.enabled !== true || cfg.collectionTarget !== 'pc')
    stop('STOP_WRITER_CONFIG_MISMATCH');
  const head = git('rev-parse', 'HEAD');
  if (head !== NEW_APPROVAL) stop('STOP_PROJECT_HEAD_MISMATCH');
  if (git('status', '--porcelain', '--untracked-files=no')) stop('STOP_PROJECT_TRACKED_DIRTY');
  for (const file of ['local-writer-last-run.json', 'local-publication-ledger.json']) {
    requireFile(path.join(HOME, file));
    const state = readJson(path.join(HOME, file));
    if (state?.status !== 'VERIFIED' || state?.source !== NEW_APPROVAL)
      stop(file.startsWith('local-writer') ? 'STOP_WRITER_UNVERIFIED' : 'STOP_PUBLICATION_UNVERIFIED');
  }
  if (!allowCoreRunning && coreLockPresent()) stop('STOP_ACTIVE_CORE_CYCLE');
}
function verifySyntax(bytes) {
  const test = spawnSync(NODE, ['--check', '--input-type=module'], {
    input: bytes, encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 32768,
  });
  if (test.error || test.status !== 0) stop('STOP_NODE_SYNTAX_CHECK');
}
function verifyHelperSyntax(file) {
  const test = spawnSync(NODE, ['--check', file], {
    encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 32768,
  });
  if (test.error || test.status !== 0) stop('STOP_INSTALLED_HELPER_SYNTAX_CHECK');
}
function writeExclusiveVerified(file, bytes, expectedSha) {
  const fd = fs.openSync(file, 'wx');
  try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  if (sha(fs.readFileSync(file)) !== expectedSha) stop('STOP_STAGED_HASH_MISMATCH');
}
function rollbackIfOwned() {
  if (!wasReplaced || !backupPath) return 'NO_REPLACEMENT';
  try {
    if (sha(fs.readFileSync(TARGET)) !== AFTER_SHA || sha(fs.readFileSync(backupPath)) !== BEFORE_SHA)
      return 'ROLLBACK_HELD_CHANGED_FILE';
    const restorePath = `${TARGET}.restore-${STAMP}-${process.pid}.tmp`;
    writeExclusiveVerified(restorePath, fs.readFileSync(backupPath), BEFORE_SHA);
    fs.renameSync(restorePath, TARGET);
    return sha(fs.readFileSync(TARGET)) === BEFORE_SHA ? 'ROLLED_BACK' : 'ROLLBACK_VERIFY_FAILED';
  } catch { return 'ROLLBACK_FAILED_MANUAL_REVIEW'; }
}

function main() {
  if (process.platform !== 'win32') stop('STOP_WINDOWS_REQUIRED');
  // The result location must be usable before making any operational change.
  reportFd = fs.openSync(REPORT_PATH, 'wx');
  fs.writeSync(reportFd, 'ZGMINI_FG_SOURCE_PIN_R12_STARTED' + os.EOL);
  fs.fsyncSync(reportFd);
  requireDirectDirectory(HOME);
  requireDirectDirectory(SOURCE_ROOT);
  requireDirectDirectory(SIDECAR);
  requireFile(NODE);
  requireFile(TARGET);
  requireFile(CORE);
  requireFile(CHECKS);
  verifyHelperSyntax(CORE);
  verifyHelperSyntax(CHECKS);
  const lockFd = fs.openSync(LOCK, 'wx');
  ownLock = true;
  try { fs.writeFileSync(lockFd, lockIdentity + os.EOL); fs.fsyncSync(lockFd); }
  finally { fs.closeSync(lockFd); }
  stableApproval({allowCoreRunning:true});
  waitForIdleWindow();
  stableApproval();
  const original = fs.readFileSync(TARGET);
  const currentSha = sha(original);
  if (currentSha === AFTER_SHA) {
    report.push('status=ALREADY_APPLIED_PENDING_RUNTIME');
    return;
  }
  if (currentSha !== BEFORE_SHA) stop('STOP_INSTALLED_FILE_SHA_CHANGED');
  const oldText = original.toString('utf8');
  if (oldText.split(OLD_APPROVAL).length !== 2) stop('STOP_PATCH_SUBJECT_UNEXPECTED');
  const updated = Buffer.from(oldText.replace(OLD_APPROVAL, NEW_APPROVAL), 'utf8');
  if (updated.length !== original.length || sha(updated) !== AFTER_SHA)
    stop('STOP_PATCH_CONTENT_MISMATCH');
  verifySyntax(updated);

  backupPath = `${TARGET}.backup-R12-${STAMP}-${process.pid}`;
  fs.copyFileSync(TARGET, backupPath, fs.constants.COPYFILE_EXCL);
  if (sha(fs.readFileSync(backupPath)) !== BEFORE_SHA) stop('STOP_BACKUP_VERIFY_FAILED');
  report.push(`backupCreated=true`);
  stagePath = `${TARGET}.stage-R12-${STAMP}-${process.pid}.tmp`;
  writeExclusiveVerified(stagePath, updated, AFTER_SHA);

  // Fail closed if the operating file or approval changed during staging.
  stableApproval();
  if (sha(fs.readFileSync(TARGET)) !== BEFORE_SHA) stop('STOP_CONCURRENT_SOURCE_CHANGE');
  fs.renameSync(stagePath, TARGET);
  wasReplaced = true;
  stagePath = null;
  if (sha(fs.readFileSync(TARGET)) !== AFTER_SHA) stop('STOP_INSTALLED_HASH_MISMATCH');
  verifySyntax(fs.readFileSync(TARGET));
  report.push('status=APPLIED_PENDING_RUNTIME_VERIFICATION');
}

try { main(); }
catch (error) {
  const code = typeof error?.safeCode === 'string' ? error.safeCode :
    error?.code === 'EEXIST' ? 'STOP_CONCURRENT_INSTALL_OR_BACKUP_COLLISION' : 'STOP_UNEXPECTED_IO_OR_RUNTIME';
  report.push(`status=${code}`);
  report.push(`rollback=${rollbackIfOwned()}`);
  process.exitCode = 2;
}
finally {
  if (stagePath) {
    try { fs.unlinkSync(stagePath); } catch { report.push('stageCleanup=REVIEW_REQUIRED'); }
  }
  if (ownLock) {
    try {
      if (fs.readFileSync(LOCK, 'utf8').trim() === lockIdentity) fs.unlinkSync(LOCK);
      else report.push('installLockCleanup=NOT_OWNED');
    } catch { report.push('installLockCleanup=REVIEW_REQUIRED'); }
  }
  report.push('note=No operational collection or publication was started by this installer.');
  report.push('next=After existing natural cycle, verify SQLite and D1 and public 1D API.');
  try {
    if (reportFd !== null) {
      fs.ftruncateSync(reportFd, 0);
      fs.writeSync(reportFd, report.join(os.EOL) + os.EOL, 0, 'utf8');
      fs.fsyncSync(reportFd);
    } else report.push('reportFile=NOT_CREATED');
  } catch {
    report.push('reportFile=WRITE_FAILED');
    process.exitCode = 2;
  } finally {
    if (reportFd !== null) try { fs.closeSync(reportFd); } catch { process.exitCode = 2; }
  }
  process.stdout.write(report.join(os.EOL) + os.EOL);
}
