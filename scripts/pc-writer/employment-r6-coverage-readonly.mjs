#!/usr/bin/env node
// R6 data evidence only. No provider calls, schema initialization, writes, or scoring persistence.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";

import {
  EMPLOYMENT_R6_FEATURES,
  EMPLOYMENT_R6_FORMULA_HASH,
  EMPLOYMENT_R6_REQUIRED_LOGICAL_SERIES,
} from "../../lib/market-score/employment-r6-formula.mjs";
import { computeAllFeaturePoints } from "../../lib/market-score/employment-r6-feature-engine.mjs";
import { createEmploymentR6ObservationReader } from "../../lib/market-score/employment-r6-observation-reader.mjs";
import { buildEmploymentR6OneYearReadModel } from "../../lib/market-score/employment-r6-one-year-read-model.mjs";
import {
  EMPLOYMENT_R6_BLS_SERIES,
  EMPLOYMENT_R6_GROUPS,
  EMPLOYMENT_R6_TABLES,
} from "../../lib/market-score/employment-r6-contract.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;
const SERIES = EMPLOYMENT_R6_REQUIRED_LOGICAL_SERIES;
const TABLES = EMPLOYMENT_R6_TABLES;
const DOL_SERIES = new Set([
  "INITIAL_CLAIMS", "INITIAL_CLAIMS_4W", "CONTINUED_CLAIMS",
  "INSURED_UNEMPLOYMENT_RATE", "STATE_INITIAL_CLAIMS",
]);

// Read-only routing evidence, not permission to fetch, backfill, or publish.
const GROUP_FOR_SOURCE = new Map();
for (const [groupName, group] of Object.entries(EMPLOYMENT_R6_GROUPS)) {
  if (group.kind !== "BLS") continue;
  for (const seriesId of group.seriesIds ?? []) {
    const logical = EMPLOYMENT_R6_BLS_SERIES[seriesId]?.logicalSeriesId;
    if (logical && SERIES.includes(logical)) GROUP_FOR_SOURCE.set(logical, groupName);
  }
}
for (const source of SERIES) {
  if (DOL_SERIES.has(source)) GROUP_FOR_SOURCE.set(source, "DOL_UI_WEEKLY_CLAIMS");
  if (source.startsWith("BED_")) GROUP_FOR_SOURCE.set(source, "BLS_BED");
}
if (SERIES.some(source => !GROUP_FOR_SOURCE.has(source))) {
  throw new Error("EMPLOYMENT_R6_SOURCE_GROUP_UNMAPPED");
}

function sourceGroupCoverage(logicalSeries, features, { currentTableExists } = {}) {
  return Object.keys(EMPLOYMENT_R6_GROUPS).map(groupName => {
    const sources = logicalSeries.filter(row => GROUP_FOR_SOURCE.get(row.id) === groupName);
    const sourceIds = new Set(sources.map(row => row.id));
    const dependentFeatures = features.filter(row => row.sourceSeries.some(id => sourceIds.has(id)));
    const missing = currentTableExists ? sources.filter(row => row.currentRows === 0).map(row => row.id) : null;
    return {
      groupName,
      requiredSourceSeries: sources.length,
      sourceSeriesWithRows: currentTableExists ? sources.filter(row => row.currentRows > 0).length : null,
      missingSourceSeries: missing,
      sourceSeriesWithRecentQuarterRows: currentTableExists
        ? sources.filter(row => row.recentQuarterObservationRows > 0).length : null,
      dependentFeatures: dependentFeatures.length,
      oneYearChartNotReadyFeatures: dependentFeatures.filter(row => row.oneYearMiniChartStatus !== "READY")
        .map(row => row.featureId),
      // A BED observation may be months old on its actual publication day.
      publicationLagCaution: groupName === "BLS_BED",
    };
  });
}

function parseAsOf(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) throw new TypeError("AS_OF_EXPECTED_YYYY_MM_DD");
  const t = Date.parse(`${date}T23:59:59.999Z`);
  if (!Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== date) {
    throw new TypeError("AS_OF_INVALID_DATE");
  }
  return t;
}

const isoDate = t => new Date(t).toISOString().slice(0, 10);
const byId = rows => new Map(rows.map(row => [row.logical_series_id ?? row.feature_id, row]));

function knownTables(db) {
  return new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name));
}

