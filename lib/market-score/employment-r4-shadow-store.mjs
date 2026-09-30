import {
  EMPLOYMENT_R4_PIT_CLASSES,
  EMPLOYMENT_R4_SHADOW_SCHEMA_VERSION,
  EMPLOYMENT_R4_SHADOW_STORE_REVISION,
  EMPLOYMENT_R4_SHADOW_TABLES,
} from "./employment-r4-shadow-contract.mjs";

const finite = value => typeof value === "number" && Number.isFinite(value);
const rowsFromAll = result => Array.isArray(result?.results) ? result.results : Array.isArray(result) ? result : [];
const resultChanges = result => Number(result?.meta?.changes ?? result?.changes ?? result?.changesCount ?? 0) || 0;
const allowedPit = new Set(Object.values(EMPLOYMENT_R4_PIT_CLASSES));

const requiredText = (value, label) => {
  const out = String(value ?? "").trim();
  if (!out) throw new TypeError(`${label}_REQUIRED`);
  return out;
};
const optionalText = value => value == null || String(value).trim() === "" ? null : String(value).trim();
const dateText = (value, label) => {
  const out = requiredText(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(out)) throw new TypeError(`${label}_INVALID`);
  return out;
};
const optionalDateOrIso = (value, label) => {
  if (value == null || String(value).trim() === "") return null;
  const out = String(value).trim();
  if (!Number.isFinite(Date.parse(out))) throw new TypeError(`${label}_INVALID`);
  return out;
};
const iso = (value, label) => {
  const out = requiredText(value, label);
  if (!Number.isFinite(Date.parse(out))) throw new TypeError(`${label}_INVALID`);
  return out;
};
const sha256 = (value, label) => {
  const out = requiredText(value, label).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(out)) throw new TypeError(`${label}_INVALID`);
  return out;
};
function stable(value) {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
const json = value => JSON.stringify(stable(value ?? {}));
const parseJson = value => { try { return JSON.parse(String(value ?? "{}")); } catch { return {}; } };
const identityKey = row => `${row.logicalSeriesId}|${row.geographyType}|${row.geographyCode}|${row.observationDate}`;

function normalizeRow(row, retrievedAt) {
  if (!finite(row?.value)) throw new TypeError("VALUE_INVALID");
  const pitClass = requiredText(row.pitClass, "PIT_CLASS");
  if (!allowedPit.has(pitClass)) throw new TypeError("PIT_CLASS_INVALID");
  const schemaVersion = Number(row.schemaVersion ?? EMPLOYMENT_R4_SHADOW_SCHEMA_VERSION);
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) throw new TypeError("SCHEMA_VERSION_INVALID");
  return {
    logicalSeriesId: requiredText(row.logicalSeriesId, "LOGICAL_SERIES_ID"),
    provider: requiredText(row.provider, "PROVIDER"),
    providerSeriesId: requiredText(row.providerSeriesId, "PROVIDER_SERIES_ID"),
    geographyType: requiredText(row.geographyType, "GEOGRAPHY_TYPE"),
    geographyCode: requiredText(row.geographyCode, "GEOGRAPHY_CODE"),
    frequency: requiredText(row.frequency, "FREQUENCY"),
    unit: optionalText(row.unit),
    seasonalAdjustment: optionalText(row.seasonalAdjustment),
    populationCoverage: optionalText(row.populationCoverage),
    observationDate: dateText(row.observationDate, "OBSERVATION_DATE"),
    releaseDate: optionalDateOrIso(row.releaseDate, "RELEASE_DATE"),
    availableAt: optionalDateOrIso(row.availableAt, "AVAILABLE_AT"),
    retrievedAt: iso(row.retrievedAt ?? retrievedAt, "RETRIEVED_AT"),
    value: Number(row.value),
    sourceRevision: optionalText(row.sourceRevision),
    sourceHash: sha256(row.sourceHash, "SOURCE_HASH"),
    qualityStatus: requiredText(row.qualityStatus, "QUALITY_STATUS"),
    pitClass,
    schemaVersion,
    provenanceJson: json(row.provenance ?? {}),
  };
}

