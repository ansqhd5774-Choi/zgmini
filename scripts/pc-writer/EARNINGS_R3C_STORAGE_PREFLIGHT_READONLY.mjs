// Earnings Companion C / R3-C: minimum PC storage-lineage preflight.
// Strict 0-API, SQLite read-only metadata queries. Nothing is collected or published.
// This intentionally does not inspect API raw payloads, credentials, or unrelated records.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';

const scriptFolder = path.dirname(fileURLToPath(import.meta.url));
const pcRoot = path.resolve(process.env.ZGMINI_PC_HOME || 'E:\\ZGmini\\data\\pc-writer');
const utc = new Date().toISOString();
const stamp = utc.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z').replace('T', '-');
const txt = path.join(scriptFolder, `EARNINGS_R3C_STORAGE_PREFLIGHT_RESULT_${stamp}.txt`);
const lines = [
  'EARNINGS_COMPANION_R3C_STORAGE_PREFLIGHT_READONLY_R1_20261027',
  `UTC=${utc}`,
  'MODE=READ_ONLY_METADATA_ONLY',
  'API_REQUESTS=0',
  'FRED_CACHE_PAYLOAD_READ=NO',
];
const safe = value => String(value ?? 'NULL').replace(/[^A-Za-z0-9_.:+/|,\-]/g, '_').slice(0, 230);
const record = (name, value) => lines.push(`${name}=${safe(value)}`);
const snapshot = 'api_history_snapshots_v1';
const chunk = 'api_history_chunks_v1';
const datasets = ['WPSFD4', 'WPSFD41', 'PRS85006111', 'PPIFIS', 'A051RC', 'IR/TOTBUS/yes'];
const relatedNames = /(?:api_history|bls|bea|census|qfr|mtis|earnings_companion)/i;
let db;
let ok = false;

try {
  const dbPath = path.join(pcRoot, 'storage', 'core.sqlite');
  if (!fs.existsSync(dbPath)) throw Error('PC_CORE_DB_NOT_FOUND');
  db = new DatabaseSync(dbPath, {readOnly: true, timeout: 1500});
  db.exec('PRAGMA query_only=ON');
  record('PC_DATABASE', 'OPENED_READ_ONLY');

  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'
    AND name NOT LIKE 'sqlite_%' ORDER BY name LIMIT 600`).all().map(r => String(r.name));
  const tableSet = new Set(tables);
  const columns = name => new Set(db.prepare(`PRAGMA table_info("${name}")`).all().map(r => String(r.name)));
  const associated = tables.filter(name => /^[a-z][a-z0-9_]*$/i.test(name) && relatedNames.test(name)).slice(0, 35);
  record('RELATED_TABLES_UP_TO_35', associated.length);
  associated.forEach((name, i) => {
    const cols = columns(name);
    const useful = ['provider','dataset','series_id','seriesId','observation_date','retrieved_at','vintage_id',
      'raw_value','rawValue','payload_json','source_hash','response_hash','row_count'].filter(c => cols.has(c));
    record(`RELATED_TABLE_${i + 1}`, `${name}|${useful.join(',') || 'NO_RELEVANT_FIELD'}`);
  });

  for (const table of [snapshot, chunk]) {
    if (!tableSet.has(table)) { record(`${table}_SCHEMA`, 'TABLE_MISSING'); continue; }
    const cols = columns(table);
    const mandatory = table === snapshot
      ? ['provider','dataset','snapshot_sha256','retrieved_at','row_count','chunk_hashes_json','provenance_json']
      : ['provider','dataset','chunk_sha256','row_count','payload_json','first_seen_at'];
    const absent = mandatory.filter(c => !cols.has(c));
    record(`${table}_SCHEMA`, absent.length ? `MISSING_FIELDS:${absent.join(',')}` : 'EXPECTED_FIELDS_PRESENT');
    if (absent.length || !cols.has('provider') || !cols.has('dataset')) continue;
    const grouped = db.prepare(`SELECT provider,dataset,COUNT(*) AS n,SUM(row_count) AS items
      FROM ${table} WHERE dataset IN (${datasets.map(() => '?').join(',')})
      GROUP BY provider,dataset ORDER BY provider,dataset LIMIT 24`).all(...datasets);
    record(`${table}_TARGET_GROUP_COUNT`, grouped.length);
    grouped.forEach((r, i) => record(`${table}_GROUP_${i + 1}`,
      `${r.provider}|${r.dataset}|RECORDS:${r.n}|ROWS:${r.items}`));
    const direct = grouped.filter(r => /BLS/i.test(String(r.provider)) &&
      ['WPSFD4','WPSFD41','PRS85006111'].includes(String(r.dataset)));
    record(`${table}_DIRECT_BLS_GROUPS_UP_TO_3`, direct.length);
    record(`${table}_DIRECT_BLS_NOTE`, 'ABSENCE_HERE_DOES_NOT_PROVE_ABSENCE_IN_OTHER_STORES');
  }

  record('GENERIC_SCHEMA_IS_APPROVED_FOR_NEW_C', 'NOT_DETERMINED_BY_METADATA');
  record('SOURCE_PROVENANCE_IN_PAYLOAD', 'NOT_EXAMINED');
  record('R3C_SQLITE_WRITES_AUTHORIZED', 'NO');
  record('R3C_NEW_TABLE_OR_RETENTION_AUTHORIZED', 'NO');
  ok = true;
} catch (err) {
  record('ERROR', /^[A-Z0-9_]+$/.test(String(err?.message)) ? err.message : 'READ_ONLY_METADATA_QUERY_ERROR');
} finally {
  try { db?.close(); } catch {}
  record('NO_DATABASE_WRITE', 'TRUE');
  record('NO_D1_WRITE', 'TRUE');
  record('NO_SCHEDULER_CHANGE', 'TRUE');
  record('NO_SCORE_CHANGE', 'TRUE');
  record('RESULT', ok ? 'R3C_SCHEMA_REVIEW_READY' : 'R3C_SCHEMA_REVIEW_INCOMPLETE');
  if (!ok) process.exitCode = 2;
  try {
    fs.writeFileSync(txt, lines.join('\r\n') + '\r\n', {encoding: 'utf8', flag: 'wx'});
    console.log(`TXT_CREATED=${path.basename(txt)}`);
  } catch {
    console.error('TXT_LOG_WRITE_FAILED');
    process.exitCode = 1;
  }
}
