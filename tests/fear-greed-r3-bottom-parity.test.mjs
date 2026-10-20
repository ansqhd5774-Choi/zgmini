import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('only US and Korea pages scope redesigned lower content without modifying shared investor notes',()=>{
 const us=load('app/fear-greed/usa/page.tsx');
 const kr=load('app/fear-greed/korea/page.tsx');
 const common=load('app/detail-investor-notes.tsx');
 for(const [page,market] of [[us,'usa'],[kr,'korea']]){
  assert.match(page,new RegExp('<div className="zg-fg-bottom-r3"><DetailInvestorNotes topic="'+market+'"\\/><\\/div>'));
  assert.equal((page.match(/zg-fg-bottom-r3/g)||[]).length,1);
 }
 assert.match(common,/공포탐욕지수를 상황별로 읽는 방법/);
 assert.match(common,/나스닥·비트코인 지수와 구별하세요/);
 assert.match(common,/한국 시장심리와 다른 지표를 함께 읽기/);
 assert.match(common,/날짜와 현재 제공 범위 확인/);
 assert.match(common,/한국·미국 공포탐욕지수 비교/);
 assert.match(common,/CNN Fear & Greed/);
 assert.match(common,/ZGmini 자체 지표/);
 assert.match(common,/href:paths\[id\]/);
});
test('desktop and mobile lower R2 parity renders reading cards and semantic comparison table',()=>{
 const css=load('app/fear-greed/fear-greed-detail-r1.css');
 assert.match(css,/\.zg-fg-bottom-r3>section:first-of-type\{\s*display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.zg-fg-bottom-r3>section:first-of-type>div\{/);
 assert.match(css,/\.zg-fg-bottom-r3>section:first-of-type>nav\{/);
 assert.match(css,/aria-label="한국·미국 공포탐욕지수 비교"/);
 assert.match(css,/table-layout:fixed/);
 assert.match(css,/overflow-wrap:anywhere/);
 assert.match(css,/@media\(max-width:700px\)\{/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\);gap:7px/);
 const common=load('app/detail-investor-notes.tsx');
 assert.match(common,/<caption className="mb-3 text-left">/);
 assert.match(common,/<th scope="col"/);
 assert.match(common,/<th scope="row"/);
});
