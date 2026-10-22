import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('app/investment-notice/page.tsx', 'utf8');
const css = readFileSync('app/investment-notice/page.module.css', 'utf8');

test('investment notice has its own responsive design and canonical metadata', () => {
  assert.match(page, /path="\/investment-notice\/"/);
  assert.match(page, /canonical: url/);
  assert.match(page, /className=\{styles\.heroPanel\}/);
  assert.match(page, /className=\{styles\.misconceptions\}/);
  assert.match(page, /className=\{styles\.checklist\}/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /background: #10171c/);
});

test('investor warnings distinguish scores, risks and historical performance', () => {
  assert.match(page, /매수 신호가 아닙니다/);
  assert.match(page, /사건 발생 확률이 아닙니다/);
  assert.match(page, /미래를 약속하지 않습니다/);
  assert.match(page, /원금 손실/);
  assert.match(page, /특정 종목의 매수·매도 추천이나 개인별 맞춤 투자 자문이 아닙니다/);
});

test('all decisions and relevant internal guidance remain available', () => {
  for (const topic of ['점수의 뜻부터 확인', '정보가 언제의 것인지 확인', '다른 근거와 교차 확인', '나의 투자 조건을 적용']) {
    assert.ok(page.includes(topic));
  }
  assert.match(page, /href="\/usage\/"/);
  assert.match(page, /href="\/data-sources\/"/);
  assert.match(page, /https:\/\/www\.investor\.gov\/research-you-invest/);
  assert.match(page, /투자 판단 시 확인할 사항/);
});
