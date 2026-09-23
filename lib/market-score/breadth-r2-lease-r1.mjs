export const BREADTH_R2_LEASE_R1 = "BREADTH-R2-LEASE-R1";

function text(value, label) {
  const out = String(value ?? "").trim();
  if (!out) throw new TypeError(`${label}_REQUIRED`);
  return out;
}

function resultChanges(result) {
  const value =
    result?.meta?.changes ??
    result?.changes ??
    result?.changesCount ??
    0;
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createBreadthR2LeaseR1(db, {
  now = () => new Date(),
  ttlMs = 60_000,
  tokenFactory = () => globalThis.crypto.randomUUID(),
} = {}) {
  if (!db || typeof db.prepare !== "function") throw new TypeError("D1_DATABASE_REQUIRED");
  let initialized = null;

  async function initialize() {
    if (initialized) return initialized;
    initialized = db.prepare(`CREATE TABLE IF NOT EXISTS market_score_breadth_r2_lock_v1 (
      lock_key TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )`).run().catch(error => {
      initialized = null;
      throw error;
    });
    return initialized;
  }

  async function acquire(lockKey) {
    await initialize();
    const key = text(lockKey, "LOCK_KEY");
    const token = text(tokenFactory(), "LOCK_TOKEN");
    const nowDate = now();
    const nowIso = (nowDate instanceof Date ? nowDate : new Date(nowDate)).toISOString();
    const expiresAt = new Date(Date.parse(nowIso) + ttlMs).toISOString();

    const result = await db.prepare(
      `INSERT INTO market_score_breadth_r2_lock_v1(lock_key,token,expires_at)
       VALUES(?,?,?)
       ON CONFLICT(lock_key) DO UPDATE SET
         token=excluded.token,
         expires_at=excluded.expires_at
       WHERE market_score_breadth_r2_lock_v1.expires_at <= ?`
    ).bind(key, token, expiresAt, nowIso).run();

    return resultChanges(result) > 0
      ? { acquired: true, key, token, expiresAt }
      : { acquired: false, key, token: null, expiresAt: null };
  }

  async function release(lease) {
    if (!lease?.acquired || !lease?.token) return false;
    const result = await db.prepare(
      `DELETE FROM market_score_breadth_r2_lock_v1
       WHERE lock_key = ? AND token = ?`
    ).bind(lease.key, lease.token).run();
    return resultChanges(result) > 0;
  }

  async function withLease(lockKey, operation, {
    maxWaitMs = 10_000,
    pollMs = 100,
  } = {}) {
    if (typeof operation !== "function") throw new TypeError("LEASE_OPERATION_REQUIRED");
    const started = Date.now();

    while (Date.now() - started <= maxWaitMs) {
      const lease = await acquire(lockKey);
      if (lease.acquired) {
        try {
          return await operation(lease);
        } finally {
          await release(lease).catch(() => false);
        }
      }
      await sleep(pollMs);
    }

    throw new Error("BREADTH_R2_COLLECTION_LEASE_TIMEOUT");
  }

  return { initialize, acquire, release, withLease };
}