function sourceCoverage(db, table, asOfDate, quarterStart) {
  const placeholders = SERIES.map(() => "?").join(",");
  return byId(db.prepare(`SELECT logical_series_id,
    COUNT(*) AS stored_rows, COUNT(DISTINCT observation_date) AS distinct_dates,
    COUNT(DISTINCT geography_code) AS geography_count,
    MIN(observation_date) AS first_observation,
    MAX(observation_date) AS last_observation,
    MAX(retrieved_at) AS last_retrieved_at,
    SUM(CASE WHEN observation_date>=? THEN 1 ELSE 0 END) AS quarter_observation_rows
    FROM ${table} WHERE logical_series_id IN (${placeholders}) AND observation_date<=?
    GROUP BY logical_series_id`).all(quarterStart, ...SERIES, asOfDate));
}

function featureSnapshots(db, asOf, quarterStart) {
  const rows = db.prepare(`SELECT feature_id,
    COUNT(*) AS stored_rows,
    MAX(score_as_of) AS last_score_as_of,
    SUM(CASE WHEN score_as_of>=? AND score_as_of<=? THEN 1 ELSE 0 END) AS quarter_rows,
    SUM(CASE WHEN status='READY' AND score_as_of>=? AND score_as_of<=? THEN 1 ELSE 0 END) AS quarter_ready_rows
    FROM ${TABLES.featureHistory}
    WHERE score_as_of<=? GROUP BY feature_id`).all(
      quarterStart, asOf, quarterStart, asOf, asOf,
    );
  return byId(rows);
}

function storedModels(db, asOf, quarterStart, yearStart) {
  const rows = db.prepare(`SELECT score_as_of, status, formula_hash, ready_at
    FROM ${TABLES.readModel} WHERE score_as_of<=? ORDER BY score_as_of DESC`).all(asOf);
  const matching = rows.filter(r => r.formula_hash === EMPLOYMENT_R6_FORMULA_HASH);
  const ready = matching.filter(r => r.status === "READY");
  const year = ready.filter(r => r.score_as_of >= yearStart);
  const quarter = ready.filter(r => r.score_as_of >= quarterStart);
  const dates = items => [...new Set(items.map(r => String(r.score_as_of).slice(0, 10)))].sort();
  const yearDates = dates(year);
  const quarterDates = dates(quarter);
  return {
    totalVersions: rows.length,
    matchingFormulaVersions: matching.length,
    statusCounts: Object.fromEntries(["READY", "PRECOMPUTED", "PARTIAL"].map(status => [
      status, matching.filter(r => r.status === status).length,
    ])),
    latestReadyAsOf: ready[0]?.score_as_of ?? null,
    readyDatesInYear: yearDates,
    readyDatesInQuarter: quarterDates,
    oneYearStoredPointCount: yearDates.length,
    recentQuarterStoredPointCount: quarterDates.length,
    chartStoredDataCandidate: yearDates.length >= 2 && quarterDates.length >= 2,
    publicChartWiringVerified: false,
  };
}

function activePointer(db, tables) {
  if (!tables.has(TABLES.readPointer) || !tables.has(TABLES.readModel)) return null;
  return db.prepare(`SELECT m.score_as_of, m.status, m.formula_hash, p.updated_at
    FROM ${TABLES.readPointer} p LEFT JOIN ${TABLES.readModel} m ON m.version_id=p.version_id
    WHERE p.pointer_key='CURRENT' LIMIT 1`).get() ?? null;
}

