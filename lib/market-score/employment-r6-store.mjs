
import {
  EMPLOYMENT_R6_STORE_REVISION,
  EMPLOYMENT_R6_TABLES,
} from "./employment-r6-contract.mjs";
import {
  createEmploymentR4ShadowStore,
} from "./employment-r4-shadow-store.mjs";

const CHUNK_CHARS = 120_000;
const resultChanges = result => Number(result?.meta?.changes ?? result?.changes ?? result?.changesCount ?? 0) || 0;
const finite = value => typeof value === "number" && Number.isFinite(value);

function stable(value) {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function json(value) { return JSON.stringify(stable(value ?? {})); }
function requiredText(value, label) {
  const out = String(value ?? "").trim();
  if (!out) throw new TypeError(`${label}_REQUIRED`);
  return out;
}
function optionalText(value) {
  return value == null || String(value).trim() === "" ? null : String(value).trim();
}
function iso(value, label) {
  const out = requiredText(value, label);
  if (!Number.isFinite(Date.parse(out))) throw new TypeError(`${label}_INVALID`);
  return out;
}
async function sha256Hex(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, "0")).join("");
}
function chunks(text, size = CHUNK_CHARS) {
  const s = String(text ?? "");
  if (!s) return [""];
  const out = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}

export function createEmploymentR6Store(db, {
  now = () => new Date(),
  r4StoreFactory = createEmploymentR4ShadowStore,
} = {}) {
  if (!db || typeof db.prepare !== "function") throw new TypeError("D1_DATABASE_REQUIRED");
  const T = EMPLOYMENT_R6_TABLES;
  const r4 = r4StoreFactory(db, { now });
  let initialized = null;
  const stmt = (sql, values = []) => db.prepare(sql).bind(...values);

  async function initialize() {
    if (initialized) return initialized;
    initialized = (async () => {
      await r4.initialize();

      await db.prepare(`CREATE TABLE IF NOT EXISTS ${T.rawSnapshot} (
        snapshot_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        chunk_count INTEGER NOT NULL,
        release_group TEXT NOT NULL,
        provider TEXT NOT NULL,
        request_key TEXT NOT NULL,
        release_at TEXT,
        retrieved_at TEXT NOT NULL,
        http_status INTEGER,
        content_type TEXT,
        body_sha256 TEXT NOT NULL,
        body_chunk TEXT NOT NULL,
        detail_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY(snapshot_id,chunk_index)
      )`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_employment_r6_raw_snapshot_lookup_v1
        ON ${T.rawSnapshot}(release_group,retrieved_at DESC,request_key)`).run();

      await db.prepare(`CREATE TABLE IF NOT EXISTS ${T.featureHistory} (
        feature_history_id INTEGER PRIMARY KEY AUTOINCREMENT,
        feature_id TEXT NOT NULL,
        observation_date TEXT NOT NULL,
        score_as_of TEXT NOT NULL,
        formula_hash TEXT NOT NULL,
        feature_score REAL,
        raw_value REAL,
        status TEXT NOT NULL,
        source_hash TEXT NOT NULL,
        detail_json TEXT NOT NULL,
        recorded_at TEXT NOT NULL,
        UNIQUE(feature_id,observation_date,score_as_of,formula_hash,source_hash)
      )`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_employment_r6_feature_history_lookup_v1
        ON ${T.featureHistory}(feature_id,score_as_of DESC,observation_date DESC)`).run();

      await db.prepare(`CREATE TABLE IF NOT EXISTS ${T.readModel} (
        version_id TEXT PRIMARY KEY,
        score_as_of TEXT NOT NULL,
        formula_hash TEXT NOT NULL,
        data_hash TEXT NOT NULL,
        status TEXT NOT NULL,
        employment_score REAL,
        model_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        ready_at TEXT
      )`).run();
      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_employment_r6_read_model_lookup_v1
        ON ${T.readModel}(status,score_as_of DESC,ready_at DESC)`).run();

      await db.prepare(`CREATE TABLE IF NOT EXISTS ${T.readPointer} (
        pointer_key TEXT PRIMARY KEY,
        version_id TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK(pointer_key='CURRENT')
      )`).run();

      return true;
    })();
    return initialized;
  }

  async function writeRawSnapshot({
    releaseGroup,
    provider,
    requestKey,
    releaseAt = null,
    retrievedAt = now().toISOString(),
    httpStatus = null,
    contentType = null,
    body,
    detail = {},
  } = {}) {
    await initialize();
    const group = requiredText(releaseGroup, "RELEASE_GROUP");
    const prov = requiredText(provider, "PROVIDER");
    const key = requiredText(requestKey, "REQUEST_KEY");
    const rt = iso(retrievedAt, "RETRIEVED_AT");
    const ra = releaseAt == null ? null : iso(releaseAt, "RELEASE_AT");
    const text = String(body ?? "");
    const bodySha = await sha256Hex(text);
    const snapshotId = await sha256Hex(`${group}|${prov}|${key}|${bodySha}`);
    const parts = chunks(text);
    const createdAt = now().toISOString();
    let insertedChunks = 0;
    for (let i = 0; i < parts.length; i++) {
      const result = await stmt(`INSERT OR IGNORE INTO ${T.rawSnapshot} (
        snapshot_id,chunk_index,chunk_count,release_group,provider,request_key,release_at,retrieved_at,http_status,content_type,
        body_sha256,body_chunk,detail_json,created_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [
        snapshotId,i,parts.length,group,prov,key,ra,rt,
        httpStatus == null ? null : Number(httpStatus),optionalText(contentType),
        bodySha,parts[i],json(detail),createdAt,
      ]).run();
      insertedChunks += resultChanges(result);
    }
    return {
      snapshotId,
      bodySha256: bodySha,
      chunkCount: parts.length,
      insertedChunks,
      noop: insertedChunks === 0,
    };
  }

  async function upsertObservationRows(args = {}) {
    await initialize();
    return await r4.upsertRows(args);
  }

  async function recordRun(run = {}) {
    await initialize();
    return await r4.recordRun(run);
  }

  async function acquire(lockKey, options = {}) {
    await initialize();
    return await r4.acquire(lockKey, options);
  }

  async function release(lease) {
    return await r4.release(lease);
  }

  async function getLatestRun(provider) {
    await initialize();
    const row = await stmt(`SELECT * FROM ${T.runs}
      WHERE provider=? ORDER BY completed_at DESC LIMIT 1`, [requiredText(provider, "PROVIDER")]).first();
    return row ?? null;
  }

  async function getProviderRequestsSince(providerPrefix, sinceIso) {
    await initialize();
    const prefix = requiredText(providerPrefix, "PROVIDER_PREFIX");
    const since = iso(sinceIso, "SINCE");
    const row = await stmt(`SELECT COALESCE(SUM(provider_requests),0) AS n FROM ${T.runs}
      WHERE provider LIKE ? AND completed_at>=?`, [`${prefix}%`, since]).first();
    const n = Number(row?.n ?? 0);
    return finite(n) ? n : 0;
  }

  async function countRawSnapshots() {
    await initialize();
    const row = await stmt(`SELECT COUNT(DISTINCT snapshot_id) AS n FROM ${T.rawSnapshot}`).first();
    return Number(row?.n ?? 0);
  }

  return {
    initialize,
    writeRawSnapshot,
    upsertObservationRows,
    recordRun,
    acquire,
    release,
    getLatestRun,
    getProviderRequestsSince,
    countRawSnapshots,
  };
}

export const EMPLOYMENT_R6_STORE_CONTRACT = Object.freeze({
  revision: EMPLOYMENT_R6_STORE_REVISION,
  reusesObservationCurrentHistoryRunLock: true,
  rawSnapshotChunked: true,
  featureHistorySchemaReady: true,
  readModelSchemaReady: true,
  atomicReadPointerSchemaReady: true,
  scoreComputed: false,
  livePublicOutput: false,
});
