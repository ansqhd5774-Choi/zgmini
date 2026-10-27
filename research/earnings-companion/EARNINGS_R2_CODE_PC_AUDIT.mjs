// ZGMINI earnings companion R1/R2: PC read-only inventory + two Census GETs.
// No repository imports; no collector, scheduler, writer, or D1 connection.
// Logs only sanitized status, code identifiers, and bounded public aggregate samples.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';

const VERSION = 'EARNINGS_COMPANION_R2_CODE_PC_AUDIT_R1_20261026';
const DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z').replace('T', '-');
const OUTPUT = path.join(DIRECTORY, `EARNINGS_R2_CODE_PC_AUDIT_RESULT_${stamp}.txt`);
const PC_ROOT = path.resolve(process.env.ZGMINI_PC_HOME || 'E:\\ZGmini\\data\\pc-writer');
const AUDIT_ONLY = process.argv.includes('--audit-only');
const LIMIT_BYTES = 5_000_000;
const MAX_API_CALLS = AUDIT_ONLY ? 0 : 2;
const lines = [VERSION, `EXECUTED_UTC=${new Date().toISOString()}`, 'MODE=READ_ONLY',
  `MAX_API_REQUESTS=${MAX_API_CALLS}`, 'LOG_LOCATION=NEXT_TO_CMD', 'REDACT_API_KEY_AND_URL_QUERY=TRUE'];
let apiCalls = 0;

function out(k, v) {
  // Every logged key is static and all values are produced by explicit sanitizers.
  lines.push(`${k}=${v}`);
}
function safeWord(v) {
  return String(v ?? 'UNKNOWN').replace(/[^A-Za-z0-9_.:+-]/g, '_').slice(0, 100);
}
function dateSlot(v) {
  const m = /^(\d{4}-\d{2}-\d{2})(?:\s|T|$)/.exec(String(v ?? '').trim());
  if (!m) return null;
  const x = new Date(m[1] + 'T00:00:00Z');
  return !Number.isNaN(x.getTime()) && x.toISOString().startsWith(m[1]) ? m[1] : null;
}
function limitedJson(file, maxBytes = 180000) {
  try {
    if (!fs.existsSync(file)) return null;
    if (fs.statSync(file).size > maxBytes) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return null; }
}

async function pcAudit() {
  out('PC_ROOT', fs.existsSync(PC_ROOT) ? 'FOUND' : 'NOT_FOUND');
  const config = limitedJson(path.join(PC_ROOT, 'config.json'));
  if (config && typeof config === 'object') {
    const sha = typeof config.source === 'string' && /^[a-f0-9]{40}$/i.test(config.source) ? config.source : 'UNKNOWN';
    out('PC_CONFIG', `FOUND source=${sha} collectionTarget=${safeWord(config.collectionTarget)} enabled=${config.enabled === true ? 'true' : config.enabled === false ? 'false' : 'UNKNOWN'}`);
  } else out('PC_CONFIG', 'NOT_READ_OR_NOT_FOUND');

  for (const [label, name] of [
    ['COLLECTION', 'local-collection-last-run.json'],
    ['WRITER', 'local-writer-last-run.json'],
    ['CYCLE', 'local-cycle-last-run.json'],
    ['QUOTA_RUNNER', 'quota-runner-last-run.json']
  ]) {
    const result = limitedJson(path.join(PC_ROOT, name));
    if (!result || typeof result !== 'object') { out(`PC_STATUS_${label}`, 'NOT_READ_OR_NOT_FOUND'); continue; }
    out(`PC_STATUS_${label}`, `FOUND at=${safeWord(result.at ?? result.finishedAt ?? result.startedAt)} status=${safeWord(result.status)} job=${safeWord(result.job)} mode=${safeWord(result.mode)}`);
  }

  const allowlist = [
    'growth_r2_feature_history_v1', 'growth_r2_feature_current_v1', 'growth_r2_provider_snapshots_v1',
    'market_score_earnings_e1_r3_current_v1', 'market_score_earnings_e1_r3_history_v1',
    'market_score_earnings_e1_r3_universe_v1', 'market_score_earnings_e1_r3_runs_v1',
    'market_public_snapshots_v1'
  ];
  let Sqlite;
  try { ({DatabaseSync: Sqlite} = await import('node:sqlite')); }
  catch { out('SQLITE_BUILTIN', 'NOT_AVAILABLE_USE_NODE24'); return; }
  for (const name of ['core.sqlite', 'history.sqlite']) {
    const fullpath = path.join(PC_ROOT, 'storage', name);
    if (!fs.existsSync(fullpath)) { out(`DB_${name}`, 'NOT_FOUND'); continue; }
    let db;
    try {
      // Explicit SQLite readOnly flag; no CREATE, ALTER, PRAGMA WAL or checkpoint.
      db = new Sqlite(fullpath, {readOnly:true, timeout:1500});
      db.exec('PRAGMA query_only=ON');
      out(`DB_${name}`, 'OPENED_READ_ONLY');
      for (const table of allowlist) {
        const exists = !!db.prepare('SELECT 1 AS ok FROM sqlite_master WHERE type=? AND name=? LIMIT 1').get('table', table);
        if (!exists) continue;
        try {
          // Do not scan/print business data. Presence is not freshness.
          const sample = !!db.prepare(`SELECT 1 AS has_row FROM "${table}" LIMIT 1`).get();
          const fields = db.prepare(`PRAGMA table_info("${table}")`).all().map(r=>String(r.name));
          const dateFields = fields.filter(x=>/(^|_)(date|period|time|stored_at|observed_at|updated_at)$/.test(x)).slice(0, 7);
          out(`DB_${name}_${table.toUpperCase()}`, `EXISTS hasRows=${sample ? 'yes' : 'no'} dateFieldCandidates=${dateFields.map(safeWord).join(',') || 'NONE'}`);
        } catch { out(`DB_${name}_${table.toUpperCase()}`, 'EXISTS_READ_ERROR'); }
      }
    } catch { out(`DB_${name}`, 'OPEN_READ_ONLY_ERROR'); }
    finally { try { db?.close(); } catch {} }
  }
  out('PC_SQLITE_ROW_VALUES', 'NOT_READ');
  out('PC_LATEST_OBSERVED', 'UNVERIFIED_TABLE_PRESENCE_ONLY');
}

