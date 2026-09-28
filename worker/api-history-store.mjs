// Append-only, content-addressed API history for inflation inputs.
// Uses the existing D1 binding. It does not change scoring or provider request counts.
const INFLATION_SERIES = Object.freeze([
  'PCEPILFE',
  'PCEPI',
  'CPILFESL',
  'CPIAUCSL',
  'EXPINF5YR',
  'INDPRO',
  'MCOILWTICO',
  'GASREGCOVM',
  'MEDCPIM094SFRBCLE',
  'TRMMEANCPIM094SFRBCLE',
  'PPIFIS',
  'WPSFD49116',
  'IREXFUELS',
  'CES0500000003',
  'ECIALLCIV',
  'PRS85006111',
]);
const INFLATION_SET = new Set(INFLATION_SERIES);
const READY_HISTORY_STATUSES = new Set(['READY_CURRENT_VINTAGE', 'READY_INITIAL_RELEASE_HISTORY', 'READY_PCE_SAME_VINTAGE_PC1']);
const MAX_ROWS_PER_CHUNK = 400;
const MAX_CHUNK_BYTES = 1_000_000;
const MAX_BATCH_STATEMENTS = 40;
const encoder = new TextEncoder();
const initByDb = new WeakMap();

const finite = value => typeof value === 'number' && Number.isFinite(value);
const textOrNull = value => typeof value === 'string' && value ? value : null;
const bytes = value => encoder.encode(value).byteLength;

async function sha256Hex(value) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

function normalizeRow(row) {
  return {
    observationDate: textOrNull(row?.observationDate),
    value: finite(row?.value) ? row.value : null,
    releaseDate: textOrNull(row?.releaseDate),
    availableAt: textOrNull(row?.availableAt),
    realtimeStart: textOrNull(row?.realtimeStart),
    realtimeEnd: textOrNull(row?.realtimeEnd),
    vintageId: textOrNull(row?.vintageId),
    vintageMethod: textOrNull(row?.vintageMethod),
    revision: textOrNull(row?.revision),
  };
}

function sortRows(rows) {
  return rows
    .map(normalizeRow)
    .filter(row => row.observationDate && row.value !== null)
    .sort((a, b) => (
      a.observationDate.localeCompare(b.observationDate)
      || String(a.vintageId ?? '').localeCompare(String(b.vintageId ?? ''))
      || JSON.stringify(a).localeCompare(JSON.stringify(b))
    ));
}

