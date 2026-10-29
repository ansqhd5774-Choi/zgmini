/**
 * Stage04 R85: read-only comparison of three actual R82 Windows/Ollama runs.
 * Each run MUST have independently performed fresh provider GET and Ollama extraction.
 * Repeated runs of the same publisher are NOT independent publishers and are not averaged.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXPECTED_TOPICS = 21;
const HOSTS = Object.freeze({
  TBRC: 'www.thebusinessresearchcompany.com',
  SkyQuest: 'www.skyquestt.com',
  Precedence: 'www.precedenceresearch.com'
});

const finite = x => typeof x === 'number' && Number.isFinite(x);
const trimmed = x => x === null || x === undefined ? 'NULL' : String(x);

export function auditOneR82Run(data, runNumber) {
  const failures = [];
  const topics = Array.isArray(data?.results) ? data.results : [];
  const metrics = {run: runNumber, state: data?.run_state ?? null,
    started_at: data?.started_at ?? null,
    topic_count: topics.length, average_ready: 0, verified_cells: 0,
    failed_cells: 0, two_publisher_means: 0, three_publisher_means: 0,
    historic_used: data?.historical_cagr_used ?? null, topics: [], failures};
  if (data?.run_state !== 'COMPLETED') failures.push('RUN_STATE_NOT_COMPLETED');
  if (data?.topics_total !== EXPECTED_TOPICS || data?.topics_done !== EXPECTED_TOPICS || topics.length !== EXPECTED_TOPICS)
    failures.push('TOPIC_COVERAGE_NOT_21');
  if (data?.historical_cagr_used !== false) failures.push('HISTORICAL_CAGR_IMPORT_NOT_DISABLED');
  if (!data?.started_at || Number.isNaN(Date.parse(data.started_at)))
    failures.push('INDEPENDENT_RUN_TIMESTAMP_MISSING');
  if (data?.score_or_trade && data.score_or_trade !== 'NONE') failures.push('SCORE_OR_TRADE_NOT_NONE');
  const seen = new Set();
  for (const row of topics) {
    const key = row?.keyword;
    if (typeof key !== 'string' || !key.trim() || seen.has(key)) {
      failures.push('TOPIC_NAME_MISSING_OR_DUPLICATED');
      continue;
    }
    seen.add(key);
    const sources = Array.isArray(row.publishers) ? row.publishers : [];
    if (sources.length !== 3 || new Set(sources.map(p=>p.publisher)).size !== 3)
      failures.push(`PUBLISHER_ROSTER_INVALID:${key}`);
    const valid = [];
    for (const p of sources) {
      if (!HOSTS[p.publisher]) failures.push(`UNKNOWN_PUBLISHER:${key}`);
      if (p.state === 'PASS') {
        if (!finite(p.growth_pct) || p.metric !== 'FORECAST_CAGR' || !p.observed_at || !p.report_url)
          failures.push(`INVALID_PASS_SOURCE:${key}:${p.publisher}`);
        else {
          if (!Number.isInteger(p.report_requests) || p.report_requests < 1 ||
              !Number.isInteger(p.ollama_generations) || p.ollama_generations < 1)
            failures.push(`FRESH_GET_OR_OLLAMA_NOT_EVIDENCED:${key}:${p.publisher}`);
          try { if (new URL(p.report_url).hostname !== HOSTS[p.publisher])
            failures.push(`FOREIGN_SOURCE_DOMAIN:${key}:${p.publisher}`); }
          catch { failures.push(`INVALID_SOURCE_URL:${key}:${p.publisher}`); }
          valid.push(p);
        }
      } else if (p.growth_pct !== null) failures.push(`FAILED_SOURCE_NON_NULL:${key}:${p.publisher}`);
    }
    if (row.metric !== 'FORECAST_CAGR' || row.required_source_count !== 2)
      failures.push(`FORECAST_CONTRACT_INVALID:${key}`);
    if (row.source_count !== valid.length) failures.push(`SOURCE_COUNT_MISMATCH:${key}`);
    if (valid.length < 2 || !finite(row.mean_pct)) {
      failures.push(`LESS_THAN_TWO_VERIFIED_PUBLISHERS:${key}`);
    } else {
      const computed = valid.reduce((s,p)=>s+p.growth_pct,0) / valid.length;
      if (Math.abs(computed-row.mean_pct) >= 0.000001)
        failures.push(`ARITHMETIC_MEAN_MISMATCH:${key}`);
      else metrics.average_ready++;
    }
    if (row.state !== 'RESEARCH_MEAN_CALCULABLE') failures.push(`NOT_RESEARCH_MEAN_CALCULABLE:${key}`);
    if (valid.length === 2) metrics.two_publisher_means++;
    if (valid.length === 3) metrics.three_publisher_means++;
    metrics.verified_cells += valid.length;
    metrics.failed_cells += sources.length - valid.length;
    metrics.topics.push({keyword:key,mean_pct:row.mean_pct ?? null,source_count:valid.length,
      publisher_values:Object.fromEntries(valid.map(p=>[p.publisher,p.growth_pct])),
      warnings:Array.isArray(row.warnings)?row.warnings:[]});
  }
  if (data?.means_calculable !== metrics.average_ready) failures.push('DECLARED_MEAN_COUNT_MISMATCH');
  metrics.pass = failures.length === 0 && metrics.average_ready === EXPECTED_TOPICS;
  return metrics;
}

export function compareR85Runs(runs) {
  const failures = [];
  if (!Array.isArray(runs) || runs.length !== 3) failures.push('THREE_RUNS_REQUIRED');
  const inspected = (runs || []).map((data,i)=>auditOneR82Run(data,i+1));
  for (const run of inspected) for (const reason of run.failures) failures.push(`RUN_${run.run}:${reason}`);
  const diffs = [];
  const base = inspected[0]?.topics || [];
  const keys = base.map(t=>t.keyword);
  if (new Set(inspected.map(r=>r.started_at)).size !== 3)
    failures.push('INDEPENDENT_EXECUTION_TIMESTAMPS_NOT_DISTINCT');
  for (const run of inspected.slice(1)) {
    if (JSON.stringify(run.topics.map(t=>t.keyword)) !== JSON.stringify(keys))
      failures.push(`RUN_${run.run}:TOPIC_ROSTER_DIFFERENCE`);
  }
  for (const key of keys) {
    const entries = inspected.map(run=>run.topics.find(x=>x.keyword===key)).filter(Boolean);
    if (entries.length !== 3) continue;
    const nums = entries.map(e=>e.mean_pct);
    if (nums.every(finite)) {
      const range = Math.max(...nums)-Math.min(...nums);
      if (range >= 0.000001) diffs.push({keyword:key,means_pct:nums,range_pct_points:Number(range.toFixed(6))});
    }
  }
  return {
    report:'STAGE04_R85_THREE_INDEPENDENT_WINDOWS_OLLAMA_RUNS',
    run_mode:'EXTERNAL_WINDOWS_R82_FRESH_EXECUTION_ARTIFACTS',
    result: failures.length ? 'INCOMPLETE_REVIEW_REQUIRED' : 'PASS_THREE_21_TOPIC_RUNS',
    expected_runs:3, inspected_runs:inspected.length, verified_all_runs:failures.length===0,
    failures, runs:inspected, between_run_mean_changes:diffs,
    caveats:[
      'Same publisher observed in multiple runs is one publisher, not an additional independent publisher.',
      'Repeated forecast changes are reported, not excluded or averaged across run copies.',
      'Forecast CAGR is research-only; it is not realized GICS sector growth or Stage04 M4.',
      'This audit does not verify market F, sector F, theme F, theme selection, M4, Stage05 S5, or orders.'
    ]
  };
}

function reportText(report) {
  return [
    `REPORT=${report.report}`, `RESULT=${report.result}`,
    `INDEPENDENT_EXECUTIONS=${report.inspected_runs}`,
    `ALL_RUNS_VERIFIED=${report.verified_all_runs}`,
    ...report.runs.flatMap(r=>[
      `RUN_${r.run}_STATE=${trimmed(r.state)}`,
      `RUN_${r.run}_TOPICS=${r.topic_count}`,
      `RUN_${r.run}_CALCULABLE_MEANS=${r.average_ready}`,
      `RUN_${r.run}_VERIFIED_PUBLISHER_CELLS=${r.verified_cells}`,
      `RUN_${r.run}_FAILED_PUBLISHER_CELLS=${r.failed_cells}`,
      `RUN_${r.run}_RESULT=${r.pass?'PASS':'INCOMPLETE'}`,
    ]),
    `BETWEEN_RUN_MEAN_CHANGED_TOPICS=${report.between_run_mean_changes.length}`,
    ...report.between_run_mean_changes.map(d=>
      `CHANGED=${d.keyword};VALUES=${d.means_pct.join(',')};RANGE_PCT_POINTS=${d.range_pct_points}`),
    ...report.failures.map(f=>`FAILURE=${f}`),
    'NOTE=RESEARCH_FORECAST_ONLY_NOT_FINAL_GICS_GROWTH_OR_THEME_SELECTION',
    'NOTE=DIFFERENT_FORECAST_NUMBERS_ARE_RECORDED_NOT_AUTOMATICALLY_REJECTED',
    ''
  ].join('\r\n');
}

export async function auditR85ConsoleFiles(consolePaths, outputPrefix) {
  const runs = [], auditIssues = [], consoles = [];
  for (let i=0;i<consolePaths.length;i++) {
    let report = null;
    const log = consolePaths[i];
    try {
      const raw = await readFile(log,'utf8');
      if (!/^EXIT_CODE=0\r?$/m.test(raw))
        throw Error('R82_LAUNCH_EXIT_CODE_NOT_ZERO');
      if (!/^R82_REGRESSION_TESTS=PASS\r?$/m.test(raw))
        throw Error('R82_REGRESSION_TESTS_NOT_PASS');
      const match = raw.match(/^SEND_RESULT_JSON=(.+)\r?$/m);
      if (!match) throw Error('SEND_RESULT_JSON_NOT_FOUND');
      const outputPath=match[1].trim();
      const result=JSON.parse(await readFile(outputPath,'utf8'));
      report=result;
      consoles.push({run:i+1,console_log:resolve(log),result_json:resolve(outputPath)});
    } catch (e) {
      auditIssues.push(`RUN_${i+1}:ARTIFACT_READ_FAILED:${String(e.message).slice(0,180)}`);
      consoles.push({run:i+1,console_log:resolve(log),result_json:null});
    }
    runs.push(report);
  }
  const audited=compareR85Runs(runs);
  const paths=consoles.map(x=>x.result_json).filter(Boolean);
  if (new Set(paths).size !== 3) auditIssues.push('RESULT_JSON_PATHS_NOT_DISTINCT');
  audited.failures.unshift(...auditIssues);
  audited.consoles=consoles;
  audited.verified_all_runs=audited.failures.length===0;
  if (!audited.verified_all_runs) audited.result='INCOMPLETE_REVIEW_REQUIRED';
  await writeFile(outputPrefix+'_RESULT.json',JSON.stringify(audited,null,2)+'\n','utf8');
  await writeFile(outputPrefix+'_RESULT.txt',reportText(audited),'utf8');
  return audited;
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 6) {
    console.error('Usage: node stage04-r85-repeat-audit.mjs run1-console.txt run2-console.txt run3-console.txt output-prefix');
    process.exitCode=2;
  } else {
    try {
      const report=await auditR85ConsoleFiles(process.argv.slice(2,5),process.argv[5]);
      console.log(`RESULT=${report.result}`);
      console.log(`SEND_R85_RESULT_JSON=${process.argv[5]}_RESULT.json`);
      console.log(`SEND_R85_RESULT_TXT=${process.argv[5]}_RESULT.txt`);
      if (!report.verified_all_runs) process.exitCode=1;
    } catch (e) { console.error(`R85_AUDIT_FATAL=${String(e.message)}`); process.exitCode=2; }
  }
}
