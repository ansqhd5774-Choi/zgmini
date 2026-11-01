#!/usr/bin/env node
// Isolated manual collection: source evidence in a candidate SQLite only.
// The approved PC core.sqlite is always opened read-only through the audit.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { localDatabase } from "./local-db.mjs";
import { auditEmploymentR6Database } from "./employment-r6-coverage-readonly.mjs";
import { runEmploymentR6CollectionStep } from "../../lib/market-score/employment-r6-collector.mjs";
import { EMPLOYMENT_R6_BLS_SERIES, EMPLOYMENT_R6_GROUPS } from "../../lib/market-score/employment-r6-contract.mjs";

export const RECENT_GROUPS = Object.freeze([
  "DOL_UI_WEEKLY_CLAIMS",
  "BLS_EMPLOYMENT_SITUATION",
  "BLS_JOLTS",
  "BLS_ECI",
]);

const CANDIDATE_FILE = "EMPLOYMENT_R6_CANDIDATE.sqlite";
const RESULT_BASE = "EMPLOYMENT_R6_RECENT_STAGE_RESULT";
const LOCK_FILE = "EMPLOYMENT_R6_RECENT_STAGE.lock";
const isoDate = value => value.toISOString().slice(0, 10);
const TARGET_SERIES = new Set([
  "INITIAL_CLAIMS", "INITIAL_CLAIMS_4W", "CONTINUED_CLAIMS", "INSURED_UNEMPLOYMENT_RATE",
  ...RECENT_GROUPS.flatMap(group => (EMPLOYMENT_R6_GROUPS[group].seriesIds ?? [])
    .map(id => EMPLOYMENT_R6_BLS_SERIES[id].logicalSeriesId)),
]);

function validatePaths({ coreDbPath, outputDir, candidateDbPath }) {
  if (!coreDbPath || !fs.existsSync(coreDbPath) || !fs.statSync(coreDbPath).isFile()) {
    throw new Error("APPROVED_CORE_DB_NOT_FOUND");
  }
  if (!outputDir || !fs.existsSync(outputDir) || !fs.statSync(outputDir).isDirectory()) {
    throw new Error("OUTPUT_DIRECTORY_NOT_FOUND");
  }
  const core = fs.realpathSync(coreDbPath);
  const output = fs.realpathSync(outputDir);
  const candidate = path.resolve(candidateDbPath ?? path.join(output, CANDIDATE_FILE));
  if (path.dirname(candidate) !== output || path.basename(candidate) !== CANDIDATE_FILE) {
    throw new Error("CANDIDATE_MUST_STAY_BESIDE_CMD");
  }
  if (candidate === core || (fs.existsSync(candidate) && fs.realpathSync(candidate) === core)) {
    throw new Error("CANDIDATE_CANNOT_BE_CORE_DB");
  }
  // The staging directory must not be the approved PC data directory.
  const pcHome = path.dirname(path.dirname(core));
  if (output === pcHome || output.startsWith(`${pcHome}${path.sep}`)) {
    throw new Error("OUTPUT_CANNOT_BE_PC_DATA_HOME");
  }
  return { core, output, candidate };
}

function missingBaseline(report) {
  return [...new Set(report.features
    .filter(f => f.historyReferenceStatus === "PARTIAL_MISSING")
    .flatMap(f => f.missingSourceSeries ?? []))].filter(id => TARGET_SERIES.has(id)).sort();
}

function observedAfter(report, required) {
  const available = new Map(report.logicalSeries.map(s => [s.id, s]));
  return required.map(id => ({
    id,
    sourceRows: Number(available.get(id)?.currentRows ?? 0),
    recentQuarterObservationRows: Number(available.get(id)?.recentQuarterObservationRows ?? 0),
    latestObservation: available.get(id)?.latestObservation ?? null,
  }));
}

function safeError(error) {
  const code = String(error?.code ?? error?.message ?? "RECENT_STAGE_FAILED");
  // Don't include URLs, request bodies, environment or file contents in results.
  return /^[A-Z][A-Z0-9_:-]{2,100}$/.test(code) ? code : "RECENT_STAGE_FAILED";
}

export function saveRecentStageResult({ outputDir, report }) {
  const files = [];
  for (const [ext, data] of [
    ["json", `${JSON.stringify(report, null, 2)}\n`],
    ["txt", formatRecentStageResult(report)],
  ]) {
    const target = path.join(outputDir, `${RESULT_BASE}.${ext}`);
    const tmp = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, data, "utf8");
    fs.renameSync(tmp, target);
    files.push(target);
  }
  return files;
}

