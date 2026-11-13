import test from "node:test";
import assert from "node:assert/strict";

import { planEmploymentR6Collection, runEmploymentR6CollectionStep } from "../lib/market-score/employment-r6-collector.mjs";
import { createEmploymentR6Provider } from "../lib/market-score/employment-r6-provider.mjs";

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


test("DOL 600w ETA539 HTTP failure retains national claims and records a partial result", async () => {
  const NATIONAL = "<week><weekEnded>10/31/2026</weekEnded>"
    + "<InitialClaims><SA>189000</SA><SA4WK>195000</SA4WK></InitialClaims>"
    + "<ContinuedClaims><SA>1900000</SA></ContinuedClaims>"
    + "<IUR><SA>1.2</SA></IUR></week>";
  let fetches = 0;
  const provider = createEmploymentR6Provider({
    fetchImpl: async () => {
      fetches++;
      return fetches === 1
        ? new Response(NATIONAL, { status: 200 })
        : new Response("ETA539_UNAVAILABLE", { status: 503 });
    },
    now,
  });
  const fetched = await provider.fetchDolClaims({ mode: "BACKFILL", currentYear: 2026 });
  assert.equal(fetches, 2);
  assert.equal(fetched.requestCount, 2);
  assert.equal(fetched.snapshots.length, 1);
  assert.equal(fetched.rows.length, 4);
  assert.equal(fetched.rows.find(r => r.logicalSeriesId === "INITIAL_CLAIMS")?.value, 189000);
  assert.deepEqual(fetched.missingSeries, ["STATE_INITIAL_CLAIMS"]);
  assert.equal(fetched.partialFailureCode, "DOL_ETA539_SOURCE_FAILED");
  const runs = [], snapshots = [];
  const store = {
    async initialize() {},
    async getLatestRunInMode() { return null; },
    async acquire() { return { acquired: true }; },
    async release() { return true; },
    async writeRawSnapshot(snapshot) {
      snapshots.push(snapshot);
      return { snapshotId: snapshots.length, bodySha256: "synthetic", chunkCount: 1, noop: false };
    },
    async upsertObservationRows({ rows }) {
      assert.equal(rows.length, 4);
      return { inserted: 4, revised: 0, noop: 0, rejected: 0 };
    },
    async recordRun(run) { runs.push(run); return runs.length; },
  };
  const result = await runEmploymentR6CollectionStep({
    db, now, mode: "BACKFILL", groups: [dol],
    storeFactory: () => store,
    providerFactory: () => ({ async fetchGroup() { return fetched; } }),
  });
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.groupResults[0].failureCode, "DOL_ETA539_SOURCE_FAILED");
  assert.equal(runs[0].failureCode, "DOL_ETA539_SOURCE_FAILED");
  assert.equal(runs[0].detail.backfillWindowVersion, undefined);
  assert.equal(runs[0].detail.scoreComputed, false);
  assert.equal(snapshots.length, 1);
  assert.equal(result.publicOutput, false);
});

test("DOL RELEASE with an old initial-claims week is PARTIAL, never falsely SUCCESS", async () => {
  const runWithDate = async observationDate => {
    const runs = [];
    const store = {
      async initialize() {},
      async getLatestRun() { return null; },
      async acquire() { return { acquired: true }; },
      async release() { return true; },
      async upsertObservationRows({ rows }) {
        return { inserted: rows.length, revised: 0, noop: 0, rejected: 0 };
      },
      async recordRun(run) { runs.push(run); return runs.length; },
    };
    const ids = ["INITIAL_CLAIMS", "INITIAL_CLAIMS_4W", "CONTINUED_CLAIMS", "INSURED_UNEMPLOYMENT_RATE"];
    const result = await runEmploymentR6CollectionStep({
      db, mode: "RELEASE", groups: [dol],
      now: () => new Date("2026-11-06T00:00:00Z"),
      storeFactory: () => store,
      providerFactory: () => ({
        async fetchGroup() {
          return {
            rows: ids.map(logicalSeriesId => ({ logicalSeriesId, observationDate })),
            snapshots: [], requestCount: 2, missingSeries: [],
          };
        },
      }),
    });
    return { result, run: runs[0] };
  };
  const stale = await runWithDate("2026-10-10");
  assert.equal(stale.result.status, "PARTIAL");
  assert.equal(stale.result.groupResults[0].failureCode, "DOL_RELEASE_OBSERVATION_STALE");
  assert.equal(stale.run.detail.latestInitialClaimsObservationDate, "2026-10-10");
  const fresh = await runWithDate("2026-10-31");
  assert.equal(fresh.result.status, "SUCCESS");
  assert.equal(fresh.run.detail.latestInitialClaimsObservationDate, "2026-10-31");
  assert.equal(fresh.run.detail.releaseAt, "2026-11-05T13:30:00.000Z");
});

test("already-issued BLS calls are counted if storing a raw snapshot fails", async () => {
  const runs = [];
  const store = {
    async initialize() {},
    async getLatestRunInMode() { return null; },
    async getProviderRequestsSince() { return 0; },
    async acquire() { return { acquired: true }; },
    async release() { return true; },
    async writeRawSnapshot() { throw Error("SIMULATED_DB_WRITE_FAILURE"); },
    async recordRun(run) { runs.push(run); return runs.length; },
  };
  const result = await runEmploymentR6CollectionStep({
    db, now, mode: "BACKFILL", groups: ["BLS_JOLTS"],
    storeFactory: () => store,
    providerFactory: () => ({
      async fetchGroup() { return { requestCount: 2, rows: [], snapshots: [{body:"synthetic"}] }; },
    }),
  });
  assert.equal(result.status, "FAIL");
  assert.equal(result.providerRequests, 2);
  assert.equal(result.groupResults[0].providerRequests, 2);
  assert.equal(runs[0].providerRequests, 2);
  assert.equal(runs[0].failureCode, "SIMULATED_DB_WRITE_FAILURE");
});
