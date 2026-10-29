import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStage04R88ExistingBridge,parseStage04ArchivedReports,stage04R88Markdown } from './stage04-r88-existing-results-bridge.mjs';

const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'..');
const names=['로봇·자동화','클라우드·SaaS','자율주행','원전·SMR','방산','핀테크','사이버보안','바이오·신약','데이터센터·전력','우주·위성'];
const r15=await readFile(resolve(root,'STAGE04_INVESTMENT_BOT_R15_NON_EXCLUSIVE_QUANT_EVIDENCE_20261025.md'),'utf8');
const r3=await readFile(resolve(root,'STAGE04_SAME_VINTAGE_VALIDATION_R3_20261025.md'),'utf8');
const archived=parseStage04ArchivedReports(r15,r3);
const sample=()=>({
  schema_version:'STAGE04_R86_NUMERIC_INPUT_BRIDGE_V1',order_state:'NO_TRADE',
  final_selection:{next_stage_allowed:false},
  market:{market_score:{score:null,status:'STAGE01_SCORE_INPUT_NOT_CONNECTED'},market_fear_greed:{score:35.8,observed_at:'2026-10-29'}},
  sectors:Array.from({length:11},(_,i)=>({name:`test-sector-${i}`,sector_forecast_cagr:{mean_pct:i+1,publisher_count:2},sector_fear_greed:{score:i+20}})),
  themes:names.map((theme_id,i)=>({theme_id,
    stage03_approval:i===9?'RESEARCH_ONLY_NOT_STAGE03_APPROVED':'R67_BASELINE_APPROVED_NINE',
    theme_forecast_cagr:{mean_pct:i+3},theme_fear_greed:{score:i+30},
    attractiveness_m4:null,screening_rank:null,
  })),
  data_quality:{ready_sector_forecast:11,ready_theme_forecast:10},
});

test('기존 R15+R3 문서에서 이미 관측한 9개 테마 수치만 읽는다',()=>{
  assert.equal(archived.rows.length,9);
  const by=new Map(archived.rows.map(row=>[row.theme,row]));
  assert.equal(archived.run_at,'2026-10-25T13:22:06.719Z');
  assert.equal(by.get('로봇·자동화').source_specific_yoy_pct,11);
  assert.equal(by.get('로봇·자동화').yoy_precision,'SOURCE_ROUNDED');
  assert.equal(by.get('자율주행').source_specific_yoy_pct,88.83);
  assert.equal(by.get('자율주행').source_specific_acceleration_pct_points,-26);
  assert.equal(by.get('핀테크').source_specific_yoy_pct,154.45);
  assert.equal(by.get('핀테크').source_specific_acceleration_pct_points,19.91);
  assert.equal(by.get('바이오·신약').source_specific_yoy_pct,-8);
  assert.equal(by.get('바이오·신약').source_specific_acceleration_pct_points,-0.59);
  assert.equal(by.get('데이터센터·전력').observed_level,485);
  assert.equal(by.get('클라우드·SaaS').two_year_change_pct_points_not_yoy,7.42);
  assert.equal(by.get('클라우드·SaaS').source_specific_yoy_pct,null);
  assert.equal(by.get('사이버보안').source_specific_yoy_pct,null);
  assert.equal(by.get('원전·SMR').source_specific_yoy_pct,null);
  assert.equal(by.get('방산').source_specific_yoy_pct,null);
});

test('R86 기존 21성장률·F를 그대로 보존하고 실측자료만 연결한다',()=>{
  const input=sample();
  const result=buildStage04R88ExistingBridge(input,archived);
  assert.equal(result.data_quality.previous_stage04_sources_observed,7);
  assert.equal(result.data_quality.previous_stage04_yoy_available,5);
  assert.equal(result.data_quality.previous_stage04_acceleration_available,3);
  assert.deepEqual(result.sectors,input.sectors);
  assert.equal(result.themes[0].theme_fear_greed.score,30);
  assert.equal(result.themes[0].theme_forecast_cagr.mean_pct,3);
  assert.equal(result.themes[0].industry_evidence.source_specific_yoy_pct,11);
  assert.equal(result.themes[9].industry_evidence,null);
  assert.equal(result.themes[0].industry_actual_growth_g,null);
  assert.equal(result.themes[0].industry_acceleration_g2,null);
  assert.equal(result.final_selection.next_stage_allowed,false);
  assert.equal(result.order_state,'NO_TRADE');
});