/** Audit an existing PC SQLite file. This function never creates or modifies it. */
export async function auditEmploymentR6Database({ dbPath, asOfDate = isoDate(Date.now()) } = {}) {
  if (typeof dbPath !== "string" || !dbPath.trim()) throw new TypeError("DB_PATH_REQUIRED");
  const asOfTime = parseAsOf(asOfDate);
  const quarterStart = isoDate(asOfTime - 92 * DAY_MS);
  const yearStart = isoDate(asOfTime - 365 * DAY_MS);
  if (!fs.existsSync(dbPath) || !fs.statSync(dbPath).isFile()) throw new Error("DB_FILE_NOT_FOUND");

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const tables = knownTables(db);
    const currentFound = tables.has(TABLES.observationCurrent);
    const historyFound = tables.has(TABLES.observationHistory);
    const current = currentFound ? sourceCoverage(db, TABLES.observationCurrent, asOfDate, quarterStart) : new Map();
    const history = historyFound ? sourceCoverage(db, TABLES.observationHistory, asOfDate, quarterStart) : new Map();
    const snapshots = tables.has(TABLES.featureHistory)
      ? featureSnapshots(db, `${asOfDate}T23:59:59.999Z`, quarterStart)
      : new Map();

    // The production R6 reader selects revisions known as of the requested date.
    // The regular store.initialize() is intentionally NOT called: it performs writes.
    const observations = historyFound
      ? await createEmploymentR6ObservationReader({
          prepare: sql => ({ bind: (...params) => ({ all: async () => ({ results: db.prepare(sql).all(...params) }) }) }),
        }).loadAsOf(`${asOfDate}T23:59:59.999Z`)
      : null;
    const computed = observations === null ? null : byId(
      computeAllFeaturePoints(observations).map(r => ({ ...r, feature_id: r.featureId })),
    );
    // The public 1Y mini-chart is derived from the feature's stored raw PIT
    // observations, not from READY score-model dates. This audit does not publish.
    const miniChart = observations === null ? null
      : buildEmploymentR6OneYearReadModel(observations, { asOfDate });
    const miniChartById = new Map((miniChart?.indicators ?? []).map(item => [item.id, item]));

    const logicalSeries = SERIES.map(id => {
      const cur = current.get(id);
      const hist = history.get(id);
      return {
        id,
        currentRows: cur?.stored_rows ?? (currentFound ? 0 : null),
        historyRevisions: hist?.stored_rows ?? (historyFound ? 0 : null),
        currentDistinctDates: cur?.distinct_dates ?? (currentFound ? 0 : null),
        currentGeographies: cur?.geography_count ?? (currentFound ? 0 : null),
        firstObservation: cur?.first_observation ?? null,
        latestObservation: cur?.last_observation ?? null,
        latestRetrievedAt: cur?.last_retrieved_at ?? null,
        recentQuarterObservationRows: cur?.quarter_observation_rows ?? (currentFound ? 0 : null),
      };
    });
    const features = EMPLOYMENT_R6_FEATURES.map(def => {
      const result = computed?.get(def.id);
      const stored = snapshots.get(def.id);
      const chart = miniChartById.get(def.id);
      return {
        index: def.n, featureId: def.id, family: def.family, frequency: def.freq,
        sourceSeries: def.logical,
        historyReferenceStatus: result?.status ?? "NO_PIT_TABLE_EVIDENCE",
        latestComputedObservation: result?.observationDate ?? null,
        firstMissingReferenceDate: result?.missingExpectedDate ?? null,
        recentQuarterStoredFeatureRows: stored?.quarter_rows ?? (tables.has(TABLES.featureHistory) ? 0 : null),
        recentQuarterReadyFeatureRows: stored?.quarter_ready_rows ?? (tables.has(TABLES.featureHistory) ? 0 : null),
        lastStoredFeatureAsOf: stored?.last_score_as_of ?? null,
        missingSourceSeries: currentFound ? def.logical.filter(id => !current.has(id)) : null,
        oneYearMiniChartStatus: chart?.chartStatus ?? "NO_PIT_TABLE_EVIDENCE",
        oneYearMiniChartPointCount: chart?.chartPointCount ?? null,
        recentQuarterMiniChartPointCount: chart?.recentQuarterPointCount ?? null,
        miniChartRawStatus: chart?.rawStatus ?? "NO_PIT_TABLE_EVIDENCE",
      };
    });
    const groups = sourceGroupCoverage(logicalSeries, features, { currentTableExists: currentFound });

    const models = tables.has(TABLES.readModel)
      ? storedModels(db, `${asOfDate}T23:59:59.999Z`, quarterStart, yearStart)
      : null;
    const pointer = activePointer(db, tables);
    const runs = tables.has(TABLES.runs)
      ? db.prepare(`SELECT provider, status, completed_at, provider_requests, collected_rows
          FROM ${TABLES.runs} WHERE completed_at<=? ORDER BY completed_at DESC LIMIT 12`)
          .all(`${asOfDate}T23:59:59.999Z`)
      : null;
    const referenceReadyCount = features.filter(f => f.historyReferenceStatus === "READY").length;
    return {
      kind: "EMPLOYMENT_R6_PC_LOCAL_COVERAGE_READONLY_R1",
      asOf: asOfDate,
      windows: { highestPriority: { start: quarterStart, end: asOfDate }, oneYear: { start: yearStart, end: asOfDate }, olderSixNineMonthGapsAllowed: true },
      formulaHash: EMPLOYMENT_R6_FORMULA_HASH,
      tables: Object.fromEntries(Object.entries(TABLES).map(([key, table]) => [key, tables.has(table)])),
      summary: {
        requiredFeatures: EMPLOYMENT_R6_FEATURES.length,
        requiredSourceSeries: SERIES.length,
        sourceSeriesWithCurrentRows: currentFound ? current.size : null,
        sourceSeriesWithHistoryRevisions: historyFound ? history.size : null,
        formulaReferenceReadyFeatures: computed ? referenceReadyCount : null,
        formulaReferenceIncompleteFeatures: computed ? features.length - referenceReadyCount : null,
        verifiedScorePointsInRecentQuarter: models?.recentQuarterStoredPointCount ?? null,
        verifiedScorePointsInOneYear: models?.oneYearStoredPointCount ?? null,
        oneYearChartDataCandidate: models?.chartStoredDataCandidate ?? false,
        oneYearMiniChartReadyFeatures: miniChart?.summary.chartReadyFeatures ?? null,
        oneYearMiniChartPartialFeatures: miniChart?.summary.chartPartialFeatures ?? null,
        oneYearMiniChartUnavailableFeatures: miniChart
          ? features.filter(f => f.oneYearMiniChartStatus === "UNAVAILABLE").length : null,
        recentlyObservedMiniChartFeatures: miniChart?.summary.recentlyObservedFeatures ?? null,
        actualPublicChartVerified: false,
      },
      interpretation: {
        formulaReferenceStatus: "Computed from locally stored as-of history; does not prove release freshness or the full projection/READY gate.",
        sourceRows: "Current-table counts are inventory, NOT point-in-time proof for historical as-of dates.",
        quarterObservationRows: "Observation-date count only; publication lag varies, especially BED. Zero is not automatically stale.",
        chart: "READY model dates are evidence of stored score points, not a deployed 1-year chart or complete historical PIT coverage.",
        miniChart: "One-year mini-chart states are derived from approved Core PIT observations; they are not proof of D1 publication or live rendering.",
        groups: "Source group gaps are READ_ONLY collection priorities, not permission to call providers. BED recent-quarter gaps require publication-lag review.",
        noEvidenceIsNotZero: true,
      },
      logicalSeries,
      features,
      sourceGroupCoverage: groups,
      storedModels: models,
      currentPointer: pointer ? {
        scoreAsOf: pointer.score_as_of,
        status: pointer.status,
        formulaMatches: pointer.formula_hash === EMPLOYMENT_R6_FORMULA_HASH,
        updatedAt: pointer.updated_at,
      } : null,
      latestCollectorRuns: runs,
      providerRequestsMadeByAudit: 0,
      databaseWritesMadeByAudit: 0,
    };
  } finally {
    db.close();
  }
}

