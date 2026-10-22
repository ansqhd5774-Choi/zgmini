import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const aboutPage = readFileSync('app/about/page.tsx', 'utf8');
const usagePage = readFileSync('app/usage/page.tsx', 'utf8');
const footer = readFileSync('components/site-footer.tsx', 'utf8');
const guide = readFileSync('app/usage/usage-guide.tsx', 'utf8');
const style = readFileSync('app/usage/usage-guide.module.css', 'utf8');

test('developer introduction is preserved and its page no longer contains the guide', () => {
  assert.doesNotMatch(aboutPage, /UsageGuide/);
  assert.match(aboutPage, /2016년부터 주식 투자를 시작했습니다/);
  assert.match(aboutPage, /<section className=\{styles\.questions\} aria-label="개발자 이야기" id="usage">/);
  assert.match(aboutPage, /제가 편하자고/);
  assert.match(aboutPage, /여러분 모두 부자 되세요!/);
  assert.match(aboutPage, /<details className=\{styles\.details\}>/);
});

test('approved guide is a distinct page and footer points to that page', () => {
  assert.match(usagePage, /<UsageGuide\s*\/>/);
  assert.match(usagePage, /const url = 'https:\/\/zgmini\.kr\/usage\/'/);
  assert.match(usagePage, /path="\/usage\/"/);
  assert.match(footer, /href="\/about\/">ZGMINI 소개/);
  assert.match(footer, /href="\/usage\/">이용안내/);
  assert.doesNotMatch(footer, /href="\/about\/#usage">이용안내/);
  assert.match(footer, /href="\/about\/#data-sources">지표·데이터 출처/);
  assert.match(footer, /href="\/about\/#investment-notice">투자 유의사항/);
  assert.match(guide, /<section id="usage"/);
  assert.match(guide, /<h1 id="usage-title">ZGMINI 이용안내<\/h1>/);
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
