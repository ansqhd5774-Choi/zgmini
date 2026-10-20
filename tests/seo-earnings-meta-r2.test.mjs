import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync('app/earnings-recession/page.tsx','utf8');

test('earnings recession search description is reader-facing and keeps internal version labels out of metadata',()=>{
  assert.match(page,/12대 기업 실적 지표와 점수·차트를 구분합니다/);
  const description=page.match(/const description="([^"]+)";/)?.[1]??'';
  assert.ok(description.length>0);
  assert.doesNotMatch(description,/E1-R\d|methodologyVersion|저장 데이터/);
});

test('earnings metadata does not claim composite evaluation anchor is a raw observation date',()=>{
 const description=page.match(/const description="([^"]+)";/)?.[1]??'';
 assert.match(description,/독립된 4지표 진단으로 확인하세요/);
 assert.doesNotMatch(description,/E1-R5|사후 재구성|13개/);
 assert.doesNotMatch(description,/관측일|실시간|실제 발표일/);
});
