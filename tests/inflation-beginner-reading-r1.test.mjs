import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(path,"utf8");
const page=read("app/inflation/page.tsx");
const notes=read("app/detail-investor-notes.tsx");
const guide=read("app/detail-reading-guide.tsx");
const css=read("app/inflation/inflation-beginner-reading-r1.css");

test("inflation, recession, liquidity and credit retain scoped beginner card design without affecting other pages",()=>{
 assert.match(page,/import "\.\/inflation-beginner-reading-r1\.css";/);
 assert.match(page,/variant="beginner"/);
 assert.match(notes,/variant=\{topic==="asset-bubble"\|\|topic==="debt-risk"\|\|topic==="supply-shock"\?"beginner":topic==="inflation"\|\|topic==="recession"\|\|topic==="liquidity-crisis"\|\|topic==="credit-risk"\|\|topic==="earnings-recession"\?"beginner":"default"\}/);
 assert.match(guide,/variant\?:"default"\|"beginner"/);
 assert.match(guide,/if\(variant==="beginner"\)/);
 assert.match(guide,/return <section className="mt-12 space-y-6/);
 assert.match(css,/\.zg-beginner-reading-item\{/);
 assert.match(css,/\.zg-beginner-reading-links\{/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.doesNotMatch(css,/\.fg-card\b|\.cnn-panel\b|\.inflation-target-card\b|\.recharts/);
});

test("reading text explains scoring, rates, dates, labels and stock-market limits for first-time investors",()=>{
 for(const phrase of [
  "점수 60이면 인플레이션 위험이 60%인가요?",
  "점수가 높으면 안정적인 쪽",
  "이 신호가 주식시장에 주는 영향은?",
  "점수 하나로 매매를 결정하지 마세요",
  "이력은 처음 발표되어 저장된 자료",
 ]){
  assert.ok(page.includes(phrase),phrase);
 }
 for(const phrase of [
  "압력의 재가속과 지속성은 다른 신호입니다",
  "7개 평가 축과 16개 입력지표를 구별하세요",
  "전년 대비(YoY)는 1년 전과의 변화",
  "3개월 연율",
  "금리와 기업이익에 어떤 경로로 이어지나요?",
  "점수가 높은 영역은 압력 신호가 상대적으로 낮은 방향",
  "'—'는 결측이며 0이 아닙니다",
  "12대 경제지표의 '물가'는",
 ]){
  assert.ok(notes.includes(phrase),phrase);
 }
 assert.match(notes,/topic==="inflation"\)\?\[\]:\[/);
});

test("source links are visibly purposeful cards and related links preserve SEO contracts",()=>{
 for(const url of [
  "https://www.bls.gov/cpi/",
  "https://www.bea.gov/data/personal-consumption-expenditures-price-index",
  "https://www.bls.gov/schedule/news_release/cpi.htm",
  "https://www.bea.gov/news/schedule",
 ]){
  assert.ok((page+notes).includes(url),url);
 }
 assert.match(guide,/className="zg-beginner-reading-link"/);
 assert.match(guide,/<ExternalLink size=\{16\}/);
 assert.match(guide,/<BookOpen size=\{16\}/);
 assert.match(guide,/target="_blank" rel="noopener noreferrer"/);
 assert.match(guide,/aria-label="함께 읽을 지표"/);
 assert.match(guide,/seoRelatedOverrides\[title\]\?\.slice\(0,4\)\?\?related\.slice\(0,4\)/);
 assert.match(css,/\.zg-beginner-reading-link:focus-visible/);
 assert.match(css,/min-height:62px/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
});
