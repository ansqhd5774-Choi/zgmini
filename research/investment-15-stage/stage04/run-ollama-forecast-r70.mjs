/** R70 Windows CLI: genuine TBRC lookup -> Ollama -> strict validation. */
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEYWORDS, measureKeyword } from './keyword-growth-speed-r25-readonly.mjs';
import { runForecastPipeline, tbrcR30Adapter } from './ollama-forecast-pipeline-r70.mjs';

export function textSummary(report) {
  return [
    `REPORT=${report.report}`, `MODE=${report.mode}`,
    'SCORE_OR_TRADE=NONE',
    `ACTIVE_PUBLISHERS=${report.configured_publishers.join(',')}`,
    `MISSING_ADAPTERS=${report.missing_publisher_adapters.join(',') || 'NONE'}`,
    ...report.results.flatMap((topic, index) => [
      `TOPIC_${index + 1}=${topic.keyword}`, `STATE=${topic.state}`,
      `SOURCE_COUNT=${topic.source_count}`, `MEAN_PCT=${topic.mean_pct ?? 'NULL'}`,
      `WARNINGS=${topic.warnings.join(',')}`,
      ...topic.publishers.flatMap(p => [
        `PUBLISHER=${p.publisher}`, `PUBLISHER_STATE=${p.state}`,
        `SOURCE_URL=${p.report_url || 'NULL'}`,
        `CAGR_PCT=${p.growth_pct ?? 'NULL'}`,
        `SOURCE_AUDIT=${p.source_audit}`,
        `FAILURE=${p.reason || 'NULL'}`,
        `SEARCH_MS=${p.search_ms ?? 'NULL'}`,
        `REPORT_MS=${p.report_ms ?? 'NULL'}`,
        `OLLAMA_MS=${p.ollama_ms ?? 'NULL'}`,
        `TOTAL_MS=${p.total_ms ?? 'NULL'}`,
        `OBSERVED_AT=${p.observed_at}`
      ])
    ]), ''
  ].join('\r\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputDir = dirname(fileURLToPath(import.meta.url));
  const keywords = process.argv.slice(2).length ? process.argv.slice(2) : KEYWORDS;
  const topics = keywords.map((keyword, index) => ({ id: `topic-${index + 1}`, keyword }));
  const report = await runForecastPipeline(topics, [tbrcR30Adapter(measureKeyword)]);
  const jsonPath = join(outputDir, 'R70_OLLAMA_FORECAST_PIPELINE_RESULT.json');
  const txtPath = join(outputDir, 'R70_OLLAMA_FORECAST_PIPELINE_RESULT.txt');
  await writeFile(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  await writeFile(txtPath, textSummary(report), 'utf8');
  console.log(`RESULT_JSON=${jsonPath}`);
  console.log(`RESULT_TXT=${txtPath}`);
  console.log(`TOPICS=${report.results.length}`);
  console.log(`MEANS_CALCULABLE=${report.results.filter(t => t.mean_pct !== null).length}`);
  console.log(`MISSING_ADAPTERS=${report.missing_publisher_adapters.join(',') || 'NONE'}`);
  // Single-source R70 must never claim the 2-publisher gate passed.
  process.exitCode = report.results.some(t => t.publishers.some(p =>
    !['PASS', 'SOURCE_CONFLICT'].includes(p.state))) ? 1 : 0;
}
