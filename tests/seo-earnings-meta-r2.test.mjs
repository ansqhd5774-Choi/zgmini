import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync('app/earnings-recession/page.tsx','utf8');

test('earnings recession search description is reader-facing and keeps internal version labels out of metadata',()=>{
  assert.match(page,/현재 실적 안전점수와 관측일, 기간별 흐름을 함께 제공합니다/);
  const description=page.match(/const description="([^"]+)";/)?.[1]??'';
  assert.ok(description.length>0);
  assert.doesNotMatch(description,/E1-R\d|methodologyVersion|저장 데이터/);
});