async function boundedGet(url) {
  apiCalls++;
  let resp;
  try { resp = await fetch(url, {signal:AbortSignal.timeout(20000), redirect:'error'}); }
  catch { return {code:'NETWORK_OR_TIMEOUT'}; }
  if (!resp.ok) { await resp.body?.cancel().catch(()=>{}); return {code:`HTTP_${resp.status}`}; }
  try {
    const reader = resp.body?.getReader();
    if (!reader) return {code:'NO_BODY'};
    let total = 0;
    const parts = [];
    while (true) {
      const {value,done} = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > LIMIT_BYTES) {await reader.cancel();return {code:'RESPONSE_LIMIT_EXCEEDED'};}
      parts.push(value);
    }
    const bytes = new Uint8Array(total);
    let at = 0;
    for (const part of parts) {bytes.set(part, at); at += part.length;}
    return {code:'HTTP_200', json:JSON.parse(new TextDecoder().decode(bytes))};
  } catch {return {code:'JSON_OR_BODY_ERROR'};}
}

function censusTable(json) {
  if (!Array.isArray(json) || !Array.isArray(json[0])) return null;
  const fields = json[0];
  if (!['data_type_code','category_code','cell_value','time_slot_date'].every(f=>fields.includes(f))) return null;
  return json.slice(1).filter(Array.isArray).map(v=>Object.fromEntries(fields.map((f,i)=>[f,v[i]])));
}

function sample(r) {
  const val = String(r.cell_value ?? '').trim();
  return [r.data_type_code,r.category_code,r.seasonally_adj,r.program_code]
    .map(safeWord).join('/') + ':' + (/^-?\d+(?:\.\d+)?$/.test(val) ? val.slice(0,22) : 'NA');
}

