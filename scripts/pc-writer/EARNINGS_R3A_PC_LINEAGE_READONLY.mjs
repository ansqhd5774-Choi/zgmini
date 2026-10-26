// ZGMINI Earnings Companion R3-A: strictly read-only PC lineage inspection.
// No API calls, database changes, configuration changes, score calculations or uploads.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.env.ZGMINI_PC_HOME || 'E:\\ZGmini\\data\\pc-writer');
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z').replace('T', '-');
const output = path.join(here, `EARNINGS_R3A_PC_LINEAGE_RESULT_${stamp}.txt`);
const lines = [
  'EARNINGS_COMPANION_R3A_PC_LINEAGE_READONLY_R1_20261026',
  `UTC=${new Date().toISOString()}`,
  'MODE=READ_ONLY',
  'API_REQUESTS=0',
  'DATA_SCOPE=METADATA_ONLY',
];
const targetIds = ['G010', 'G013', 'G015', 'G016', 'G017', 'G018'];
const safe = value => String(value ?? 'NULL').replace(/[^A-Za-z0-9_.:+/|,-]/g, '_').slice(0, 340);
const add = (key, value) => lines.push(`${key}=${safe(value)}`);
const hash = value => (value ? safe(String(value).slice(0, 16)) : 'NULL');
let db;
let finished = false;

