/**
 * R31: fresh discovery of ALL currently published sectors and themes.
 * ONE official publisher search + ONE matched report + ONE local Ollama call
 * per recognised topic. No score, DB, order, scheduler or deployment changes.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchResearchUniverse } from './stage04-all-universe-r31.mjs';
import { measureKeyword, outputText } from './keyword-growth-speed-r25-readonly.mjs';

export async function researchAll({ fetchFn = fetch, model = 'gemma3:4b',
  outputFile = null, onProgress = () => {}, strictMarketScope = false,
  reportName = 'STAGE04_ALL_SECTORS_THEMES_R31_READONLY' } = {}) {
  const { rows, errors } = await fetchResearchUniverse({ fetchFn });
  const allowedKeywords = [...new Set(rows.map(x => x.keyword).filter(Boolean))];
  const results = [];
  for (const row of rows) {
    const result = row.keyword
      ? await measureKeyword(row.keyword, {
        fetchFn, model, allowedKeywords,
        searchMode: 'publisher-site', structuredOutput: true,
        auditForecast: true, rateOnlyFromSource: true,
        resolveHistoricTableMislabel: true, strictMarketScope
      })
      : { keyword: null, state: 'NO_RESEARCH_MAPPING', growth_pct: null,
        failure: 'CATEGORY_NOT_MAPPED_NO_GUESS', source_audit: 'NOT_RUN',
        search_requests: 0, report_requests: 0, ollama_generations: 0,
        search_ms: null, report_ms: 0, ollama_ms: null, total_ms: 0 };
    const joined = { type: row.type, id: row.id, name: row.name,
      scope: row.scope, ...result };
    results.push(joined);
    onProgress(joined, results.length, rows.length);
    if (outputFile) await writeFile(outputFile, outputText(results, {
      reportName,
      sourceName: strictMarketScope
        ? 'ZGMINI_LIVE_CATEGORIES_TBRC_DIRECT_MARKET_TITLE_ONLY_OLLAMA'
        : 'ZGMINI_LIVE_CATEGORIES_TBRC_SINGLE_REPORT_PER_CATEGORY_OLLAMA',
    }) + `\r\nFEED_ERRORS=${errors.join(',') || 'NONE'}\r\n`, 'utf8');
  }
  return { rows: results, errors,
    status: errors.length ? 'PARTIAL_FEED' :
      results.some(x => x.state !== 'PASS') ? 'PARTIAL_RESEARCH' : 'RESEARCH_PASS',
    counts: { sectors: rows.filter(x => x.type === 'SECTOR').length,
      themes: rows.filter(x => x.type === 'THEME').length,
      passed: results.filter(x => x.state === 'PASS').length,
      resolvedHistoric: results.filter(x => x.source_audit === 'RESOLVED_HISTORIC_RATE_MISLABEL').length,
      missing: results.filter(x => x.state !== 'PASS').length } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const model = process.argv[2] || 'gemma3:4b';
  const outputFile = join(dirname(fileURLToPath(import.meta.url)), 'R31_ALL_SECTOR_THEME_GROWTH_RESULT.txt');
  researchAll({ model, outputFile, onProgress: (row, index, total) => {
    console.log(`${index}/${total} ${row.type}=${row.name} ` +
      `STATE=${row.state} RATE=${row.growth_pct ?? 'NULL'} ` +
      `AUDIT=${row.source_audit} FAILURE=${row.failure || 'NULL'}`);
  } }).then(({ counts, status, errors }) => {
    console.log(`STATUS=${status} SECTORS=${counts.sectors} THEMES=${counts.themes} ` +
      `PASS=${counts.passed} RESOLVED_HISTORIC=${counts.resolvedHistoric} ` +
      `PENDING=${counts.missing} FEED_ERRORS=${errors.join(',') || 'NONE'}`);
    console.log(`RESULT_FILE=${outputFile}`);
    process.exitCode = status === 'RESEARCH_PASS' ? 0 : 2;
  }).catch(error => {
    console.error(`R31_RUN_FAILED=${String(error?.message || error)}`);
    process.exitCode = 1;
  });
}
