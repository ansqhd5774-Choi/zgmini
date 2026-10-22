import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const aboutPage = readFileSync('app/about/page.tsx', 'utf8');
const guide = readFileSync('app/about/usage-guide.tsx', 'utf8');
const style = readFileSync('app/about/usage-guide.module.css', 'utf8');

test('approved guide occupies the existing usage deep link without changing developer story', () => {
  assert.match(aboutPage, /<UsageGuide\s*\/>/);
  assert.match(guide, /<section id="usage"/);
  assert.doesNotMatch(aboutPage, /id="usage"/);
  assert.match(aboutPage, /2016년부터 주식 투자를 시작했습니다/);
  assert.match(aboutPage, /<section className=\{styles\.questions\} aria-label="개발자 이야기">/);
  assert.match(aboutPage, /<details className=\{styles\.details\}>/);
});

test('all five guide steps and navigation controls are present', () => {
  for (const label of ['시장 흐름', '종합 점수', '구성 지표', '기간 비교', '주의사항']) {
    assert.ok(guide.includes(`title: '${label}'`), `${label} step missing`);
  }
  assert.match(guide, /useState\(1\)/);
  assert.match(guide, /onClick=\{\(\) => setActiveIndex\(index\)\}/);
  assert.match(guide, /다음 단계/);
  assert.match(guide, /aria-current=/);
});

test('example chart is clearly labeled non-live and layout is responsive', () => {
  assert.match(guide, /가상 데이터 · 실제 지표 아님/);
  assert.match(guide, /설명용 점수 예시/);
  assert.match(guide, /자료 주기가 긴 지표/);
  assert.match(style, /@media \(max-width: 760px\)/);
  assert.match(style, /\.stepNav \{/);
  assert.match(style, /justify-content: space-between/);
  assert.match(style, /flex: 1 1 0/);
  assert.doesNotMatch(style, /overflow-x: auto/);
});
