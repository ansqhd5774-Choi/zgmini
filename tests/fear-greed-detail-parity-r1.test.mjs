import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('US and Korea detail pages have consistent country nav and scoped dark layout',()=>{
 const us=read('app/fear-greed/usa/page.tsx');
 const kr=read('app/fear-greed/korea/page.tsx');
 const css=read('app/fear-greed/fear-greed-detail-r1.css');
 for(const page of [us,kr]){
  assert.match(page,/className="zg-fg-detail zg-fg-(?:us|korea)"/);
  assert.match(page,/className="zg-fg-country-tabs"/);
  assert.match(page,/href="\/fear-greed\/usa\/"/);
  assert.match(page,/href="\/fear-greed\/korea\/"/);
  assert.match(page,/fear-greed-detail-r1\.css/);
  assert.match(page,/variant="beginner"/);
 }
 assert.match(css,/\.zg-fg-detail-body\{/);
 assert.match(css,/\.zg-fg-country-tabs a\[aria-current="page"\]/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.doesNotMatch(css,/(^|\n)\.zg-dashboard/);
});

test('CNN retains 7 data-backed component explanations and only one US h1',()=>{
 const us=read('app/fear-greed/usa/page.tsx');
 const panel=read('app/fear-greed/usa/cnn-panel.tsx');
 assert.equal((us.match(/<h1\b/g)||[]).length,1);
 assert.doesNotMatch(panel,/<h1\b/);
 assert.match(panel,/<h2 id="cnn-education-title">/);
 assert.match(panel,/CnnPanel/);
 assert.match(us,/<CnnPanel showEducation\/>/);
 assert.match(panel,/\/api\/fear-greed/);
 assert.match(panel,/componentDefinitions/);
 assert.match(panel,/componentScoreAverage/);
 assert.match(panel,/component\.rawValue/);
 assert.match(panel,/component\.score/);
});
test('Korea detail reuses the proven home-market card without changing data contract',()=>{
 const kr=read('app/fear-greed/korea/page.tsx');
 const panel=read('app/fear-greed/korea/data-panel.tsx');
 const shared=read('app/korea-composite-view.tsx');
 assert.match(panel,/<KoreanCountryCard\/>/);
 assert.match(panel,/point-in-time 빈티지는 검증되지 않았습니다/);
 assert.doesNotMatch(panel,/bg-slate-50/);
 assert.match(shared,/export function KoreanCountryCard/);
 assert.match(shared,/useKoreaFunds\(\)/);
 assert.match(kr,/504개 유효 관측치 기준창/);
 assert.match(kr,/한국거래소 통계정보와 한국은행 ECOS/);
 assert.equal((kr.match(/<h1\b/g)||[]).length,1);
});
