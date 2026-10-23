import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('buying guide has visible entry points from dashboard and both market details',()=>{
  const dashboard=read('app/country-fear-greed.tsx');
  const usa=read('app/fear-greed/usa/page.tsx');
  const korea=read('app/fear-greed/korea/page.tsx');
  for(const source of [dashboard,usa,korea]){
    assert.match(source,/href="\/guides\/fear-greed-buying\/"/);
    assert.match(source,/매수 판단 가이드/);
  }
});

test('buying guide provides a readable three-step flow and links to both source markets',()=>{
  const guide=read('app/guides/fear-greed-buying/page.tsx');
  assert.match(guide,/점수보다 먼저 확인할 3가지/);
  assert.match(guide,/지수가 가리키는 시장/);
  assert.match(guide,/공포가 생긴 이유/);
  assert.match(guide,/나의 투자 조건/);
  assert.match(guide,/href="\/fear-greed\/usa\/"/);
  assert.match(guide,/href="\/fear-greed\/korea\/"/);
  assert.match(guide,/dateModified="2026-10-23"/);
});
