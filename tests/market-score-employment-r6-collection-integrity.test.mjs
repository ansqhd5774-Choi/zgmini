import test from "node:test";
import assert from "node:assert/strict";

import { planEmploymentR6Collection, runEmploymentR6CollectionStep } from "../lib/market-score/employment-r6-collector.mjs";
import { createEmploymentR6Provider } from "../lib/market-score/employment-r6-provider.mjs";
import { createEmploymentR6Store } from "../lib/market-score/employment-r6-store.mjs";

const NATIONAL_CLAIMS_XML = "<week><weekEnded>10/31/2026</weekEnded>"
  + "<InitialClaims><SA>189000</SA><SA4WK>195000</SA4WK></InitialClaims>"
  + "<ContinuedClaims><SA>1900000</SA></ContinuedClaims>"
  + "<IUR><SA>1.2</SA></IUR></week>";

test("BACKFILL run history lookup uses persisted mode, not the latest RELEASE run", async () => {
  let select = null;
  const db = {
    prepare(sql) {
      return {
        bind(...values) {
          select = { sql, values };
          return {
            first: async () => ({ status: "SUCCESS", detail_json: '{"mode":"BACKFILL","backfillYear":2026}' }),
          };
        },
        run: async () => ({}),
      };
    },
  };
  const store = createEmploymentR6Store(db, {
    r4StoreFactory: () => ({ initialize: async () => {} }),
  });
  const run = await store.getLatestRunInMode("EMPLOYMENT_R6_BLS_JOLTS", "BACKFILL");
  assert.equal(run.status, "SUCCESS");
  assert.match(select.sql, /json_extract\(detail_json,'\$\.mode'\)=\?/);
  assert.deepEqual(select.values, ["EMPLOYMENT_R6_BLS_JOLTS", "BACKFILL"]);
});

test("BACKFILL planner skips completed groups despite later RELEASE runs and bounds retries", async () => {
  const previous = {
    BLS_EMPLOYMENT_SITUATION: {
      status: "SUCCESS", completed_at: "2026-11-08T01:00:00.000Z",
      detail_json: JSON.stringify({ mode: "BACKFILL", backfillYear: 2026 }),
    },
    BLS_JOLTS: {
      status: "PARTIAL", completed_at: "2026-11-09T01:00:00.000Z",
      detail_json: JSON.stringify({ mode: "BACKFILL", backfillYear: 2026 }),
    },
  };
  const requestedModes = [];
  const store = {
    async initialize() {},
    async getLatestRunInMode(provider, mode) {
      requestedModes.push(mode);
      return previous[provider.replace("EMPLOYMENT_R6_", "")] ?? null;
    },
  };
  const plan = await planEmploymentR6Collection({
    db: { prepare() { return {}; } },
    now: () => new Date("2026-11-09T12:00:00.000Z"), mode: "BACKFILL",
    groups: ["BLS_EMPLOYMENT_SITUATION", "BLS_JOLTS", "BLS_ECI"],
    storeFactory: () => store,
  });
  assert.deepEqual(plan.map(x => [x.groupName, x.due, x.status]), [
    ["BLS_EMPLOYMENT_SITUATION", false, "BACKFILL_ALREADY_COMPLETE"],
    ["BLS_JOLTS", false, "BACKFILL_ALREADY_ATTEMPTED_TODAY"],
    ["BLS_ECI", true, "BACKFILL_DUE"],
  ]);
  assert.deepEqual(requestedModes, ["BACKFILL", "BACKFILL", "BACKFILL"]);

  const retryPlan = await planEmploymentR6Collection({
    db: { prepare() { return {}; } },
    now: () => new Date("2026-11-10T12:00:00.000Z"), mode: "BACKFILL",
    groups: ["BLS_JOLTS"], storeFactory: () => store,
  });
  assert.equal(retryPlan[0].status, "BACKFILL_RETRY_DUE");
  assert.equal(retryPlan[0].due, true);
});

