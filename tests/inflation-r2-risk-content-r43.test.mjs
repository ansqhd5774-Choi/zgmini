import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const panel=readFileSync('app/inflation/inflation-panel.tsx','utf8');
const page=readFileSync('app/inflation/page.tsx','utf8');
const investor=readFileSync('app/detail-investor-notes.tsx','utf8');
const guide=readFileSync('app/beginner-risk-guide.tsx','utf8');
const help=readFileSync('app/help-copy.tsx','utf8');
const intro=readFileSync('app/search-intent-intro.tsx','utf8');
const css=readFileSync('app/inflation/inflation-indicator-r2.css','utf8');
const model=readFileSync('lib/diagnostic-layer/inflation-r2-stored.mjs','utf8');

test('risk explainer exposes precisely the seven R2 model axes, never a fabricated axis',()=>{
 const ids=['TARGET_STABILITY','UNDERLYING_MOMENTUM','HEADLINE_PRESSURE','EXPECTATIONS','SUPPLY_PIPELINE','LABOR_COST_PERSISTENCE','DEMAND_CONTEXT'];
 const declared=panel.match(/const inflationRiskAxes=\[([\s\S]*?)\] as const;/)?.[1];
 assert.ok(declared,'R2 axis card definitions are absent');
 assert.equal((declared.match(/\{id:/g)??[]).length,7);
 for(const id of ids){
  assert.ok(model.includes('"'+id+'"'));
  assert.ok(declared.includes('id:"'+id+'"'));
 }
 assert.ok(panel.includes('payload?.axes?.[axis.id]'));
 assert.ok(panel.includes('value>=0&&value<=100'));
 assert.ok(panel.includes('ready?value.toFixed(1):"—"'));
});
test('risk page uses its stored Inflation R2 score and preserves its sixteen feature rows and history',()=>{
 assert.ok(panel.includes("useStoredIndex<InflationPayload>('/api/inflation-detail')"));
 assert.ok(panel.includes('const featureOrder=['));
 const order=panel.match(/const featureOrder=\[([\s\S]*?)\] as const;/)?.[1]??'';
 assert.equal((order.match(/"[^"]+"/g)??[]).length,16);
 assert.ok(panel.includes('featureOrder.map(feature=>'));
 assert.ok(panel.includes('MarketFearGreedChart showExtrema data={trend}'));
 assert.ok(panel.includes('위험 신호의 근거 · 16개 입력지표'));
});
test('the independent economic Price model is not falsely declared identical to risk Inflation',()=>{
 assert.doesNotMatch(investor,/12개 주요 지표의 '물가'는 이 페이지의 점수를 소수점 없이 보여주는 값/);
 assert.ok(investor.includes('별도 4요소 모델'));
 assert.ok(panel.includes('href="/economic-indicators/inflation/"'));
 assert.ok(help.includes('16개 입력지표를 7개 평가 축'));
 assert.ok(intro.includes('12대 경제지표 물가와는 별도 산식'));
 assert.ok(page.includes('Inflation R2'));
});
test('risk interpretation and seven-axis UI stay scoped without changing scoring, chart or storage',()=>{
 assert.ok(guide.includes('title:"인플레이션 압력 안정성"'));
 assert.ok(guide.includes('R2 점수는 물가상승률이나 위험 발생 확률이 아닙니다.'));
 assert.ok(page.includes('인플레이션 위험 점수, 이렇게 읽으세요'));
 assert.ok(css.includes('.inflation-r2-axis-grid'));
 assert.ok(css.includes('@media(max-width:767px)'));
 assert.ok(panel.includes('압력의 원인'));
});