export function formatRecentStageResult(report) {
  const lines = [
    "ZGMINI EMPLOYMENT R6 - ISOLATED RECENT SOURCE STAGE",
    `STATUS: ${report.status}`,
    `AS_OF: ${report.asOf ?? "NONE"}`,
    "APPROVED_PC_CORE_DB_WRITES: 0",
    "PC_CORE_TASK_OR_SCHEDULER_CHANGES: 0",
    "D1_WRITES: 0",
    "PUBLIC_CHART_VERIFIED: NO",
    "CANDIDATE_ONLY: YES; not merged into the approved PC core database.",
    `SOURCE_ROWS_MISSING_BEFORE: ${report.baselineMissingSourceSeries?.length ?? "NO_EVIDENCE"}`,
    `MISSING_SOURCE_SERIES_STAGED: ${report.stagedMissingSourceSeries ?? "NO_EVIDENCE"}`,
    `MISSING_SERIES_WITH_QUARTER_OBSERVATIONS: ${report.stagedQuarterSourceSeries ?? "NO_EVIDENCE"}`,
    `PROVIDER_REQUESTS_THIS_RUN: ${report.providerRequests ?? 0}`,
    `ERROR: ${report.error ?? "NONE"}`,
    "",
    "COLLECTION GROUPS",
    ...(report.groups ?? []).map(g => `${g.groupName} | ${g.status} | requests=${g.providerRequests ?? 0} | rows=${g.collectedRows ?? 0} | missing=${(g.missingSeries ?? []).join(",") || "NONE"}`),
    "",
    "BASELINE-MISSING SOURCE STATUS IN CANDIDATE",
    ...(report.sourceEvidence ?? []).map(s => `${s.id} | rows=${s.sourceRows} | recent_quarter_rows=${s.recentQuarterObservationRows} | latest=${s.latestObservation ?? "NONE"}`),
    "",
    "This run collects into ONE candidate SQLite beside this CMD only. No schema change to PC core.sqlite.",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

/** Run real provider collection into isolated candidate storage, never the operating DB. */
export async function stageEmploymentR6Recent({
  coreDbPath,
  outputDir,
  candidateDbPath,
  now = () => new Date(),
  fetchImpl = globalThis.fetch,
  collector = runEmploymentR6CollectionStep,
} = {}) {
  const report = {
    kind: "EMPLOYMENT_R6_RECENT_STAGE_CANDIDATE_R1",
    status: "AUTOMATION_BLOCKED",
    asOf: isoDate(now()),
    startedAt: now().toISOString(),
    groups: [],
    providerRequests: 0,
    approvedCoreDbWrites: 0,
    remoteWrites: 0,
  };
  let lockFd = null;
  let lockPath = null;
  try {
    const paths = validatePaths({ coreDbPath, outputDir, candidateDbPath });
    lockPath = path.join(paths.output, LOCK_FILE);
    try { lockFd = fs.openSync(lockPath, "wx"); }
    catch (error) {
      if (error.code === "EEXIST") throw new Error("RECENT_STAGE_LOCK_PRESENT");
      throw error;
    }
    fs.writeSync(lockFd, `${process.pid} ${report.startedAt}\n`);

    const baseline = await auditEmploymentR6Database({ dbPath: paths.core, asOfDate: report.asOf });
    report.baselineSourceSeriesWithRows = baseline.summary.sourceSeriesWithCurrentRows;
    report.baselineReferenceReadyFeatures = baseline.summary.formulaReferenceReadyFeatures;
    report.baselineMissingSourceSeries = missingBaseline(baseline);

    let db;
    try {
      db = localDatabase(paths.candidate);
      const result = await collector({
        env: { DB: db }, db, fetchImpl, now, mode: "RELEASE", groups: RECENT_GROUPS,
      });
      report.providerRequests = Number(result.providerRequests ?? 0);
      report.collectionStatus = result.status ?? "UNKNOWN";
      report.groups = (result.groupResults ?? []).map(g => ({
        groupName: g.groupName,
        status: g.status,
        providerRequests: Number(g.providerRequests ?? 0),
        collectedRows: Number(g.collectedRows ?? 0),
        missingSeries: g.missingSeries ?? [],
        failureCode: g.failureCode ?? null,
      }));
      report.plannedGroups = (result.plannedGroups ?? []).map(p => ({ groupName: p.groupName, status: p.status, due: p.due }));
    } finally {
      if (db) {
        try {
          // The candidate is single-writer and is not a Core task. Leave one
          // portable SQLite file, not accumulating WAL/SHM companions.
          await db.exec("PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode=DELETE;");
        } finally { db.close(); }
      }
    }

    const staged = await auditEmploymentR6Database({ dbPath: paths.candidate, asOfDate: report.asOf });
    report.candidateSourceSeriesWithRows = staged.summary.sourceSeriesWithCurrentRows;
    report.sourceEvidence = observedAfter(staged, report.baselineMissingSourceSeries);
    report.stagedMissingSourceSeries = report.sourceEvidence.filter(s => s.sourceRows > 0).length;
    report.stagedQuarterSourceSeries = report.sourceEvidence.filter(s => s.recentQuarterObservationRows > 0).length;
    report.status = report.collectionStatus === "FAIL" ? "SOURCE_FAILED"
      : report.collectionStatus === "PARTIAL" ? "PARTIAL_CANDIDATE_ONLY"
      : report.baselineMissingSourceSeries.length > 0 &&
        report.stagedMissingSourceSeries === report.baselineMissingSourceSeries.length
        ? "CANDIDATE_SOURCE_ROWS_COLLECTED" : "PARTIAL_CANDIDATE_ONLY";
    // The candidate is not the approved PC operating DB. No score/chart claim.
    report.scoreComputed = false;
    report.publicChartVerified = false;
  } catch (error) {
    report.status = "AUTOMATION_BLOCKED";
    report.error = safeError(error);
  } finally {
    report.completedAt = now().toISOString();
    if (lockFd != null) {
      fs.closeSync(lockFd);
      try { fs.unlinkSync(lockPath); } catch { /* leave the lock for manual inspection */ }
    }
    if (outputDir && fs.existsSync(outputDir) && fs.statSync(outputDir).isDirectory()) {
      saveRecentStageResult({ outputDir, report });
    }
  }
  return report;
}

function parseArguments(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--db" && args[i + 1]) out.coreDbPath = args[++i];
    else if (args[i] === "--output-dir" && args[i + 1]) out.outputDir = args[++i];
    else throw new Error("ARGUMENT_INVALID");
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const options = parseArguments(process.argv.slice(2));
  const report = await stageEmploymentR6Recent(options);
  process.stdout.write(`STATUS: ${report.status}\nRESULT: ${RESULT_BASE}.txt / .json\n`);
  if (!["CANDIDATE_SOURCE_ROWS_COLLECTED", "PARTIAL_CANDIDATE_ONLY"].includes(report.status)) process.exitCode = 2;
}