function chunkRows(rows) {
  const chunks = [];
  let current = [];
  let currentBytes = 2;
  for (const row of rows) {
    const rowJson = JSON.stringify(row);
    const rowBytes = bytes(rowJson) + (current.length ? 1 : 0);
    if (rowBytes + 2 > MAX_CHUNK_BYTES) throw new Error('API_HISTORY_ROW_TOO_LARGE');
    if (current.length && (
      current.length >= MAX_ROWS_PER_CHUNK
      || currentBytes + rowBytes > MAX_CHUNK_BYTES
    )) {
      chunks.push(current);
      current = [];
      currentBytes = 2;
    }
    current.push(row);
    currentBytes += rowBytes;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

async function datasetPlan(result, {asOf, retrievedAt}) {
  const provider = 'FRED';
  const dataset = result.seriesId;
  const rows = sortRows(result.rows);
  if (!rows.length) return null;
  const chunks = [];
  for (const group of chunkRows(rows)) {
    const payloadJson = JSON.stringify(group);
    const chunkSha256 = await sha256Hex(payloadJson);
    chunks.push({
      chunkSha256,
      firstObservationDate: group[0]?.observationDate ?? null,
      lastObservationDate: group.at(-1)?.observationDate ?? null,
      rowCount: group.length,
      payloadJson,
    });
  }
  const provenance = {
    authority: textOrNull(result.authority),
    transport: textOrNull(result.transport),
    frequency: textOrNull(result.frequency),
    historyMode: textOrNull(result.historyMode),
    releaseDatePolicy: textOrNull(result.releaseDatePolicy),
    availableAtPolicy: textOrNull(result.availableAtPolicy),
    sourceCount: Number.isInteger(result.sourceCount) ? result.sourceCount : null,
    requestCount: Number.isInteger(result.requestCount) ? result.requestCount : null,
  };
  const identity = JSON.stringify({
    schemaVersion: 1,
    provider,
    dataset,
    provenance,
    chunks: chunks.map(chunk => chunk.chunkSha256),
  });
  return {
    provider,
    dataset,
    snapshotSha256: await sha256Hex(identity),
    asOf,
    retrievedAt,
    status: result.status,
    historyMode: textOrNull(result.historyMode),
    rowCount: rows.length,
    latestObservationDate: rows.at(-1)?.observationDate ?? null,
    chunkHashesJson: JSON.stringify(chunks.map(chunk => chunk.chunkSha256)),
    provenanceJson: JSON.stringify(provenance),
    chunks,
  };
}

export async function buildInflationHistoryPlan(fredResults, {
  asOf,
  retrievedAt = new Date().toISOString(),
} = {}) {
  if (!Array.isArray(fredResults)) throw new Error('API_HISTORY_RESULTS_REQUIRED');
  if (typeof asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    throw new Error('API_HISTORY_ASOF_INVALID');
  }
  if (typeof retrievedAt !== 'string' || !Number.isFinite(Date.parse(retrievedAt))) {
    throw new Error('API_HISTORY_RETRIEVED_AT_INVALID');
  }
  const ready = fredResults.filter(result => (
    INFLATION_SET.has(result?.seriesId)
    && READY_HISTORY_STATUSES.has(result?.status)
    && Array.isArray(result?.rows)
    && result.rows.length
  ));
  const plans = [];
  for (const result of ready) {
    const plan = await datasetPlan(result, {asOf, retrievedAt});
    if (plan) plans.push(plan);
  }
  return plans.sort((a, b) => a.dataset.localeCompare(b.dataset));
}

async function ensureTables(db) {
  let pending = initByDb.get(db);
  if (!pending) {
    pending = db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS api_history_chunks_v1 (
        provider TEXT NOT NULL,
        dataset TEXT NOT NULL,
        chunk_sha256 TEXT NOT NULL,
        first_observation_date TEXT,
        last_observation_date TEXT,
        row_count INTEGER NOT NULL,
        payload_json TEXT NOT NULL,
        first_seen_at TEXT NOT NULL,
        PRIMARY KEY(provider, dataset, chunk_sha256)
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS api_history_snapshots_v1 (
        provider TEXT NOT NULL,
        dataset TEXT NOT NULL,
        snapshot_sha256 TEXT NOT NULL,
        as_of TEXT NOT NULL,
        retrieved_at TEXT NOT NULL,
        status TEXT NOT NULL,
        history_mode TEXT,
        row_count INTEGER NOT NULL,
        latest_observation_date TEXT,
        chunk_hashes_json TEXT NOT NULL,
        provenance_json TEXT NOT NULL,
        PRIMARY KEY(provider, dataset, snapshot_sha256)
      )`),
      db.prepare(`CREATE INDEX IF NOT EXISTS api_history_snapshots_lookup_v1
        ON api_history_snapshots_v1(provider, dataset, retrieved_at DESC)`),
    ]).catch(error => {
      initByDb.delete(db);
      throw error;
    });
    initByDb.set(db, pending);
  }
  await pending;
}

function insertStatements(db, plans) {
  const out = [];
  for (const plan of plans) {
    for (const chunk of plan.chunks) {
      out.push(
        db.prepare(`INSERT OR IGNORE INTO api_history_chunks_v1(
          provider,dataset,chunk_sha256,first_observation_date,last_observation_date,
          row_count,payload_json,first_seen_at
        ) VALUES(?,?,?,?,?,?,?,?)`).bind(
          plan.provider,
          plan.dataset,
          chunk.chunkSha256,
          chunk.firstObservationDate,
          chunk.lastObservationDate,
          chunk.rowCount,
          chunk.payloadJson,
          plan.retrievedAt,
        ),
      );
    }
    out.push(
      db.prepare(`INSERT OR IGNORE INTO api_history_snapshots_v1(
        provider,dataset,snapshot_sha256,as_of,retrieved_at,status,history_mode,
        row_count,latest_observation_date,chunk_hashes_json,provenance_json
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(
        plan.provider,
        plan.dataset,
        plan.snapshotSha256,
        plan.asOf,
        plan.retrievedAt,
        plan.status,
        plan.historyMode,
        plan.rowCount,
        plan.latestObservationDate,
        plan.chunkHashesJson,
        plan.provenanceJson,
      ),
    );
  }
  return out;
}

export async function persistInflationApiHistory(db, fredResults, {
  asOf,
  retrievedAt = new Date().toISOString(),
} = {}) {
  if (!db || typeof db.prepare !== 'function' || typeof db.batch !== 'function') {
    return {
      status: 'SKIPPED_DB_UNAVAILABLE',
      datasetCount: 0,
      rowCount: 0,
      chunkCount: 0,
      statements: 0,
      rowsWritten: 0,
    };
  }
  const plans = await buildInflationHistoryPlan(fredResults, {asOf, retrievedAt});
  if (!plans.length) {
    return {
      status: 'NO_READY_INFLATION_DATA',
      datasetCount: 0,
      rowCount: 0,
      chunkCount: 0,
      statements: 0,
      rowsWritten: 0,
    };
  }
  await ensureTables(db);
  const statements = insertStatements(db, plans);
  let rowsWritten = 0;
  for (let offset = 0; offset < statements.length; offset += MAX_BATCH_STATEMENTS) {
    const result = await db.batch(statements.slice(offset, offset + MAX_BATCH_STATEMENTS));
    for (const item of result ?? []) {
      const changes = Number(item?.meta?.changes ?? item?.meta?.rows_written ?? 0);
      if (Number.isFinite(changes) && changes > 0) rowsWritten += changes;
    }
  }
  return {
    status: 'STORED',
    datasetCount: plans.length,
    rowCount: plans.reduce((sum, plan) => sum + plan.rowCount, 0),
    chunkCount: plans.reduce((sum, plan) => sum + plan.chunks.length, 0),
    statements: statements.length,
    rowsWritten,
  };
}

export const API_HISTORY_INFLATION_CONTRACT = Object.freeze({
  schemaVersion: 1,
  mode: 'APPEND_ONLY_CONTENT_ADDRESSED',
  datasets: INFLATION_SERIES,
  acceptedStatuses: Object.freeze([...READY_HISTORY_STATUSES]),
  providerRequestsAdded: 0,
  scoringChanged: false,
  publicApiContractChanged: false,
  maxRowsPerChunk: MAX_ROWS_PER_CHUNK,
  maxChunkBytes: MAX_CHUNK_BYTES,
  maxBatchStatements: MAX_BATCH_STATEMENTS,
});
