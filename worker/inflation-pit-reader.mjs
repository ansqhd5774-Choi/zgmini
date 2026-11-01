import {INFLATION_PIT_SERIES} from './inflation-pit-backfill.mjs';

const validDate = value =>
  typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().slice(0, 10) === value;
const finite = value => typeof value === 'number' && Number.isFinite(value);

function parseArray(value) {
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
  throw new Error('PIT_HISTORY_DB_READ_UNSUPPORTED');
}

function normalizedRow(row) {
  return {
    observationDate: validDate(row?.observationDate) ? row.observationDate : null,
    value: finite(row?.value) ? row.value : null,
    releaseDate: validDate(row?.releaseDate) ? row.releaseDate : null,
    availableAt: validDate(row?.availableAt) ? row.availableAt : null,
    realtimeStart: validDate(row?.realtimeStart) ? row.realtimeStart : null,
    realtimeEnd: validDate(row?.realtimeEnd) ? row.realtimeEnd : null,
    vintageId: typeof row?.vintageId === 'string' ? row.vintageId : null,
    vintageMethod: typeof row?.vintageMethod === 'string' ? row.vintageMethod : null,
    revision: typeof row?.revision === 'string' ? row.revision : null,
  };
}

/** @param {D1Database|undefined} db @param {{asOf?:string,seriesIds?:readonly string[]}} [options] @returns {Promise<{status:string,source:string,asOf:string,series:Record<string,ReturnType<typeof normalizedRow>[]>,snapshots:Record<string,unknown>,missing:string[],issues:string[],lookAheadSafe:boolean}>} */
export async function loadStoredInflationPitSeries(db, {
  asOf,
  seriesIds = INFLATION_PIT_SERIES,
} = {}) {
  if (!validDate(asOf)) throw new Error('PIT_HISTORY_ASOF_INVALID');
  if (!db || typeof db.prepare !== 'function') {
    return {
      status: 'STORAGE_UNAVAILABLE',
      source: 'STORED_INITIAL_RELEASE_HISTORY_ONLY',
      asOf,
      series: {},
      snapshots: {},
      missing: [...seriesIds],
      issues: ['DB_UNAVAILABLE'],
      lookAheadSafe: false,
    };
  }

  /** @type {Record<string,ReturnType<typeof normalizedRow>[]>} */
  const series = {};
  const snapshots = {};
  const missing = [];
  const issues = [];

  for (const dataset of seriesIds) {
    if (!INFLATION_PIT_SERIES.includes(dataset)) {
      missing.push(dataset);
      issues.push(`${dataset}:SERIES_NOT_ALLOWED`);
      continue;
    }
    let snapshot;
    try {
      snapshot = await firstRow(
        db,
        `SELECT snapshot_sha256,as_of,retrieved_at,status,history_mode,row_count,
                latest_observation_date,chunk_hashes_json,provenance_json
           FROM api_history_snapshots_v1
          WHERE provider=? AND dataset=? AND history_mode='INITIAL_RELEASE_ONLY'
          ORDER BY retrieved_at DESC
          LIMIT 1`,
        ['FRED', dataset],
      );
    } catch (error) {
      missing.push(dataset);
      issues.push(`${dataset}:SNAPSHOT_READ:${error instanceof Error ? error.message : 'UNKNOWN'}`);
      continue;
    }
    if (!snapshot) {
      missing.push(dataset);
      continue;
    }

    const chunkHashes = parseArray(snapshot.chunk_hashes_json);
    const rawRows = [];
    let failed = false;
    for (const chunkHash of chunkHashes) {
      try {
        const chunk = await firstRow(
          db,
          `SELECT payload_json
             FROM api_history_chunks_v1
            WHERE provider=? AND dataset=? AND chunk_sha256=?
            LIMIT 1`,
          ['FRED', dataset, chunkHash],
        );
        const rows = parseArray(chunk?.payload_json);
        if (!rows.length) throw new Error('CHUNK_EMPTY');
        rawRows.push(...rows);
      } catch (error) {
        failed = true;
        issues.push(`${dataset}:CHUNK_READ:${error instanceof Error ? error.message : 'UNKNOWN'}`);
        break;
      }
    }
    if (failed) {
      missing.push(dataset);
      continue;
    }

    const byObservation = new Map();
    for (const raw of rawRows) {
      const row = normalizedRow(raw);
      const available = row.availableAt ?? row.releaseDate ?? row.realtimeStart;
      if (!row.observationDate || row.value === null || !available) continue;
      if (row.observationDate > asOf || available > asOf) continue;
      const prior = byObservation.get(row.observationDate);
      if (!prior || available < prior.availableAt) {
        byObservation.set(row.observationDate, {...row, availableAt: available});
      }
    }
    const rows = [...byObservation.values()]
      .sort((a, b) => a.observationDate.localeCompare(b.observationDate));

    if (!rows.length) {
      missing.push(dataset);
      issues.push(`${dataset}:NO_ASOF_ROWS`);
      continue;
    }
    series[dataset] = rows;
    snapshots[dataset] = {
      snapshotSha256: snapshot.snapshot_sha256 ?? null,
      retrievedAt: snapshot.retrieved_at ?? null,
      historyMode: snapshot.history_mode ?? null,
      rowCount: Number(snapshot.row_count ?? 0),
    };
  }

  const count = Object.keys(series).length;
  return {
    status: count === seriesIds.length
      ? 'READY_STORED_PIT_HISTORY'
      : count > 0 ? 'PARTIAL_STORED_PIT_HISTORY' : 'NO_STORED_PIT_HISTORY',
    source: 'STORED_INITIAL_RELEASE_HISTORY_ONLY',
    asOf,
    series,
    snapshots,
    missing,
    issues,
    lookAheadSafe: count > 0 && issues.length === 0,
  };
}

export const INFLATION_PIT_READER_CONTRACT = Object.freeze({
  schemaVersion: 1,
  source: 'STORED_INITIAL_RELEASE_HISTORY_ONLY',
  requiredHistoryMode: 'INITIAL_RELEASE_ONLY',
  filtersAvailableAt: true,
  networkRequests: 0,
  providerRequests: 0,
});
