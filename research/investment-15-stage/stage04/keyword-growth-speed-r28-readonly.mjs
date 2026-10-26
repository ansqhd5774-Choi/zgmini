/**
 * R28: repeat R27's five independent live keyword searches using Ollama's
 * JSON-schema format. This only tests speed and faithful report extraction.
 * Never persists publisher text or changes investment scores or orders.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEYWORDS, measureKeyword, outputText } from './keyword-growth-speed-r25-readonly.mjs';

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const model = process.argv[2] || 'gemma3:4b';
  const outputFile = join(dirname(fileURLToPath(import.meta.url)), 'R28_KEYWORD_SEARCH_TIMINGS.txt');
  const results = [];
  for (const keyword of KEYWORDS) {
    const result = await measureKeyword(keyword, {
      model,
      searchMode: 'publisher-site',
      structuredOutput: true
    });
    results.push(result);
    console.log(`KEYWORD=${keyword} STATUS=${result.state} SEARCH_MS=${result.search_ms ?? 'NULL'} ` +
      `REPORT_MS=${result.report_ms} OLLAMA_MS=${result.ollama_ms ?? 'NULL'} ` +
      `TOTAL_MS=${result.total_ms} FAILURE=${result.failure || 'NULL'}`);
    await writeFile(outputFile, outputText(results, {
      reportName: 'STAGE04_KEYWORD_GROWTH_R28_READONLY',
      sourceName: 'TBRC_OFFICIAL_REPORT_STORE_KEYWORD_SEARCH'
    }), 'utf8');
  }
  console.log(`RESULT_FILE=${outputFile}`);
  process.exitCode = results.every(({ state }) => state === 'PASS') ? 0 : 1;
}
