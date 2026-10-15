import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

test('Korea fear-greed page targets the Korean market search intent',()=>{
  const page=read('app/fear-greed/korea/page.tsx');
  const engine=read('worker/korea-rev7-engine.mjs');
  assert.match(engine,/REV7_SCORE_WINDOW = 504/);
  assert.match(engine,/REV7_FACTORS = Object\.freeze\(\[\s*'momentum','strength','breadth','putCall','volatility','safeHaven','junkBond'/);
  assert.match(page,/한국 공포탐욕지수 - 오늘의 코스피 투자심리 \| ZGmini/);
  assert.match(page,/최근 점수·관측일·기간별 차트와 7개 핵심 신호/);
  assert.match(page,/504개 유효 관측치 기준창/);
  assert.match(page,/alt:"ZGmini 한국 공포탐욕지수 · 코스피 투자심리"/);
  assert.match(page,/aria-label="한국 공포탐욕지수 소개"/);
  assert.match(page,/DATA-DRIVEN KOREA MARKET SENTIMENT/);
  assert.match(page,/코스피 투자심리를 0~100으로 읽는 데이터 지표/);
  assert.match(page,/코스피 등 국내 주식시장의 위험 선호와 위험 회피 흐름을 0~100 점수로 보여주는 ZGmini 자체 지표/);
  assert.match(page,/Momentum·Strength·Breadth·Put\/Call·Volatility·Safe Haven·Junk Bond/);
  assert.match(page,/7개 핵심 신호/);
  assert.match(page,/504<\/strong><small[^>]*>WINDOW/);
  assert.match(page,/0–100<\/strong><small[^>]*>INDEX/);
  assert.match(page,/KR<\/strong><small[^>]*>MARKET/);
  assert.match(page,/CNN 미국 공포탐욕지수와는 입력 시장과 산출 방식이 다릅니다/);
  assert.match(page,/한국거래소 통계정보와 한국은행 ECOS/);
});

test('Korea fear-greed content update has a truthful sitemap lastmod',()=>{
  const sitemap=read('public/sitemap.xml');
  assert.match(sitemap,/https:\/\/zgmini\.kr\/fear-greed\/korea\/<\/loc><lastmod>2026-10-16<\/lastmod>/);
  assert.match(sitemap,/https:\/\/zgmini\.kr\/fear-greed\/usa\/<\/loc><lastmod>2026-10-07<\/lastmod>/);
});
