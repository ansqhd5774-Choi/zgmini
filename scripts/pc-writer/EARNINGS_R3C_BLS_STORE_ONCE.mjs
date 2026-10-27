// Earnings Companion C / R3-C: approved single manual BLS capture into existing PC SQLite.
// No table creation, schema migration, replacement, deletion, D1, scheduler or score changes.
// Runtime: Node >=22.13 with node:sqlite. Credentials are never logged or persisted.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';
import {DatabaseSync} from 'node:sqlite';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PC_ROOT = path.resolve(process.env.ZGMINI_PC_HOME || 'E:\\ZGmini\\data\\pc-writer');
const DB_PATH = path.join(PC_ROOT, 'storage', 'core.sqlite');
const API = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
const SERIES = Object.freeze(['WPSFD4', 'WPSFD41', 'PRS85006111']);
const CONTRACT = 'EARNINGS_COMPANION_R3C_BLS_DIRECT_V1';
const YEAR_START = 2025;
const YEAR_END = 2026;
const MAX_RESPONSE_BYTES = 3_000_000;
const CHUNKS = 'api_history_chunks_v1';
const SNAPSHOTS = 'api_history_snapshots_v1';

const REQUIRED_COLUMNS = Object.freeze({
  [CHUNKS]: [
    'provider', 'dataset', 'chunk_sha256', 'first_observation_date',
    'last_observation_date', 'row_count', 'payload_json', 'first_seen_at',
  ],
  [SNAPSHOTS]: [
    'provider', 'dataset', 'snapshot_sha256', 'as_of', 'retrieved_at',
    'status', 'history_mode', 'row_count', 'latest_observation_date',
    'chunk_hashes_json', 'provenance_json',
  ],
});
const PRIMARY_KEYS = Object.freeze({
  [CHUNKS]: ['provider', 'dataset', 'chunk_sha256'],
  [SNAPSHOTS]: ['provider', 'dataset', 'snapshot_sha256'],
});

const sha = data => crypto.createHash('sha256').update(data, 'utf8').digest('hex');
const err = code => { throw Error(code); };
const isoDate = stamp => new Date(stamp).toISOString().slice(0, 10);
const periodFor = (year, period) => period.startsWith('M')
  ? `${year}-${period.slice(1)}-01`
  : `${year}-Q${Number(period.slice(1))}`;
const numeric = text => typeof text === 'string'
  && /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text)
  && Number.isFinite(Number(text));

