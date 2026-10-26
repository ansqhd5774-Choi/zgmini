// ZGMINI earnings C / R2 verification only.
// Exactly one BEA public-statistics GET plus one BLS public-statistics POST at most.
// Does not import collectors, store API payloads, open a DB, or publish any data.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TIMESTAMP = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z').replace('T', '-');
const OUTPUT = path.join(SCRIPT_DIR, `EARNINGS_R2_BEA_BLS_RESULT_${TIMESTAMP}.txt`);
const PC_ROOT = path.resolve(process.env.ZGMINI_PC_HOME || 'E:\\ZGmini\\data\\pc-writer');
const DRY_RUN = process.argv.includes('--dry-run');
const MAX_BYTES = 3_000_000;
const MAX_REQUESTS = DRY_RUN ? 0 : 2;
const LOG = [
  'EARNINGS_COMPANION_R2_BEA_BLS_SERIES_READONLY_R1_20261026',
  `UTC=${new Date().toISOString()}`,
  'MODE=READ_ONLY_NO_DATABASE',
  `MAX_API_REQUESTS=${MAX_REQUESTS}`,
  'LOG_LOCATION=NEXT_TO_CMD',
  'API_KEYS_AND_REQUEST_URLS_NOT_LOGGED=TRUE'
];
let requestCount = 0;

function status(key, val) {
  LOG.push(`${key}=${String(val).replace(/[\r\n\t]/g, ' ').slice(0, 260)}`);
}
function name(v) {
  return String(v ?? '').replace(/[^A-Za-z0-9 _.,():+\/-]/g, '_').trim().slice(0, 108) || 'UNKNOWN';
}
function cell(v) {
  const t = String(v ?? '').trim();
  return /^[-+]?\(?[0-9,]+(?:\.[0-9]+)?\)?$/.test(t) ? t.slice(0, 32) : 'UNAVAILABLE';
}
function limitedCredentials() {
  const src = path.join(PC_ROOT, 'providers.env');
  let env = {};
  try {
    if (fs.existsSync(src) && fs.statSync(src).size < 150000)
      env = parseEnv(fs.readFileSync(src, 'utf8'));
  } catch { status('PROVIDERS_ENV', 'READ_OR_PARSE_ERROR'); }
  // Do not print even lengths/partial strings of credentials.
  return {
    bea: String(env.BEA_API_KEY || env.BEA_USER_ID || process.env.BEA_API_KEY || process.env.BEA_USER_ID || '').trim(),
    bls: String(env.BLS_API_KEY || env.BLS_REGISTRATION_KEY || env.BLS_REGISTRATIONKEY || process.env.BLS_API_KEY || process.env.BLS_REGISTRATION_KEY || '').trim()
  };
}

async function boundedJson(url, init) {
  if (requestCount >= MAX_REQUESTS) return {state:'REQUEST_BUDGET_EXHAUSTED'};
  requestCount++;
  let resp;
  try {
    resp = await fetch(url, { ...init, redirect:'error', signal:AbortSignal.timeout(20000) });
  } catch { return {state:'NETWORK_OR_TIMEOUT'}; }
  if (!resp.ok) {
    try { await resp.body?.cancel(); } catch {}
    return {state:`HTTP_${resp.status}`};
  }
  try {
    const reader = resp.body?.getReader();
    if (!reader) return {state:'HTTP_200_NO_BODY'};
    let n = 0;
    const chunks = [];
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      n += value.length;
      if (n > MAX_BYTES) {
        try { await reader.cancel(); } catch {}
        return {state:'HTTP_200_RESPONSE_LIMIT_EXCEEDED'};
      }
      chunks.push(value);
    }
    const all = new Uint8Array(n);
    let at = 0;
    for (const chunk of chunks) { all.set(chunk, at); at += chunk.length; }
    return {state:'HTTP_200', data:JSON.parse(new TextDecoder().decode(all))};
  } catch { return {state:'HTTP_200_JSON_OR_BODY_ERROR'}; }
}

