#!/usr/bin/env node
/**
 * Read-only integrity checker for the 2026-11-25 fixed 88-entry Issue/PR cohort.
 * It does not call GitHub, mutate any Issue, run a job, or infer feature completion.
 * Usage: node scripts/audit/validate-open-issue-pr-cohort.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const regPath = path.join(root, 'docs/OPEN_ISSUE_PR_FIXED_COHORT_REGISTER_20261125.json');
const reg = JSON.parse(fs.readFileSync(regPath, 'utf8'));
assert.equal(reg.schema, 'ZGMINI_FIXED_COHORT_AUDIT_REGISTER_V1');

const frozen = reg.frozenCohort;
assert.equal(frozen.length, 88, 'Fixed cohort length must stay 88');
const expectedRows = Array.from({length: 88}, (_, i) => i + 1);
assert.deepEqual(frozen.map(item => item.position), expectedRows, 'Frozen row ordering changed');
const ids = frozen.map(item => item.number);
assert.equal(new Set(ids).size, 88, 'Fixed cohort contains a repeated issue/PR number');
assert.ok(frozen.every(item => Number.isSafeInteger(item.number) && item.number > 0
  && ['PC Issue', 'PC PR', '본체 Issue', '본체 PR'].includes(item.kind)),
  'Invalid frozen cohort metadata');

const ledger = fs.readFileSync(path.join(root, reg.ledgerPath), 'utf8');
const ledgerRows = ledger.split(/\r?\n/)
  .map(line => line.match(/^\| (\d+) \| (.*?) \| \[#(\d+)\]/))
  .filter(Boolean)
  .map(match => ({position: +match[1], kind: match[2], number: +match[3]}));
assert.deepEqual(ledgerRows, frozen, 'Frozen source table differs from the audit register');

const seen = new Map();
const rechecks = [];
for (const [batch, numbers] of Object.entries(reg.verifiedFirstSeenBatches)) {
  assert.ok(/^[A-Z]{1,2}$/.test(batch), 'Invalid batch name');
  assert.ok(Array.isArray(numbers), 'Invalid batch records');
  for (const number of numbers) {
    assert.ok(ids.includes(number), 'Batch contains an ID outside frozen cohort: ' + number);
    if (seen.has(number)) rechecks.push({number, initial: seen.get(number), repeated: batch});
    else seen.set(number, batch);
  }
}
const pending = ids.filter(id => !seen.has(id)).sort((a, b) => a - b);
const expectedPending = [...reg.pendingNumbers].sort((a, b) => a - b);
assert.deepEqual(pending, expectedPending, 'Pending set is not exactly the complement of verified IDs');
assert.equal(seen.size, reg.assertions.uniqueVerified, 'Verified unique count mismatch');
assert.equal(pending.length, reg.assertions.remaining, 'Remaining count mismatch');
assert.equal(seen.size + pending.length, reg.assertions.frozenRows, 'Totals do not add to 88');
assert.deepEqual(Object.keys(reg.pendingGates).map(Number).sort((a,b)=>a-b),
  pending, 'Missing or extra outstanding evidence gate');
console.log(JSON.stringify({
  status: 'PASS', cohort: frozen.length, verifiedUnique: seen.size,
  remaining: pending, rechecksNotCounted: rechecks.length,
  progressPercent: Math.round(seen.size / frozen.length * 1000) / 10,
  note: 'Evidence verified does not mean the original operational goal succeeded'
}, null, 2));
