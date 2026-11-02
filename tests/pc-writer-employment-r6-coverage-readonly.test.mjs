import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import {
  auditEmploymentR6Database,
  formatCoverageSummary,
  saveCoverageReport,
} from "../scripts/pc-writer/employment-r6-coverage-readonly.mjs";
import { EMPLOYMENT_R6_FORMULA_HASH } from "../lib/market-score/employment-r6-formula.mjs";

const asOfDate = "2026-11-01";
const digest = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zgmini-r6-ro-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const dbPath = path.join(dir, "core.sqlite");
  const db = new DatabaseSync(dbPath);
  return { db, dbPath };
}

test("missing file is reported without being created", async t => {
  const { db, dbPath } = fixture(t);
  db.close();
  fs.unlinkSync(dbPath);
  await assert.rejects(auditEmploymentR6Database({ dbPath, asOfDate }), /DB_FILE_NOT_FOUND/);
  assert.equal(fs.existsSync(dbPath), false);
});

test("empty existing database reports missing tables as no evidence, not zero coverage", async t => {
  const { db, dbPath } = fixture(t);
  db.close();
  const before = digest(dbPath);
  const result = await auditEmploymentR6Database({ dbPath, asOfDate });
  assert.equal(result.summary.requiredFeatures, 29);
  assert.equal(result.summary.sourceSeriesWithCurrentRows, null);
  assert.equal(result.summary.formulaReferenceReadyFeatures, null);
  assert.equal(result.summary.verifiedScorePointsInOneYear, null);
  assert.equal(result.summary.oneYearMiniChartReadyFeatures, null);
  assert.equal(result.summary.oneYearMiniChartUnavailableFeatures, null);
  assert.equal(result.features.length, 29);
  assert.equal(result.features[0].historyReferenceStatus, "NO_PIT_TABLE_EVIDENCE");
  assert.equal(result.features[0].oneYearMiniChartStatus, "NO_PIT_TABLE_EVIDENCE");
  assert.equal(result.summary.oneYearChartDataCandidate, false);
  assert.equal(result.sourceGroupCoverage.length, 6);
  assert.equal(result.sourceGroupCoverage.reduce((n, group) => n + group.requiredSourceSeries, 0), 29);
  assert.ok(result.sourceGroupCoverage.every(group => group.sourceSeriesWithRows === null
    && group.sourceSeriesWithRecentQuarterRows === null && group.missingSourceSeries === null));
  assert.equal(result.providerRequestsMadeByAudit, 0);
  assert.equal(result.databaseWritesMadeByAudit, 0);
  assert.equal(digest(dbPath), before);
});

