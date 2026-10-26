/**
 * R33: live sector/theme catalogue -> TBRC strict direct market (R32) ->
 * Grand View Research -> Mordor Intelligence -> Fortune Business Insights.
 * Only FAILED topics advance. Four publishers, max one search/report/model each.
 * Research-only: no ETF scores, trades, writes to DB or deployment.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchResearchUniverse } from './stage04-all-universe-r31.mjs';
import { measureKeyword } from './keyword-growth-speed-r25-readonly.mjs';
import { FALLBACK_SOURCES, FALLBACK_MAX_MS,
  measureFallback } from './keyword-growth-fallback-r33-readonly.mjs';

export const REPORT_NAME = 'STAGE04_ALL_SECTOR_THEME_R33_FOUR_SOURCE_FAST_FALLBACK_READONLY';
export const FIRST_PUBLISHER = 'The Business Research Company';
export const PER_PUBLISHER_MAX_MS = FALLBACK_MAX_MS;
export const MAX_ATTEMPTS = 4;
export const MAX_TOTAL_MS_PER_TOPIC = PER_PUBLISHER_MAX_MS * MAX_ATTEMPTS;

const clip = x => String(x ?? 'NULL').replace(/[\r\n=|]/g, ' ').slice(0, 260);
function format(results, errors) {
  const lines = [`REPORT=${REPORT_NAME}`, 'MODE=LIVE_READONLY_FOUR_SOURCE_FAST_FALLBACK',
    'PUBLICATION=NONE', 'SCORES_AND_DB_UNCHANGED=YES',
    `MAX_ATTEMPTS=${MAX_ATTEMPTS}`, `MAX_MS_PER_PUBLISHER=${PER_PUBLISHER_MAX_MS}`,
    `MAX_MS_PER_TOPIC=${MAX_TOTAL_MS_PER_TOPIC}`,
    `COUNTS_TOTAL=${results.length}`,
    `COUNTS_PASS=${results.filter(r => r.state === 'PASS').length}`,
    `COUNTS_UNRESOLVED=${results.filter(r => r.state !== 'PASS').length}`,
    `FEED_ERRORS=${errors.join(',') || 'NONE'}`];
  for (const name of [FIRST_PUBLISHER, ...FALLBACK_SOURCES.map(x => x.publisher)]) {
    const steps = results.flatMap(row => row.attempts.filter(a => a.publisher === name));
    const elapsed = steps.filter(a => Number.isFinite(a.total_ms));
    lines.push(`SPEED_${name.toUpperCase().replace(/[^A-Z]+/g, '_')}_COUNT=${steps.length}`,
      `SPEED_${name.toUpperCase().replace(/[^A-Z]+/g, '_')}_AVG_MS=${elapsed.length
        ? Math.round(elapsed.reduce((n, a) => n + a.total_ms, 0) / elapsed.length) : 'NULL'}`);
  }
  for (const [index, row] of results.entries()) {
    lines.push('', `ROW=${index + 1}`, `TYPE=${clip(row.type)}`, `ID=${clip(row.id)}`,
      `NAME=${clip(row.name)}`, `KEYWORD=${clip(row.keyword)}`, `STATE=${row.state}`,
      `GROWTH_PCT=${row.growth_pct ?? 'NULL'}`, `METRIC=${clip(row.metric)}`,
      `PERIOD_START=${row.period_start ?? 'NULL'}`,
      `PERIOD_END=${row.period_end ?? 'NULL'}`, `PUBLISHER=${clip(row.publisher)}`,
      `RESULT_URL=${clip(row.result_url)}`, `SCOPE=${clip(row.scope)}`,
      `ATTEMPTS=${row.attempts.length}`, `TOTAL_MS=${row.total_ms}`,
      `SOURCE_AUDIT=${clip(row.source_audit)}`, `FAILURE=${clip(row.failure)}`);
    for (const [i, step] of row.attempts.entries()) {
      const n = `ATTEMPT_${i + 1}`;
      for (const k of ['publisher', 'state', 'failure', 'search_requests',
        'report_requests', 'ollama_generations', 'search_ms', 'report_ms',
        'ollama_ms', 'total_ms', 'growth_pct', 'period_start', 'period_end',
        'source_audit', 'result_url']) lines.push(`${n}_${k.toUpperCase()}=${clip(step[k])}`);
    }
  }
  return lines.join('\r\n') + '\r\n';
}

/** Each source is invoked once at most; mock injectors exist only for tests. */
export async function researchFourSources({ fetchFn = fetch, model = 'gemma3:4b',
  outputFile = null, onProgress = () => {}, universe = null,
  firstResearch = measureKeyword, fallbackResearch = measureFallback,
  now = () => performance.now() } = {}) {
  const { rows, errors } = universe || await fetchResearchUniverse({ fetchFn });
  const allowedKeywords = [...new Set(rows.map(x => x.keyword).filter(Boolean))];
  const results = [];
  for (const row of rows) {
    const began = now();
    const attempts = [];
    let successful = null;
    if (row.keyword) {
      const first = await firstResearch(row.keyword, { fetchFn, model,
        allowedKeywords, maxMs: PER_PUBLISHER_MAX_MS,
        searchMode: 'publisher-site', structuredOutput: true,
        auditForecast: true, rateOnlyFromSource: true,
        resolveHistoricTableMislabel: true, strictMarketScope: true });
      attempts.push(first);
      if (first.state === 'PASS') successful = first;
      if (!successful) {
        for (const source of FALLBACK_SOURCES) {
          const next = await fallbackResearch(row.keyword, source,
            { fetchFn, model, maxMs: PER_PUBLISHER_MAX_MS });
          attempts.push(next);
          if (next.state === 'PASS') { successful = next; break; }
        }
      }
    }
    const chosen = successful || {};
    const last = attempts.at(-1);
    const merged = { type: row.type, id: row.id, name: row.name,
      keyword: row.keyword, scope: row.scope,
      state: successful ? 'PASS' : 'FAILED',
      growth_pct: chosen.growth_pct ?? null,
      metric: chosen.metric ?? null,
      period_start: chosen.period_start ?? null,
      period_end: chosen.period_end ?? null,
      publisher: chosen.publisher ?? null,
      result_url: chosen.result_url ?? null,
      source_audit: chosen.source_audit ?? 'NOT_PASSED',
      failure: successful ? null : row.keyword
        ? (last?.failure || 'ALL_FOUR_SOURCES_EXHAUSTED')
        : 'CATEGORY_NOT_MAPPED_NO_GUESS',
      attempts, total_ms: Math.round(now() - began) };
    results.push(merged);
    onProgress(merged, results.length, rows.length);
    if (outputFile) await writeFile(outputFile, format(results, errors), 'utf8');
  }
  return { rows: results, errors,
    counts: { sectors: rows.filter(r => r.type === 'SECTOR').length,
      themes: rows.filter(r => r.type === 'THEME').length,
      passed: results.filter(r => r.state === 'PASS').length,
      missing: results.filter(r => r.state !== 'PASS').length,
      attempts: results.reduce((n, r) => n + r.attempts.length, 0) },
    status: errors.length ? 'PARTIAL_FEED' :
      results.some(r => r.state !== 'PASS') ? 'PARTIAL_RESEARCH' : 'RESEARCH_PASS' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputFile = join(dirname(fileURLToPath(import.meta.url)),
    'R33_ALL_SECTOR_THEME_GROWTH_RESULT.txt');
  const model = process.argv[2] || 'gemma3:4b';
  researchFourSources({ model, outputFile, onProgress: (row, index, total) => {
    console.log(`${index}/${total} ${row.type}=${row.name} ` +
      `STATE=${row.state} CAGR=${row.growth_pct ?? 'NULL'} ` +
      `SOURCE=${row.publisher || 'NONE'} ATTEMPTS=${row.attempts.length} ` +
      `MS=${row.total_ms} FAILURE=${row.failure || 'NULL'}`);
  } }).then(({ status, counts, errors }) => {
    console.log(`STATUS=${status} SECTORS=${counts.sectors} THEMES=${counts.themes} ` +
      `PASS=${counts.passed} PENDING=${counts.missing} ATTEMPTS=${counts.attempts} ` +
      `FEED_ERRORS=${errors.join(',') || 'NONE'}`);
    console.log('NOTE=FORECAST_MARKET_PROXIES_NOT_REALIZED_SECTOR_GROWTH_OR_G_SCORE');
    console.log(`RESULT_FILE=${outputFile}`);
    process.exitCode = status === 'RESEARCH_PASS' ? 0 : 2;
  }).catch(error => {
    console.error('R33_RUN_FAILED=' + String(error?.message || error));
    process.exitCode = 1;
  });
}
