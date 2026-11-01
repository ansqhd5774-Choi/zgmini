#!/usr/bin/env node
// R6 data evidence only. No provider calls, schema initialization, writes, or scoring persistence.
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";

import {
  EMPLOYMENT_R6_FEATURES,
  EMPLOYMENT_R6_FORMULA_HASH,
  EMPLOYMENT_R6_REQUIRED_LOGICAL_SERIES,
} from "../../lib/market-score/employment-r6-formula.mjs";
import { computeAllFeaturePoints } from "../../lib/market-score/employment-r6-feature-engine.mjs";
import { createEmploymentR6ObservationReader } from "../../lib/market-score/employment-r6-observation-reader.mjs";
import { EMPLOYMENT_R6_TABLES } from "../../lib/market-score/employment-r6-contract.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;
const SERIES = EMPLOYMENT_R6_REQUIRED_LOGICAL_SERIES;
const TABLES = EMPLOYMENT_R6_TABLES;

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
      };
    });

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
        actualPublicChartVerified: false,
      },
      interpretation: {
        formulaReferenceStatus: "Computed from locally stored as-of history; does not prove release freshness or the full projection/READY gate.",
        sourceRows: "Current-table counts are inventory, NOT point-in-time proof for historical as-of dates.",
        quarterObservationRows: "Observation-date count only; publication lag varies, especially BED. Zero is not automatically stale.",
        chart: "READY model dates are evidence of stored score points, not a deployed 1-year chart or complete historical PIT coverage.",
        noEvidenceIsNotZero: true,
      },
      logicalSeries,
      features,
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
  const options = { dbPath: process.platform === "win32" ? "E:\\ZGmini\\data\\pc-writer\\storage\\core.sqlite" : undefined };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--db" && args[i + 1]) options.dbPath = args[++i];
    else if (args[i] === "--as-of" && args[i + 1]) options.asOfDate = args[++i];
    else throw new TypeError(`UNKNOWN_OR_INCOMPLETE_ARGUMENT:${args[i]}`);
  }
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const report = await auditEmploymentR6Database(parseArguments(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}
