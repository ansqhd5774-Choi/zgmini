import test from 'node:test';
import assert from 'node:assert/strict';
import {newsPageSize,visibleNewsLimit,isPlaceholderNewsSummary} from '../lib/iran-progress/news-ui-r1.mjs';

test('27 eligible news cards can be progressively disclosed without truncation',()=>{
 assert.equal(newsPageSize(false),3);
 assert.equal(newsPageSize(true),4);
 assert.deepEqual(Array.from({length:9},(_,index)=>Math.min(27,visibleNewsLimit(index+1))),
  [3,6,9,12,15,18,21,24,27]);
 assert.equal(Math.min(27,visibleNewsLimit(7,{wide:true})),27);
 assert.throws(()=>visibleNewsLimit(0),/NEWS_PAGES_INVALID/);
});

test('placeholder summary is not presented as a substantive article summary',()=>{
 assert.equal(isPlaceholderNewsSummary('영국 정부 공식 발표에서 이란 관련 내용을 언급했습니다. 상세 내용은 원문에서 확인할 수 있습니다.'),true);
 assert.equal(isPlaceholderNewsSummary('영국은 이란에 국제원자력기구의 사찰 재개를 촉구했다.'),false);
 assert.equal(isPlaceholderNewsSummary('IAEA inspectors return to Iran nuclear sites'),false);
});
