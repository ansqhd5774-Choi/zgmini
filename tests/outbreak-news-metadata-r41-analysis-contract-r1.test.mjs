import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const file=new URL('../app/outbreak-news-metadata-r41.tsx',import.meta.url);
const source=readFileSync(file,'utf8');

test('R41 metadata cards read only the separate provisional analysis API',()=>{
 assert.match(source,/useStoredIndex<NewsAnalysisPayload>\(/);
 assert.match(source,/"\/api\/outbreak-news\/iran\/analysis-r1"/);
 assert.match(source,/"IRAN_NEWS_ANALYSIS_R1"/);
 assert.match(source,/analyzedAt:number/);
 assert.match(source,/publishedAt:number/);
 assert.match(source,/new Date\(analysis\.analyzedAt\)/);
 assert.match(source,/Number\.isSafeInteger\(item\.analyzedAt\)/);
 assert.match(source,/analysisStatus==="READY"/);
 assert.match(source,/item\.id===article\.id/);
 assert.match(source,/item\.sourceUrl===article\.sourceUrl/);
 assert.match(source,/item\.evidenceUrls\.length>0/);
});

test('AI analysis is marked provisional; unassessed news remain visible',()=>{
 assert.match(source,/AI 잠정 평가/);
 assert.match(source,/className=\{styles\.evaluation\}/);
 assert.match(source,/keyPointKo/);
 assert.match(source,/keyFactsKo/);
 assert.match(source,/핵심 사실/);
 assert.match(source,/왜 중요한가\?/);
 assert.match(source,/기사 요약 자세히 보기/);
 assert.match(source,/analysis\.summaryKo/);
 assert.match(source,/analysis\.interpretationKo/);
 assert.match(source,/분석 대기/);
 assert.match(source,/R5 전쟁 심리 점수 산식에 반영하지 않습니다/);
 assert.match(source,/target="_blank" rel="noopener noreferrer" title="원문 기사 사이트 열기"/);
});

test('analysis cards use accessible R41-only larger text without global CSS changes',()=>{
 const css=readFileSync(new URL('../app/outbreak-news-evaluation-r2.module.css',import.meta.url),'utf8');
 assert.match(css,/font-size:14px/);
 assert.match(css,/font-size:13\.5px/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/\.articleReady/);
 assert.doesNotMatch(css,/display:none|visibility:hidden/);
});

test('existing Korean title translation and pagination remain intact',()=>{
 assert.match(source,/translateEnglishNewsText\(/);
 assert.match(source,/needsKoreanTranslation\(/);
 assert.match(source,/expanded\?items:items\.slice\(0,10\)/);
 assert.match(source,/뉴스 더보기/);
 assert.match(source,/MyMemory/);
});
