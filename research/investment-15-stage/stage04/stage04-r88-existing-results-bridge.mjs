/**
 * Stage04 R88: offline join of ALREADY COMPLETED 4th-stage evidence.
 * No network, Ollama, official-source re-collection, normalization, formula,
 * approval, ranking or trade. Archived report values are explicitly historical.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildIndustryQuantCoverage } from './industry-quant-coverage-readonly.mjs';

const APPROVED = Object.freeze([
  '로봇·자동화', '클라우드·SaaS', '자율주행', '원전·SMR', '방산',
  '핀테크', '사이버보안', '바이오·신약', '데이터센터·전력',
]);
const numeric = x => typeof x === 'number' && Number.isFinite(x);
const num = text => text === undefined ? null : Number(text.replace(/,/g, '').replace('−', '-'));
const capture = (line, pattern) => num(line.match(pattern)?.[1]);

function assertR86(input) {
  if (input?.schema_version !== 'STAGE04_R86_NUMERIC_INPUT_BRIDGE_V1' ||
      input?.order_state !== 'NO_TRADE' || input?.final_selection?.next_stage_allowed !== false ||
      !Array.isArray(input.sectors) || input.sectors.length !== 11 ||
      !Array.isArray(input.themes) || input.themes.length !== 10 ||
      new Set(input.themes.map(row => row.theme_id)).size !== 10 ||
      APPROVED.some(name => !input.themes.some(row => row.theme_id === name &&
        row.stage03_approval === 'R67_BASELINE_APPROVED_NINE')) ||
      input.themes.filter(row => row.stage03_approval === 'R67_BASELINE_APPROVED_NINE').length !== 9 ||
      input.themes.some(row => row.attractiveness_m4 !== null || row.screening_rank !== null) ||
      input.sectors.some(row => !numeric(row.sector_forecast_cagr?.mean_pct)) ||
      input.themes.some(row => !numeric(row.theme_forecast_cagr?.mean_pct))) {
    throw new Error('R88_R86_COLLECTED_INPUT_INVALID');
  }
}

function parseMarkdownTable(text, start) {
  const from = text.indexOf(start);
  if (from < 0) throw new Error('R88_ARCHIVED_REPORT_TABLE_MISSING');
  const lines = text.slice(from + start.length).split(/\r?\n/);
  const rows = [];
  let inside = false;
  for (const line of lines) {
    if (line.startsWith('|')) {
      inside = true;
      if (/^\|[\s:|-]+\|$/.test(line)) continue;
      const cells = line.split('|').slice(1, -1).map(x => x.trim());
      if (cells.length >= 3 && APPROVED.includes(cells[0])) rows.push(cells);
    } else if (inside) break;
  }
  if (rows.length !== 9 || new Set(rows.map(row => row[0])).size !== 9) {
    throw new Error('R88_ARCHIVED_REPORT_NINE_ROWS_INVALID');
  }
  return rows;
}

/**
 * Parse existing, reviewed R15 + R3 report VALUES, never querying sources.
 * The R15 2026-10-25 disposition supersedes R3's older IAEA/SIPRI/IFR claims.
 * R3 contributes only previously checked exact acceleration for three series.
 */
