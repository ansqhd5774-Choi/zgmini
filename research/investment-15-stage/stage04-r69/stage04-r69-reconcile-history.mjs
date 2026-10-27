/**
 * R69: join existing R17 observed ETF sentiment + industry proxy evidence with
 * the existing R63 21-topic publisher forecast means. No new collection.
 * Both snapshots retain their actual separate evidence dates and scope.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { buildR68Comparison } from '../stage04-r68/stage04-r68-matrix.mjs';
import { STAGE03_THEME_IDS } from '../stage04-r67/live-f-adapter-r67.mjs';

const EXPECTED_APPROVED_THEME_COUNT = Object.keys(STAGE03_THEME_IDS).length;

function requiredMatch(text, expression, label) {
  const match = text.match(expression);
  if (!match) throw new Error(`R17_REQUIRED_METADATA_NOT_FOUND: ${label}`);
  return match[1];
}

function evidenceKind(description, direction) {
  if (description.includes('원값 없음')) return 'NO_OFFICIAL_OBSERVATION';
  if (description.includes('%p')) return 'TWO_YEAR_PERCENTAGE_POINT_CHANGE_NOT_YOY';
  if (description.includes('9%') && description.includes('예산')) return 'LEVEL_SHARE_ONLY_NOT_GROWTH';
  if (description.includes('YoY') && (description.includes('반올림') || description.includes('약 +'))) {
    return 'PUBLISHER_ROUNDED_YOY';
  }
  if (description.includes('YoY')) return 'PUBLISHED_YOY_IN_SCOPE';
  return direction === '증감 불명' ? 'LEVEL_OR_CHANGE_UNDEFINED' : 'NO_COMPARABLE_GROWTH_SERIES';
}

export function parseR17History(markdown) {
  if (typeof markdown !== 'string') throw new TypeError('R17 text required');
  const fetchedAt = requiredMatch(markdown, /재조회 완료:\s*`([^`]+)`/, 'fetched_at');
  const apiSourceVersion = requiredMatch(markdown, /API 출처 버전\s*`([^`]+)`/, 'api_source_version');
  const observationDate = requiredMatch(markdown, /F 자료 관측일\s*\*\*(\d{4}-\d{2}-\d{2})\*\*/, 'f_observation_date');
  const parsed = [];
  const seen = new Set();
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map(value => value.trim());
    if (cells.length !== 6) continue;
    const [name, rawScore, displayBand, rawIndustry, direction, note] = cells;
    const topicId = STAGE03_THEME_IDS[name];
    if (!topicId) continue;
    if (seen.has(topicId)) throw new Error(`R17_DUPLICATE_THEME: ${name}`);
    seen.add(topicId);
    const scoreMatch = rawScore.match(/^(\d+(?:\.\d+)?)(\s*\(잠정\))?$/);
    if (!scoreMatch) throw new Error(`R17_INVALID_DISPLAY_SCORE: ${name}: ${rawScore}`);
    const score = Number(scoreMatch[1]);
    if (!Number.isFinite(score) || score < 0 || score > 100) throw new Error(`R17_OUT_OF_RANGE_F: ${name}`);
    const description = rawIndustry.replace(/\*\*/g, '');
    const evidence = evidenceKind(description, direction);
    parsed.push({
      topic_id: topicId,
      theme: name,
      score,
      display_precision: 'R17_TABLE_ROUNDED_TO_TWO_DECIMALS_NOT_RAW_API_PRECISION',
      status: scoreMatch[2] ? 'PROVISIONAL' : 'CONFIRMED',
      observed_at: observationDate,
      source: 'STAGE04_R17_HISTORICAL_REPORT',
      source_version: apiSourceVersion,
      fetched_at: fetchedAt,
      display_band: displayBand,
      industry: {
        description,
        direction,
        evidence_kind: evidence,
        source_observed: evidence !== 'NO_OFFICIAL_OBSERVATION',
        direction_measurable: direction === '증가' || direction === '감소',
        former_review_hypothesis: note.includes('추가 검토 가설'),
        review_note: note,
      },
    });
  }
  if (parsed.length !== EXPECTED_APPROVED_THEME_COUNT) {
    throw new Error(`R17_THEME_COUNT_MISMATCH: expected 9, got ${parsed.length}`);
  }
  return {
    fetched_at: fetchedAt,
    observation_date: observationDate,
    api_source_version: apiSourceVersion,
    records: parsed,
  };
}

