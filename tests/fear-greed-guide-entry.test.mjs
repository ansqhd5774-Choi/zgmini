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

test('buying guide has the selected three-step visual flow and source market links',()=>{
  const guide=read('app/guides/fear-greed-buying/page.tsx');
  assert.match(guide,/매수 전 판단 3단계/);
  assert.match(guide,/흐름 확인/);
  assert.match(guide,/원인 확인/);
  assert.match(guide,/투자 계획/);
  assert.match(guide,/상황별 확인 포인트/);
  assert.match(guide,/시장 심리 구간 읽기/);
  for(const label of ['극도의 공포','공포','중립','탐욕','극도의 탐욕']){
    assert.match(guide,new RegExp(label));
  }
  assert.match(guide,/href="\/fear-greed\/usa\/"/);
  assert.match(guide,/href="\/fear-greed\/korea\/"/);
  assert.match(guide,/dateModified="2026-10-23"/);
});

test('buying guide uses the market detail design and avoids a duplicate dashboard back button',()=>{
  const guide=read('app/guides/fear-greed-buying/page.tsx');
  const shell=read('app/guides/guide-page.tsx');
  assert.match(guide,/<SiteHeader\/>/);
  assert.match(guide,/variant="market"/);
  assert.match(shell,/!market\?<a href="\/"/);
  assert.match(shell,/!market\?<header/);
  assert.match(guide,/bg-\[#18d9ca\]/);
  assert.match(guide,/border-\[#25cfd2\]/);
  assert.doesNotMatch(guide,/text-cyan-200 underline/);
  assert.match(guide,/CNN 원문/);
  assert.match(guide,/SEC 투자 참고/);
  assert.match(guide,/신용 위험/);
});
