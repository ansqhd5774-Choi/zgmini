/** R71: Windows read-only Ollama program, 3 genuine official publishers. */
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEYWORDS, measureKeyword } from './keyword-growth-speed-r25-readonly.mjs';
import { runForecastPipeline, tbrcR30Adapter } from './ollama-forecast-pipeline-r70.mjs';
import { firstPartyOllamaAdapter } from './official-publisher-ollama-adapters-r71.mjs';
import { textSummary } from './run-ollama-forecast-r70.mjs';

export function r71Adapters({ model = 'gemma3:4b' } = {}) {
  return [
    tbrcR30Adapter(measureKeyword, { model }),
    firstPartyOllamaAdapter('SkyQuest', { model }),
    firstPartyOllamaAdapter('Precedence', { model })
  ];
}

export function topicsFromArgs(args) {
  const keywords = args.length ? args : KEYWORDS;
  const unique = [...new Set(keywords.map(x => String(x).trim()).filter(Boolean))];
  if (!unique.length || unique.length > 21) throw Error('TOPIC_COUNT_OUT_OF_BOUNDS_1_TO_21');
  return unique.map((keyword, index) => ({ id: `topic-${index + 1}`, keyword }));
}

export async function runR71(topics, adapters = r71Adapters()) {
  const report = await runForecastPipeline(topics, adapters);
  return { ...report, report: 'STAGE04_OLLAMA_FORECAST_PIPELINE_R71',
    publisher_validation: 'TBRC_R30_CONSISTENT_OR_R71_EXCERPT_PERIOD_VERIFIED',
    automatic_publish_or_score: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outputDir = dirname(fileURLToPath(import.meta.url));
  const jsonPath = join(outputDir, 'R71_OLLAMA_FORECAST_PIPELINE_RESULT.json');
  const txtPath = join(outputDir, 'R71_OLLAMA_FORECAST_PIPELINE_RESULT.txt');
  const report = await runR71(topicsFromArgs(process.argv.slice(2)));
  await writeFile(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  await writeFile(txtPath, textSummary(report), 'utf8');
  console.log(`RESULT_JSON=${jsonPath}`);
  console.log(`RESULT_TXT=${txtPath}`);
  console.log(`TOPICS=${report.results.length}`);
  console.log(`MEANS_CALCULABLE=${report.results.filter(t => t.mean_pct !== null).length}`);
  console.log(`MISSING_ADAPTERS=${report.missing_publisher_adapters.join(',') || 'NONE'}`);
  process.exitCode = report.results.some(t => t.publishers.some(p =>
    !['PASS', 'SOURCE_CONFLICT'].includes(p.state))) ? 1 : 0;
}
