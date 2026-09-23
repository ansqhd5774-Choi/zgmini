const SECRET_KEY = /(?:user.?id|api.?key|authorization|bearer|password|secret|token)/i;

function assertText(value, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label}_REQUIRED`);
  }
  return value.trim();
}

function assertIso(value, label) {
  const text = assertText(value, label);
  if (!Number.isFinite(Date.parse(text))) {
    throw new TypeError(`${label}_INVALID`);
  }
  return text;
}

function assertHash(value) {
  const text = assertText(value, "CONTENT_HASH").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(text)) {
    throw new TypeError("CONTENT_HASH_INVALID");
  }
  return text;
}

function assertNoSecretKeys(value, path = "$") {
  if (value == null || typeof value !== "object") return;

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecretKeys(item, `${path}[${index}]`));
    return;
  }

  for (const [key, item] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) {
      throw new Error(`SECRET_LIKE_FIELD_REJECTED:${path}.${key}`);
    }
    assertNoSecretKeys(item, `${path}.${key}`);
  }
}

function safeParse(json, label) {
  try {
    return JSON.parse(json);
  } catch {
    throw new Error(`${label}_JSON_INVALID`);
  }
}

export const BREADTH_R2_D1_STORE_VERSION = "BREADTH-R2-D1-STORE-CANDIDATE-R61";

export function createBreadthR2D1Store(db) {
  if (!db || typeof db.prepare !== "function") {
    throw new TypeError("D1_DATABASE_REQUIRED");
  }

  let initialized;

  const stmt = (sql, values = []) => db.prepare(sql).bind(...values);

  const initialize = async () => {
    if (initialized) return initialized;

    initialized = (async () => {
      // Initialize sequentially because later DDL depends on earlier tables.
      // Some SQLite/D1-compatible runtimes validate referenced tables at prepare-time.
      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_breadth_r2_raw_v1 (
        content_hash TEXT PRIMARY KEY,
        source_key TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        first_retrieved_at TEXT NOT NULL
      )`).run();

      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_breadth_r2_event_v1 (
        event_id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_key TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        retrieved_at TEXT NOT NULL,
        event_type TEXT NOT NULL,
        FOREIGN KEY(content_hash) REFERENCES market_score_breadth_r2_raw_v1(content_hash)
      )`).run();

      await db.prepare(`CREATE INDEX IF NOT EXISTS market_score_breadth_r2_event_source_time_v1
        ON market_score_breadth_r2_event_v1(source_key, retrieved_at DESC, event_id DESC)`).run();

      await db.prepare(`CREATE TABLE IF NOT EXISTS market_score_breadth_r2_snapshot_v1 (
        cache_key TEXT PRIMARY KEY,
        body_json TEXT NOT NULL,
        cached_at TEXT NOT NULL
      )`).run();
    })().catch(error => {
      initialized = null;
      throw error;
    });

    return initialized;
  };

  return {
    async getLatestRaw(sourceKey) {
      await initialize();
      const key = assertText(sourceKey, "SOURCE_KEY");

      const row = await stmt(
        `SELECT r.content_hash, r.source_key, r.payload_json, e.retrieved_at
         FROM market_score_breadth_r2_event_v1 e
         JOIN market_score_breadth_r2_raw_v1 r
           ON r.content_hash = e.content_hash
         WHERE e.source_key = ?
         ORDER BY e.retrieved_at DESC, e.event_id DESC
         LIMIT 1`,
        [key]
      ).first();

      if (!row) return null;

      return {
        sourceKey: row.source_key,
        contentHash: row.content_hash,
        retrievedAt: row.retrieved_at,
        payload: safeParse(row.payload_json, "RAW_PAYLOAD"),
      };
    },

    async putRaw(record) {
      await initialize();

      if (!record || typeof record !== "object") {
        throw new TypeError("RAW_RECORD_REQUIRED");
      }

      const sourceKey = assertText(record.sourceKey, "SOURCE_KEY");
      const contentHash = assertHash(record.contentHash);
      const retrievedAt = assertIso(record.retrievedAt, "RETRIEVED_AT");

      assertNoSecretKeys(record.payload);
      const payloadJson = JSON.stringify(record.payload);

      const existing = await stmt(
        `SELECT source_key, payload_json, first_retrieved_at
         FROM market_score_breadth_r2_raw_v1
         WHERE content_hash = ? LIMIT 1`,
        [contentHash]
      ).first();

      if (
        existing &&
        (existing.source_key !== sourceKey || existing.payload_json !== payloadJson)
      ) {
        throw new Error("CONTENT_HASH_COLLISION_OR_PAYLOAD_MISMATCH");
      }

      const insertRaw = stmt(
        `INSERT OR IGNORE INTO market_score_breadth_r2_raw_v1
          (content_hash, source_key, payload_json, first_retrieved_at)
         VALUES(?,?,?,?)`,
        [contentHash, sourceKey, payloadJson, retrievedAt]
      );

      const insertEvent = stmt(
        `INSERT INTO market_score_breadth_r2_event_v1
          (source_key, content_hash, retrieved_at, event_type)
         VALUES(?,?,?,?)`,
        [sourceKey, contentHash, retrievedAt, existing ? "RAW_SEEN_AGAIN" : "RAW_STORED"]
      );

      if (typeof db.batch === "function") {
        await db.batch([insertRaw, insertEvent]);
      } else {
        await insertRaw.run();
        await insertEvent.run();
      }

      return {
        deduplicated: Boolean(existing),
        record: {
          sourceKey,
          contentHash,
          retrievedAt,
          payload: record.payload,
        },
      };
    },

    async getSnapshot(cacheKey) {
      await initialize();
      const key = assertText(cacheKey, "CACHE_KEY");

      const row = await stmt(
        `SELECT body_json FROM market_score_breadth_r2_snapshot_v1
         WHERE cache_key = ? LIMIT 1`,
        [key]
      ).first();

      return row ? safeParse(row.body_json, "SNAPSHOT") : null;
    },

    async putSnapshot(cacheKey, value) {
      await initialize();

      const key = assertText(cacheKey, "CACHE_KEY");
      if (!value || typeof value !== "object") {
        throw new TypeError("SNAPSHOT_VALUE_REQUIRED");
      }

      assertNoSecretKeys(value);
      const cachedAt = assertIso(value.cachedAt, "SNAPSHOT_CACHED_AT");
      const bodyJson = JSON.stringify(value);

      await stmt(
        `INSERT INTO market_score_breadth_r2_snapshot_v1
          (cache_key, body_json, cached_at)
         VALUES(?,?,?)
         ON CONFLICT(cache_key) DO UPDATE SET
           body_json=excluded.body_json,
           cached_at=excluded.cached_at`,
        [key, bodyJson, cachedAt]
      ).run();

      return value;
    },
  };
}