test("BACKFILL does not call BLS provider when remaining R6 quota is insufficient", async () => {
  let providerCalls = 0;
  const store = {
    async initialize() {},
    async getLatestRunInMode() { return null; },
    async getProviderRequestsSince() { return 24; },
  };
  const run = await runEmploymentR6CollectionStep({
    db: { prepare() { return {}; } },
    mode: "BACKFILL", groups: ["BLS_JOLTS"],
    now: () => new Date("2026-11-09T12:00:00.000Z"),
    storeFactory: () => store,
    providerFactory: () => ({ async fetchGroup() { providerCalls++; throw Error("MUST_NOT_FETCH"); } }),
  });
  assert.equal(run.status, "NOOP");
  assert.equal(run.providerRequests, 0);
  assert.equal(providerCalls, 0);
  assert.equal(run.groupResults[0].status, "SKIPPED_BLS_BUDGET");
  assert.equal(run.groupResults[0].usedBlsRequests24h, 24);
  assert.equal(run.groupResults[0].expectedRequests, 2);
});

test("BLS shared quota stop is preserved as a bounded group/run failure code", async () => {
  const runCase = async (reason, provider = "BLS") => {
    const runs = [];
    const store = {
      async initialize() {},
      async getLatestRunInMode() { return null; },
      async getProviderRequestsSince() { return 0; },
      async acquire() { return { acquired: true }; },
      async release() { return true; },
      async recordRun(run) { runs.push(run); return 1; },
    };
    const result = await runEmploymentR6CollectionStep({
      db: { prepare() { return {}; } },
      mode: "BACKFILL", groups: ["BLS_JOLTS"],
      now: () => new Date("2026-11-09T12:00:00.000Z"),
      storeFactory: () => store,
      providerFactory: () => ({
        async fetchGroup() {
          throw Object.assign(Error("PROVIDER_QUOTA_GUARD"), {
            code: "PROVIDER_QUOTA_GUARD", provider, reason,
          });
        },
      }),
    });
    return { result, runs };
  };
  const accepted = await runCase("BLS_UNREG_25_PER_24H_STOP");
  assert.equal(accepted.result.status, "FAIL");
  assert.equal(accepted.result.providerRequests, 0);
  assert.equal(accepted.result.groupResults[0].failureCode, "BLS_UNREG_25_PER_24H_STOP");
  assert.equal(accepted.runs[0].failureCode, "BLS_UNREG_25_PER_24H_STOP");
  const rejected = await runCase("BLS_UNREG_UNSAFE/secret");
  assert.equal(rejected.result.groupResults[0].failureCode, "PROVIDER_QUOTA_GUARD");
  assert.equal(rejected.runs[0].failureCode, "PROVIDER_QUOTA_GUARD");
  const otherProvider = await runCase("BLS_UNREG_25_PER_24H_STOP", "OTHER");
  assert.equal(otherProvider.result.groupResults[0].failureCode, "PROVIDER_QUOTA_GUARD");
});

test("real BLS and BED providers exclude pre-network quota refusals from physical requests", async () => {
  const now = () => new Date("2026-11-09T12:00:00.000Z");
  const quotaStop = () => Object.assign(Error("PROVIDER_QUOTA_GUARD"), {
    code: "PROVIDER_QUOTA_GUARD", provider: "BLS",
    reason: "BLS_UNREG_25_PER_24H_STOP",
  });
  const blocked = createEmploymentR6Provider({
    now, fetchImpl: async () => { throw quotaStop(); },
  });
  await assert.rejects(
    () => blocked.fetchBlsGroup("BLS_JOLTS", { mode: "BACKFILL", currentYear: 2026 }),
    error => error.code === "PROVIDER_QUOTA_GUARD" && error.requestCount === 0,
  );
  await assert.rejects(
    () => blocked.fetchBed({ mode: "BACKFILL", currentYear: 2026 }),
    error => error.code === "PROVIDER_QUOTA_GUARD" && error.requestCount === 0,
  );

  let fetchCalls = 0;
  const partlySent = createEmploymentR6Provider({
    now,
    fetchImpl: async () => {
      fetchCalls++;
      if (fetchCalls === 1) {
        return new Response(JSON.stringify({ status: "REQUEST_SUCCEEDED", Results: { series: [] } }), {
          status: 200, headers: { "content-type": "application/json" },
        });
      }
      throw quotaStop();
    },
  });
  await assert.rejects(
    () => partlySent.fetchBlsGroup("BLS_JOLTS", { mode: "BACKFILL", currentYear: 2026 }),
    error => error.requestCount === 1,
  );
  assert.equal(fetchCalls, 2);

  const uncertainNetwork = createEmploymentR6Provider({
    now,
    fetchImpl: async () => {
      const error = quotaStop();
      error.requestReserved = true;
      throw error;
    },
  });
  await assert.rejects(
    () => uncertainNetwork.fetchBlsGroup("BLS_JOLTS", { mode: "BACKFILL", currentYear: 2026 }),
    error => error.requestCount === 1,
  );
});

