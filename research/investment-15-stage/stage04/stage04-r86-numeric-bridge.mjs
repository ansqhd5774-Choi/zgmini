/**
 * Stage04 R86: join the already-collected R82 forecast evidence to the existing
 * public, stored ZGMINI market/sector/theme F observations.
 *
 * No AI interpretation, forecast re-collection, GICS-wide CAGR claim, new
 * attractiveness formula, ranking, theme approval, DB mutation, or order.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditOneR82Run } from './stage04-r85-repeat-audit.mjs';
import { SECTOR_TOPICS, THEME_TOPICS } from './stage04-all-universe-r31.mjs';
import { STAGE03_THEME_IDS } from '../stage04-r67/live-f-adapter-r67.mjs';
import { buildLiveModel, downloadFeed } from '../m2/m2-live-feeds.mjs';

const F_ENDPOINTS = Object.freeze({
  market: 'https://zgmini.kr/api/fear-greed',
  sector: 'https://zgmini.kr/api/sector-fear-greed',
  theme: 'https://zgmini.kr/api/theme-fear-greed',
});

const validScore = value => typeof value === 'number' && Number.isFinite(value)
  && value >= 0 && value <= 100;

const forecastCell = row => row ? {
  status: 'RESEARCH_FORECAST_CAGR_MEAN',
  mean_pct: row.mean_pct,
  publisher_count: row.source_count,
  publisher_values: row.publishers.map(p => ({
    publisher: p.publisher,
    state: p.state,
    forecast_cagr_pct: p.state === 'PASS' ? p.growth_pct : null,
    report_url: p.report_url,
    period_start: p.period_start,
    period_end: p.period_end,
    failure: p.reason,
  })),
  warnings: row.warnings,
  scope: 'PUBLISHER_DEFINED_RESEARCH_MARKET_NOT_CERTIFIED_GICS_OR_FULL_THEME',
} : {status:'NOT_MAPPED',mean_pct:null,publisher_count:0,publisher_values:[],warnings:[],scope:null};

const fCell = (row, source) => row && validScore(row.score) ? {
  score: row.score, observed_at: row.date, phase: row.phase,
  confirmed_at: row.confirmedDate ?? null, source,
} : {score:null,observed_at:null,phase:'UNAVAILABLE',confirmed_at:null,source};

/**
 * Pure, deterministic output adapter. A READY market F feed is NOT the separate
 * Stage01 overall market score required by R83; preserve market_score=NULL.
 * @param {object} r82 R82 actual PC Ollama research JSON.
 * @param {object} normalizedModel Existing m2 buildLiveModel output.
 */