export function parseStage04ArchivedReports(r15, r3) {
  const r15Rows = parseMarkdownTable(r15, '## 실제 조회로 만든 9개 정량 증거표');
  const r3Rows = parseMarkdownTable(r3, '## 2. 통과된 9개 테마');
  const r3Map = new Map(r3Rows.map(row => [row[0], row[2]]));
  const runAt = r15.match(/실제 연구 런\s*\*\*(\d{4}-\d{2}-\d{2}T[^*]+)\*\*/)?.[1];
  if (!runAt || !Number.isFinite(Date.parse(runAt))) throw new Error('R88_ARCHIVE_RUN_TIME_MISSING');
  const rows = r15Rows.map(([theme, observation, limitation]) => {
    const old = r3Map.get(theme);
    const evidence = {
      theme, record_type: 'HISTORICAL_STAGE04_REPORT_NOT_NEW_SOURCE_COLLECTION',
      prior_stage_run_at: runAt, observation_text: observation,
      limitation_text: limitation, metric_scope: 'SOURCE_SPECIFIC_PROXY_NOT_WHOLE_THEME',
      source_specific_yoy_pct: null, yoy_precision: 'NOT_OBSERVED',
      source_specific_acceleration_pct_points: null,
      two_year_change_pct_points_not_yoy: null,
      observed_level: null, raw_count: null,
      evidence_state: 'OBSERVATION_RECORDED',
      original_documents: [
        'STAGE04_INVESTMENT_BOT_R15_NON_EXCLUSIVE_QUANT_EVIDENCE_20261025.md',
        'STAGE04_SAME_VINTAGE_VALIDATION_R3_20261025.md',
      ],
    };
    switch (theme) {
      case '로봇·자동화':
        evidence.source_specific_yoy_pct = capture(observation, /공표\s*\+([\d.]+)%/);
        evidence.raw_count = capture(observation, /([\d,]+)대/);
        evidence.yoy_precision = 'SOURCE_ROUNDED';
        break;
      case '데이터센터·전력':
        evidence.source_specific_yoy_pct = capture(observation, /\+([\d.]+)%/);
        evidence.observed_level = capture(observation, /([\d.]+)\s*TWh/i);
        evidence.yoy_precision = 'SOURCE_APPROXIMATE';
        break;
      case '자율주행':
      case '핀테크':
        evidence.source_specific_yoy_pct = capture(observation, /\+([\d.]+)%/);
        evidence.raw_count = capture(observation, /([\d,]+)건/);
        evidence.source_specific_acceleration_pct_points = capture(old ?? '', /가속\s*([+−-]?[\d.]+)%p/);
        evidence.yoy_precision = 'DOCUMENT_ROUNDED_EXACT_SOURCE_COMPUTATION';
        break;
      case '바이오·신약':
        evidence.source_specific_yoy_pct = capture(observation, /(-[\d.]+)%/);
        evidence.raw_count = capture(observation, /([\d,]+)개/);
        evidence.source_specific_acceleration_pct_points = capture(old ?? '', /가속\s*([+−-]?[\d.]+)%p/);
        evidence.yoy_precision = 'DOCUMENT_ROUNDED_EXACT_SOURCE_COMPUTATION';
        break;
      case '클라우드·SaaS':
        evidence.observed_level = capture(observation, /([\d.]+)%/);
        evidence.two_year_change_pct_points_not_yoy = capture(observation, /\+([\d.]+)%p/);
        break;
      case '사이버보안':
        evidence.observed_level = capture(observation, /투자\s*([\d.]+)%/);
        break;
      case '원전·SMR':
      case '방산':
        evidence.evidence_state = 'SOURCE_NOT_OBSERVED_IN_R15';
        break;
      default: throw new Error('R88_UNEXPECTED_THEME');
    }
    if (evidence.evidence_state === 'OBSERVATION_RECORDED' &&
        [evidence.source_specific_yoy_pct, evidence.observed_level].every(v => v === null)) {
      throw new Error(`R88_ARCHIVE_OBSERVATION_PARSE_FAILED:${theme}`);
    }
    if (['자율주행', '핀테크', '바이오·신약'].includes(theme) &&
        !numeric(evidence.source_specific_acceleration_pct_points)) {
      throw new Error(`R88_ARCHIVE_ACCELERATION_PARSE_FAILED:${theme}`);
    }
    return evidence;
  });
  return {source_kind:'EXISTING_STAGE04_R15_R3_ARCHIVE',run_at:runAt,rows};
}

