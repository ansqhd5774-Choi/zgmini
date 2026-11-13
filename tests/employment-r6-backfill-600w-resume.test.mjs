import test from "node:test";
import assert from "node:assert/strict";

import { planEmploymentR6Collection, runEmploymentR6CollectionStep } from "../lib/market-score/employment-r6-collector.mjs";

const now = () => new Date("2026-11-14T08:00:00.000Z");
const db = { prepare() { return {}; } };
const dol = "DOL_UI_WEEKLY_CLAIMS";
const latest = (status, date, extra = {}) => ({
  status, completed_at: date,
  detail_json: JSON.stringify({ mode: "BACKFILL", backfillYear: 2026, ...extra }),
});

async function plan(previous, groupName = dol) {
  const store = {
    async initialize() {},
    async getLatestRunInMode(provider, mode) {
      assert.equal(provider, `EMPLOYMENT_R6_${groupName}`);
      assert.equal(mode, "BACKFILL");
      return previous;
    },
    // A newer RELEASE is irrelevant to the last BACKFILL.
    async getLatestRun() { throw Error("MUST_USE_LATEST_RUN_IN_MODE"); },
  };
  const [result] = await planEmploymentR6Collection({
    db, now, mode: "BACKFILL", groups: [groupName], storeFactory: () => store,
  });
  return result;
}

test("DOL: no previous backfill is due", async () => {
  const x = await plan(null);
  assert.equal(x.due, true);
  assert.equal(x.status, "BACKFILL_DUE");
});

test("DOL: previous success with unknown or old 530-week window must refresh", async () => {
  const x = await plan(latest("SUCCESS", "2026-11-13T01:00:00Z"));
  assert.equal(x.due, true);
  assert.equal(x.status, "BACKFILL_WINDOW_REFRESH_DUE");
});

test("DOL: 600-week SUCCESS from prior day is not collected again", async () => {
  const x = await plan(latest("SUCCESS", "2026-11-13T01:00:00Z", {
    backfillWindowVersion: "DOL_ETA539_600_WEEKS_V1",
  }));
  assert.equal(x.due, false);
  assert.equal(x.status, "BACKFILL_ALREADY_COMPLETE");
});

test("DOL: previous partial earlier today must not silently rerun", async () => {
  const x = await plan(latest("PARTIAL", "2026-11-14T01:00:00Z"));
  assert.equal(x.due, false);
  assert.equal(x.status, "BACKFILL_ALREADY_ATTEMPTED_TODAY");
});

test("DOL: old successful 530-week request today must not cause an extra same-day call", async () => {
  const x = await plan(latest("SUCCESS", "2026-11-14T01:00:00Z"));
  assert.equal(x.due, false);
  assert.equal(x.status, "BACKFILL_ALREADY_ATTEMPTED_TODAY");
});

test("BLS: previous backfill SUCCESS is unaffected by the new DOL window version", async () => {
  const x = await plan(latest("SUCCESS", "2026-11-13T01:00:00Z"), "BLS_JOLTS");
  assert.equal(x.due, false);
  assert.equal(x.status, "BACKFILL_ALREADY_COMPLETE");
});

test("DOL: successful 600-week snapshot records request-window version, not data completeness", async () => {
  const runs = [];
  const store = {
    async initialize() {},
    async getLatestRunInMode() { return null; },
    async acquire() { return { acquired: true }; },
    async release() { return true; },
    async writeRawSnapshot() {
      return { snapshotId: 1, bodySha256: "synthetic", chunkCount: 1, noop: false };
    },
    async upsertObservationRows() {
      return { inserted: 1, revised: 0, noop: 0, rejected: 0, changedSeriesIds: [] };
    },
    async recordRun(x) { runs.push(x); return runs.length; },
  };
  const result = await runEmploymentR6CollectionStep({
    db, now, mode: "BACKFILL", groups: [dol],
    storeFactory: () => store,
    providerFactory: () => ({
      async fetchGroup() {
        return {
          rows: [{ logicalSeriesId: "STATE_INITIAL_CLAIMS", observationDate: "2026-11-07", value: 1 }],
          snapshots: [{ requestKey: "DOL_ETA539:600w", detail: { historyWeeks: 600 } }],
          requestCount: 2,
          missingSeries: [],
        };
      },
    }),
  });
  assert.equal(result.status, "SUCCESS");
  assert.equal(runs.length, 1);
  assert.equal(runs[0].detail.backfillWindowVersion, "DOL_ETA539_600_WEEKS_V1");
  assert.equal(runs[0].detail.backfillYear, 2026);
  assert.equal(runs[0].detail.scoreComputed, false);
  assert.equal(result.publicOutput, false);
});