try {
  const dbPath = path.join(root, 'storage', 'core.sqlite');
  if (!fs.existsSync(dbPath)) throw new Error('PC_CORE_DB_NOT_FOUND');
  db = new DatabaseSync(dbPath, {readOnly: true, timeout: 1500});
  db.exec('PRAGMA query_only=ON');
  add('PC_DB_OPEN', 'READ_ONLY_SUCCESS');

  const hasTable = name => Boolean(db.prepare('SELECT 1 FROM sqlite_master WHERE type=? AND name=?').get('table', name));
  const cols = name => db.prepare(`PRAGMA table_info("${name}")`).all().map(row => String(row.name));
  const currentTable = 'growth_r2_feature_current_v1';
  const historyTable = 'growth_r2_feature_history_v1';
  const needed = ['candidate_id', 'observation_date', 'observation_period', 'retrieved_at', 'record_hash', 'source_hash', 'vintage_id', 'feature_revision'];

  if (hasTable(currentTable) && hasTable(historyTable) &&
      needed.every(col => cols(currentTable).includes(col) && cols(historyTable).includes(col)) &&
      cols(historyTable).includes('available_at')) {
    const fetchCurrent = db.prepare(`SELECT candidate_id,observation_date,observation_period,
      retrieved_at,record_hash,source_hash,vintage_id,feature_revision
      FROM ${currentTable} WHERE candidate_id=? LIMIT 1`);
    const fetchHistory = db.prepare(`SELECT candidate_id,observation_date,observation_period,
      retrieved_at,record_hash,source_hash,vintage_id,feature_revision
      FROM ${historyTable} WHERE candidate_id=?
      ORDER BY observation_date DESC,available_at DESC LIMIT 8`);
    for (const id of targetIds) {
      const now = fetchCurrent.get(id);
      const historical = fetchHistory.all(id);
      add(`${id}_CURRENT`, now ? 'FOUND' : 'MISSING');
      if (now) {
        add(`${id}_CURRENT_PERIOD`, now.observation_period);
        add(`${id}_CURRENT_DATE`, now.observation_date);
        add(`${id}_CURRENT_RETRIEVED`, now.retrieved_at);
        add(`${id}_CURRENT_REVISION`, now.feature_revision);
        add(`${id}_CURRENT_VINTAGE_HASH`, hash(now.vintage_id));
        add(`${id}_CURRENT_RECORD_HASH`, hash(now.record_hash));
        add(`${id}_CURRENT_SOURCE_HASH`, hash(now.source_hash));
      }
      add(`${id}_HISTORY_ROWS_UP_TO_8`, historical.length);
      const sameDate = historical.filter(item => item.observation_date === now?.observation_date);
      add(`${id}_HISTORY_CURRENT_DATE_MATCH_COUNT_UP_TO_8`, sameDate.length);
      add(`${id}_HISTORY_CURRENT_RECORD_MATCH`, !now ? 'NOT_APPLICABLE_NO_CURRENT' :
        sameDate.some(item => item.record_hash === now.record_hash) ? 'YES' : 'NO_OR_NOT_IN_LATEST_8');
      const first = historical[0];
      if (first) {
        add(`${id}_LATEST_HISTORY_PERIOD`, first.observation_period);
        add(`${id}_LATEST_HISTORY_RETRIEVED`, first.retrieved_at);
        add(`${id}_LATEST_HISTORY_REVISION`, first.feature_revision);
        add(`${id}_LATEST_HISTORY_RECORD_HASH`, hash(first.record_hash));
        add(`${id}_LATEST_HISTORY_SOURCE_HASH`, hash(first.source_hash));
      }
    }
  } else add('GROWTH_LINEAGE_SCHEMA', 'MISSING_TABLE_OR_REQUIRED_COLUMNS');

  const snapshots = 'growth_r2_provider_snapshots_v1';
  if (hasTable(snapshots)) {
    const groups = db.prepare(`SELECT provider_group,COUNT(*) AS n,
      MAX(retrieved_at) AS latest FROM ${snapshots}
      WHERE provider_group LIKE 'Census M3:%'
      GROUP BY provider_group ORDER BY provider_group LIMIT 12`).all();
    add('M3_PROVIDER_GROUP_COUNT_UP_TO_12', groups.length);
    for (let i=0;i<groups.length;i++) {
      add(`M3_GROUP_${i+1}`, `${groups[i].provider_group}|COUNT:${groups[i].n}|LATEST:${groups[i].latest}`);
    }
  } else add('M3_PROVIDER_SNAPSHOTS', 'TABLE_MISSING');

  // Presence scan is restricted to TABLE NAMES / COLUMN NAMES, never raw JSON.
  // Absence of an obvious dedicated table does not prove a series is absent.
  const allTables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'
    AND name NOT LIKE 'sqlite_%' ORDER BY name LIMIT 500`).all().map(row => String(row.name));
  const related = allTables.filter(name =>
    /^[A-Za-z0-9_]+$/.test(name) &&
    /growth|market.data|provider|snapshot|census|bls|bea|qfr|mtis/i.test(name)).slice(0, 50);
  add('RELATED_TABLE_COUNT_UP_TO_50', related.length);
  for (let i=0;i<related.length;i++) {
    const name = related[i];
    add(`RELATED_TABLE_${i+1}`, `${name}|FIELDS:${cols(name)
      .filter(field => /^(provider|provider_group|series_id|dataset|source|selector|candidate_id|retrieved_at|vintage_id|observation_date|observation_period)$/i.test(field))
      .map(safe).join(',') || 'NONE'}`);
  }
  add('SERIES_ALREADY_STORED', 'NOT_PROVEN_BY_SCHEMA_SCAN');
  add('M3_REVISION_PARITY', 'NOT_INFERRED_FROM_DATES_OR_HASH_PREFIX');
  add('QFR_2025Q2_PAIRED_COVERAGE', 'NOT_PROVEN_BY_SCHEMA_SCAN');
  add('APPROVAL_REQUIRED_FOR_R3_STORAGE', 'TRUE');
  finished = true;
} catch (error) {
  const code = /^[A-Z0-9_]+$/.test(String(error?.message)) ? error.message : 'READ_ONLY_SQL_ERROR';
  add('ERROR', code);
} finally {
  try { db?.close(); } catch {}
  add('NO_DATABASE_WRITE', 'TRUE');
  add('NO_API_REQUEST', 'TRUE');
  add('NO_SCORE_CHANGE', 'TRUE');
  add('NO_SCHEDULER_CHANGE', 'TRUE');
  add('RESULT', finished ? 'R3A_METADATA_REVIEW_READY' : 'R3A_INSPECTION_INCOMPLETE');
  if (!finished) process.exitCode = 2;
  try {
    fs.writeFileSync(output, lines.join('\r\n') + '\r\n', {encoding: 'utf8', flag: 'wx'});
    console.log(`TXT_CREATED=${path.basename(output)}`);
  } catch {
    console.error('TXT_LOG_WRITE_FAILED');
    process.exitCode = 1;
  }
}