function fromGate(gate) {
  // Validate against the original source rows, never trust an embedded cached
  // classification that might have been modified independently of the gate.
  const coverage = buildIndustryQuantCoverage(gate);
  if (!Array.isArray(coverage.rows) || coverage.rows.length !== 9 ||
      new Set(coverage.rows.map(row => row.theme)).size !== 9 ||
      APPROVED.some(name => !coverage.rows.some(row => row.theme === name))) {
    throw new Error('R88_EXISTING_GATE_NINE_ROWS_INVALID');
  }
  if (!gate || !/^INVESTMENT_BOT_STAGE04_INPUT_GATE_R1[234567]$/.test(gate.runType ?? '') ||
      gate.automatedTradeEnabled !== false || !Array.isArray(gate.orderRequests) ||
      gate.orderRequests.length !== 0 || !Number.isFinite(Date.parse(gate.runAtUtc))) {
    throw new Error('R88_GATE_SOURCE_AND_NO_TRADE_INVALID');
  }
  return {
    source_kind:'EXISTING_R17_STAGE04_GATE_SAVED_JSON',run_at:gate.runAtUtc,
    rows:coverage.rows.map(row=>({
      theme:row.theme, record_type:'PREVIOUSLY_SAVED_STAGE04_GATE_NO_NEW_COLLECTION',
      prior_stage_run_at:gate.runAtUtc, metric_scope:row.metricScope,
      source_specific_yoy_pct:row.exactWithinSourceYoyPct ?? row.sourcePublishedRoundedYoyPct ?? null,
      yoy_precision:numeric(row.exactWithinSourceYoyPct)?'EXACT_SAME_SOURCE':
        numeric(row.sourcePublishedRoundedYoyPct)?'SOURCE_ROUNDED':'NOT_OBSERVED',
      source_specific_acceleration_pct_points:row.withinSourceAccelerationPctPoints ?? null,
      two_year_change_pct_points_not_yoy:row.twoYearPercentagePointDeltaNotYoy ?? null,
      observed_level:row.observedRawPercent ?? row.observedRawTwh ?? null,
      raw_count:row.observedRawCount ?? null,
      evidence_state:row.sourceObservedThisRun?'SAVED_GATE_OBSERVED':'SAVED_GATE_NOT_OBSERVED',
      original_documents:[row.officialUrl], observation_text:null, limitation_text:row.limitation ?? null,
    })),
  };
}

/** Numeric matrix; all 1-4-stage published values are reused, not recalculated. */
export function buildStage04R88ExistingBridge(r86, existingIndustry, stage01 = null) {
  assertR86(r86);
  if (!existingIndustry || !['EXISTING_STAGE04_R15_R3_ARCHIVE','EXISTING_R17_STAGE04_GATE_SAVED_JSON'].includes(existingIndustry.source_kind) ||
      !Array.isArray(existingIndustry.rows) || existingIndustry.rows.length !== 9 ||
      new Set(existingIndustry.rows.map(x => x.theme)).size !== 9 ||
      APPROVED.some(name => !existingIndustry.rows.some(row => row.theme === name)) ||
      !Number.isFinite(Date.parse(existingIndustry.run_at))) {
    throw new Error('R88_EXISTING_INDUSTRY_INPUT_INVALID');
  }
  const evidenceByTheme = new Map(existingIndustry.rows.map(row=>[row.theme,row]));
  for (const row of existingIndustry.rows) {
    for (const field of ['source_specific_yoy_pct','source_specific_acceleration_pct_points',
      'two_year_change_pct_points_not_yoy','observed_level','raw_count']) {
      if (row[field] !== null && !numeric(row[field])) throw new Error(`R88_INVALID_INDUSTRY_NUMBER:${field}`);
    }
    if (/NOT_OBSERVED/.test(row.evidence_state) && [row.source_specific_yoy_pct,
      row.source_specific_acceleration_pct_points,row.observed_level,row.raw_count]
      .some(value=>value!==null)) throw new Error('R88_UNOBSERVED_INDUSTRY_VALUE');
  }
  let marketScore = r86.market.market_score;
  if (stage01 !== null) {
    const s = stage01.stage01 ?? stage01;
    if (!numeric(s.market_score) || s.market_score < 0 || s.market_score > 100 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(s.observation_date ?? '') ||
        !s.source_version || !s.market_label || !s.point_status ||
        (s.source && String(s.source).includes('/api/fear-greed'))) {
      throw new Error('R88_STAGE01_MARKET_SCORE_NOT_VERIFIED_INDEPENDENT_INPUT');
    }
    marketScore={score:s.market_score,observed_at:s.observation_date,
      source:s.source ?? 'SAVED_STAGE01_COMPLETED_RESULT',source_version:s.source_version,
      status:'STAGE01_EXISTING_MARKET_SCORE_REUSED'};
  }
  const themes=r86.themes.map(row=>({
    ...row,industry_evidence:evidenceByTheme.get(row.theme_id) ?? null,
    // These fields are approved normalized G/G2, not raw proxy YoY/acceleration.
    industry_actual_growth_g:null, industry_acceleration_g2:null,
    attractiveness_m4:null,screening_rank:null,
    selection_state:row.stage03_approval==='R67_BASELINE_APPROVED_NINE'
      ?'EVIDENCE_COMPARISON_AWAIT_USER_FORMULA_APPROVAL':'RESEARCH_ONLY',
  }));
  const observed=themes.filter(row=>row.industry_evidence && !/NOT_OBSERVED/.test(row.industry_evidence.evidence_state));
  const withGrowth=observed.filter(row=>numeric(row.industry_evidence.source_specific_yoy_pct));
  const withAcceleration=observed.filter(row=>numeric(row.industry_evidence.source_specific_acceleration_pct_points));
  return {
    ...r86,
    schema_version:'STAGE04_R88_EXISTING_RESULTS_JOIN_V1',
    mode:'OFFLINE_EXISTING_STAGE04_RESULTS_ONLY_NO_NEW_COLLECTION_NO_FORMULA_NO_TRADE',
    market:{...r86.market,market_score:marketScore},themes,
    historical_industry_evidence:{source_kind:existingIndustry.source_kind,
      run_at:existingIndustry.run_at,observed_approved_themes:observed.length,
      saved_yoy_theme_count:withGrowth.length,saved_acceleration_theme_count:withAcceleration.length,
      scope:'PREVIOUS_STAGE04_SOURCE_SPECIFIC_PROXY_NEVER_TREATED_AS_2026_10_29_LIVE'},
    data_quality:{...r86.data_quality, previous_stage04_evidence_joined:9,
      previous_stage04_sources_observed:observed.length,
      previous_stage04_yoy_available:withGrowth.length,
      previous_stage04_acceleration_available:withAcceleration.length,
      remaining_required:[
        ...(marketScore.score===null?['SEPARATE_EXISTING_STAGE01_MARKET_SCORE_FILE']:[]),
        'APPROVED_STAGE04_G_D_M4_FORMULA', 'USER_FINAL_THEME_APPROVAL',
      ]},
    final_selection:{state:'UNRANKED_REVIEW',formula_approved:false,ranked_theme_ids:null,
      confirmed_theme_ids:null,approval_evidence:null,next_stage_allowed:false},
    order_state:'NO_TRADE',
  };
}

