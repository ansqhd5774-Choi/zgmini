/**
 * R30 five independent official-report lookups + local Ollama forecast CAGR,
 * using the publisher's audited forecast years instead of model-guessed years.
 * Research-only. Preserve all themes and suppress source-conflicting figures.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEYWORDS, measureKeyword, outputText } from './keyword-growth-speed-r25-readonly.mjs';

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const model = process.argv[2] || 'gemma3:4b';
  const outputFile = join(dirname(fileURLToPath(import.meta.url)), 'R30_KEYWORD_SEARCH_TIMINGS.txt');
  const results = [];
  for (const keyword of KEYWORDS) {
    const result = await measureKeyword(keyword, {
      model, searchMode: 'publisher-site', structuredOutput: true,
      auditForecast: true, rateOnlyFromSource: true
    });
    results.push(result);
    console.log(`KEYWORD=${keyword} STATE=${result.state} SEARCH_MS=${result.search_ms ?? 'NULL'} ` +
      `REPORT_MS=${result.report_ms} OLLAMA_MS=${result.ollama_ms ?? 'NULL'} ` +
      `TOTAL_MS=${result.total_ms} SOURCE_AUDIT=${result.source_audit} ` +
      `FAILURE=${result.failure || 'NULL'}`);
    await writeFile(outputFile, outputText(results, {
      reportName: 'STAGE04_KEYWORD_GROWTH_R30_READONLY',
      sourceName: 'TBRC_OFFICIAL_REPORT_FORECAST_RATE_ONLY_OLLAMA_WITH_SOURCE_YEAR_GATE'
    }), 'utf8');
  }
  console.log(`RESULT_FILE=${outputFile}`);
  console.log(`SOURCE_CONFLICT_COUNT=${results.filter(({ state }) => state === 'SOURCE_CONFLICT').length}`);
  const hasSourceConflicts = results.some(({ state }) => state === 'SOURCE_CONFLICT');
  process.exitCode = results.every(({ state }) => state === 'PASS') ? 0 :
    hasSourceConflicts && results.every(({ state }) => ['PASS', 'SOURCE_CONFLICT'].includes(state)) ? 2 : 1;
}