test('시장 공탐을 별도 시장 점수로 복사하지 않는다',()=>{
  const r=buildStage04R88ExistingBridge(sample(),archived);
  assert.equal(r.market.market_score.score,null);
  assert.equal(r.market.market_fear_greed.score,35.8);
});

test('기존 1단계 완료 시장 점수가 명시적으로 주어졌을 때만 연결',()=>{
  const stage01={market_score:61,observation_date:'2026-10-28',
    source_version:'STAGE01_VERIFIED_V1',market_label:'NEUTRAL',point_status:'READY',source:'STAGE01_SAVED_FILE'};
  const r=buildStage04R88ExistingBridge(sample(),archived,stage01);
  assert.equal(r.market.market_score.score,61);
  assert.equal(r.market.market_fear_greed.score,35.8);
  assert.equal(r.market.market_score.status,'STAGE01_EXISTING_MARKET_SCORE_REUSED');
  assert.throws(()=>buildStage04R88ExistingBridge(sample(),archived,{...stage01,source:'https://zgmini.kr/api/fear-greed'}),/STAGE01/);
});

test('산업 실측 관측 불가를 0점으로 환산하거나 연구 10번째를 승인하지 않는다',()=>{
  const r=buildStage04R88ExistingBridge(sample(),archived);
  assert.equal(r.themes.find(row=>row.theme_id==='원전·SMR').industry_evidence.evidence_state,'SOURCE_NOT_OBSERVED_IN_R15');
  assert.equal(r.themes.find(row=>row.theme_id==='방산').industry_evidence.source_specific_yoy_pct,null);
  assert.equal(r.themes.find(row=>row.theme_id==='우주·위성').selection_state,'RESEARCH_ONLY');
});

test('드리프트·가짜 M4·무단거래가 있으면 거부한다',()=>{
  const wrong=sample();wrong.themes[0].attractiveness_m4=73;
  assert.throws(()=>buildStage04R88ExistingBridge(wrong,archived),/R86_COLLECTED_INPUT_INVALID/);
  const order=sample();order.order_state='TRADE';
  assert.throws(()=>buildStage04R88ExistingBridge(order,archived),/R86_COLLECTED_INPUT_INVALID/);
  const evidence=structuredClone(archived);evidence.rows[0].source_specific_yoy_pct='12';
  assert.throws(()=>buildStage04R88ExistingBridge(sample(),evidence),/INVALID_INDUSTRY_NUMBER/);
  const lost=structuredClone(archived);lost.rows.pop();
  assert.throws(()=>buildStage04R88ExistingBridge(sample(),lost),/EXISTING_INDUSTRY_INPUT_INVALID/);
});

test('기존 보고서가 바뀌거나 과거 R3 가속도가 없으면 증거 일치 검사 실패',()=>{
  assert.throws(()=>parseStage04ArchivedReports(r15.replace('공표 +11%','공표 --%'),r3),/OBSERVATION_PARSE_FAILED/);
  assert.throws(()=>parseStage04ArchivedReports(r15,r3.replace('가속 −26.00%p','가속 확인중')),/ACCELERATION_PARSE_FAILED/);
});

test('보고 결과는 실제 관측일·원래 지표 단위·M4 미확정 상태를 표시',()=>{
  const report=stage04R88Markdown(buildStage04R88ExistingBridge(sample(),archived));
  assert.match(report,/2026-10-25T13:22:06.719Z/);
  assert.match(report,/2년 변화 %p\(연간 YoY 아님\)/);
  assert.match(report,/M4·공식 순위·테마 최종 확정: 미승인\/NULL/);
  assert.match(report,/우주·위성.*연구/);
});
