/**
 * R72: fail-visible Windows entry for the existing R71 multi-publisher program.
 * All source/Ollama decisions remain in R71; this wrapper only records real
 * execution state and incremental outputs, even when module loading fails.
 */
import { writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPORT_NAME = 'STAGE04_OLLAMA_FORECAST_PIPELINE_R72';
const JSON_FILE = 'R72_OLLAMA_FORECAST_PIPELINE_RESULT.json';
const TXT_FILE = 'R72_OLLAMA_FORECAST_PIPELINE_RESULT.txt';

function failureText(error) {
  return String(error?.message || error || 'UNKNOWN_ERROR').replace(/[\r\n]+/g, ' ').slice(0, 700);
}

export function summarizeR72(report) {
  const lines = [
    `REPORT=${REPORT_NAME}`,
    `RUN_STATE=${report.run_state}`,
    `STARTED_AT=${report.started_at}`,
    `LAST_UPDATED_AT=${report.last_updated_at}`,
    `NODE_VERSION=${report.node_version}`,
    `TOPICS_DONE=${report.topics_done}`,
    `TOPICS_TOTAL=${report.topics_total ?? 'UNKNOWN'}`,
    `MEANS_CALCULABLE=${report.means_calculable}`,
    `FATAL_ERROR=${report.fatal_error || 'NONE'}`,
    'MODE=READONLY_LOCAL_OLLAMA_OFFICIAL_PUBLISHERS',
    'NOTE=RUN_STATE_COMPLETED_DOES_NOT_MEAN_PUBLISHERS_SUCCEEDED',
    ...report.results.flatMap((topic, i) => [
      `TOPIC_${i + 1}=${topic.keyword}`,
      `TOPIC_STATE=${topic.state}`,
      `SOURCE_COUNT=${topic.source_count}`,
      `MEAN_PCT=${topic.mean_pct ?? 'NULL'}`,
      `WARNINGS=${(topic.warnings || []).join(',')}`,
      ...(topic.publishers || []).flatMap(p => [
        `PUBLISHER=${p.publisher}`,
        `PUBLISHER_STATE=${p.state}`,
        `SOURCE_URL=${p.report_url || 'NULL'}`,
        `CAGR_PCT=${p.growth_pct ?? 'NULL'}`,
        `SOURCE_AUDIT=${p.source_audit || 'NULL'}`,
        `FAILURE=${p.reason || 'NONE'}`,
        `SEARCH_REQUESTS=${p.search_requests ?? 'NULL'}`,
        `REPORT_REQUESTS=${p.report_requests ?? 'NULL'}`,
        `DISCOVERY=${(p.discovery_diagnostics || []).map(d =>
          `${d.method}:${d.state}:${d.found}`).join('|') || 'NONE'}`,
        `TOTAL_MS=${p.total_ms ?? 'NULL'}`
      ])
    ]), ''
  ];
  return lines.join('\r\n');
}

async function persist(dir, state) {
  state.last_updated_at = new Date().toISOString();
  await writeFile(join(dir, JSON_FILE), JSON.stringify(state, null, 2) + '\n', 'utf8');
  await writeFile(join(dir, TXT_FILE), summarizeR72(state), 'utf8');
}

/** A loader can be injected only for deterministic local regression tests. */
export async function executeR72({
  outputDir = dirname(fileURLToPath(import.meta.url)),
  args = [],
  loadProgram = () => import('./run-ollama-forecast-r71.mjs')
} = {}) {
  const state = {
    report: REPORT_NAME,
    run_state: 'STARTED',
    started_at: new Date().toISOString(),
    last_updated_at: null,
    node_version: process.version,
    publisher_adapter_revision: 'R73_OFFICIAL_DISCOVERY_REPAIR',
    topics_total: null,
    topics_done: 0,
    means_calculable: 0,
    configured_publishers: [],
    fatal_error: null,
    results: [],
    historical_cagr_used: false,
    score_or_trade: 'NONE'
  };
  // The first files are written BEFORE importing any project module.
  await persist(outputDir, state);
  try {
    const [major, minor] = process.versions.node.split('.').map(Number);
    if (major < 20 || (major === 20 && minor < 3)) {
      throw Error('NODE_20_3_OR_NEWER_REQUIRED');
    }
    const { topicsFromArgs, r71Adapters, runR71 } = await loadProgram();
    const topics = topicsFromArgs(args);
    const adapters = r71Adapters();
    state.topics_total = topics.length;
    state.configured_publishers = adapters.map(a => a.id);
    state.run_state = 'RUNNING';
    await persist(outputDir, state);
    for (const topic of topics) {
      const partial = await runR71([topic], adapters);
      if (!Array.isArray(partial?.results) || partial.results.length !== 1) {
        throw Error('R71_INVALID_SINGLE_TOPIC_RESULT');
      }
      state.results.push(partial.results[0]);
      state.topics_done = state.results.length;
      state.means_calculable = state.results.filter(r => r.mean_pct !== null).length;
      await persist(outputDir, state); // preserve completed topic if interrupted later
      console.log(`TOPIC_DONE=${state.topics_done}/${state.topics_total} MEAN=${partial.results[0].mean_pct ?? 'NULL'}`);
    }
    state.run_state = 'COMPLETED';
  } catch (error) {
    state.run_state = state.topics_done ? 'PARTIAL_ERROR' : 'EXECUTION_FAILED';
    state.fatal_error = failureText(error);
  }
  await persist(outputDir, state);
  return state;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await executeR72({ args: process.argv.slice(2) });
  console.log(`RUN_STATE=${report.run_state}`);
  console.log(`TOPICS_DONE=${report.topics_done}/${report.topics_total ?? 'UNKNOWN'}`);
  console.log(`RESULT_JSON=${join(dirname(fileURLToPath(import.meta.url)), JSON_FILE)}`);
  console.log(`RESULT_TXT=${join(dirname(fileURLToPath(import.meta.url)), TXT_FILE)}`);
  if (report.fatal_error) console.error(`FATAL_ERROR=${report.fatal_error}`);
  process.exitCode = report.run_state === 'COMPLETED' ? 0 : 1;
}
