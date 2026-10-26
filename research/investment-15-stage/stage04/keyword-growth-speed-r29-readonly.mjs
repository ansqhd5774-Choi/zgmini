/**
 * R29 live five-keyword speed test: official report, Ollama schema extraction,
 * market-size CAGR and publisher narrative/metadata disagreement audit.
 * Retain all themes; do not publish ambiguous growth rates or alter scores.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEYWORDS, measureKeyword, outputText } from './keyword-growth-speed-r25-readonly.mjs';

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const model = process.argv[2] || 'gemma3:4b';
  const outputFile = join(dirname(fileURLToPath(import.meta.url)), 'R29_KEYWORD_SEARCH_TIMINGS.txt');
  const results = [];
  for (const keyword of KEYWORDS) {
    const result = await measureKeyword(keyword, {
      model, searchMode: 'publisher-site', structuredOutput: true, auditForecast: true
    });
    results.push(result);
    console.log(`KEYWORD=${keyword} STATE=${result.state} SEARCH_MS=${result.search_ms ?? 'NULL'} ` +
      `REPORT_MS=${result.report_ms} OLLAMA_MS=${result.ollama_ms ?? 'NULL'} ` +
      `TOTAL_MS=${result.total_ms} SOURCE_AUDIT=${result.source_audit} ` +
      `FAILURE=${result.failure || 'NULL'}`);
    await writeFile(outputFile, outputText(results, {
      reportName: 'STAGE04_KEYWORD_GROWTH_R29_READONLY',
      sourceName: 'TBRC_OFFICIAL_REPORT_STORE_WITH_FORECAST_CONFLICT_AUDIT'
    }), 'utf8');
  }
  console.log(`RESULT_FILE=${outputFile}`);
  const hasSourceConflicts = results.some(({ state }) => state === 'SOURCE_CONFLICT');
  console.log(`SOURCE_CONFLICT_COUNT=${results.filter(({ state }) => state === 'SOURCE_CONFLICT').length}`);
  process.exitCode = results.every(({ state }) => state === 'PASS') ? 0 :
    hasSourceConflicts && results.every(({ state }) => ['PASS', 'SOURCE_CONFLICT'].includes(state)) ? 2 : 1;
}