test("provider calls remain counted when a later raw snapshot DB write fails", async () => {
  const runs = [];
  const store = {
    async initialize() {},
    async getLatestRunInMode() { return null; },
    async acquire() { return { acquired: true }; },
    async release() { return true; },
    async getProviderRequestsSince() { return 0; },
    async writeRawSnapshot() { throw Error("SIMULATED_LOCAL_DB_WRITE_STOP"); },
    async recordRun(run) { runs.push(run); return 1; },
  };
  const result = await runEmploymentR6CollectionStep({
    db: { prepare() { return {}; } },
    mode: "BACKFILL", groups: ["BLS_JOLTS"],
    now: () => new Date("2026-11-09T12:00:00.000Z"),
    storeFactory: () => store,
    providerFactory: () => ({
      async fetchGroup() { return { requestCount: 2, rows: [], snapshots: [{ body: "test" }] }; },
    }),
  });
  assert.equal(result.status, "FAIL");
  assert.equal(result.providerRequests, 2);
  assert.equal(result.groupResults[0].providerRequests, 2);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].providerRequests, 2);
  assert.equal(runs[0].failureCode, "SIMULATED_LOCAL_DB_WRITE_STOP");
});

test("DOL ETA-539 failure preserves valid national claims as a partial group", async () => {
  const fetchedUrls = [];
  const provider = createEmploymentR6Provider({
    fetchImpl: async url => {
      fetchedUrls.push(url);
      if (fetchedUrls.length === 1) {
        return new Response(NATIONAL_CLAIMS_XML, { status: 200 });
      }
      throw Object.assign(Error("SIMULATED_ETA539_UNAVAILABLE"), { code: "SIMULATED_ETA539_UNAVAILABLE" });
    },
    now: () => new Date("2026-11-09T00:00:00.000Z"),
  });
  const fetched = await provider.fetchDolClaims({ mode: "BACKFILL", currentYear: 2026 });
  assert.equal(fetchedUrls.length, 2);
  assert.equal(fetched.requestCount, 2);
  assert.equal(fetched.rows.length, 4);
  assert.equal(fetched.rows.find(x => x.logicalSeriesId === "INITIAL_CLAIMS")?.value, 189000);
  assert.equal(fetched.snapshots.length, 1);
  assert.match(fetched.snapshots[0].requestKey, /^DOL_NATIONAL:/);
  assert.deepEqual(fetched.missingSeries, ["STATE_INITIAL_CLAIMS"]);
  assert.equal(fetched.partialFailureCode, "DOL_ETA539_SOURCE_FAILED");

  const runs = [], savedSnapshots = [], savedRows = [];
  const store = {
    async initialize() {},
    async acquire() { return { acquired: true }; },
    async release() { return true; },
    async writeRawSnapshot(snapshot) {
      savedSnapshots.push(snapshot);
      return { snapshotId: savedSnapshots.length, bodySha256: "test", chunkCount: 1, noop: false };
    },
    async upsertObservationRows({ rows }) {
      savedRows.push(...rows);
      return { inserted: rows.length, revised: 0, noop: 0, rejected: 0 };
    },
    async recordRun(run) { runs.push(run); return 45; },
  };
  const result = await runEmploymentR6CollectionStep({
    db: { prepare() { return {}; } },
    mode: "BACKFILL",
    groups: ["DOL_UI_WEEKLY_CLAIMS"],
    now: () => new Date("2026-11-09T00:00:00.000Z"),
    storeFactory: () => store,
    providerFactory: () => ({ async fetchGroup() { return fetched; } }),
  });
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.groupResults[0].failureCode, "DOL_ETA539_SOURCE_FAILED");
  assert.equal(runs[0].failureCode, "DOL_ETA539_SOURCE_FAILED");
  assert.equal(savedSnapshots.length, 1);
  assert.equal(savedRows.length, 4);
});