export function buildStage04R86NumericBridge(r82, normalizedModel) {
  const audit = auditOneR82Run(r82, 1);
  if (!audit.pass) throw new Error(`R82_RESEARCH_INPUT_INVALID:${audit.failures.join(',')}`);
  const indexed = new Map(r82.results.map(row => [row.keyword, row]));
  const approvedThemeNames=Object.keys(STAGE03_THEME_IDS);
  const researchThemeNames=[...approvedThemeNames,'우주·위성'];
  const expectedKeywords = [...Object.values(SECTOR_TOPICS).map(pair=>pair[1]),
    ...researchThemeNames.map(name=>THEME_TOPICS[name])];
  if (expectedKeywords.length !== 21 || new Set(expectedKeywords).size !== 21 ||
      indexed.size !== 21 || expectedKeywords.some(key=>!indexed.has(key)))
    throw new Error('R82_TOPIC_ROSTER_NOT_APPROVED_11_SECTOR_10_THEME_UNIVERSE');

  const market = normalizedModel?.feeds?.market;
  const sector = normalizedModel?.feeds?.sector;
  const theme = normalizedModel?.feeds?.theme;
  const bySector = new Map(sector?.status === 'READY' ? sector.items.map(row=>[row.id,row]) : []);
  const byTheme = new Map(theme?.status === 'READY' ? theme.items.map(row=>[row.name,row]) : []);
  const extraSectorIds = [...bySector.keys()].filter(id=>!Object.hasOwn(SECTOR_TOPICS,id));
  const extraThemeNames = [...byTheme.keys()].filter(name=>!Object.hasOwn(THEME_TOPICS,name));
  if (extraSectorIds.length)
    throw new Error('PUBLIC_FEED_CONTAINS_UNMAPPED_SECTOR');

  const sectors = Object.entries(SECTOR_TOPICS).map(([id,[name,keyword]])=>({
    sector_id:id, name, research_keyword:keyword,
    sector_fear_greed:fCell(bySector.get(id),F_ENDPOINTS.sector),
    sector_forecast_cagr:forecastCell(indexed.get(keyword)),
  }));
  const themes = researchThemeNames
    .map(name=>({
      theme_id:name, research_keyword:THEME_TOPICS[name],
      stage03_approval: Object.hasOwn(STAGE03_THEME_IDS,name)
        ? 'R67_BASELINE_APPROVED_NINE' : 'RESEARCH_ONLY_NOT_STAGE03_APPROVED',
      theme_fear_greed:fCell(byTheme.get(name),F_ENDPOINTS.theme),
      theme_forecast_cagr:forecastCell(indexed.get(THEME_TOPICS[name])),
      // A theme may span several sectors. No guessed theme->sector mapping.
      linked_sector_ids:null,
      industry_actual_growth_g:null,
      industry_acceleration_g2:null,
      attractiveness_m4:null,
      screening_rank:null,
      selection_state:'UNRANKED_REVIEW',
    }));
  const missingThemeNames = researchThemeNames
    .filter(name=>!byTheme.has(name));
  // A public theme API may have 10 rows, but we never invent an 11th alias.
  const marketFearGreed = market?.status==='READY' && validScore(market.score) ? {
    score:market.score, observed_at:market.date, phase:market.phase,
    source:F_ENDPOINTS.market,
  } : {score:null,observed_at:null,phase:'UNAVAILABLE',source:F_ENDPOINTS.market};

  const result = {
    schema_version:'STAGE04_R86_NUMERIC_INPUT_BRIDGE_V1',
    mode:'READ_ONLY_NO_OLLAMA_RERUN_NO_TRADE',
    forecast_run_started_at:r82.started_at,
    forecast_run_completed_at:r82.last_updated_at,
    input_status:normalizedModel?.status ?? 'UNAVAILABLE',
    market:{
      // The existing market /api/fear-greed supplies F, NOT a separate market score.
      market_score:{score:null,observed_at:null,source:null,status:'STAGE01_SCORE_INPUT_NOT_CONNECTED'},
      market_fear_greed:marketFearGreed,
    },
    sectors, themes,
    data_quality:{
      verified_forecast_cells:audit.verified_cells,
      failed_forecast_cells:audit.failed_cells,
      ready_sector_forecast:sectors.filter(r=>r.sector_forecast_cagr.mean_pct!==null).length,
      ready_theme_forecast:themes.filter(r=>r.theme_forecast_cagr.mean_pct!==null).length,
      observed_sector_f:sectors.filter(r=>r.sector_fear_greed.score!==null).length,
      observed_theme_f:themes.filter(r=>r.theme_fear_greed.score!==null).length,
      missing_theme_feed_aliases:missingThemeNames,
      ignored_non_cohort_theme_feed_names:[...byTheme.keys()].filter(name=>!researchThemeNames.includes(name)),
      unrecognized_theme_feed_names:extraThemeNames,
      remaining_required:['SEPARATE_MARKET_SCORE','APPROVED_STAGE04_G_D_M4_FORMULA',
        'COMPARABLE_REALIZED_INDUSTRY_SERIES_FOR_G1_G2','USER_FINAL_THEME_APPROVAL'],
    },
    final_selection:{
      state:'UNRANKED_REVIEW', formula_approved:false,
      ranked_theme_ids:null, confirmed_theme_ids:null,
      approval_evidence:null, next_stage_allowed:false,
    },
    order_state:'NO_TRADE',
  };
  // No final numerical score/ranking is reported while original R2 weights
  // remain explicitly unapproved and G1/G2 historical samples are not present.
  return result;
}

