// Read-only inflation scoring input adapter.
// Scoring consumes only stored API history. Live provider rows are never used as a fallback.
export const INFLATION_SCORING_SERIES = Object.freeze([
  'PCEPILFE',
  'PCEPI',
  'CPILFESL',
  'CPIAUCSL',
  'EXPINF5YR',
]);

const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);

function normalizeStoredRow(row) {
  return {
    observationDate: typeof row?.observationDate === 'string' ? row.observationDate : null,
    value: finite(row?.value) ? row.value : null,
    releaseDate: typeof row?.releaseDate === 'string' ? row.releaseDate : null,
    availableAt: typeof row?.availableAt === 'string' ? row.availableAt : null,
    realtimeStart: typeof row?.realtimeStart === 'string' ? row.realtimeStart : null,
    realtimeEnd: typeof row?.realtimeEnd === 'string' ? row.realtimeEnd : null,
    vintageId: typeof row?.vintageId === 'string' ? row.vintageId : null,
    vintageMethod: typeof row?.vintageMethod === 'string' ? row.vintageMethod : null,
    revision: typeof row?.revision === 'string' ? row.revision : null,
  };
}

function parseJsonArray(value) {
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function firstRow(db, sql, args) {
  const statement = db.prepare(sql).bind(...args);
  if (typeof statement.first === 'function') return await statement.first();
  if (typeof statement.all === 'function') {
    const result = await statement.all();
    return Array.isArray(result?.results) ? result.results[0] ?? null : null;
  }
  throw new Error('API_HISTORY_DB_READ_UNSUPPORTED');
}

export async function loadStoredInflationSeries(db, {asOf} = {}) {
  if (!validDate(asOf)) throw new Error('API_HISTORY_ASOF_INVALID');
  if (!db || typeof db.prepare !== 'function') {
    return {
      status: 'STORAGE_UNAVAILABLE',
      source: 'STORED_HISTORY_ONLY',
      asOf,
      series: {},
      snapshots: {},
      missing: [...INFLATION_SCORING_SERIES],
      issues: ['DB_UNAVAILABLE'],
    };
  }

  const cutoff = `${asOf}T23:59:59.999Z`;
  const series = {};
  const snapshots = {};
  const missing = [];
  const issues = [];

  for (const dataset of INFLATION_SCORING_SERIES) {
    let snapshot;
    try {
      snapshot = await firstRow(
        db,
        `SELECT snapshot_sha256,as_of,retrieved_at,status,history_mode,row_count,
                latest_observation_date,chunk_hashes_json,provenance_json
           FROM api_history_snapshots_v1
          WHERE provider=? AND dataset=? AND history_mode='CURRENT_VINTAGE_ONLY' AND as_of<=? AND retrieved_at<=?
          ORDER BY as_of DESC,retrieved_at DESC
          LIMIT 1`,
        ['FRED', dataset, asOf, cutoff],
      );
    } catch (error) {
      missing.push(dataset);
      issues.push(`${dataset}:SNAPSHOT_READ:${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`);
      continue;
    }

    if (!snapshot) {
      missing.push(dataset);
      continue;
    }

    const chunkHashes = parseJsonArray(snapshot.chunk_hashes_json);
    const rows = [];
    let chunkFailure = false;
    for (const chunkHash of chunkHashes) {
      let chunk;
      try {
        chunk = await firstRow(
          db,
          `SELECT payload_json
             FROM api_history_chunks_v1
            WHERE provider=? AND dataset=? AND chunk_sha256=?
            LIMIT 1`,
          ['FRED', dataset, chunkHash],
        );
      } catch (error) {
        chunkFailure = true;
        issues.push(`${dataset}:CHUNK_READ:${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`);
        break;
      }
      const payloadRows = parseJsonArray(chunk?.payload_json);
      if (!chunk || !payloadRows.length) {
        chunkFailure = true;
        issues.push(`${dataset}:CHUNK_MISSING:${String(chunkHash)}`);
        break;
      }
      rows.push(...payloadRows);
    }

    if (chunkFailure) {
      missing.push(dataset);
      continue;
    }

    const normalized = rows
      .map(normalizeStoredRow)
      .filter(row => row.observationDate && row.observationDate <= asOf && row.value !== null)
      .sort((a, b) => (
        a.observationDate.localeCompare(b.observationDate)
        || String(a.vintageId ?? '').localeCompare(String(b.vintageId ?? ''))
      ));

    if (!normalized.length) {
      missing.push(dataset);
      issues.push(`${dataset}:NO_VALID_ROWS`);
      continue;
    }

    series[dataset] = normalized;
    snapshots[dataset] = {
      snapshotSha256: snapshot.snapshot_sha256 ?? null,
      asOf: snapshot.as_of ?? null,
      retrievedAt: snapshot.retrieved_at ?? null,
      status: snapshot.status ?? null,
      historyMode: snapshot.history_mode ?? null,
      rowCount: Number.isInteger(snapshot.row_count) ? snapshot.row_count : null,
      latestObservationDate: snapshot.latest_observation_date ?? null,
      provenanceJson: snapshot.provenance_json ?? null,
    };
  }

  const readyCount = Object.keys(series).length;
  return {
    status: readyCount === INFLATION_SCORING_SERIES.length
      ? 'READY_STORED_HISTORY'
      : readyCount > 0
        ? 'PARTIAL_STORED_HISTORY'
        : 'NO_STORED_HISTORY',
    source: 'STORED_HISTORY_ONLY',
    asOf,
    series,
    snapshots,
    missing,
    issues,
  };
}

export function buildStoredInflationScoringSeries(liveSeries, storedHistory) {
  const scoringSeries = {...(liveSeries ?? {})};
  for (const seriesId of INFLATION_SCORING_SERIES) delete scoringSeries[seriesId];
  for (const seriesId of INFLATION_SCORING_SERIES) {
    const rows = storedHistory?.series?.[seriesId];
    if (Array.isArray(rows) && rows.length) scoringSeries[seriesId] = rows;
  }
  return scoringSeries;
}

export const INFLATION_HISTORY_READER_CONTRACT = Object.freeze({
  schemaVersion: 1,
  scoringSource: 'STORED_HISTORY_ONLY',
  liveProviderFallback: false,
  networkRequests: 0,
  providerRequests: 0,
  datasets: INFLATION_SCORING_SERIES,
});
