export const TEMPORARY_KFG_V2_POSTCHECK_ONLY = 'TEMPORARY_KFG_V2_POSTCHECK_ONLY';
export const POSTCHECK_OPERATOR_EMAIL_NAME = 'KFG_V2_CANARY_OPERATOR_EMAIL';

const json = (body, status = 200) => Response.json(body, {
  status,
  headers: {'cache-control': 'no-store', 'x-robots-tag': 'noindex'},
});
const normalizedEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : null;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const median = values => {
  const sorted = values.filter(finite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

function coverageSummary(rows) {
  const fields = [
    ['return', 'returnCoverage'],
    ['tradingValue', 'tradingValueCoverage'],
    ['marketCap', 'marketCapCoverage'],
  ];
  const result = {};
  for (const [name, key] of fields) {
    const values = rows.map(row => row[key]).filter(finite);
    const worst = rows.filter(row => finite(row[key]))
      .sort((a, b) => a[key] - b[key] || String(a.date).localeCompare(String(b.date)))
      .slice(0, 5)
      .map(row => ({date: row.date, coverage: row[key]}));
    result[name] = {
      latest: rows.at(-1)?.[key] ?? null,
      minimum: values.length ? Math.min(...values) : null,
      median: median(values),
      worstDates: worst,
    };
  }
  return result;
}

function readiness(historyCounts) {
  const maxHistory = historyCounts.reduce((max, row) => Math.max(max, Number(row.historyCount) || 0), 0);
  const atLeast = required => historyCounts.filter(row => (Number(row.historyCount) || 0) >= required).length;
  const momentum = {requiredHistory: 311, maxHistoryPerSecurity: maxHistory, securitiesReady: atLeast(311), ready: maxHistory >= 311};
  const strength = {requiredHistory: {ma125: 125, ma252: 252}, maxHistoryPerSecurity: maxHistory,
    ma125Ready: maxHistory >= 125, ma252Ready: maxHistory >= 252,
    securitiesReadyMa125: atLeast(125), securitiesReadyMa252: atLeast(252), ready: maxHistory >= 252};
  const volatility = {requiredHistory: {rv20: 20, percentile: 252}, maxHistoryPerSecurity: maxHistory,
    rv20Ready: maxHistory >= 20, percentileHistoryReady: maxHistory >= 252,
    securitiesReadyRv20: atLeast(20), securitiesReadyPercentile: atLeast(252), ready: maxHistory >= 252};
  return {
    momentum,
    strength,
    volatility,
    credit: {existingHistoryAvailable: false, ready: false, reason: 'NO_PERSISTED_FACTOR_HISTORY'},
    liquidation: {existingHistoryAvailable: false, ready: false, reason: 'NO_PERSISTED_FACTOR_HISTORY'},
  };
}

export function summarizeKfgV2Postcheck(input) {
  const checkpoint = input.checkpoint ?? {};
  const dates = input.dates ?? {};
  const raw = input.raw ?? {};
  const breadth = input.breadth ?? {};
  const histories = input.historyCounts ?? [];
  const uniqueSuccessfulDates = Number(dates.uniqueSuccessfulDates ?? 0);
  const successfulDatesTotal = Number(checkpoint.successfulDatesTotal ?? 0);
  const factor = input.research?.readiness ?? readiness(histories);
  const factorHistoryReady = factor.momentum.ready && factor.strength.ready && factor.volatility.ready;
  const backfillComplete = successfulDatesTotal === 620 && uniqueSuccessfulDates === 620 &&
    checkpoint.oldestProcessedDate === '20240222';
  return {
    temporary: TEMPORARY_KFG_V2_POSTCHECK_ONLY,
    readOnly: true,
    checkpoint: {
      successfulDatesTotal,
      uniqueSuccessfulDates,
      duplicateDates: Math.max(0, successfulDatesTotal - uniqueSuccessfulDates),
      oldestDate: checkpoint.oldestProcessedDate ?? null,
      newestDate: checkpoint.latestProcessedDate ?? null,
      status: checkpoint.status ?? null,
    },
    rawHistory: {
      distinctTradingDates: Number(dates.distinctTradingDates ?? 0),
      totalRows: Number(raw.totalRows ?? 0),
      rowsPerDate: {min: raw.minRowsPerDate ?? null, max: raw.maxRowsPerDate ?? null, average: raw.averageRowsPerDate ?? null},
      zeroRowDates: Number(raw.zeroRowDates ?? 0),
      duplicateDateSecurityPairs: Number(raw.duplicateDateSecurityPairs ?? 0),
    },
    coverage: coverageSummary(input.coverageRows ?? []),
    breadth: {
      snapshotCount: Number(breadth.snapshotCount ?? 0),
      distinctDates: Number(breadth.distinctDates ?? 0),
      duplicateDates: Number(breadth.duplicateDates ?? 0),
      missingDates: Number(breadth.missingDates ?? 0),
      invalidScoreCount: Number(breadth.invalidScoreCount ?? 0),
      scoreOutside0To100: Number(breadth.scoreOutside0To100 ?? 0),
    },
    factorReadiness: factor,
    finalStates: {
      backfillComplete,
      factorHistoryReady,
      compositeReady: Boolean(input.research?.composite?.score != null && input.research?.composite?.status === 'READY'),
    },
    research: input.research ? {
      researchOnly: true,
      productionEligible: false,
      methodologyVersion: input.research.methodologyVersion,
      historyMode: input.research.historyMode ?? 'RECONSTRUCTED_CURRENT_VINTAGE',
      pointInTimeVerified: input.research.pointInTimeVerified ?? false,
      historicalVintageVerified: input.research.historicalVintageVerified ?? false,
      publicationLagStatus: input.research.publicationLagStatus ?? 'UNCONFIRMED',
      sourcePublishedAt: input.research.sourcePublishedAt ?? null,
      factors: input.research.readiness,
      composite: input.research.composite,
    } : null,
  };
}

async function readD1Postcheck(db, {fromDate=null, toDate=null}={}) {
  const bounds = fromDate && toDate ? ' AND date>=? AND date<=?' : '';
  const args = fromDate && toDate ? [fromDate,toDate] : [];
  const checkpoint = await db.prepare(`SELECT successful_trading_date_count AS successfulDatesTotal,
    latest_processed_date AS latestProcessedDate, oldest_processed_date AS oldestProcessedDate, status
    FROM kfg_v2_backfill_progress WHERE methodology_version='KFG_RESEARCH_V2'`).first();
  const dates = await db.prepare(`SELECT COUNT(*) AS distinctTradingDates,
    COUNT(CASE WHEN status='COMPLETE' THEN 1 END) AS uniqueSuccessfulDates,
    MIN(date) AS oldestDate, MAX(date) AS newestDate
    FROM kfg_v2_market_dates`).first();
  const raw = await db.prepare(`SELECT COUNT(*) AS totalRows,
    MIN(rows_stored) AS minRowsPerDate, MAX(rows_stored) AS maxRowsPerDate,
    AVG(rows_stored) AS averageRowsPerDate,
    COUNT(CASE WHEN rows_stored=0 THEN 1 END) AS zeroRowDates
    FROM kfg_v2_market_dates`).first();
  const duplicates = await db.prepare(`SELECT COUNT(*) AS duplicateDateSecurityPairs FROM (
    SELECT date, security_id FROM kfg_v2_market_rows GROUP BY date, security_id HAVING COUNT(*) > 1
  )`).first();
  const coverageRows = (await db.prepare(`SELECT date, return_coverage AS returnCoverage,
    trading_value_coverage AS tradingValueCoverage, market_cap_coverage AS marketCapCoverage
    FROM kfg_v2_market_dates WHERE status='COMPLETE'${bounds} ORDER BY date ASC`).bind(...args).all()).results;
  const breadth = await db.prepare(`SELECT
    (SELECT COUNT(*) FROM kfg_v2_factor_snapshots WHERE factor='Breadth') AS snapshotCount,
    (SELECT COUNT(DISTINCT date) FROM kfg_v2_factor_snapshots WHERE factor='Breadth') AS distinctDates,
    (SELECT COUNT(*) FROM (SELECT date FROM kfg_v2_factor_snapshots WHERE factor='Breadth' GROUP BY date HAVING COUNT(*) > 1)) AS duplicateDates,
    (SELECT COUNT(*) FROM kfg_v2_market_dates m LEFT JOIN kfg_v2_factor_snapshots f
      ON f.factor='Breadth' AND f.date=m.date WHERE m.status='COMPLETE' AND f.date IS NULL) AS missingDates,
    (SELECT COUNT(*) FROM kfg_v2_factor_snapshots WHERE factor='Breadth' AND (score IS NULL OR status != 'VALID')) AS invalidScoreCount,
    (SELECT COUNT(*) FROM kfg_v2_factor_snapshots WHERE factor='Breadth' AND (score < 0 OR score > 100)) AS scoreOutside0To100`).first();
  const breadthHistory = (await db.prepare(`SELECT date,score FROM kfg_v2_factor_snapshots
    WHERE factor='Breadth'${bounds} ORDER BY date ASC`).bind(...args).all()).results;
  const historyCounts = (await db.prepare(`SELECT security_id AS securityId, COUNT(DISTINCT date) AS historyCount
    FROM kfg_v2_market_rows WHERE 1=1${bounds} GROUP BY security_id`).bind(...args).all()).results;
  const marketRows = (await db.prepare(`SELECT date,security_id AS securityId,short_code AS shortCode,market,
    close,return_pct AS returnPct,trading_value AS tradingValue,market_cap AS marketCap
    FROM kfg_v2_market_rows WHERE 1=1${bounds} ORDER BY date ASC,security_id ASC`).bind(...args).all()).results;
  return {checkpoint, dates, raw: {...raw, ...duplicates}, coverageRows, breadth, breadthHistory, historyCounts, marketRows};
}

export function createKfgV2PostcheckHandler({authenticate, env, reader=readD1Postcheck, componentReader, publicAccess=false} = {}) {
  if ((!publicAccess && typeof authenticate !== 'function') || !env?.DB) throw Error('INVALID_POSTCHECK_CONFIGURATION');
  return async function handle(request) {
    if (request.method !== 'GET') return json({temporary: TEMPORARY_KFG_V2_POSTCHECK_ONLY, error: 'METHOD_NOT_ALLOWED'}, 405);
    if (!publicAccess) {
      const user = await authenticate(request);
      if (!user?.userId || !normalizedEmail(user.email)) return json({temporary: TEMPORARY_KFG_V2_POSTCHECK_ONLY, error: 'AUTH_REQUIRED'}, 401);
      const operatorEmail = normalizedEmail(env[POSTCHECK_OPERATOR_EMAIL_NAME]);
      if (!operatorEmail || normalizedEmail(user.email) !== operatorEmail)
        return json({temporary: TEMPORARY_KFG_V2_POSTCHECK_ONLY, error: 'OPERATOR_REQUIRED'}, 403);
    }
    try {
      const url = new URL(request.url);
      const fromDate = url.searchParams.get('from');
      const toDate = url.searchParams.get('to');
      if (publicAccess && (!fromDate || !toDate))
        return json({temporary: 'KFG_V2_RESEARCH_READ_ONLY', error:'WINDOW_REQUIRED'},400);
      if ((fromDate || toDate) && (!/^\d{8}$/.test(fromDate||'') || !/^\d{8}$/.test(toDate||'') || fromDate > toDate))
        return json({temporary: TEMPORARY_KFG_V2_POSTCHECK_ONLY, error:'INVALID_WINDOW'},400);
      if (fromDate && toDate && Number(toDate)-Number(fromDate)>20000)
        return json({temporary: TEMPORARY_KFG_V2_POSTCHECK_ONLY, error:'WINDOW_TOO_LARGE'},413);
      const persisted = await reader(env.DB,{fromDate,toDate});
      const components = componentReader ? await componentReader() : null;
      const componentIndicators = components?.indicators ?? [];
      const adapted = researchHistoriesFromPublicIndicators(componentIndicators);
      const research = calculateResearchFactors({marketRows: persisted.marketRows ?? [], breadth: persisted.breadthHistory ?? [],
        credit: adapted.credit, liquidation: adapted.liquidation});
      const warmupReady = Object.values(research.readiness ?? {}).every(factor => factor?.ready === true);
      if (!warmupReady && research.composite) {
        research.composite = {...research.composite, status: 'UNAVAILABLE', score: null,
          observationDate: null, previousObservationDate: null, changePoints: null};
      }
      const summary = summarizeKfgV2Postcheck({...persisted, research});
      return json(publicAccess ? {...summary, temporary: 'KFG_V2_RESEARCH_READ_ONLY'} : summary);
    }
    catch { return json({temporary: TEMPORARY_KFG_V2_POSTCHECK_ONLY, error: 'READ_POSTCHECK_FAILED'}, 500); }
  };
}
import {runFscScoped} from './phase2-fsc-scoped.mjs';
import {calculateResearchFactors, researchHistoriesFromPublicIndicators} from './korea-research-v2.mjs';