function summarizeCensus(label, rows) {
  const byDate = rows.map(r=>({row:r,date:dateSlot(r.time_slot_date)})).filter(x=>x.date);
  const latest = byDate.map(x=>x.date).sort().at(-1);
  if (!latest) {out(`${label}_PERIOD`, 'UNKNOWN');return;}
  const current = byDate.filter(x=>x.date===latest).map(x=>x.row);
  out(`${label}_HTTP`, `200 rows2026=${rows.length} rowsLatest=${current.length} latestRawSlotDate=${latest}`);
  const slotNames = [...new Set(current.map(r=>safeWord(r.time_slot_name)).filter(x=>x!=='UNKNOWN'))];
  out(`${label}_SLOT_NAMES`, slotNames.slice(0,18).join('|') || 'MISSING');
  const groups = new Map();
  for (const row of current) {
    const code = safeWord(row.data_type_code);
    const state = groups.get(code) || {n:0,example:null};
    state.n++; if (!state.example) state.example = sample(row);
    groups.set(code,state);
  }
  out(`${label}_DISTINCT_DATA_TYPE_CODES`, groups.size);
  for (const [code,g] of [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0])).slice(0,120))
    out(`${label}_CODE_${code}`, `rows=${g.n} example=${g.example}`);
  const cats = [...new Set(current.map(r=>safeWord(r.category_code)))].sort();
  out(`${label}_DISTINCT_CATEGORY_CODES`, cats.length);
  out(`${label}_CATEGORIES`, cats.slice(0,110).join('|'));
  if (label === 'CENSUS_MTIS') {
    const matches = current.filter(r=>Math.abs(Number(r.cell_value)-1.33)<0.000001);
    out('CENSUS_MTIS_1_33_VALUE_CANDIDATES', matches.slice(0,25).map(sample).join('|')||'NONE');
    out('CENSUS_MTIS_1_33_MATCH_COUNT', matches.length);
    out('CENSUS_MTIS_TOTAL_CATEGORY_CODES', cats.filter(c=>/^(TOTAL|BUS|BUSINESS|ALL|000|99|MTM|MTR)$/i.test(c)).join('|')||'UNCONFIRMED');
  }
  if (label === 'CENSUS_QFR') {
    out('CENSUS_QFR_QUARTER_DECODE', 'REQUIRES_OFFICIAL_SLOT_NAME_AND_CENSUS_QFR_PUBLICATION_CROSSCHECK');
    out('CENSUS_QFR_CODE_MEANINGS', 'NEED_OFFICIAL_DICTIONARY_SEMANTICS_NOT_IN_VARIABLES_PAGE');
  }
}

async function verifyCensus() {
  const configFile=path.join(PC_ROOT,'providers.env');
  let key='';
  try {
    if (fs.existsSync(configFile) && fs.statSync(configFile).size < 150000)
      key=String(parseEnv(fs.readFileSync(configFile,'utf8')).CENSUS_API_KEY??'').trim();
    if (!key) key=String(process.env.CENSUS_API_KEY??'').trim();
  } catch {out('CENSUS_PROVIDER_CONFIG', 'READ_ERROR');}
  if (!key) {out('CENSUS_TEST', 'KEY_MISSING_NO_API_REQUESTS'); return;}
  for (const dataset of ['qfr','mtis']) {
    const label=`CENSUS_${dataset.toUpperCase()}`;
    const url=new URL(`https://api.census.gov/data/timeseries/eits/${dataset}`);
    for (const [k,v] of Object.entries({get:'data_type_code,category_code,cell_value,seasonally_adj,program_code,time_slot_id,time_slot_date,time_slot_name',time:'2026',key})) url.searchParams.set(k,v);
    const response=await boundedGet(url);
    if (response.code!=='HTTP_200') {out(`${label}_HTTP`,response.code);continue;}
    const rows=censusTable(response.json);
    if (!rows) {out(`${label}_HTTP`,'HTTP_200_INVALID_SCHEMA');continue;}
    summarizeCensus(label,rows);
  }
}

try {
  await pcAudit();
  if (!AUDIT_ONLY) await verifyCensus();
  out('ACTUAL_API_REQUESTS', apiCalls);
  out('NO_PC_DATABASE_WRITE', 'TRUE');
  out('NO_CLOUDFLARE_D1_WRITE', 'TRUE');
  out('NO_SCHEDULER_CHANGE', 'TRUE');
  out('NO_SCORE_FORMULA_CHANGE', 'TRUE');
  out('RESULT', 'READ_ONLY_AUDIT_FINISHED_REVIEW_CODE_IDENTITIES_BEFORE_USE');
} catch { out('RESULT', 'UNEXPECTED_AUDIT_ERROR_REVIEW_PARTIAL_LOG'); }
try {
  fs.writeFileSync(OUTPUT, lines.join('\r\n')+'\r\n', {encoding:'utf8',flag:'wx'});
  console.log(`검사 완료. 같은 폴더의 ${path.basename(OUTPUT)} 파일을 전달해 주세요.`);
} catch {console.error('TXT_LOG_WRITE_FAILED');process.exitCode=1;}