export function stage04R86Markdown(result) {
  const fmt = n=>typeof n==='number' ? n.toFixed(3) : 'NULL';
  const lines=[
    '# 4단계 수집 자료 정량 결합 R86 (읽기 전용)',
    '',
    `- 성장률 조사 시각(UTC): ${result.forecast_run_started_at}`,
    `- 전체 시장 점수: ${fmt(result.market.market_score.score)} (별도 1단계 입력 미연결)`,
    `- 전체 시장 공탐: ${fmt(result.market.market_fear_greed.score)}점 (${result.market.market_fear_greed.observed_at??'미관측'})`,
    '- 최종 매력도 M4·테마 순위·확정 테마: **NULL / UNRANKED_REVIEW** (승인되지 않은 산식 미적용)',
    '',
    '## 섹터 11개',
    '',
    '| 섹터 | 공탐 F(점) | 관측일 | 전망 CAGR 평균(%) | 유효 매체 수 |',
    '|---|---:|---|---:|---:|',
    ...result.sectors.map(r=>`| ${r.name} | ${fmt(r.sector_fear_greed.score)} | ${r.sector_fear_greed.observed_at??'-'} | ${fmt(r.sector_forecast_cagr.mean_pct)} | ${r.sector_forecast_cagr.publisher_count} |`),
    '',
    '## 테마 (기존 9개 승인 기반 / 10번째는 별도 연구)',
    '',
    '| 테마 | Stage03 | 공탐 F(점) | 관측일 | 전망 CAGR 평균(%) | 유효 매체 수 | 최종 M4 |',
    '|---|---|---:|---|---:|---:|---:|',
    ...result.themes.map(r=>`| ${r.theme_id} | ${r.stage03_approval} | ${fmt(r.theme_fear_greed.score)} | ${r.theme_fear_greed.observed_at??'-'} | ${fmt(r.theme_forecast_cagr.mean_pct)} | ${r.theme_forecast_cagr.publisher_count} | NULL |`),
    '',
    '참고: 전망 CAGR 평균은 조사기관이 정의한 시장의 예상 성장률이지 GICS 전체 실측 성장률이 아닙니다.',
    '공탐과 성장률은 단위가 달라 승인 전 임의 가중·합산·서열화하지 않습니다.',
    '프로그램은 AI 주관 평가·추천·매매를 수행하지 않습니다.',
    '',
  ];
  return lines.join('\n');
}

export async function readLiveStage04Feeds() {
  const names=['market','sector','theme'];
  const settled=await Promise.allSettled(names.map(name=>downloadFeed(name)));
  return buildLiveModel(Object.fromEntries(names.map((name,i)=>[name,
    settled[i].status==='fulfilled'?{body:settled[i].value}:{error:'READ_FAILED'}])));
}

async function cli() {
  const args=process.argv.slice(2);
  const opt=flag=>{const index=args.indexOf(flag);return index<0?null:args[index+1]??null;};
  const file=opt('--r82');
  if (!file) throw new Error('USAGE: --r82 R72_OLLAMA_FORECAST_PIPELINE_RESULT.json [--normalized-feeds model.json] [--json output.json] [--md output.md]');
  const r82=JSON.parse(await readFile(file,'utf8'));
  const fromFile=opt('--normalized-feeds');
  const model=fromFile?JSON.parse(await readFile(fromFile,'utf8')):await readLiveStage04Feeds();
  const result=buildStage04R86NumericBridge(r82,model);
  const jsonPath=opt('--json');
  const mdPath=opt('--md');
  if(jsonPath)await writeFile(jsonPath,JSON.stringify(result,null,2)+'\n','utf8');
  if(mdPath)await writeFile(mdPath,stage04R86Markdown(result),'utf8');
  process.stdout.write(`R86_R82_FORECAST=${result.data_quality.ready_sector_forecast+result.data_quality.ready_theme_forecast}/21\n`);
  process.stdout.write(`R86_SECTOR_F=${result.data_quality.observed_sector_f}/11\n`);
  process.stdout.write(`R86_THEME_F=${result.data_quality.observed_theme_f}/${result.themes.length}\n`);
  process.stdout.write(`R86_MARKET_F=${result.market.market_fear_greed.score??'NULL'}\n`);
  process.stdout.write('R86_MARKET_SCORE=UNCONNECTED\nR86_M4=UNAPPROVED_NULL\n');
  process.stdout.write(`R86_RESULT=${result.final_selection.state}\n`);
  if(!jsonPath&&!mdPath)process.stdout.write(stage04R86Markdown(result));
}

if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  cli().catch(err=>{process.stderr.write(`R86_ERROR=${err.message}\n`);process.exitCode=1;});
}
