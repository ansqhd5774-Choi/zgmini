import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('app/data-sources/page.tsx', 'utf8');
const css = readFileSync('app/data-sources/page.module.css', 'utf8');

test('data sources is a standalone, indexed route with its own page design', () => {
  assert.match(page, /path="\/data-sources\/"/);
  assert.match(page, /canonical: url/);
  assert.match(page, /className=\{styles\.hero\}/);
  assert.match(page, /className=\{styles\.sourceGrid\}/);
  assert.match(page, /className=\{styles\.dateGrid\}/);
  assert.match(page, /className=\{styles\.states\}/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test('source cards cite originating agencies and differentiate a distribution route', () => {
  for (const name of ['BLS', 'BEA', 'FRED', 'EIA', 'SEC', 'ECOS', 'CENSUS', 'GDELT']) {
    assert.match(page, new RegExp(`acronym: '${name}'`));
  }
  assert.match(page, /원발표기관은 계열마다 다릅니다/);
  assert.match(page, /공식 사이트 새 창에서 열기/);
});

test('design explicitly communicates missing and provisional data without invented values', () => {
  assert.match(page, /결측은 0이 아니며/);
  assert.match(page, /차트에서는 점선 등으로 구분할 수 있습니다/);
  assert.match(page, /데이터 공개와 재배포 허용은 별개입니다/);
  assert.match(page, /관측일/);
  assert.match(page, /발표일/);
  assert.match(page, /갱신 시각/);
});
