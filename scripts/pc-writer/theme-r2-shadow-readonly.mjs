// Optional explicit-input offline research. Never scans or writes E:, calls a
// provider, changes production data, or publishes output.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildThemeAumAdaptiveShadowR2, evaluateEtfRankStabilityR2}
  from '../../lib/market-score/theme-etf-adaptive-r2-shadow.mjs';

const SCRIPT_ROOT = path.dirname(fileURLToPath(import.meta.url));
export const R2_REPORT_FILE = 'THEME_R2_SHADOW_RESULT.json';
export const R2_INPUT_SCHEMA = 'THEME_ETF_R2_LOCAL_PRICE_AUM_INPUT_V1';

const errorCode = err => /^THEME_(R2_SHADOW|R2_READER)_[A-Z0-9_]+$/.test(err?.message ?? '')
  ? err.message : 'THEME_R2_READER_INPUT_UNREADABLE';

export function validateAndEvaluateThemeR2Input(input, {maxAnchors=36}={}) {
  if (input?.schema !== R2_INPUT_SCHEMA || input?.benchmark !== 'SPY'
    || !Array.isArray(input?.etfs) || input.etfs.length < 2)
    throw Error('THEME_R2_READER_INPUT_SCHEMA_INVALID');
  const shadow = buildThemeAumAdaptiveShadowR2({theme: input.theme, dates: input.dates,
    spyCloses: input.spyCloses, etfs: input.etfs});
  const sensitivity = input.etfs.map(etf => ({ticker: etf.ticker,
    ...evaluateEtfRankStabilityR2({dates: input.dates,
      closes: etf.closes, spyCloses: input.spyCloses, maxAnchors})}));
  const reasonCounts = {};
  for (const point of shadow.history) {
    if (point.reason) reasonCounts[point.reason] = (reasonCounts[point.reason] ?? 0) + 1;
  }
  return {
    version:'THEME_R2_SHADOW_READONLY_RESULT_V1',
    status: shadow.validPoints ? 'PRIVATE_NUMERIC_SHADOW' : 'PRIVATE_SHADOW_INCOMPLETE',
    generatedAt: new Date().toISOString(), method: shadow.methodologyVersion,
    theme: shadow.theme, benchmark: 'SPY', tickers: shadow.tickers,
    observationDate: shadow.observationDate, latestScore: shadow.latestScore,
    latestWeights: shadow.history.at(-1).weights,
    calendarCoverage: shadow.calendarCoverage, historyWindowSessions: 252,
    validPoints: shadow.validPoints, reasonCounts,
    lastFive: shadow.history.slice(-5).map(({date, score, reason, rankSamples, weights}) =>
      ({date, score, reason, rankSamples, weights})),
    sensitivity: sensitivity.map(x=>({ticker:x.ticker,status:x.status,
      sampleComparisons:x.sampleComparisons.map(({sampleN, pairedObservations,
        meanAbsoluteError, maximumAbsoluteError, flipsAround50})=>
        ({sampleN, pairedObservations, meanAbsoluteError, maximumAbsoluteError, flipsAround50}))})),
    historicalNetAssetsPointInTimeVerified:false,
    upstreamCommercialRightsVerified:false, derivedLicenseVerified:false,
    sourcePriceReconciled:false, publicationAuthorized:false,
    providerCalls:0, databaseWrites:0, schedulerChanges:0, published:false,
    note:'Price/ETF net-assets inputs were caller-supplied and not independently rights- or point-in-time-verified. The 63-sample gate is a proposal; no operation cutover.',
  };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length !== 2 || argv[0] !== '--input' || !path.isAbsolute(argv[1]))
    throw Error('THEME_R2_READER_ABSOLUTE_INPUT_REQUIRED');
  const inputPath = argv[1];
  const stat = fs.statSync(inputPath);
  if (!stat.isFile() || stat.size <= 0 || stat.size > 12_000_000)
    throw Error('THEME_R2_READER_INPUT_SIZE_INVALID');
  const data = fs.readFileSync(inputPath);
  let parsed;
  try {parsed = JSON.parse(data.toString('utf8'));}
  catch {throw Error('THEME_R2_READER_JSON_INVALID');}
  const result = validateAndEvaluateThemeR2Input(parsed);
  result.inputSha256 = createHash('sha256').update(data).digest('hex');
  const report = path.join(SCRIPT_ROOT, R2_REPORT_FILE);
  // A single stable generated report beside the .cmd prevents E: log sprawl.
  const staged = report + '.' + process.pid + '.tmp';
  try {fs.writeFileSync(staged, JSON.stringify(result,null,2)+'\r\n', {flag:'wx'});
    fs.renameSync(staged, report);}
  finally {if(fs.existsSync(staged)) fs.unlinkSync(staged);}
  console.log('THEME_R2_SHADOW=' + result.status);
  console.log('REPORT=' + report);
  console.log('VALID_POINTS=' + result.validPoints + '/' + result.calendarCoverage);
  console.log('PUBLICATION=NO');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  try {main();} catch (err) {
    console.error(errorCode(err));
    process.exitCode=1;
  }
}