function parseArguments(args) {
  // Never infer a PC-specific drive or create a replacement DB. The launcher
  // resolves the existing approved home; direct invocation must pass --db.
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--db" && args[i + 1]) options.dbPath = args[++i];
    else if (args[i] === "--as-of" && args[i + 1]) options.asOfDate = args[++i];
    else if (args[i] === "--output-dir" && args[i + 1]) options.outputDir = args[++i];
    else throw new TypeError(`UNKNOWN_OR_INCOMPLETE_ARGUMENT:${args[i]}`);
  }
  return options;
}

const displayCount = value => value == null ? "NO_RUNTIME_EVIDENCE" : String(value);

export function formatCoverageSummary(report) {
  const s = report.summary;
  return [
    "ZGMINI EMPLOYMENT R6 - PC READ-ONLY COVERAGE",
    "STATUS: AUDIT_COMPLETED (not a live score or chart verification)",
    `AS_OF: ${report.asOf}`,
    `SOURCE_SERIES_WITH_ROWS: ${displayCount(s.sourceSeriesWithCurrentRows)} / 29`,
    `SOURCE_SERIES_WITH_PIT_HISTORY: ${displayCount(s.sourceSeriesWithHistoryRevisions)} / 29`,
    `TEN_YEAR_REFERENCE_READY_FEATURES: ${displayCount(s.formulaReferenceReadyFeatures)} / 29`,
    `RECENT_QUARTER_READY_SCORE_DATES: ${displayCount(s.verifiedScorePointsInRecentQuarter)}`,
    `ONE_YEAR_READY_SCORE_DATES: ${displayCount(s.verifiedScorePointsInOneYear)}`,
    `ONE_YEAR_CHART_STORED_DATA_CANDIDATE: ${s.oneYearChartDataCandidate ? "YES" : "NO"}`,
    `ONE_YEAR_RAW_MINICHART_READY_FEATURES: ${displayCount(s.oneYearMiniChartReadyFeatures)} / 29`,
    `ONE_YEAR_RAW_MINICHART_PARTIAL_FEATURES: ${displayCount(s.oneYearMiniChartPartialFeatures)} / 29`,
    `ONE_YEAR_RAW_MINICHART_UNAVAILABLE_FEATURES: ${displayCount(s.oneYearMiniChartUnavailableFeatures)} / 29`,
    `RECENT_QUARTER_RAW_MINICHART_OBSERVED_FEATURES: ${displayCount(s.recentlyObservedMiniChartFeatures)} / 29`,
    "PUBLIC_CHART_VERIFIED: NO",
    "RECENT_QUARTER_PRIORITY: YES; older visible chart gaps may remain, scoring reference gaps may not.",
    "",
    "FEATURE STATUS (29)",
    ...report.features.map(f => [
      String(f.index).padStart(2, "0"), f.featureId, f.historyReferenceStatus,
      `latest=${f.latestComputedObservation ?? "NONE"}`,
      `first_missing=${f.firstMissingReferenceDate ?? "NONE"}`,
      `quarter_stored=${displayCount(f.recentQuarterStoredFeatureRows)}`,
      `mini_1y=${f.oneYearMiniChartStatus}`,
      `mini_1y_points=${displayCount(f.oneYearMiniChartPointCount)}`,
      `mini_q_points=${displayCount(f.recentQuarterMiniChartPointCount)}`,
    ].join(" | ")),
    "",
    "SOURCE GROUP GAPS (READ ONLY; NO COLLECTION)",
    ...(report.sourceGroupCoverage ?? []).map(group => [
      group.groupName,
      `source=${displayCount(group.sourceSeriesWithRows)}/${group.requiredSourceSeries}`,
      `recent_quarter_sources=${displayCount(group.sourceSeriesWithRecentQuarterRows)}`,
      `missing=${group.missingSourceSeries?.join(",") || (group.missingSourceSeries === null ? "NO_RUNTIME_EVIDENCE" : "NONE")}`,
      `mini_1y_not_ready=${group.oneYearChartNotReadyFeatures.length}`,
      group.publicationLagCaution ? "BED_PUBLICATION_LAG_CHECK_REQUIRED" : "",
    ].filter(Boolean).join(" | ")),
    "",
    "This report is based on the existing local SQLite file. Provider calls=0, DB writes=0.",
  ].join("\r\n") + "\r\n";
}

