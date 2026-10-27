import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { formatHistoricalMarkdown, parseR17History, reconcileHistoricalResearch } from './stage04-r69-reconcile-history.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const officialR17 = join(here, '..', 'STAGE04_INVESTMENT_BOT_R17_SENTIMENT_INDUSTRY_CONTRAST_20261025.md');
const r63Default = join(here, '..', 'recovered-cagr-r63-r66', 'CAGR_R63_21_SOURCE_MATRIX_20261027.md');
const localR63 = join(here, '..', 'ZGMINI_R63_21_PARALLEL_OFFICIAL_20261027', 'R63_21_PARALLEL_OFFICIAL_RESULT.md');

// Historical R17 report excerpt for a portable test, NEVER a refreshed observation.
const historicalR17Excerpt = `# R17 historical excerpt for test only
재조회 완료: \`2026-10-25T13:57:10.316Z\`
API 출처 버전 \`R179_9a4c7ea4c2590ae2bec6a00e\`; F 자료 관측일 **2026-10-23**

| 기존 테마 | 최신 F | F 구간(화면용) | 공식 산업 활동 자료·관측기간 | 변화 방향 | R17 처리 |
|---|---:|---|---|---|---|
| 로봇·자동화 | 20.69 | 극도의 공포 | IFR 2025 산업용 로봇 신규 설치, **공표 반올림 +11% YoY** | 증가 | **추가 검토 가설** |
| 클라우드·SaaS | 65.01 | 탐욕 | Eurostat EU 기업의 클라우드 유료 이용률 2023→2025 **+7.42%p(2년)** | 증가 | 자료 보존, 낮은 F 가설 아님 |
| 자율주행 | 22.45 | 극도의 공포 | CPUC 캘리포니아 Waymo 무인운행 **2026Q2 YoY +88.83%** | 증가 | **추가 검토 가설** |
| 원전·SMR | 26.80 | 공포 | IAEA PRIS 공식 엑셀 403, 관측 원값 없음 | 미상 | 자료 부족으로 제외하지 않음 |
| 방산 | 46.10 | 중립 | SIPRI 파생권리 검토 미완료, 관측 원값 없음 | 미상 | 자료 부족으로 제외하지 않음 |
| 핀테크 | 62.39 | 탐욕 | Federal Reserve FedNow 건수 **2026Q3 YoY +154.45%** | 증가 | 자료 보존, 낮은 F 가설 아님 |
| 사이버보안 | 62.85 | 탐욕 | ENISA 2025 설문 IT 예산 보안 비중 **9%** | 증감 불명 | 수준값만, 성장률 생성 안 함 |
| 바이오·신약 | 22.63 (잠정) | 극도의 공포 | FDA CDER 신약 승인 **2025년 YoY -8.00%** | 감소 | 부정적인 프록시도 유지·추가 검토 |
| 데이터센터·전력 | 12.32 | 극도의 공포 | IEA 2025 세계 데이터센터 전력 수요 추정 **485 TWh, 공표 약 +17% YoY** | 증가 | **추가 검토 가설** |
`;

const r17TestPath = [process.env.R17_REPORT_PATH, officialR17].find(path => path && existsSync(path));
const r17 = r17TestPath ? readFileSync(r17TestPath, 'utf8') : historicalR17Excerpt;
const r63Path = [process.env.R63_MATRIX_PATH, r63Default, localR63].find(path => path && existsSync(path));
if (!r63Path) throw new Error('R63 input file not found: set R63_MATRIX_PATH to existing R63 Markdown');
const r63 = readFileSync(r63Path, 'utf8');

test('R17 exact nine topics, real historical metadata and observation date', () => {
  const parsed = parseR17History(r17);
  assert.equal(parsed.records.length, 9);
  assert.equal(parsed.observation_date, '2026-10-23');
  assert.equal(parsed.fetched_at, '2026-10-25T13:57:10.316Z');
  assert.equal(parsed.records.find(record => record.theme === '바이오·신약').status, 'PROVISIONAL');
  assert.equal(parsed.records.find(record => record.theme === '로봇·자동화').score, 20.69);
});

test('21 R63 averages and nine R17 F joined without synthetic G/D/M', () => {
  const result = reconcileHistoricalResearch(r63, r17);
  assert.equal(result.topics.length, 21);
  assert.equal(result.counts.forecast_mean_ready, 21);
  assert.equal(result.counts.valid_publisher_values, 58);
  assert.equal(result.counts.historical_f_matched, 9);
  assert.equal(result.counts.historical_industry_sources_observed, 7);
  assert.equal(result.counts.historical_activity_direction_measurable, 6);
  assert.equal(result.counts.historical_low_f_rising_proxy_hypotheses, 3);
  assert.equal(result.counts.current_live_f_verified, 0);
  assert.equal(result.counts.calculated_attractiveness_scores, 0);
  assert.equal(result.topics.find(record => record.topic_id === 12).forecast.mean_cagr_pct, 17.4667);
  assert.equal(result.topics.find(record => record.topic_id === 17).forecast.mean_cagr_pct, 43.35);
  for (const topic of result.topics) {
    assert.equal(topic.realized_industry_growth_g, null);
    assert.equal(topic.forecast_minus_sentiment_gap, null);
    assert.equal(topic.investment_attractiveness_m, null);
    assert.equal(topic.screening_rank, null);
  }
  assert.equal(result.topics.filter(record => record.sentiment_f !== null).length, 9);
  assert.equal(result.topics.filter(record => record.sentiment_f === null).length, 12);
});

test('industry evidence does not mistake 2y rate or level for annual growth', () => {
  const result = reconcileHistoricalResearch(r63, r17);
  const row = theme => result.topics.find(t => t.topic === theme);
  assert.equal(row('클라우드·SaaS').industry_activity.evidence_kind, 'TWO_YEAR_PERCENTAGE_POINT_CHANGE_NOT_YOY');
  assert.equal(row('사이버보안').industry_activity.evidence_kind, 'LEVEL_SHARE_ONLY_NOT_GROWTH');
  assert.equal(row('원전·SMR').industry_activity.source_observed, false);
  assert.equal(row('방산').industry_activity.source_observed, false);
  assert.equal(row('데이터센터·전력').industry_activity.evidence_kind, 'PUBLISHER_ROUNDED_YOY');
  assert.equal(row('바이오·신약').industry_activity.direction, '감소');
  assert.equal(row('바이오·신약').sentiment_f.status, 'PROVISIONAL');
  assert.equal(row('데이터센터·전력').industry_activity.former_review_hypothesis, true);
});

test('Markdown history report explicitly warns about currency and precision', () => {
  const result = reconcileHistoricalResearch(r63, r17);
  const md = formatHistoricalMarkdown(result);
  assert.match(md, /2026-10-23/);
  assert.match(md, /현재 실시간 점수 아님/);
  assert.match(md, /소수점 두 자리/);
  assert.match(md, /투자 매력도/);
  assert.match(md, /21개 CAGR/);
});

test('duplicate, missing and malformed R17 inputs fail closed', () => {
  assert.throws(() => parseR17History(r17.replace('20.69', '120.69')), /R17_OUT_OF_RANGE_F/);
  assert.throws(() => parseR17History(r17.replace('F 자료 관측일 **2026-10-23**', 'F 자료 관측일 미상')), /R17_REQUIRED_METADATA_NOT_FOUND/);
  assert.throws(() => parseR17History(`${r17}\n| 로봇·자동화 | 20.69 | 공포 | IFR +11% YoY | 증가 | 추가 검토 가설 |`), /R17_DUPLICATE_THEME/);
});
