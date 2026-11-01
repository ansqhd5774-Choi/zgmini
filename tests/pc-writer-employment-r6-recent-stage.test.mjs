import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { localDatabase } from "../scripts/pc-writer/local-db.mjs";
import { stageEmploymentR6Recent, RECENT_GROUPS } from "../scripts/pc-writer/employment-r6-recent-stage.mjs";
import { createEmploymentR4ShadowStore } from "../lib/market-score/employment-r4-shadow-store.mjs";
import { createEmploymentR6Provider, parseBlsR6Rows, parseDolNationalClaimsXml } from "../lib/market-score/employment-r6-provider.mjs";
import { EMPLOYMENT_R4_CORE_STATES } from "../lib/market-score/employment-r4-shadow-contract.mjs";

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zgmini-r6-stage-"));
  const coreHome = path.join(dir, "approved", "storage");
  const outputDir = path.join(dir, "run");
  fs.mkdirSync(coreHome, { recursive: true });
  fs.mkdirSync(outputDir);
  const coreDbPath = path.join(coreHome, "core.sqlite");
  const db = localDatabase(coreDbPath);
  return { dir, coreDbPath, outputDir, db, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

function blsPayload(ids) {
  return {
    status: "REQUEST_SUCCEEDED",
    Results: { series: ids.map((seriesID, i) => ({
      seriesID,
      data: [
        { year: "2026", period: seriesID.startsWith("CI") ? "Q03" : "M09", value: String(50 + i), footnotes: [] },
        { year: "2026", period: seriesID.startsWith("CI") ? "Q02" : "M08", value: String(49 + i), footnotes: [] },
      ],
    })) },
  };
}

function claimsCsv() {
  const lines = ["st,rptdate,c1,c2,c3,c8"];
  for (const state of EMPLOYMENT_R4_CORE_STATES) lines.push(`${state},10/29/2026,1,10/24/2026,1000,9000`);
  return lines.join("\n");
}

function mockFetch() {
  const calls = [];
  const fetch = async (url, options = {}) => {
    calls.push(String(url));
    let body;
    if (String(url).includes("api.bls.gov")) body = JSON.stringify(blsPayload(JSON.parse(options.body).seriesid));
    else if (String(url).includes("report.asp")) body = `<?xml version="1.0"?><weeks>
      <week><weekEnded>10/24/2026</weekEnded><InitialClaims><SA>220000</SA><SA4WK>225000</SA4WK></InitialClaims>
      <ContinuedClaims><SA>1900000</SA></ContinuedClaims><IUR><SA>1.2</SA></IUR></week></weeks>`;
    else body = claimsCsv();
    return { ok: true, status: 200, headers: { get: () => "text/plain" }, text: async () => body };
  };
  return { fetch, calls };
}

test("empty BLS value or returned series with no valid rows remains missing, never zero", () => {
  const requestedSeriesIds = ["LNS14000000"];
  const parsed = parseBlsR6Rows({ Results: { series: [{ seriesID: "LNS14000000", data: [
    { year: "2026", period: "M09", value: "" }, { year: "2026", period: "M08", value: "N/A" },
  ] }] } }, {
    releaseGroup: "BLS_EMPLOYMENT_SITUATION", retrievedAt: "2026-11-01T00:00:00Z", requestedSeriesIds,
  });
  assert.equal(parsed.rows.length, 0);
  assert.deepEqual(parsed.missingSeries, requestedSeriesIds);
  const zero = parseBlsR6Rows({ Results: { series: [{ seriesID: "LNS14000000", data: [
    { year: "2026", period: "M09", value: "0" },
  ] }] } }, {
    releaseGroup: "BLS_EMPLOYMENT_SITUATION", retrievedAt: "2026-11-01T00:00:00Z", requestedSeriesIds,
  });
  assert.equal(zero.rows[0].value, 0);
  assert.deepEqual(zero.missingSeries, []);
});

test("DOL empty claim values are missing, not numeric zero", () => {
  const rows = parseDolNationalClaimsXml(`<week><weekEnded>10/24/2026</weekEnded>
    <InitialClaims><SA></SA><SA4WK/></InitialClaims><ContinuedClaims><SA> </SA></ContinuedClaims>
    <IUR><SA></SA></IUR></week>`, { retrievedAt: "2026-11-01T00:00:00Z" });
  assert.deepEqual(rows, []);
});

test("DOL national response with no four national claim rows is explicitly PARTIAL", async () => {
  const provider = createEmploymentR6Provider({
    now: () => new Date("2026-11-01T01:00:00Z"),
    fetchImpl: async url => ({
      ok: true, status: 200, headers: { get: () => "text/plain" },
      text: async () => String(url).includes("report.asp") ? "<empty/>" : claimsCsv(),
    }),
  });
  const result = await provider.fetchDolClaims({ currentYear: 2026 });
  assert.deepEqual(result.missingSeries.sort(), [
    "INITIAL_CLAIMS", "INITIAL_CLAIMS_4W", "CONTINUED_CLAIMS", "INSURED_UNEMPLOYMENT_RATE",
  ].sort());
  assert.ok(result.rows.length >= 51);
});

test("manual recent stage writes candidate only, retains core file and reports 18 source series", async t => {
  const f = fixture();
  t.after(f.cleanup);
  await createEmploymentR4ShadowStore(f.db).initialize();
  f.db.close();
  const beforeSize = fs.statSync(f.coreDbPath).size;
  const { fetch, calls } = mockFetch();
  const result = await stageEmploymentR6Recent({
    coreDbPath: f.coreDbPath, outputDir: f.outputDir,
    now: () => new Date("2026-11-01T10:00:00Z"), fetchImpl: fetch,
  });
  assert.deepEqual(RECENT_GROUPS, ["DOL_UI_WEEKLY_CLAIMS", "BLS_EMPLOYMENT_SITUATION", "BLS_JOLTS", "BLS_ECI"]);
  assert.equal(result.status, "CANDIDATE_SOURCE_ROWS_COLLECTED");
  assert.equal(result.baselineMissingSourceSeries.length, 18);
  assert.equal(result.stagedMissingSourceSeries, 18);
  assert.equal(result.stagedQuarterSourceSeries, 18);
  assert.equal(result.providerRequests, 5);
  assert.equal(calls.length, 5);
  assert.equal(fs.statSync(f.coreDbPath).size, beforeSize);
  const readOnly = new DatabaseSync(f.coreDbPath, { readOnly: true });
  assert.equal(readOnly.prepare("SELECT COUNT(*) n FROM market_score_employment_r4_shadow_current_v1").get().n, 0);
  readOnly.close();
  assert.ok(fs.existsSync(path.join(f.outputDir, "EMPLOYMENT_R6_CANDIDATE.sqlite")));
  assert.ok(fs.existsSync(path.join(f.outputDir, "EMPLOYMENT_R6_RECENT_STAGE_RESULT.txt")));
  assert.ok(fs.existsSync(path.join(f.outputDir, "EMPLOYMENT_R6_RECENT_STAGE_RESULT.json")));
  assert.equal(fs.existsSync(path.join(f.outputDir, "EMPLOYMENT_R6_RECENT_STAGE.lock")), false);

  const repeated = await stageEmploymentR6Recent({
    coreDbPath: f.coreDbPath, outputDir: f.outputDir,
    now: () => new Date("2026-11-01T10:02:00Z"),
    fetchImpl: () => { throw new Error("REPEAT_SHOULD_NOT_FETCH"); },
  });
  assert.equal(repeated.status, "CANDIDATE_SOURCE_ROWS_COLLECTED");
  assert.equal(repeated.providerRequests, 0);
  assert.equal(repeated.stagedMissingSourceSeries, 18);
  assert.deepEqual(fs.readdirSync(f.outputDir).sort(), [
    "EMPLOYMENT_R6_CANDIDATE.sqlite",
    "EMPLOYMENT_R6_RECENT_STAGE_RESULT.json",
    "EMPLOYMENT_R6_RECENT_STAGE_RESULT.txt",
  ]);
});

test("missing approved core DB blocks without creating replacement candidate", async t => {
  const f = fixture();
  t.after(f.cleanup);
  f.db.close();
  const result = await stageEmploymentR6Recent({
    coreDbPath: path.join(f.dir, "missing.sqlite"), outputDir: f.outputDir,
    now: () => new Date("2026-11-01T10:00:00Z"),
    fetchImpl: () => { throw new Error("SHOULD_NOT_FETCH"); },
  });
  assert.equal(result.status, "AUTOMATION_BLOCKED");
  assert.equal(result.error, "APPROVED_CORE_DB_NOT_FOUND");
  assert.equal(fs.existsSync(path.join(f.outputDir, "EMPLOYMENT_R6_CANDIDATE.sqlite")), false);
});

test("approved core database directory is never a candidate output directory", async t => {
  const f = fixture();
  t.after(f.cleanup);
  f.db.close();
  const result = await stageEmploymentR6Recent({
    coreDbPath: f.coreDbPath, outputDir: path.dirname(f.coreDbPath),
  });
  assert.equal(result.status, "AUTOMATION_BLOCKED");
  assert.equal(result.error, "OUTPUT_CANNOT_BE_PC_DATA_HOME");
  assert.equal(fs.existsSync(path.join(path.dirname(f.coreDbPath), "EMPLOYMENT_R6_CANDIDATE.sqlite")), false);
});
