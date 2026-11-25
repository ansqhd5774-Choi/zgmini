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

// Frozen original 88 rows, independent of the two editable audit data files.
// Never regenerate this anchor from register/ledger during validation.
const FROZEN_COHORT_ANCHOR = "MI:1582,MR:1463,MR:1266,MR:1036,MR:1031,MR:933,MR:488,PI:3533,PI:3531,PI:3528,PI:3525,PI:3524,PI:3522,PI:3520,PI:3519,PI:3518,PI:3517,PI:3516,PI:3073,PI:2427,PI:2426,PI:2353,PI:2237,PI:2232,PI:2079,PI:2059,PI:2032,PI:1997,PI:1969,PI:1922,PI:1764,PI:1743,PI:1742,PI:1740,PI:1739,PI:1737,PI:1736,PI:1688,PI:1646,PI:1637,PI:1598,PI:1351,PI:1295,PI:1231,PI:1227,PI:1226,PI:1217,PI:1213,PI:1200,PI:1196,PI:1174,PI:1169,PI:1165,PI:1152,PI:1071,PI:1064,PI:1032,PI:1026,PI:1021,PI:1017,PI:1010,PI:1008,PI:1004,PI:1000,PI:996,PI:976,PI:965,PI:964,PI:946,PI:939,PI:936,PI:860,PI:835,PI:783,PI:702,PI:509,PI:503,PI:498,PI:496,PI:474,PI:473,PI:394,PI:369,PI:173,PI:155,PI:68,PR:3543,PR:3542";

const frozen = reg.frozenCohort;
assert.equal(frozen.length, 88, 'Fixed cohort length must stay 88');
const expectedRows = Array.from({length: 88}, (_, i) => i + 1);
assert.deepEqual(frozen.map(item => item.position), expectedRows, 'Frozen row ordering changed');
const ids = frozen.map(item => item.number);
assert.equal(new Set(ids).size, 88, 'Fixed cohort contains a repeated issue/PR number');
const kindCode = {'본체 Issue': 'MI', '본체 PR': 'MR', 'PC Issue': 'PI', 'PC PR': 'PR'};
const actualAnchor = frozen.map(item => kindCode[item.kind] + ':' + item.number).join(',');
assert.equal(actualAnchor, FROZEN_COHORT_ANCHOR,
  'Immutable initial 88-item cohort changed, even if register and Markdown agree');
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
