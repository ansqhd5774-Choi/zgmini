import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStage04R86NumericBridge, stage04R86Markdown } from './stage04-r86-numeric-bridge.mjs';
import { SECTOR_TOPICS, THEME_TOPICS } from './stage04-all-universe-r31.mjs';

const publishers=['TBRC','SkyQuest','Precedence'];
const hosts={TBRC:'www.thebusinessresearchcompany.com',SkyQuest:'www.skyquestt.com',Precedence:'www.precedenceresearch.com'};
const keywords=[...Object.values(SECTOR_TOPICS).map(row=>row[1]),
  ...Object.entries(THEME_TOPICS).filter(([name])=>name!=='우주·위성통신').map(([,keyword])=>keyword)];

function observedR82() {
  return {
    run_state:'COMPLETED',topics_total:21,topics_done:21,means_calculable:21,
    historical_cagr_used:false,score_or_trade:'NONE',
    started_at:'2026-10-29T05:06:41.237Z',last_updated_at:'2026-10-29T05:07:54.054Z',
    results:keywords.map((keyword,i)=>({
      keyword,state:'RESEARCH_MEAN_CALCULABLE',metric:'FORECAST_CAGR',
      required_source_count:2,source_count:2,mean_pct:(i+2+i+4)/2,
      warnings:['RESEARCH_FORECAST_ONLY_NOT_GICS_OR_INVESTMENT_SCORE'],
      publishers:publishers.map((publisher,j)=>({
        publisher,state:j<2?'PASS':'SOURCE_OR_MODEL_FAILED',
        metric:'FORECAST_CAGR',growth_pct:j<2?i+2+2*j:null,
        observed_at:'2026-10-29T05:06:42Z',
        report_url:`https://${hosts[publisher]}/report/${i}`,
        report_requests:j<2?1:0,ollama_generations:j<2?1:0,
        reason:j<2?null:'NOT_FOUND',
      })),
    })),
  };
}

function liveModel() {
  return {
    status:'READY',
    feeds:{
      market:{status:'READY',score:33.5,date:'2026-10-29',phase:'VERIFIED'},
      sector:{status:'READY',items:Object.entries(SECTOR_TOPICS).map(([id])=>({
        id,score:45,date:'2026-10-28',confirmedDate:'2026-10-28',phase:'CONFIRMED',
      }))},
      theme:{status:'READY',items:Object.keys(THEME_TOPICS).filter(n=>n!=='우주·위성통신')
        .map((name,i)=>({name,score:i+20,date:'2026-10-28',phase:'PROVISIONAL',confirmedDate:'2026-10-26'}))},
    },
  };
}

test('실제 R82 21개를 동일 매체 평균 그대로 매칭하고 시장·섹터·테마 F를 분리한다',()=>{
  const r=buildStage04R86NumericBridge(observedR82(),liveModel());
  assert.equal(r.data_quality.ready_sector_forecast,11);
  assert.equal(r.data_quality.ready_theme_forecast,10);
  assert.equal(r.data_quality.observed_sector_f,11);
  assert.equal(r.data_quality.observed_theme_f,10);
  assert.equal(r.market.market_fear_greed.score,33.5);
  assert.equal(r.market.market_score.score,null);
  assert.equal(r.sectors[0].sector_forecast_cagr.mean_pct,3);
  assert.equal(r.themes[0].theme_forecast_cagr.mean_pct,14);
  assert.equal(r.final_selection.state,'UNRANKED_REVIEW');
  assert.equal(r.final_selection.next_stage_allowed,false);
  assert.equal(r.order_state,'NO_TRADE');
  assert.ok(r.themes.every(row=>row.attractiveness_m4===null&&row.screening_rank===null));
});

test('4단계 기존 승인 9개와 연구용 우주 1개를 자동 승인 없이 구분한다',()=>{
  const r=buildStage04R86NumericBridge(observedR82(),liveModel());
  assert.equal(r.themes.filter(t=>t.stage03_approval==='R67_BASELINE_APPROVED_NINE').length,9);
  assert.equal(r.themes.find(t=>t.theme_id==='우주·위성').stage03_approval,'RESEARCH_ONLY_NOT_STAGE03_APPROVED');
});

test('관측 F가 빠지면 숫자 0으로 채우거나 임의 점수를 생성하지 않는다',()=>{
  const model=liveModel();
  model.feeds.theme={status:'UNAVAILABLE'};
  const r=buildStage04R86NumericBridge(observedR82(),model);
  assert.equal(r.themes.length,10);
  assert.equal(r.data_quality.observed_theme_f,0);
  assert.equal(r.data_quality.ready_theme_forecast,10);
  assert.ok(r.themes.every(row=>row.theme_fear_greed.score===null));
  assert.equal(r.final_selection.confirmed_theme_ids,null);
});

test('출처가 1개로 줄거나 평균이 달라진 입력을 즉시 거부한다',()=>{
  const data=observedR82();
  data.results[0].publishers[1].state='SOURCE_OR_MODEL_FAILED';
  data.results[0].publishers[1].growth_pct=null;
  data.results[0].source_count=1;
  assert.throws(()=>buildStage04R86NumericBridge(data,liveModel()),/R82_RESEARCH_INPUT_INVALID/);
});

test('공식 매체 간 서로 다른 성장 전망 자체는 실패 조건이 아니다',()=>{
  const data=observedR82();
  data.results[0].publishers[0].growth_pct=1;
  data.results[0].publishers[1].growth_pct=11;
  data.results[0].mean_pct=6;
  const r=buildStage04R86NumericBridge(data,liveModel());
  assert.equal(r.sectors[0].sector_forecast_cagr.mean_pct,6);
});

test('허가되지 않은 원천·키워드 드리프트를 묵인하지 않는다',()=>{
  const model=liveModel();
  model.feeds.sector.items.push({id:'unknown-sector',score:50});
  assert.throws(()=>buildStage04R86NumericBridge(observedR82(),model),/UNMAPPED/);
  const wrong=observedR82();
  wrong.results[3].keyword='arbitrary other market';
  assert.throws(()=>buildStage04R86NumericBridge(wrong,liveModel()),/ROSTER/);
});

test('보고서에 숫자만 표시하고 최종 M4 NULL·미선정을 명시한다',()=>{
  const text=stage04R86Markdown(buildStage04R86NumericBridge(observedR82(),liveModel()));
  assert.match(text,/전체 시장 공탐: 33\.500점/);
  assert.match(text,/전체 시장 점수: NULL/);
  assert.match(text,/M4·테마 순위·확정 테마: \*\*NULL/);
  assert.match(text,/우주·위성/);
});