export function stage04R88Markdown(result) {
  const fmt = value=>numeric(value)?String(value):'NULL';
  const lines=[
    '# 4단계 R88 — 기존 실측·가속도·전망 CAGR·공탐 연결 결과', '',
    '- 실행 범위: **기존 저장 결과만 오프라인으로 재사용. Ollama/API 재수집 0회.**',
    `- 기존 공식 실측 런(UTC): ${result.historical_industry_evidence.run_at} (오늘 재조회 아님)`,
    `- 시장 별도 점수: ${fmt(result.market.market_score.score)} (${result.market.market_score.status})`,
    `- 시장 공탐 F: ${fmt(result.market.market_fear_greed.score)} (${result.market.market_fear_greed.observed_at})`,
    `- 전체 전망 21주제: 섹터 ${result.data_quality.ready_sector_forecast}/11, 테마 ${result.data_quality.ready_theme_forecast}/10`,
    `- 과거 4단계 공식 관측: ${result.historical_industry_evidence.observed_approved_themes}/9; 원천별 YoY ${result.historical_industry_evidence.saved_yoy_theme_count}/9; 가속도 ${result.historical_industry_evidence.saved_acceleration_theme_count}/9`,
    '- **M4·공식 순위·테마 최종 확정: 미승인/NULL. 다음 단계 자동 전달 불가.**', '',
    '| 테마 | Stage03 | 공탐 F | 전망 CAGR 평균 % | 기존 4단계 원천별 YoY % | 정밀도 | 기존 가속도 %p | 2년 변화 %p(연간 YoY 아님) | 실측 원관측 UTC | 상태 |',
    '|---|---|---:|---:|---:|---|---:|---:|---|---|',
    ...result.themes.map(t=>{
      const e=t.industry_evidence;
      return `| ${t.theme_id} | ${t.stage03_approval==='R67_BASELINE_APPROVED_NINE'?'승인':'연구'} | ${fmt(t.theme_fear_greed.score)} | ${fmt(t.theme_forecast_cagr.mean_pct)} | ${fmt(e?.source_specific_yoy_pct)} | ${e?.yoy_precision??'-'} | ${fmt(e?.source_specific_acceleration_pct_points)} | ${fmt(e?.two_year_change_pct_points_not_yoy)} | ${e?.prior_stage_run_at??'-'} | ${e?.evidence_state??'RESEARCH_ONLY'} |`;
    }), '',
    '### 기존 4단계 지표의 정의와 한계', '',
    ...result.themes.filter(t=>t.industry_evidence).map(t=>
      `- ${t.theme_id}: ${t.industry_evidence.observation_text??t.industry_evidence.metric_scope}; ${t.industry_evidence.limitation_text??'기존 게이트 범위 제한'}`), '',
    '| 섹터 | 기존 F | 전망 CAGR 평균 % | 매체 수 |',
    '|---|---:|---:|---:|',
    ...result.sectors.map(s=>`| ${s.name} | ${fmt(s.sector_fear_greed.score)} | ${fmt(s.sector_forecast_cagr.mean_pct)} | ${s.sector_forecast_cagr.publisher_count} |`), '',
    '원천별 YoY/가속도는 산업 전체 성장률, 정규화 G1/G2 또는 확정 M4가 아닙니다.',
    '기존 기록의 관측 시각과 최신 F의 관측 시각이 다르며 동시 관측으로 취급하지 않습니다.',
  ];
  return lines.join('\n')+'\n';
}

