/**
 * R26: change ONLY the discovery query used for each separate keyword.
 * R25's strict query returned 5/5 SEARCH_NO_MATCHED_PUBLISHER_REPORT on
 * the user's Windows PC. Keep publisher/URL gate and fail-fast behavior.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEYWORDS, measureKeyword, outputText } from './keyword-growth-speed-r25-readonly.mjs';

export function relaxedDiscoveryQuery(keyword) {
  if (!KEYWORDS.includes(keyword)) throw new Error('INVALID_TEST_KEYWORD');
  const tokens = keyword.replace(/\band\b/gi, ' ').replace(/\s+/g, ' ').trim();
  return `thebusinessresearchcompany ${tokens} global market report`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const model = process.argv[2] || 'gemma3:4b';
  const outputFile = join(dirname(fileURLToPath(import.meta.url)), 'R26_KEYWORD_SEARCH_TIMINGS.txt');
  const all = [];
  for (const keyword of KEYWORDS) {
    const result = await measureKeyword(keyword,
      { model, searchQuery: relaxedDiscoveryQuery(keyword) });
    all.push(result);
    console.log(`KEYWORD=${keyword} STATE=${result.state} RSS_ITEMS=${result.rss_items ?? 'NULL'} ` +
      `PUBLISHER_LINKS=${result.publisher_index_links ?? 'NULL'} ` +
      `OLLAMA_MS=${result.ollama_ms ?? 'NULL'} FAILURE=${result.failure || 'NULL'}`);
    await writeFile(outputFile, outputText(all,
      { reportName: 'STAGE04_KEYWORD_GROWTH_R26_READONLY' }), 'utf8');
  }
  console.log(`RESULT_FILE=${outputFile}`);
  process.exitCode = all.every((item) => item.state === 'PASS') ? 0 : 1;
}
