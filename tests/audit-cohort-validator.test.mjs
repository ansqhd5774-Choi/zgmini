import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const original = path.join(root, 'scripts/audit/validate-open-issue-pr-cohort.mjs');

function fixture() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'zgmini-audit-'));
  const docs = path.join(temp, 'docs');
  const scripts = path.join(temp, 'scripts/audit');
  fs.mkdirSync(docs, { recursive: true });
  fs.mkdirSync(scripts, { recursive: true });
  fs.copyFileSync(original, path.join(scripts, 'validate-open-issue-pr-cohort.mjs'));
  // .mjs is unambiguously ESM; the fixture never runs user-supplied code.
  const encoded = original.match(/const FROZEN_COHORT_ANCHOR = "([^"]+)";/);
  assert.ok(encoded, 'Production validator must pin original cohort');
  const codes = { MI: '본체 Issue', MR: '본체 PR', PI: 'PC Issue', PR: 'PC PR' };
  const frozenCohort = encoded[1].split(',').map((token, i) => {
    const [code, number] = token.split(':');
    return { position: i + 1, kind: codes[code], number: +number };
  });
  const verified = frozenCohort.slice(0, 84).map(row => row.number);
  const pendingNumbers = frozenCohort.slice(84).map(row => row.number);
  const register = {
    schema: 'ZGMINI_FIXED_COHORT_AUDIT_REGISTER_V1',
    ledgerPath: 'docs/OPEN_ISSUE_PR_FULL_AUDIT_20261125.md',
    frozenCohort,
    verifiedFirstSeenBatches: { A: verified },
    pendingNumbers,
    pendingGates: Object.fromEntries(pendingNumbers.map(number => [number, { gate: 'NOT_VERIFIED' }])),
    assertions: { frozenRows: 88, uniqueVerified: 84, remaining: 4 },
  };
  const table = frozenCohort.map(row =>
    '| ' + row.position + ' | ' + row.kind + ' | [#' + row.number + '](https://example.invalid/' + row.number + ') |'
  ).join('\n');
  return {
    temp, register, table,
    script: path.join(scripts, 'validate-open-issue-pr-cohort.mjs'),
    json: path.join(docs, 'OPEN_ISSUE_PR_FIXED_COHORT_REGISTER_20261125.json'),
    markdown: path.join(docs, 'OPEN_ISSUE_PR_FULL_AUDIT_20261125.md'),
  };
}

function check(mutator, { success = false, extraTable = '' } = {}) {
  const f = fixture();
  try {
    if (mutator) mutator(f.register, f);
    fs.writeFileSync(f.json, JSON.stringify(f.register) + '\n');
    fs.writeFileSync(f.markdown, f.table + (extraTable ? '\n' + extraTable : '') + '\n');
    const output = spawnSync(process.execPath, [f.script], {
      cwd: f.temp, encoding: 'utf8', timeout: 10000,
      env: { PATH: process.env.PATH ?? '' },
    });
    if (output.error) throw output.error;
    if (success) {
      assert.equal(output.status, 0, output.stderr);
      return JSON.parse(output.stdout);
    }
    assert.notEqual(output.status, 0, 'A corrupt cohort passed unexpectedly: ' + output.stdout);
    return output;
  } finally {
    fs.rmSync(f.temp, { recursive: true, force: true });
  }
}

test('clean 88-entry cohort prints 84 unique, four pending', () => {
  const result = check(null, { success: true });
  assert.equal(result.status, 'PASS');
  assert.equal(result.cohort, 88);
  assert.equal(result.verifiedUnique, 84);
  assert.deepEqual(result.remaining, [68, 155, 3542, 3543]);
  assert.equal(result.progressPercent, 95.5);
});

test('revisiting an already verified Issue never raises the unique count', () => {
  const result = check(reg => { reg.verifiedFirstSeenBatches.B = [1463]; }, { success: true });
  assert.equal(result.verifiedUnique, 84);
  assert.equal(result.rechecksNotCounted, 1);
});

test('duplicate original ID is rejected', () => {
  check(reg => { reg.frozenCohort[1].number = reg.frozenCohort[0].number; });
});
test('missing frozen row is rejected', () => {
  check(reg => { reg.frozenCohort.pop(); });
});
test('extra batch ID outside original 88 is rejected', () => {
  check(reg => { reg.verifiedFirstSeenBatches.A.push(99999999); });
});
test('false 85 verified claim is rejected', () => {
  check(reg => { reg.assertions.uniqueVerified = 85; });
});
test('false three pending claim is rejected', () => {
  check(reg => { reg.assertions.remaining = 3; });
});
test('missing evidence gate is rejected', () => {
  check(reg => { delete reg.pendingGates[reg.pendingNumbers[0]]; });
});
test('an altered original Markdown frozen table is rejected', () => {
  check(null, { extraTable: '| 89 | PC Issue | [#1999](https://example.invalid/1999) |' });
});
test('a missing pending ID is rejected', () => {
  check(reg => { reg.pendingNumbers.pop(); });
});
test('invalid original type is rejected', () => {
  check(reg => { reg.frozenCohort[1].kind = 'nonexistent'; });
});

test('coordinated alteration of JSON and Markdown is rejected by immutable anchor', () => {
  check((reg, f) => {
    const original = reg.frozenCohort[1].number;
    reg.frozenCohort[1].number = 99999990;
    f.table = f.table.replace('[#' + original + ']', '[#99999990]');
  });
});
