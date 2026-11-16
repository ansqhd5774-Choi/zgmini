import test from "node:test";
import assert from "node:assert/strict";
import { planEmploymentR6Collection, runEmploymentR6CollectionStep } from "../lib/market-score/employment-r6-collector.mjs";

const db = { prepare() { return {}; } };
const now = () => new Date("2026-11-16T12:00:00.000Z");
const groups = ["DOL_UI_WEEKLY_CLAIMS"];
const approval = Object.freeze({
  schema: "ZGMINI_R6_DOL_MANUAL_B_APPROVAL_V1",
  status: "APPROVED_B",
  scope: "EMPLOYMENT_R6_DOL_MANUAL_SQLITE_ONCE",
  mode: "ONE_YEAR",
  groupName: "DOL_UI_WEEKLY_CLAIMS",
  maxDolCalls: 2,
  requestId: "6ebd5330-9950-4fcf-94c3-64cf392e4ac2",
  approvalManifestSha256: "f".repeat(64),
});
function stored() {
  return {
    status: "PARTIAL",
    completed_at: "2026-11-16T10:14:15.554Z",
    detail_json: JSON.stringify({ mode: "ONE_YEAR" }),
  };
}
function fixture() {
  const calls = { latest: 0, provider: 0, records: [], locks: 0 };
  const store = {
    async initialize() {},
    async getLatestRunInMode(provider, mode) {
      calls.latest++;
      assert.equal(mode, "ONE_YEAR");
      return stored();
    },
    async acquire() {
      calls.locks++;
      return { acquired: true };
    },
    async release() { return true; },
    async writeRawSnapshot() { return { snapshotId: 1, bodySha256: "a".repeat(64), chunkCount: 1, noop: false }; },
    async upsertObservationRows() {
      return { inserted: 1, revised: 0, noop: 0, rejected: 0 };
    },
    async recordRun(data) { calls.records.push(data); return calls.records.length; },
  };
  const providerFactory = () => ({
    async fetchGroup(groupName) {
      calls.provider++;
      assert.equal(groupName, groups[0]);
      return {
        rows: [{ logicalSeriesId: "INITIAL_CLAIMS", observationDate: "2026-11-07" }],
        snapshots: [], requestCount: 2,
        missingSeries: ["INITIAL_CLAIMS_4W", "CONTINUED_CLAIMS", "INSURED_UNEMPLOYMENT_RATE"],
      };
    },
  });
  return { calls, storeFactory: () => store, providerFactory };
}
test("scheduled ONE_YEAR remains blocked after same-day PARTIAL, even after RELEASE", async () => {
  const f = fixture();
  const result = await runEmploymentR6CollectionStep({
    db, now, mode: "ONE_YEAR", groups, ...f,
  });
  assert.equal(result.status, "NOOP");
  assert.equal(result.providerRequests, 0);
  assert.equal(f.calls.latest, 1);
  assert.equal(f.calls.provider, 0);
  assert.equal(f.calls.locks, 0);
});
test("approved manual ONE_YEAR bypasses same-day guard but keeps group lock and SQLite history", async () => {
  const f = fixture();
  const result = await runEmploymentR6CollectionStep({
    db, now, mode: "ONE_YEAR", groups, ...f,
    executionIntent: "AUTHORIZED_MANUAL", manualApprovalEvidence: approval,
  });
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.providerRequests, 2);
  assert.equal(f.calls.latest, 0);
  assert.equal(f.calls.provider, 1);
  assert.equal(f.calls.locks, 1);
  assert.equal(f.calls.records.length, 1);
  assert.equal(f.calls.records[0].detail.mode, "ONE_YEAR");
  assert.equal(f.calls.records[0].status, "PARTIAL");
});
test("unauthorized and non-DOL manual options reject before any provider or DB effects", async () => {
  for (const args of [
    { executionIntent: "AUTHORIZED_MANUAL" },
    { executionIntent: "AUTHORIZED_MANUAL", manualApprovalEvidence: { ...approval, status: "PENDING" } },
    { executionIntent: "AUTHORIZED_MANUAL", manualApprovalEvidence: { ...approval, requestId: "bad" } },
    { executionIntent: "SCHEDULED", manualApprovalEvidence: approval },
    { executionIntent: "RETRY", manualApprovalEvidence: approval },
    { executionIntent: "AUTHORIZED_MANUAL", manualApprovalEvidence: approval, groups: ["BLS_JOLTS"] },
    { executionIntent: "AUTHORIZED_MANUAL", manualApprovalEvidence: approval, mode: "RELEASE" },
  ]) {
    const f = fixture();
    await assert.rejects(() => runEmploymentR6CollectionStep({
      db, now, mode: "ONE_YEAR", groups, ...f, ...args,
    }), /R6_MANUAL_COLLECTION_APPROVAL_REQUIRED/);
    assert.deepEqual([f.calls.provider, f.calls.locks, f.calls.records.length], [0,0,0]);
  }
});
test("direct collection planning also requires approved manual scope", async () => {
  await assert.rejects(() => planEmploymentR6Collection({
    db, now, mode: "ONE_YEAR", groups, executionIntent: "AUTHORIZED_MANUAL",
    storeFactory: () => { throw Error("STORE_MUST_NOT_INITIALIZE"); },
  }), /R6_MANUAL_COLLECTION_APPROVAL_REQUIRED/);
  const plan = await planEmploymentR6Collection({
    db, now, mode: "ONE_YEAR", groups,
    executionIntent: "AUTHORIZED_MANUAL", manualApprovalEvidence: approval,
    storeFactory: fixture().storeFactory,
  });
  assert.deepEqual(plan.map(x=>[x.status,x.due]), [["ONE_YEAR_APPROVED_MANUAL_DUE",true]]);
});