test("PIT history and stored READY dates are measured separately from raw sources", async t => {
  const { db, dbPath } = fixture(t);
  db.exec(`CREATE TABLE market_score_employment_r4_shadow_current_v1 (
    logical_series_id TEXT, observation_date TEXT, geography_code TEXT, retrieved_at TEXT
  );
  CREATE TABLE market_score_employment_r4_shadow_history_v1 (
    logical_series_id TEXT, observation_date TEXT, geography_code TEXT, geography_type TEXT,
    retrieved_at TEXT, available_at TEXT, value REAL, source_hash TEXT, history_id INTEGER
  );
  CREATE TABLE market_score_employment_r6_feature_history_v1 (
    feature_id TEXT, score_as_of TEXT, status TEXT
  );
  CREATE TABLE market_score_employment_r6_read_model_v1 (
    version_id TEXT, score_as_of TEXT, status TEXT, formula_hash TEXT, ready_at TEXT
  );
  CREATE TABLE market_score_employment_r6_read_pointer_v1 (
    pointer_key TEXT, version_id TEXT, updated_at TEXT
  );`);
  db.prepare(`INSERT INTO market_score_employment_r4_shadow_current_v1 VALUES (?, ?, ?, ?)`)
    .run("U3_UNEMPLOYMENT_RATE", "2026-10-31", "US", "2026-11-01T00:00:00.000Z");
  db.prepare(`INSERT INTO market_score_employment_r4_shadow_history_v1 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run("U3_UNEMPLOYMENT_RATE", "2026-10-31", "US", "NATIONAL", "2026-11-01T00:00:00.000Z", "2026-11-01T00:00:00.000Z", 4.3, "sha-test", 1);
  db.prepare(`INSERT INTO market_score_employment_r6_feature_history_v1 VALUES (?, ?, ?)`)
    .run("U3_UNEMPLOYMENT", "2026-10-31T00:00:00.000Z", "PARTIAL_HISTORY");
  for (const [i, date] of ["2026-07-15", "2026-10-01", "2026-10-29"].entries()) {
    db.prepare(`INSERT INTO market_score_employment_r6_read_model_v1 VALUES (?, ?, ?, ?, ?)`)
      .run(`model-${i}`, `${date}T00:00:00.000Z`, "READY", EMPLOYMENT_R6_FORMULA_HASH, `${date}T00:05:00.000Z`);
  }
  db.prepare(`INSERT INTO market_score_employment_r6_read_pointer_v1 VALUES (?, ?, ?)`)
    .run("CURRENT", "model-2", "2026-10-29T00:05:00.000Z");
  db.close();
  const before = digest(dbPath);

  const result = await auditEmploymentR6Database({ dbPath, asOfDate });
  assert.equal(result.summary.sourceSeriesWithCurrentRows, 1);
  assert.equal(result.summary.sourceSeriesWithHistoryRevisions, 1);
  assert.equal(result.summary.formulaReferenceReadyFeatures, 0);
  assert.equal(result.summary.formulaReferenceIncompleteFeatures, 29);
  assert.equal(result.summary.verifiedScorePointsInRecentQuarter, 2);
  assert.equal(result.summary.verifiedScorePointsInOneYear, 3);
  assert.equal(result.summary.oneYearChartDataCandidate, true);
  assert.equal(result.summary.oneYearMiniChartReadyFeatures, 0);
  assert.equal(result.summary.oneYearMiniChartPartialFeatures, 0);
  assert.equal(result.summary.oneYearMiniChartUnavailableFeatures, 29);
  assert.equal(result.summary.recentlyObservedMiniChartFeatures, 1);
  assert.equal(result.summary.actualPublicChartVerified, false);
  assert.equal(result.logicalSeries.find(x => x.id === "U3_UNEMPLOYMENT_RATE").recentQuarterObservationRows, 1);
  const employmentGroup = result.sourceGroupCoverage.find(group => group.groupName === "BLS_EMPLOYMENT_SITUATION");
  assert.equal(employmentGroup.sourceSeriesWithRows, 1);
  assert.equal(employmentGroup.sourceSeriesWithRecentQuarterRows, 1);
  assert.ok(!employmentGroup.missingSourceSeries.includes("U3_UNEMPLOYMENT_RATE"));
  assert.ok(employmentGroup.missingSourceSeries.includes("U6_UNEMPLOYMENT_RATE"));
  const bedGroup = result.sourceGroupCoverage.find(group => group.groupName === "BLS_BED");
  assert.equal(bedGroup.sourceSeriesWithRows, 0);
  assert.equal(bedGroup.publicationLagCaution, true);
  assert.equal(result.features.find(x => x.featureId === "U3_UNEMPLOYMENT").historyReferenceStatus, "PARTIAL_HISTORY");
  assert.equal(result.features.find(x => x.featureId === "U3_UNEMPLOYMENT").oneYearMiniChartStatus, "UNAVAILABLE");
  assert.equal(result.features.find(x => x.featureId === "U3_UNEMPLOYMENT").recentQuarterMiniChartPointCount, 1);
  assert.equal(result.features.find(x => x.featureId === "U3_UNEMPLOYMENT").recentQuarterStoredFeatureRows, 1);
  assert.equal(result.currentPointer.status, "READY");
  assert.equal(digest(dbPath), before);
});

test("per-feature 1Y mini-charts distinguish a recent READY source from historical PARTIAL", async t => {
  const { db, dbPath } = fixture(t);
  db.exec(`CREATE TABLE market_score_employment_r4_shadow_history_v1 (
    logical_series_id TEXT, observation_date TEXT, geography_code TEXT, geography_type TEXT,
    retrieved_at TEXT, available_at TEXT, value REAL, source_hash TEXT, history_id INTEGER
  );`);
  const insert = db.prepare(`INSERT INTO market_score_employment_r4_shadow_history_v1
    VALUES (?, ?, 'US', 'NATIONAL', ?, ?, ?, ?, ?)`);
  const rows = [
    ["U3_UNEMPLOYMENT_RATE", "2025-10-31", 4.9],
    ["U3_UNEMPLOYMENT_RATE", "2025-11-30", 4.8],
    ["U3_UNEMPLOYMENT_RATE", "2026-08-31", 4.5],
    ["U3_UNEMPLOYMENT_RATE", "2026-10-31", 4.3],
    ["U6_UNEMPLOYMENT_RATE", "2025-10-31", 8.1],
    ["U6_UNEMPLOYMENT_RATE", "2025-11-30", 8.0],
    ["U6_UNEMPLOYMENT_RATE", "2026-02-28", 7.9],
  ];
  for (const [i, [series, date, value]] of rows.entries()) {
    const seen = "2026-11-01T00:00:00.000Z";
    insert.run(series, date, seen, seen, value, `${series}:${date}`, i + 1);
  }
  db.close();
  const before = digest(dbPath);

  const report = await auditEmploymentR6Database({ dbPath, asOfDate });
  const u3 = report.features.find(x => x.featureId === "U3_UNEMPLOYMENT");
  const u6 = report.features.find(x => x.featureId === "U6_UNEMPLOYMENT");
  assert.equal(report.summary.oneYearMiniChartReadyFeatures, 1);
  assert.equal(report.summary.oneYearMiniChartPartialFeatures, 1);
  assert.equal(report.summary.oneYearMiniChartUnavailableFeatures, 27);
  assert.equal(report.summary.recentlyObservedMiniChartFeatures, 1);
  assert.equal(u3.oneYearMiniChartStatus, "READY");
  assert.equal(u3.oneYearMiniChartPointCount, 3);
  assert.equal(u3.recentQuarterMiniChartPointCount, 2);
  assert.equal(u6.oneYearMiniChartStatus, "PARTIAL");
  assert.equal(u6.oneYearMiniChartPointCount, 2);
  assert.equal(u6.recentQuarterMiniChartPointCount, 0);
  assert.equal(report.summary.actualPublicChartVerified, false);
  assert.equal(report.providerRequestsMadeByAudit, 0);
  assert.equal(report.databaseWritesMadeByAudit, 0);
  assert.equal(digest(dbPath), before);
});

test("invalid as-of date is rejected before opening the database", async t => {
  const { db, dbPath } = fixture(t);
  db.close();
  await assert.rejects(auditEmploymentR6Database({ dbPath, asOfDate: "2026-02-30" }), /AS_OF_INVALID_DATE/);
});

test("a single recent score point is insufficient to establish recent-quarter chart coverage", async t => {
  const { db, dbPath } = fixture(t);
  db.exec(`CREATE TABLE market_score_employment_r6_read_model_v1 (
    score_as_of TEXT, status TEXT, formula_hash TEXT, ready_at TEXT
  )`);
  db.prepare(`INSERT INTO market_score_employment_r6_read_model_v1 VALUES (?, ?, ?, ?)`)
    .run("2026-01-31T00:00:00.000Z", "READY", EMPLOYMENT_R6_FORMULA_HASH, "2026-01-31T00:01:00.000Z");
  db.prepare(`INSERT INTO market_score_employment_r6_read_model_v1 VALUES (?, ?, ?, ?)`)
    .run("2026-10-31T00:00:00.000Z", "READY", EMPLOYMENT_R6_FORMULA_HASH, "2026-10-31T00:01:00.000Z");
  db.close();
  const result = await auditEmploymentR6Database({ dbPath, asOfDate });
  assert.equal(result.summary.verifiedScorePointsInOneYear, 2);
  assert.equal(result.summary.verifiedScorePointsInRecentQuarter, 1);
  assert.equal(result.summary.oneYearChartDataCandidate, false);
});

test("audit requires an explicit source path; it never assumes an E: database", async () => {
  await assert.rejects(auditEmploymentR6Database({ asOfDate }), /DB_PATH_REQUIRED/);
  const source = fs.readFileSync(new URL("../scripts/pc-writer/employment-r6-coverage-readonly.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /E:\\\\ZGmini/);
});

test("Windows CMD launchers use main's Node resolver and ASCII CRLF without BOM", () => {
  const resolver = fs.readFileSync(new URL("../scripts/resolve-local-node.cmd", import.meta.url));
  const launcher = fs.readFileSync(new URL("../scripts/pc-writer/employment-r6-coverage-readonly.cmd", import.meta.url));
  for (const contents of [resolver, launcher]) {
    assert.equal(contents.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false);
    assert.ok([...contents].every(byte => byte <= 127), "CMD must be ASCII");
    assert.equal(/(?<!\r)\n/.test(contents.toString("ascii")), false, "CMD must have CRLF line endings");
  }
  assert.match(resolver.toString("ascii"), /Node\.js 24\+/);
  assert.match(launcher.toString("ascii"), /call "%~dp0\.\.\\resolve-local-node\.cmd"/);
  assert.match(launcher.toString("ascii"), /if defined ZGMINI_PC_HOME/);
  assert.match(launcher.toString("ascii"), /\.zgmini\\pc-writer\\storage\\core\.sqlite/);
  assert.match(launcher.toString("ascii"), /--output-dir "%~dp0\."/);
  assert.doesNotMatch(launcher.toString("ascii"), /schtasks|install-local|git pull|CREATE TABLE/i);
});

test("audit creates result TXT and JSON next to launcher without altering SQLite", async t => {
  const { db, dbPath } = fixture(t);
  db.close();
  const before = digest(dbPath);
  const report = await auditEmploymentR6Database({ dbPath, asOfDate });
  const output = saveCoverageReport({
    outputDir: path.dirname(dbPath), report, now: new Date("2026-11-01T12:30:05.123Z"),
  });
  assert.ok(fs.existsSync(output.textPath));
  assert.ok(fs.existsSync(output.jsonPath));
  const summary = fs.readFileSync(output.textPath, "utf8");
  assert.match(summary, /STATUS: AUDIT_COMPLETED/);
  assert.match(summary, /SOURCE_SERIES_WITH_ROWS: NO_RUNTIME_EVIDENCE/);
  assert.match(summary, /ONE_YEAR_RAW_MINICHART_READY_FEATURES: NO_RUNTIME_EVIDENCE/);
  assert.match(summary, /FEATURE STATUS \(29\)/);
  assert.match(summary, /SOURCE GROUP GAPS \(READ ONLY; NO COLLECTION\)/);
  assert.match(summary, /BLS_BED \| source=NO_RUNTIME_EVIDENCE/);
  assert.match(summary, /BED_PUBLICATION_LAG_CHECK_REQUIRED/);
  assert.match(summary, /mini_1y=NO_PIT_TABLE_EVIDENCE/);
  assert.equal((summary.match(/\d{2} \| /g) ?? []).length, 29);
  assert.match(formatCoverageSummary(report), /RECENT_QUARTER_READY_SCORE_DATES:/);
  const json = JSON.parse(fs.readFileSync(output.jsonPath, "utf8"));
  assert.equal(json.features.length, 29);
  assert.equal(digest(dbPath), before);
});

test("a blocked audit writes a readable failure log, even without a DB", t => {
  const { db, dbPath } = fixture(t);
  db.close();
  const output = saveCoverageReport({
    outputDir: path.dirname(dbPath), error: new Error("DB_FILE_NOT_FOUND"),
    now: new Date("2026-11-01T12:31:05.123Z"),
  });
  assert.match(fs.readFileSync(output.textPath, "utf8"), /STATUS: AUTOMATION_BLOCKED/);
  assert.match(fs.readFileSync(output.textPath, "utf8"), /DB_FILE_NOT_FOUND/);
  assert.equal(JSON.parse(fs.readFileSync(output.jsonPath, "utf8")).status, "AUTOMATION_BLOCKED");
});
