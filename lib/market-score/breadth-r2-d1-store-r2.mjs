import { createBreadthR2D1Store } from "./breadth-r2-d1-store.mjs";

const finite = value => typeof value === "number" && Number.isFinite(value);
const text = (value, label) => {
  const out = String(value ?? "").trim();
  if (!out) throw new TypeError(`${label}_REQUIRED`);
  return out;
};
const dateText = (value, label) => {
  const out = text(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(out)) throw new TypeError(`${label}_INVALID`);
  return out;
};
const iso = (value, label) => {
  const out = text(value, label);
  if (!Number.isFinite(Date.parse(out))) throw new TypeError(`${label}_INVALID`);
  return out;
};
const rowsFromAll = result => Array.isArray(result?.results) ? result.results : Array.isArray(result) ? result : [];
const resultChanges = result => Number(result?.meta?.changes ?? result?.changes ?? result?.changesCount ?? 0) || 0;

function stable(value) {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function json(value) { return JSON.stringify(stable(value ?? {})); }
function parseJson(value) { try { return JSON.parse(String(value ?? "{}")); } catch { return {}; } }

export const BREADTH_R2_D1_STORE_R2 = "BREADTH-R2-D1-STORE-R2";

export function createBreadthR2D1StoreR2(db, {
  now = () => new Date(),
  tokenFactory = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
} = {}) {
  if (!db || typeof db.prepare !== "function") throw new TypeError("D1_DATABASE_REQUIRED");
  const rawStore = createBreadthR2D1Store(db);
  let initialized = null;
  const stmt = (sql, values = []) => db.prepare(sql).bind(...values);

  async function initialize() {
    if (initialized) return initialized;
    initialized = (async () => {
      await rawStore.getSnapshot("__B1_R2_INIT__").catch(() => null);
      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_breadth_r2_current_v1 (
        provider TEXT NOT NULL,
        observation_key TEXT NOT NULL,
        observation_date TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT,
        provenance_json TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        retrieved_at TEXT NOT NULL,
        last_as_of_date TEXT NOT NULL,
        PRIMARY KEY(provider,observation_key,entity_type,entity_id,metric)
      )`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_breadth_r2_current_obs_v1
        ON market_score_breadth_r2_current_v1(provider,observation_date DESC,observation_key,metric,entity_id)`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_breadth_r2_history_v1 (
        history_id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        observation_key TEXT NOT NULL,
        observation_date TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT,
        provenance_json TEXT NOT NULL,
        change_type TEXT NOT NULL CHECK(change_type IN ('INSERT','UPDATE')),
        retrieved_at TEXT NOT NULL,
        as_of_date TEXT NOT NULL
      )`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_breadth_r2_history_obs_v1
        ON market_score_breadth_r2_history_v1(provider,observation_key,metric,entity_id,history_id)`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_breadth_r2_universe_v1 (
        universe_key TEXT NOT NULL,
        observation_key TEXT NOT NULL,
        observation_date TEXT NOT NULL,
        body_json TEXT NOT NULL,
        member_count INTEGER NOT NULL,
        provenance_json TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        retrieved_at TEXT NOT NULL,
        PRIMARY KEY(universe_key,observation_key)
      )`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_breadth_r2_universe_obs_v1
        ON market_score_breadth_r2_universe_v1(universe_key,observation_date DESC,observation_key)`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_breadth_r2_runs_v1 (
        run_id TEXT PRIMARY KEY,
        as_of_date TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        provider_requests INTEGER NOT NULL DEFAULT 0,
        collected_rows INTEGER NOT NULL DEFAULT 0,
        inserted_count INTEGER NOT NULL DEFAULT 0,
        updated_count INTEGER NOT NULL DEFAULT 0,
        noop_count INTEGER NOT NULL DEFAULT 0,
        current_rows INTEGER NOT NULL DEFAULT 0,
        history_rows_added INTEGER NOT NULL DEFAULT 0,
        upstream_ms REAL,
        storage_write_ms REAL,
        storage_read_ms REAL,
        score_compute_ms REAL,
        failure_code TEXT,
        detail_json TEXT NOT NULL
      )`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_breadth_r2_runs_time_v1
        ON market_score_breadth_r2_runs_v1(as_of_date,completed_at DESC)`).run();
      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_breadth_r2_lock_v1 (
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
  async function runBatches(statements, chunk = 80) {
    for (let i = 0; i < statements.length; i += chunk) {
      const part = statements.slice(i, i + chunk);
      if (typeof db.batch === "function") await db.batch(part);
      else for (const statement of part) await statement.run();
    }
  }

  async function upsertCurrentRows({ asOfDate, rows = [], retrievedAt }) {
    await initialize();
    const asOf = dateText(asOfDate, "AS_OF_DATE");
    const rt = iso(retrievedAt, "RETRIEVED_AT");
    if (!Array.isArray(rows)) throw new TypeError("ROWS_REQUIRED");

    const currentStatements = [];
    const historyStatements = [];
    let inserted = 0, updated = 0, noop = 0, validSeen = 0;
    const normalized = [];
    const groupKeys = new Map();

    for (const row of rows) {
      if (!finite(row?.value)) continue;
      const item = {
        provider: text(row.provider, "PROVIDER"),
        observationKey: text(row.observationKey, "OBSERVATION_KEY"),
        observationDate: dateText(row.observationDate, "OBSERVATION_DATE"),
        entityType: text(row.entityType, "ENTITY_TYPE"),
        entityId: text(row.entityId, "ENTITY_ID"),
        metric: text(row.metric, "METRIC"),
        value: row.value,
        unit: row.unit == null ? null : String(row.unit),
        provenance: json(row.provenance ?? {}),
      };
      normalized.push(item);
      groupKeys.set(`${item.provider}|${item.observationKey}`, [item.provider, item.observationKey]);
    }

    const existingByKey = new Map();
    for (const [provider, observationKey] of groupKeys.values()) {
      const priorRows = await all(`SELECT provider,observation_key,entity_type,entity_id,metric,value,unit,provenance_json,observation_date
        FROM market_score_breadth_r2_current_v1 WHERE provider=? AND observation_key=?`, [provider, observationKey]);
      for (const prior of priorRows) {
        existingByKey.set(`${provider}|${observationKey}|${prior.entity_type}|${prior.entity_id}|${prior.metric}`, prior);
      }
    }

    for (const row of normalized) {
      const { provider, observationKey, observationDate, entityType, entityId, metric, value, unit, provenance } = row;
      validSeen++;
      const old = existingByKey.get(`${provider}|${observationKey}|${entityType}|${entityId}|${metric}`) ?? null;

      if (!old) {
        inserted++;
        currentStatements.push(stmt(`INSERT INTO market_score_breadth_r2_current_v1
          (provider,observation_key,observation_date,entity_type,entity_id,metric,value,unit,provenance_json,first_seen_at,last_seen_at,retrieved_at,last_as_of_date)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [provider,observationKey,observationDate,entityType,entityId,metric,value,unit,provenance,rt,rt,rt,asOf]));
        historyStatements.push(stmt(`INSERT INTO market_score_breadth_r2_history_v1
          (provider,observation_key,observation_date,entity_type,entity_id,metric,value,unit,provenance_json,change_type,retrieved_at,as_of_date)
          VALUES(?,?,?,?,?,?,?,?,?,'INSERT',?,?)`,
          [provider,observationKey,observationDate,entityType,entityId,metric,value,unit,provenance,rt,asOf]));
      } else {
        const changed = Number(old.value) !== Number(value)
          || String(old.unit ?? "") !== String(unit ?? "")
          || String(old.provenance_json) !== provenance
          || String(old.observation_date) !== observationDate;
        if (changed) {
          updated++;
          currentStatements.push(stmt(`UPDATE market_score_breadth_r2_current_v1 SET
            observation_date=?,value=?,unit=?,provenance_json=?,last_seen_at=?,retrieved_at=?,last_as_of_date=?
            WHERE provider=? AND observation_key=? AND entity_type=? AND entity_id=? AND metric=?`,
            [observationDate,value,unit,provenance,rt,rt,asOf,provider,observationKey,entityType,entityId,metric]));
          historyStatements.push(stmt(`INSERT INTO market_score_breadth_r2_history_v1
            (provider,observation_key,observation_date,entity_type,entity_id,metric,value,unit,provenance_json,change_type,retrieved_at,as_of_date)
            VALUES(?,?,?,?,?,?,?,?,?,'UPDATE',?,?)`,
            [provider,observationKey,observationDate,entityType,entityId,metric,value,unit,provenance,rt,asOf]));
        } else {
          noop++;
          currentStatements.push(stmt(`UPDATE market_score_breadth_r2_current_v1 SET
            last_seen_at=?,retrieved_at=?,last_as_of_date=?
            WHERE provider=? AND observation_key=? AND entity_type=? AND entity_id=? AND metric=?`,
            [rt,rt,asOf,provider,observationKey,entityType,entityId,metric]));
        }
      }
    }

    await runBatches([...currentStatements, ...historyStatements]);
    const currentCount = await first(`SELECT COUNT(*) AS n FROM market_score_breadth_r2_current_v1`);
    return {
      inserted, updated, noop, validSeen,
      currentRows: Number(currentCount?.n ?? 0),
      historyRowsAdded: historyStatements.length,
    };
  }

  async function putUniverse({ universeKey, observationKey, observationDate, members = [], provenance = {}, retrievedAt }) {
    await initialize();
    const uk = text(universeKey, "UNIVERSE_KEY");
    const ok = text(observationKey, "OBSERVATION_KEY");
    const od = dateText(observationDate, "OBSERVATION_DATE");
    const rt = iso(retrievedAt, "RETRIEVED_AT");
    if (!Array.isArray(members)) throw new TypeError("UNIVERSE_MEMBERS_REQUIRED");
    const clean = [...new Set(members.map(value => String(value ?? "").trim()).filter(Boolean))].sort();
    const body = json({ members: clean });
    const prov = json(provenance);
    const old = await first(`SELECT first_seen_at,body_json,provenance_json FROM market_score_breadth_r2_universe_v1
      WHERE universe_key=? AND observation_key=? LIMIT 1`, [uk, ok]);
    await stmt(`INSERT INTO market_score_breadth_r2_universe_v1
      (universe_key,observation_key,observation_date,body_json,member_count,provenance_json,first_seen_at,last_seen_at,retrieved_at)
      VALUES(?,?,?,?,?,?,?,?,?)
      ON CONFLICT(universe_key,observation_key) DO UPDATE SET
        observation_date=excluded.observation_date,body_json=excluded.body_json,member_count=excluded.member_count,
        provenance_json=excluded.provenance_json,last_seen_at=excluded.last_seen_at,retrieved_at=excluded.retrieved_at`,
      [uk,ok,od,body,clean.length,prov,old?.first_seen_at ?? rt,rt,rt]).run();
    return { universeKey: uk, observationKey: ok, observationDate: od, members: clean, memberCount: clean.length, changed: !old || old.body_json !== body || old.provenance_json !== prov };
  }

  async function getUniverse(universeKey, observationKey) {
    const row = await first(`SELECT * FROM market_score_breadth_r2_universe_v1 WHERE universe_key=? AND observation_key=? LIMIT 1`,
      [text(universeKey,"UNIVERSE_KEY"),text(observationKey,"OBSERVATION_KEY")]);
    if (!row) return null;
    const body = parseJson(row.body_json);
    return { ...row, members: Array.isArray(body.members) ? body.members : [], memberCount: Number(row.member_count ?? 0), provenance: parseJson(row.provenance_json) };
  }

  async function getObservationRows(provider, observationKey) {
    const rows = await all(`SELECT * FROM market_score_breadth_r2_current_v1
      WHERE provider=? AND observation_key=? ORDER BY metric,entity_id`, [text(provider,"PROVIDER"),text(observationKey,"OBSERVATION_KEY")]);
    return rows.map(row => ({ ...row, value: Number(row.value), provenance: parseJson(row.provenance_json) }));
  }

  async function getMetricSeries(provider, metric, asOfDate) {
    const rows = await all(`SELECT * FROM market_score_breadth_r2_current_v1
      WHERE provider=? AND metric=? AND observation_date<=? ORDER BY observation_date,observation_key,entity_id`,
      [text(provider,"PROVIDER"),text(metric,"METRIC"),dateText(asOfDate,"AS_OF_DATE")]);
    return rows.map(row => ({ ...row, value: Number(row.value), provenance: parseJson(row.provenance_json) }));
  }

  async function getLatestCompleteObservation(provider, metric, asOfDate, requiredEntityCount) {
    const row = await first(`SELECT observation_key,observation_date,COUNT(DISTINCT entity_id) AS n
      FROM market_score_breadth_r2_current_v1
      WHERE provider=? AND metric=? AND observation_date<=?
      GROUP BY observation_key,observation_date
      HAVING COUNT(DISTINCT entity_id)>=?
      ORDER BY observation_date DESC,observation_key DESC LIMIT 1`,
      [text(provider,"PROVIDER"),text(metric,"METRIC"),dateText(asOfDate,"AS_OF_DATE"),Number(requiredEntityCount)]);
    return row ? { observationKey: row.observation_key, observationDate: row.observation_date, count: Number(row.n ?? 0) } : null;
  }

  async function countRows() {
    const [current, history, universe, runs] = await Promise.all([
      first(`SELECT COUNT(*) AS n FROM market_score_breadth_r2_current_v1`),
      first(`SELECT COUNT(*) AS n FROM market_score_breadth_r2_history_v1`),
      first(`SELECT COUNT(*) AS n FROM market_score_breadth_r2_universe_v1`),
      first(`SELECT COUNT(*) AS n FROM market_score_breadth_r2_runs_v1`),
    ]);
    return { current: Number(current?.n ?? 0), history: Number(history?.n ?? 0), universe: Number(universe?.n ?? 0), runs: Number(runs?.n ?? 0) };
  }

  async function recordRun(run = {}) {
    await initialize();
    const runId = text(run.runId ?? tokenFactory(), "RUN_ID");
    const asOf = dateText(run.asOfDate, "AS_OF_DATE");
    const started = iso(run.startedAt, "STARTED_AT");
    const completed = iso(run.completedAt, "COMPLETED_AT");
    await stmt(`INSERT INTO market_score_breadth_r2_runs_v1
      (run_id,as_of_date,status,started_at,completed_at,provider_requests,collected_rows,inserted_count,updated_count,noop_count,current_rows,history_rows_added,upstream_ms,storage_write_ms,storage_read_ms,score_compute_ms,failure_code,detail_json)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
      runId,asOf,text(run.status,"STATUS"),started,completed,Number(run.providerRequests ?? 0),Number(run.collectedRows ?? 0),
      Number(run.insertedCount ?? 0),Number(run.updatedCount ?? 0),Number(run.noopCount ?? 0),Number(run.currentRows ?? 0),Number(run.historyRowsAdded ?? 0),
      run.upstreamMs ?? null,run.storageWriteMs ?? null,run.storageReadMs ?? null,run.scoreComputeMs ?? null,run.failureCode ?? null,json(run.detail ?? {}),
    ]).run();
    return runId;
  }

  async function latestSuccessfulRun(asOfDate = null) {
    if (asOfDate == null) return await first(`SELECT * FROM market_score_breadth_r2_runs_v1 WHERE status='SUCCESS' ORDER BY completed_at DESC LIMIT 1`);
    return await first(`SELECT * FROM market_score_breadth_r2_runs_v1 WHERE status='SUCCESS' AND as_of_date=? ORDER BY completed_at DESC LIMIT 1`, [dateText(asOfDate,"AS_OF_DATE")]);
  }

  async function acquire(lockKey, { ttlMs = 120_000 } = {}) {
    await initialize();
    const key = text(lockKey, "LOCK_KEY");
    const token = text(tokenFactory(), "LOCK_TOKEN");
    const value = now();
    const current = value instanceof Date ? value : new Date(value);
    const nowIso = current.toISOString();
    const expiresAt = new Date(current.getTime() + ttlMs).toISOString();
    const result = await stmt(`INSERT INTO market_score_breadth_r2_lock_v1(lock_key,token,expires_at) VALUES(?,?,?)
      ON CONFLICT(lock_key) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at
      WHERE market_score_breadth_r2_lock_v1.expires_at<=?`, [key,token,expiresAt,nowIso]).run();
    return resultChanges(result) > 0 ? { acquired: true, key, token, expiresAt } : { acquired: false, key, token: null, expiresAt: null };
  }

  async function release(lease) {
    if (!lease?.acquired || !lease?.token) return false;
    const result = await stmt(`DELETE FROM market_score_breadth_r2_lock_v1 WHERE lock_key=? AND token=?`, [lease.key,lease.token]).run();
    return resultChanges(result) > 0;
  }

  return {
    initialize,
    putRaw: rawStore.putRaw,
    getLatestRaw: rawStore.getLatestRaw,
    getSnapshot: rawStore.getSnapshot,
    putSnapshot: rawStore.putSnapshot,
    upsertCurrentRows,
    putUniverse,
    getUniverse,
    getObservationRows,
    getMetricSeries,
    getLatestCompleteObservation,
    countRows,
    recordRun,
    latestSuccessfulRun,
    acquire,
    release,
  };
}