async function verifyBEA(key) {
  if (!key) { status('BEA', 'KEY_MISSING_NO_API_REQUEST'); return; }
  const target = new URL('https://apps.bea.gov/api/data/');
  for (const [k,v] of Object.entries({
    UserID:key, method:'GetData', DataSetName:'NIPA', TableName:'T11200',
    Frequency:'Q', Year:'2025,2026', ResultFormat:'JSON'
  })) target.searchParams.set(k,v);
  const res = await boundedJson(target, {method:'GET'});
  status('BEA_HTTP', res.state);
  if (res.state !== 'HTTP_200') return;
  const outer = res.data?.BEAAPI?.Results;
  const data = Array.isArray(outer?.Data) ? outer.Data : null;
  if (!data) { status('BEA_NIPA_T11200', 'DATA_ARRAY_MISSING_OR_SERVICE_ERROR'); return; }
  status('BEA_NIPA_T11200_TOTAL_ROWS', data.length);
  const found = data.filter(r=>String(r.SeriesCode??'').toUpperCase()==='A051RC');
  status('BEA_A051RC_MATCH_ROWS', found.length);
  if (!found.length) {
    const possibilities = [...new Set(data.filter(r=>/corporate profits/i.test(String(r.LineDescription??''))).map(r=>
      `${name(r.SeriesCode)}:${name(r.LineNumber)}:${name(r.LineDescription)}`))].slice(0,12);
    status('BEA_CORPORATE_PROFITS_CANDIDATE_LINES', possibilities.join('|') || 'NONE');
    return;
  }
  const ordered = found.slice().sort((a,b)=>String(a.TimePeriod).localeCompare(String(b.TimePeriod)));
  const latest = ordered.at(-1);
  status('BEA_A051RC_SERIES_CODE', name(latest.SeriesCode));
  status('BEA_A051RC_LINE_NUMBER', name(latest.LineNumber));
  status('BEA_A051RC_LINE_DESCRIPTION', name(latest.LineDescription));
  status('BEA_A051RC_FREQUENCY', name(latest.TimePeriod).includes('Q')?'QUARTERLY':'CHECK_PERIOD');
  status('BEA_A051RC_LATEST_PERIOD', name(latest.TimePeriod));
  status('BEA_A051RC_LATEST_RAW_VALUE', cell(latest.DataValue));
  status('BEA_A051RC_METRIC_NAME', name(latest.METRIC_NAME));
  status('BEA_A051RC_UNIT_MULT', name(latest.UNIT_MULT));
  status('BEA_A051RC_ACTUAL_ADJUSTMENT', 'BEA_SERIES_CODE_ONLY_NOT_INDEPENDENTLY_VERIFIED');
}

function validPeriod(row) {
  const y = String(row.year??'');
  const p = String(row.period??'');
  if (!/^20\d{2}$/.test(y)) return false;
  return /^M(0[1-9]|1[0-2])$/.test(p) || /^Q0[1-4]$/.test(p);
}

async function verifyBLS(key) {
  if (!key) { status('BLS', 'KEY_MISSING_NO_API_REQUEST'); return; }
  const series = ['WPSFD4','WPSFD41','PRS85006111'];
  const res = await boundedJson('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({seriesid:series, startyear:'2025', endyear:'2026', registrationkey:key})
  });
  status('BLS_HTTP', res.state);
  if (res.state !== 'HTTP_200') return;
  status('BLS_RESPONSE_STATUS', name(res.data?.status));
  if (res.data?.status !== 'REQUEST_SUCCEEDED') { status('BLS_RESULT', 'API_REJECTED_NO_RETRY'); return; }
  const resultRows = Array.isArray(res.data?.Results?.series) ? res.data.Results.series : [];
  for (const id of series) {
    const row = resultRows.find(v=>v.seriesID===id);
    const observations = Array.isArray(row?.data) ? row.data.filter(validPeriod) : [];
    observations.sort((a,b)=>String(a.year+a.period).localeCompare(String(b.year+b.period)));
    const last = observations.at(-1);
    status(`BLS_${id}_VALID_OBSERVATIONS`, observations.length);
    status(`BLS_${id}_LATEST_PERIOD`, last ? `${name(last.year)}${name(last.period)}` : 'UNAVAILABLE');
    status(`BLS_${id}_LATEST_RAW_VALUE`, last ? cell(last.value) : 'UNAVAILABLE');
    status(`BLS_${id}_API_TITLE`, 'NOT_PROVIDED_IN_SERIES_PAYLOAD_VERIFY_OFFICIAL_MAPPING');
  }
  status('BLS_WPSFD4_EXPECTED_OFFICIAL_TITLE', 'SA_FINAL_DEMAND_ALL');
  status('BLS_WPSFD41_EXPECTED_OFFICIAL_TITLE', 'SA_FINAL_DEMAND_GOODS');
  status('BLS_PRS85006111_TRANSFORM_OR_UNIT', 'UNVERIFIED_NO_CONVERSION_PERFORMED');
}

try {
  status('PC_CONFIG_PATH', fs.existsSync(path.join(PC_ROOT,'providers.env')) ? 'PRESENT' : 'NOT_FOUND');
  if (!DRY_RUN) {
    const creds = limitedCredentials();
    await verifyBEA(creds.bea);
    await verifyBLS(creds.bls);
  } else status('DRY_RUN', 'NO_API_REQUESTS');
} catch { status('RESULT', 'UNEXPECTED_CHECK_ERROR_NO_RETRY'); }
status('ACTUAL_API_REQUESTS', requestCount);
status('NO_DATABASE_READ_OR_WRITE', 'TRUE');
status('NO_D1_REQUEST_OR_WRITE', 'TRUE');
status('NO_SCHEDULER_CHANGE', 'TRUE');
status('NO_SCORE_FORMULA_CHANGE', 'TRUE');
status('RESULT', 'READ_ONLY_VERIFY_FINISHED_REVIEW_BEFORE_ANY_USE');
try {
  fs.writeFileSync(OUTPUT, LOG.join('\r\n')+'\r\n', {flag:'wx', encoding:'utf8'});
  console.log(`Finished. Send the TXT next to the CMD: ${path.basename(OUTPUT)}`);
} catch { console.error('TXT_LOG_WRITE_FAILED'); process.exitCode=1; }
