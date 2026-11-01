// PC-only offline R43 scoring. No provider calls, remote writes or DB schema changes.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {rankR43Issuers, r43ImportanceIndex} from '../../lib/market-calendar-r43-issuer-rank.mjs';

export function runR43Local({base = process.env.ZGMINI_PC_HOME ?? path.join(os.homedir(), '.zgmini', 'pc-writer'),
  inputName = 'local-market-calendar-r43-input.json',
  now = Date.now(), write = false} = {}) {
  const report = {method:'R43_RANK_ENSEMBLE_20261031', status:'BLOCKED',
    providerCalls:0, dbWrites:0, published:false, outputWritten:false};
  // A ranked output is read by the PC earnings writer and could change displayed
  // stars. R43 is research-only until publication/annual FHS coexistence is approved.
  // --write-local is intentionally insufficient to activate a market-importance grade.
  if (write) return {...report, reason:'R43_LOCAL_ACTIVATION_NOT_APPROVED'};
  const inputPath = path.join(base, inputName);
  if (!fs.existsSync(inputPath)) return {...report, reason:'R43_FULL_UNIVERSE_INPUT_MISSING'};
  if (fs.statSync(inputPath).size > 8_000_000) return {...report, reason:'R43_INPUT_SIZE_LIMIT'};
  let source;
  try {source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));}
  catch {return {...report, reason:'R43_INPUT_JSON_INVALID'};}
  if (source?.version !== 1 || source?.provenance !== 'APPROVED_PC_STORED_DATA' ||
    source?.marketCapApiUsed !== false || source?.permissionForDerivedScores !== true ||
    !Array.isArray(source.rows))
    return {...report, reason:'R43_INPUT_SOURCE_OR_RIGHTS_UNVERIFIED'};
  let result;
  try {result = rankR43Issuers(source.rows, {asOf: source.asOf});}
  catch {return {...report, reason:'R43_INPUT_VALIDATION_FAILED'};}
  if (result.status !== 'READY_SHADOW')
    return {...report, reason:result.reason, coverage:result.coverage};
  if (!r43ImportanceIndex(result, {now}))
    return {...report, reason:'R43_INPUT_STALE_OR_RANK_INTEGRITY_FAILED', coverage:result.coverage};
  return {...report, status:'READY_DRY_RUN',
    coverage:result.coverage, topCount:result.topCount,
    asOf:result.asOf};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const write = process.argv.includes('--write-local');
  try {console.log(JSON.stringify(runR43Local({write})));}
  catch {console.log(JSON.stringify({status:'BLOCKED', reason:'R43_LOCAL_WRITE_FAILED',providerCalls:0,published:false})); process.exitCode=1;}
}