function rowMateriallyChanged(old, item) {
  // retrievedAt, availableAt and response-level provenance are collection context,
  // not an observation revision by themselves. A material revision must change the
  // observation value/identity metadata, provider revision/hash, quality or schema.
  return Number(old.value) !== item.value
    || String(old.provider ?? "") !== item.provider
    || String(old.provider_series_id ?? "") !== item.providerSeriesId
    || String(old.frequency ?? "") !== item.frequency
    || String(old.unit ?? "") !== String(item.unit ?? "")
    || String(old.seasonal_adjustment ?? "") !== String(item.seasonalAdjustment ?? "")
    || String(old.population_coverage ?? "") !== String(item.populationCoverage ?? "")
    || String(old.release_date ?? "") !== String(item.releaseDate ?? "")
    || String(old.source_revision ?? "") !== String(item.sourceRevision ?? "")
    || String(old.source_hash ?? "") !== item.sourceHash
    || String(old.quality_status ?? "") !== item.qualityStatus
    || String(old.pit_class ?? "") !== item.pitClass
    || Number(old.schema_version ?? 0) !== item.schemaVersion;
}

export function createEmploymentR4ShadowStore(db, {
  now = () => new Date(),
  tokenFactory = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
} = {}) {
  if (!db || typeof db.prepare !== "function") throw new TypeError("D1_DATABASE_REQUIRED");
  const T = EMPLOYMENT_R4_SHADOW_TABLES;
  let initialized = null;
  const stmt = (sql, values = []) => db.prepare(sql).bind(...values);

  async function initialize() {
    if (initialized) return initialized;
    initialized = (async () => {
      await db.prepare(`CREATE TABLE IF NOT EXISTS ${T.current} (
        logical_series_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_series_id TEXT NOT NULL,
        geography_type TEXT NOT NULL,
        geography_code TEXT NOT NULL,
        frequency TEXT NOT NULL,
        unit TEXT,
        seasonal_adjustment TEXT,
        population_coverage TEXT,
        observation_date TEXT NOT NULL,
        release_date TEXT,
        available_at TEXT,
        retrieved_at TEXT NOT NULL,
        value REAL NOT NULL,
        source_revision TEXT,
        source_hash TEXT NOT NULL,
        quality_status TEXT NOT NULL,
        pit_class TEXT NOT NULL,
        schema_version INTEGER NOT NULL,
        provenance_json TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        PRIMARY KEY(logical_series_id,geography_type,geography_code,observation_date)
      )`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_employment_r4_shadow_current_lookup_v1
        ON ${T.current}(logical_series_id,observation_date DESC,geography_type,geography_code)`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS ${T.history} (
        history_id INTEGER PRIMARY KEY AUTOINCREMENT,
        logical_series_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_series_id TEXT NOT NULL,
        geography_type TEXT NOT NULL,
        geography_code TEXT NOT NULL,
        frequency TEXT NOT NULL,
        unit TEXT,
        seasonal_adjustment TEXT,
        population_coverage TEXT,
        observation_date TEXT NOT NULL,
        release_date TEXT,
        available_at TEXT,
        retrieved_at TEXT NOT NULL,
        value REAL NOT NULL,
        source_revision TEXT,
        source_hash TEXT NOT NULL,
        quality_status TEXT NOT NULL,
        pit_class TEXT NOT NULL,
        schema_version INTEGER NOT NULL,
        provenance_json TEXT NOT NULL,
        change_type TEXT NOT NULL CHECK(change_type IN ('INSERT','UPDATE')),
        recorded_at TEXT NOT NULL
      )`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_employment_r4_shadow_history_lookup_v1
        ON ${T.history}(logical_series_id,geography_type,geography_code,observation_date,history_id)`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS ${T.runs} (
        run_id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        collector_revision TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        provider_requests INTEGER NOT NULL DEFAULT 0,
        collected_rows INTEGER NOT NULL DEFAULT 0,
        inserted_count INTEGER NOT NULL DEFAULT 0,
        revised_count INTEGER NOT NULL DEFAULT 0,
        noop_count INTEGER NOT NULL DEFAULT 0,
        rejected_count INTEGER NOT NULL DEFAULT 0,
        partial_count INTEGER NOT NULL DEFAULT 0,
        current_rows INTEGER NOT NULL DEFAULT 0,
        history_rows_added INTEGER NOT NULL DEFAULT 0,
        failure_code TEXT,
        detail_json TEXT NOT NULL
      )`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_employment_r4_shadow_runs_time_v1
        ON ${T.runs}(completed_at DESC,status)`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS ${T.lock} (
        lock_key TEXT PRIMARY KEY,
        token TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )`).run();
    })().catch(error => { initialized = null; throw error; });
    return initialized;
  }

  async function all(sql, values = []) {
    await initialize();
    return rowsFromAll(await stmt(sql, values).all());
  }
  async function first(sql, values = []) {
    await initialize();
    return await stmt(sql, values).first();
  }
  async function runBatches(statements, chunkSize = 80) {
    for (let i = 0; i < statements.length; i += chunkSize) {
      const chunk = statements.slice(i, i + chunkSize);
      if (typeof db.batch === "function") await db.batch(chunk);
      else for (const statement of chunk) await statement.run();
    }
  }

  async function upsertRows({ rows = [], retrievedAt = now().toISOString() } = {}) {
    await initialize();
    if (!Array.isArray(rows)) throw new TypeError("ROWS_REQUIRED");
    const rt = iso(retrievedAt, "RETRIEVED_AT");
    const normalized = [], rejections = [];
    for (let i = 0; i < rows.length; i++) {
      try { normalized.push(normalizeRow(rows[i], rt)); }
      catch (error) { rejections.push({ index: i, reason: String(error?.message ?? error) }); }
    }

    const ranges = new Map();
    for (const row of normalized) {
      const r = ranges.get(row.logicalSeriesId) ?? { min: row.observationDate, max: row.observationDate };
      if (row.observationDate < r.min) r.min = row.observationDate;
      if (row.observationDate > r.max) r.max = row.observationDate;
      ranges.set(row.logicalSeriesId, r);
    }
    const existing = new Map();
    for (const [logicalSeriesId, r] of ranges) {
      const prior = await all(`SELECT * FROM ${T.current}
        WHERE logical_series_id=? AND observation_date>=? AND observation_date<=?`, [logicalSeriesId, r.min, r.max]);
      for (const row of prior) existing.set(`${row.logical_series_id}|${row.geography_type}|${row.geography_code}|${row.observation_date}`, row);
    }

    const currentStatements = [], historyStatements = [];
    const changedSeriesIds = new Set();
    let inserted = 0, revised = 0, noop = 0;
    for (const raw of normalized) {
      const old = existing.get(identityKey(raw)) ?? null;
      const item = { ...raw };
      const oldWasForward = old?.pit_class === EMPLOYMENT_R4_PIT_CLASSES.forwardObserved;
      const incomingWasForward = item.pitClass === EMPLOYMENT_R4_PIT_CLASSES.forwardObserved;
      if (oldWasForward && !incomingWasForward) {
        // Once an observation was captured as true-forward PIT, later broad history
        // refreshes must not downgrade it. Preserve its first-known availability
        // unless the row materially revised in this later retrieval.
        item.pitClass = EMPLOYMENT_R4_PIT_CLASSES.forwardObserved;
      }
      const changed = old ? rowMateriallyChanged(old, item) : false;
      if (oldWasForward && !incomingWasForward) {
        item.availableAt = changed ? rt : (old.available_at ?? item.availableAt);
      } else if (old && !changed) {
        // Re-polling the same latest observation produces a new retrievedAt and a
        // new parser-level availableAt, but that is not a statistical revision.
        item.availableAt = old.available_at ?? item.availableAt;
      }
      if (!old) {
        inserted++;
        changedSeriesIds.add(item.logicalSeriesId);
        currentStatements.push(stmt(`INSERT INTO ${T.current} (
          logical_series_id,provider,provider_series_id,geography_type,geography_code,frequency,unit,seasonal_adjustment,population_coverage,
          observation_date,release_date,available_at,retrieved_at,value,source_revision,source_hash,quality_status,pit_class,schema_version,
          provenance_json,first_seen_at,last_seen_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
          item.logicalSeriesId,item.provider,item.providerSeriesId,item.geographyType,item.geographyCode,item.frequency,item.unit,item.seasonalAdjustment,item.populationCoverage,
          item.observationDate,item.releaseDate,item.availableAt,item.retrievedAt,item.value,item.sourceRevision,item.sourceHash,item.qualityStatus,item.pitClass,item.schemaVersion,
          item.provenanceJson,rt,rt,
        ]));
        historyStatements.push(stmt(`INSERT INTO ${T.history} (
          logical_series_id,provider,provider_series_id,geography_type,geography_code,frequency,unit,seasonal_adjustment,population_coverage,
          observation_date,release_date,available_at,retrieved_at,value,source_revision,source_hash,quality_status,pit_class,schema_version,
          provenance_json,change_type,recorded_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'INSERT',?)`, [
          item.logicalSeriesId,item.provider,item.providerSeriesId,item.geographyType,item.geographyCode,item.frequency,item.unit,item.seasonalAdjustment,item.populationCoverage,
          item.observationDate,item.releaseDate,item.availableAt,item.retrievedAt,item.value,item.sourceRevision,item.sourceHash,item.qualityStatus,item.pitClass,item.schemaVersion,
          item.provenanceJson,rt,
        ]));
      } else if (changed) {
        revised++;
        changedSeriesIds.add(item.logicalSeriesId);
        if (oldWasForward && item.availableAt == null) item.availableAt = rt;
        currentStatements.push(stmt(`UPDATE ${T.current} SET
          provider=?,provider_series_id=?,frequency=?,unit=?,seasonal_adjustment=?,population_coverage=?,release_date=?,available_at=?,retrieved_at=?,
          value=?,source_revision=?,source_hash=?,quality_status=?,pit_class=?,schema_version=?,provenance_json=?,last_seen_at=?
          WHERE logical_series_id=? AND geography_type=? AND geography_code=? AND observation_date=?`, [
          item.provider,item.providerSeriesId,item.frequency,item.unit,item.seasonalAdjustment,item.populationCoverage,item.releaseDate,item.availableAt,item.retrievedAt,
          item.value,item.sourceRevision,item.sourceHash,item.qualityStatus,item.pitClass,item.schemaVersion,item.provenanceJson,rt,
          item.logicalSeriesId,item.geographyType,item.geographyCode,item.observationDate,
        ]));
        historyStatements.push(stmt(`INSERT INTO ${T.history} (
          logical_series_id,provider,provider_series_id,geography_type,geography_code,frequency,unit,seasonal_adjustment,population_coverage,
          observation_date,release_date,available_at,retrieved_at,value,source_revision,source_hash,quality_status,pit_class,schema_version,
          provenance_json,change_type,recorded_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'UPDATE',?)`, [
          item.logicalSeriesId,item.provider,item.providerSeriesId,item.geographyType,item.geographyCode,item.frequency,item.unit,item.seasonalAdjustment,item.populationCoverage,
          item.observationDate,item.releaseDate,item.availableAt,item.retrievedAt,item.value,item.sourceRevision,item.sourceHash,item.qualityStatus,item.pitClass,item.schemaVersion,
          item.provenanceJson,rt,
        ]));
      } else {
        noop++;
        currentStatements.push(stmt(`UPDATE ${T.current} SET retrieved_at=?,last_seen_at=?
          WHERE logical_series_id=? AND geography_type=? AND geography_code=? AND observation_date=?`, [
          rt,rt,item.logicalSeriesId,item.geographyType,item.geographyCode,item.observationDate,
        ]));
      }
    }

    await runBatches([...currentStatements, ...historyStatements]);
    const current = await first(`SELECT COUNT(*) AS n FROM ${T.current}`);
    return {
      inserted,
      revised,
      noop,
      rejected: rejections.length,
      rejections,
      accepted: normalized.length,
      currentRows: Number(current?.n ?? 0),
      historyRowsAdded: historyStatements.length,
      changedSeriesIds: [...changedSeriesIds].sort(),
    };
  }

  async function recordRun(run = {}) {
    await initialize();
    const runId = requiredText(run.runId ?? tokenFactory(), "RUN_ID");
    const startedAt = iso(run.startedAt, "STARTED_AT");
    const completedAt = iso(run.completedAt, "COMPLETED_AT");
    await stmt(`INSERT INTO ${T.runs} (
      run_id,provider,collector_revision,status,started_at,completed_at,provider_requests,collected_rows,inserted_count,revised_count,noop_count,
      rejected_count,partial_count,current_rows,history_rows_added,failure_code,detail_json
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
      runId,requiredText(run.provider ?? "EMPLOYMENT_R4_SHADOW", "PROVIDER"),requiredText(run.collectorRevision, "COLLECTOR_REVISION"),requiredText(run.status,"STATUS"),
      startedAt,completedAt,Number(run.providerRequests ?? 0),Number(run.collectedRows ?? 0),Number(run.insertedCount ?? 0),Number(run.revisedCount ?? 0),Number(run.noopCount ?? 0),
      Number(run.rejectedCount ?? 0),Number(run.partialCount ?? 0),Number(run.currentRows ?? 0),Number(run.historyRowsAdded ?? 0),optionalText(run.failureCode),json(run.detail ?? {}),
    ]).run();
    return runId;
  }

  async function acquire(lockKey = "employment-r4-shadow", { ttlMs = 120_000 } = {}) {
    await initialize();
    const key = requiredText(lockKey,"LOCK_KEY"), token = requiredText(tokenFactory(),"LOCK_TOKEN");
    const value = now(), current = value instanceof Date ? value : new Date(value);
    const nowIso = current.toISOString(), expiresAt = new Date(current.getTime()+ttlMs).toISOString();
    const result = await stmt(`INSERT INTO ${T.lock}(lock_key,token,expires_at) VALUES(?,?,?)
      ON CONFLICT(lock_key) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at
      WHERE ${T.lock}.expires_at<=?`, [key,token,expiresAt,nowIso]).run();
    return resultChanges(result)>0 ? {acquired:true,key,token,expiresAt} : {acquired:false,key,token:null,expiresAt:null};
  }
  async function release(lease) {
    if (!lease?.acquired || !lease?.token) return false;
    const result = await stmt(`DELETE FROM ${T.lock} WHERE lock_key=? AND token=?`, [lease.key,lease.token]).run();
    return resultChanges(result)>0;
  }

  async function latestRun({ status = null } = {}) {
    const wanted = optionalText(status);
    return wanted
      ? await first(`SELECT * FROM ${T.runs} WHERE status=? ORDER BY completed_at DESC, rowid DESC LIMIT 1`, [wanted])
      : await first(`SELECT * FROM ${T.runs} ORDER BY completed_at DESC, rowid DESC LIMIT 1`);
  }

  async function countRows() {
    const [current,history,runs] = await Promise.all([
      first(`SELECT COUNT(*) AS n FROM ${T.current}`),
      first(`SELECT COUNT(*) AS n FROM ${T.history}`),
      first(`SELECT COUNT(*) AS n FROM ${T.runs}`),
    ]);
    return {current:Number(current?.n??0),history:Number(history?.n??0),runs:Number(runs?.n??0)};
  }
  async function getCurrentRows(logicalSeriesId = null) {
    const rows = logicalSeriesId == null
      ? await all(`SELECT * FROM ${T.current} ORDER BY logical_series_id,observation_date,geography_code`)
      : await all(`SELECT * FROM ${T.current} WHERE logical_series_id=? ORDER BY observation_date,geography_code`, [requiredText(logicalSeriesId,"LOGICAL_SERIES_ID")]);
    return rows.map(row => ({...row,value:Number(row.value),provenance:parseJson(row.provenance_json)}));
  }
  async function getHistoryRows() {
    const rows = await all(`SELECT * FROM ${T.history} ORDER BY history_id`);
    return rows.map(row => ({...row,value:Number(row.value),provenance:parseJson(row.provenance_json)}));
  }

  return { initialize, upsertRows, recordRun, acquire, release, latestRun, countRows, getCurrentRows, getHistoryRows };
}

export const EMPLOYMENT_R4_SHADOW_STORE_CONTRACT = Object.freeze({
  revision: EMPLOYMENT_R4_SHADOW_STORE_REVISION,
  schemaVersion: EMPLOYMENT_R4_SHADOW_SCHEMA_VERSION,
  tables: EMPLOYMENT_R4_SHADOW_TABLES,
  storeOnly: true,
  activeScoreChanged: false,
});