/** Write report artifacts next to the standalone launcher, never into the DB or Git. */
export function saveCoverageReport({ outputDir, report = null, error = null, now = new Date() } = {}) {
  if (!outputDir || !fs.existsSync(outputDir) || !fs.statSync(outputDir).isDirectory()) {
    throw new TypeError("OUTPUT_DIRECTORY_NOT_FOUND");
  }
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(".", "_");
  const base = `EMPLOYMENT_R6_COVERAGE_${stamp}_${process.pid}`;
  const jsonPath = path.join(outputDir, `${base}.json`);
  const textPath = path.join(outputDir, `${base}.txt`);
  const payload = report ?? {
    kind: "EMPLOYMENT_R6_PC_LOCAL_COVERAGE_READONLY_R1",
    status: "AUTOMATION_BLOCKED",
    error: String(error?.message ?? error ?? "UNKNOWN_ERROR"),
    providerRequestsMadeByAudit: 0,
    databaseWritesMadeByAudit: 0,
  };
  const summary = report ? formatCoverageSummary(report) : [
    "ZGMINI EMPLOYMENT R6 - PC READ-ONLY COVERAGE",
    "STATUS: AUTOMATION_BLOCKED",
    `ERROR: ${payload.error}`,
    "Provider calls=0, DB writes=0.",
    "",
  ].join("\r\n");
  fs.writeFileSync(textPath, summary, { encoding: "utf8", flag: "wx" });
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return { textPath, jsonPath };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
    const report = await auditEmploymentR6Database(options);
    if (options.outputDir) {
      const paths = saveCoverageReport({ outputDir: options.outputDir, report });
      process.stdout.write(`AUDIT_COMPLETED\nRESULT_TXT: ${paths.textPath}\nRESULT_JSON: ${paths.jsonPath}\n`);
    } else process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    if (options?.outputDir) {
      try {
        const paths = saveCoverageReport({ outputDir: options.outputDir, error });
        process.stderr.write(`RESULT_TXT: ${paths.textPath}\nRESULT_JSON: ${paths.jsonPath}\n`);
      } catch (saveError) {
        process.stderr.write(`REPORT_SAVE_FAILED: ${saveError.message}\n`);
      }
    }
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}
