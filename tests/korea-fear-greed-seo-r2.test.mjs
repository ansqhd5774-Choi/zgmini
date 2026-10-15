import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');

test('Korea fear-greed page targets the Korean market search intent',()=>{
  const page=read('app/fear-greed/korea/page.tsx');
  assert.match(page,/한국 공포탐욕지수 - 오늘의 코스피 투자심리 \| ZGmini/);
  assert.match(page,/최근 점수·관측일·기간별 차트/);
  assert.match(page,/한국거래소·한국은행 등 국내 시장 자료/);
  assert.match(page,/alt:"ZGmini 한국 공포탐욕지수 · 코스피 투자심리"/);
  assert.match(page,/aria-label="한국 공포탐욕지수 소개"/);
  assert.match(page,/코스피 등 국내 주식시장의 위험 선호와 위험 회피 흐름을 0~100 점수로 보여주는 ZGmini 자체 지표/);
  assert.match(page,/CNN 미국 공포탐욕지수와는 입력 시장과 산출 방식이 다릅니다/);
});

test('Korea fear-greed content update has a truthful sitemap lastmod',()=>{
  const sitemap=read('public/sitemap.xml');
  assert.match(sitemap,/https:\/\/zgmini\.kr\/fear-greed\/korea\/<\/loc><lastmod>2026-10-16<\/lastmod>/);
  assert.match(sitemap,/https:\/\/zgmini\.kr\/fear-greed\/usa\/<\/loc><lastmod>2026-10-07<\/lastmod>/);
});