export function reconcileHistoricalResearch(r63Markdown, r17Markdown) {
  const historical = parseR17History(r17Markdown);
  const snapshot = buildR68Comparison(r63Markdown, {
    records: historical.records,
    fStatus: 'R17_HISTORICAL_2026_10_23_NOT_LIVE_F',
  });
  const evidenceByTopic = new Map(historical.records.map(record => [record.topic_id, record]));
  const topics = snapshot.topics.map(row => ({
    ...row,
    industry_activity: evidenceByTopic.get(row.topic_id)?.industry ?? null,
    status: evidenceByTopic.has(row.topic_id) ? 'HISTORICAL_JOIN_TWO_INDEPENDENT_AXES' : 'F_NOT_IN_R17_HISTORY',
  }));
  return {
    ...snapshot,
    schema_version: 'stage04-r69-joined-historical-evidence-v1',
    model_status: 'HISTORICAL_TWO_AXIS_RESEARCH_ONLY_NOT_CURRENT_NOT_APPROVED_FOR_INVESTMENT_SCORE',
    source_basis: {
      forecast: 'R63_2026_10_27_PUBLISHER_FORECAST_RESEARCH',
      historical_f: 'R17_OBSERVED_2026_10_23_AND_READ_2026_10_25',
      historical_f_observation_date: historical.observation_date,
      historical_f_retrieval_utc: historical.fetched_at,
      historical_f_source_version: historical.api_source_version,
      r17_sha256: createHash('sha256').update(r17Markdown).digest('hex'),
    },
    counts: {
      ...snapshot.counts,
      historical_f_matched: historical.records.length,
      historical_industry_sources_observed: historical.records.filter(r => r.industry.source_observed).length,
      historical_activity_direction_measurable: historical.records.filter(r => r.industry.direction_measurable).length,
      historical_low_f_rising_proxy_hypotheses: historical.records.filter(r => r.industry.former_review_hypothesis).length,
      current_live_f_verified: 0,
    },
    topics,
  };
}

export function formatHistoricalMarkdown(report) {
  const observedDate = report.source_basis.historical_f_observation_date;
  const retrievedDate = report.source_basis.historical_f_retrieval_utc.slice(0, 10);
  const lines = [
    '# 04단계 R69 — 과거 확보 자료 21개 전망 + 9개 ETF 공탐 + 산업활동 병렬표',
    '',
    `> **R17 ${observedDate} F 관측 / ${retrievedDate} 재조회 / R63 2026-10-27 연구 조사**. 현재 실시간 점수 아님.`,
    '> **투자 매력도 D/M·공식 순위 미산출.** CAGR은 발행사 정의 시장의 미래 전망 평균으로 실측 성장률 아님.',
    '',
    '| 주제 | 전망 CAGR 평균 | 유효 매체 | R17 과거 F | F 관측일 | 당시 산업활동 근거 | 방향 |',
    '|---|---:|---:|---:|---|---|---|',
  ];
  for (const row of report.topics) {
    const f = row.sentiment_f;
    const activity = row.industry_activity;
    const mean = row.forecast.mean_cagr_pct === null ? 'NULL' : `${row.forecast.mean_cagr_pct.toFixed(4)}%`;
    lines.push(`| ${row.topic.replace(/\|/g, '/')} | ${mean} | ${row.forecast.publisher_count} | ${f ? `${f.score.toFixed(2)}${f.status === 'PROVISIONAL' ? ' 잠정' : ''}` : 'NULL'} | ${f?.observation_date ?? '—'} | ${activity?.description.replace(/\|/g, '/') ?? '—'} | ${activity?.direction ?? '—'} |`);
  }
  lines.push('', `- 21개 CAGR 연구 평균 **${report.counts.forecast_mean_ready}/21**, 유효 매체 수치 **${report.counts.valid_publisher_values}/63**.`,
    `- 기존 ETF 테마의 과거 F **${report.counts.historical_f_matched}/9**, 당시 산업 공식 원천 **${report.counts.historical_industry_sources_observed}/9**, 변화 방향 **${report.counts.historical_activity_direction_measurable}/9**.`,
    '- 과거 R17 F는 표시용 소수점 두 자리이며 기존 API 원시 점수의 전체 정밀도를 보장하지 않습니다.',
    '- 자료기간/지역/하위시장/성장률 종류가 다르므로 각 산업 원시 성장률을 직접 횡단면 비교하여 단일 매력 점수를 만들지 않습니다.',
    '- 기존 승인 ETF 9개 통과 기록, 공탐 산식, 원본 연구 자료는 변경하지 않았습니다.',
    '');
  return lines.join('\n');
}

async function cli() {
  const args = process.argv.slice(2);
  const pos = key => {
    const i = args.indexOf(key);
    return i < 0 ? null : args[i + 1] ?? null;
  };
  const r63 = pos('--r63');
  const r17 = pos('--r17');
  if (!r63 || !r17) throw new Error('Usage: --r63 R63.md --r17 R17.md [--json-output file.json] [--markdown-output file.md]');
  const report = reconcileHistoricalResearch(readFileSync(r63, 'utf8'), readFileSync(r17, 'utf8'));
  const jsonPath = pos('--json-output');
  const mdPath = pos('--markdown-output');
  if (args.includes('--json-output') && !jsonPath) throw new Error('Missing JSON output path');
  if (args.includes('--markdown-output') && !mdPath) throw new Error('Missing Markdown output path');
  if (jsonPath) writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  if (mdPath) writeFileSync(mdPath, formatHistoricalMarkdown(report), 'utf8');
  process.stdout.write(`R69 HISTORICAL_ONLY: CAGR ${report.counts.forecast_mean_ready}/21, `
    + `F ${report.counts.historical_f_matched}/9 (observed ${report.source_basis.historical_f_observation_date}), `
    + `industry evidence ${report.counts.historical_industry_sources_observed}/9, `
    + `direction ${report.counts.historical_activity_direction_measurable}/9, `
    + 'G/D/M and investment ranking NULL, live GET 0, trades 0\n');
  if (!jsonPath && !mdPath) process.stdout.write(`${formatHistoricalMarkdown(report)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  cli().catch(error => {
    process.stderr.write(`R69_HISTORY_JOIN_FAILED: ${error.message}\n`);
    process.exitCode = 1;
  });
}