test("DOL national fetch failure remains FAIL without a state-only success", async () => {
  let requested = 0;
  const provider = createEmploymentR6Provider({
    fetchImpl: async () => { requested++; return new Response("", { status: 503 }); },
    now: () => new Date("2026-11-09T00:00:00.000Z"),
  });
  await assert.rejects(() => provider.fetchDolClaims({ mode: "BACKFILL", currentYear: 2026 }),
    error => error.message.includes("HTTP_503") && error.requestCount === 1);
  assert.equal(requested, 1);
});

test("a syntactically successful provider response with zero rows is PARTIAL, never a completed release", async () => {
  const runs = [];
  const store = {
    async initialize() {},
    async acquire() { return { acquired: true }; },
    async release() { return true; },
    async upsertObservationRows({ rows }) {
      assert.deepEqual(rows, []);
      return { inserted: 0, revised: 0, noop: 0, rejected: 0 };
    },
    async recordRun(run) { runs.push(run); return 42; },
  };
  const result = await runEmploymentR6CollectionStep({
    db: { prepare() { return {}; } },
    mode: "BACKFILL",
    groups: ["DOL_UI_WEEKLY_CLAIMS"],
    now: () => new Date("2026-11-02T00:00:00Z"),
    storeFactory: () => store,
    providerFactory: () => ({
      async fetchGroup() { return { rows: [], snapshots: [], requestCount: 2, missingSeries: [] }; },
    }),
  });
  assert.equal(result.status, "PARTIAL");
  assert.equal(result.groupResults[0].status, "PARTIAL");
  assert.equal(result.groupResults[0].failureCode, "NO_OBSERVATIONS");
  assert.equal(result.groupResults[0].collectedRows, 0);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].status, "PARTIAL");
  assert.equal(runs[0].failureCode, "NO_OBSERVATIONS");
  assert.equal(runs[0].detail.publicOutput, false);
});


test("DOL release never records stale initial-claims observations as SUCCESS", async () => {
  const runWithDate = async observationDate => {
    const runs = [];
    const store = {
      async initialize() {},
      async getLatestRun() { return null; },
      async acquire() { return { acquired: true }; },
      async release() { return true; },
      async upsertObservationRows({ rows }) { return { inserted: rows.length, revised: 0, noop: 0, rejected: 0 }; },
      async recordRun(run) { runs.push(run); return 43; },
    };
    const ids = ["INITIAL_CLAIMS", "INITIAL_CLAIMS_4W", "CONTINUED_CLAIMS", "INSURED_UNEMPLOYMENT_RATE"];
    const result = await runEmploymentR6CollectionStep({
      db: { prepare() { return {}; } },
      mode: "RELEASE",
      groups: ["DOL_UI_WEEKLY_CLAIMS"],
      now: () => new Date("2026-11-06T00:00:00Z"),
      storeFactory: () => store,
      providerFactory: () => ({
        async fetchGroup() { return { rows: ids.map(logicalSeriesId => ({ logicalSeriesId, observationDate })), snapshots: [], requestCount: 2, missingSeries: [] }; },
      }),
    });
    return { result, run: runs[0] };
  };
  const stale = await runWithDate("2026-10-10");
  assert.equal(stale.result.groupResults[0].status, "PARTIAL");
  assert.equal(stale.result.groupResults[0].failureCode, "DOL_RELEASE_OBSERVATION_STALE");
  assert.equal(stale.run.failureCode, "DOL_RELEASE_OBSERVATION_STALE");
  assert.equal(stale.run.detail.latestInitialClaimsObservationDate, "2026-10-10");
  const current = await runWithDate("2026-10-31");
  assert.equal(current.result.groupResults[0].status, "SUCCESS");
  assert.equal(current.run.detail.latestInitialClaimsObservationDate, "2026-10-31");
  assert.equal(current.run.detail.releaseAt, "2026-11-05T13:30:00.000Z");
});