async function cli() {
  const args=process.argv.slice(2);
  const opt=flag=>{const i=args.indexOf(flag);return i<0?null:args[i+1]??null;};
  if (!opt('--r86')) throw new Error('USAGE: --r86 existing-r86.json [--gate existing-r17.json | --archive-dir repo/research/investment-15-stage] [--stage01 saved-stage01.json] [--json output.json] [--md output.md]');
  if (opt('--gate') && opt('--archive-dir')) throw new Error('R88_CHOOSE_ONE_EXISTING_INDUSTRY_SOURCE');
  const r86=JSON.parse(await readFile(opt('--r86'),'utf8'));
  let evidence;
  if (opt('--gate')) evidence=fromGate(JSON.parse(await readFile(opt('--gate'),'utf8')));
  else {
    const parent=opt('--archive-dir') ?? resolve(dirname(fileURLToPath(import.meta.url)),'..');
    const [r15,r3]=await Promise.all([
      readFile(resolve(parent,'STAGE04_INVESTMENT_BOT_R15_NON_EXCLUSIVE_QUANT_EVIDENCE_20261025.md'),'utf8'),
      readFile(resolve(parent,'STAGE04_SAME_VINTAGE_VALIDATION_R3_20261025.md'),'utf8'),
    ]);
    evidence=parseStage04ArchivedReports(r15,r3);
  }
  const stage01=opt('--stage01')?JSON.parse(await readFile(opt('--stage01'),'utf8')):null;
  const result=buildStage04R88ExistingBridge(r86,evidence,stage01);
  if(opt('--json'))await writeFile(opt('--json'),JSON.stringify(result,null,2)+'\n','utf8');
  if(opt('--md'))await writeFile(opt('--md'),stage04R88Markdown(result),'utf8');
  process.stdout.write(`R88_FORECAST=${result.data_quality.ready_sector_forecast+result.data_quality.ready_theme_forecast}/21\n`);
  process.stdout.write(`R88_EXISTING_OFFICIAL_EVIDENCE=${result.historical_industry_evidence.observed_approved_themes}/9\n`);
  process.stdout.write(`R88_PREVIOUS_YOY=${result.historical_industry_evidence.saved_yoy_theme_count}/9\n`);
  process.stdout.write(`R88_PREVIOUS_ACCELERATION=${result.historical_industry_evidence.saved_acceleration_theme_count}/9\n`);
  process.stdout.write(`R88_MARKET_SCORE=${result.market.market_score.score??'UNCONNECTED'}\n`);
  process.stdout.write('R88_NEW_DATA_COLLECTION=0\nR88_NEW_OLLAMA_CALLS=0\nR88_FINAL_M4=NOT_APPROVED\nR88_ORDER=NO_TRADE\n');
  if (!opt('--json') && !opt('--md'))process.stdout.write(stage04R88Markdown(result));
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  cli().catch(error=>{process.stderr.write(`R88_ERROR=${error.message}\n`);process.exitCode=1;});
}