function checkSchema(db) {
  const names = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN (?,?)`)
    .all(CHUNKS, SNAPSHOTS).map(row => row.name);
  if (names.length !== 2) err('EXISTING_TABLE_MISSING_NO_WRITE');
  const triggers = db.prepare(`SELECT name FROM sqlite_master WHERE type='trigger'
    AND tbl_name IN (?,?) LIMIT 1`).all(CHUNKS, SNAPSHOTS);
  if (triggers.length) err('EXISTING_TRIGGER_PRESENT_NO_WRITE');
  for (const table of [CHUNKS, SNAPSHOTS]) {
    const info = db.prepare(`PRAGMA table_info("${table}")`).all();
    const actual = new Set(info.map(item => item.name));
    for (const column of REQUIRED_COLUMNS[table]) {
      if (!actual.has(column)) err('EXISTING_SCHEMA_MISMATCH_NO_WRITE');
    }
    const pk = info.filter(item => item.pk > 0).sort((a,b) => a.pk - b.pk).map(item => item.name);
    if (JSON.stringify(pk) !== JSON.stringify(PRIMARY_KEYS[table])) {
      err('EXISTING_PRIMARY_KEY_MISMATCH_NO_WRITE');
    }
    for (const column of REQUIRED_COLUMNS[table]) {
      const field = info.find(item => item.name === column);
      const expectsInteger = column === 'row_count';
      if (String(field.type).toUpperCase() !== (expectsInteger ? 'INTEGER' : 'TEXT')) {
        err('EXISTING_COLUMN_TYPE_MISMATCH_NO_WRITE');
      }
    }
  }
  // A provider namespace collision must not be interpreted as our own prior successful write.
  const snapshots = db.prepare(`SELECT dataset,provenance_json,chunk_hashes_json
    FROM ${SNAPSHOTS} WHERE provider='BLS' AND dataset IN (?,?,?)`)
    .all(...SERIES);
  const chunks = db.prepare(`SELECT dataset,chunk_sha256,payload_json
    FROM ${CHUNKS} WHERE provider='BLS' AND dataset IN (?,?,?)`)
    .all(...SERIES);
  const referenced = new Set();
  for (const row of snapshots) {
    let meta, hashes;
    try {
      meta = JSON.parse(row.provenance_json);
      hashes = JSON.parse(row.chunk_hashes_json);
    } catch { err('PRIOR_BLS_PROVENANCE_INVALID_NO_WRITE'); }
    if (meta?.contract !== CONTRACT || !Array.isArray(hashes)
      || hashes.length < 1 || hashes.some(h => !/^[a-f0-9]{64}$/.test(h))) {
      err('PRIOR_BLS_NAMESPACE_CONFLICT_NO_WRITE');
    }
    hashes.forEach(hash => referenced.add(`${row.dataset}|${hash}`));
  }
  for (const row of chunks) {
    if (!referenced.has(`${row.dataset}|${row.chunk_sha256}`)
      || sha(row.payload_json) !== row.chunk_sha256) {
      err('PRIOR_BLS_CHUNK_CONFLICT_NO_WRITE');
    }
  }
  if (chunks.length !== referenced.size) err('PRIOR_BLS_REFERENCES_INCOMPLETE_NO_WRITE');
  return {existingSnapshots:snapshots.length, existingChunks:chunks.length};
}

function readKey() {
  let disk = {};
  const location = path.join(PC_ROOT, 'providers.env');
  if (fs.existsSync(location)) {
    if (fs.statSync(location).size > 150_000) err('LOCAL_PROVIDERS_ENV_OVERSIZE');
    try { disk = parseEnv(fs.readFileSync(location, 'utf8')); }
    catch { err('LOCAL_PROVIDERS_ENV_PARSE_FAILED'); }
  }
  const key = String(disk.BLS_API_KEY || disk.BLS_REGISTRATION_KEY
    || disk.BLS_REGISTRATIONKEY || process.env.BLS_API_KEY
    || process.env.BLS_REGISTRATION_KEY || '').trim();
  if (!key) err('BLS_REGISTERED_KEY_MISSING_NO_REQUEST');
  return key;
}

async function fetchDirect(key, counters) {
  counters.requests += 1;
  let response;
  try {
    response = await fetch(API, {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({seriesid:SERIES, startyear:String(YEAR_START),
        endyear:String(YEAR_END), registrationkey:key}),
      redirect:'error',
      signal:AbortSignal.timeout(20_000),
    });
  } catch { err('BLS_NETWORK_FAILURE_NO_WRITE'); }
  if (!response.ok) {
    try { await response.body?.cancel(); } catch {}
    err(`BLS_HTTP_${response.status}_NO_WRITE`);
  }
  const reader = response.body?.getReader();
  if (!reader) err('BLS_BODY_MISSING_NO_WRITE');
  const portions = [];
  let size = 0;
  try {
    for (;;) {
      const {done,value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        err('BLS_RESPONSE_TOO_LARGE_NO_WRITE');
      }
      portions.push(value);
    }
  } catch (e) {
    if (e.message === 'BLS_RESPONSE_TOO_LARGE_NO_WRITE') throw e;
    err('BLS_RESPONSE_READ_FAILED_NO_WRITE');
  }
  const bytes = Buffer.concat(portions.map(part => Buffer.from(part)));
  let parsed;
  try { parsed = JSON.parse(bytes.toString('utf8')); }
  catch { err('BLS_JSON_INVALID_NO_WRITE'); }
  if (parsed?.status !== 'REQUEST_SUCCEEDED') err('BLS_API_REJECTED_NO_WRITE');
  return {body:parsed, responseHash:sha(bytes)};
}

function normalizeSeries(body) {
  const received = body?.Results?.series;
  if (!Array.isArray(received) || received.length !== SERIES.length) {
    err('BLS_SERIES_COUNT_MISMATCH_NO_WRITE');
  }
  const normalized = [];
  for (const id of SERIES) {
    const matched = received.filter(item => item?.seriesID === id);
    if (matched.length !== 1 || !Array.isArray(matched[0].data)) {
      err('BLS_SERIES_ID_MISMATCH_NO_WRITE');
    }
    const seen = new Map();
    const isQuarterly = id === 'PRS85006111';
    for (const item of matched[0].data) {
      const year = String(item?.year ?? '');
      const period = String(item?.period ?? '');
      if (isQuarterly && period === 'Q05') continue; // annual average, not a quarter
      if (!isQuarterly && period === 'M13') continue; // annual average, not a month
      if (!/^\d{4}$/.test(year) || Number(year) < YEAR_START || Number(year) > YEAR_END
        || !(isQuarterly ? /^Q0[1-4]$/.test(period) : /^M(0[1-9]|1[0-2])$/.test(period))
        || !numeric(item?.value) || !Array.isArray(item?.footnotes ?? [])) {
        err('BLS_OBSERVATION_INVALID_NO_WRITE');
      }
      const key = `${year}${period}`;
      const footnotes = Array.isArray(item.footnotes) ? item.footnotes : [];
      const row = {
        observationDate: periodFor(year,period),
        value:Number(item.value),
        rawValue:item.value,
        seriesID:id,
        year,
        period,
        periodName:typeof item.periodName === 'string' ? item.periodName : null,
        frequency:isQuarterly?'QUARTERLY':'MONTHLY',
        seasonalAdjustment:'SA',
        rawUnit:isQuarterly?'PERCENT_YEAR_OVER_YEAR':'INDEX',
        annualRateFlag:false,
        footnotes:footnotes.map(note => ({
          code:typeof note?.code === 'string'?note.code:null,
          text:typeof note?.text === 'string'?note.text:null,
        })),
        // BLS 'latest' is a transient label, not a price revision or vintage.
        releaseDate:null, // Not directly present in API result; never inferred.
        availableAt:null,
        vintageId:null, // BLS API retrieval is not an official vintage identifier.
      };
      if (seen.has(key) && JSON.stringify(seen.get(key)) !== JSON.stringify(row)) {
        err('BLS_DUPLICATE_PERIOD_CONFLICT_NO_WRITE');
      }
      seen.set(key,row);
    }
    if (!seen.size) err('BLS_SERIES_EMPTY_NO_WRITE');
    const rows = [...seen.values()].sort((a,b) => a.observationDate.localeCompare(b.observationDate));
    normalized.push({id,rows});
  }
  if (received.some(item => !SERIES.includes(item?.seriesID))) {
    err('BLS_UNEXPECTED_SERIES_NO_WRITE');
  }
  return normalized;
}

function buildPlans(series, retrievedAt, responseHash) {
  const asOf = isoDate(retrievedAt);
  return series.map(({id,rows}) => {
    const payloadJson = JSON.stringify(rows);
    if (Buffer.byteLength(payloadJson,'utf8') > 1_000_000 || rows.length > 400) {
      err('BLS_CHUNK_LIMIT_EXCEEDED_NO_WRITE');
    }
    const chunkHash = sha(payloadJson);
    const isQuarterly = id === 'PRS85006111';
    const identity = JSON.stringify({contract:CONTRACT,provider:'BLS',dataset:id,
      frequency:isQuarterly?'QUARTERLY':'MONTHLY',seasonalAdjustment:'SA',
      chunks:[chunkHash]});
    const snapshotHash = sha(identity);
    return {
      id,rows,payloadJson,chunkHash,snapshotHash,asOf,retrievedAt,
      provenanceJson:JSON.stringify({
        contract:CONTRACT,
        authority:'US_BLS',transportProvider:'BLS_DIRECT_API',
        endpoint:API,seriesID:id,periodStart:rows[0].observationDate,
        periodEnd:rows.at(-1).observationDate,
        frequency:isQuarterly?'QUARTERLY':'MONTHLY',
        seasonalAdjustment:'SA',
        rawUnit:isQuarterly?'PERCENT_YEAR_OVER_YEAR':'INDEX',
        responseSha256:responseHash,
        retrievedAt,
        sourceAttribution:'US Bureau of Labor Statistics',
        officialVintageId:null,
      }),
    };
  });
}

function insertPlans(db, plans) {
  let insertedChunks = 0, insertedSnapshots = 0;
  let begun = false;
  try {
    db.exec('BEGIN IMMEDIATE');
    begun = true;
    checkSchema(db); // Recheck atomically immediately before the first write.
    const putChunk = db.prepare(`INSERT INTO ${CHUNKS}(
      provider,dataset,chunk_sha256,first_observation_date,last_observation_date,
      row_count,payload_json,first_seen_at) VALUES(?,?,?,?,?,?,?,?)
      ON CONFLICT(provider,dataset,chunk_sha256) DO NOTHING`);
    const putSnapshot = db.prepare(`INSERT INTO ${SNAPSHOTS}(
      provider,dataset,snapshot_sha256,as_of,retrieved_at,status,history_mode,
      row_count,latest_observation_date,chunk_hashes_json,provenance_json)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(provider,dataset,snapshot_sha256) DO NOTHING`);
    for (const p of plans) {
      const chunkResult = putChunk.run('BLS',p.id,p.chunkHash,
        p.rows[0].observationDate,p.rows.at(-1).observationDate,p.rows.length,
        p.payloadJson,p.retrievedAt);
      insertedChunks += Number(chunkResult.changes);
      const snapshotResult = putSnapshot.run('BLS',p.id,p.snapshotHash,
        p.asOf,p.retrievedAt,'READY_DIRECT_BLS',CONTRACT,
        p.rows.length,p.rows.at(-1).observationDate,
        JSON.stringify([p.chunkHash]),p.provenanceJson);
      insertedSnapshots += Number(snapshotResult.changes);
    }
    for (const p of plans) {
      const chunk = db.prepare(`SELECT payload_json,row_count FROM ${CHUNKS}
        WHERE provider=? AND dataset=? AND chunk_sha256=?`)
        .get('BLS',p.id,p.chunkHash);
      const snap = db.prepare(`SELECT chunk_hashes_json,row_count,provenance_json
        FROM ${SNAPSHOTS} WHERE provider=? AND dataset=? AND snapshot_sha256=?`)
        .get('BLS',p.id,p.snapshotHash);
      if (!chunk || !snap || chunk.payload_json !== p.payloadJson
        || chunk.row_count !== p.rows.length
        || snap.chunk_hashes_json !== JSON.stringify([p.chunkHash])
        || snap.row_count !== p.rows.length) err('BLS_READBACK_MISMATCH_ROLLBACK');
      let prov;
      try { prov = JSON.parse(snap.provenance_json); }
      catch { err('BLS_SNAPSHOT_PROVENANCE_INVALID_ROLLBACK'); }
      if (prov.contract !== CONTRACT) err('BLS_SNAPSHOT_CONTRACT_MISMATCH_ROLLBACK');
    }
    db.exec('COMMIT');
    begun = false;
    return {insertedChunks,insertedSnapshots,verified:plans.length};
  } catch (e) {
    if (begun) {
      try { db.exec('ROLLBACK'); } catch {}
    }
    throw e;
  }
}

export {CONTRACT, SERIES, checkSchema, normalizeSeries, buildPlans, insertPlans};

async function main() {
  const utc = new Date().toISOString();
  const stamp = utc.replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z').replace('T','-');
  const logfile = path.join(HERE,`EARNINGS_R3C_BLS_STORE_ONCE_RESULT_${stamp}.txt`);
  const notes = [
    'EARNINGS_COMPANION_R3C_BLS_DIRECT_STORE_ONCE_V1',
    `UTC=${utc}`,
    'MODE=MANUAL_ONE_POST_EXISTING_SQLITE_APPEND_ONLY',
    'PROVIDER=BLS',
    `SERIES=${SERIES.join('|')}`,
    `YEAR_RANGE=${YEAR_START}-${YEAR_END}`,
  ];
  const counters = {requests:0, dbWritten:false, dbCommit:false};
  let result = 'FAILED_NO_WRITE';
  try {
    if (!fs.existsSync(DB_PATH)) err('PC_SQLITE_FILE_MISSING_NO_WRITE');
    let scan;
    try {
      scan = new DatabaseSync(DB_PATH,{readOnly:true,timeout:3000});
      scan.exec('PRAGMA query_only=ON');
      const previous = checkSchema(scan);
      notes.push('PC_EXISTING_SCHEMA_GUARD=PASS');
      notes.push(`PREVIOUS_BLS_SNAPSHOTS=${previous.existingSnapshots}`);
      notes.push(`PREVIOUS_BLS_CHUNKS=${previous.existingChunks}`);
    } finally { try { scan?.close(); } catch {} }
    const key = readKey();
    const fetched = await fetchDirect(key,counters);
    const retrievedAt = new Date().toISOString();
    const series = normalizeSeries(fetched.body);
    const plans = buildPlans(series,retrievedAt,fetched.responseHash);
    for (const item of series) notes.push(`BLS_${item.id}_OBSERVATIONS=${item.rows.length}`);
    let db;
    try {
      db = new DatabaseSync(DB_PATH,{timeout:5000});
      db.exec('PRAGMA foreign_keys=ON');
      const stored = insertPlans(db,plans);
      counters.dbCommit = true;
      counters.dbWritten = stored.insertedChunks + stored.insertedSnapshots > 0;
      notes.push(`CHUNKS_INSERTED=${stored.insertedChunks}`);
      notes.push(`SNAPSHOTS_INSERTED=${stored.insertedSnapshots}`);
      notes.push(`SERIES_READBACK_VERIFIED=${stored.verified}`);
      result = 'PASS_R3C_MANUAL_BLS_PERSISTED';
    } finally { try { db?.close(); } catch {} }
  } catch (e) {
    // Fixed error codes only. Never echo unknown messages, paths or fetch body.
    const message = typeof e?.message==='string' && /^[A-Z0-9_]+$/.test(e.message)
      ? e.message : 'UNEXPECTED_ERROR_REVIEW_REQUIRED';
    notes.push(`ERROR=${message}`);
    result = counters.dbCommit ? 'INCOMPLETE_AFTER_COMMIT_REVIEW' : 'FAILED_NO_COMMIT';
    process.exitCode = 2;
  } finally {
    notes.push(`API_REQUESTS=${counters.requests}`);
    notes.push(`DB_TRANSACTION_COMMITTED=${counters.dbCommit?'YES':'NO'}`);
    notes.push(`NEW_BLS_ROWS_WRITTEN=${counters.dbWritten?'YES':'NO'}`);
    notes.push('TABLE_CREATED_OR_ALTERED=NO');
    notes.push('FRED_RECORDS_MODIFIED=NO');
    notes.push('D1_OR_SCORE_OR_SCHEDULER_CHANGED=NO');
    notes.push('API_KEY_LOGGED=NO');
    notes.push(`RESULT=${result}`);
    try {
      fs.writeFileSync(logfile,notes.join('\r\n')+'\r\n',{encoding:'utf8',flag:'wx'});
      console.log(`TXT_CREATED=${path.basename(logfile)}`);
      console.log(`RESULT=${result}`);
    } catch { console.error('TXT_LOG_WRITE_FAILED'); process.exitCode=1; }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
